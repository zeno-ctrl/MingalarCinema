import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth-helpers";

export default async function Setup2FAPage() {
  await requirePageRole("ADMIN");
  redirect("/admin");
}
