import { createId } from "@/lib/utils";
import type {
  ProcessDependency,
  ProcessEvidenceRef,
  ProcessWorkflow,
} from "@/types";

export function deriveDependencies(
  workflows: ProcessWorkflow[],
  evidence: ProcessEvidenceRef[],
): ProcessDependency[] {
  const deps: ProcessDependency[] = [];

  for (let i = 0; i < workflows.length; i++) {
    for (let j = 0; j < workflows.length; j++) {
      if (i === j) continue;
      const a = workflows[i];
      const b = workflows[j];

      const sharedActors = a.steps
        .map((s) => s.actor.toLowerCase())
        .filter((actor) =>
          b.steps.some((s) => s.actor.toLowerCase() === actor && actor !== "unknown"),
        );
      if (sharedActors.length > 0) {
        deps.push({
          id: createId("pdep"),
          fromWorkflowId: a.id,
          toWorkflowId: b.id,
          relationship: "shares_actor",
          confidence: 0.7,
          evidence: evidence.slice(0, 1),
        });
      }

      const aSystems = new Set(
        a.steps.flatMap((s) => s.systemsUsed.map((x) => x.toLowerCase())),
      );
      const sharedSystems = b.steps
        .flatMap((s) => s.systemsUsed)
        .filter((sys) => aSystems.has(sys.toLowerCase()));
      if (sharedSystems.length > 0) {
        deps.push({
          id: createId("pdep"),
          fromWorkflowId: a.id,
          toWorkflowId: b.id,
          relationship: "shares_system",
          confidence: 0.72,
          evidence: evidence.slice(0, 1),
        });
      }

      // Sales → Order → Finance style name heuristics (evidence-backed names only)
      if (
        /sales|quote|order/i.test(a.name) &&
        /financ|invoice|collect|purchas|product/i.test(b.name)
      ) {
        deps.push({
          id: createId("pdep"),
          fromWorkflowId: a.id,
          toWorkflowId: b.id,
          relationship: "feeds",
          confidence: 0.65,
          evidence: [
            {
              source: "blueprint",
              id: a.blueprintWorkflowId,
              label: `${a.name} → ${b.name}`,
            },
            ...evidence.slice(0, 1),
          ],
        });
      }
    }
  }

  // Deduplicate identical pairs/relationships
  const seen = new Set<string>();
  return deps.filter((d) => {
    const key = `${d.fromWorkflowId}:${d.toWorkflowId}:${d.relationship}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
