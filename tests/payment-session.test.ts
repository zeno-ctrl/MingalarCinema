import { afterEach, describe, expect, it, vi } from "vitest";
import { readPaymentSession, savePaymentSession, type PaymentPayload } from "@/lib/payment-session";

const payment: PaymentPayload = { provider: "MOCK", total: 12000, reference: "MC-TEST-1234" };

function useStorage(raw: string | null) {
  const storage = { getItem: vi.fn(() => raw), setItem: vi.fn() };
  vi.stubGlobal("sessionStorage", storage);
  return storage;
}

afterEach(() => vi.unstubAllGlobals());

describe("payment details between checkout steps", () => {
  it("restores saved payment details", () => {
    const storage = useStorage(JSON.stringify(payment));
    expect(readPaymentSession("booking-1")).toEqual(payment);
    expect(storage.getItem).toHaveBeenCalledWith("mingalar_payment_booking-1");
    expect(savePaymentSession("booking-1", payment)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith("mingalar_payment_booking-1", JSON.stringify(payment));
  });

  it.each([null, "{invalid", "null", "[]", JSON.stringify({ ...payment, total: "12000" }),
    JSON.stringify({ ...payment, total: -1 }), JSON.stringify({ ...payment, provider: "UNKNOWN" }),
    JSON.stringify({ ...payment, provider: "STRIPE" }), JSON.stringify({ ...payment, qrCodeUrl: {} })])(
    "recovers from absent or corrupt session data: %s", (raw) => {
      useStorage(raw);
      expect(readPaymentSession("booking-1")).toBeNull();
    },
  );

  it("recovers when the browser denies access to site storage", () => {
    vi.stubGlobal("sessionStorage", {
      getItem() { throw new DOMException("Storage blocked", "SecurityError"); },
      setItem() { throw new DOMException("Storage blocked", "SecurityError"); },
    });
    expect(readPaymentSession("booking-1")).toBeNull();
    expect(savePaymentSession("booking-1", payment)).toBe(false);
  });
});
