import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth-helpers";
import { hallSchema } from "@/lib/validations/admin";
import { syncHallSeats } from "@/lib/hall-seats";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const { response } = await requireApiRole("ADMIN");
  if (response) return response;
  const halls = await prisma.hall.findMany({ include: { branch: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ halls });
}

export async function POST(req: Request) {
  const { user, response } = await requireApiRole("ADMIN");
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = hallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const hall = await prisma.hall.create({
    data: { branchId: parsed.data.branchId, name: parsed.data.name, rows: parsed.data.rows, columns: parsed.data.columns },
  });
  await syncHallSeats(hall.id, parsed.data.rows, parsed.data.columns);

  await recordAudit({ actorId: user.id, action: "hall.create", entityType: "Hall", entityId: hall.id, after: hall });
  return NextResponse.json({ hall });
}
