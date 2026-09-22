export function getMapEmbedUrl(lat: number | null, lng: number | null, label: string): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}(${encodeURIComponent(label)})&output=embed`;
}

export function getDirectionsUrl(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
