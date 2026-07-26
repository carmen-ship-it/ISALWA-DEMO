/** Deterministic IDs so intra-model references stay stable within a derive. */
export function modelId(prefix: string, key: string): string {
  const safe = key
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
  return `${prefix}_${safe || "unknown"}`;
}
