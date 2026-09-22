"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type CheckInResult = {
  ok: boolean;
  warning?: string;
  message?: string;
  booking?: { reference: string; movieTitle: string; branchName: string; startsAt: string; seats: string[] };
};

export default function CheckInPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manualToken, setManualToken] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastScanned = useRef<string | null>(null);

  async function submitToken(token: string) {
    if (!token || token === lastScanned.current) return;
    lastScanned.current = token;
    const res = await fetch("/api/admin/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken: token }),
    });
    const data = await res.json();
    setResult(data);
    setTimeout(() => {
      lastScanned.current = null;
    }, 3000);
  }

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let rafId: number;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) videoRef.current.srcObject = stream;

        const BarcodeDetectorCtor = (window as typeof window & { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
        if (!BarcodeDetectorCtor) {
          setCameraError("Your browser doesn't support camera QR scanning. Use manual entry below.");
          return;
        }
        const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });

        async function tick() {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) submitToken(codes[0].rawValue);
          } catch {
            // ignore transient detection errors
          }
          rafId = requestAnimationFrame(tick);
        }
        tick();
      } catch {
        setCameraError("Couldn't access the camera. Use manual entry below.");
      }
    }
    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-2xl font-semibold">Check-in</h1>

      {!scanning ? (
        <Button onClick={() => setScanning(true)}>Start Camera Scanner</Button>
      ) : (
        <div>
          <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-card bg-black" />
          {cameraError && <p className="mt-2 text-sm text-warning">{cameraError}</p>}
          <Button variant="secondary" className="mt-2" onClick={() => setScanning(false)}>
            Stop Scanner
          </Button>
        </div>
      )}

      <div className="mt-6">
        <label className="mb-1 block text-sm font-medium text-text-muted">Or enter the ticket code manually</label>
        <div className="flex gap-2">
          <Input value={manualToken} onChange={(e) => setManualToken(e.target.value)} />
          <Button onClick={() => submitToken(manualToken)}>Check In</Button>
        </div>
      </div>

      {result && (
        <div
          className={cn(
            "mt-6 rounded-card p-4",
            result.ok ? "bg-success/10" : "bg-error/10",
          )}
        >
          <p className={cn("font-semibold", result.ok ? "text-success" : "text-error")}>
            {result.ok ? "Checked in!" : result.warning}
          </p>
          {result.message && <p className="mt-1 text-sm text-text-muted">{result.message}</p>}
          {result.booking && (
            <div className="mt-2 text-sm">
              <p>{result.booking.movieTitle}</p>
              <p className="text-text-muted">
                {result.booking.branchName} • {new Date(result.booking.startsAt).toLocaleString()}
              </p>
              <p>Seats: {result.booking.seats.join(", ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
