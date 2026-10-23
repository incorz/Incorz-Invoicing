import { MongoClient } from "mongodb";

// Reuse connection across hot-reloads and warm serverless invocations
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: Promise<MongoClient> | undefined;
}

// Env vars are read lazily so importing this module during `next build`
// (page data collection) never throws when they are absent.
// Tolerate values pasted as a full `KEY=value` line or wrapped in quotes.
function normalizeEnvValue(key: string, raw: string | undefined): string | undefined {
  if (!raw) return raw;
  let value = raw.trim();
  if (value.startsWith(`${key}=`)) value = value.slice(key.length + 1).trim();
  value = value.replace(/^["']|["']$/g, "");
  return value;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = normalizeEnvValue("MONGODB_URI", process.env.MONGODB_URI);
  if (!uri) throw new Error("Missing MONGODB_URI environment variable");
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error(
      'Invalid MONGODB_URI: the value must start with "mongodb://" or "mongodb+srv://" (do not include "MONGODB_URI=" in the value)',
    );
  }

  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri).connect().catch((err) => {
      global._mongoClient = undefined;
      throw err;
    });
  }
  return global._mongoClient;
}

export async function getDb() {
  const dbName = normalizeEnvValue("MONGODB_DB", process.env.MONGODB_DB);
  if (!dbName) throw new Error("Missing MONGODB_DB environment variable");

  const client = await getClientPromise();
  return client.db(dbName);
}
