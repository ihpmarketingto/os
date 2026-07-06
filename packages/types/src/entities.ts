import { z } from "zod";
import { ACTIONS, RESOURCES, ROLE_SLUGS } from "./roles";

export const organisationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  logo_url: z.string().url().nullable(),
  favicon_url: z.string().url().nullable(),
  accent_colour: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});
export type Organisation = z.infer<typeof organisationSchema>;

export const roleSchema = z.object({
  id: z.string().uuid(),
  organisation_id: z.string().uuid().nullable(),
  slug: z.enum(ROLE_SLUGS),
  name: z.string().min(1),
  is_system_role: z.boolean(),
});
export type Role = z.infer<typeof roleSchema>;

export const permissionSchema = z.object({
  id: z.string().uuid(),
  resource: z.enum(RESOURCES),
  action: z.enum(ACTIONS),
  description: z.string().nullable(),
});
export type Permission = z.infer<typeof permissionSchema>;

export const organisationMemberSchema = z.object({
  id: z.string().uuid(),
  organisation_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
  client_id: z.string().uuid().nullable(),
  status: z.enum(["active", "invited", "suspended"]),
  created_at: z.string(),
});
export type OrganisationMember = z.infer<typeof organisationMemberSchema>;

export const auditActionSchema = z.enum([
  "create",
  "update",
  "delete",
  "export",
  "ai_retrieve",
  "external_action",
  "login",
  "logout",
  "permission_change",
]);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditLogEntrySchema = z.object({
  id: z.string().uuid(),
  organisation_id: z.string().uuid(),
  actor_user_id: z.string().uuid().nullable(),
  actor_type: z.enum(["user", "ai_agent", "system", "automation"]),
  action: auditActionSchema,
  resource: z.string(),
  resource_id: z.string().nullable(),
  client_id: z.string().uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
});
export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

export const featureFlagSchema = z.object({
  id: z.string().uuid(),
  organisation_id: z.string().uuid().nullable(),
  key: z.string().min(1),
  is_enabled: z.boolean(),
  description: z.string().nullable(),
  rollout: z.enum(["off", "internal_only", "all_users"]).default("off"),
});
export type FeatureFlag = z.infer<typeof featureFlagSchema>;

export const clientStatusSchema = z.enum(["prospect", "active", "paused", "offboarding", "archived"]);

export const clientSchema = z.object({
  id: z.string().uuid(),
  organisation_id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  industry: z.string().nullable(),
  status: clientStatusSchema,
  account_manager_id: z.string().uuid().nullable(),
  ai_enabled: z.boolean().default(false),
  created_at: z.string(),
  deleted_at: z.string().nullable(),
});
export type Client = z.infer<typeof clientSchema>;

export const integrationProviderSchema = z.enum([
  "openai",
  "gemini",
  "anthropic",
  "google_workspace",
  "github",
  "stripe",
  "resend",
  "sendgrid",
  "meta_ads",
  "google_ads",
  "klaviyo",
  "vercel",
  "netlify",
  "cloudflare_pages",
]);
export type IntegrationProvider = z.infer<typeof integrationProviderSchema>;

export const integrationConnectionSchema = z.object({
  id: z.string().uuid(),
  organisation_id: z.string().uuid(),
  provider: integrationProviderSchema,
  connected_by_user_id: z.string().uuid().nullable(),
  status: z.enum(["connected", "disconnected", "error", "pending"]),
  scopes: z.array(z.string()).default([]),
  last_synced_at: z.string().nullable(),
  last_error: z.string().nullable(),
});
export type IntegrationConnection = z.infer<typeof integrationConnectionSchema>;
