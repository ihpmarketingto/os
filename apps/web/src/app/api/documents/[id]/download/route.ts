import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog } from "@ihp/database";

/**
 * Access is checked against the `documents` table with the requester's own
 * session (RLS enforces client_visible for client-portal roles). Only after
 * that succeeds does this mint a short-lived signed URL with the
 * service-role client — storage.objects RLS itself is internal-only (see
 * migration 0010), so this route is the only path a client portal user can
 * use to fetch a file.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, storage_path, name, client_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found or you do not have access to it." }, { status: 404 });
  }

  const admin = getSupabaseAdminClient();
  const { data: signed, error: signError } = await admin.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 60, { download: doc.name });

  if (signError || !signed) {
    return NextResponse.json({ error: "Could not generate a download link." }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "export",
    resource: "documents",
    resourceId: doc.id,
    clientId: doc.client_id,
  });

  return NextResponse.redirect(signed.signedUrl);
}
