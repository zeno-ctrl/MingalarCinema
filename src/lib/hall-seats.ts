import { prisma } from "@/lib/db";

function rowLetters(n: number): string[] {
  return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, n).split("");
}

export type SyncResult = { ok: true } | { ok: false; error: string };

/**
 * Grows or shrinks a hall's seat grid to match new rows/columns.
 * Adding seats is always safe (new STANDARD seats). Removing seats that
 * already belong to a booking is refused outright — the admin has to
 * cancel/refund those bookings first, since deleting the seat would orphan
 * a paying customer's ticket.
 */
export async function syncHallSeats(hallId: string, rows: number, columns: number): Promise<SyncResult> {
  const letters = rowLetters(rows);
  const existing = await prisma.seat.findMany({ where: { hallId } });

  const toRemove = existing.filter((s) => !letters.includes(s.row) || s.column > columns);
  if (toRemove.length > 0) {
    const removedIds = toRemove.map((s) => s.id);
    const bookedCount = await prisma.bookingSeat.count({ where: { seatId: { in: removedIds } } });
    if (bookedCount > 0) {
      return { ok: false, error: "Can't shrink the hall: some of the removed seats already have bookings." };
    }
  }

  const existingKeys = new Set(existing.map((s) => `${s.row}-${s.column}`));
  const toCreate = [];
  for (const row of letters) {
    for (let col = 1; col <= columns; col++) {
      if (!existingKeys.has(`${row}-${col}`)) {
        toCreate.push({ hallId, row, column: col, label: `${row}${col}`, type: "STANDARD" as const });
      }
    }
  }

  await prisma.$transaction([
    ...(toRemove.length > 0 ? [prisma.seat.deleteMany({ where: { id: { in: toRemove.map((s) => s.id) } } })] : []),
    ...(toCreate.length > 0 ? [prisma.seat.createMany({ data: toCreate })] : []),
    prisma.hall.update({ where: { id: hallId }, data: { rows, columns } }),
  ]);

  return { ok: true };
}
