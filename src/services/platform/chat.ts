import { getLlmService, LlmUnavailableError } from "./llm";
import type { LlmMessage } from "./llm";
import type { PetState } from "../../game/types";
import { SPECIES_CATALOG } from "../../game/types";

// One-shot LLM dialogue for the pet, powered by the server-side LLM
// proxy (/api/llm, text-only). Every CHAT open generates a FRESH question
// + 2 options from the pet's live state and any active event — no free
// text, no continuous conversation, no history, nothing persisted. When
// the proxy is unavailable or unconfigured the app falls back to the
// canned dialogues in src/game/dialogues.ts — nothing here is called on
// that path.

export const MAX_DIALOGUE_QUESTION_CHARS = 140;
export const MAX_OPTION_WORDS = 10;

export const DEFAULT_DIALOGUE_RESPONSE = "Yay! That makes me so happy!";

export interface PetDialogueOption {
  text: string;
  response: string;
}

export interface PetDialogue {
  situation: string;
  question: string;
  options: PetDialogueOption[];
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

export function buildPetDialogueMessages(opts: {
  pet: PetState;
  activeEventTitle?: string;
}): LlmMessage[] {
  const pet = opts.pet;
  const info = SPECIES_CATALOG[pet.species] ?? SPECIES_CATALOG.baby;
  const lines = [
    `You are ${pet.name}, a ${info.name} at the ${pet.stage} stage.`,
    `Your favorite food is ${info.favFood} and your hobby is ${info.hobby}.`,
    "You are a cute, playful retro pixel pet living on a tiny LCD screen, speaking English.",
    `Your stats right now — hunger ${pet.hunger}/100, happiness ${pet.happiness}/100, cleanliness ${pet.cleanliness}/100, energy ${pet.energy}/100, friendship ${pet.mood}/100 (hunger below 30 means very hungry, energy below 30 means low on energy).`,
    `You are ${pet.ageDays} days old, weigh ${pet.weightGrams}g, have been fed ${pet.totalMeals} meals, played ${pet.totalGamesPlayed} games (won ${pet.totalGamesWon}), chatted ${pet.totalDialogues} times, made ${pet.careMistakes} care mistakes, and have ${pet.discipline} discipline.`,
  ];
  if (opts.activeEventTitle) {
    lines.push(`Something just happened: ${opts.activeEventTitle}.`);
  }
  lines.push(
    `Reply with a JSON object only, no other text: {"situation": "...", "question": "...", "options": [{"text": "...", "response": "..."}, {"text": "...", "response": "..."}]}.`,
    `"situation" is a short label for this moment (a few words, e.g. "Curious Question").`,
    `"question" is your opening line to your owner: 1 short sentence, at most ${MAX_DIALOGUE_QUESTION_CHARS} characters, in character, reacting to how you feel right now.`,
    `"options" are exactly 2 things the user can say back to you, each at most ${MAX_OPTION_WORDS} words, tailored to your question and how you feel.`,
    `Each option's "response" is your short reaction if the user picks it, at most ${MAX_DIALOGUE_QUESTION_CHARS} characters.`,
    "Never claim to be human or a generic AI assistant.",
    `React to how you feel.${describePetState(pet)}`,
  );
  return [
    { role: "system", content: lines.join(" ") },
    {
      role: "user",
      content: "Say hi to me! Ask me one question and give me two things I can say back.",
    },
  ];
}

// Strip wrapping quotes, collapse line breaks / extra whitespace, enforce
// the character cap so the text always fits the little LCD screen.
export function cleanDialogueText(text: string): string {
  let cleaned = text.trim().replace(/\s+/g, " ");
  cleaned = cleaned.replace(/^["'“”‘’«»「」『』]+|["'“”‘’«»「」『』]+$/g, "").trim();
  return cleaned.slice(0, MAX_DIALOGUE_QUESTION_CHARS);
}

function normalizeOption(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

/**
 * Runtime guard for one dialogue option: non-empty, at most 10 words,
 * distinct from the other option (pass the already-accepted option's text).
 */
export function isUsableDialogueOption(candidate: string, otherText = ""): boolean {
  const cleaned = candidate.trim().replace(/\s+/g, " ");
  if (!cleaned) return false;
  if (cleaned.split(" ").length > MAX_OPTION_WORDS) return false;
  if (otherText && normalizeOption(cleaned) === normalizeOption(otherText)) return false;
  return true;
}

/**
 * Parse one proxy result into a PetDialogue. Throws when the JSON
 * is unusable, the question is empty, or fewer than 2 options survive the
 * guard — the caller then falls back to a canned dialogue.
 */
export function parsePetDialogueResult(rawText: string): PetDialogue {
  const stripped = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const parsed: unknown = JSON.parse(stripped);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Pet dialogue came back empty");
  }
  const record = parsed as Record<string, unknown>;
  const question = typeof record.question === "string" ? cleanDialogueText(record.question) : "";
  if (!question) {
    throw new Error("Pet dialogue came back without a question");
  }
  const situation =
    typeof record.situation === "string" ? cleanDialogueText(record.situation) : "";
  const options: PetDialogueOption[] = [];
  if (Array.isArray(record.options)) {
    for (const item of record.options) {
      if (options.length >= 2) break;
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      if (typeof entry.text !== "string") continue;
      const text = entry.text.trim().replace(/\s+/g, " ");
      const other = options[0]?.text ?? "";
      if (!isUsableDialogueOption(text, other)) continue;
      const response =
        typeof entry.response === "string" ? cleanDialogueText(entry.response) : "";
      options.push({ text, response: response || DEFAULT_DIALOGUE_RESPONSE });
    }
  }
  if (options.length < 2) {
    throw new Error("Pet dialogue came back with fewer than 2 usable options");
  }
  return { situation: situation || "Chat", question, options };
}

export async function generatePetDialogue(opts: {
  pet: PetState;
  activeEventTitle?: string;
}): Promise<PetDialogue> {
  const llm = await getLlmService();
  if (!llm.available) {
    throw new LlmUnavailableError();
  }
  const result = await llm.complete({
    messages: buildPetDialogueMessages(opts),
    maxTokens: 180,
    temperature: 0.9,
    json: true,
  });
  return parsePetDialogueResult(result.text);
}
