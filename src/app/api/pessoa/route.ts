import { auth, isGoogleConfigured } from "@/auth";
import { listCiphers } from "@/lib/ciphers";
import { listFavorites } from "@/lib/favorites";
import { isMongoConfigured } from "@/lib/mongo";
import { readNickname } from "@/lib/nickname";
import { ensureUser, findUserByNickname, userFromSession } from "@/lib/users";
import { type NextRequest } from "next/server";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  if (!isGoogleConfigured() || !isMongoConfigured()) {
    return Response.json({ ok: true, ready: false, signedIn: false }, { headers: noStore });
  }

  const session = await auth();
  const user = userFromSession(session);
  if (!user) {
    return Response.json({ ok: true, ready: true, signedIn: false }, { headers: noStore });
  }

  try {
    const mine = await ensureUser(user);
    const raw = request.nextUrl.searchParams.get("q");
    if (!raw?.trim()) {
      return Response.json({ ok: true, ready: true, signedIn: true, mine: mine.nickname }, { headers: noStore });
    }
    const nickname = readNickname(raw);
    if (!nickname) {
      return Response.json(
        { ok: true, ready: true, signedIn: true, mine: mine.nickname, found: false, invalid: true },
        { headers: noStore },
      );
    }
    const person = await findUserByNickname(nickname);
    if (!person) {
      return Response.json(
        { ok: true, ready: true, signedIn: true, mine: mine.nickname, found: false },
        { headers: noStore },
      );
    }
    const [favorites, ciphers] = await Promise.all([listFavorites(person.id), listCiphers(person.id)]);
    const ciphered = new Set(ciphers.map((song) => song.id));
    return Response.json(
      {
        ok: true,
        ready: true,
        signedIn: true,
        mine: mine.nickname,
        found: true,
        self: person.id === user.id,
        nickname: person.nickname,
        name: person.name,
        favorites: favorites.map((song) => ({ ...song, ciphered: ciphered.has(song.id) })),
        ciphers,
      },
      { headers: noStore },
    );
  } catch {
    return Response.json({ ok: false, ready: true, signedIn: true }, { headers: noStore });
  }
}
