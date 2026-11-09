import { getLlmService, LlmUnavailableError } from "./llm";
import type { LlmMessage } from "./llm";
import type { PetState } from "../../game/types";
import { SPECIES_CATALOG } from "../../game/types";

// Free-text chat with the pet, powered by Anna llm.complete (text-only).
// Outside the Anna host the LLM service is unavailable and the app falls
// back to the canned dialogues in src/game/dialogues.ts — nothing here
// is called on that path.

export const MAX_CHAT_REPLY_CHARS = 140;
export const MAX_CHAT_INPUT_CHARS = 140;
export const MAX_CHAT_EXCHANGES = 6;
export const MAX_CHAT_SUGGESTIONS = 3;
export const MAX_SUGGESTION_WORDS = 10;
export const CHAT_HISTORY_KEY = "tamagotchi_chat_v1";

export interface ChatExchange {
  user: string;
  pet: string;
  at: number;
}

export interface PetChatReply {
  reply: string;
  suggestions: string[];
}

function describePetState(pet: PetState): string {
  const conditions: string[] = [];
  if (pet.hunger < 30) conditions.push("very hungry");
  if (pet.isSick) conditions.push("sick and in need of care");
  if (pet.isSleeping) conditions.push("sleepy");
  if (pet.energy < 30) conditions.push("low on energy");
  if (pet.happiness >= 70) conditions.push("very happy");
  if (pet.poopCount > 0) conditions.push("in need of a clean-up");
  return conditions.length ? ` Right now you are ${conditions.join(", ")}.` : "";
}

export function buildPetChatMessages(opts: {
  pet: PetState;
  history: ChatExchange[];
  userText: string;
}): LlmMessage[] {
  const pet = opts.pet;
  const info = SPECIES_CATALOG[pet.species] ?? SPECIES_CATALOG.baby;
  const system = [
    `You are ${pet.name}, a ${info.name} at the ${pet.stage} stage.`,
    `Your favorite food is ${info.favFood} and your hobby is ${info.hobby}.`,
    "You are a cute, playful retro pixel pet living on a tiny LCD screen, speaking English.",
    `Reply with a JSON object only, no other text: {"reply": "...", "suggestions": ["...", "...", "..."]}.`,
    `"reply" is your answer in 1-2 short sentences, at most ${MAX_CHAT_REPLY_CHARS} characters.`,
    `"suggestions" are 2-3 things the user could say to you next — not questions about you, but things for the user to say, tailored to your last reply and how you feel right now (for example if you are hungry suggest asking about a snack, if you are sleepy suggest a nap, if you are happy suggest playing together). Each suggestion is at most ${MAX_SUGGESTION_WORDS} words.`,
    "Never claim to be human or a generic AI assistant.",
    `React to how you feel.${describePetState(pet)}`,
  ].join(" ");
  const messages: LlmMessage[] = [{ role: "system", content: system }];
  for (const exchange of opts.history.slice(-MAX_CHAT_EXCHANGES)) {
    messages.push({ role: "user", content: exchange.user });
    messages.push({ role: "assistant", content: exchange.pet });
  }
  messages.push({ role: "user", content: opts.userText });
  return messages;
}

