import { describe, expect, it, beforeEach } from "vitest";
import {
  buildPetChatMessages,
  cleanPetReply,
  generatePetReply,
  parsePetReplyResult,
  isUsableSuggestion,
  getDefaultSuggestions,
  loadChatHistory,
  saveChatHistory,
  appendChatExchange,
  clearChatHistory,
  CHAT_HISTORY_KEY,
  MAX_CHAT_EXCHANGES,
  MAX_CHAT_SUGGESTIONS,
} from "@/services/anna/chat";
import { LlmUnavailableError } from "@/services/anna/llm";
import { createInitialPet } from "@/game/gameState";
import type { ChatExchange } from "@/services/anna/chat";
import type { PetState as GamePetState } from "@/game/types";

function makePet(overrides: Partial<GamePetState> = {}): GamePetState {
  return {
    ...createInitialPet("Bobo"),
    stage: "child",
    species: "chick",
    hunger: 80,
    happiness: 80,
    energy: 80,
    ...overrides,
  };
}

function makeExchange(n: number): ChatExchange {
  return { user: `hello ${n}`, pet: `chirp ${n}!`, at: n };
}

describe("buildPetChatMessages", () => {
  it("names the species, stage, favourite food and hobby in the system prompt", () => {
    const messages = buildPetChatMessages({ pet: makePet(), history: [], userText: "hi!" });
    const system = messages[0];
    expect(system.role).toBe("system");
    expect(system.content).toContain("Pip Chick");
    expect(system.content).toContain("child");
    expect(system.content).toContain("Corn Kernels");
    expect(system.content).toContain("Hide and Seek");
    expect(system.content).toContain("Bobo");
  });

  it("caps the reply at 1-2 short sentences and 140 characters in the system prompt", () => {
    const messages = buildPetChatMessages({ pet: makePet(), history: [], userText: "hi!" });
    expect(messages[0].content).toContain("1-2 short sentences");
    expect(messages[0].content).toContain("140 characters");
  });

  it("tells the model never to claim to be human or a generic AI assistant", () => {
    const messages = buildPetChatMessages({ pet: makePet(), history: [], userText: "hi!" });
    expect(messages[0].content).toContain("Never claim to be human or a generic AI assistant");
  });

  it("asks the model for JSON with a reply and 2-3 follow-up suggestions", () => {
    const messages = buildPetChatMessages({ pet: makePet(), history: [], userText: "hi!" });
    expect(messages[0].content).toContain('"reply"');
    expect(messages[0].content).toContain('"suggestions"');
    expect(messages[0].content).toContain("10 words");
  });

  it("reacts to live stats: a hungry pet says so in the system prompt", () => {
    const messages = buildPetChatMessages({
      pet: makePet({ hunger: 10 }),
      history: [],
      userText: "hi!",
    });
    expect(messages[0].content).toContain("very hungry");
  });

  it("reacts to live stats: a sick, sleepy pet says so in the system prompt", () => {
    const messages = buildPetChatMessages({
      pet: makePet({ isSick: true, isSleeping: true, energy: 10 }),
      history: [],
      userText: "hi!",
    });
    expect(messages[0].content).toContain("sick");
    expect(messages[0].content).toContain("sleepy");
    expect(messages[0].content).toContain("low on energy");
  });

  it("caps history at the last 6 exchanges", () => {
    const history = Array.from({ length: 8 }, (_, i) => makeExchange(i + 1));
    const messages = buildPetChatMessages({ pet: makePet(), history, userText: "new message" });
    // system + 6 exchanges x 2 + the new user message
    expect(messages).toHaveLength(1 + MAX_CHAT_EXCHANGES * 2 + 1);
    const userTexts = messages.filter((m) => m.role === "user").map((m) => m.content);
    expect(userTexts).toEqual([
      "hello 3",
      "hello 4",
      "hello 5",
      "hello 6",
      "hello 7",
      "hello 8",
      "new message",
    ]);
  });
});

