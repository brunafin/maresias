import { type CipherMark } from "@/lib/cipher-marks";
import { getDb } from "@/lib/mongo";

export type StoredCipher = {
  userId: string;
  songId: number;
  title: string;
  artist: string;
  enabled: boolean;
  marks: CipherMark[];
  lyricHash: string;
  createdAt: Date;
  updatedAt: Date;
};

type CipherDoc = StoredCipher;

export async function getCipher(userId: string, songId: number): Promise<StoredCipher | null> {
  const db = await getDb();
  return db.collection<CipherDoc>("ciphers").findOne({ userId, songId }, { projection: { _id: 0 } });
}

export async function saveCipher(
  userId: string,
  song: { id: number; title: string; artist: string },
  input: { enabled: boolean; marks: CipherMark[]; lyricHash: string },
) {
  const db = await getDb();
  const now = new Date();
  await db.collection<CipherDoc>("ciphers").updateOne(
    { userId, songId: song.id },
    {
      $set: {
        title: song.title,
        artist: song.artist,
        enabled: input.enabled,
        marks: input.marks,
        lyricHash: input.lyricHash,
        updatedAt: now,
      },
      $setOnInsert: { userId, songId: song.id, createdAt: now },
    },
    { upsert: true },
  );
}

export async function setCipherEnabled(userId: string, songId: number, enabled: boolean) {
  const db = await getDb();
  const updated = await db.collection<CipherDoc>("ciphers").updateOne(
    { userId, songId },
    { $set: { enabled, updatedAt: new Date() } },
  );
  return updated.matchedCount > 0;
}

export async function removeCipher(userId: string, songId: number) {
  const db = await getDb();
  await db.collection<CipherDoc>("ciphers").deleteOne({ userId, songId });
}

export async function reassignCiphers(fromIds: string[], toId: string) {
  if (!fromIds.length || fromIds.every((id) => id === toId)) return;
  const db = await getDb();
  const ciphers = db.collection<CipherDoc>("ciphers");
  const docs = await ciphers.find({ userId: { $in: fromIds } }).toArray();
  for (const doc of docs) {
    await ciphers.updateOne(
      { userId: toId, songId: doc.songId },
      {
        $setOnInsert: {
          userId: toId,
          songId: doc.songId,
          title: doc.title,
          artist: doc.artist,
          enabled: doc.enabled,
          marks: doc.marks,
          lyricHash: doc.lyricHash,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
      { upsert: true },
    );
  }
  await ciphers.deleteMany({ userId: { $in: fromIds } });
}
