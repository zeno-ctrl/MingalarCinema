import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { hallSchema } from "@/lib/validations/admin";
import { syncHallSeats } from "@/lib/hall-seats";
import { recordAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireApiRole("ADMIN");
  if (response) return response;
  const { id } = await params;
  const hall = await prisma.hall.findUnique({
    where: { id },
    include: { seats: { orderBy: [{ row: "asc" }, { column: "asc" }] } },
  });
  if (!hall) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ hall });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.hall.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = hallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.hall.update({ where: { id }, data: { branchId: parsed.data.branchId, name: parsed.data.name } });

  if (parsed.data.rows !== before.rows || parsed.data.columns !== before.columns) {
    const result = await syncHallSeats(id, parsed.data.rows, parsed.data.columns);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const hall = await prisma.hall.findUnique({ where: { id } });
  await recordAudit({ actorId: user.id, action: "hall.update", entityType: "Hall", entityId: id, before, after: hall });
  return NextResponse.json({ hall });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const before = await prisma.hall.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const showtimeCount = await prisma.showtime.count({ where: { hallId: id } });
  if (showtimeCount > 0) {
    return NextResponse.json({ error: "This hall has showtimes scheduled. Remove them first." }, { status: 400 });
  }

  await prisma.hall.delete({ where: { id } });
  await recordAudit({ actorId: user.id, action: "hall.delete", entityType: "Hall", entityId: id, before });
  return NextResponse.json({ ok: true });
}
