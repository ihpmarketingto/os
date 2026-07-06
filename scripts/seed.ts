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

  const { count: existingLeadsCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId);

  if (!existingLeadsCount) {
    const bloom = clientBySlug.get("bloom-beauty-bar")!;
    const voltway = clientBySlug.get("voltway-electric")!;
    const nightshade = clientBySlug.get("nightshade-live")!;
    const ascend = clientBySlug.get("ascend-coaching-collective")!;

    const { data: leadRows, error: leadsError } = await supabase
      .from("leads")
      .insert([
        {
          organisation_id: organisationId,
          company_name: "Sable & Stone Spa",
          industry: "Beauty and Wellness",
          source: "referral",
          status: "qualified",
          score: 80,
          estimated_value: 4500,
          service_interest: ["social", "paid_media"],
          owner_id: accountManagerId,
          utm_source: "facebook",
          utm_medium: "paid_social",
          utm_campaign: "spa-spring-offer",
          utm_content: "ugc-video-a",
          landing_page: "/offers/spring-glow",
          form_submitted: "consult-booking-form",
          sms_consent: true,
          sms_consent_captured_at: new Date().toISOString(),
        },
        {
          organisation_id: organisationId,
          company_name: "Northline Fitness Studios",
          industry: "Coaching / Marketplace",
          source: "inbound",
          status: "new",
          score: 35,
          estimated_value: 2000,
          service_interest: ["seo"],
          owner_id: accountManagerId,
        },
        {
          organisation_id: organisationId,
          company_name: "Harbourfront Ticketed Series",
          industry: "Events",
          source: "cold outreach",
          status: "new",
          score: 15,
          service_interest: [],
          owner_id: accountManagerId,
        },
      ])
      .select("id, company_name");
    if (leadsError) throw leadsError;
    console.log(`leads: ${leadRows.length}`);

    const { error: dealsError } = await supabase.from("deals").insert([
      {
        organisation_id: organisationId,
        lead_id: leadRows.find((l) => l.company_name === "Sable & Stone Spa")!.id,
        title: "Sable & Stone Spa — Social + Paid Retainer",
        stage: "proposal_sent",
        value: 4500,
        expected_close_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        owner_id: accountManagerId,
      },
      {
        organisation_id: organisationId,
        client_id: bloom.id,
        title: "Bloom Beauty Bar — SEO upsell",
        stage: "negotiation",
        value: 1800,
        owner_id: accountManagerId,
      },
      {
        organisation_id: organisationId,
        client_id: voltway.id,
        title: "Voltway Electric — Website rebuild",
        stage: "discovery_completed",
        value: 9000,
        owner_id: accountManagerId,
      },
    ]);
    if (dealsError) throw dealsError;
    console.log("deals: 3");

    const { data: onboardingTemplate } = await supabase
      .from("task_templates")
      .select("id, default_tasks")
      .eq("name", "Client Onboarding")
      .is("organisation_id", null)
      .single();

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        organisation_id: organisationId,
        client_id: lumen.id,
        name: "Client Onboarding",
        service_type: "onboarding",
        owner_id: accountManagerId,
        status: "active",
        client_visible: true,
        source_template_id: onboardingTemplate?.id ?? null,
      })
      .select("id")
      .single();
    if (projectError) throw projectError;

    if (onboardingTemplate) {
      const defaultTasks = (onboardingTemplate.default_tasks ?? []) as { title: string; category: string; due_offset_days: number }[];
      const today = new Date();
      const taskRows = defaultTasks.map((t, i) => {
        const due = new Date(today);
        due.setDate(due.getDate() + t.due_offset_days);
        return {
          organisation_id: organisationId,
          client_id: lumen.id,
          project_id: project.id,
          task_template_id: onboardingTemplate.id,
          title: t.title,
          category: t.category,
          due_date: due.toISOString().slice(0, 10),
          assignee_id: i % 2 === 0 ? accountManagerId : specialistId,
          status: i === 0 ? ("complete" as const) : ("not_started" as const),
        };
      });
      const { error: tasksError } = await supabase.from("tasks").insert(taskRows);
      if (tasksError) throw tasksError;
      console.log(`tasks: ${taskRows.length} (Lumen & Co onboarding)`);
    }

    const { data: contentItem, error: contentError } = await supabase
      .from("content_items")
      .insert({
        organisation_id: organisationId,
        client_id: lumen.id,
        platform: "Instagram",
        content_type: "Reel",
        hook: "The 3-step night routine dermatologists keep recommending",
        caption: "Draft caption pending client approval.",
        owner_id: specialistId,
        status: "client_review",
        client_visible: true,
      })
      .select("id")
      .single();
    if (contentError) throw contentError;

    const { error: approvalError2 } = await supabase.from("approvals").insert({
      organisation_id: organisationId,
      client_id: lumen.id,
      subject_type: "content_item",
      subject_id: contentItem.id,
      requested_by: specialistId,
      status: "pending",
    });
    if (approvalError2) throw approvalError2;
    console.log("content_items: 1 (awaiting client approval at Lumen & Co)");

    const { error: meetingError } = await supabase.from("meetings").insert({
      organisation_id: organisationId,
      client_id: lumen.id,
      title: "Monthly strategy check-in",
      meeting_type: "client_review",
      scheduled_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      duration_minutes: 30,
      notes: "Reviewed Q3 priorities and content calendar.",
      client_visible: true,
      created_by: accountManagerId,
    });
    if (meetingError) throw meetingError;

    const { error: noteError } = await supabase.from("notes").insert({
      organisation_id: organisationId,
      client_id: lumen.id,
      subject_type: "client",
      subject_id: lumen.id,
      author_id: accountManagerId,
      body: "Client mentioned interest in expanding into Google Ads next quarter.",
    });
    if (noteError) throw noteError;

    console.log(`${nightshade.name} and ${ascend.name} are seeded with no pipeline/delivery data yet — good for a from-scratch demo.`);
  } else {
    console.log("Pipeline/delivery demo data already exists — skipping leads/deals/projects/tasks/content seed.");
  }

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
