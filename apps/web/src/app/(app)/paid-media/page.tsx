import { ChannelDashboard } from "@/components/marketing/channel-dashboard";

export default function PaidMediaPage() {
  return (
    <ChannelDashboard
      title="Paid Media"
      description="Meta and Google Ads performance from imported data. API sync activates with platform credentials."
      channels={["meta_ads", "google_ads"]}
      defaultChannel="meta_ads"
    />
  );
}
