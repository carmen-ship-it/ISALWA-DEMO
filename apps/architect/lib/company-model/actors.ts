import type {
  BusinessBlueprint,
  CompanyDepartment,
  CompanyModelEvidenceRef,
  CompanyPerson,
  CompanyRole,
  CompanyWorkspace,
} from "@/types";
import { departmentByName } from "./departments";
import { modelId } from "./ids";

export function deriveRoles(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  departments: CompanyDepartment[],
  evidence: CompanyModelEvidenceRef[],
): CompanyRole[] {
  const solutionRoles = workspace.solutionArchitecture?.roles ?? [];
  const roles: CompanyRole[] = [];
  const seen = new Set<string>();

  for (const role of solutionRoles) {
    const key = role.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const department =
      departmentByName(departments, role.name) ??
      departments.find((d) =>
        role.responsibilities.some((r) =>
          r.toLowerCase().includes(d.name.toLowerCase()),
        ),
      ) ??
      null;
    roles.push({
      id: modelId("crole", role.id),
      name: role.name,
      solutionRoleId: role.id,
      departmentId: department?.id ?? null,
      personIds: [],
      responsibilities: [...role.responsibilities],
      confidence: role.confidence,
      evidence: evidence.slice(0, 2),
    });
  }

  for (const name of blueprint.roles) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    roles.push({
      id: modelId("crole", name),
      name,
      solutionRoleId: null,
      departmentId: departmentByName(departments, name)?.id ?? null,
      personIds: [],
      responsibilities: [],
      confidence: 0.65,
      evidence: [
        {
          source: "blueprint",
          id: blueprint.id,
          label: `Role ${name}`,
        },
      ],
    });
  }

  return roles;
}

export function derivePeople(
  workspace: CompanyWorkspace,
  departments: CompanyDepartment[],
  roles: CompanyRole[],
  evidence: CompanyModelEvidenceRef[],
): CompanyPerson[] {
  const processActors = workspace.businessProcesses?.actors ?? [];
  const knowledgePeople =
    workspace.knowledge?.entities.filter((e) => e.kind === "Person") ?? [];
  const people: CompanyPerson[] = [];
  const seenNames = new Set<string>();

  for (const person of workspace.people) {
    const key = person.name.toLowerCase();
    seenNames.add(key);
    const department = departmentByName(departments, person.department);
    const processActor =
      processActors.find((a) => a.name.toLowerCase() === key) ??
      (person.role
        ? processActors.find(
            (a) => a.name.toLowerCase() === person.role!.toLowerCase(),
          )
        : undefined);
    const knowledgeMatch = knowledgePeople.find(
      (k) => k.name.toLowerCase() === key,
    );
    const roleIds = roles
      .filter(
        (r) =>
          (person.role &&
            r.name.toLowerCase() === person.role.toLowerCase()) ||
          (processActor &&
            r.name.toLowerCase() === processActor.name.toLowerCase()),
      )
      .map((r) => r.id);

    people.push({
      id: modelId("cperson", person.id),
      name: person.name,
      workspacePersonId: person.id,
      processActorId: processActor?.id ?? null,
      knowledgeEntityId: knowledgeMatch?.id ?? null,
      roleIds,
      departmentId: department?.id ?? null,
      email: person.email,
      notes: person.notes,
      confidence: 0.9,
      evidence: [
        {
          source: "people",
          id: person.id,
          label: person.name,
        },
        ...evidence.slice(0, 1),
      ],
    });
  }

  // Process actors without a workspace person still appear as operating actors.
  for (const actor of processActors) {
    const key = actor.name.toLowerCase();
    if (seenNames.has(key) || key === "unknown") continue;
    seenNames.add(key);
    const department = departmentByName(departments, actor.department);
    const roleIds = roles
      .filter((r) => r.name.toLowerCase() === key)
      .map((r) => r.id);
    people.push({
      id: modelId("cperson", actor.id),
      name: actor.name,
      workspacePersonId: null,
      processActorId: actor.id,
      knowledgeEntityId:
        knowledgePeople.find((k) => k.name.toLowerCase() === key)?.id ?? null,
      roleIds,
      departmentId: department?.id ?? null,
      email: null,
      notes: "Derived from process actors",
      confidence: actor.confidence,
      evidence: actor.evidence.slice(0, 2).map((e) => ({
        source: e.source === "solution" ? "solution" : "process",
        id: e.id,
        label: e.label,
      })),
    });
  }

  // Wire role → person back-refs
  for (const role of roles) {
    role.personIds = people
      .filter((p) => p.roleIds.includes(role.id))
      .map((p) => p.id);
  }

  // Wire department → role / person
  for (const dept of departments) {
    dept.personIds = people
      .filter((p) => p.departmentId === dept.id)
      .map((p) => p.id);
    dept.roleIds = roles
      .filter((r) => r.departmentId === dept.id)
      .map((r) => r.id);
  }

  return people;
}
