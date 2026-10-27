"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { isStandaloneLaunch, subscribeToLaunchMode } from "@/lib/installability";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installRequested, setInstallRequested] = useState(false);
  const standalone = useSyncExternalStore(subscribeToLaunchMode, isStandaloneLaunch, () => false);
  const [installing, setInstalling] = useState(false);
  const [promptFailed, setPromptFailed] = useState(false);

  useEffect(() => {
    // Some browsers offer an install prompt; Safari uses Share > Add to Home Screen.
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setInstallRequested(false);
      setPromptFailed(false);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    setInstalling(true);
    setPromptFailed(false);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallRequested(choice.outcome === "accepted");
    } catch {
      setPromptFailed(true);
    } finally {
      // A beforeinstallprompt event can only be used once.
      setInstallPrompt(null);
      setInstalling(false);
    }
  }

  if (installed || standalone) {
    return <p role="status" className="text-sm text-success">App added. Find Mingalar Cinema on your home screen or in your apps.</p>;
  }
  if (installRequested) {
    return <p role="status" className="text-sm text-text-muted">Installation requested. Follow your browser’s instructions to finish adding the app.</p>;
  }
  if (!installPrompt) {
    return (
      <p role="status" className="text-sm text-text-muted">
        {promptFailed
          ? "Open your browser menu to install, or follow the device instructions below."
          : "Use the device instructions below. An install button appears here when your browser offers one."}
      </p>
    );
  }
  return <Button onClick={install} loading={installing}>Install web app</Button>;
}
