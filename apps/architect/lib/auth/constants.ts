import type { ArchitectRole, AuthCapability, CompanyMembershipKind } from "@/types/auth";

/** Canonical pilot company — matches existing company memory seed. */
export const PILOT_COMPANY_WORKSPACE_ID = "ws_abc";
export const PILOT_COMPANY_NAME = "ABC Manufacturing";

export const PILOT_USERS = {
  carmen: {
    email: "carmen@isalwa.demo",
    displayName: "Carmen",
    role: "consultant" as ArchitectRole,
    passwordEnv: "ARCHITECT_PILOT_CARMEN_PASSWORD",
    defaultPassword: "Architect2026!",
  },
  alvaro: {
    email: "alvaro@abc.demo",
    displayName: "Álvaro",
    role: "client" as ArchitectRole,
    passwordEnv: "ARCHITECT_PILOT_ALVARO_PASSWORD",
    defaultPassword: "Architect2026!",
  },
} as const;

export const PILOT_MEMBERSHIPS: Array<{
  email: string;
  workspaceId: string;
  companyName: string;
  kind: CompanyMembershipKind;
}> = [
  {
    email: PILOT_USERS.carmen.email,
    workspaceId: PILOT_COMPANY_WORKSPACE_ID,
    companyName: PILOT_COMPANY_NAME,
    kind: "consultant",
  },
  {
    email: PILOT_USERS.alvaro.email,
    workspaceId: PILOT_COMPANY_WORKSPACE_ID,
    companyName: PILOT_COMPANY_NAME,
    kind: "owner",
  },
];

export const ROLE_CAPABILITIES: Record<ArchitectRole, readonly AuthCapability[]> = {
  consultant: [
    "view_all_companies",
    "create_company",
    "edit_workspace",
    "view_reports",
    "generate_deliverables",
    "continue_interviews",
    "invite_users",
    "view_assigned_companies",
    "view_blueprint",
    "view_process_maps",
    "view_recommendations",
  ],
  client: [
    "view_assigned_companies",
    "continue_interviews",
    "view_reports",
    "view_blueprint",
    "view_process_maps",
    "view_recommendations",
  ],
};

export const PUBLIC_PATHS = ["/login"] as const;

export const CONSULTANT_ONLY_PATHS = ["/companies"] as const;

export const PILOT_SESSION_COOKIE = "isalwa.architect.pilot_session";
