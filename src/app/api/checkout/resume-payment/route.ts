import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth-helpers";
import { resumePayment } from "@/lib/booking";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";
import { env } from "@/lib/env";

const schema = z.object({
  bookingId: z.string().min(1),
  paymentMethod: z.enum(["CARD", "KBZPAY"]),
});

export async function POST(req: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const { success } = await rateLimit(`resume-payment:${user.id}:${clientIp(req)}`, RATE_LIMITS.payment);
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await resumePayment({
    bookingId: parsed.data.bookingId,
    userId: user.id,
    paymentMethod: parsed.data.paymentMethod,
    appUrl: env.APP_URL,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
