"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";

export function LogoutAllButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch("/api/auth/logout-all", { method: "POST" });
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <Button variant="danger" loading={loading} onClick={handleClick}>
      Log out of all devices
    </Button>
  );
}
