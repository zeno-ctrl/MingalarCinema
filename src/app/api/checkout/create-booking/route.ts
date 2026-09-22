import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth-helpers";
import { createBookingFromHolds } from "@/lib/booking";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { env } from "@/lib/env";

const schema = z.object({
  showtimeId: z.string().min(1),
  promoCode: z.string().trim().max(50).optional(),
  paymentMethod: z.enum(["CARD", "KBZPAY"]),
});

export async function POST(req: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const { success } = await rateLimit(`create-booking:${user.id}:${clientIp(req)}`, RATE_LIMITS.payment);
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await createBookingFromHolds({
    userId: user.id,
    userEmail: user.email!,
    showtimeId: parsed.data.showtimeId,
    promoCode: parsed.data.promoCode || undefined,
    paymentMethod: parsed.data.paymentMethod,
    appUrl: env.APP_URL,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
