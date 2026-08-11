import { notFound } from "next/navigation";
import { LandingPagePublicPage } from "@/app/(app)/landing-page-factory/preview";
import { loadSharedLandingPagePreview } from "@/lib/landing-pages/runtime";

export default async function LandingPageSharedPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; versionId: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { projectId, versionId } = await params;
  const { token } = await searchParams;
  const previewToken = typeof token === "string" ? token : Array.isArray(token) ? token[0] ?? null : null;

  const runtime = await loadSharedLandingPagePreview({
    projectId,
    versionId,
    previewToken,
  });

  if (!runtime) {
    notFound();
  }

  return <LandingPagePublicPage draft={runtime.draft} assetSources={runtime.assetSources} />;
}
