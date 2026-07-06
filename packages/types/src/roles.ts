/**
 * Canonical role slugs. These are seeded into the `roles` table (see
 * supabase/migrations/0001_core_tenancy.sql) and referenced by slug rather
 * than free text so permission checks stay stable across renames.
 */
export const ROLE_SLUGS = [
  "agency_owner",
  "account_manager",
  "specialist",
  "contractor",
  "client_admin",
  "client_collaborator",
] as const;
export type RoleSlug = (typeof ROLE_SLUGS)[number];

export const INTERNAL_ROLE_SLUGS: RoleSlug[] = [
  "agency_owner",
  "account_manager",
  "specialist",
  "contractor",
];

export const CLIENT_ROLE_SLUGS: RoleSlug[] = ["client_admin", "client_collaborator"];

export function isInternalRole(slug: RoleSlug): boolean {
  return INTERNAL_ROLE_SLUGS.includes(slug);
}

export function isClientRole(slug: RoleSlug): boolean {
  return CLIENT_ROLE_SLUGS.includes(slug);
}

/** Resources permissions are scoped to. Grows as later phases add modules. */
export const RESOURCES = [
  "clients",
  "crm",
  "projects",
  "tasks",
  "content",
  "campaigns",
  "documents",
  "reports",
  "finance",
  "integrations",
  "ai_settings",
  "team_settings",
  "permissions",
  "templates",
  "audit_logs",
  "landing_page_factory",
] as const;
export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "export",
  "approve",
  "ai_retrieve",
  "external_action",
] as const;
export type Action = (typeof ACTIONS)[number];
