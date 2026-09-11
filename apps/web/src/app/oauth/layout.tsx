import { AuthShell } from "@/components/shell/auth-shell";

export default function OAuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
