import { ChannelDashboard } from "@/components/marketing/channel-dashboard";

export default function EmailLifecyclePage() {
  return (
    <ChannelDashboard
      title="Email and Lifecycle"
      description="Campaign and flow performance from ESP exports. Klaviyo API sync activates with credentials."
      channels={["email"]}
      defaultChannel="email"
    />
  );
}
