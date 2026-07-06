import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Token-hash verification for email links (magic link, invite, recovery).
 * Unlike /auth/callback (PKCE code exchange), this works even when the link
 * is opened in a different browser than the one that requested it, because
 * verifyOtp needs no locally stored code verifier.
 *
 * To route magic links here, the Supabase email template's link should be:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&redirectTo=/
 * (Authentication > Emails > Magic Link in the dashboard.) Until that
 * template change is made, the default {{ .ConfirmationURL }} goes through
 * /auth/callback instead, which also works for same-browser opens.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const redirectTo = searchParams.get("redirectTo") ?? "/";
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";

  if (tokenHash && type) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${safeRedirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}
