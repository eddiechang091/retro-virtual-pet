import { describe, expect, it } from "vitest";
import {
  buildPetDialogueMessages,
  cleanDialogueText,
  generatePetDialogue,
  isUsableDialogueOption,
  parsePetDialogueResult,
  DEFAULT_DIALOGUE_RESPONSE,
  MAX_DIALOGUE_QUESTION_CHARS,
} from "@/services/anna/chat";
import { LlmUnavailableError } from "@/services/anna/llm";
import { createInitialPet } from "@/game/gameState";
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

function makeRawDialogue(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    situation: "Curious Question",
    question: "What is the big world outside this tiny LCD screen like?",
    options: [
      { text: "It is vast and wonderful", response: "Wow! Sounds super cool!" },
      { text: "I love being right here", response: "Hehe, I love being with you most!" },
    ],
    ...overrides,
  });
}

describe("buildPetDialogueMessages", () => {
  it("names the species, stage, favourite food and hobby in the system prompt", () => {
    const messages = buildPetDialogueMessages({ pet: makePet() });
    const system = messages[0];
    expect(system.role).toBe("system");
    expect(system.content).toContain("Pip Chick");
    expect(system.content).toContain("child");
    expect(system.content).toContain("Corn Kernels");
    expect(system.content).toContain("Hide and Seek");
    expect(system.content).toContain("Bobo");
  });

  it("includes the live stats and counters in the system prompt", () => {
    const messages = buildPetDialogueMessages({
      pet: makePet({ hunger: 25, ageDays: 3, weightGrams: 15, totalMeals: 8 }),
    });
    expect(messages[0].content).toContain("hunger 25/100");
    expect(messages[0].content).toContain("3 days old");
    expect(messages[0].content).toContain("15g");
    expect(messages[0].content).toContain("8 meals");
  });

  it("reacts to live conditions: a hungry, sick, sleepy pet says so", () => {
    const messages = buildPetDialogueMessages({
      pet: makePet({ hunger: 10, isSick: true, isSleeping: true, energy: 10, poopCount: 2 }),
    });
    expect(messages[0].content).toContain("very hungry");
    expect(messages[0].content).toContain("sick");
    expect(messages[0].content).toContain("sleepy");
    expect(messages[0].content).toContain("low on energy");
    expect(messages[0].content).toContain("clean-up");
  });

  it("includes the active event title when one is passed", () => {
    const messages = buildPetDialogueMessages({
      pet: makePet(),
      activeEventTitle: "Shiny Mystery Coin",
    });
    expect(messages[0].content).toContain("Shiny Mystery Coin");
  });

  it("mentions no event when none is active", () => {
    const messages = buildPetDialogueMessages({ pet: makePet() });
    expect(messages[0].content).not.toContain("Something just happened");
  });

  it("asks for JSON with a situation, one question and exactly 2 options", () => {
    const messages = buildPetDialogueMessages({ pet: makePet() });
    expect(messages[0].content).toContain('"situation"');
    expect(messages[0].content).toContain('"question"');
    expect(messages[0].content).toContain('"options"');
    expect(messages[0].content).toContain("exactly 2");
    expect(messages[0].content).toContain("1 short sentence");
    expect(messages[0].content).toContain("140 characters");
    expect(messages[0].content).toContain("10 words");
  });

  it("tells the model never to claim to be human or a generic AI assistant", () => {
    const messages = buildPetDialogueMessages({ pet: makePet() });
    expect(messages[0].content).toContain("Never claim to be human or a generic AI assistant");
  });
});

describe("cleanDialogueText", () => {
  it("strips wrapping quotes", () => {
    expect(cleanDialogueText('"Chirp chirp! Hello!"')).toBe("Chirp chirp! Hello!");
    expect(cleanDialogueText("“Peep! Hi there!”")).toBe("Peep! Hi there!");
  });

  it("collapses whitespace and newlines into single spaces", () => {
    expect(cleanDialogueText("  Chirp\n\n  chirp\t peep!  ")).toBe("Chirp chirp peep!");
  });

  it("caps the text at 140 characters", () => {
    const long = "x".repeat(200);
    expect(cleanDialogueText(long)).toHaveLength(MAX_DIALOGUE_QUESTION_CHARS);
  });

  it("returns an empty string for a blank reply", () => {
    expect(cleanDialogueText("   \n  ")).toBe("");
  });
});

