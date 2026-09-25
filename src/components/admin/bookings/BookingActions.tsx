"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

export function BookingActions({ bookingId, status }: { bookingId: string; status: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { show } = useToast();

  async function handleCancel() {
    const ok = await confirm({
      title: "Cancel this booking?",
      description: "The customer will keep their receipt, but the seats will be released.",
      danger: true,
      confirmLabel: "Cancel Booking",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/bookings/${bookingId}/cancel`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return show(data.error || "Failed to cancel", "error");
    show("Booking cancelled");
    router.refresh();
  }

  async function handleRefund() {
    const ok = await confirm({
      title: "Refund this booking?",
      description: "This marks the payment as refunded in Mingalar Cinema's records.",
      danger: true,
      confirmLabel: "Refund",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/bookings/${bookingId}/refund`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return show(data.error || "Failed to refund", "error");
    show("Booking refunded");
    router.refresh();
  }

  return (
    <div className="flex gap-3">
      {(status === "PENDING" || status === "PAID") && (
        <Button variant="secondary" onClick={handleCancel}>
          Cancel Booking
        </Button>
      )}
      {(status === "PAID" || status === "CHECKED_IN") && (
        <Button variant="danger" onClick={handleRefund}>
          Refund
        </Button>
      )}
    </div>
  );
}
