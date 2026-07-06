import { createSupabaseServerClient } from "@ihp/database/client-server";
import { NextResponse, type NextRequest } from "next/server";
import { loadServerEnv } from "@ihp/config";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = loadServerEnv(process.env);
  const supabase = createSupabaseServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    getAll: () => request.cookies.getAll(),
    setAll: (cookiesToSet) => {
      for (const { name, value } of cookiesToSet) {
        request.cookies.set(name, value);
      }
      response = NextResponse.next({ request });
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options);
      }
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Client portal roles only ever see the client portal — never the
  // internal sidebar/CRM/finance/etc, even if they guess the URL. RLS
  // would block their queries either way, but redirecting keeps the UI
  // honest about what they can and can't do.
  if (user && !isPublicPath) {
    const { data: membership } = await supabase
      .from("organisation_members")
      .select("roles(slug)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const roleSlug = (membership?.roles as unknown as { slug: string } | null)?.slug;
    const isClientRole = roleSlug === "client_admin" || roleSlug === "client_collaborator";

    if (isClientRole && !request.nextUrl.pathname.startsWith("/client-portal")) {
      return NextResponse.redirect(new URL("/client-portal", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
