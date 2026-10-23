import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, limit: number, duration: Duration) {
  if (!redis) return null;
  const key = `${name}:${limit}:${duration}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, duration),
      prefix: "incorz:edge",
      analytics: false,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

function key(value: string) {
  return value.replace(/[^a-zA-Z0-9:._-]/g, "_").slice(0, 160);
}

export function hasEdgeSecurityStore() {
  return Boolean(redis);
}

export async function isBlocked(ip: string) {
  return redis ? Boolean(await redis.get(`blocked:${key(ip)}`)) : false;
}

export async function blockIp(ip: string, seconds: number) {
  if (!redis) return;
  await redis.set(`blocked:${key(ip)}`, "1", { ex: seconds });
}

export async function checkEdgeTraffic(ip: string, suspicious: boolean) {
  if (!redis) return { allowed: true, blocked: false, retryAfter: 0 };

  if (await isBlocked(ip)) return { allowed: false, blocked: true, retryAfter: 600 };

  const [burst, sustained] = await Promise.all([
    getLimiter("burst", 40, "10 s")?.limit(ip),
    getLimiter("sustained", 180, "1 m")?.limit(ip),
  ]);

  const suspiciousResult = suspicious
    ? await getLimiter("suspicious", 5, "5 m")?.limit(ip)
    : null;
  const overLimit = burst ? !burst.success : false;
  const overSustained = sustained ? !sustained.success : false;
  const suspiciousAttack = suspiciousResult ? !suspiciousResult.success : false;

  if (suspiciousAttack || overLimit) {
    await blockIp(ip, suspiciousAttack ? 900 : 300);
    return { allowed: false, blocked: true, retryAfter: suspiciousAttack ? 900 : 300 };
  }

  if (overSustained) return { allowed: false, blocked: false, retryAfter: 60 };
  return { allowed: true, blocked: false, retryAfter: 0 };
}