// Strip wrapping quotes, collapse line breaks / extra whitespace, enforce
// the character cap so a reply always fits the little LCD screen.
export function cleanPetReply(text: string): string {
  let cleaned = text.trim().replace(/\s+/g, " ");
  cleaned = cleaned.replace(/^["'“”‘’«»「」『』]+|["'“”‘’«»「」『』]+$/g, "").trim();
  return cleaned.slice(0, MAX_CHAT_REPLY_CHARS);
}

export async function generatePetReply(opts: {
  pet: PetState;
  history: ChatExchange[];
  userText: string;
}): Promise<PetChatReply> {
  const llm = await getLlmService();
  if (!llm.available) {
    throw new LlmUnavailableError();
  }
  const result = await llm.complete({
    messages: buildPetChatMessages(opts),
    maxTokens: 180,
    temperature: 0.9,
    json: true,
  });
  const parsed = parsePetReplyResult(
    result.text,
    opts.pet,
    opts.history.map((exchange) => exchange.user),
  );
  if (!parsed.reply) {
    throw new Error("Pet reply came back empty");
  }
  return parsed;
}

// --- Suggestion chips (Lucky Cat pattern) ---------------------------------
// The model returns 2-3 follow-up suggestions in the same JSON call; the
// runtime guard below drops anything unusable and static, state-based
// defaults fill the gaps, so the UI always has up to 3 chips to show.

/** Normalize for comparison: lowercase, strip punctuation. */
function normalizeSuggestion(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

/** True when the candidate repeats something the user already said. */
function wasAlreadySaid(candidate: string, said: string[]): boolean {
  const normalized = normalizeSuggestion(candidate);
  if (!normalized) return true;
  const words = new Set(normalized.split(/\s+/).filter((w) => w.length > 3));
  for (const item of said) {
    const other = normalizeSuggestion(item);
    if (!other) continue;
    if (other === normalized) return true;
    // High overlap: >60% of the candidate's significant words appear
    if (words.size > 0) {
      const overlap = [...words].filter((w) => other.includes(w)).length;
      if (overlap / words.size > 0.6) return true;
    }
  }
  return false;
}

/**
 * Runtime guard for one model suggestion: non-empty, at most 10 words,
 * not a repeat of something the user recently said (or an already
 * accepted suggestion — pass those in `seen` too).
 */
export function isUsableSuggestion(candidate: string, seen: string[]): boolean {
  const cleaned = candidate.trim().replace(/\s+/g, " ");
  if (!cleaned) return false;
  if (cleaned.split(" ").length > MAX_SUGGESTION_WORDS) return false;
  return !wasAlreadySaid(cleaned, seen);
}

const STATIC_SUGGESTIONS: Record<string, string[]> = {
  hungry: ["Want a yummy snack?", "Let's eat something tasty!", "Are you hungry, little one?"],
  sick: ["Take your medicine, feel better!", "I'll take good care of you.", "Rest now, you'll feel better."],
  sleepy: ["Time for a cozy nap?", "Let's sleep and dream sweetly.", "You look sleepy, rest now."],
  happy: ["Let's play a fun game!", "You make me so happy!", "Let's go on an adventure!"],
  default: ["Tell me about your day!", "What's your favourite thing?", "Let's play together today!"],
};

/**
 * Static, state-based suggestions (all ≤10 words). Used before the first
 * AI reply and to backfill any model suggestions the guard drops.
 */
export function getDefaultSuggestions(pet: PetState, recentUserTexts: string[] = []): string[] {
  const buckets: string[][] = [];
  if (pet.hunger < 30) buckets.push(STATIC_SUGGESTIONS.hungry);
  if (pet.isSick) buckets.push(STATIC_SUGGESTIONS.sick);
  if (pet.isSleeping || pet.energy < 30) buckets.push(STATIC_SUGGESTIONS.sleepy);
  if (pet.happiness >= 70) buckets.push(STATIC_SUGGESTIONS.happy);
  buckets.push(STATIC_SUGGESTIONS.default);
  const seen = [...recentUserTexts];
  const suggestions: string[] = [];
  for (const bucket of buckets) {
    for (const candidate of bucket) {
      if (suggestions.length >= MAX_CHAT_SUGGESTIONS) break;
      if (isUsableSuggestion(candidate, seen)) {
        suggestions.push(candidate);
        seen.push(candidate);
      }
    }
    if (suggestions.length >= MAX_CHAT_SUGGESTIONS) break;
  }
  return suggestions;
}

/**
 * Parse one llm.complete result. Happy path: JSON {"reply", "suggestions"}
 * — suggestions pass the guard, gaps are backfilled with static defaults.
 * If the JSON is unusable, the reply falls back to the plain-text result
 * (cleaned as before) and all suggestions come from the static defaults.
 */
export function parsePetReplyResult(
  rawText: string,
  pet: PetState,
  recentUserTexts: string[] = [],
): PetChatReply {
  const defaults = getDefaultSuggestions(pet, recentUserTexts);
  const stripped = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    const parsed: unknown = JSON.parse(stripped);
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const reply = typeof record.reply === "string" ? cleanPetReply(record.reply) : "";
      const seen = [...recentUserTexts];
      const suggestions: string[] = [];
      if (Array.isArray(record.suggestions)) {
        for (const item of record.suggestions) {
          if (suggestions.length >= MAX_CHAT_SUGGESTIONS) break;
          if (typeof item !== "string") continue;
          const cleaned = item.trim().replace(/\s+/g, " ");
          if (isUsableSuggestion(cleaned, seen)) {
            suggestions.push(cleaned);
            seen.push(cleaned);
          }
        }
      }
      for (const fallback of defaults) {
        if (suggestions.length >= MAX_CHAT_SUGGESTIONS) break;
        if (isUsableSuggestion(fallback, seen)) {
          suggestions.push(fallback);
          seen.push(fallback);
        }
      }
      return { reply, suggestions };
    }
  } catch {
    // Not JSON — fall through to the plain-text path below.
  }
  return { reply: cleanPetReply(rawText), suggestions: defaults };
}

export function loadChatHistory(): ChatExchange[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is ChatExchange =>
          !!item &&
          typeof item === "object" &&
          typeof (item as ChatExchange).user === "string" &&
          typeof (item as ChatExchange).pet === "string" &&
          typeof (item as ChatExchange).at === "number",
      )
      .slice(-MAX_CHAT_EXCHANGES);
  } catch {
    return [];
  }
}

export function saveChatHistory(history: ChatExchange[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.slice(-MAX_CHAT_EXCHANGES)));
  } catch {
    // quota exceeded or incognito — chat still works for this session
  }
}

export function appendChatExchange(history: ChatExchange[], exchange: ChatExchange): ChatExchange[] {
  return [...history, exchange].slice(-MAX_CHAT_EXCHANGES);
}

export function clearChatHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY);
  } catch {
    // ignore
  }
}