describe("cleanPetReply", () => {
  it("strips wrapping quotes", () => {
    expect(cleanPetReply('"Chirp chirp! Hello!"')).toBe("Chirp chirp! Hello!");
    expect(cleanPetReply("“Peep! Hi there!”")).toBe("Peep! Hi there!");
  });

  it("collapses whitespace and newlines into single spaces", () => {
    expect(cleanPetReply("  Chirp\n\n  chirp\t peep!  ")).toBe("Chirp chirp peep!");
  });

  it("caps the reply at 140 characters", () => {
    const long = "x".repeat(200);
    expect(cleanPetReply(long)).toHaveLength(140);
  });

  it("returns an empty string for a blank reply", () => {
    expect(cleanPetReply("   \n  ")).toBe("");
  });
});

describe("chat history persistence", () => {
  beforeEach(() => {
    localStorage.removeItem(CHAT_HISTORY_KEY);
  });

  it("round-trips through localStorage", () => {
    const history = [makeExchange(1), makeExchange(2)];
    saveChatHistory(history);
    expect(loadChatHistory()).toEqual(history);
  });

  it("caps stored history at 6 exchanges", () => {
    const history = Array.from({ length: 9 }, (_, i) => makeExchange(i + 1));
    saveChatHistory(history);
    const loaded = loadChatHistory();
    expect(loaded).toHaveLength(MAX_CHAT_EXCHANGES);
    expect(loaded[0].user).toBe("hello 4");
  });

  it("appendChatExchange caps at 6 exchanges", () => {
    let history = Array.from({ length: 6 }, (_, i) => makeExchange(i + 1));
    history = appendChatExchange(history, makeExchange(7));
    expect(history).toHaveLength(6);
    expect(history[0].user).toBe("hello 2");
    expect(history[5].user).toBe("hello 7");
  });

  it("returns [] for corrupt stored data", () => {
    localStorage.setItem(CHAT_HISTORY_KEY, "not json{");
    expect(loadChatHistory()).toEqual([]);
  });

  it("clearChatHistory removes the stored history", () => {
    saveChatHistory([makeExchange(1)]);
    clearChatHistory();
    expect(loadChatHistory()).toEqual([]);
    expect(localStorage.getItem(CHAT_HISTORY_KEY)).toBeNull();
  });
});

describe("isUsableSuggestion", () => {
  it("accepts a short suggestion", () => {
    expect(isUsableSuggestion("Want a yummy snack?", [])).toBe(true);
    expect(isUsableSuggestion("Let's play a fun game together today!", [])).toBe(true);
  });

  it("rejects empty suggestions", () => {
    expect(isUsableSuggestion("", [])).toBe(false);
    expect(isUsableSuggestion("   ", [])).toBe(false);
  });

  it("rejects suggestions over 10 words", () => {
    expect(isUsableSuggestion("Let's go outside and play a very long game of hide and seek today", [])).toBe(
      false,
    );
  });

  it("rejects a suggestion the user already said", () => {
    expect(isUsableSuggestion("Want a yummy snack?", ["Want a yummy snack?"])).toBe(false);
    expect(isUsableSuggestion("Want a yummy snack?", ["I asked: want a yummy snack please"])).toBe(false);
  });
});

describe("getDefaultSuggestions", () => {
  it("returns at most 3 suggestions, each at most 10 words", () => {
    const suggestions = getDefaultSuggestions(makePet());
    expect(suggestions.length).toBeLessThanOrEqual(MAX_CHAT_SUGGESTIONS);
    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(s.split(" ").length).toBeLessThanOrEqual(10);
    }
  });

  it("suggests food for a hungry pet", () => {
    const suggestions = getDefaultSuggestions(makePet({ hunger: 10 }));
    expect(suggestions.some((s) => /snack|eat|hungry/i.test(s))).toBe(true);
  });

  it("suggests a nap for a sleepy pet", () => {
    const suggestions = getDefaultSuggestions(makePet({ isSleeping: true, energy: 10 }));
    expect(suggestions.some((s) => /nap|sleep/i.test(s))).toBe(true);
  });

  it("suggests play for a happy pet", () => {
    const suggestions = getDefaultSuggestions(makePet({ happiness: 90 }));
    expect(suggestions.some((s) => /play|adventure/i.test(s))).toBe(true);
  });

  it("skips suggestions the user recently said", () => {
    const suggestions = getDefaultSuggestions(makePet({ hunger: 10 }), ["Want a yummy snack?"]);
    expect(suggestions).not.toContain("Want a yummy snack?");
  });
});

