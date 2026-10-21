import crypto from "node:crypto";
import type { Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";

const RATE_LIMIT_COLLECTION = "security_rate_limits";

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type RateLimitRecord = {
  _id: string;
  count: number;
  windowStartedAt: Date;
  expiresAt: Date;
};

function hashKey(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return candidate.slice(0, 100);
}

async function getRateLimitCollection(): Promise<Collection<RateLimitRecord>> {
  const db = await getDb();
  return db.collection(RATE_LIMIT_COLLECTION);
}

export async function consumeRateLimit(
  request: Request,
  scope: string,
  subject: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const key = hashKey(`${scope}:${getClientIp(request)}:${subject.toLowerCase()}`);
  const collection = await getRateLimitCollection();
  const result = await collection.findOneAndUpdate(
    { _id: key },
    {
      $inc: { count: 1 },
      $setOnInsert: { windowStartedAt: new Date(now), expiresAt: new Date(now + windowMs) },
    },
    { upsert: true, returnDocument: "after" },
  );

  const record = result;
  const windowStartedAt = record?.windowStartedAt instanceof Date ? record.windowStartedAt.getTime() : now;
  const expiresAt = record?.expiresAt instanceof Date ? record.expiresAt.getTime() : now + windowMs;

  if (now - windowStartedAt >= windowMs) {
    await collection.replaceOne(
      { _id: key },
      { count: 1, windowStartedAt: new Date(now), expiresAt: new Date(now + windowMs) },
      { upsert: true },
    );
    return { allowed: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  const count = typeof record?.count === "number" ? record.count : limit + 1;
  return {
    allowed: count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - now) / 1000)),
  };
}

export function getClientIdentifier(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown").slice(0, 100);
}

export async function ensureRateLimitIndexes() {
  const collection = await getRateLimitCollection();
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
