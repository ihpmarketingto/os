"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { generateOpenAiImage, type ImageQuality, type ImageSize } from "@ihp/ai-router";
import { requirePermission, writeAuditLog } from "@ihp/database";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env/server";

/** Monthly organisation cap on image generation spend, in USD. */
const MONTHLY_IMAGE_SPEND_CAP_USD = 20;

const ALLOWED_UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function str(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

export interface GenerateImageState {
  assetId?: string;
  costUsd?: number;
  error?: string;
}

/**
 * Generates an image and stores it as an AI-labelled creative asset. The
 * asset carries its prompt and cost, and the database forbids it ever being
 * marked as depicting a real client result.
 */
export async function generateImage(_prev: GenerateImageState, formData: FormData): Promise<GenerateImageState> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = str(formData, "clientId");
  const prompt = str(formData, "prompt");
  const size = (str(formData, "size") as ImageSize | null) ?? "1024x1024";
  const quality = (str(formData, "quality") as ImageQuality | null) ?? "medium";
  if (!prompt) return { error: "Describe the image you want." };

  if (!serverEnv.OPENAI_API_KEY) {
    return { error: "OpenAI is not configured, so images cannot be generated." };
  }

  try {
    await requirePermission(supabase, session.organisationId, "content", "create", clientId);
  } catch {
    return { error: "You do not have permission to create content for this client." };
  }

  // Spend cap, counted from what has already been generated this month.
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data: monthAssets } = await supabase
    .from("creative_assets")
    .select("generation_cost")
    .eq("organisation_id", session.organisationId)
    .eq("origin", "ai_generated")
    .gte("created_at", monthStart.toISOString());
  const monthSpend = (monthAssets ?? []).reduce((sum, a) => sum + Number(a.generation_cost ?? 0), 0);
  if (monthSpend >= MONTHLY_IMAGE_SPEND_CAP_USD) {
    return { error: `The monthly image generation cap (US$${MONTHLY_IMAGE_SPEND_CAP_USD}) is reached.` };
  }

  // Brand guardrails travel with every prompt.
  const guardedPrompt = [
    prompt,
    "",
    "Style requirements: photographic realism with natural skin texture and credible lighting.",
    "Do not over-smooth or over-retouch skin. Avoid a synthetic or obviously AI-generated look.",
    "Do not include text, logos, watermarks or claims in the image.",
  ].join("\n");

  let image;
  try {
    image = await generateOpenAiImage(serverEnv.OPENAI_API_KEY, guardedPrompt, { size, quality });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Image generation failed." };
  }

  const [width, height] = size.split("x").map(Number);
  const bytes = Buffer.from(image.base64, "base64");
  const storagePath = `${session.organisationId}/${clientId ?? "shared"}/${randomUUID()}.png`;

  const { error: uploadError } = await supabase.storage
    .from("creative")
    .upload(storagePath, bytes, { contentType: "image/png" });
  if (uploadError) return { error: uploadError.message };

  const { data: asset, error: insertError } = await supabase
    .from("creative_assets")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      name: prompt.slice(0, 80),
      storage_path: storagePath,
      mime_type: "image/png",
      width: width ?? null,
      height: height ?? null,
      size_bytes: bytes.byteLength,
      origin: "ai_generated",
      generation_prompt: prompt,
      generation_provider: "openai",
      generation_model: image.model,
      generation_cost: image.estimatedCostUsd,
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (insertError) {
    await supabase.storage.from("creative").remove([storagePath]);
    return { error: insertError.message };
  }

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "creative_assets",
    resourceId: asset.id,
    clientId,
    metadata: { origin: "ai_generated", model: image.model, costUsd: image.estimatedCostUsd },
  });

  revalidatePath("/creative-studio");
  return { assetId: asset.id, costUsd: image.estimatedCostUsd };
}

