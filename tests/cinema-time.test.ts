import { describe, expect, it } from "vitest";
import { cinemaDate, cinemaDayRange } from "@/lib/cinema-time";

describe("Myanmar cinema schedules", () => {
  it("switches to tomorrow at Myanmar midnight rather than UTC midnight", () => {
    expect(cinemaDate(0, new Date("2026-10-15T17:29:59Z"))).toBe("2026-10-15");
    expect(cinemaDate(0, new Date("2026-10-15T17:30:00Z"))).toBe("2026-10-16");
  });

  it("keeps the date selector consecutive over month and year boundaries", () => {
    expect(cinemaDate(1, new Date("2026-12-31T12:00:00Z"))).toBe("2027-01-01");
    expect(cinemaDate(1, new Date("2028-02-28T12:00:00Z"))).toBe("2028-02-29");
  });

  it("queries the complete selected Myanmar day regardless of the server timezone", () => {
    const range = cinemaDayRange("2026-10-16");
    expect(range.start.toISOString()).toBe("2026-10-15T17:30:00.000Z");
    expect(range.end.toISOString()).toBe("2026-10-16T17:29:59.999Z");
  });
});
