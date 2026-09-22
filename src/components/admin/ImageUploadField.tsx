"use client";

import { useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/Input";

export function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error || "Upload failed");
      return;
    }
    onChange(data.url);
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-muted">{label}</label>
      <div className="flex items-center gap-3">
        {value && (
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-chip bg-bg-soft">
            <Image src={value} alt="" fill className="object-cover" sizes="64px" />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="text-sm" />
          <Input placeholder="or paste an image URL" value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      </div>
      {uploading && <p className="mt-1 text-xs text-text-muted">Uploading...</p>}
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
