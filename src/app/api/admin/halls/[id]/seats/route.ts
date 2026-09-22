import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { seatConfigSchema } from "@/lib/validations/admin";
import { recordAudit } from "@/lib/audit";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const hall = await prisma.hall.findUnique({ where: { id } });
  if (!hall) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = seatConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.seats.map((s) =>
      prisma.seat.updateMany({
        where: { hallId: id, row: s.row, column: s.column },
        data: { type: s.type, isDisabled: s.isDisabled, isAisleAfter: s.isAisleAfter },
      }),
    ),
  );

  await recordAudit({ actorId: user.id, action: "hall.seats_update", entityType: "Hall", entityId: id });
  return NextResponse.json({ ok: true });
}
