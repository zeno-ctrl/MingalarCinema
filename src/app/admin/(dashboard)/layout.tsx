import { requirePageRole } from "@/lib/auth-helpers";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ToastProvider } from "@/components/admin/Toast";
import { ConfirmProvider } from "@/components/admin/ConfirmDialog";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole("ADMIN");

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-screen bg-bg-soft">
          <AdminSidebar isSuperAdmin={user.role === "SUPER_ADMIN"} />
          <div className="md:pl-56">
            <div className="mx-auto max-w-6xl p-4 sm:p-6">{children}</div>
          </div>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
