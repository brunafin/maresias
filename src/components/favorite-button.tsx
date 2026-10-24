"use client";

import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useState } from "react";

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
  onReleased,
}: {
  songId: number;
  title: string;
  artist: string;
  initialSaved: boolean;
  signedIn: boolean;
  ready: boolean;
  onReleased?: () => void;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  if (!signedIn) return null;

  async function toggle() {
    const next = !saved;
    setNote("");
    setPending(true);
    try {
      const response = await fetch("/api/favorito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ songId, title, artist, save: next }),
      });
      const result = (await response.json()) as { ok?: boolean; saved?: boolean; released?: boolean };
      if (!response.ok || !result.ok) {
        setNote(next ? "Não conseguimos guardar agora." : "Não conseguimos tirar agora.");
        return;
      }
      setSaved(Boolean(result.saved));
      if (result.released) onReleased?.();
    } catch {
      setNote(next ? "Não conseguimos guardar agora." : "Não conseguimos tirar agora.");
    } finally {
      setPending(false);
    }
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
