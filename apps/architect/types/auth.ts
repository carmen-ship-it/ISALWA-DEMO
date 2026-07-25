/**
 * Authentication — Mission 10 domain contracts.
 * Designed for multi-company / multi-user later. Pilot seeds Carmen + Álvaro only.
 */

export type ArchitectRole = "consultant" | "client";

export type CompanyMembershipKind = "owner" | "consultant" | "member";

export type AuthCapability =
  | "view_all_companies"
  | "create_company"
  | "edit_workspace"
  | "view_reports"
  | "generate_deliverables"
  | "continue_interviews"
  | "invite_users"
  | "delete_data"
  | "access_system_settings"
  | "view_assigned_companies"
  | "view_blueprint"
  | "view_process_maps"
  | "view_recommendations";

export interface AuthProfile {
  id: string;
  email: string;
  displayName: string;
  role: ArchitectRole;
}

export interface CompanyMembership {
  id: string;
  userId: string;
  workspaceId: string;
  companyName: string;
  kind: CompanyMembershipKind;
}

export interface ArchitectSession {
  userId: string;
  email: string;
  displayName: string;
  role: ArchitectRole;
  /** Workspace IDs this user may access. Empty for consultants means all. */
  assignedWorkspaceIds: string[];
  /** Primary workspace for clients (immediate open). */
  primaryWorkspaceId: string | null;
  provider: "supabase" | "pilot";
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthRepository {
  getSession(): Promise<ArchitectSession | null>;
  signIn(credentials: LoginCredentials): Promise<ArchitectSession>;
  signOut(): Promise<void>;
}
