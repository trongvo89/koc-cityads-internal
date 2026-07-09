import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import type { UserRole } from "@/lib/types/enums";

const ADMIN_ROLES: UserRole[] = ["super_admin", "admin", "operator"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // Redirect while preserving any auth cookies refreshed by updateSession.
  // NextResponse.redirect() creates a fresh response, so cookies set on
  // supabaseResponse would otherwise be dropped — causing session loss/loops.
  function redirectTo(path: string) {
    const res = NextResponse.redirect(new URL(path, request.url));
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  }

  // Resolve role from the DB — the single source of truth, matching what the
  // page layouts check. A cached cookie could go stale (e.g. switching accounts
  // on the same browser) and disagree with the layout, causing a redirect loop.
  // Memoized per-request so we query at most once.
  let roleResolved = false;
  let roleValue: UserRole | null = null;
  async function getRole(): Promise<UserRole | null> {
    if (!user) return null;
    if (roleResolved) return roleValue;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    roleValue = (profile?.role as UserRole) ?? null;
    roleResolved = true;
    return roleValue;
  }

  // Root redirect
  if (pathname === "/") {
    if (!user) return redirectTo("/login");
    const role = await getRole();
    if (!role) return redirectTo("/login");
    return redirectTo(ADMIN_ROLES.includes(role) ? "/admin/dashboard" : "/client/dashboard");
  }

  // KOC routes — no auth required
  if (pathname.startsWith("/koc/")) return supabaseResponse;

  // Auth routes — redirect if already logged in
  if (pathname.startsWith("/login")) {
    if (user) {
      const role = await getRole();
      if (role && ADMIN_ROLES.includes(role)) return redirectTo("/admin/dashboard");
      if (role === "client") return redirectTo("/client/dashboard");
    }
    return supabaseResponse;
  }

  // Protected routes
  if (pathname.startsWith("/admin/") || pathname.startsWith("/client/")) {
    if (!user) return redirectTo("/login");

    const role = await getRole();
    if (!role) return redirectTo("/login");

    if (pathname.startsWith("/admin/") && !ADMIN_ROLES.includes(role))
      return redirectTo("/client/dashboard");

    if (pathname.startsWith("/admin/reports") && role !== "super_admin")
      return redirectTo("/admin/dashboard");

    if (
      pathname.startsWith("/admin/users") &&
      role !== "super_admin" &&
      role !== "admin"
    )
      return redirectTo("/admin/dashboard");

    if (pathname.startsWith("/client/") && role !== "client")
      return redirectTo("/admin/dashboard");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
