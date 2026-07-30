import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { signCreativePaths } from "../actions";
import { DesignEditor, type AssetChoice } from "../design-editor";

export default async function DesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const { data: design } = await supabase
    .from("designs")
    .select("id, name, width, height, canvas_json, client_id, is_template, carousel_group_id, client:clients(name)")
    .eq("organisation_id", session.organisationId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!design) notFound();

  // Only reviewed assets are offered to the canvas, so unvetted AI imagery
  // cannot slip into client work.
  let assetQuery = supabase
    .from("creative_assets")
    .select("id, name, storage_path, origin")
    .eq("organisation_id", session.organisationId)
    .not("reviewed_at", "is", null)
    .is("deleted_at", null);
  // A template belongs to no client, so it only ever sees the shared library.
  assetQuery = design.client_id
    ? assetQuery.or(`client_id.eq.${design.client_id},client_id.is.null`)
    : assetQuery.is("client_id", null);

  const { data: assets } = await assetQuery.order("created_at", { ascending: false }).limit(40);

  // Sibling slides, so the editor can offer a strip to move between them.
  const { data: slides } = design.carousel_group_id
    ? await supabase
        .from("designs")
        .select("id, name, slide_index")
        .eq("carousel_group_id", design.carousel_group_id)
        .is("deleted_at", null)
        .order("slide_index", { ascending: true })
    : { data: null };

  const signed = await signCreativePaths((assets ?? []).map((a) => a.storage_path));
  const assetChoices: AssetChoice[] = (assets ?? [])
    .filter((a) => signed[a.storage_path])
    .map((a) => ({ id: a.id, name: a.name, url: signed[a.storage_path]!, origin: a.origin }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/creative-studio" className="flex items-center text-xs text-muted-foreground hover:underline">
            <ChevronLeft className="size-3" /> Creative Studio
          </Link>
          <h1 className="font-heading text-2xl">{design.name}</h1>
          <p className="text-sm text-muted-foreground">
            {design.is_template
              ? "Shared template"
              : (design.client as unknown as { name: string } | null)?.name}
          </p>
        </div>
      </div>

      <DesignEditor
        designId={design.id}
        width={design.width}
        height={design.height}
        initialCanvas={design.canvas_json}
        assets={assetChoices}
        slides={(slides ?? []).map((s) => ({ id: s.id, name: s.name, index: s.slide_index ?? 0 }))}
      />
    </div>
  );
}
