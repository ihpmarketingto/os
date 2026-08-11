import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPagePublicPage } from "@/app/(app)/landing-page-factory/preview";
import {
  loadPublishedLandingPage,
  loadPublishedLandingPageMetadata,
} from "@/lib/landing-pages/runtime";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string; slug: string }>;
}): Promise<Metadata> {
  const { projectId, slug } = await params;
  return (await loadPublishedLandingPageMetadata({ projectId, slug })) ?? {};
}

export default async function LandingPagePublishedPage({
  params,
}: {
  params: Promise<{ projectId: string; slug: string }>;
}) {
  const { projectId, slug } = await params;
  const runtime = await loadPublishedLandingPage({ projectId, slug });

  if (!runtime) {
    notFound();
  }

  return <LandingPagePublicPage draft={runtime.draft} assetSources={runtime.assetSources} />;
}
