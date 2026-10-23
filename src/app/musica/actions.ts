"use server";

import { auth } from "@/auth";
import { removeFavorite, saveFavorite } from "@/lib/favorites";
import { ensureUser, userFromSession } from "@/lib/users";
import { revalidatePath } from "next/cache";

type FavoriteInput = {
  songId: number;
  title: string;
  artist: string;
  save: boolean;
};

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

function readInput(input: unknown): FavoriteInput | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const songId = value.songId;
  const save = value.save;
  if (typeof songId !== "number" || !Number.isInteger(songId) || songId <= 0) return null;
  if (typeof save !== "boolean") return null;
  if (typeof value.title !== "string" || typeof value.artist !== "string") return null;
  const title = clip(value.title, 200);
  const artist = clip(value.artist, 200);
  if (save && !title) return null;
  return { songId, title, artist, save };
}

export async function setFavorite(input: unknown): Promise<{ ok: true; saved: boolean } | { ok: false }> {
  const favorite = readInput(input);
  if (!favorite) return { ok: false };

  const session = await auth();
  const user = userFromSession(session);
  if (!user) return { ok: false };

  try {
    await ensureUser(user);
    if (favorite.save) {
      await saveFavorite(user.id, { id: favorite.songId, title: favorite.title, artist: favorite.artist });
    } else {
      await removeFavorite(user.id, favorite.songId);
    }
  } catch {
    return { ok: false };
  }

  revalidatePath("/");
  revalidatePath(`/musica/${favorite.songId}`);
  return { ok: true, saved: favorite.save };
}
