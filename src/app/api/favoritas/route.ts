import { auth, isGoogleConfigured } from "@/auth";
import { listFavorites } from "@/lib/favorites";
import { isMongoConfigured } from "@/lib/mongo";
import { ensureUser, userFromSession } from "@/lib/users";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  if (!isGoogleConfigured() || !isMongoConfigured()) {
    return Response.json({ ok: true, ready: false, signedIn: false, songs: [] }, { headers: noStore });
  }

  const session = await auth();
  const user = userFromSession(session);
  if (!user) {
    return Response.json({ ok: true, ready: true, signedIn: false, songs: [] }, { headers: noStore });
  }

  try {
    await ensureUser(user);
    const songs = await listFavorites(user.id);
    return Response.json({ ok: true, ready: true, signedIn: true, songs }, { headers: noStore });
  } catch {
    return Response.json({ ok: false, ready: true, signedIn: true, songs: [] }, { headers: noStore });
  }
}
