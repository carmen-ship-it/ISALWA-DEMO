/**
 * Retrieval — chunk search plus RetrievalPack context packing (Mission C).
 *
 *   chunks.ts  `retrieveRelevantChunks` — embed a query through the central
 *              AI provider, rank the workspace's chunk store against it.
 *   pack.ts    `buildRetrievalPack` / `buildRetrievalPackSync` — the bounded,
 *              provenance-tagged evidence slice handed to the interview
 *              planner and the Consulting Intelligence cycle. See
 *              `RETRIEVAL_PACK.md` for the full write-up.
 *
 * This barrel is the only import path other modules should use — never
 * reach into `./chunks` or `./pack` directly.
 */

export { retrieveRelevantChunks, searchChunks } from "./chunks";
export type { ChunkSearchHit, RetrieveOptions } from "./chunks";

export {
  buildRetrievalPack,
  buildRetrievalPackSync,
  buildRetrievalQuery,
  MAX_RETRIEVAL_ITEMS,
} from "./pack";
export type { BuildRetrievalPackInput } from "./pack";

export type {
  RetrievalItem,
  RetrievalItemKind,
  RetrievalPack,
  RetrievalProvenance,
} from "./types";
