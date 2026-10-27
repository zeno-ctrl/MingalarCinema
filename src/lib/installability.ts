/** Read browser launch mode without assuming install-prompt support (notably Safari). */
export function isStandaloneLaunch(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function subscribeToLaunchMode(onChange: () => void): () => void {
  const query = window.matchMedia("(display-mode: standalone)");
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }
  // Older Safari versions expose the original MediaQueryList listener API.
  query.addListener(onChange);
  return () => query.removeListener(onChange);
}
