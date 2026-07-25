import type {
  ArchitectRole,
  ArchitectSession,
  AuthCapability,
} from "@/types/auth";
import { ROLE_CAPABILITIES } from "./constants";

export function hasCapability(
  role: ArchitectRole,
  capability: AuthCapability,
): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export function canAccessWorkspace(
  session: ArchitectSession,
  workspaceId: string,
): boolean {
  if (session.role === "consultant") {
    if (hasCapability(session.role, "view_all_companies")) return true;
  }
  return session.assignedWorkspaceIds.includes(workspaceId);
}

export function canCreateCompany(session: ArchitectSession): boolean {
  return hasCapability(session.role, "create_company");
}

export function canDeleteData(session: ArchitectSession): boolean {
  return hasCapability(session.role, "delete_data");
}

export function canAccessSystemSettings(session: ArchitectSession): boolean {
  return hasCapability(session.role, "access_system_settings");
}

export function canInviteUsers(session: ArchitectSession): boolean {
  return hasCapability(session.role, "invite_users");
}

export function postLoginPath(session: ArchitectSession): string {
  if (session.role === "client" && session.primaryWorkspaceId) {
    return `/workspace/${session.primaryWorkspaceId}`;
  }
  return "/";
}
