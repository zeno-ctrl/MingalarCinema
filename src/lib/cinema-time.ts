/** Cinema schedules are always shown in Myanmar time, on every device. */
export const CINEMA_TIME_ZONE = "Asia/Yangon";

export function cinemaDate(offsetDays = 0, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CINEMA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  const date = new Date(`${get("year")}-${get("month")}-${get("day")}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function cinemaDayRange(date: string) {
  return {
    start: new Date(`${date}T00:00:00+06:30`),
    end: new Date(`${date}T23:59:59.999+06:30`),
  };
}
