import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { LogoutAllButton } from "@/components/profile/LogoutAllButton";
import type { Locale } from "@/lib/i18n/config";

export const metadata = { title: "Profile - CineTown" };

export default async function ProfilePage() {
  const sessionUser = await getCurrentUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: sessionUser!.id } });

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-6">
      <div>
        <h1 className="mb-4 text-2xl font-semibold">Profile</h1>
        <ProfileForm initialName={user.name} initialPhone={user.phone ?? ""} initialLanguage={user.language as Locale} />
      </div>

      <div className="border-t border-black/10 pt-6 dark:border-white/10">
        <h2 className="mb-4 text-lg font-semibold">Password</h2>
        <ChangePasswordForm hasPassword={!!user.passwordHash} />
      </div>

      <div className="border-t border-black/10 pt-6 dark:border-white/10">
        <h2 className="mb-4 text-lg font-semibold">Security</h2>
        <LogoutAllButton />
      </div>
    </div>
  );
}
