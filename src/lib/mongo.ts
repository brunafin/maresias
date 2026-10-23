import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as unknown as {
  mongoClient?: Promise<MongoClient>;
  mongoReady?: Promise<void>;
};

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
    const client = new MongoClient(uri);
    globalForMongo.mongoClient = client.connect().catch((error: unknown) => {
      globalForMongo.mongoClient = undefined;
      throw error;
    });
  }

  const client = await globalForMongo.mongoClient;
  const db = client.db("maresias");
  if (!globalForMongo.mongoReady) {
    globalForMongo.mongoReady = prepare(db).catch((error: unknown) => {
      globalForMongo.mongoReady = undefined;
      throw error;
    });
  }
  await globalForMongo.mongoReady;
  return db;
}
