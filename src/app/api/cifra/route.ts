import { auth, isGoogleConfigured } from "@/auth";
import { readMarks, type CipherMark } from "@/lib/cipher-marks";
import { getCipher, removeCipher, saveCipher, setCipherEnabled } from "@/lib/ciphers";
import { isMongoConfigured } from "@/lib/mongo";
import { readNickname } from "@/lib/nickname";
import { ensureUser, findUserByNickname, userFromSession } from "@/lib/users";
import { type NextRequest } from "next/server";

const noStore = { "Cache-Control": "no-store" };

const empty = {
  ok: true as const,
  showCipher: false,
  signedIn: false,
  exists: false,
  enabled: false,
  marks: [] as CipherMark[],
};

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0 || !isGoogleConfigured()) {
    return Response.json(empty, { headers: noStore });
  }

  const session = await auth();
  const user = userFromSession(session);
  if (!user || !isMongoConfigured()) {
    return Response.json(
      { ...empty, showCipher: true, signedIn: Boolean(user) },
      { headers: noStore },
    );
  }

  const sharedName = readNickname(request.nextUrl.searchParams.get("de"));
  if (request.nextUrl.searchParams.has("de")) {
    if (!sharedName) {
      return Response.json({ ...empty, showCipher: true, signedIn: true, shared: true }, { headers: noStore });
    }
    try {
      const person = await findUserByNickname(sharedName);
      if (!person) {
        return Response.json(
          { ...empty, showCipher: true, signedIn: true, shared: true, nickname: sharedName },
          { headers: noStore },
        );
      }
      const cipher = await getCipher(person.id, id);
      return Response.json(
        {
          ok: true,
          showCipher: true,
          signedIn: true,
          shared: true,
          nickname: person.nickname,
          name: person.name,
          exists: Boolean(cipher),
          enabled: Boolean(cipher),
          marks: cipher?.marks ?? [],
        },
        { headers: noStore },
      );
    } catch {
      return Response.json({ ...empty, showCipher: true, signedIn: true, shared: true }, { headers: noStore });
    }
  }

  try {
    const cipher = await getCipher(user.id, id);
    if (!cipher) {
      return Response.json({ ...empty, showCipher: true, signedIn: true }, { headers: noStore });
    }
    return Response.json(
      {
        ok: true,
        showCipher: true,
        signedIn: true,
        exists: true,
        enabled: cipher.enabled,
        marks: cipher.marks,
      },
      { headers: noStore },
    );
  } catch {
    return Response.json({ ...empty, showCipher: true, signedIn: true }, { headers: noStore });
  }
}

export async function POST(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return Response.json({ ok: false }, { status: 400, headers: noStore });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400, headers: noStore });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ ok: false }, { status: 400, headers: noStore });
  }

  const value = body as Record<string, unknown>;
  const songId = value.songId;
  if (typeof songId !== "number" || !Number.isInteger(songId) || songId <= 0) {
    return Response.json({ ok: false }, { status: 400, headers: noStore });
  }

  const session = await auth();
  const user = userFromSession(session);
  if (!user || !isMongoConfigured()) {
    return Response.json({ ok: false }, { headers: noStore });
  }

  try {
    await ensureUser(user);

    if (value.clear === true) {
      await removeCipher(user.id, songId);
      return Response.json({ ok: true, exists: false, enabled: false, marks: [] }, { headers: noStore });
    }

    if (Array.isArray(value.marks)) {
      const marks = readMarks(value.marks);
      if (!marks || typeof value.lyricHash !== "string" || typeof value.title !== "string" || typeof value.artist !== "string") {
        return Response.json({ ok: false }, { status: 400, headers: noStore });
      }
      if (marks.length === 0) {
        await removeCipher(user.id, songId);
        return Response.json({ ok: true, exists: false, enabled: false, marks: [] }, { headers: noStore });
      }
      const lyricHash = clip(value.lyricHash, 32);
      const title = clip(value.title, 200);
      const artist = clip(value.artist, 200);
      if (!lyricHash || !title) return Response.json({ ok: false }, { status: 400, headers: noStore });
      await saveCipher(user.id, { id: songId, title, artist }, { enabled: true, marks, lyricHash });
      return Response.json({ ok: true, exists: true, enabled: true, marks }, { headers: noStore });
    }

    if (typeof value.enabled === "boolean") {
      const updated = await setCipherEnabled(user.id, songId, value.enabled);
      if (!updated) return Response.json({ ok: false }, { headers: noStore });
      const cipher = await getCipher(user.id, songId);
      return Response.json(
        { ok: true, exists: true, enabled: value.enabled, marks: cipher?.marks ?? [] },
        { headers: noStore },
      );
    }

    return Response.json({ ok: false }, { status: 400, headers: noStore });
  } catch {
    return Response.json({ ok: false }, { headers: noStore });
  }
}
