import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@ihp/database/client-admin";
import { runSweep } from "@/lib/automations/sweep";
import { serverEnv } from "@/lib/env/server";

/**
 * Scheduled automation sweep.
 *
 * The sweep engine has existed since Phase 6 and only ever ran when somebody
 * opened the Automations page and pressed a button, which means the
 * automations were not automatic. This is the caller.
 *
 * Safety properties this route relies on rather than reimplements:
 *   - Every action the sweep takes is deduped by a unique constraint on
 *     automation_runs, so a double fire (a retry, an overlapping schedule)
 *     cannot send the same reminder twice.
 *   - The sweep only ever creates tasks, projects and notifications. It does
 *     not send email, publish, spend or invoice. Those stay behind a person.
 */

/**
 * The sweep runs a lot of sequential queries per organisation. Measured at
 * roughly 50 seconds for one organisation against the live database from a
 * local dev server, so the default 10 second function limit is nowhere near
 * enough. 300 is the Vercel Pro ceiling; on Hobby this is clamped to 60 and
 * a second organisation would likely not finish. If that becomes real, the
 * fix is to sweep one organisation per invocation from a queue rather than
 * looping them all in one request.
 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function unauthorised() {
  // Deliberately vague: this endpoint should not confirm whether a secret is
  // configured to anyone probing it.
  return NextResponse.json({ error: "Not authorised" }, { status: 401 });
}

export async function GET(request: Request): Promise<NextResponse> {
  const expected = serverEnv.CRON_SECRET;

  // Fail closed. A misconfigured deployment must not expose an open endpoint
  // that mutates every organisation.
  if (!expected) {
    console.error("[cron/sweep] CRON_SECRET is not set, refusing to run.");
    return unauthorised();
  }

  // Vercel Cron sends the secret as a bearer token. A query parameter is
  // deliberately not accepted: secrets in URLs end up in access logs.
  const authorisation = request.headers.get("authorization");
  if (authorisation !== `Bearer ${expected}`) return unauthorised();

  const supabase = createSupabaseAdminClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY);

  const { data: organisations, error } = await supabase
    .from("organisations")
    .select("id, name")
    .is("deleted_at", null);
  if (error) {
    console.error("[cron/sweep] could not list organisations:", error.message);
    return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
  }

  const startedAt = Date.now();
  const summary: { organisation: string; actions: number; error?: string }[] = [];

  for (const organisation of organisations ?? []) {
    try {
      const results = await runSweep(supabase, organisation.id);
      summary.push({
        organisation: organisation.name,
        actions: results.reduce((total, r) => total + r.actions, 0),
      });
    } catch (cause) {
      // One tenant's bad data must not stop every other tenant being swept.
      const message = cause instanceof Error ? cause.message : String(cause);
      console.error(`[cron/sweep] ${organisation.name} failed:`, message);
      summary.push({ organisation: organisation.name, actions: 0, error: message });
    }
  }

  const failed = summary.filter((s) => s.error).length;
  console.log(
    `[cron/sweep] swept ${summary.length} organisation(s) in ${Date.now() - startedAt}ms, ${failed} failed.`,
  );

  return NextResponse.json({
    sweptOrganisations: summary.length,
    totalActions: summary.reduce((total, s) => total + s.actions, 0),
    failed,
    durationMs: Date.now() - startedAt,
    results: summary,
  });
}
