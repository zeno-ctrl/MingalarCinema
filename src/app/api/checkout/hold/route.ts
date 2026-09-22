import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth-helpers";
import { acquireSeatHold, releaseSeatHold } from "@/lib/seat-lock";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  showtimeId: z.string().min(1),
  seatId: z.string().min(1),
});

const REASON_MESSAGES: Record<string, string> = {
  TAKEN: "Sorry, that seat was just taken. Please choose another.",
  MAX_SEATS: "You've reached the maximum number of seats for one booking.",
  NOT_FOUND: "That seat isn't available.",
};

export async function POST(req: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const { success } = await rateLimit(`seat-hold:${user.id}:${clientIp(req)}`, { limit: 30, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const showtime = await prisma.showtime.findUnique({ where: { id: parsed.data.showtimeId } });
  if (!showtime || showtime.startsAt < new Date()) {
    return NextResponse.json({ error: "This showtime is no longer available." }, { status: 400 });
  }

  const result = await acquireSeatHold(parsed.data.showtimeId, parsed.data.seatId, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: REASON_MESSAGES[result.reason] }, { status: 409 });
  }

  return NextResponse.json({ ok: true, expiresAt: result.expiresAt });
}

export async function DELETE(req: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await releaseSeatHold(parsed.data.showtimeId, parsed.data.seatId, user.id);
  return NextResponse.json({ ok: true });
}
