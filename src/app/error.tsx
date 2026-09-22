"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server-side details (stack, digest) are already logged by Next.js;
    // this is just a client-side breadcrumb, no sensitive data.
    console.error("Unhandled client error:", error.digest || error.message);
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white p-8 text-center text-[#1A1A1A]">
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="max-w-sm text-[#6B6B70]">
          Please try again. If the problem continues, refresh the page or come back in a few minutes.
        </p>
        <p className="max-w-sm text-[#6B6B70]">
          တစ်စုံတစ်ခု မှားယွင်းသွားပါသည်။ ထပ်မံကြိုးစားကြည့်ပါ။ ပြဿနာ ဆက်ရှိနေပါက စာမျက်နှာကို ပြန်လည်ဖွင့်ကြည့်ပါ။
        </p>
        <button
          onClick={reset}
          className="mt-2 rounded-xl px-5 py-3 text-sm font-medium text-white"
          style={{ background: "linear-gradient(160deg, #F0522A 0%, #BE1E2D 100%)" }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
