import type {
  ArchitectRole,
  AuthProfile,
  CompanyMembership,
} from "@/types/auth";
import {
  PILOT_COMPANY_NAME,
  PILOT_COMPANY_WORKSPACE_ID,
  PILOT_MEMBERSHIPS,
  PILOT_USERS,
} from "./constants";

const profilesByEmail = new Map<string, AuthProfile>();
const membershipsByUserId = new Map<string, CompanyMembership[]>();

function ensureSeeded(): void {
  if (profilesByEmail.size > 0) return;

  const carmenId = "user_carmen_pilot";
  const alvaroId = "user_alvaro_pilot";

  profilesByEmail.set(PILOT_USERS.carmen.email, {
    id: carmenId,
    email: PILOT_USERS.carmen.email,
    displayName: PILOT_USERS.carmen.displayName,
    role: PILOT_USERS.carmen.role,
  });
  profilesByEmail.set(PILOT_USERS.alvaro.email, {
    id: alvaroId,
    email: PILOT_USERS.alvaro.email,
    displayName: PILOT_USERS.alvaro.displayName,
    role: PILOT_USERS.alvaro.role,
  });

  for (const row of PILOT_MEMBERSHIPS) {
    const profile = profilesByEmail.get(row.email);
    if (!profile) continue;
    const list = membershipsByUserId.get(profile.id) ?? [];
    list.push({
      id: `mem_${profile.id}_${row.workspaceId}`,
      userId: profile.id,
      workspaceId: row.workspaceId,
      companyName: row.companyName,
      kind: row.kind,
    });
    membershipsByUserId.set(profile.id, list);
  }
}

export function getProfileByEmail(email: string): AuthProfile | null {
  ensureSeeded();
  const key = email.trim().toLowerCase();
  for (const [stored, profile] of profilesByEmail.entries()) {
    if (stored.toLowerCase() === key) return profile;
  }
  return null;
}

export function resolveProfile(input: {
  email: string;
  authUserId?: string | null;
}): AuthProfile | null {
  const seeded = getProfileByEmail(input.email);
  if (!seeded) return null;
  if (input.authUserId) return { ...seeded, id: input.authUserId };
  return seeded;
}

export function listMembershipsForEmail(email: string): CompanyMembership[] {
  const profile = getProfileByEmail(email);
  if (!profile) return [];
  ensureSeeded();
  return membershipsByUserId.get(profile.id) ?? [];
}

export function assignedWorkspaceIdsForEmail(email: string): string[] {
  return listMembershipsForEmail(email).map((m) => m.workspaceId);
}

export function primaryWorkspaceIdForRole(
  role: ArchitectRole,
  email: string,
): string | null {
  if (role !== "client") return null;
  const memberships = listMembershipsForEmail(email);
  return (
    memberships.find((m) => m.kind === "owner")?.workspaceId ??
    memberships[0]?.workspaceId ??
    PILOT_COMPANY_WORKSPACE_ID
  );
}

export function pilotCompanySummary(): {
  workspaceId: string;
  companyName: string;
} {
  return {
    workspaceId: PILOT_COMPANY_WORKSPACE_ID,
    companyName: PILOT_COMPANY_NAME,
  };
}

export function verifyPilotPassword(email: string, password: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (normalized === PILOT_USERS.carmen.email.toLowerCase()) {
    const expected =
      process.env[PILOT_USERS.carmen.passwordEnv] ??
      PILOT_USERS.carmen.defaultPassword;
    return password === expected;
  }
  if (normalized === PILOT_USERS.alvaro.email.toLowerCase()) {
    const expected =
      process.env[PILOT_USERS.alvaro.passwordEnv] ??
      PILOT_USERS.alvaro.defaultPassword;
    return password === expected;
  }
  return false;
}
