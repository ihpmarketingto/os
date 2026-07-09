import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@ihp/database/types.gen";

/**
 * Automation engine primitives. Two guarantees hold everywhere:
 *  - a disabled rule never acts (isRuleEnabled checks the org's rule row);
 *  - the same rule never acts twice on the same subject (recordRun inserts
 *    against a unique (org, rule_key, dedupe_key) constraint — a conflict
 *    means "already handled", and the caller skips).
 * Automations create tasks and notifications only. They never send email
 * or SMS, publish, or spend — those remain human actions per the AI/action
 * rules in CLAUDE.md.
 */

export { AUTOMATION_RULE_CATALOGUE } from "@ihp/types";

type Supabase = SupabaseClient<Database>;

export async function isRuleEnabled(supabase: Supabase, organisationId: string, ruleKey: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("automation_rules")
    .select("is_enabled")
    .eq("organisation_id", organisationId)
    .eq("rule_key", ruleKey)
    .maybeSingle();
  if (error) {
    console.error("[automations] rule lookup failed, treating as disabled", { ruleKey, error });
    return false;
  }
  // No row = rule not installed for this org = disabled. Fail closed.
  return data?.is_enabled ?? false;
}

/**
 * Returns true when this (rule, subject) pair has not acted before and the
 * run was recorded; false when it already ran (unique-constraint conflict).
 */
export async function recordRun(
  supabase: Supabase,
  organisationId: string,
  ruleKey: string,
  dedupeKey: string,
  summary: string,
): Promise<boolean> {
  const { error } = await supabase.from("automation_runs").insert({
    organisation_id: organisationId,
    rule_key: ruleKey,
    dedupe_key: dedupeKey,
    summary,
  });
  if (error) {
    if (error.code === "23505") return false; // already handled
    console.error("[automations] failed to record run", { ruleKey, dedupeKey, error });
    return false;
  }
  return true;
}

export async function notifyUsers(
  supabase: Supabase,
  organisationId: string,
  userIds: string[],
  notification: { title: string; body?: string; href?: string; clientId?: string | null },
): Promise<void> {
  const unique = Array.from(new Set(userIds)).filter(Boolean);
  if (unique.length === 0) return;
  const { error } = await supabase.from("notifications").insert(
    unique.map((userId) => ({
      organisation_id: organisationId,
      user_id: userId,
      client_id: notification.clientId ?? null,
      title: notification.title,
      body: notification.body ?? null,
      href: notification.href ?? null,
    })),
  );
  if (error) {
    console.error("[automations] notification insert failed", error);
  }
}

/** Agency owners of the organisation — the default escalation recipients. */
export async function ownerUserIds(supabase: Supabase, organisationId: string): Promise<string[]> {
  const { data } = await supabase
    .from("organisation_members")
    .select("user_id, roles(slug)")
    .eq("organisation_id", organisationId)
    .eq("status", "active");
  return (data ?? [])
    .filter((m) => (m.roles as unknown as { slug: string } | null)?.slug === "agency_owner")
    .map((m) => m.user_id);
}
