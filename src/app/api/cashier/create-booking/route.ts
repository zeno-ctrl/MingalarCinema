import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth-helpers";
import { createCashBooking } from "@/lib/booking";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  showtimeId: z.string().min(1),
  customerName: z.string().trim().min(1, "Customer name is required").max(100),
  customerPhone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{6,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  customerEmail: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const { user, response } = await requireApiRole("CASHIER");
  if (response) return response;

  const { success } = await rateLimit(`cash-booking:${user.id}:${clientIp(req)}`, RATE_LIMITS.payment);
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createCashBooking({
    cashierId: user.id,
    showtimeId: parsed.data.showtimeId,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone || undefined,
    customerEmail: parsed.data.customerEmail || undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
