import { getLyricsByArtistTitle, getLyricsById } from "@/lib/lyrics";
import { type NextRequest } from "next/server";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const idRaw = request.nextUrl.searchParams.get("id")?.trim() ?? "";
  const artist = request.nextUrl.searchParams.get("artist")?.trim() ?? "";
  const title = request.nextUrl.searchParams.get("title")?.trim() ?? "";

  try {
    if (idRaw) {
      if (!/^\d+$/.test(idRaw)) {
        return Response.json({ ok: false, error: "missing" }, { status: 400, headers: noStore });
      }
      const lyric = await getLyricsById(Number(idRaw));
      if (!lyric) {
        return Response.json({ ok: false, error: "missing" }, { status: 404, headers: noStore });
      }
      return Response.json({ ok: true, ...lyric }, { headers: noStore });
    }

    if (artist && title) {
      const lyric = await getLyricsByArtistTitle(artist, title);
      if (!lyric) {
        return Response.json({ ok: false, error: "missing" }, { status: 404, headers: noStore });
      }
      return Response.json({ ok: true, ...lyric }, { headers: noStore });
    }

    return Response.json({ ok: false, error: "missing" }, { status: 400, headers: noStore });
  } catch {
    return Response.json({ ok: false, error: "unavailable" }, { status: 502, headers: noStore });
  }
}
