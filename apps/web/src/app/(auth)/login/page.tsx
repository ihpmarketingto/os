import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { GoogleSignInButton } from "./google-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  const target = redirectTo ?? "/";

  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-medium text-brand">IHP OS</p>
        <CardTitle className="font-heading text-2xl">Sign in to your workspace</CardTitle>
        <CardDescription>
          Access is invite-only. Contact your Agency Owner if you need an account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleSignInButton redirectTo={target} />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <LoginForm redirectTo={target} />
      </CardContent>
    </Card>
  );
}
