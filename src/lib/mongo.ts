import { MongoClient, type Db } from "mongodb";

const CONNECT_MS = 8000;

const globalForMongo = globalThis as unknown as {
  mongoClient?: Promise<MongoClient>;
  mongoReady?: Promise<void>;
  client?: MongoClient;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("O banco demorou demais.")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function dropClient() {
  const hanging = globalForMongo.client;
  globalForMongo.client = undefined;
  globalForMongo.mongoClient = undefined;
  globalForMongo.mongoReady = undefined;
  void hanging?.close().catch(() => undefined);
}

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

async function prepare(db: Db) {
  const names = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name));
  if (!names.has("users")) await db.createCollection("users");
  if (!names.has("favorites")) await db.createCollection("favorites");
  await db.collection("favorites").createIndex({ userId: 1, songId: 1 }, { unique: true });
  await db.collection("favorites").createIndex({ userId: 1, createdAt: -1 });
  await db.collection("users").createIndex(
    { email: 1 },
    { unique: true, partialFilterExpression: { email: { $type: "string" } } },
  );
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("O banco ainda não está ligado.");

  if (!globalForMongo.mongoClient) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: CONNECT_MS,
      connectTimeoutMS: CONNECT_MS,
      family: 4,
    });
    globalForMongo.client = client;
    globalForMongo.mongoClient = client.connect().catch((error: unknown) => {
      dropClient();
      throw error;
    });
  }

  try {
    const client = await withTimeout(globalForMongo.mongoClient, CONNECT_MS + 1000);
    const db = client.db("maresias");
    if (!globalForMongo.mongoReady) {
      globalForMongo.mongoReady = prepare(db).catch((error: unknown) => {
        globalForMongo.mongoReady = undefined;
        throw error;
      });
    }
    await withTimeout(globalForMongo.mongoReady, CONNECT_MS);
    return db;
  } catch (error) {
    dropClient();
    throw error;
  }
}
