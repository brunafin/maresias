import { auth, firstNameFromSession, isGoogleConfigured } from "@/auth";
import { AccountLinks } from "@/components/account-links";
import { HomeScreen } from "@/components/home-screen";
import { RecentSongs } from "@/components/recent-songs";
import { SavedSongs } from "@/components/saved-songs";
import { listFavorites } from "@/lib/favorites";
import { isMongoConfigured } from "@/lib/mongo";
import { ensureUser, userFromSession } from "@/lib/users";
import { connection } from "next/server";
import { Suspense } from "react";

const signedOut = <AccountLinks signedIn={false} firstName={null} />;

async function HomeAccount() {
  await connection();
  const session = await auth();
  return <AccountLinks signedIn={Boolean(session?.user)} firstName={firstNameFromSession(session)} />;
}

async function HomeLists() {
  if (!isGoogleConfigured() || !isMongoConfigured()) return <RecentSongs />;
  await connection();
  const session = await auth();
  const user = userFromSession(session);
  if (!user) return <RecentSongs />;
  try {
    await ensureUser(user);
    const songs = await listFavorites(user.id, 6);
    if (songs.length) return <SavedSongs songs={songs.slice(0, 5)} showAll />;
  } catch {
    return <SavedSongs songs={[]} unavailable />;
  }
  return <RecentSongs />;
}

export default function Page() {
  const account = isGoogleConfigured() ? (
    <Suspense fallback={signedOut}>
      <HomeAccount />
    </Suspense>
  ) : (
    signedOut
  );

  const lists = (
    <Suspense fallback={<p className="text-2xl leading-snug">Abrindo…</p>}>
      <HomeLists />
    </Suspense>
  );

  return <HomeScreen account={account} lists={lists} />;
}
