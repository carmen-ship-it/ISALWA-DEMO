# AI Provider Abstraction

Central AI config + provider abstraction for Architect. The rest of the app
never knows which LLM answers a request — it calls `ai.chat()`, `ai.embed()`
or `ai.summarize()` and lets `lib/ai` route based on environment.

## Why

Before this, model ids were hardcoded in two places (`gpt-4o-mini` in the OCR
route, `text-embedding-3-small` in the embeddings route) and a third,
unused, `lib/llm/provider.ts` defaulted to `gpt-4o-mini` too. Swapping
providers meant editing call sites. Now every call site reads
`AI_CONFIG.model` / `AI_CONFIG.embeddingModel`, or accepts a per-call
override — nothing else is allowed to hardcode a vendor's model string.

## Structure

```
lib/ai/
  config.ts       AI_CONFIG — provider, model, embeddingModel, baseUrl, apiKey (from env)
  provider.ts     routes requests to the right adapter; back-compat shims for lib/llm
  gemini.ts       OpenAI-compat Gemini adapter (chat + embeddings)
  openai.ts       generic OpenAI-compatible client (OpenAI, Azure, Groq, Together, Ollama…)
  anthropic.ts    Messages API chat (real); embeddings — honest stub (Anthropic has none)
  index.ts        public surface: ai.chat / ai.embed / ai.summarize
  prompts/        prompt registry starters (named, shared instruction strings)
  retrieval/      thin facade over lib/documents/vectors.ts — Mission C deepens this
  memory/         thin facade over lib/memory + lib/search — does not rewrite Mission G
```

`lib/llm/` still exists and still exports `OpenAICompatibleProvider`,
`LocalHeuristicProvider`, `createLLMProvider`, `toChatMessages` — it now
re-exports them from `lib/ai/provider.ts` so no existing import breaks. New
code should import from `lib/ai` directly.

## Public API

```ts
import { ai } from "@/lib/ai";

const { text, model, provider } = await ai.chat([
  { role: "system", content: "..." },
  { role: "user", content: "..." },
]);

const { vectors, model, dimensions } = await ai.embed(["chunk one", "chunk two"]);

const { text } = await ai.summarize(longText);
```

Every call accepts optional per-call overrides (`model`, `temperature`,
`maxTokens`, `apiKey`, `baseUrl`, `provider`) — this is how the OCR and
embeddings routes keep their own `ARCHITECT_OCR_*` / `ARCHITECT_EMBEDDINGS_*`
env fallbacks without a second config system.

`ai.chat` supports multimodal messages (`content: [{ type: "text", ... }, { type: "image_url", ... }]`)
for vision use cases like OCR.

## Config: `AI_CONFIG`

```ts
export const AI_CONFIG: {
  provider: "gemini" | "openai" | "anthropic" | "local"; // inferred from env
  model: string;           // ARCHITECT_LLM_MODEL, else a provider-specific default
  embeddingModel: string;  // ARCHITECT_EMBEDDINGS_MODEL, else a provider-specific default
  baseUrl: string | undefined; // ARCHITECT_LLM_BASE_URL, else a provider-specific default
  apiKey: string | undefined;  // ARCHITECT_LLM_API_KEY ?? OPENAI_API_KEY
};
```

Provider inference order:

1. `ARCHITECT_LLM_PROVIDER` if set to `"gemini" | "openai" | "anthropic" | "local"`.
2. The hostname in `ARCHITECT_LLM_BASE_URL` (`generativelanguage.googleapis.com` → `gemini`,
   `api.anthropic.com` → `anthropic`).
3. `"openai"` — the default for any other OpenAI-compatible base URL, or when
   a key is set with no base URL at all.
4. `"local"` whenever no API key is configured — regardless of what
   `ARCHITECT_LLM_PROVIDER` says. Architect never throws for a missing key.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `ARCHITECT_LLM_PROVIDER` | Optional explicit provider (`gemini`, `openai`, `anthropic`, `local`). |
| `ARCHITECT_LLM_API_KEY` | Server-only API key. Falls back to `OPENAI_API_KEY`. Never sent to the browser. |
| `ARCHITECT_LLM_BASE_URL` | OpenAI-compatible base URL. Gemini's OpenAI-compat URL in `.env.local` is `https://generativelanguage.googleapis.com/v1beta/openai/`. |
| `ARCHITECT_LLM_MODEL` | Chat model id, e.g. `gemini-flash-latest`. |
| `ARCHITECT_EMBEDDINGS_MODEL` | Embedding model id override. |
| `ARCHITECT_OCR_API_KEY` / `ARCHITECT_OCR_BASE_URL` / `ARCHITECT_OCR_MODEL` | Per-route overrides for `/api/documents/ocr`, falling back to the `ARCHITECT_LLM_*` values above. |
| `ARCHITECT_EMBEDDINGS_API_KEY` / `ARCHITECT_EMBEDDINGS_BASE_URL` | Per-route overrides for `/api/documents/embeddings`. |

`.env.local` holds real secrets and is **never committed**. See `.env.example`
for the documented, empty template.

## No key configured

`AI_CONFIG.provider` resolves to `"local"` and `ai.chat()` returns a
deterministic, no-network response from `LocalHeuristicProvider` (currently:
echoes the last user turn, or a fixed fallback line). `ai.embed()` throws a
clear error instead of fabricating a vector — callers that need an honest
"not available" response (OCR, embeddings routes) check for a key first and
never reach that path, matching their pre-existing `available: false`
contract.

## Anthropic

Chat is implemented against the real Messages API. There is no Anthropic
embeddings API, so `ai.embed()` with `provider: "anthropic"` (or
`ARCHITECT_LLM_PROVIDER=anthropic` with no embeddings override) throws a
clear, actionable error rather than silently calling a different vendor.
Configure `gemini` or `openai` for embeddings.

## Migrated call sites

- `lib/llm/provider.ts` — now a re-export of `lib/ai/provider.ts`.
- `app/api/documents/ocr/route.ts` — vision transcription now goes through
  `ai.chat()`; no more hardcoded `DEFAULT_MODEL = "gpt-4o-mini"`.
- `app/api/documents/embeddings/route.ts` — now goes through `ai.embed()`;
  the default model is `AI_CONFIG.embeddingModel`, not a hardcoded string.

## What did not change

- The OCR and embeddings routes' honest `available: false` contract, their
  server-only key handling, and their per-route env var overrides.
- `lib/memory` (Mission G working memory) and `lib/documents/vectors.ts`
  (chunk vector store) — `lib/ai/memory` and `lib/ai/retrieval` are thin
  facades over them, not rewrites.
- Spanish-language product copy — this is infra, not user-facing text.
