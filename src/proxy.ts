import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
  matcher: ["/admin/:path*", "/api/admin/:path*", "/profile/:path*", "/my-tickets/:path*", "/checkout/:path*"],
};
