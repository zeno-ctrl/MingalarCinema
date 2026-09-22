import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";

export async function getCurrentSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.error) return null;
  return session;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

const roleRank: Record<Role, number> = { USER: 0, ADMIN: 1, SUPER_ADMIN: 2 };

export function hasRole(role: Role, minimum: Role): boolean {
  return roleRank[role] >= roleRank[minimum];
}

/**
 * Defense-in-depth role gate for API route handlers. Middleware also blocks
 * unauthenticated/unauthorized requests to /api/admin/**, but every handler
 * re-checks independently so protection doesn't rely on middleware alone.
 */
export async function requireApiRole(minimum: Role) {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (!hasRole(user.role, minimum)) {
    return { user: null, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { user, response: null };
}

/**
 * Server Component guard. Middleware already blocks most unauthorized
 * traffic to /admin, but it decodes the JWT cookie directly without
 * re-checking the DB, so a just-revoked session or just-changed role can
 * still carry a stale cookie for a short window. getCurrentUser() runs the
 * full NextAuth session pipeline (including our jwt() callback's live DB
 * check), so calling this from every admin page closes that gap.
 */
export async function requirePageUser(callbackUrl: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}

export async function requirePageRole(minimum: Role) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/admin");
  if (!hasRole(user.role, minimum)) redirect("/");
  if (!user.twoFactorEnabled) redirect("/admin/setup-2fa");
  return user;
}
