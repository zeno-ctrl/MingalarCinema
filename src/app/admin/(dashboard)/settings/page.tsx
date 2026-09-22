import { getBrandSettings } from "@/lib/settings";
import { requirePageRole } from "@/lib/auth-helpers";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";

export default async function AdminSettingsPage() {
  const user = await requirePageRole("ADMIN");
  const brand = await getBrandSettings();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Site Settings</h1>
      <SettingsForm initial={brand} canEdit={user.role === "SUPER_ADMIN"} />
    </div>
  );
}
