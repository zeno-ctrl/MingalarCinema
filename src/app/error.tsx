"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server-side details (stack, digest) are already logged by Next.js;
    // this is just a client-side breadcrumb, no sensitive data.
    console.error("Unhandled client error:", error.digest || error.message);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-3 bg-bg px-4 py-12 text-center text-text" aria-labelledby="error-title">
        <h1 id="error-title" className="text-2xl font-bold sm:text-3xl">Something went wrong</h1>
        <p className="max-w-sm text-text-muted">
          Please try again. If the problem continues, refresh the page or come back in a few minutes.
        </p>
        <p lang="my" className="max-w-sm text-text-muted">
          တစ်စုံတစ်ခု မှားယွင်းသွားပါသည်။ ထပ်မံကြိုးစားကြည့်ပါ။ ပြဿနာ ဆက်ရှိနေပါက စာမျက်နှာကို ပြန်လည်ဖွင့်ကြည့်ပါ။
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 min-h-11 rounded-chip bg-brand-gradient px-5 py-3 text-sm font-medium text-white"
        >
          Try Again
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-chip px-4 text-sm font-medium text-brand-red underline underline-offset-4">Back to home</Link>
    </main>
  );
}
