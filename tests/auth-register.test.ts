import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  prisma: { user: { findUnique: vi.fn(), create: vi.fn() } },
  hash: vi.fn(),
  sendVerificationEmail: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("argon2", () => ({ default: { hash: mocks.hash } }));
vi.mock("@/lib/email", () => ({ sendVerificationEmail: mocks.sendVerificationEmail }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
  RATE_LIMITS: { signup: {} },
  clientIp: () => "127.0.0.1",
}));

import { POST } from "@/app/api/auth/register/route";

function request(overrides = {}) {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Cinema Guest", email: "Guest@Example.com", password: "Testpass123!", ...overrides }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.prisma.user.findUnique.mockResolvedValue(null);
  mocks.prisma.user.create.mockResolvedValue({ id: "registered-user", email: "guest@example.com" });
  mocks.hash.mockResolvedValue("hashed-password");
  mocks.rateLimit.mockResolvedValue({ success: true });
});

describe("account registration", () => {
  it("creates an active account that is immediately usable without verification email", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: "Cinema Guest", email: "guest@example.com", phone: null,
        passwordHash: "hashed-password", emailVerified: expect.any(Date), isDisabled: false,
      },
    });
    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("never claims a new signup succeeded for an existing account", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ id: "existing-user", passwordHash: "original-hash" });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Unable to create an account with those details. Please sign in or reset your password.",
    });
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
    expect(mocks.hash).not.toHaveBeenCalled();
  });

  it("returns the same conflict for a simultaneous signup of the same address", async () => {
    mocks.prisma.user.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Unique email", {
      code: "P2002", clientVersion: "5.22.0",
    }));
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("Please sign in") });
  });

  it("keeps password validation in place", async () => {
    const response = await POST(request({ password: "weak" }));
    expect(response.status).toBe(400);
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
  });

  it("keeps signup throttling in place", async () => {
    mocks.rateLimit.mockResolvedValue({ success: false });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(mocks.prisma.user.create).not.toHaveBeenCalled();
  });
});
