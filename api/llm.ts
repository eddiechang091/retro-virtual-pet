/**
 * POST /api/llm — server-side LLM proxy for Retro Virtual Pet.
 *
 * Why a proxy: the browser can't call LLM APIs with our key, and the key
 * must never reach the browser. This function holds OUR provider keys
 * server-side, so the app gets AI dialogue with no login and no key
 * ever leaving the server.
 *
 * There are no accounts here, so the proxy is public — but it is
 * best-effort per-IP rate-limited (30 req/min per serverless instance)
 * and input-capped, so one caller can't burn the shared quotas.
 *
 * Provider chain (from Money Companion's standalone line): Groq primary,
 * Cline fallback.
 * - Groq: direct serving on own hardware, OpenAI-compatible.
 *   Needs a browser User-Agent or Cloudflare 1010s the request.
 * - Cline: free models proxy through OpenRouter; bursty throttling
 *   (stream_initialization_failed / 10s+ queued hangs). Kept as fallback.
 * - Cerebras rejected: requires a payment method to activate.
 *
 * Security:
 * - Keys live in env vars (server only) and are never logged or returned.
 * - Best-effort per-IP rate limit (per serverless instance) + tight input
 *   caps, so one caller can't burn the shared quotas.
 *
 * Env vars (Vercel project settings):
 *   GROQ_API_KEY   — key from https://console.groq.com/keys (required for the primary chain; free tier, no card)
 *   GROQ_MODELS    — comma-separated override, tried in order;
 *                    defaults to openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b.
 *   CLINE_API_KEY  — key from https://app.cline.bot (optional fallback; free tier)
 *   CLINE_MODELS   — comma-separated override, tried in order after Groq.
 */

// Minimal structural types so this file stays dependency-free.
type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
};

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const CLINE_API_KEY = process.env.CLINE_API_KEY;

// Groq first for quality; qwen second for speed.
const GROQ_MODELS = (
  process.env.GROQ_MODELS ||
  "openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Cline fallback: free models proxy through OpenRouter; bursty throttling.
// nvidia/*:free verified working; gemma/muse-spark often empty
// (upstream 429). Only used when Groq is unavailable.
const CLINE_MODELS = (
  process.env.CLINE_MODELS ||
  "nvidia/nemotron-3.5-super-vl:free,nvidia/nemotron-3-ultra-550b-a55b:free,meta/muse-spark-1.3-contributor,google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Per-model timeout: 5s. History: 1.5s aborted real inference mid-stream;
// 8s wasted too long on throttled hangs. 5s covers normal inference (~2s)
// while failing fast so the 'try again in a moment' response reaches the
// user sooner.
const PER_MODEL_TIMEOUT_MS = 5000;

// --- best-effort per-IP rate limit (per serverless instance) ----------------
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  // avoid unbounded growth
  if (hits.size > 5000) hits.clear();
  return false;
}

// --- helpers ----------------------------------------------------------------
function getHeader(
  headers: VercelRequest["headers"],
  name: string
): string | undefined {
  const v = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

function stripFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : text).trim();
}

type ClientMessage = { role: string; content: string };

function validMessages(input: unknown): ClientMessage[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > 40)
    return null;
  const out: ClientMessage[] = [];
  let chars = 0;
  for (const m of input) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if (
      (role !== "system" && role !== "user" && role !== "assistant") ||
      typeof content !== "string" ||
      content.length === 0
    )
      return null;
    chars += content.length;
    if (chars > 20000) return null;
    out.push({ role, content });
  }
  return out;
}

function clampInt(v: unknown, min: number, max: number): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.min(max, Math.max(min, Math.round(v)));
}

// --- provider plumbing ------------------------------------------------------
// Each attempt is a (provider, model) pair. Groq speaks plain OpenAI
// non-streaming JSON; Cline needs SSE streaming (it 500s non-streaming)
// plus its workos: auth quirk and throttling signals.

type Attempt = {
  provider: "groq" | "cline";
  model: string;
};

function buildAttempts(): Attempt[] {
  const out: Attempt[] = [];
  if (GROQ_API_KEY) {
    for (const model of GROQ_MODELS) out.push({ provider: "groq", model });
  }
  if (CLINE_API_KEY) {
    for (const model of CLINE_MODELS) out.push({ provider: "cline", model });
  }
  return out;
}

