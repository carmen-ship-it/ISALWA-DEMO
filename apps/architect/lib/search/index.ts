import type {
  CompanyWorkspace,
  SearchHit,
  WorkspaceKnowledge,
} from "@/types";
import { ensureWorkspaceKnowledge } from "@/lib/knowledge";

/**
 * Lightweight local search — Mission 3 includes Knowledge · Documents · Entities · Relationships.
 */
export function searchCompanyMemory(
  workspaces: CompanyWorkspace[],
  query: string,
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hits: SearchHit[] = [];

  for (const workspace of workspaces) {
    const knowledge = ensureWorkspaceKnowledge(workspace.knowledge);

    if (workspace.companyName.toLowerCase().includes(q)) {
      hits.push({
        id: workspace.id,
        kind: "company",
        title: workspace.companyName,
        subtitle: `${workspace.currentStage} · ${workspace.businessUnderstanding}% understood`,
        workspaceId: workspace.id,
        href: `/workspace/${workspace.id}`,
      });
    }

    for (const person of workspace.people) {
      if (
        person.name.toLowerCase().includes(q) ||
        (person.role ?? "").toLowerCase().includes(q)
      ) {
        hits.push({
          id: person.id,
          kind: "person",
          title: person.name,
          subtitle: `${person.role ?? "Contact"} · ${workspace.companyName}`,
          workspaceId: workspace.id,
          href: `/workspace/${workspace.id}`,
        });
      }
    }

    for (const meeting of workspace.meetings) {
      if (
        meeting.title.toLowerCase().includes(q) ||
        meeting.summary.toLowerCase().includes(q)
      ) {
        hits.push({
          id: meeting.id,
          kind: "meeting",
          title: meeting.title,
          subtitle: workspace.companyName,
          workspaceId: workspace.id,
          href: `/workspace/${workspace.id}`,
        });
      }
    }

    for (const pain of workspace.painPoints) {
      if (
        pain.title.toLowerCase().includes(q) ||
        pain.description.toLowerCase().includes(q)
      ) {
        hits.push({
          id: pain.id,
          kind: "pain_point",
          title: pain.title,
          subtitle: workspace.companyName,
          workspaceId: workspace.id,
          href: `/workspace/${workspace.id}`,
        });
      }
    }

    for (const rec of workspace.recommendations) {
      if (
        rec.title.toLowerCase().includes(q) ||
        rec.rationale.toLowerCase().includes(q)
      ) {
        hits.push({
          id: rec.id,
          kind: "recommendation",
          title: rec.title,
          subtitle: workspace.companyName,
          workspaceId: workspace.id,
          href: `/workspace/${workspace.id}`,
        });
      }
    }

    for (const observation of workspace.observations) {
      if (
        observation.title.toLowerCase().includes(q) ||
        observation.body.toLowerCase().includes(q)
      ) {
        hits.push({
          id: observation.id,
          kind: "observation",
          title: observation.title,
          subtitle: workspace.companyName,
          workspaceId: workspace.id,
          href: `/workspace/${workspace.id}`,
        });
      }
    }

    for (const document of workspace.documents) {
      if (
        document.title.toLowerCase().includes(q) ||
        document.kind.toLowerCase().includes(q)
      ) {
        hits.push({
          id: document.id,
          kind: "document",
          title: document.title,
          subtitle: `${document.kind} · ${document.status}`,
          workspaceId: workspace.id,
          href: `/workspace/${workspace.id}`,
        });
      }
    }

    appendKnowledgeHits(hits, workspace, knowledge, q);

    for (const blueprint of workspace.blueprints ?? []) {
      if (
        blueprint.title.toLowerCase().includes(q) ||
        blueprint.summary.toLowerCase().includes(q) ||
        `v${blueprint.version}`.includes(q) ||
        blueprint.capabilities.some((c) => c.name.toLowerCase().includes(q))
      ) {
        hits.push({
          id: blueprint.id,
          kind: "blueprint",
          title: blueprint.title,
          subtitle: `Blueprint v${blueprint.version} · ${workspace.companyName}`,
          workspaceId: workspace.id,
          href: `/workspace/${workspace.id}`,
        });
      }
    }

    const solution = workspace.solutionArchitecture;
    if (solution) {
      if (
        solution.summary.toLowerCase().includes(q) ||
        solution.modules.some((m) => m.name.toLowerCase().includes(q)) ||
        solution.entities.some((e) => e.name.toLowerCase().includes(q))
      ) {
        hits.push({
          id: solution.id,
          kind: "solution",
          title: `Solution Architecture v${solution.blueprintVersion}`,
          subtitle: `${solution.modules.length} modules · ${workspace.companyName}`,
          workspaceId: workspace.id,
          href: `/workspace/${workspace.id}`,
        });
      }
    }

    const processes = workspace.businessProcesses;
    if (processes) {
      if (
        processes.summary.toLowerCase().includes(q) ||
        processes.workflows.some((w) => w.name.toLowerCase().includes(q)) ||
        processes.actors.some((a) => a.name.toLowerCase().includes(q)) ||
        processes.bottlenecks.some((b) => b.title.toLowerCase().includes(q))
      ) {
        hits.push({
          id: processes.id,
          kind: "process",
          title: `Business Processes v${processes.blueprintVersion}`,
          subtitle: `${processes.workflows.length} workflows · ${workspace.companyName}`,
          workspaceId: workspace.id,
          href: `/workspace/${workspace.id}`,
        });
      }
    }

    const deliverables = workspace.deliverables;
    if (deliverables) {
      if (
        deliverables.summary.toLowerCase().includes(q) ||
        deliverables.executiveSummary.vision.toLowerCase().includes(q) ||
        deliverables.cursorContext.purpose.toLowerCase().includes(q) ||
        "deliverable".includes(q) ||
        q === "prd" ||
        q === "cursor"
      ) {
        hits.push({
          id: deliverables.id,
          kind: "deliverable",
          title: `Deliverables · ${deliverables.companyName}`,
          subtitle: `Package · ${workspace.companyName}`,
          workspaceId: workspace.id,
          href: `/workspace/${workspace.id}`,
        });
      }
    }
  }

  return hits.slice(0, 32);
}

