/**
 * Invite a user into the IHP OS organisation by email, ahead of their first
 * sign-in. Creates the auth user (no password; they sign in with Google,
 * which links automatically on matching verified email, or via a password
 * reset) and the organisation_members row for the given role.
 *
 * Usage:
 *   npm run invite -- <email> <role> [client-slug] [full name]
 *   npm run invite -- sarah@ihpmarketing.com agency_owner
 *   npm run invite -- dana@client.com client_admin lumen-and-co "Dana Whitfield"
 *
 * Roles: agency_owner, account_manager, specialist, contractor,
 * client_admin, client_collaborator (client roles require a client slug).
 */
import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { loadServerEnv } from "@ihp/config";
import { ROLE_SLUGS, isClientRole, type RoleSlug } from "@ihp/types";
import { createSupabaseAdminClient } from "@ihp/database/client-admin";

loadDotenv({ path: path.resolve(__dirname, "../apps/web/.env.local") });

const env = loadServerEnv(process.env);
const supabase = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const [email, roleSlug, clientSlug, fullName] = process.argv.slice(2);

  if (!email || !roleSlug || !ROLE_SLUGS.includes(roleSlug as RoleSlug)) {
    console.error(`Usage: npm run invite -- <email> <role> [client-slug] [full name]\nRoles: ${ROLE_SLUGS.join(", ")}`);
    process.exit(1);
  }
  const role = roleSlug as RoleSlug;
  if (isClientRole(role) && !clientSlug) {
    console.error(`Role "${role}" is a client portal role and requires a client slug.`);
    process.exit(1);
  }

  const { data: org, error: orgError } = await supabase
    .from("organisations")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (orgError) throw orgError;

  const { data: roleRow, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("slug", role)
    .is("organisation_id", null)
    .single();
  if (roleError) throw roleError;

  let clientId: string | null = null;
  if (clientSlug) {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name")
      .eq("organisation_id", org.id)
      .eq("slug", clientSlug)
      .single();
    if (clientError) throw new Error(`Client with slug "${clientSlug}" not found: ${clientError.message}`);
    clientId = client.id;
    console.log(`client scope: ${client.name}`);
  }

  let userId: string;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (!createError && created.user) {
    userId = created.user.id;
    console.log(`created auth user ${email}`);
  } else {
    const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
    if (listError) throw listError;
    const existing = list.users.find((u) => u.email === email);
    if (!existing) throw createError ?? new Error(`Could not find or create ${email}`);
    userId = existing.id;
    console.log(`found existing auth user ${email}`);
  }

  // Auth users created before migration 0001 predate the profiles trigger —
  // ensure the profile row exists before the membership FK references it.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId, full_name: fullName ?? null }, { onConflict: "id" });
  if (profileError) throw profileError;

  const { error: memberError } = await supabase.from("organisation_members").upsert(
    {
      organisation_id: org.id,
      user_id: userId,
      role_id: roleRow.id,
      client_id: isClientRole(role) ? clientId : null,
      status: "active",
      invited_email: email,
    },
    { onConflict: "organisation_id,user_id" },
  );
  if (memberError) throw memberError;

  await supabase.from("audit_logs").insert({
    organisation_id: org.id,
    actor_type: "system",
    action: "permission_change",
    resource: "organisation_members",
    resource_id: userId,
    client_id: isClientRole(role) ? clientId : null,
    metadata: { invitedEmail: email, role, via: "scripts/invite.ts" },
  });

  console.log(`\n${email} is now "${role}" in ${org.name}.`);
  console.log(
    "They can sign in with Google (same email) immediately, or set a password via Supabase dashboard if needed.",
  );
}

main().catch((err) => {
  console.error("Invite failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