describe("parsePetReplyResult", () => {
  it("parses a JSON reply with model suggestions", () => {
    const raw = JSON.stringify({
      reply: "Chirp chirp! I had a great day!",
      suggestions: ["Let's play a fun game!", "Tell me a story!", "Want a yummy snack?"],
    });
    const parsed = parsePetReplyResult(raw, makePet());
    expect(parsed.reply).toBe("Chirp chirp! I had a great day!");
    expect(parsed.suggestions).toEqual([
      "Let's play a fun game!",
      "Tell me a story!",
      "Want a yummy snack?",
    ]);
  });

  it("drops model suggestions over 10 words and backfills with static defaults", () => {
    const raw = JSON.stringify({
      reply: "Peep!",
      suggestions: [
        "Let's go outside and play a very long game of hide and seek today",
        "Let's play a fun game!",
      ],
    });
    const parsed = parsePetReplyResult(raw, makePet());
    expect(parsed.reply).toBe("Peep!");
    expect(parsed.suggestions).toHaveLength(MAX_CHAT_SUGGESTIONS);
    expect(parsed.suggestions).toContain("Let's play a fun game!");
    expect(parsed.suggestions).not.toContain(
      "Let's go outside and play a very long game of hide and seek today",
    );
    for (const s of parsed.suggestions) {
      expect(s.split(" ").length).toBeLessThanOrEqual(10);
    }
  });

  it("dedupes suggestions that repeat what the user recently said", () => {
    const raw = JSON.stringify({
      reply: "Peep!",
      suggestions: ["Want a yummy snack?", "Let's play a fun game!", "Tell me about your day!"],
    });
    const parsed = parsePetReplyResult(raw, makePet(), ["Want a yummy snack?"]);
    expect(parsed.suggestions).not.toContain("Want a yummy snack?");
    expect(parsed.suggestions).toHaveLength(MAX_CHAT_SUGGESTIONS);
  });

  it("strips markdown code fences around the JSON", () => {
    const raw = '```json\n{"reply": "Peep peep!", "suggestions": ["Let\'s play a fun game!"]}\n```';
    const parsed = parsePetReplyResult(raw, makePet());
    expect(parsed.reply).toBe("Peep peep!");
    expect(parsed.suggestions).toContain("Let's play a fun game!");
  });

  it("falls back to plain text + all-static suggestions when JSON parsing fails", () => {
    const parsed = parsePetReplyResult('"Chirp! Just plain text, no JSON here."', makePet());
    expect(parsed.reply).toBe("Chirp! Just plain text, no JSON here.");
    expect(parsed.suggestions).toEqual(getDefaultSuggestions(makePet()));
    expect(parsed.suggestions).toHaveLength(MAX_CHAT_SUGGESTIONS);
  });

  it("falls back to plain text + static suggestions when the reply field is missing", () => {
    const raw = JSON.stringify({ suggestions: ["Let's play a fun game!"] });
    const parsed = parsePetReplyResult(raw, makePet());
    expect(parsed.reply).toBe("");
    expect(parsed.suggestions).toHaveLength(MAX_CHAT_SUGGESTIONS);
  });
});

describe("generatePetReply", () => {
  it("throws LlmUnavailableError outside the Anna host", async () => {
    await expect(
      generatePetReply({ pet: makePet(), history: [], userText: "hi!" }),
    ).rejects.toBeInstanceOf(LlmUnavailableError);
  });
});