// --- handler ----------------------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!GROQ_API_KEY && !CLINE_API_KEY) {
    // Distinct code so the client can fall back to canned dialogue
    // instead of dying.
    return res
      .status(501)
      .json({ error: "AI is not configured", code: "not_configured" });
  }

  // Per-IP rate limit: first address in x-forwarded-for (Vercel sets it).
  const clientIp =
    getHeader(req.headers, "x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  if (rateLimited(`llm:${clientIp}`)) {
    return res
      .status(429)
      .json({ error: "Too many requests, slow down a touch" });
  }

  const body = (req.body ?? {}) as {
    messages?: unknown;
    maxTokens?: unknown;
    temperature?: unknown;
    json?: unknown;
  };
  const messages = validMessages(body.messages);
  if (!messages) return res.status(400).json({ error: "Bad request" });
  const maxTokens = clampInt(body.maxTokens, 1, 2000);
  const temperature =
    typeof body.temperature === "number" && Number.isFinite(body.temperature)
      ? Math.min(2, Math.max(0, body.temperature))
      : undefined;
  const wantJson = body.json === true;

  const openAiBody: Record<string, unknown> = { messages };
  if (maxTokens !== undefined) openAiBody.max_tokens = maxTokens;
  if (temperature !== undefined) openAiBody.temperature = temperature;
  // NOTE: response_format.json_object is intentionally NOT sent — support
  // varies across free models and a 400 would fail the request. Instead we
  // validate with JSON.parse below and fail over to the next model.

  // Cline accepts the key as `Bearer <key>`; OAuth-issued tokens need the
  // `workos:` prefix instead. Try plain first, fall back once on 401.
  let clineAuth = `Bearer ${CLINE_API_KEY}`;
  let triedWorkosPrefix = (CLINE_API_KEY ?? "").startsWith("workos:");

  async function callGroq(model: string): Promise<globalThis.Response> {
    return fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
        // Cloudflare 1010s datacenter IPs without a browser UA.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({ ...openAiBody, model }),
      signal: AbortSignal.timeout(PER_MODEL_TIMEOUT_MS),
    });
  }

  async function callCline(model: string): Promise<globalThis.Response> {
    // Cline 500s some non-streaming calls, so request SSE streaming and
    // reassemble the deltas below.
    return fetch("https://api.cline.bot/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: clineAuth,
        "HTTP-Referer":
          "https://github.com/eddiechang091/retro-virtual-pet",
        "X-Title": "Retro Virtual Pet",
      },
      body: JSON.stringify({ ...openAiBody, model, stream: true }),
      signal: AbortSignal.timeout(PER_MODEL_TIMEOUT_MS),
    });
  }

  // Parse a Groq (plain OpenAI JSON) response.
  function parseGroqJson(j: unknown): string {
    const c = (j as { choices?: Array<{ message?: { content?: unknown } }> })
      .choices?.[0]?.message?.content;
    return typeof c === "string" ? c : "";
  }

  // Parse a Cline SSE stream; returns { text, throttled }.
  function parseClineSse(sse: string): { text: string; throttled: boolean } {
    const parts: string[] = [];
    let throttled = false;
    for (const line of sse.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const chunk = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: unknown } }>;
          error?: { code?: unknown };
        };
        // Cline's throttling signal: upstream (OpenRouter) rate limited.
        if (chunk.error?.code === "stream_initialization_failed") {
          throttled = true;
        }
        const d = chunk.choices?.[0]?.delta?.content;
        if (typeof d === "string") parts.push(d);
      } catch {
        // skip malformed chunk
      }
    }
    return { text: parts.join(""), throttled };
  }

  let text = "";
  let sawThrottle = false;
  for (const { provider, model } of buildAttempts()) {
    const tag = `${provider}/${model}`;
    let r: globalThis.Response;
    try {
      r = provider === "groq" ? await callGroq(model) : await callCline(model);
    } catch (e) {
      // Timeout / network blip — fail over to the next attempt.
      console.error(`llm proxy: ${tag} fetch failed, trying next`, e);
      continue;
    }
    if (provider === "cline" && r.status === 401 && !triedWorkosPrefix) {
      triedWorkosPrefix = true;
      clineAuth = `Bearer workos:${CLINE_API_KEY}`;
      console.error("llm proxy: cline 401, retrying with workos: prefix");
      try {
        r = await callCline(model);
      } catch (e) {
        console.error(`llm proxy: ${tag} fetch failed, trying next`, e);
        continue;
      }
    }
    if (r.status === 401) {
      // Bad / revoked key. For Groq (primary) this is fatal; for Cline
      // (fallback) try remaining Cline models in case it's per-model.
      console.error(`llm proxy: ${tag} unauthorized (bad key)`);
      if (provider === "groq") {
        return res.status(502).json({ error: "AI is taking a tiny break" });
      }
      continue;
    }
    if (r.status === 404) {
      console.error(`llm proxy: model not found: ${tag}, trying next`);
      continue;
    }
    if (r.status === 429) {
      console.error(`llm proxy: ${tag} rate limited (429)`);
      return res
        .status(502)
        .json({ error: "AI is a bit busy, try again in a moment", throttled: true });
    }
    if (r.status >= 500) {
      console.error(`llm proxy: ${tag} status ${r.status}, trying next`);
      continue;
    }
    if (r.status === 403) {
      console.error(`llm proxy: no access to model: ${tag}, trying next`);
      continue;
    }
    if (!r.ok) {
      console.error(`llm proxy: ${tag} status ${r.status}`);
      return res.status(502).json({ error: "AI is taking a tiny break" });
    }

    let rawText = "";
    try {
      if (provider === "groq") {
        rawText = parseGroqJson(await r.json());
      } else {
        const ct = r.headers.get("content-type") || "";
        if (ct.includes("text/event-stream")) {
          const parsed = parseClineSse(await r.text());
          rawText = parsed.text;
          if (parsed.throttled) sawThrottle = true;
        } else {
          const j = (await r.json()) as {
            choices?: Array<{ message?: { content?: unknown } }>;
            data?: { choices?: Array<{ message?: { content?: unknown } }> };
          };
          const c =
            j.choices?.[0]?.message?.content ??
            j.data?.choices?.[0]?.message?.content;
          rawText = typeof c === "string" ? c : "";
        }
      }
    } catch {
      console.error(`llm proxy: ${tag} unreadable response, trying next`);
      continue;
    }
    const candidate = stripFences(rawText);
    if (!candidate) {
      console.error(`llm proxy: ${tag} returned empty text, trying next`);
      continue;
    }
    if (wantJson) {
      try {
        JSON.parse(candidate);
      } catch {
        console.error(`llm proxy: ${tag} returned invalid JSON, trying next`);
        continue;
      }
    }
    text = candidate;
    console.error(`llm proxy: answered by ${tag}`);
    break;
  }
  if (!text) {
    console.error("llm proxy: no working model");
    if (sawThrottle) {
      return res
        .status(502)
        .json({ error: "AI is a bit busy, try again in a moment", throttled: true });
    }
    return res.status(502).json({ error: "AI is taking a tiny break" });
  }
  return res.status(200).json({ text });
}
