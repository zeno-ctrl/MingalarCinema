import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ getToken: vi.fn(), getServerSession: vi.fn() }));
vi.mock("next-auth/jwt", () => ({ getToken: mocks.getToken }));
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); },
}));

import { proxy } from "@/proxy";
import { requirePageRole, requireApiRole } from "@/lib/auth-helpers";

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe("API origin checks behind a reverse proxy", () => {
  it("accepts the configured public application origin when the internal host differs", async () => {
    vi.stubEnv("APP_URL", "http://localhost:3000");
    const response = await proxy(new NextRequest("http://0.0.0.0:3000/api/checkout/hold", {
      method: "POST", headers: { origin: "http://localhost:3000" },
    }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("continues to accept the request's own origin", async () => {
    vi.stubEnv("APP_URL", "https://cinema.example.com");
    const response = await proxy(new NextRequest("http://localhost:3000/api/checkout/hold", {
      method: "POST", headers: { origin: "http://localhost:3000" },
    }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rejects an untrusted origin even if forwarded headers claim it is trusted", async () => {
    vi.stubEnv("APP_URL", "http://localhost:3000");
    const response = await proxy(new NextRequest("http://0.0.0.0:3000/api/checkout/hold", {
      method: "POST",
      headers: { origin: "https://evil.example", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" },
    }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "cross-origin request rejected" });
  });

  it("rejects a foreign origin when APP_URL is invalid", async () => {
    vi.stubEnv("APP_URL", "not-a-url");
    const response = await proxy(new NextRequest("http://0.0.0.0:3000/api/checkout/hold", {
      method: "POST", headers: { origin: "https://evil.example" },
    }));
    expect(response.status).toBe(403);
  });

  it("leaves payment webhook requests to their handler's signature check", async () => {
    vi.stubEnv("APP_URL", "http://localhost:3000");
    const response = await proxy(new NextRequest("http://0.0.0.0:3000/api/webhooks/stripe", {
      method: "POST", headers: { origin: "https://api.stripe.com" },
    }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("protected page navigation", () => {
  it("keeps the selected showtime and query parameters through sign in", async () => {
    mocks.getToken.mockResolvedValue(null);
    const response = await proxy(new NextRequest("http://localhost:3000/checkout/seats?showtimeId=show-123&branch=yangon"));
    const destination = new URL(response.headers.get("location")!);
    expect(destination.pathname).toBe("/login");
    expect(destination.searchParams.get("callbackUrl")).toBe("/checkout/seats?showtimeId=show-123&branch=yangon");
  });

  it.each(["/admin", "/api/admin/movies"])("allows an authenticated admin at %s without authenticator enrollment", async (pathname) => {
    mocks.getToken.mockResolvedValue({ role: "ADMIN", twoFactorEnabled: false });
    const response = await proxy(new NextRequest(`http://localhost:3000${pathname}`));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("continues to reject a customer at the admin API", async () => {
    mocks.getToken.mockResolvedValue({ role: "USER", twoFactorEnabled: false });
    const response = await proxy(new NextRequest("http://localhost:3000/api/admin/movies"));
    expect(response.status).toBe(401);
  });
});

describe("live admin session guards", () => {
  it("allows the admin dashboard with a current admin session and no authenticator", async () => {
    const user = { id: "admin", role: "ADMIN", twoFactorEnabled: false };
    mocks.getServerSession.mockResolvedValue({ user });
    await expect(requirePageRole("ADMIN")).resolves.toEqual(user);
    await expect(requireApiRole("ADMIN")).resolves.toEqual({ user, response: null });
  });

  it("continues to reject a customer from an admin page", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "customer", role: "USER" } });
    await expect(requirePageRole("ADMIN")).rejects.toThrow("REDIRECT:/");
  });

  it("continues to reject a revoked session", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "admin", role: "ADMIN" }, error: "SessionInvalidated" });
    const result = await requireApiRole("ADMIN");
    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(401);
  });
});
