import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./login-form";
import { GoogleSignInButton } from "./google-button";
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
          Access is invite-only. Contact your Agency Owner if you need an account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <div className="flex items-start gap-2 rounded-md border border-risk/40 bg-risk/5 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-risk" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        ) : null}

        <GoogleSignInButton redirectTo={target} />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Tabs defaultValue="magic-link">
          <TabsList className="w-full">
            <TabsTrigger value="magic-link" className="flex-1">
              Email link
            </TabsTrigger>
            <TabsTrigger value="password" className="flex-1">
              Password
            </TabsTrigger>
          </TabsList>
          <TabsContent value="magic-link" className="pt-3">
            <MagicLinkForm redirectTo={target} />
          </TabsContent>
          <TabsContent value="password" className="pt-3">
            <LoginForm redirectTo={target} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
