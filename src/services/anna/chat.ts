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
export const CHAT_HISTORY_KEY = "tamagotchi_chat_v1";

export interface ChatExchange {
  user: string;
  pet: string;
  at: number;
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
    `Reply in 1-2 short sentences, at most ${MAX_CHAT_REPLY_CHARS} characters.`,
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
}): Promise<string> {
  const llm = await getLlmService();
  if (!llm.available) {
    throw new LlmUnavailableError();
  }
  const result = await llm.complete({
    messages: buildPetChatMessages(opts),
    maxTokens: 120,
    temperature: 0.9,
  });
  const reply = cleanPetReply(result.text);
  if (!reply) {
    throw new Error("Pet reply came back empty");
  }
  return reply;
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
