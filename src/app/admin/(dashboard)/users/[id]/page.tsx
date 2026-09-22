import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageRole } from "@/lib/auth-helpers";
import { formatMMK } from "@/lib/utils";
import { UserActions } from "@/components/admin/users/UserActions";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requirePageRole("ADMIN");
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      bookings: {
        select: {
          id: true,
          reference: true,
          status: true,
          total: true,
          createdAt: true,
          showtime: { select: { movie: { select: { titleEn: true } }, startsAt: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!user) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">{user.name}</h1>
      <p className="mb-6 text-sm text-text-muted">
        {user.email} {user.phone && `• ${user.phone}`} • {user.role}
      </p>

      <UserActions userId={user.id} isDisabled={user.isDisabled} role={user.role} isSuperAdmin={currentUser.role === "SUPER_ADMIN"} />

      <h2 className="mb-3 mt-8 text-sm font-semibold text-text-muted">Booking History</h2>
      <div className="space-y-2">
        {user.bookings.map((b) => (
          <div key={b.id} className="rounded-chip bg-bg-soft p-3 text-sm">
            <div className="flex justify-between">
              <span>{b.showtime.movie.titleEn}</span>
              <span className="text-text-muted">{b.status}</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>{new Date(b.showtime.startsAt).toLocaleString()}</span>
              <span>{formatMMK(b.total)}</span>
            </div>
          </div>
        ))}
        {user.bookings.length === 0 && <p className="text-sm text-text-muted">No bookings yet.</p>}
      </div>
    </div>
  );
}
