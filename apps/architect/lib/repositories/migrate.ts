/**
 * Bundle migration + storage key — shared by local and Supabase stores.
 */

import type { CompanyWorkspace, KnownFact } from "@/types";
import {
  createSeedWorkspaces,
  type WorkspaceBundle,
} from "@/lib/workspace/seed";
import {
  createSeedKnowledge,
  emptyWorkspaceKnowledge,
  ensureWorkspaceKnowledge,
  hasProcessedKnowledge,
  knowledgeTimelineEvents,
} from "@/lib/knowledge";
import {
  blueprintTimelineEvent,
  createSeedBlueprints,
  emptyBlueprints,
  ensureBlueprints,
  ensureCurrentBlueprintId,
  latestBlueprint,
} from "@/lib/blueprint";
import { deriveSolutionArchitecture } from "@/lib/solution";
import { deriveBusinessProcesses } from "@/lib/processes";
import { buildDeliverablesPackage } from "@/lib/deliverables";
import { assembleImplementationPackage } from "@/lib/implementation-package";
import { deriveBrandExperience } from "@/lib/brand";
import { deriveCompanyModel } from "@/lib/company-model";
import { applyDiscoveryScore } from "@/lib/reasoning";
import {
  normalizeBusinessProcesses,
  normalizeConsultingIntelligence,
  normalizeSolutionArchitecture,
} from "@/lib/consulting";
import { ensureCompanyEvolution } from "@/lib/history";
import { createId } from "@/lib/utils";
import {
  PILOT_COMPANY_NAME,
  PILOT_COMPANY_WORKSPACE_ID,
} from "@/lib/auth/constants";

export const WORKSPACE_STORAGE_KEY = "isalwa.architect.company_memory.v1";

/** Legacy placeholder companies that must never reach the pilot UI. */
const REMOVED_DEMO_WORKSPACE_IDS = new Set([
  "ws_acme",
  "ws_viaggio",
  "ws_abc",
]);

/**
 * Unique to the old `lib/knowledge/seed.ts` fabricated pilot seed — every
 * mock asset it ever produced tagged its `source` field "... · mock" and
 * was never actually uploaded (see NO_FABRICATED_CONTENT.md). Real uploads
 * (`lib/documents/upload.ts`) never write that suffix, so this only ever
 * matches the old seed, no matter how the workspace was persisted
 * (localStorage or Supabase) before the seed was hollowed out.
 */
function looksLikeOldFabricatedKnowledgeSeed(
  workspace: CompanyWorkspace,
): boolean {
  const assets = workspace.knowledge?.assets ?? [];
  return (
    workspace.id === PILOT_COMPANY_WORKSPACE_ID &&
    assets.length > 0 &&
    assets.every((asset) => asset.source.includes("· mock"))
  );
}

/**
 * A single fact that the old `lib/workspace/seed.ts` pilot seed invented.
 *
 * Two fingerprints, both unique to that seed: the `seed_fact_` key prefix,
 * and the literal placeholder evidence string (a real fact always cites the
 * client's own words or the knowledge asset it came from).
 */
function isFabricatedSeedFact(fact: KnownFact): boolean {
  return (
    fact.key.startsWith("seed_fact_") ||
    fact.evidence.includes("Sesión de descubrimiento anterior")
  );
}

/**
 * Does anything real remain once the fabricated facts are gone? A recorded
 * meeting or a processed upload is evidence a human actually produced, so
 * the workspace must never be reset out from under it.
 */
function hasRealEvidence(workspace: CompanyWorkspace): boolean {
  return (
    workspace.meetings.length > 0 ||
    workspace.documents.length > 0 ||
    hasProcessedKnowledge(workspace.knowledge)
  );
}

/** The exact two summaries the old fabricated knowledge seed ever wrote. */
const STALE_FABRICATED_KNOWLEDGE_DESCRIPTIONS = new Set([
  "Se revisaron dos presentaciones de estrategia y una nota de traspaso de proyecto antes de la última sesión.",
  "Notas de proceso parciales con varios responsables sin definir.",
]);

