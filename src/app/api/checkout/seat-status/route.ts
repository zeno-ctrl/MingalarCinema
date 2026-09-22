import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-helpers";
import { getShowtimeSeatStatuses } from "@/lib/seat-lock";

export async function GET(req: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const url = new URL(req.url);
  const showtimeId = url.searchParams.get("showtimeId");
  if (!showtimeId) {
    return NextResponse.json({ error: "showtimeId is required" }, { status: 400 });
  }

  const { statuses, myHoldExpiresAt, mySeatIds } = await getShowtimeSeatStatuses(showtimeId, user.id);

  return NextResponse.json({
    statuses: Object.fromEntries(statuses),
    myHoldExpiresAt,
    mySeatIds,
  });
}