describe("isUsableDialogueOption", () => {
  it("accepts a short option", () => {
    expect(isUsableDialogueOption("Want a yummy snack?")).toBe(true);
    expect(isUsableDialogueOption("Let's play a fun game!")).toBe(true);
  });

  it("rejects empty options", () => {
    expect(isUsableDialogueOption("")).toBe(false);
    expect(isUsableDialogueOption("   ")).toBe(false);
  });

  it("rejects options over 10 words", () => {
    expect(
      isUsableDialogueOption("Let's go outside and play a very long game of hide and seek today"),
    ).toBe(false);
  });

  it("rejects an option identical to the other option", () => {
    expect(isUsableDialogueOption("Want a yummy snack?", "Want a yummy snack?")).toBe(false);
    expect(isUsableDialogueOption("want a yummy snack?", "Want a yummy snack!")).toBe(false);
  });
});

describe("parsePetDialogueResult", () => {
  it("parses a JSON dialogue with a situation, question and 2 options", () => {
    const parsed = parsePetDialogueResult(makeRawDialogue());
    expect(parsed.situation).toBe("Curious Question");
    expect(parsed.question).toBe("What is the big world outside this tiny LCD screen like?");
    expect(parsed.options).toHaveLength(2);
    expect(parsed.options[0]).toEqual({
      text: "It is vast and wonderful",
      response: "Wow! Sounds super cool!",
    });
  });

  it("caps an over-long question at 140 characters", () => {
    const parsed = parsePetDialogueResult(makeRawDialogue({ question: "x".repeat(200) }));
    expect(parsed.question).toHaveLength(MAX_DIALOGUE_QUESTION_CHARS);
  });

  it("applies the default response when an option has none", () => {
    const parsed = parsePetDialogueResult(
      makeRawDialogue({
        options: [
          { text: "It is vast and wonderful" },
          { text: "I love being right here", response: "Hehe!" },
        ],
      }),
    );
    expect(parsed.options[0].response).toBe(DEFAULT_DIALOGUE_RESPONSE);
    expect(parsed.options[1].response).toBe("Hehe!");
  });

  it("defaults the situation to Chat when missing", () => {
    const raw = JSON.stringify({
      question: "Peep?",
      options: [
        { text: "Yes, let's play!", response: "Yay!" },
        { text: "Maybe later", response: "Okay!" },
      ],
    });
    expect(parsePetDialogueResult(raw).situation).toBe("Chat");
  });

  it("throws when a >10-word option leaves fewer than 2 usable options", () => {
    const raw = makeRawDialogue({
      options: [
        { text: "Let's go outside and play a very long game of hide and seek today", response: "Yay!" },
        { text: "I love being right here", response: "Hehe!" },
      ],
    });
    expect(() => parsePetDialogueResult(raw)).toThrow();
  });

  it("throws when the two options are identical", () => {
    const raw = makeRawDialogue({
      options: [
        { text: "Let's play!", response: "Yay!" },
        { text: "Let's play!", response: "Yay!" },
      ],
    });
    expect(() => parsePetDialogueResult(raw)).toThrow();
  });

  it("throws when the question is missing or empty", () => {
    expect(() => parsePetDialogueResult(JSON.stringify({ options: [] }))).toThrow();
    expect(() =>
      parsePetDialogueResult(
        makeRawDialogue({ question: "   " }),
      ),
    ).toThrow();
  });

  it("strips markdown code fences around the JSON", () => {
    const raw =
      '```json\n{"situation": "Chat", "question": "Peep peep!", "options": [{"text": "Hi there!", "response": "Chirp!"}, {"text": "Let us play!", "response": "Yay!"}]}\n```';
    const parsed = parsePetDialogueResult(raw);
    expect(parsed.question).toBe("Peep peep!");
    expect(parsed.options).toHaveLength(2);
  });

  it("throws on invalid JSON so the caller falls back to canned dialogue", () => {
    expect(() => parsePetDialogueResult("not json at all")).toThrow();
    expect(() => parsePetDialogueResult('"just a plain string"')).toThrow();
  });
});

describe("generatePetDialogue", () => {
  it("throws LlmUnavailableError outside the Anna host", async () => {
    await expect(generatePetDialogue({ pet: makePet() })).rejects.toBeInstanceOf(
      LlmUnavailableError,
    );
  });
});
