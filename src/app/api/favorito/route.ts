import { auth, isGoogleConfigured } from "@/auth";
import { isFavorite } from "@/lib/favorites";
import { isMongoConfigured } from "@/lib/mongo";
import { userFromSession } from "@/lib/users";
import { type NextRequest } from "next/server";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0 || !isGoogleConfigured()) {
    return Response.json({ ok: true, showSave: false, signedIn: false, saved: false }, { headers: noStore });
  }

  const session = await auth();
  const user = userFromSession(session);
  if (!user || !isMongoConfigured()) {
    return Response.json({ ok: true, showSave: true, signedIn: Boolean(user), saved: false }, { headers: noStore });
  }

  try {
    const saved = await isFavorite(user.id, id);
    return Response.json({ ok: true, showSave: true, signedIn: true, saved }, { headers: noStore });
  } catch {
    return Response.json({ ok: true, showSave: true, signedIn: true, saved: false }, { headers: noStore });
  }
}
