import { auth, isGoogleConfigured } from "@/auth";
import { listCiphers, removeBorrowedCiphers } from "@/lib/ciphers";
import { listFavorites, type SavedSong } from "@/lib/favorites";
import { isMongoConfigured } from "@/lib/mongo";
import { compareFavorites } from "@/lib/text";
import { ensureUser, userFromSession } from "@/lib/users";

const noStore = { "Cache-Control": "no-store" };

function mergeSongs(favorites: SavedSong[], ciphers: SavedSong[]) {
  const byId = new Map<number, SavedSong>();
  for (const song of favorites) byId.set(song.id, { ...song, ciphered: false });
  for (const song of ciphers) {
    const current = byId.get(song.id);
    byId.set(song.id, current ? { ...current, ciphered: true } : { ...song, ciphered: true });
  }
  return [...byId.values()].sort(compareFavorites);
}

export async function GET() {
  if (!isGoogleConfigured() || !isMongoConfigured()) {
    return Response.json({ ok: true, ready: false, signedIn: false, songs: [] }, { headers: noStore });
  }

  const session = await auth();
  const user = userFromSession(session);
  if (!user) {
    return Response.json({ ok: true, ready: true, signedIn: false, songs: [] }, { headers: noStore });
  }

  try {
    await ensureUser(user);
    const favorites = await listFavorites(user.id);
    await removeBorrowedCiphers(
      user.id,
      favorites.map((song) => song.id),
    );
    const ciphers = await listCiphers(user.id);
    const songs = mergeSongs(favorites, ciphers);
    return Response.json({ ok: true, ready: true, signedIn: true, songs }, { headers: noStore });
  } catch {
    return Response.json({ ok: false, ready: true, signedIn: true, songs: [] }, { headers: noStore });
  }
}
