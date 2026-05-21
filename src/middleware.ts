import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import type { UserRole } from "@/lib/types/enums";

const ADMIN_ROLES: UserRole[] = ["super_admin", "admin", "operator"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabaseResponse, user, supabase } = await updateSession(request);

  // Root redirect
  if (pathname === "/") {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/client/dashboard", request.url));
  }

  // KOC routes — no auth required, token validated at page level
  if (pathname.startsWith("/koc/")) {
    return supabaseResponse;
  }

  // Auth routes — redirect if already logged in
  if (pathname.startsWith("/login")) {
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile && ADMIN_ROLES.includes(profile.role)) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      if (profile?.role === "client") {
        return NextResponse.redirect(new URL("/client/dashboard", request.url));
      }
    }
    return supabaseResponse;
  }

  // Protected routes — require login
  if (pathname.startsWith("/admin/") || pathname.startsWith("/client/")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Admin routes: require internal role
    if (pathname.startsWith("/admin/") && !ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.redirect(new URL("/client/dashboard", request.url));
    }

    // Client routes: require client role
    if (pathname.startsWith("/client/") && profile.role !== "client") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
