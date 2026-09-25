import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth-helpers";
import { confirmCashPaymentForBooking } from "@/lib/booking";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({ reference: z.string().trim().min(1).max(30) });

export async function POST(req: Request) {
  const { user, response } = await requireApiRole("CASHIER");
  if (response) return response;

  const { success } = await rateLimit(`cashier-lookup:${user.id}:${clientIp(req)}`, { limit: 30, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await confirmCashPaymentForBooking(parsed.data.reference.toUpperCase());
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
