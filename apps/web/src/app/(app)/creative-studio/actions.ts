"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { generateOpenAiImage, type ImageQuality, type ImageSize } from "@ihp/ai-router";
import { requirePermission, writeAuditLog } from "@ihp/database";
import type { Json } from "@ihp/database/types.gen";
import {
  clampSlideCount,
  DESIGN_FORMATS,
  MAX_CAROUSEL_SLIDES,
  resizeCanvasJson,
  type DesignFormat,
} from "@ihp/types";
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
  const format = (str(formData, "format") ?? "square") as DesignFormat;
  const templateId = str(formData, "templateId");
  const slideCount = str(formData, "slideCount");
  if (!clientId || !name) throw new Error("Client and design name are required");

  await requirePermission(supabase, session.organisationId, "content", "create", clientId);

  const size = DESIGN_FORMATS[format] ?? DESIGN_FORMATS.square;

  // Starting from a template copies its layers, resized if the template was
  // drawn for a different placement.
  let canvasJson: Json = {};
  if (templateId) {
    const { data: template, error: templateError } = await supabase
      .from("designs")
      .select("canvas_json, width, height")
      .eq("id", templateId)
      .eq("is_template", true)
      .single();
    if (templateError) throw new Error(templateError.message);
    canvasJson = resizeCanvasJson(
      template.canvas_json,
      { width: template.width, height: template.height },
      size,
    ) as Json;
  }

  // A carousel is a set of sibling slides sharing a group id, so each slide
  // is an ordinary design and reuses the editor and export path unchanged.
  const slides = slideCount ? clampSlideCount(Number(slideCount)) : 1;
  const carouselGroupId = slides > 1 ? randomUUID() : null;

  const rows = Array.from({ length: slides }, (_, index) => ({
    organisation_id: session.organisationId,
    client_id: clientId,
    name: slides > 1 ? `${name} - ${index + 1}` : name,
    format,
    width: size.width,
    height: size.height,
    canvas_json: canvasJson,
    carousel_group_id: carouselGroupId,
    slide_index: carouselGroupId ? index : null,
    source_design_id: templateId,
    created_by: session.userId,
  }));

  const { data: created, error } = await supabase.from("designs").insert(rows).select("id");
  if (error) throw new Error(error.message);

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "designs",
    resourceId: created[0]!.id,
    clientId,
    metadata: { name, format, slides, fromTemplate: templateId ?? null },
  });

  revalidatePath("/creative-studio");
}

/**
 * Copies a design into another placement, scaling the layers to fit. This is
 * the point of the studio for ads work: draw the square once, then take the
 * story and the landscape banner from it instead of rebuilding both.
 */
export async function resizeDesign(designId: string, format: DesignFormat): Promise<{ error?: string; id?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: design, error: fetchError } = await supabase
    .from("designs")
    .select("id, name, client_id, width, height, canvas_json, carousel_group_id")
    .eq("id", designId)
    .single();
  if (fetchError) return { error: fetchError.message };

  try {
    await requirePermission(supabase, session.organisationId, "content", "create", design.client_id);
  } catch {
    return { error: "You do not have permission to create designs for this client." };
  }

  const target = DESIGN_FORMATS[format];
  if (!target) return { error: "Unknown format." };

  const { data: created, error } = await supabase
    .from("designs")
    .insert({
      organisation_id: session.organisationId,
      client_id: design.client_id,
      name: `${design.name} - ${format}`,
      format,
      width: target.width,
      height: target.height,
      canvas_json: resizeCanvasJson(
        design.canvas_json,
        { width: design.width, height: design.height },
        target,
      ) as Json,
      source_design_id: design.id,
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "designs",
    resourceId: created.id,
    clientId: design.client_id,
    metadata: { resizedFrom: design.id, format },
  });

  revalidatePath("/creative-studio");
  return { id: created.id };
}

/**
 * Saves a design's layers into the shared template library. Templates carry
 * no client, so a layout built for one client is not silently reused as
 * another client's work: only the arrangement travels, and the person
 * starting from it fills in that client's own copy and imagery.
 */
export async function saveAsTemplate(
  designId: string,
  templateName: string,
  category: string | null,
): Promise<{ error?: string; id?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const name = templateName.trim();
  if (!name) return { error: "Give the template a name." };

  const { data: design, error: fetchError } = await supabase
    .from("designs")
    .select("id, client_id, format, width, height, canvas_json")
    .eq("id", designId)
    .single();
  if (fetchError) return { error: fetchError.message };

  try {
    await requirePermission(supabase, session.organisationId, "content", "read", design.client_id);
  } catch {
    return { error: "You do not have permission to use this design." };
  }

  const { data: created, error } = await supabase
    .from("designs")
    .insert({
      organisation_id: session.organisationId,
      client_id: null,
      name,
      format: design.format,
      width: design.width,
      height: design.height,
      canvas_json: design.canvas_json,
      is_template: true,
      template_category: category?.trim() || null,
      source_design_id: design.id,
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "designs",
    resourceId: created.id,
    metadata: { template: true, name, fromDesign: design.id },
  });

  revalidatePath("/creative-studio");
  return { id: created.id };
}

/** Adds a slide to the end of an existing carousel. */
export async function addCarouselSlide(designId: string): Promise<{ error?: string; id?: string }> {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: design, error: fetchError } = await supabase
    .from("designs")
    .select("id, name, client_id, format, width, height, carousel_group_id")
    .eq("id", designId)
    .single();
  if (fetchError) return { error: fetchError.message };
  if (!design.carousel_group_id) return { error: "This design is not part of a carousel." };

  try {
    await requirePermission(supabase, session.organisationId, "content", "create", design.client_id);
  } catch {
    return { error: "You do not have permission to create designs for this client." };
  }

  const { data: siblings, error: siblingError } = await supabase
    .from("designs")
    .select("slide_index")
    .eq("carousel_group_id", design.carousel_group_id)
    .is("deleted_at", null)
    .order("slide_index", { ascending: false })
    .limit(1);
  if (siblingError) return { error: siblingError.message };

  const nextIndex = (siblings[0]?.slide_index ?? -1) + 1;
  if (nextIndex >= MAX_CAROUSEL_SLIDES) {
    return { error: `A carousel holds at most ${MAX_CAROUSEL_SLIDES} slides.` };
  }

  const baseName = design.name.replace(/ - \d+$/, "");
  const { data: created, error } = await supabase
    .from("designs")
    .insert({
      organisation_id: session.organisationId,
      client_id: design.client_id,
      name: `${baseName} - ${nextIndex + 1}`,
      format: design.format,
      width: design.width,
      height: design.height,
      carousel_group_id: design.carousel_group_id,
      slide_index: nextIndex,
      created_by: session.userId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await writeAuditLog(supabase, {
    organisationId: session.organisationId,
    actorUserId: session.userId,
    action: "create",
    resource: "designs",
    resourceId: created.id,
    clientId: design.client_id,
    metadata: { carouselGroupId: design.carousel_group_id, slideIndex: nextIndex },
  });

  revalidatePath(`/creative-studio/${designId}`);
  return { id: created.id };
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
