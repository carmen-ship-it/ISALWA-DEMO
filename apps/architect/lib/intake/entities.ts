/**
 * Unified Business Knowledge Intake — entity merge.
 *
 * Departments, Systems, Roles (Person + role metadata), Documents, and
 * Processes (Workflow) are all just `KnowledgeEntity` kinds — reused
 * directly from the existing Knowledge Engine, never duplicated. Merge is
 * additive: matching entities gain a new source reference and a reinforced
 * confidence; nothing is ever overwritten or deleted.
 */

import { createId, nowIso } from "@/lib/utils";
import type { KnowledgeEntity } from "@/types";
import type { IntakeEntity } from "./contracts";
import { reinforceConfidence } from "./confidence";

export interface EntityMergeResult {
  entities: KnowledgeEntity[];
  added: number;
  reinforced: number;
  /** `${kind}:${lowercased name}` → resolved KnowledgeEntity.id, for relationship resolution. */
  nameIndex: Map<string, string>;
}

function keyFor(kind: string, name: string): string {
  return `${kind}:${name.trim().toLowerCase()}`;
}

export function mergeIntakeEntities(
  existing: KnowledgeEntity[],
  incoming: IntakeEntity[],
  workspaceId: string,
  assetId: string,
): EntityMergeResult {
  const nameIndex = new Map<string, string>();
  for (const entity of existing) {
    nameIndex.set(keyFor(entity.kind, entity.name), entity.id);
  }

  const merged = [...existing];
  let added = 0;
  let reinforced = 0;

  for (const intakeEntity of incoming) {
    const key = keyFor(intakeEntity.kind, intakeEntity.name);
    const existingId = nameIndex.get(key);
    const found = existingId
      ? merged.find((e) => e.id === existingId)
      : undefined;

    if (found) {
      found.sourceAssetIds = Array.from(
        new Set([...found.sourceAssetIds, assetId]),
      );
      found.confidence = reinforceConfidence(
        found.confidence,
        intakeEntity.confidence,
      );
      found.summary = found.summary ?? intakeEntity.summary;
      reinforced += 1;
      continue;
    }

    const created: KnowledgeEntity = {
      id: createId("entity"),
      workspaceId,
      kind: intakeEntity.kind,
      name: intakeEntity.name,
      summary: intakeEntity.summary,
      sourceAssetIds: [assetId],
      confidence: intakeEntity.confidence,
      metadata: { ...intakeEntity.metadata, mergedAt: nowIso() },
    };
    merged.push(created);
    nameIndex.set(key, created.id);
    added += 1;
  }

  return { entities: merged, added, reinforced, nameIndex };
}
