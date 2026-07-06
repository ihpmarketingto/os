import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-medium text-brand">IHP OS</p>
        <CardTitle className="font-heading text-2xl">Sign in to your workspace</CardTitle>
        <CardDescription>
          Access is invite-only. Contact your Agency Owner if you need an account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm redirectTo={redirectTo ?? "/"} />
      </CardContent>
    </Card>
  );
}
