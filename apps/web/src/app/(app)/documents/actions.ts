"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

export async function uploadDocument(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "File is larger than the 25MB limit." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: `File type "${file.type || "unknown"}" is not allowed.` };
  }

  const clientId = String(formData.get("clientId") ?? "").trim() || null;
  await requirePermission(supabase, session.organisationId, "documents", "create", clientId);

  const storagePath = `${session.organisationId}/${clientId ?? "general"}/${randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, {
    contentType: file.type,
  });
  if (uploadError) return { error: uploadError.message };

  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      name: file.name,
      storage_path: storagePath,
      file_type: file.type,
      size_bytes: file.size,
      uploaded_by: session.userId,
    })
    .select("id")
    .single();

  if (insertError) {
    await supabase.storage.from("documents").remove([storagePath]);
    return { error: insertError.message };
  }

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "documents",
    resourceId: doc.id,
    clientId,
    metadata: { name: file.name, sizeBytes: file.size },
  });

  revalidatePath("/documents");
  return {};
}

export async function setDocumentClientVisible(documentId: string, clientVisible: boolean): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  await requirePermission(supabase, session.organisationId, "documents", "update");

  const { error } = await supabase.from("documents").update({ client_visible: clientVisible }).eq("id", documentId);
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "documents",
    resourceId: documentId,
    metadata: { clientVisible },
  });

  revalidatePath("/documents");
  revalidatePath("/client-portal");
}
