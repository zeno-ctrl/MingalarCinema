import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];
const CASHIER_ROLES = ["CASHIER", "ADMIN", "SUPER_ADMIN"];
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
  if (origin === req.nextUrl.origin) return false;

  // Reverse proxies can expose an internal request origin (for example,
  // 0.0.0.0) while the browser uses the configured public application URL.
  // Trust only that server configuration, never arbitrary forwarded headers.
  try {
    const appUrl = new URL(process.env.APP_URL || "");
    if ((appUrl.protocol === "https:" || appUrl.protocol === "http:") && origin === appUrl.origin) {
      return false;
    }
  } catch {
    // A missing or invalid public URL must not weaken the origin check.
  }
  return true;
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const callbackUrl = `${pathname}${search}`;

  if (pathname.startsWith("/api/") && failsOriginCheck(req)) {
    return NextResponse.json({ error: "cross-origin request rejected" }, { status: 403 });
  }

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isCashierPage = pathname.startsWith("/cashier");
  const isCashierApi = pathname.startsWith("/api/cashier");
  const isAccountPage = pathname.startsWith("/profile") || pathname.startsWith("/my-tickets");
  const isCheckoutPage = pathname.startsWith("/checkout");

  if (!isAdminPage && !isAdminApi && !isCashierPage && !isCashierApi && !isAccountPage && !isCheckoutPage) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isValidSession = token && !token.invalid;

  if (isCashierPage || isCashierApi) {
    if (!isValidSession || !CASHIER_ROLES.includes(token!.role as string)) {
      if (isCashierApi) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", callbackUrl);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (isAdminPage || isAdminApi) {
    if (!isValidSession || !ADMIN_ROLES.includes(token!.role as string)) {
      if (isAdminApi) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", callbackUrl);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // Customer account / checkout pages just require any valid logged-in user.
  if (!isValidSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/cashier/:path*",
    "/api/:path*",
    "/profile/:path*",
    "/my-tickets/:path*",
    "/checkout/:path*",
  ],
};
