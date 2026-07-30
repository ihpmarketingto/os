import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { signCreativePaths } from "./actions";
import { GenerateImagePanel, NewDesignDialog, ReviewAssetButton, UploadAssetDialog } from "./studio-panels";

export default async function CreativeStudioPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: assets }, { data: designs }, { data: clients }] = await Promise.all([
    supabase
      .from("creative_assets")
      .select("id, name, storage_path, origin, generation_prompt, generation_cost, reviewed_at, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(48),
    supabase
      .from("designs")
      .select(
        "id, name, format, width, height, status, updated_at, thumbnail_path, is_template, template_category, carousel_group_id, slide_index, client:clients(name)",
      )
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).is("deleted_at", null).order("name"),
  ]);

  const paths = [
    ...(assets ?? []).map((a) => a.storage_path),
    ...(designs ?? []).map((d) => d.thumbnail_path).filter((p): p is string => Boolean(p)),
  ];
  const signed = paths.length > 0 ? await signCreativePaths(paths) : {};

  const monthSpend = (assets ?? [])
    .filter((a) => a.origin === "ai_generated")
    .reduce((sum, a) => sum + Number(a.generation_cost ?? 0), 0);

  const templates = (designs ?? []).filter((d) => d.is_template);

  // A carousel shows as one card at its first slide, not as five near-identical
  // tiles, with the slide count on the badge.
  const slideCounts = new Map<string, number>();
  for (const d of designs ?? []) {
    if (d.carousel_group_id) slideCounts.set(d.carousel_group_id, (slideCounts.get(d.carousel_group_id) ?? 0) + 1);
  }
  const clientDesigns = (designs ?? []).filter(
    (d) => !d.is_template && (!d.carousel_group_id || (d.slide_index ?? 0) === 0),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">Creative Studio</h1>
          <p className="text-sm text-muted-foreground">
            Generate or upload assets, then build layered designs on brand. Everything AI produces is labelled and
            needs a human review before it reaches client work.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NewDesignDialog clients={clients ?? []} templates={templates.map((t) => ({ id: t.id, name: t.name }))} />
          <UploadAssetDialog clients={clients ?? []} />
        </div>
      </div>

      <Tabs defaultValue="designs">
        <TabsList>
          <TabsTrigger value="designs">Designs ({clientDesigns.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="assets">Assets ({(assets ?? []).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="designs" className="pt-4">
          {clientDesigns.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No designs yet. Create one to open the canvas.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {clientDesigns.map((d) => (
                <Link key={d.id} href={`/creative-studio/${d.id}`}>
                  <Card className="h-full transition-colors hover:border-brand/60">
                    <CardContent className="p-3">
                      <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                        {d.thumbnail_path && signed[d.thumbnail_path] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={signed[d.thumbnail_path]} alt={d.name} className="size-full object-contain" />
                        ) : (
                          <span className="text-xs text-muted-foreground">No preview yet</span>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium">{d.name}</p>
                        {d.carousel_group_id ? (
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            {slideCounts.get(d.carousel_group_id)} slides
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(d.client as unknown as { name: string } | null)?.name} · {d.width}x{d.height}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="pt-4">
          {templates.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No templates yet. Open a design you like and choose Save as template. Templates carry the layout only,
              never another client&apos;s copy or imagery.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {templates.map((t) => (
                <Link key={t.id} href={`/creative-studio/${t.id}`}>
                  <Card className="h-full transition-colors hover:border-brand/60">
                    <CardContent className="p-3">
                      <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                        {t.thumbnail_path && signed[t.thumbnail_path] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={signed[t.thumbnail_path]} alt={t.name} className="size-full object-contain" />
                        ) : (
                          <span className="text-xs text-muted-foreground">No preview yet</span>
                        )}
                      </div>
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.template_category ?? "Uncategorised"} · {t.width}x{t.height}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="generate" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generate an image</CardTitle>
              <CardDescription>
                Spent about US${monthSpend.toFixed(2)} on generation so far. Images arrive unreviewed and are excluded
                from designs until someone signs them off.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GenerateImagePanel clients={clients ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="pt-4">
          {!assets || assets.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No assets yet. Generate one or upload client photography.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {assets.map((a) => (
                <Card key={a.id}>
                  <CardContent className="space-y-2 p-3">
                    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                      {signed[a.storage_path] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={signed[a.storage_path]} alt={a.name} className="size-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Preview unavailable</span>
                      )}
                    </div>
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {a.origin === "ai_generated" ? (
                        <Badge className="bg-brand text-brand-foreground text-[10px]">AI generated</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Uploaded</Badge>
                      )}
                      {a.reviewed_at ? (
                        <Badge variant="secondary" className="text-[10px]">Reviewed</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-risk">Needs review</Badge>
                      )}
                    </div>
                    {!a.reviewed_at ? <ReviewAssetButton assetId={a.id} /> : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
