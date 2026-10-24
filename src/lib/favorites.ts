import { getDb } from "@/lib/mongo";
import { compareFavorites } from "@/lib/text";

export type SavedSong = {
  id: number;
  title: string;
  artist: string;
  ciphered?: boolean;
};

type FavoriteDoc = {
  userId: string;
  songId: number;
  title: string;
  artist: string;
  createdAt: Date;
};

export async function countFavorites(userId: string): Promise<number> {
  const db = await getDb();
  return db.collection<FavoriteDoc>("favorites").countDocuments({ userId });
}

export async function listFavorites(userId: string, limit?: number): Promise<SavedSong[]> {
  const db = await getDb();
  const found = db
    .collection<FavoriteDoc>("favorites")
    .find({ userId }, { projection: { songId: 1, title: 1, artist: 1 } })
    .collation({ locale: "pt", strength: 1, numericOrdering: true })
    .sort({ title: 1, artist: 1 });
  const docs = await (limit ? found.limit(limit) : found).toArray();
  return docs.map((doc) => ({ id: doc.songId, title: doc.title, artist: doc.artist })).sort(compareFavorites);
}

export async function isFavorite(userId: string, songId: number): Promise<boolean> {
  const db = await getDb();
  const found = await db.collection<FavoriteDoc>("favorites").findOne({ userId, songId }, { projection: { _id: 1 } });
  return Boolean(found);
}

export async function saveFavorite(userId: string, song: SavedSong) {
  const db = await getDb();
  const now = new Date();
  await db.collection<FavoriteDoc>("favorites").updateOne(
    { userId, songId: song.id },
    {
      $set: { title: song.title, artist: song.artist },
      $setOnInsert: { userId, songId: song.id, createdAt: now },
    },
    { upsert: true },
  );
}

export async function removeFavorite(userId: string, songId: number) {
  const db = await getDb();
  await db.collection<FavoriteDoc>("favorites").deleteOne({ userId, songId });
}

export async function reassignFavorites(fromIds: string[], toId: string) {
  if (!fromIds.length || fromIds.every((id) => id === toId)) return;
  const db = await getDb();
  const favorites = db.collection<FavoriteDoc>("favorites");
  const docs = await favorites.find({ userId: { $in: fromIds } }).toArray();
  for (const doc of docs) {
    await favorites.updateOne(
      { userId: toId, songId: doc.songId },
      {
        $setOnInsert: {
          userId: toId,
          songId: doc.songId,
          title: doc.title,
          artist: doc.artist,
          createdAt: doc.createdAt,
        },
      },
      { upsert: true },
    );
  }
  await favorites.deleteMany({ userId: { $in: fromIds } });
}
