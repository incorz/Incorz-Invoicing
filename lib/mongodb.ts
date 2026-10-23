import { MongoClient } from "mongodb";

// Reuse connection across hot-reloads and warm serverless invocations
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: Promise<MongoClient> | undefined;
}

// Env vars are read lazily so importing this module during `next build`
// (page data collection) never throws when they are absent.
function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI environment variable");

  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri).connect().catch((err) => {
      global._mongoClient = undefined;
      throw err;
    });
  }
  return global._mongoClient;
}

export async function getDb() {
  const dbName = process.env.MONGODB_DB;
  if (!dbName) throw new Error("Missing MONGODB_DB environment variable");

  const client = await getClientPromise();
  return client.db(dbName);
}
