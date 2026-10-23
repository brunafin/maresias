import { reassignCiphers } from "@/lib/ciphers";
import { reassignFavorites } from "@/lib/favorites";
import { getDb } from "@/lib/mongo";
import type { Session } from "next-auth";

export type SavedUser = {
  id: string;
  email: string | null;
  name: string | null;
  givenName: string | null;
  image: string | null;
};

type UserDoc = SavedUser & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

function clip(value: string | null, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function userFromSession(session: Session | null): SavedUser | null {
  const person = session?.user;
  const id = person?.id?.trim();
  if (!person || !id) return null;
  return {
    id,
    email: person.email ?? null,
    name: person.name ?? null,
    givenName: person.givenName ?? null,
    image: person.image ?? null,
  };
}

export async function ensureUser(user: SavedUser) {
  const db = await getDb();
  const users = db.collection<UserDoc>("users");
  const now = new Date();
  const email = clip(user.email, 200)?.toLowerCase() ?? null;
  const next: Omit<UserDoc, "_id" | "createdAt"> = {
    id: user.id,
    email,
    name: clip(user.name, 200),
    givenName: clip(user.givenName, 80),
    image: clip(user.image, 500),
    updatedAt: now,
  };

  const others = email ? await users.find({ email, _id: { $ne: user.id } }).toArray() : [];
  const current = await users.findOne({ _id: user.id }, { projection: { createdAt: 1 } });
  const createdAt = earliest(current?.createdAt, ...others.map((doc) => doc.createdAt)) ?? now;

  if (others.length) {
    const previousIds = others.map((doc) => doc._id);
    await reassignFavorites(previousIds, user.id);
    await reassignCiphers(previousIds, user.id);
    await users.deleteMany({ _id: { $in: others.map((doc) => doc._id) } });
  }

  await users.updateOne(
    { _id: user.id },
    current ? { $set: { ...next, createdAt } } : { $set: next, $setOnInsert: { createdAt } },
    { upsert: true },
  );
}

function earliest(...dates: Array<Date | undefined>) {
  let oldest: Date | undefined;
  for (const date of dates) {
    if (!date) continue;
    if (!oldest || date < oldest) oldest = date;
  }
  return oldest;
}
