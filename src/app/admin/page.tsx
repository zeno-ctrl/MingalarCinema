import { requirePageRole } from "@/lib/auth-helpers";

export default async function AdminDashboardPage() {
  const user = await requirePageRole("ADMIN");
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <p className="mt-2 text-text-muted">Signed in as {user?.name} ({user?.role})</p>
    </div>
  );
}
