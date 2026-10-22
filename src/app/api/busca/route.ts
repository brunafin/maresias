import { searchSongs } from "@/lib/lyrics";
import { type NextRequest } from "next/server";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ ok: true, results: [] }, { headers: noStore });
  }
  try {
    const results = await searchSongs(q);
    return Response.json({ ok: true, results }, { headers: noStore });
  } catch {
    return Response.json({ ok: false, error: "unavailable" }, { status: 502, headers: noStore });
  }
}
