/**
 * Phase 0 demo data. Idempotent — safe to re-run. Requires a real Supabase
 * project: point apps/web/.env.local at it and run migrations first
 * (`supabase db push` once you have the CLI, or apply supabase/migrations/*.sql
 * by hand via the SQL editor).
 *
 * Usage: npm run seed
 */
import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { loadServerEnv } from "@ihp/config";
import { createSupabaseAdminClient } from "@ihp/database/client-admin";

loadDotenv({ path: path.resolve(__dirname, "../apps/web/.env.local") });

const env = loadServerEnv(process.env);
const supabase = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const DEMO_PASSWORD = "IhpOsDemo!2026";

const DEMO_USERS = [
  { email: "owner@ihp-os-demo.test", fullName: "Priya Nair", role: "agency_owner" as const },
  { email: "am@ihp-os-demo.test", fullName: "Jordan Blake", role: "account_manager" as const },
  { email: "specialist@ihp-os-demo.test", fullName: "Sam Okafor", role: "specialist" as const },
  { email: "contractor@ihp-os-demo.test", fullName: "Alex Rivera", role: "contractor" as const },
  { email: "client-admin@ihp-os-demo.test", fullName: "Dana Whitfield", role: "client_admin" as const },
  { email: "client-collab@ihp-os-demo.test", fullName: "Miguel Torres", role: "client_collaborator" as const },
];

const DEMO_CLIENTS = [
  { name: "Lumen & Co", slug: "lumen-and-co", industry: "Ecommerce — Skincare", aiEnabled: true },
  { name: "Bloom Beauty Bar", slug: "bloom-beauty-bar", industry: "Beauty and Wellness", aiEnabled: false },
  { name: "Voltway Electric", slug: "voltway-electric", industry: "Local Services — Electrical", aiEnabled: false },
  { name: "Nightshade Live", slug: "nightshade-live", industry: "Events — Ticketed Performance", aiEnabled: false },
  { name: "Cortex Labs", slug: "cortex-labs", industry: "SaaS — AI / Technology", aiEnabled: true },
  { name: "Ascend Coaching Collective", slug: "ascend-coaching-collective", industry: "Coaching / Marketplace", aiEnabled: false },
];

async function upsertDemoUser(email: string, fullName: string): Promise<string> {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (!createError && created.user) {
    console.log(`  created auth user ${email}`);
    return created.user.id;
  }

  // Already exists — look it up instead of failing the whole seed run.
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === email);
  if (!existing) throw createError ?? new Error(`Could not find or create user ${email}`);
  console.log(`  found existing auth user ${email}`);
  return existing.id;
}

