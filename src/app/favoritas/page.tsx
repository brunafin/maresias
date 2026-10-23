import { auth, firstNameFromSession, isGoogleConfigured } from "@/auth";
import { AccountLinks, AppRevision } from "@/components/account-links";
import { FavoriteSongs } from "@/components/favorite-songs";
import { listFavorites } from "@/lib/favorites";
import { isMongoConfigured } from "@/lib/mongo";
import { ensureUser, userFromSession } from "@/lib/users";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Favoritas — maresias",
};

const signedOut = <AccountLinks signedIn={false} firstName={null} />;

function FavoritesFrame({ account, children }: { account: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="relative z-20 shrink-0 border-b border-foreground/30 px-3 py-2 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          <div className="flex items-center gap-3">
            <Link href="/" className="min-w-0 flex-1 truncate text-3xl font-bold leading-tight text-foreground no-underline">
              maresias
            </Link>
            {account}
          </div>
          <AppRevision className="text-right text-sm leading-tight text-foreground/70" />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">
          <h1 className="text-3xl font-bold">Favoritas</h1>
          {children}
        </main>
      </div>
    </div>
  );
}

async function FavoritesContent() {
  if (!isGoogleConfigured() || !isMongoConfigured()) {
    redirect("/");
  }
  await connection();
  const session = await auth();
  const account = <AccountLinks signedIn={Boolean(session?.user)} firstName={firstNameFromSession(session)} />;
  const user = userFromSession(session);
  if (!user) redirect("/entrar");
  try {
    await ensureUser(user);
    const songs = await listFavorites(user.id);
    return (
      <FavoritesFrame account={account}>
        {songs.length === 0 ? (
          <p className="text-2xl leading-snug">Nenhuma favorita ainda.</p>
        ) : (
          <FavoriteSongs songs={songs} />
        )}
      </FavoritesFrame>
    );
  } catch {
    return (
      <FavoritesFrame account={account}>
        <p className="text-2xl leading-snug">Não conseguimos abrir as favoritas agora.</p>
      </FavoritesFrame>
    );
  }
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <FavoritesFrame account={signedOut}>
          <p className="text-2xl leading-snug">Abrindo as favoritas…</p>
        </FavoritesFrame>
      }
    >
      <FavoritesContent />
    </Suspense>
  );
}
