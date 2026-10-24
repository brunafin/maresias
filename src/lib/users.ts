import { reassignCiphers } from "@/lib/ciphers";
import { reassignFavorites } from "@/lib/favorites";
import { getDb } from "@/lib/mongo";
import { isNickname, nicknameStem } from "@/lib/nickname";
import type { Session } from "next-auth";
import type { Collection, Db } from "mongodb";

export type SavedUser = {
  id: string;
  email: string | null;
  name: string | null;
  givenName: string | null;
  image: string | null;
};

type UserDoc = SavedUser & {
  _id: string;
  nickname?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicPerson = {
  id: string;
  nickname: string;
  name: string | null;
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

export function displayName(user: { givenName: string | null; name: string | null }): string | null {
  const given = user.givenName?.trim();
  if (given) return given.split(/\s+/)[0] || null;
  const name = user.name?.trim();
  if (!name) return null;
  return name.split(/\s+/)[0] || null;
}

export async function ensureUser(user: SavedUser): Promise<{ nickname: string }> {
  const db = await getDb();
  const users = db.collection<UserDoc>("users");
  const now = new Date();
  const email = clip(user.email, 200)?.toLowerCase() ?? null;
  const givenName = clip(user.givenName, 80);
  const name = clip(user.name, 200);
  const next: Omit<UserDoc, "_id" | "createdAt" | "nickname"> = {
    id: user.id,
    email,
    name,
    givenName,
    image: clip(user.image, 500),
    updatedAt: now,
  };

  const others = email ? await users.find({ email, _id: { $ne: user.id } }).toArray() : [];
  const current = await users.findOne({ _id: user.id });
  const createdAt = earliest(current?.createdAt, ...others.map((doc) => doc.createdAt)) ?? now;
  const kept = keptNickname(current, others);

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

  if (current?.nickname && isNickname(current.nickname)) return { nickname: current.nickname };

  if (kept) {
    const saved = await tryAssign(users, user.id, kept);
    if (saved) return { nickname: saved };
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const nickname = await claimNickname(db, givenName, name);
    const saved = await tryAssign(users, user.id, nickname);
    if (saved) return { nickname: saved };
  }
  throw new Error("Não conseguimos criar o apelido.");
}

export async function findUserById(id: string): Promise<PublicPerson | null> {
  const userId = id.trim();
  if (!userId) return null;
  const db = await getDb();
  const doc = await db.collection<UserDoc>("users").findOne(
    { _id: userId },
    { projection: { _id: 1, givenName: 1, name: 1, nickname: 1 } },
  );
  if (!doc?.nickname || !isNickname(doc.nickname)) return null;
  return { id: doc._id, nickname: doc.nickname, name: displayName(doc) };
}

export async function findUserByNickname(nickname: string): Promise<PublicPerson | null> {
  if (!isNickname(nickname)) return null;
  const db = await getDb();
  const doc = await db.collection<UserDoc>("users").findOne(
    { nickname },
    { projection: { _id: 1, givenName: 1, name: 1, nickname: 1 } },
  );
  if (!doc?.nickname || !isNickname(doc.nickname)) return null;
  return { id: doc._id, nickname: doc.nickname, name: displayName(doc) };
}

function keptNickname(current: UserDoc | null, others: UserDoc[]): string | null {
  if (current?.nickname && isNickname(current.nickname)) return current.nickname;
  const ordered = [...others].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const doc of ordered) {
    if (doc.nickname && isNickname(doc.nickname)) return doc.nickname;
  }
  return null;
}

async function claimNickname(db: Db, givenName: string | null, name: string | null): Promise<string> {
  const stem = nicknameStem(givenName, name);
  const counters = db.collection<{ _id: string; seq: number }>("counters");
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const doc = await counters.findOneAndUpdate(
        { _id: `nickname:${stem}` },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: "after" },
      );
      if (!doc?.seq) continue;
      return `${stem}${String(doc.seq).padStart(4, "0")}`;
    } catch (error) {
      if (isDuplicateKey(error) && attempt < 4) continue;
      throw error;
    }
  }
  throw new Error("Não conseguimos criar o apelido.");
}

async function tryAssign(users: Collection<UserDoc>, id: string, nickname: string): Promise<string | null> {
  try {
    const result = await users.updateOne(
      {
        _id: id,
        nickname: { $not: { $regex: "^[a-z]{1,3}\\d{4,8}$" } },
      },
      { $set: { nickname } },
    );
    if (result.matchedCount === 1) return nickname;
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
  }
  const raced = await users.findOne({ _id: id }, { projection: { nickname: 1 } });
  if (raced?.nickname && isNickname(raced.nickname)) return raced.nickname;
  return null;
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === 11000;
}

function earliest(...dates: Array<Date | undefined>) {
  let oldest: Date | undefined;
  for (const date of dates) {
    if (!date) continue;
    if (!oldest || date < oldest) oldest = date;
  }
  return oldest;
}
