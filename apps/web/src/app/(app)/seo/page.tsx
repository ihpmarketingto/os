import { ChannelDashboard } from "@/components/marketing/channel-dashboard";

export default function SeoPage() {
  return (
    <ChannelDashboard
      title="SEO"
      description="Organic performance from Search Console and GA4 exports. Spend stays zero for organic rows."
      channels={["seo"]}
      defaultChannel="seo"
    />
  );
}
