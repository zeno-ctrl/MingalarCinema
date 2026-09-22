/**
 * Fixed-window rate limiter. Uses Upstash Redis (REST API, no SDK dependency)
 * when configured so limits are shared across serverless instances; falls
 * back to an in-memory window for local development.
 */

type LimitResult = { success: boolean; remaining: number; resetMs: number };

const memoryStore = new Map<string, { count: number; resetAt: number }>();

async function limitInMemory(key: string, limit: number, windowMs: number): Promise<LimitResult> {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetMs: windowMs };
  }
  entry.count += 1;
  const success = entry.count <= limit;
  return { success, remaining: Math.max(0, limit - entry.count), resetMs: entry.resetAt - now };
}

async function limitUpstash(
  key: string,
  limit: number,
  windowMs: number,
  url: string,
  token: string,
): Promise<LimitResult> {
  const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / windowMs)}`;
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", windowKey],
      ["PEXPIRE", windowKey, windowMs.toString()],
    ]),
    cache: "no-store",
  });
  if (!res.ok) {
    // Fail open to in-memory so a Redis outage doesn't take down auth entirely,
    // but log so it's visible in server logs.
    console.error("[rate-limit] Upstash request failed, falling back to memory");
    return limitInMemory(key, limit, windowMs);
  }
  const data = (await res.json()) as Array<{ result: number }>;
  const count = data[0]?.result ?? 1;
  return { success: count <= limit, remaining: Math.max(0, limit - count), resetMs: windowMs };
}

export async function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): Promise<LimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return limitUpstash(key, limit, windowMs, url, token);
  }
  return limitInMemory(key, limit, windowMs);
}

export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 60_000 },
  signup: { limit: 5, windowMs: 60_000 * 10 },
  passwordReset: { limit: 3, windowMs: 60_000 * 10 },
  otp: { limit: 5, windowMs: 60_000 * 5 },
  payment: { limit: 10, windowMs: 60_000 },
} as const;

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
