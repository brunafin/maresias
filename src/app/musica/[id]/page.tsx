import { SongScreen } from "@/components/song-screen";
import { Suspense } from "react";

function SongPending() {
  return (
    <div className="flex h-full items-center px-5">
      <p className="text-3xl leading-snug">Buscando a letra…</p>
    </div>
  );
}

async function SongFromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SongScreen id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<SongPending />}>
      <SongFromParams params={params} />
    </Suspense>
  );
}
