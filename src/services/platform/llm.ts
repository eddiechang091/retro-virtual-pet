/**
 * LLM service via our server-side proxy (/api/llm).
 *
 * The proxy holds our provider keys (Groq primary, Cline fallback)
 * server-side, so the app gets AI with no login and no key ever
 * reaching the browser. There are no accounts here: the proxy is
 * public but per-IP rate-limited and input-capped server-side.
 */

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
}

export interface LlmResult {
  text: string;
  raw: unknown;
}

export class LlmUnavailableError extends Error {
  constructor(message = "Bobo is taking a tiny break") {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

/** Thrown when the server proxy isn't configured. */
export class LlmProxyNotConfiguredError extends LlmUnavailableError {
  constructor() {
    super("AI is not configured");
    this.name = "LlmProxyNotConfiguredError";
  }
}

export interface LlmService {
  readonly available: boolean;
  complete(request: LlmRequest): Promise<LlmResult>;
}

export async function getLlmService(): Promise<LlmService> {
  return {
    available: true,
    async complete(request: LlmRequest): Promise<LlmResult> {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      try {
        const res = await fetch("/api/llm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: request.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            maxTokens: request.maxTokens,
            temperature: request.temperature,
            json: request.json,
          }),
          signal: ctrl.signal,
        });
        if (res.status === 501) throw new LlmProxyNotConfiguredError();
        if (!res.ok) throw new LlmUnavailableError();
        const data = (await res.json()) as { text?: unknown };
        const text = typeof data.text === "string" ? data.text.trim() : "";
        if (!text) throw new LlmUnavailableError();
        return { text, raw: data };
      } catch (err) {
        if (err instanceof LlmUnavailableError) throw err;
        throw new LlmUnavailableError();
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
