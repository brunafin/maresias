import { auth, firstNameFromSession, isGoogleConfigured } from "@/auth";
import { AccountLinks } from "@/components/account-links";
import { FavoriteList } from "@/components/favorite-library";
import type { Metadata } from "next";
import Link from "next/link";
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
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <Link href="/" className="min-w-0 flex-1 truncate text-3xl font-bold leading-tight text-foreground no-underline">
            maresias
          </Link>
          {account}
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

async function FavoritesAccount() {
  await connection();
  const session = await auth();
  return <AccountLinks signedIn={Boolean(session?.user)} firstName={firstNameFromSession(session)} />;
}

export default function Page() {
  const account = isGoogleConfigured() ? (
    <Suspense fallback={signedOut}>
      <FavoritesAccount />
    </Suspense>
  ) : (
    signedOut
  );

  return (
    <FavoritesFrame account={account}>
      <FavoriteList />
    </FavoritesFrame>
  );
}
