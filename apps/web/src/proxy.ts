import { createSupabaseServerClient } from "@ihp/database/client-server";
import { NextResponse, type NextRequest } from "next/server";
import { loadServerEnv } from "@ihp/config";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/auth/confirm",
  "/.well-known/oauth-protected-resource",
];

/**
 * Routes that authenticate themselves rather than by the browser session
 * cookie. Each route must fail closed.
 */
const SELF_AUTHENTICATING_PATHS = [
  "/api/cron/",
  "/api/mcp",
];

export async function proxy(request: NextRequest) {
  if (SELF_AUTHENTICATING_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next({ request });
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the OAuth authorization_id and any other required query state.
    loginUrl.searchParams.set(
      "redirectTo",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");
    if (redirectTo?.startsWith("/") && !redirectTo.startsWith("//")) {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

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
