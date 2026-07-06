import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderKanban,
  CheckSquare,
  PenSquare,
  Megaphone,
  Target,
  Search,
  Globe,
  Mail,
  Handshake,
  CalendarDays,
  FileBarChart,
  Wallet,
  Rocket,
  FileText,
  Workflow,
  Sparkles,
  DoorOpen,
  Plug,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Phase this module ships in. Phase 0 items are functional today; the rest render a build-status empty state. */
  phase: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** feature_flags.key gating visibility once the module is live. Phase 0 items have none. */
  flagKey?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: LayoutDashboard, phase: 0 },
  { label: "CRM", href: "/crm", icon: Users, phase: 1, flagKey: "crm" },
  { label: "Clients", href: "/clients", icon: Building2, phase: 1, flagKey: "crm" },
  { label: "Projects", href: "/projects", icon: FolderKanban, phase: 1 },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, phase: 1 },
  { label: "Content Studio", href: "/content-studio", icon: PenSquare, phase: 1 },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone, phase: 3 },
  { label: "Paid Media", href: "/paid-media", icon: Target, phase: 3 },
  { label: "SEO", href: "/seo", icon: Search, phase: 3 },
  { label: "Website and CRO", href: "/website-cro", icon: Globe, phase: 3 },
  { label: "Email and Lifecycle", href: "/email-lifecycle", icon: Mail, phase: 3 },
  { label: "PR, Influencers and Partnerships", href: "/pr-influencers", icon: Handshake, phase: 3 },
  { label: "Events", href: "/events", icon: CalendarDays, phase: 3 },
  { label: "Reports", href: "/reports", icon: FileBarChart, phase: 3 },
  { label: "Finance", href: "/finance", icon: Wallet, phase: 2, flagKey: "finance" },
  { label: "Landing Page Factory", href: "/landing-page-factory", icon: Rocket, phase: 4, flagKey: "landing_page_factory" },
  { label: "Documents and Assets", href: "/documents", icon: FileText, phase: 1 },
  { label: "Automations", href: "/automations", icon: Workflow, phase: 6, flagKey: "automations" },
  { label: "AI Intelligence", href: "/ai-intelligence", icon: Sparkles, phase: 5, flagKey: "ai_intelligence" },
  { label: "Client Portal", href: "/client-portal", icon: DoorOpen, phase: 1, flagKey: "client_portal" },
  { label: "Integrations", href: "/integrations", icon: Plug, phase: 0 },
  { label: "Settings", href: "/settings/team", icon: Settings, phase: 0 },
];
