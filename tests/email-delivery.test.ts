import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
});
afterEach(() => vi.unstubAllEnvs());

describe("email delivery", () => {
  it("treats an email-provider error response as a delivery failure", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-email-api-key");
    mocks.send.mockResolvedValue({ data: null, error: { message: "Provider rejected the request" } });
    const { sendVerificationEmail } = await import("@/lib/email");
    await expect(sendVerificationEmail("guest@example.com", "https://example.com/verify"))
      .rejects.toThrow("Email delivery failed");
  });

  it("does not log email links or codes as a production fallback", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const { sendVerificationEmail } = await import("@/lib/email");
      await expect(sendVerificationEmail("guest@example.com", "https://example.com/verify"))
        .rejects.toThrow("Email delivery is not configured");
      expect(log).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});
