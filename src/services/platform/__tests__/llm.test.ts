import { describe, expect, it, afterEach, vi } from "vitest";
import {
  getLlmService,
  LlmUnavailableError,
  LlmProxyNotConfiguredError,
} from "../llm";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    })),
  );
}

describe("platform llm service", () => {
  it("is available (the proxy is reached on demand)", async () => {
    const llm = await getLlmService();
    expect(llm.available).toBe(true);
  });

  it("returns the proxy text on 200", async () => {
    mockFetch(200, { text: "Hello from Bobo!" });
    const llm = await getLlmService();
    const result = await llm.complete({
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result.text).toBe("Hello from Bobo!");
  });

  it("throws LlmProxyNotConfiguredError on 501", async () => {
    mockFetch(501, { error: "AI is not configured", code: "not_configured" });
    const llm = await getLlmService();
    await expect(
      llm.complete({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toBeInstanceOf(LlmProxyNotConfiguredError);
  });

  it("throws LlmUnavailableError on 500", async () => {
    mockFetch(500, { error: "AI is taking a tiny break" });
    const llm = await getLlmService();
    await expect(
      llm.complete({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toBeInstanceOf(LlmUnavailableError);
  });

  it("throws LlmUnavailableError when the fetch itself fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const llm = await getLlmService();
    await expect(
      llm.complete({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toBeInstanceOf(LlmUnavailableError);
  });

  it("throws LlmUnavailableError on 200 with empty text", async () => {
    mockFetch(200, { text: "   " });
    const llm = await getLlmService();
    await expect(
      llm.complete({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toBeInstanceOf(LlmUnavailableError);
  });
});
