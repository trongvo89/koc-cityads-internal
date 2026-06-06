import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import type { UserRole } from "@/lib/types/enums";

const ADMIN_ROLES: UserRole[] = ["super_admin", "admin", "operator"];
const ROLE_COOKIE = "koc_role";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // Helper: get role from cookie cache, fall back to DB once and cache it
  async function getRole(): Promise<UserRole | null> {
    if (!user) return null;

    const cached = request.cookies.get(ROLE_COOKIE)?.value as UserRole | undefined;
    if (cached) return cached;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role) {
      supabaseResponse.cookies.set(ROLE_COOKIE, profile.role, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8, // 8 hours, matches typical session length
      });
    }

    return (profile?.role as UserRole) ?? null;
  }

  // Root redirect
  if (pathname === "/") {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    const role = await getRole();
    if (!role) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.redirect(
      new URL(ADMIN_ROLES.includes(role) ? "/admin/dashboard" : "/client/dashboard", request.url)
    );
  }

  // KOC routes — no auth required
  if (pathname.startsWith("/koc/")) return supabaseResponse;

  // Auth routes — redirect if already logged in
  if (pathname.startsWith("/login")) {
    if (user) {
      const role = await getRole();
      if (role && ADMIN_ROLES.includes(role))
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      if (role === "client")
        return NextResponse.redirect(new URL("/client/dashboard", request.url));
    }
    return supabaseResponse;
  }

  // Protected routes
  if (pathname.startsWith("/admin/") || pathname.startsWith("/client/")) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));

    const role = await getRole();
    if (!role) return NextResponse.redirect(new URL("/login", request.url));

    if (pathname.startsWith("/admin/") && !ADMIN_ROLES.includes(role))
      return NextResponse.redirect(new URL("/client/dashboard", request.url));

    if (pathname.startsWith("/admin/reports") && role !== "super_admin")
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));

    if (
      pathname.startsWith("/admin/users") &&
      role !== "super_admin" &&
      role !== "admin"
    )
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));

    if (pathname.startsWith("/client/") && role !== "client")
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
