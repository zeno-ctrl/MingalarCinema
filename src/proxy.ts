import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Defense-in-depth CSRF check for our own JSON API routes. The session
 * cookie is already SameSite=Lax (NextAuth's default), which stops it being
 * sent on cross-site POSTs in every modern browser — this Origin check
 * covers the same ground explicitly and doesn't depend on cookie behavior,
 * so it still holds even if a future change ever relaxed SameSite. Skips
 * /api/auth/** (NextAuth manages its own CSRF token, and Google's redirect
 * back to us is a legitimate cross-origin POST) and /api/webhooks/** (real
 * payment providers call those from their own servers; those routes are
 * protected by signature verification instead, not same-origin-ness).
 */
function failsOriginCheck(req: NextRequest): boolean {
  if (!MUTATING_METHODS.has(req.method)) return false;
  if (req.nextUrl.pathname.startsWith("/api/auth/") || req.nextUrl.pathname.startsWith("/api/webhooks/")) return false;

  const origin = req.headers.get("origin");
  if (!origin) return false; // same-origin requests from same-site <form>/fetch don't always send Origin; SameSite cookie is the backstop here
  return origin !== req.nextUrl.origin;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/") && failsOriginCheck(req)) {
    return NextResponse.json({ error: "cross-origin request rejected" }, { status: 403 });
  }

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isAccountPage = pathname.startsWith("/profile") || pathname.startsWith("/my-tickets");
  const isCheckoutPage = pathname.startsWith("/checkout");

  if (!isAdminPage && !isAdminApi && !isAccountPage && !isCheckoutPage) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isValidSession = token && !token.invalid;

  if (isAdminPage || isAdminApi) {
    const allowedWithoutFull2FA = pathname === "/admin/setup-2fa" || pathname === "/api/auth/2fa/setup" || pathname === "/api/auth/2fa/enable";

    if (!isValidSession || !ADMIN_ROLES.includes(token!.role as string)) {
      if (isAdminApi) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Admins must have 2FA enabled before touching anything else in /admin.
    if (!token!.twoFactorEnabled && !allowedWithoutFull2FA) {
      if (isAdminApi) {
        return NextResponse.json({ error: "2fa_setup_required" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/admin/setup-2fa", req.url));
    }

    return NextResponse.next();
  }

  // Customer account / checkout pages just require any valid logged-in user.
  if (!isValidSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/:path*",
    "/profile/:path*",
    "/my-tickets/:path*",
    "/checkout/:path*",
  ],
};