/** Drop placeholder tenants and ensure the pilot ISALWA workspace exists. */
function purgeDemoWorkspaces(bundle: WorkspaceBundle): WorkspaceBundle {
  const workspaces = bundle.workspaces
    .filter((workspace) => !REMOVED_DEMO_WORKSPACE_IDS.has(workspace.id))
    .map((workspace) =>
      workspace.id === PILOT_COMPANY_WORKSPACE_ID
        ? { ...workspace, companyName: PILOT_COMPANY_NAME }
        : workspace,
    );

  const hasPilot = workspaces.some(
    (workspace) => workspace.id === PILOT_COMPANY_WORKSPACE_ID,
  );

  return {
    ...bundle,
    workspaces: hasPilot
      ? workspaces
      : [...createSeedWorkspaces(), ...workspaces],
  };
}

/** Mission 3+4+6+7+9+10+18 migration — Knowledge, Blueprint, Solution, Processes, Deliverables, Brand, Implementation Package. */
export function migrateBundle(bundle: WorkspaceBundle): WorkspaceBundle {
  const purged = purgeDemoWorkspaces(bundle);
  return {
    ...purged,
    workspaces: purged.workspaces.map((workspace) => {
      let next: CompanyWorkspace = {
        ...workspace,
        solutionArchitecture: workspace.solutionArchitecture ?? null,
        businessProcesses: workspace.businessProcesses ?? null,
        deliverables: workspace.deliverables ?? null,
        brandExperience: workspace.brandExperience ?? null,
        brandOverrides: workspace.brandOverrides ?? null,
        companyModel: workspace.companyModel ?? null,
        implementationPackage: workspace.implementationPackage ?? null,
        evolutionHistory: workspace.evolutionHistory,
      };

      if (!next.knowledge?.assets || looksLikeOldFabricatedKnowledgeSeed(next)) {
        // Heal: this either has no knowledge yet, or is a ws_isalwa row
        // persisted before the seed was hollowed out and still carries the
        // two fabricated "mock" assets — never re-seed fake evidence, drop
        // back to the same honest empty shell every new workspace gets.
        const knowledge =
          next.id.startsWith("ws_")
            ? createSeedKnowledge(next.id)
            : emptyWorkspaceKnowledge();
        const knowledgeEvents = knowledgeTimelineEvents(next.id, knowledge);
        const prunedTimeline = next.timeline.filter(
          (e) =>
            !(
              e.category === "knowledge" &&
              STALE_FABRICATED_KNOWLEDGE_DESCRIPTIONS.has(e.description)
            ),
        );
        const existingIds = new Set(prunedTimeline.map((e) => e.title));
        next = {
          ...next,
          knowledge,
          timeline: [
            ...knowledgeEvents.filter((e) => !existingIds.has(e.title)),
            ...prunedTimeline,
          ].sort((a, b) => b.date.localeCompare(a.date)),
        };
      } else {
        next = {
          ...next,
          knowledge: ensureWorkspaceKnowledge(next.knowledge),
        };
      }

      const blueprints = ensureBlueprints(next.blueprints);
      if (blueprints.length === 0) {
        const seeded = createSeedBlueprints({
          ...next,
          blueprints: emptyBlueprints(),
          currentBlueprintId: null,
          solutionArchitecture: null,
          businessProcesses: null,
          brandExperience: null,
          companyModel: null,
          deliverables: null,
          implementationPackage: null,
        });
        const existingTitles = new Set(next.timeline.map((e) => e.title));
        const blueprintEvents = seeded
          .map(blueprintTimelineEvent)
          .filter((e) => !existingTitles.has(e.title));
        next = {
          ...next,
          blueprints: seeded,
          currentBlueprintId: seeded[0]?.id ?? null,
          timeline: [...blueprintEvents, ...next.timeline].sort((a, b) =>
            b.date.localeCompare(a.date),
          ),
        };
      } else {
        next = {
          ...next,
          blueprints,
          currentBlueprintId: ensureCurrentBlueprintId({
            blueprints,
            currentBlueprintId: next.currentBlueprintId ?? null,
          }),
        };
      }

      const current = latestBlueprint(next.blueprints);
      if (
        current &&
        (!next.solutionArchitecture ||
          next.solutionArchitecture.blueprintId !== current.id)
      ) {
        const solutionArchitecture = deriveSolutionArchitecture({
          workspace: next,
          blueprint: current,
        });
        const existingTitles = new Set(next.timeline.map((e) => e.title));
        const title = `Solution Architecture · Blueprint v${solutionArchitecture.blueprintVersion}`;
        next = {
          ...next,
          solutionArchitecture,
          timeline: existingTitles.has(title)
            ? next.timeline
            : [
                {
                  id: createId("timeline"),
                  workspaceId: next.id,
                  date: solutionArchitecture.generatedAt,
                  title,
                  description: solutionArchitecture.summary,
                  category: "solution" as const,
                },
                ...next.timeline,
              ].sort((a, b) => b.date.localeCompare(a.date)),
        };
      }

      if (
        current &&
        (!next.businessProcesses ||
          next.businessProcesses.blueprintId !== current.id)
      ) {
        const businessProcesses = deriveBusinessProcesses({
          workspace: next,
          blueprint: current,
        });
        const existingTitles = new Set(next.timeline.map((e) => e.title));
        const title = `Business Processes · Blueprint v${businessProcesses.blueprintVersion}`;
        next = {
          ...next,
          businessProcesses,
          timeline: existingTitles.has(title)
            ? next.timeline
            : [
                {
                  id: createId("timeline"),
                  workspaceId: next.id,
                  date: businessProcesses.generatedAt,
                  title,
                  description: businessProcesses.summary,
                  category: "process" as const,
                },
                ...next.timeline,
              ].sort((a, b) => b.date.localeCompare(a.date)),
        };
      }

      if (
        current &&
        (!next.deliverables ||
          next.deliverables.blueprintId !== current.id)
      ) {
        const deliverables = buildDeliverablesPackage(next);
        const existingTitles = new Set(next.timeline.map((e) => e.title));
        const title = `Deliverables · Blueprint v${deliverables.blueprintVersion ?? current.version}`;
        next = {
          ...next,
          deliverables,
          timeline: existingTitles.has(title)
            ? next.timeline
            : [
                {
                  id: createId("timeline"),
                  workspaceId: next.id,
                  date: deliverables.generatedAt,
                  title,
                  description: deliverables.summary,
                  category: "deliverable" as const,
                },
                ...next.timeline,
              ].sort((a, b) => b.date.localeCompare(a.date)),
        };
      }

      if (
        current &&
        (!next.brandExperience ||
          next.brandExperience.blueprintId !== current.id)
      ) {
        const brandExperience = deriveBrandExperience({
          workspace: next,
          blueprint: current,
        });
        const existingTitles = new Set(next.timeline.map((e) => e.title));
        const title = `Brand & Experience · Blueprint v${brandExperience.blueprintVersion}`;
        next = {
          ...next,
          brandExperience,
          timeline: existingTitles.has(title)
            ? next.timeline
            : [
                {
                  id: createId("timeline"),
                  workspaceId: next.id,
                  date: brandExperience.generatedAt,
                  title,
                  description: brandExperience.summary,
                  category: "brand" as const,
                },
                ...next.timeline,
              ].sort((a, b) => b.date.localeCompare(a.date)),
        };
      }

      
      if (
        current &&
        (!next.companyModel ||
          next.companyModel.blueprintId !== current.id)
      ) {
        const companyModel = deriveCompanyModel({
          workspace: next,
          blueprint: current,
        });
        const existingTitlesCm = new Set(next.timeline.map((e) => e.title));
        const cmTitle = `Company Model · Blueprint v${companyModel.blueprintVersion}`;
        next = {
          ...next,
          companyModel,
          timeline: existingTitlesCm.has(cmTitle)
            ? next.timeline
            : [
                {
                  id: createId("timeline"),
                  workspaceId: next.id,
                  date: companyModel.generatedAt,
                  title: cmTitle,
                  description: companyModel.summary,
                  category: "company_model" as const,
                },
                ...next.timeline,
              ].sort((a, b) => b.date.localeCompare(a.date)),
        };
      }

      // Honest scores: drop fabricated evidence, then recompute the score
      // from whatever real evidence survives (see NO_FABRICATED_CONTENT.md).
      // Never re-seed fake evidence — and, just as importantly, never delete
      // a real answer to get rid of a fabricated one: the heal prunes the
      // fabricated facts individually and only resets the workspace when
      // nothing real is left behind (see PERSISTENCE_ALVARO_FIX.md).
      if (next.conversationMemory) {
        const realFacts = next.conversationMemory.knownFacts.filter(
          (fact) => !isFabricatedSeedFact(fact),
        );
        const prunedFabricated =
          realFacts.length !== next.conversationMemory.knownFacts.length;

        if (
          next.id === PILOT_COMPANY_WORKSPACE_ID &&
          prunedFabricated &&
          realFacts.length === 0 &&
          !hasRealEvidence(next)
        ) {
          next = {
            ...next,
            conversationMemory: null,
            businessUnderstanding: 0,
            openQuestions: [],
            painPoints: [],
            meetings: [],
            recommendations: [],
            modules: [],
            blueprints: emptyBlueprints(),
            currentBlueprintId: null,
            solutionArchitecture: null,
            businessProcesses: null,
            brandExperience: null,
            companyModel: null,
            deliverables: null,
            implementationPackage: null,
          };
        } else {
          // `applyDiscoveryScore` recomputes from the surviving facts, so a
          // stale/desynced persisted score self-corrects without a reset.
          const memory = applyDiscoveryScore(
            prunedFabricated
              ? { ...next.conversationMemory, knownFacts: realFacts }
              : next.conversationMemory,
          );
          next = {
            ...next,
            conversationMemory: memory,
            businessUnderstanding: memory.score.overall,
          };
        }
      }


      // Mission 18 — assemble after honest scores; clear when below gate.
      {
        const implementationPackage = assembleImplementationPackage(next);
        const stale =
          next.implementationPackage?.blueprintId !==
            (implementationPackage?.blueprintId ?? null) ||
          next.implementationPackage?.id !==
            (implementationPackage?.id ?? null);
        if (implementationPackage && (!next.implementationPackage || stale)) {
          const existingTitles = new Set(next.timeline.map((e) => e.title));
          const title = implementationPackage.gate.ready
            ? `Implementation Package · Blueprint v${implementationPackage.blueprintVersion ?? current?.version ?? 1}`
            : `Implementation Package (gated) · ${next.companyName}`;
          next = {
            ...next,
            implementationPackage,
            timeline: existingTitles.has(title)
              ? next.timeline
              : [
                  {
                    id: createId("timeline"),
                    workspaceId: next.id,
                    date: implementationPackage.generatedAt,
                    title,
                    description: implementationPackage.summary,
                    category: "implementation" as const,
                  },
                  ...next.timeline,
                ].sort((a, b) => b.date.localeCompare(a.date)),
          };
        } else if (!implementationPackage && next.implementationPackage) {
          next = { ...next, implementationPackage: null };
        }
      }

      // HOTFIX — always re-stamp consulting/process/roadmap display copy from
      // the current Spanish rule tables, keyed by stable ids
      // (patternId/kind/phase number). Guards against workspaces whose
      // conversationMemory.consulting, businessProcesses.bottlenecks, or
      // solutionArchitecture.roadmap were persisted by an older (pre-Spanish)
      // version of these rule tables — see SPANISH_CLIENT_EXPERIENCE_100.md.
      if (next.conversationMemory?.consulting) {
        next = {
          ...next,
          conversationMemory: {
            ...next.conversationMemory,
            consulting: normalizeConsultingIntelligence(
              next.conversationMemory.consulting,
            ),
          },
        };
      }
      if (next.businessProcesses) {
        next = {
          ...next,
          businessProcesses: normalizeBusinessProcesses(next.businessProcesses),
        };
      }
      if (next.solutionArchitecture) {
        next = {
          ...next,
          solutionArchitecture: normalizeSolutionArchitecture(
            next.solutionArchitecture,
          ),
        };
      }

      next = ensureCompanyEvolution(next);

      return next;
    }),
  };
}
