/**
 * Bundle migration + storage key — shared by local and Supabase stores.
 */

import type { CompanyWorkspace } from "@/types";
import {
  createSeedWorkspaces,
  type WorkspaceBundle,
} from "@/lib/workspace/seed";
import {
  createSeedKnowledge,
  emptyWorkspaceKnowledge,
  ensureWorkspaceKnowledge,
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

      if (!next.knowledge?.assets) {
        const knowledge =
          next.id.startsWith("ws_")
            ? createSeedKnowledge(next.id)
            : emptyWorkspaceKnowledge();
        const knowledgeEvents = knowledgeTimelineEvents(next.id, knowledge);
        const existingIds = new Set(next.timeline.map((e) => e.title));
        next = {
          ...next,
          knowledge,
          timeline: [
            ...knowledgeEvents.filter((e) => !existingIds.has(e.title)),
            ...next.timeline,
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

      // Honest scores: recompute memory; refresh pilot seed if legacy fake overall/0% dims.
      if (next.conversationMemory) {
        const legacyFactKeys = next.conversationMemory.knownFacts.some((f) =>
          f.key.startsWith("seed_fact_"),
        );
        const desynced =
          next.conversationMemory.score.overall > 0 &&
          next.conversationMemory.score.dimensions.every(
            (d) => d.confidence === 0,
          );

        if (
          next.id === PILOT_COMPANY_WORKSPACE_ID &&
          (legacyFactKeys || desynced)
        ) {
          const fresh = createSeedWorkspaces()[0];
          if (fresh?.conversationMemory) {
            next = {
              ...next,
              conversationMemory: fresh.conversationMemory,
              businessUnderstanding: fresh.businessUnderstanding,
              openQuestions: fresh.openQuestions,
              painPoints: fresh.painPoints,
            };
          }
        } else {
          const memory = applyDiscoveryScore(next.conversationMemory);
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
