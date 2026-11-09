import { describe, expect, it, beforeEach } from "vitest";
import {
  buildPetChatMessages,
  cleanPetReply,
  generatePetReply,
  loadChatHistory,
  saveChatHistory,
  appendChatExchange,
  clearChatHistory,
  CHAT_HISTORY_KEY,
  MAX_CHAT_EXCHANGES,
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

describe("generatePetReply", () => {
  it("throws LlmUnavailableError outside the Anna host", async () => {
    await expect(
      generatePetReply({ pet: makePet(), history: [], userText: "hi!" }),
    ).rejects.toBeInstanceOf(LlmUnavailableError);
  });
});
