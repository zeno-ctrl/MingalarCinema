"use client";

import { useEffect, useRef, useState } from "react";
import type QrScannerType from "qr-scanner";
import { Button } from "@/components/ui/Button";

export function QrScanButton({ onScan }: { onScan: (qrToken: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let scanner: QrScannerType | undefined;

    (async () => {
      const { default: QrScanner } = await import("qr-scanner");
      if (cancelled || !videoRef.current) return;
      scanner = new QrScanner(
        videoRef.current,
        (result) => {
          onScan(typeof result === "string" ? result : result.data);
          setOpen(false);
        },
        { highlightScanRegion: true, highlightCodeOutline: true },
      );
      try {
        await scanner.start();
      } catch {
        setError("Couldn't access the camera. Check camera permissions, or enter the code manually below.");
      }
    })();

    return () => {
      cancelled = true;
      scanner?.stop();
      scanner?.destroy();
    };
  }, [open, onScan]);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Scan Ticket QR Code
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4">
          <video ref={videoRef} className="w-full max-w-sm rounded-card" muted playsInline />
          {error && <p className="max-w-sm text-center text-sm text-error">{error}</p>}
          <button
            type="button"
            className="rounded-chip bg-bg px-6 py-3 text-sm font-semibold text-text"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
