import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CredentialsConfig } from "next-auth/providers/credentials";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    verificationToken: { findFirst: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
  verifyPassword: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("argon2", () => ({ default: { verify: mocks.verifyPassword } }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/rate-limit")>(),
  rateLimit: mocks.rateLimit,
}));

import { authOptions } from "@/lib/auth";

const provider = authOptions.providers.find((item) => item.id === "credentials") as
  CredentialsConfig & { options: CredentialsConfig };
const authorize = provider.options.authorize;
const request = { headers: { "x-forwarded-for": "127.0.0.1" }, body: {}, query: {}, method: "POST" };

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: "auth-test-user",
    name: "Cinema Guest",
    email: "guest@example.com",
    image: null,
    role: "USER",
    passwordHash: "test-password-hash",
    emailVerified: new Date(),
    isDisabled: false,
    lockedUntil: null,
    failedLoginCount: 0,
    sessionVersion: 0,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rateLimit.mockResolvedValue({ success: true });
  mocks.verifyPassword.mockResolvedValue(true);
  mocks.prisma.user.findUnique.mockResolvedValue(account());
  mocks.prisma.verificationToken.findFirst.mockResolvedValue({
    id: "test-login-token",
    expires: new Date(Date.now() + 60_000),
  });
  mocks.prisma.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
  mocks.prisma.$transaction.mockImplementation(async (callback) => callback(mocks.prisma));
});

describe("credential login", () => {
  it("accepts a verified account and normalizes the email lookup", async () => {
    await expect(authorize({ email: " Guest@Example.com ", password: "Testpass123!" }, request))
      .resolves.toMatchObject({ id: "auth-test-user", email: "guest@example.com" });
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "guest@example.com" } });
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "auth-test-user" },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
  });

  it("accepts an existing account without email verification", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(account({ emailVerified: null }));
    await expect(authorize({ email: "guest@example.com", password: "Testpass123!" }, request))
      .resolves.toMatchObject({ id: "auth-test-user" });
  });

  it("keeps an incorrect password generic even for an unverified account", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(account({ emailVerified: null }));
    mocks.verifyPassword.mockResolvedValue(false);
    await expect(authorize({ email: "guest@example.com", password: "incorrect" }, request))
      .rejects.toThrow("INVALID_CREDENTIALS");
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "auth-test-user" },
      data: { failedLoginCount: 1, lockedUntil: null },
    });
  });

  it.each(["ADMIN", "SUPER_ADMIN"])("allows %s login without an authenticator even for previously enrolled accounts", async (role) => {
    mocks.prisma.user.findUnique.mockResolvedValue(account({ role, twoFactorEnabled: true, twoFactorSecret: "legacy-encrypted-secret" }));
    await expect(authorize({ email: "guest@example.com", password: "Testpass123!" }, request))
      .resolves.toMatchObject({ id: "auth-test-user", role });
  });

  it("allows an emailed code login without an authenticator for a previously enrolled admin", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(account({ role: "ADMIN", twoFactorEnabled: true }));
    await expect(authorize({ email: "guest@example.com", loginCode: "123456" }, request))
      .resolves.toMatchObject({ id: "auth-test-user", role: "ADMIN" });
    expect(mocks.prisma.verificationToken.deleteMany).toHaveBeenCalledTimes(1);
  });

  it("continues to reject a disabled account", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(account({ isDisabled: true }));
    await expect(authorize({ email: "guest@example.com", password: "Testpass123!" }, request))
      .rejects.toThrow("ACCOUNT_DISABLED");
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("continues to reject an account under a temporary lockout", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(account({ lockedUntil: new Date(Date.now() + 60_000) }));
    await expect(authorize({ email: "guest@example.com", password: "Testpass123!" }, request))
      .rejects.toThrow("ACCOUNT_LOCKED");
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("verifies email ownership and consumes a code only on successful login", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(account({ emailVerified: null }));
    await expect(authorize({ email: "guest@example.com", loginCode: "123456" }, request))
      .resolves.toMatchObject({ id: "auth-test-user" });
    expect(mocks.prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { id: "test-login-token", expires: { gt: expect.any(Date) } },
    });
    expect(mocks.prisma.user.update).toHaveBeenCalledWith({
      where: { id: "auth-test-user" },
      data: { failedLoginCount: 0, lockedUntil: null, emailVerified: expect.any(Date) },
    });
  });

  it("rejects a code consumed by a concurrent request without issuing a session", async () => {
    mocks.prisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    await expect(authorize({ email: "guest@example.com", loginCode: "123456" }, request))
      .rejects.toThrow("INVALID_CREDENTIALS");
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects an expired code without consuming it or updating the user", async () => {
    mocks.prisma.verificationToken.findFirst.mockResolvedValue({ id: "expired-token", expires: new Date(0) });
    await expect(authorize({ email: "guest@example.com", loginCode: "123456" }, request))
      .rejects.toThrow("INVALID_CREDENTIALS");
    expect(mocks.prisma.verificationToken.deleteMany).not.toHaveBeenCalled();
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });
});
