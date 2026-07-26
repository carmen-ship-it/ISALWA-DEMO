/**
 * Unified Business Knowledge Intake — relationship merge.
 *
 * Relationships resolve against the entity name index produced by
 * `entities.ts` in the same merge pass. A relationship whose endpoints were
 * not found among the merged entities is skipped rather than created with a
 * dangling reference — honest gaps over invented structure.
 */

import { createId } from "@/lib/utils";
import type { KnowledgeRelationship } from "@/types";
import type { IntakeRelationship } from "./contracts";
import { reinforceConfidence } from "./confidence";

export interface RelationshipMergeResult {
  relationships: KnowledgeRelationship[];
  added: number;
  reinforced: number;
  skipped: number;
}

export function mergeIntakeRelationships(
  existing: KnowledgeRelationship[],
  incoming: IntakeRelationship[],
  workspaceId: string,
  assetId: string,
  nameIndex: Map<string, string>,
): RelationshipMergeResult {
  const merged = [...existing];
  let added = 0;
  let reinforced = 0;
  let skipped = 0;

  for (const rel of incoming) {
    const fromId = findEntityId(nameIndex, rel.fromEntityName);
    const toId = findEntityId(nameIndex, rel.toEntityName);
    if (!fromId || !toId) {
      skipped += 1;
      continue;
    }

    const found = merged.find(
      (r) =>
        r.fromEntityId === fromId && r.toEntityId === toId && r.kind === rel.kind,
    );
    if (found) {
      found.sourceAssetIds = Array.from(
        new Set([...found.sourceAssetIds, assetId]),
      );
      found.confidence = reinforceConfidence(found.confidence, rel.confidence);
      reinforced += 1;
      continue;
    }

    merged.push({
      id: createId("relationship"),
      workspaceId,
      kind: rel.kind,
      fromEntityId: fromId,
      toEntityId: toId,
      label: rel.label,
      sourceAssetIds: [assetId],
      confidence: rel.confidence,
    });
    added += 1;
  }

  return { relationships: merged, added, reinforced, skipped };
}

function findEntityId(
  nameIndex: Map<string, string>,
  name: string,
): string | null {
  const normalized = name.trim().toLowerCase();
  for (const [key, id] of nameIndex) {
    if (key.endsWith(`:${normalized}`)) return id;
  }
  return null;
}
