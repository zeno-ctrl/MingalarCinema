import { describe, it, expect, afterAll } from "vitest";
import argon2 from "argon2";
import { prisma } from "@/lib/db";
import { hasRole } from "@/lib/auth-helpers";

/**
 * The admin API surface relies on requireApiRole() being called at the top
 * of every handler (never on middleware alone, per the spec's "protected
 * server-side... not just hidden in the UI" requirement). requireApiRole()
 * itself calls next-auth's getServerSession(), which requires a live
 * Next.js request scope (it reads headers()/cookies() internally) and can't
 * be invoked meaningfully from a plain vitest process — driving that needs
 * a real signed-in browser session. That full-stack path (unauthenticated
 * -> 401/redirect, plain USER -> 403/redirect, ADMIN without 2FA ->
 * redirected to setup, ADMIN with 2FA -> allowed) was exercised directly
 * with Playwright against a running server during development (see the
 * Stage 2 and Stage 6 commit messages) and is what actually proves the
 * guard end to end. What's practical to pin down here, and worth pinning
 * down, is the role-ranking logic every one of those guards depends on.
 */

describe("role ranking used by requireApiRole/requirePageRole", () => {
  it("ranks SUPER_ADMIN above ADMIN above USER", () => {
    expect(hasRole("SUPER_ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("ADMIN", "SUPER_ADMIN")).toBe(false);
    expect(hasRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("USER", "ADMIN")).toBe(false);
    expect(hasRole("SUPER_ADMIN", "USER")).toBe(true);
  });
});

describe("role checks against a real persisted user", () => {
  let testUserId: string | null = null;

  afterAll(async () => {
    if (testUserId) await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("a plain USER role does not satisfy an ADMIN requirement", async () => {
    const email = `role-test-${Date.now()}@example.com`;
    const created = await prisma.user.create({
      data: { email, name: "Role Test", passwordHash: await argon2.hash("Testpass123!"), role: "USER" },
    });
    testUserId = created.id;

    expect(hasRole(created.role, "ADMIN")).toBe(false);
    expect(hasRole(created.role, "SUPER_ADMIN")).toBe(false);
  });
});
