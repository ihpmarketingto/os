/**
 * Phase 0 demo data. Idempotent - safe to re-run. Requires a real Supabase
 * project: point apps/web/.env.local at it and run migrations first
 * (`supabase db push` once you have the CLI, or apply supabase/migrations/*.sql
 * by hand via the SQL editor).
 *
 * Usage: npm run seed
 */
import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { loadServerEnv } from "@ihp/config";
import { AUTOMATION_RULE_CATALOGUE } from "@ihp/types";
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
  { name: "Lumen & Co", slug: "lumen-and-co", industry: "Ecommerce - Skincare", aiEnabled: true },
  { name: "Bloom Beauty Bar", slug: "bloom-beauty-bar", industry: "Beauty and Wellness", aiEnabled: false },
  { name: "Voltway Electric", slug: "voltway-electric", industry: "Local Services - Electrical", aiEnabled: false },
  { name: "Nightshade Live", slug: "nightshade-live", industry: "Events - Ticketed Performance", aiEnabled: false },
  { name: "Cortex Labs", slug: "cortex-labs", industry: "SaaS - AI / Technology", aiEnabled: true },
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

  // Already exists - look it up instead of failing the whole seed run.
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
        output: "Draft report generated (seed placeholder) - three key wins, two risks, one recommendation.",
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
      title: "Cortex Labs - August paid media export",
      excerpt: "ROAS 3.2x, CPL down 18% month-over-month.",
    });
    console.log("ai_runs: 1 sample draft run with a source citation");
  }

  const { error: flagError } = await supabase.from("feature_flags").upsert(
    {
      organisation_id: organisationId,
      key: "landing_page_factory",
      is_enabled: false,
      description: "Preview access for the demo org - flip on once Phase 4 ships.",
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
          sms_consent: false,
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
          sms_consent: false,
        },
      ])
      .select("id, company_name");
    if (leadsError) throw leadsError;
    console.log(`leads: ${leadRows.length}`);

    const { error: dealsError } = await supabase.from("deals").insert([
      {
        organisation_id: organisationId,
        lead_id: leadRows.find((l) => l.company_name === "Sable & Stone Spa")!.id,
        title: "Sable & Stone Spa - Social + Paid Retainer",
        stage: "proposal_sent",
        value: 4500,
        expected_close_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        owner_id: accountManagerId,
      },
      {
        organisation_id: organisationId,
        client_id: bloom.id,
        title: "Bloom Beauty Bar - SEO upsell",
        stage: "negotiation",
        value: 1800,
        owner_id: accountManagerId,
      },
      {
        organisation_id: organisationId,
        client_id: voltway.id,
        title: "Voltway Electric - Website rebuild",
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

    console.log(`${nightshade.name} and ${ascend.name} are seeded with no pipeline/delivery data yet - good for a from-scratch demo.`);
  } else {
    console.log("Pipeline/delivery demo data already exists - skipping leads/deals/projects/tasks/content seed.");
  }

  // --- Phase 2: commercial demo data (guarded on retainers existing) -------
  const { count: existingRetainersCount } = await supabase
    .from("retainers")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId);

  if (!existingRetainersCount) {
    const bloom = clientBySlug.get("bloom-beauty-bar")!;

    const { error: retainerError } = await supabase.from("retainers").insert([
      {
        organisation_id: organisationId,
        client_id: lumen.id,
        name: "Social + paid media retainer",
        amount: 4500,
        billing_cadence: "monthly" as const,
        included_hours: 20,
        start_date: "2026-01-01",
        end_date: "2026-12-31",
      },
      {
        organisation_id: organisationId,
        client_id: cortex.id,
        name: "Growth retainer",
        amount: 6000,
        billing_cadence: "monthly" as const,
        included_hours: 30,
        start_date: "2026-03-01",
        end_date: null,
      },
      {
        organisation_id: organisationId,
        client_id: bloom.id,
        name: "Local marketing retainer",
        amount: 2500,
        billing_cadence: "monthly" as const,
        included_hours: 12,
        start_date: "2026-05-01",
        end_date: "2026-07-31",
      },
    ]);
    if (retainerError) throw retainerError;

    const { error: contractError } = await supabase.from("contracts").insert([
      {
        organisation_id: organisationId,
        client_id: lumen.id,
        name: "12-month services agreement",
        status: "signed" as const,
        start_date: "2026-01-01",
        end_date: "2026-07-31",
        renewal_notice_days: 30,
        value: 54000,
      },
      {
        organisation_id: organisationId,
        client_id: cortex.id,
        name: "Growth services agreement",
        status: "signed" as const,
        start_date: "2026-03-01",
        end_date: "2027-02-28",
        renewal_notice_days: 45,
        value: 72000,
      },
    ]);
    if (contractError) throw contractError;

    const { data: invoiceRows, error: invoiceError } = await supabase
      .from("invoices")
      .insert([
        {
          organisation_id: organisationId,
          client_id: lumen.id,
          number: "INV-2026-0001",
          status: "paid" as const,
          issue_date: "2026-06-01",
          due_date: "2026-06-15",
          amount: 4500,
          tax_amount: 225,
          notes: "June retainer",
          paid_at: "2026-06-10T15:00:00Z",
          created_by: ownerId,
        },
        {
          organisation_id: organisationId,
          client_id: cortex.id,
          number: "INV-2026-0002",
          status: "sent" as const,
          issue_date: "2026-07-01",
          due_date: "2026-07-15",
          amount: 6000,
          tax_amount: 300,
          notes: "July retainer",
          created_by: ownerId,
        },
        {
          organisation_id: organisationId,
          client_id: bloom.id,
          number: "INV-2026-0003",
          status: "overdue" as const,
          issue_date: "2026-06-01",
          due_date: "2026-06-15",
          amount: 2500,
          tax_amount: 125,
          notes: "June retainer",
          created_by: ownerId,
        },
      ])
      .select("id, number");
    if (invoiceError) throw invoiceError;

    const paidInvoice = invoiceRows.find((i) => i.number === "INV-2026-0001")!;
    const { error: paymentError } = await supabase.from("payments").insert({
      organisation_id: organisationId,
      invoice_id: paidInvoice.id,
      amount: 4725,
      method: "e_transfer" as const,
      reference: "ETFR-88412",
      paid_at: "2026-06-10T15:00:00Z",
      recorded_by: ownerId,
    });
    if (paymentError) throw paymentError;

    const { error: expenseError } = await supabase.from("expenses").insert([
      {
        organisation_id: organisationId,
        client_id: lumen.id,
        category: "contractor" as const,
        description: "UGC editing (June)",
        vendor: "Alex Rivera",
        amount: 800,
        incurred_on: "2026-06-20",
        recorded_by: ownerId,
      },
      {
        organisation_id: organisationId,
        client_id: cortex.id,
        category: "ad_spend" as const,
        description: "Meta Ads June spend",
        vendor: "Meta",
        amount: 1200,
        incurred_on: "2026-06-30",
        recorded_by: ownerId,
      },
      {
        organisation_id: organisationId,
        client_id: null,
        category: "software" as const,
        description: "Design tooling subscription",
        vendor: "Figma",
        amount: 90,
        incurred_on: "2026-07-01",
        recorded_by: ownerId,
      },
    ]);
    if (expenseError) throw expenseError;

    const { error: ratesError } = await supabase.from("member_rates").insert([
      { organisation_id: organisationId, user_id: ownerId, hourly_cost: 85, effective_from: "2026-01-01" },
      { organisation_id: organisationId, user_id: accountManagerId, hourly_cost: 65, effective_from: "2026-01-01" },
      { organisation_id: organisationId, user_id: specialistId, hourly_cost: 55, effective_from: "2026-01-01" },
      { organisation_id: organisationId, user_id: contractorId, hourly_cost: 45, effective_from: "2026-01-01" },
    ]);
    if (ratesError) throw ratesError;

    // Log hours against Lumen's tasks so labour cost and the scope-creep
    // alert (24h against 20 included) have real inputs.
    const { data: lumenTasks } = await supabase
      .from("tasks")
      .select("id")
      .eq("organisation_id", organisationId)
      .eq("client_id", lumen.id)
      .limit(3);
    for (const [index, task] of (lumenTasks ?? []).entries()) {
      await supabase
        .from("tasks")
        .update({ actual_hours: 8, assignee_id: index === 0 ? accountManagerId : specialistId })
        .eq("id", task.id);
    }

    console.log("phase 2: retainers, contracts, invoices, payment, expenses, member rates seeded");
  } else {
    console.log("Commercial demo data already exists - skipping Phase 2 seed.");
  }

  // --- Phase 3: marketing delivery demo data (guarded on campaigns) --------
  const { count: existingCampaignsCount } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId);

  if (!existingCampaignsCount) {
    const nightshade = clientBySlug.get("nightshade-live")!;

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        organisation_id: organisationId,
        client_id: lumen.id,
        name: "Summer Glow launch",
        objective: "60 consult bookings in June",
        offer: "20% off first facial series",
        audience: "Women 25-54 within 15km of downtown, skincare interest",
        channels: ["meta_ads", "email"],
        budget: 3000,
        kpis: "CPL under $25, ROAS over 3",
        start_date: "2026-06-01",
        end_date: "2026-06-30",
        status: "optimising" as const,
        owner_id: accountManagerId,
      })
      .select("id")
      .single();
    if (campaignError) throw campaignError;

    const metricDays = [
      { d: "2026-06-01", spend: 95, imp: 21000, clk: 420, leads: 9, conv: 4, rev: 620 },
      { d: "2026-06-02", spend: 102, imp: 22800, clk: 455, leads: 11, conv: 5, rev: 790 },
      { d: "2026-06-03", spend: 98, imp: 20100, clk: 401, leads: 8, conv: 3, rev: 470 },
      { d: "2026-06-04", spend: 110, imp: 24500, clk: 512, leads: 13, conv: 6, rev: 940 },
      { d: "2026-06-05", spend: 105, imp: 23200, clk: 476, leads: 12, conv: 6, rev: 910 },
      { d: "2026-06-06", spend: 120, imp: 26900, clk: 545, leads: 15, conv: 7, rev: 1105 },
      { d: "2026-06-07", spend: 115, imp: 25400, clk: 522, leads: 14, conv: 6, rev: 950 },
    ];
    const { error: metricsError } = await supabase.from("campaign_metrics").insert(
      metricDays.map((m) => ({
        organisation_id: organisationId,
        client_id: lumen.id,
        campaign_id: campaign.id,
        channel: "meta_ads" as const,
        metric_date: m.d,
        spend: m.spend,
        impressions: m.imp,
        clicks: m.clk,
        leads: m.leads,
        conversions: m.conv,
        revenue: m.rev,
        source: "csv_import" as const,
        created_by: accountManagerId,
      })),
    );
    if (metricsError) throw metricsError;

    const { error: reportError } = await supabase.from("reports").insert([
      {
        organisation_id: organisationId,
        client_id: lumen.id,
        title: "June performance report",
        period_start: "2026-06-01",
        period_end: "2026-06-30",
        executive_summary:
          "Paid social delivered 82 leads at a $9.09 CPL, well under the $25 target, and the Summer Glow offer converted at 4.9%.",
        key_wins: "CPL 64% below target; UGC video A outperformed static creative 2.3 to 1.",
        risks: "Creative fatigue expected by mid-July; new UGC batch needed before spend scales.",
        next_month_plan: "Scale budget 20%, launch two new UGC creators, add retargeting audience.",
        status: "published" as const,
        created_by: accountManagerId,
        published_at: "2026-07-02T16:00:00Z",
      },
      {
        organisation_id: organisationId,
        client_id: cortex.id,
        title: "June performance report",
        period_start: "2026-06-01",
        period_end: "2026-06-30",
        executive_summary: "Draft pending final GA4 numbers.",
        status: "draft" as const,
        created_by: specialistId,
      },
    ]);
    if (reportError) throw reportError;

    const { error: experimentError } = await supabase.from("experiments").insert({
      organisation_id: organisationId,
      client_id: lumen.id,
      name: "Booking CTA above the fold",
      hypothesis: "If the booking CTA moves above the fold on mobile, consult bookings will rise because 68% of traffic is mobile and the current CTA sits below three scroll depths.",
      page_url: "/offers/summer-glow",
      variant_description: "Sticky booking bar with price anchor",
      success_metric: "Booking conversion rate",
      start_date: "2026-06-20",
      status: "running" as const,
      created_by: specialistId,
    });
    if (experimentError) throw experimentError;

    const { error: influencerError } = await supabase.from("influencers").insert([
      {
        organisation_id: organisationId,
        client_id: lumen.id,
        name: "Maya Chen",
        handle: "@mayaglows",
        platform: "Instagram",
        followers: 48000,
        email: "maya@example.com",
        status: "negotiating" as const,
        notes: "Strong local beauty audience; asked for product plus fee.",
      },
      {
        organisation_id: organisationId,
        client_id: null,
        name: "Jordan Fit",
        handle: "@jordanfitto",
        platform: "TikTok",
        followers: 112000,
        email: "jordan@example.com",
        status: "prospect" as const,
      },
    ]);
    if (influencerError) throw influencerError;

    const { error: mediaError } = await supabase.from("media_contacts").insert([
      {
        organisation_id: organisationId,
        name: "Priya Raman",
        outlet: "CTV Toronto",
        beat: "Local events and community",
        email: "priya.raman@example.com",
      },
      {
        organisation_id: organisationId,
        name: "Dave Kowalski",
        outlet: "BlogTO",
        beat: "Things to do, entertainment",
        email: "dave.k@example.com",
      },
    ]);
    if (mediaError) throw mediaError;

    const { error: eventError } = await supabase.from("events").insert({
      organisation_id: organisationId,
      client_id: nightshade.id,
      name: "Nightshade Live: Autumn Run",
      venue: "FirstOntario Performing Arts Centre",
      starts_at: "2026-10-16T19:30:00-04:00",
      ends_at: "2026-10-18T22:00:00-04:00",
      ticket_link: "https://example.com/tickets",
      status: "on_sale" as const,
      target_attendance: 2200,
      tickets_sold: 840,
      ticket_revenue: 52400,
    });
    if (eventError) throw eventError;

    console.log("phase 3: campaign, metrics, reports, experiment, creators, media contacts, event seeded");
  } else {
    console.log("Marketing delivery demo data already exists - skipping Phase 3 seed.");
  }

  // --- Phase 4: landing page factory demo data (guarded) -------------------
  const { count: existingBuildProjects } = await supabase
    .from("build_library_projects")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId);

  if (!existingBuildProjects) {
    const nightshade = clientBySlug.get("nightshade-live")!;

    const { error: blpError } = await supabase.from("build_library_projects").insert({
      organisation_id: organisationId,
      client_id: nightshade.id,
      project_name: "Ticketed performance landing page (2025)",
      repository_url: "https://github.com/ihp-marketing/example-ticketing-page",
      deployment_url: "https://example.com/past-show",
      source_provider: "github" as const,
      technology_stack: ["nextjs", "tailwind"],
      page_type: "Event ticketing page",
      offer_type: "Ticket sales",
      funnel_type: "Paid social to ticket checkout",
      industry: "Events - Ticketed Performance",
      conversion_goal: "Ticket purchases",
      traffic_source: "Meta Ads",
      form_system: "Ticketing platform embed",
      conversion_rate: 0.041,
      learnings: "Countdown block and segmented audience by geography drove the strongest CTR.",
      status: "approved_for_reuse" as const,
      reuse_permitted: true,
      asset_rights: "IHP-owned structure; client assets excluded",
    });
    if (blpError) throw blpError;

    const { data: brief, error: briefError } = await supabase
      .from("landing_page_briefs")
      .insert({
        organisation_id: organisationId,
        client_id: lumen.id,
        title: "Summer Glow offer page",
        offer: "20% off first facial series, June only",
        product_service: "Facial series (3 sessions)",
        audience: "Women 25-54 within 15km, skincare interest",
        goal: "Consult bookings from paid social",
        conversion_action: "Booked consult",
        main_cta: "Book my consult",
        secondary_cta: "See treatment details",
        traffic_source: "Meta Ads",
        price: "From $89 per session",
        promotion: "20% off first series",
        booking_link: "https://example.com/book",
        proof_points: "4.9 average rating from 320 reviews; dermatologist-developed protocol",
        objections: "Price sensitivity; time commitment; sensitive skin concerns",
        required_claims: "Results vary by individual",
        forbidden_claims: "No medical or cure claims; no before-and-after images without signed release",
        required_disclaimer: "Individual results may vary. Consultation required before treatment.",
        required_tracking: "GA4, Meta Pixel, UTM capture, CRM lead routing",
        launch_date: "2026-07-15",
        status: "approved" as const,
        approved_at: new Date().toISOString(),
        approval_owner_id: accountManagerId,
        created_by: accountManagerId,
      })
      .select("id")
      .single();
    if (briefError) throw briefError;

    const { data: page, error: pageError } = await supabase
      .from("landing_page_projects")
      .insert({
        organisation_id: organisationId,
        client_id: lumen.id,
        brief_id: brief.id,
        name: "Summer Glow landing page",
        generation_mode: "build_from_strategy" as const,
        repository_url: "https://github.com/ihp-marketing/lumen-summer-glow",
        branch: "main",
        preview_url: "https://preview.example.com/lumen-summer-glow",
        status: "client_approval" as const,
        created_by: accountManagerId,
      })
      .select("id")
      .single();
    if (pageError) throw pageError;

    const qaChecklist = [
      "Desktop layout", "Mobile layout", "Tablet layout", "CTA links", "Form validation",
      "Form submission", "Booking links", "Ticket links", "Checkout links", "Thank-you workflow",
      "CRM routing", "Email notifications", "GA4 events", "Meta events", "Google Ads conversions",
      "UTM capture", "SEO metadata", "Open Graph image", "Page speed", "Accessibility",
      "Legal disclaimers", "Brand consistency", "Canadian spelling", "Broken links",
      "Missing images", "Cookie consent", "Error states",
    ];
    const { error: qaError } = await supabase.from("qa_runs").insert({
      organisation_id: organisationId,
      landing_page_project_id: page.id,
      run_by: specialistId,
      overall: "pass" as const,
      items: qaChecklist.map((check) => ({ check, result: "pass" })),
      notes: "All checks pass on preview build.",
    });
    if (qaError) throw qaError;

    const { error: deployError } = await supabase.from("deployments").insert({
      organisation_id: organisationId,
      landing_page_project_id: page.id,
      environment: "preview" as const,
      provider: "manual" as const,
      url: "https://preview.example.com/lumen-summer-glow",
      status: "succeeded" as const,
      triggered_by: specialistId,
    });
    if (deployError) throw deployError;

    const { error: lpApprovalError } = await supabase.from("approvals").insert({
      organisation_id: organisationId,
      client_id: lumen.id,
      subject_type: "landing_page" as const,
      subject_id: page.id,
      requested_by: accountManagerId,
      status: "pending" as const,
    });
    if (lpApprovalError) throw lpApprovalError;

    console.log("phase 4: build library reference, approved brief, page in client approval with passing QA seeded");
  } else {
    console.log("Landing page factory demo data already exists - skipping Phase 4 seed.");
  }

  // --- Phase 6: install the automation rule catalogue (idempotent) ---------
  const { error: rulesInstallError } = await supabase.from("automation_rules").upsert(
    AUTOMATION_RULE_CATALOGUE.map((rule) => ({
      organisation_id: organisationId,
      rule_key: rule.key,
      name: rule.name,
      description: rule.description,
      trigger_type: rule.trigger,
      is_enabled: true,
    })),
    { onConflict: "organisation_id,rule_key", ignoreDuplicates: true },
  );
  if (rulesInstallError) throw rulesInstallError;
  console.log(`automation rules installed: ${AUTOMATION_RULE_CATALOGUE.length}`);

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
