"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function safeAuthorizationId(formData: FormData): string {
  const value = formData.get("authorization_id");
  if (typeof value !== "string" || value.length < 8 || value.length > 500) {
    throw new Error("Invalid OAuth authorization request.");
  }
  return value;
}

export async function approveOAuthAuthorization(formData: FormData) {
  const authorizationId = safeAuthorizationId(formData);
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`);
  }

  const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId);
  if (error || !data?.redirect_url) {
    throw new Error(error?.message ?? "Could not approve OAuth authorization.");
  }

  redirect(data.redirect_url);
}

export async function denyOAuthAuthorization(formData: FormData) {
  const authorizationId = safeAuthorizationId(formData);
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId);
  if (error || !data?.redirect_url) {
    throw new Error(error?.message ?? "Could not deny OAuth authorization.");
  }

  redirect(data.redirect_url);
}
