import { describe, it, expect, afterEach, vi } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import manifest from "@/app/manifest";
import { isStandaloneLaunch, subscribeToLaunchMode } from "@/lib/installability";

describe("installable web app assets", () => {
  it("ships PNG files whose real sizes satisfy both browser installation icon requirements", async () => {
    const app = manifest();
    const realSizes = [];
    for (const icon of app.icons ?? []) {
      // Resolve against public, never against a developer machine or third-party host.
      expect(icon.src).toMatch(/^\/icons\/[a-z0-9-]+\.png$/);
      const png = await readFile(path.join(process.cwd(), "public", icon.src));
      expect(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      expect(icon.sizes).toBe(`${width}x${height}`);
      expect(icon.type).toBe("image/png");
      realSizes.push(`${width}x${height}`);
    }
    expect(realSizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  });

  it("launches the same application identity within scope with no device orientation lock", () => {
    const app = manifest();
    const site = new URL("https://cinema.example");
    const start = new URL(app.start_url!, site);
    const scope = new URL(app.scope!, site);
    expect(start.origin).toBe(site.origin);
    expect(start.pathname.startsWith(scope.pathname)).toBe(true);
    expect(new URL(app.id!, site).origin).toBe(site.origin);
    expect(app.display).toBe("standalone");
    expect(app.orientation).toBeUndefined();
  });
});

describe("installed launch detection", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("can render on the server without browser globals", () => {
    vi.stubGlobal("window", undefined);
    expect(isStandaloneLaunch()).toBe(false);
  });

  it("recognizes Safari home-screen launches even without a Chromium install prompt", () => {
    vi.stubGlobal("window", {
      navigator: { standalone: true },
      matchMedia: () => ({ matches: false }),
    });
    expect(isStandaloneLaunch()).toBe(true);
  });

  it.each([false, true])("tracks display-mode changes and releases listeners (legacy Safari: %s)", (legacy) => {
    const listeners = new Set<() => void>();
    const query = { matches: false } as MediaQueryList;
    if (legacy) {
      query.addListener = (listener) => { if (listener) listeners.add(listener as () => void); };
      query.removeListener = (listener) => { if (listener) listeners.delete(listener as () => void); };
    } else {
      query.addEventListener = (_event: string, listener: EventListenerOrEventListenerObject | null) => { if (listener) listeners.add(listener as () => void); };
      query.removeEventListener = (_event: string, listener: EventListenerOrEventListenerObject | null) => { if (listener) listeners.delete(listener as () => void); };
    }
    vi.stubGlobal("window", { navigator: {}, matchMedia: () => query });
    const states: boolean[] = [];
    const unsubscribe = subscribeToLaunchMode(() => states.push(isStandaloneLaunch()));
    expect(isStandaloneLaunch()).toBe(false);
    Object.assign(query, { matches: true });
    for (const listener of listeners) listener();
    expect(states).toEqual([true]);
    unsubscribe();
    Object.assign(query, { matches: false });
    for (const listener of listeners) listener();
    expect(states).toEqual([true]);
  });
});
