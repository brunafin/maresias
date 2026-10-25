import { SongScreen } from "@/components/song-screen";
import { readNickname } from "@/lib/nickname";
import { Suspense } from "react";

function SongPending() {
  return (
    <main className="flex h-full items-center px-5">
      <p className="text-3xl leading-snug">Buscando a letra…</p>
    </main>
  );
}

async function SongFromParams({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ de?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const raw = Array.isArray(query.de) ? query.de[0] : query.de;
  return <SongScreen id={id} from={readNickname(raw)} />;
}

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ de?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<SongPending />}>
      <SongFromParams params={params} searchParams={searchParams} />
    </Suspense>
  );
}
