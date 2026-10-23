"use client";

import { setFavorite } from "@/app/musica/actions";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

const heartButtonClass =
  "size-12 shrink-0 rounded-xl bg-transparent p-0 shadow-none hover:bg-transparent focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground";

function HeartIcon({ saved }: { saved: boolean }) {
  return (
    <Heart
      className={saved ? "size-7 fill-red-600 text-red-600" : "size-7 fill-none text-foreground"}
      strokeWidth={2.25}
      aria-hidden="true"
    />
  );
}

export function FavoriteButton({
  songId,
  title,
  artist,
  initialSaved,
  signedIn,
  ready,
}: {
  songId: number;
  title: string;
  artist: string;
  initialSaved: boolean;
  signedIn: boolean;
  ready: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <Button
        nativeButton={false}
        render={<Link href="/entrar" />}
        variant="ghost"
        size="icon"
        aria-label="Entre para guardar esta música"
        className={heartButtonClass}
      >
        <HeartIcon saved={false} />
      </Button>
    );
  }

  function toggle() {
    const next = !saved;
    setNote("");
    startTransition(async () => {
      const result = await setFavorite({ songId, title, artist, save: next });
      if (!result.ok) {
        setNote(next ? "Não conseguimos guardar agora." : "Não conseguimos tirar agora.");
        return;
      }
      setSaved(result.saved);
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={saved}
      aria-label={saved ? "Tirar das guardadas" : "Guardar esta música"}
      className={heartButtonClass}
      disabled={pending || (!saved && !ready)}
      onClick={toggle}
    >
      <HeartIcon saved={saved} />
      <span className="sr-only" aria-live="polite">
        {note}
      </span>
    </Button>
  );
}
