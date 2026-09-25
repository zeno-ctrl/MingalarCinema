import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiRole, getCurrentUser } from "@/lib/auth-helpers";
import { recordAudit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireApiRole("ADMIN");
  if (response) return response;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isDisabled: true,
      createdAt: true,
      bookings: {
        select: { id: true, reference: true, status: true, total: true, createdAt: true, showtime: { select: { movie: { select: { title: true } }, startsAt: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

const patchSchema = z.object({
  isDisabled: z.boolean().optional(),
  role: z.enum(["USER", "CASHIER", "ADMIN", "SUPER_ADMIN"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Role changes are a super-admin-only privilege escalation risk;
  // disabling/enabling accounts is a normal admin duty.
  if (parsed.data.role !== undefined && currentUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (parsed.data.isDisabled !== undefined && !["ADMIN", "SUPER_ADMIN"].includes(currentUser.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (id === currentUser.id) {
    return NextResponse.json({ error: "You can't change your own role or disable your own account." }, { status: 400 });
  }

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(parsed.data.isDisabled !== undefined ? { isDisabled: parsed.data.isDisabled, sessionVersion: { increment: 1 } } : {}),
      ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
    },
  });

  await recordAudit({
    actorId: currentUser.id,
    action: parsed.data.role !== undefined ? "user.role_change" : "user.disable_toggle",
    entityType: "User",
    entityId: id,
    before,
    after: user,
  });

  return NextResponse.json({ user });
}
