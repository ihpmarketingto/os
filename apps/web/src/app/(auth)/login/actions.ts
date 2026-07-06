"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";

export interface LoginActionState {
  error?: string;
}

export interface MagicLinkActionState {
  sent?: boolean;
  error?: string;
}

export async function sendMagicLink(
  _prevState: MagicLinkActionState,
  formData: FormData,
): Promise<MagicLinkActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  if (!email || !email.includes("@")) {
    return { error: "Enter your email address." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Invite-only: never create an account from a magic-link request.
      shouldCreateUser: false,
      emailRedirectTo: `${serverEnv.APP_URL}/auth/callback?redirectTo=${encodeURIComponent(
        redirectTo.startsWith("/") ? redirectTo : "/",
      )}`,
    },
  });

  if (error) {
    if (/rate limit|too many/i.test(error.message)) {
      return { error: "Too many link requests. Wait a minute and try again." };
    }
    // "Signups not allowed for otp" means the email has no account. Return
    // the same neutral message as success so the form can't be used to
    // probe which email addresses exist.
    if (!/signups not allowed/i.test(error.message)) {
      console.error("[auth] magic link send failed", error.message);
      return { error: "Could not send the link right now. Try again shortly." };
    }
  }

  return { sent: true };
}

export async function signInWithPassword(_prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Incorrect email or password." };
  }

  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}
