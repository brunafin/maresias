"use client";

import { FavoriteSongs } from "@/components/favorite-songs";
import { RecentSongs } from "@/components/recent-songs";
import { SavedSongs } from "@/components/saved-songs";
import type { SavedSong } from "@/lib/favorites";
import { compareFavorites } from "@/lib/text";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Library =
  | { status: "loading" }
  | { status: "off" }
  | { status: "signedOut" }
  | { status: "error" }
  | { status: "ready"; songs: SavedSong[] };

function useFavoriteLibrary(): Library {
  const [state, setState] = useState<Library>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12000);
    let cancelled = false;

    fetch("/api/favoritas", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as {
          ok?: boolean;
          ready?: boolean;
          signedIn?: boolean;
          songs?: SavedSong[];
        };
        if (cancelled) return;
        if (!response.ok || !body.ok) {
          setState({ status: "error" });
          return;
        }
        if (!body.ready) {
          setState({ status: "off" });
          return;
        }
        if (!body.signedIn) {
          setState({ status: "signedOut" });
          return;
        }
        setState({ status: "ready", songs: body.songs ?? [] });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "error" });
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return state;
}

export function HomeLibrary() {
  const state = useFavoriteLibrary();
  if (state.status === "loading") return <p className="text-2xl leading-snug">Abrindo…</p>;
  if (state.status === "error") return <SavedSongs songs={[]} unavailable />;
  if (state.status === "ready" && state.songs.length > 0) {
    return <SavedSongs songs={[...state.songs].sort(compareFavorites).slice(0, 5)} showAll />;
  }
  return <RecentSongs />;
}

export function FavoriteList() {
  const router = useRouter();
  const state = useFavoriteLibrary();

  useEffect(() => {
    if (state.status === "off") router.replace("/");
    if (state.status === "signedOut") router.replace("/entrar");
  }, [router, state.status]);

  if (state.status === "error") {
    return <p className="text-2xl leading-snug">Não conseguimos abrir as favoritas agora.</p>;
  }
  if (state.status === "ready") {
    if (state.songs.length === 0) return <p className="text-2xl leading-snug">Nenhuma favorita ainda.</p>;
    return <FavoriteSongs songs={state.songs} />;
  }
  return <p className="text-2xl leading-snug">Abrindo as favoritas…</p>;
}
