import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("efl_admin_session");
  const isAuthenticated = sessionToken?.value === "authenticated_efl_admin";

  // Protect admin API routes from unauthorized direct fetch
  if (pathname.startsWith("/api/admin")) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access: Admin authentication required" },
        { status: 401 }
      );
    }
  }

  // If visiting sub-routes of /admin (e.g. /admin/teams, /admin/players, /admin/matches, etc.) without session,
  // redirect directly to /admin where the password prompt is displayed
  if (pathname.startsWith("/admin/") && !isAuthenticated) {
    const loginUrl = new URL("/admin", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
