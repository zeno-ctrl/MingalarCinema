import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export const metadata = { title: "Sign up - Mingalar Cinema" };

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full rounded-card bg-bg p-6 shadow-card sm:p-8">
        <Suspense fallback={null}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
