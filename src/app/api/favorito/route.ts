import { auth, isGoogleConfigured } from "@/auth";
import { removeBorrowedCipher } from "@/lib/ciphers";
import { isFavorite, removeFavorite, saveFavorite } from "@/lib/favorites";
import { isMongoConfigured } from "@/lib/mongo";
import { ensureUser, userFromSession } from "@/lib/users";
import { type NextRequest } from "next/server";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0 || !isGoogleConfigured()) {
    return Response.json({ ok: true, showSave: false, signedIn: false, saved: false }, { headers: noStore });
  }

  const session = await auth();
  const user = userFromSession(session);
  if (!user || !isMongoConfigured()) {
    return Response.json({ ok: true, showSave: true, signedIn: Boolean(user), saved: false }, { headers: noStore });
  }

  try {
    const saved = await isFavorite(user.id, id);
    return Response.json({ ok: true, showSave: true, signedIn: true, saved }, { headers: noStore });
  } catch {
    return Response.json({ ok: true, showSave: true, signedIn: true, saved: false }, { headers: noStore });
  }
}

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return Response.json({ ok: false, signedIn: false, saved: false }, { headers: noStore });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, signedIn: false, saved: false }, { status: 400, headers: noStore });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false, signedIn: false, saved: false }, { status: 400, headers: noStore });
  }
  const value = body as Record<string, unknown>;
  const songId = value.songId;
  const save = value.save;
  if (typeof songId !== "number" || !Number.isInteger(songId) || songId <= 0 || typeof save !== "boolean") {
    return Response.json({ ok: false, signedIn: false, saved: false }, { status: 400, headers: noStore });
  }
  if (typeof value.title !== "string" || typeof value.artist !== "string") {
    return Response.json({ ok: false, signedIn: false, saved: false }, { status: 400, headers: noStore });
  }
  const title = clip(value.title, 200);
  const artist = clip(value.artist, 200);
  if (save && !title) {
    return Response.json({ ok: false, signedIn: false, saved: false }, { status: 400, headers: noStore });
  }

  const session = await auth();
  const user = userFromSession(session);
  if (!user || !isMongoConfigured()) {
    return Response.json({ ok: false, signedIn: Boolean(user), saved: false }, { headers: noStore });
  }

  try {
    await ensureUser(user);
    if (save) {
      await saveFavorite(user.id, { id: songId, title, artist });
      return Response.json({ ok: true, signedIn: true, saved: true }, { headers: noStore });
    }
    await removeFavorite(user.id, songId);
    const released = await removeBorrowedCipher(user.id, songId);
    return Response.json({ ok: true, signedIn: true, saved: false, released }, { headers: noStore });
  } catch {
    return Response.json({ ok: false, signedIn: true, saved: false }, { headers: noStore });
  }
}
