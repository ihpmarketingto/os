import Link from "next/link";

const TABS = [
  { href: "/settings/team", label: "Team" },
  { href: "/settings/audit-log", label: "Audit Log" },
  { href: "/settings/feature-flags", label: "Feature Flags" },
  { href: "/integrations", label: "Integrations" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl">Settings</h1>
        <nav className="mt-4 flex gap-4 border-b text-sm">
          {TABS.map((tab) => (
            <Link key={tab.href} href={tab.href} className="border-b-2 border-transparent px-1 pb-2 text-muted-foreground hover:border-brand hover:text-foreground">
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
