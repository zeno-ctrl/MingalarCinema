import { LookupBookingForm } from "@/components/cashier/LookupBookingForm";

export default function CashierLookupPage() {
  return (
    <div className="space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold">Pay for a reservation</h1>
        <p className="text-sm text-text-muted">
          For customers who already booked online with &ldquo;Reserve &amp; Pay Later&rdquo; and are paying cash here.
        </p>
      </div>
      <LookupBookingForm />
    </div>
  );
}
