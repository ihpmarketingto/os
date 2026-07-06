import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { MagicLinkForm } from "./magic-link-form";

const ERROR_MESSAGES: Record<string, string> = {
  link_expired: "That sign-in link has expired or was already used. Request a fresh one below.",
  auth_callback_failed: "Sign-in could not be completed. Try again, or request a fresh link below.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const { redirectTo, error } = await searchParams;
  const target = redirectTo ?? "/";
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.auth_callback_failed) : null;

  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-medium text-brand">IHP OS</p>
        <CardTitle className="font-heading text-2xl">Sign in to your workspace</CardTitle>
        <CardDescription>
          Enter your email and we&rsquo;ll send you a sign-in link. Access is invite-only: contact your Agency
          Owner if you need an account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <div className="flex items-start gap-2 rounded-md border border-risk/40 bg-risk/5 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-risk" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        ) : null}

        <MagicLinkForm redirectTo={target} />

        <details className="group">
          <summary className="cursor-pointer list-none text-xs text-muted-foreground underline-offset-4 hover:underline">
            Sign in with a password instead
          </summary>
          <div className="pt-3">
            <LoginForm redirectTo={target} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
