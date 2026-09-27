import Link from "next/link";

export default function CashierHomePage() {
  return (
    <div className="space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold">Cashier</h1>
        <p className="text-sm text-text-muted">Sell a ticket for a walk-in customer, or collect cash for a reservation.</p>
      </div>

      <Link
        href="/movies"
        className="block rounded-card bg-bg p-4 shadow-card transition-shadow hover:shadow-card-hover"
      >
        <p className="font-medium">Sell a ticket</p>
        <p className="text-sm text-text-muted">
          Browse movies and showtimes like a customer would, pick seats, then choose &ldquo;Cash (at counter)&rdquo; to pay.
        </p>
      </Link>

      <Link
        href="/cashier/lookup"
        className="block rounded-card bg-bg p-4 shadow-card transition-shadow hover:shadow-card-hover"
      >
        <p className="font-medium">Pay a reservation</p>
        <p className="text-sm text-text-muted">
          For customers who already booked online with &ldquo;Reserve &amp; Pay Later&rdquo; and are paying cash here.
        </p>
      </Link>
    </div>
  );
}