async function main() {
  console.log("Seeding IHP OS demo organisation...");

  const { data: org, error: orgError } = await supabase
    .from("organisations")
    .upsert({ name: "IHP Marketing (Demo)", slug: "ihp-marketing-demo" }, { onConflict: "slug" })
    .select("id")
    .single();
  if (orgError) throw orgError;
  const organisationId = org.id;
  console.log(`organisation: ${organisationId}`);

  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("id, slug")
    .is("organisation_id", null);
  if (rolesError) throw rolesError;
  const roleIdBySlug = new Map(roles.map((r) => [r.slug, r.id]));

  const { data: clientRows, error: clientsError } = await supabase
    .from("clients")
    .upsert(
      DEMO_CLIENTS.map((c) => ({
        organisation_id: organisationId,
        name: c.name,
        slug: c.slug,
        industry: c.industry,
        status: "active" as const,
        ai_enabled: c.aiEnabled,
      })),
      { onConflict: "organisation_id,slug" },
    )
    .select("id, slug, name");
  if (clientsError) throw clientsError;
  const clientBySlug = new Map(clientRows.map((c) => [c.slug, c]));
  console.log(`clients: ${clientRows.map((c) => c.name).join(", ")}`);

  const userIdByEmail = new Map<string, string>();
  for (const user of DEMO_USERS) {
    const id = await upsertDemoUser(user.email, user.fullName);
    userIdByEmail.set(user.email, id);
  }

  const lumen = clientBySlug.get("lumen-and-co")!;

  for (const user of DEMO_USERS) {
    const userId = userIdByEmail.get(user.email)!;
    const roleId = roleIdBySlug.get(user.role)!;
    const isClientRole = user.role === "client_admin" || user.role === "client_collaborator";

    const { error } = await supabase.from("organisation_members").upsert(
      {
        organisation_id: organisationId,
        user_id: userId,
        role_id: roleId,
        client_id: isClientRole ? lumen.id : null,
        status: "active",
      },
      { onConflict: "organisation_id,user_id" },
    );
    if (error) throw error;
  }
  console.log(`organisation_members: ${DEMO_USERS.length}`);

  const accountManagerId = userIdByEmail.get("am@ihp-os-demo.test")!;
  const specialistId = userIdByEmail.get("specialist@ihp-os-demo.test")!;
  const contractorId = userIdByEmail.get("contractor@ihp-os-demo.test")!;

  const assignments = [
    ...clientRows.map((c) => ({ client_id: c.id, user_id: accountManagerId })), // AM sees every demo client
    ...["lumen-and-co", "cortex-labs", "bloom-beauty-bar"].map((slug) => ({
      client_id: clientBySlug.get(slug)!.id,
      user_id: specialistId,
    })),
    { client_id: clientBySlug.get("voltway-electric")!.id, user_id: contractorId },
  ].map((a) => ({ ...a, organisation_id: organisationId, assigned_by: accountManagerId }));

  const { error: assignError } = await supabase
    .from("client_assignments")
    .upsert(assignments, { onConflict: "client_id,user_id" });
  if (assignError) throw assignError;
  console.log(`client_assignments: ${assignments.length}`);

  const ownerId = userIdByEmail.get("owner@ihp-os-demo.test")!;
  const { error: auditError } = await supabase.from("audit_logs").insert([
    {
      organisation_id: organisationId,
      actor_user_id: ownerId,
      actor_type: "user",
      action: "create",
      resource: "clients",
      resource_id: lumen.id,
      client_id: lumen.id,
      metadata: { seeded: true, note: "Demo client created during onboarding" },
    },
    {
      organisation_id: organisationId,
      actor_user_id: accountManagerId,
      actor_type: "user",
      action: "external_action",
      resource: "client_assignments",
      client_id: lumen.id,
      metadata: { seeded: true, note: "Account manager assigned to Lumen & Co" },
    },
  ]);
  if (auditError) throw auditError;

  const cortex = clientBySlug.get("cortex-labs")!;
  const { data: anthropicProvider } = await supabase
    .from("ai_providers")
    .select("id")
    .eq("slug", "anthropic")
    .single();

  if (anthropicProvider) {
    const { data: aiRun, error: aiRunError } = await supabase
      .from("ai_runs")
      .insert({
        organisation_id: organisationId,
        client_id: cortex.id,
        user_id: specialistId,
        ai_provider_id: anthropicProvider.id,
        model_name: "claude-sonnet-5",
        task_type: "report_drafting",
        mode: "draft",
        prompt: "Draft the Q3 performance summary for Cortex Labs using their GA4 and paid media data.",
        output: "Draft report generated (seed placeholder) — three key wins, two risks, one recommendation.",
        status: "success",
        estimated_cost: 0.0421,
        approval_result: "not_required",
      })
      .select("id")
      .single();
    if (aiRunError) throw aiRunError;

    await supabase.from("ai_source_citations").insert({
      ai_run_id: aiRun.id,
      document_type: "paid_media_report",
      document_id: null,
      title: "Cortex Labs — August paid media export",
      excerpt: "ROAS 3.2x, CPL down 18% month-over-month.",
    });
    console.log("ai_runs: 1 sample draft run with a source citation");
  }

  const { error: flagError } = await supabase.from("feature_flags").upsert(
    {
      organisation_id: organisationId,
      key: "landing_page_factory",
      is_enabled: false,
      description: "Preview access for the demo org — flip on once Phase 4 ships.",
      rollout: "off",
    },
    { onConflict: "organisation_id,key" },
  );
  if (flagError) throw flagError;

  console.log("\nSeed complete.");
  console.log(`Sign in at http://localhost:3000/login with any demo user and password "${DEMO_PASSWORD}":`);
  for (const user of DEMO_USERS) {
    console.log(`  ${user.role.padEnd(20)} ${user.email}`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
