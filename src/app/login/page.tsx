import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export const metadata = { title: "Log in - Mingalar Cinema" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full rounded-card bg-bg p-6 shadow-card sm:p-8">
        <Suspense fallback={null}>
          <LoginForm
            googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim())}
            appleEnabled={Boolean(process.env.APPLE_ID?.trim() && process.env.APPLE_SECRET?.trim())}
          />
        </Suspense>
      </div>
    </div>
  );
}