function appendKnowledgeHits(
  hits: SearchHit[],
  workspace: CompanyWorkspace,
  knowledge: WorkspaceKnowledge,
  q: string,
): void {
  for (const asset of knowledge.assets) {
    if (
      asset.title.toLowerCase().includes(q) ||
      asset.category.toLowerCase().includes(q) ||
      asset.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      (asset.summary ?? "").toLowerCase().includes(q)
    ) {
      hits.push({
        id: asset.id,
        kind: "knowledge",
        title: asset.title,
        subtitle: `${asset.category} · ${asset.status}`,
        workspaceId: workspace.id,
        href: `/workspace/${workspace.id}`,
      });
    }
  }

  for (const entity of knowledge.entities) {
    if (
      entity.name.toLowerCase().includes(q) ||
      entity.kind.toLowerCase().includes(q) ||
      (entity.summary ?? "").toLowerCase().includes(q)
    ) {
      hits.push({
        id: entity.id,
        kind: "entity",
        title: entity.name,
        subtitle: `${entity.kind} · ${workspace.companyName}`,
        workspaceId: workspace.id,
        href: `/workspace/${workspace.id}`,
      });
    }
  }

  for (const relationship of knowledge.relationships) {
    if (
      relationship.label.toLowerCase().includes(q) ||
      relationship.kind.toLowerCase().includes(q)
    ) {
      hits.push({
        id: relationship.id,
        kind: "relationship",
        title: relationship.label,
        subtitle: `${relationship.kind} · ${workspace.companyName}`,
        workspaceId: workspace.id,
        href: `/workspace/${workspace.id}`,
      });
    }
  }
}