export async function uploadCreativeAsset(formData: FormData): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const file = formData.get("file");
  const clientId = str(formData, "clientId");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "File is larger than the 15MB limit." };
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) return { error: `File type "${file.type || "unknown"}" is not allowed.` };

  try {
    await requirePermission(supabase, session.organisationId, "content", "create", clientId);
  } catch {
    return { error: "You do not have permission to add assets for this client." };
  }

  const storagePath = `${session.organisationId}/${clientId ?? "shared"}/${randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("creative")
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { data: asset, error } = await supabase
    .from("creative_assets")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      name: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      origin: "uploaded",
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) {
    await supabase.storage.from("creative").remove([storagePath]);
    return { error: error.message };
  }

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "creative_assets",
    resourceId: asset.id,
    clientId,
    metadata: { origin: "uploaded", name: file.name },
  });

  revalidatePath("/creative-studio");
  return {};
}

/** Human sign-off on an asset before it is used in client work. */
export async function reviewCreativeAsset(assetId: string): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: asset, error: fetchError } = await supabase
    .from("creative_assets")
    .select("id, client_id, origin")
    .eq("id", assetId)
    .single();
  if (fetchError) return { error: fetchError.message };

  try {
    await requirePermission(supabase, session.organisationId, "content", "update", asset.client_id);
  } catch {
    return { error: "You do not have permission to review assets for this client." };
  }

  const { error } = await supabase
    .from("creative_assets")
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: session.userId })
    .eq("id", assetId);
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "update",
    resource: "creative_assets",
    resourceId: assetId,
    clientId: asset.client_id,
    metadata: { reviewed: true, origin: asset.origin },
  });

  revalidatePath("/creative-studio");
  return {};
}

export async function createDesign(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const clientId = str(formData, "clientId");
  const name = str(formData, "name");
  const format = (str(formData, "format") ?? "square") as "square" | "portrait" | "story" | "landscape";
  if (!clientId || !name) throw new Error("Client and design name are required");

  await requirePermission(supabase, session.organisationId, "content", "create", clientId);

  const dimensions: Record<string, { width: number; height: number }> = {
    square: { width: 1080, height: 1080 },
    portrait: { width: 1080, height: 1350 },
    story: { width: 1080, height: 1920 },
    landscape: { width: 1200, height: 628 },
  };
  const size = dimensions[format] ?? dimensions.square!;

  const { data: design, error } = await supabase
    .from("designs")
    .insert({
      organisation_id: session.organisationId,
      client_id: clientId,
      name,
      format,
      width: size.width,
      height: size.height,
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "designs",
    resourceId: design.id,
    clientId,
    metadata: { name, format },
  });

  revalidatePath("/creative-studio");
}

/**
 * Where the editor should upload rendered artwork. Rendered PNGs run to
 * several megabytes, well past the server action body limit, so the browser
 * uploads them straight to storage (permitted by the bucket's RLS for
 * internal members) and only the path comes back through an action.
 */
export async function getDesignUploadPaths(
  designId: string,
): Promise<{ error?: string; thumbnailPath?: string; exportPath?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: design, error } = await supabase
    .from("designs")
    .select("id, client_id")
    .eq("id", designId)
    .single();
  if (error) return { error: error.message };

  try {
    await requirePermission(supabase, session.organisationId, "content", "update", design.client_id);
  } catch {
    return { error: "You do not have permission to edit designs for this client." };
  }

  return {
    thumbnailPath: `${session.organisationId}/${design.client_id}/thumb-${designId}.png`,
    exportPath: `${session.organisationId}/${design.client_id}/export-${designId}-${Date.now()}.png`,
  };
}

/** Persists canvas state. The thumbnail is uploaded by the browser first. */
export async function saveDesignCanvas(
  designId: string,
  canvasJson: unknown,
  thumbnailPath?: string,
): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: design, error: fetchError } = await supabase
    .from("designs")
    .select("id, client_id, version, thumbnail_path")
    .eq("id", designId)
    .single();
  if (fetchError) return { error: fetchError.message };

  try {
    await requirePermission(supabase, session.organisationId, "content", "update", design.client_id);
  } catch {
    return { error: "You do not have permission to edit designs for this client." };
  }

  const { error } = await supabase
    .from("designs")
    .update({
      canvas_json: canvasJson as never,
      thumbnail_path: thumbnailPath ?? design.thumbnail_path,
      version: design.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", designId);
  if (error) return { error: error.message };

  revalidatePath("/creative-studio");
  return {};
}

/** Records artwork the browser has already uploaded, as a reusable asset. */
export async function registerDesignExport(designId: string, exportPath: string): Promise<{ error?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: design, error: fetchError } = await supabase
    .from("designs")
    .select("id, name, client_id")
    .eq("id", designId)
    .single();
  if (fetchError) return { error: fetchError.message };

  try {
    await requirePermission(supabase, session.organisationId, "content", "update", design.client_id);
  } catch {
    return { error: "You do not have permission to export designs for this client." };
  }

  await supabase.from("designs").update({ export_path: exportPath }).eq("id", designId);

  await supabase.from("creative_assets").insert({
    organisation_id: session.organisationId,
    client_id: design.client_id,
    name: `${design.name} (export)`,
    storage_path: exportPath,
    mime_type: "image/png",
    origin: "uploaded",
    // An export of work a person composed is already reviewed by definition.
    reviewed_at: new Date().toISOString(),
    reviewed_by: session.userId,
    created_by: session.userId,
  });

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "export",
    resource: "designs",
    resourceId: designId,
    clientId: design.client_id,
    metadata: { exportPath },
  });

  revalidatePath("/creative-studio");
  return {};
}

/** Short-lived signed URLs so the editor and library can display assets. */
export async function signCreativePaths(paths: string[]): Promise<Record<string, string>> {
  await requireSession();
  const supabase = await getSupabaseServerClient();
  const signed: Record<string, string> = {};
  for (const path of paths) {
    const { data } = await supabase.storage.from("creative").createSignedUrl(path, 3600);
    if (data?.signedUrl) signed[path] = data.signedUrl;
  }
  return signed;
}
