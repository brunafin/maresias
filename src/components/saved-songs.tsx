import { CipherBadge } from "@/components/cipher-badge";
import { presentArtist } from "@/lib/text";
import type { SavedSong } from "@/lib/favorites";
import Link from "next/link";

const songLinkClass =
  "flex min-h-20 items-center gap-4 rounded-2xl border-[3px] border-foreground bg-card px-5 py-4 text-foreground no-underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground active:translate-y-px";

const moreClass =
  "mt-4 flex min-h-16 items-center justify-center rounded-2xl border-[3px] border-foreground px-4 text-xl font-bold text-foreground no-underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground active:translate-y-px";

export function SavedSongs({
  songs,
  unavailable,
  showAll,
}: {
  songs: SavedSong[];
  unavailable?: boolean;
  showAll?: boolean;
}) {
  if (!unavailable && songs.length === 0) return null;

  return (
    <section aria-labelledby="favoritas">
      <h2 id="favoritas" className="text-3xl font-bold">
        Favoritas
      </h2>
      {unavailable ? (
        <p className="mt-4 text-2xl leading-snug">Não conseguimos abrir as favoritas agora.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {songs.map((song) => (
            <li key={song.id}>
              <Link href={`/musica/${song.id}`} className={songLinkClass}>
                <span className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="text-2xl font-bold leading-tight">{song.title}</span>
                  {song.artist ? <span className="mt-1 text-xl leading-snug">{presentArtist(song.artist)}</span> : null}
                </span>
                {song.ciphered ? <CipherBadge /> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {showAll ? (
        <Link href="/favoritas" className={moreClass}>
          Ver todas
        </Link>
      ) : null}
    </section>
  );
}
