import type { ArchitectSession } from "@/types/auth";
import {
  assignedWorkspaceIdsForEmail,
  primaryWorkspaceIdForRole,
  resolveProfile,
  verifyPilotPassword,
} from "./access";
import { PILOT_SESSION_COOKIE } from "./constants";

export function buildSessionFromEmail(
  email: string,
  provider: "supabase" | "pilot",
  authUserId?: string | null,
): ArchitectSession | null {
  const profile = resolveProfile({ email, authUserId });
  if (!profile) return null;

  return {
    userId: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    assignedWorkspaceIds: assignedWorkspaceIdsForEmail(profile.email),
    primaryWorkspaceId: primaryWorkspaceIdForRole(profile.role, profile.email),
    provider,
  };
}

export function readPilotSessionCookie(
  value: string | undefined,
): ArchitectSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { email?: string };
    if (!parsed.email) return null;
    return buildSessionFromEmail(parsed.email, "pilot");
  } catch {
    return null;
  }
}

export function createPilotSessionCookieValue(email: string): string {
  return JSON.stringify({ email: email.trim().toLowerCase() });
}

export function authenticatePilot(
  email: string,
  password: string,
): ArchitectSession | null {
  if (!verifyPilotPassword(email, password)) return null;
  return buildSessionFromEmail(email, "pilot");
}

export { PILOT_SESSION_COOKIE };
