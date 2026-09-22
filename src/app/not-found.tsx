import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="max-w-sm text-text-muted">
        We couldn&rsquo;t find the page you&rsquo;re looking for. It may have moved, or the link might be incorrect.
      </p>
      <p className="max-w-sm font-mm-support text-text-muted">
        သင်ရှာနေသောစာမျက်နှာကို ရှာမတွေ့ပါ။ လင့်ခ်ပြောင်းသွားခြင်း သို့မဟုတ် မှားယွင်းနေခြင်းဖြစ်နိုင်ပါသည်။
      </p>
      <Link href="/" className="mt-2 rounded-chip bg-brand-gradient px-5 py-3 text-sm font-medium text-white">
        Back to Home
      </Link>
    </div>
  );
}
