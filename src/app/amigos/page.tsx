import { isGoogleConfigured } from "@/auth";
import { loadAccount, signedOutAccount } from "@/components/account-slot";
import { AccountLinks } from "@/components/account-links";
import { FriendLookup } from "@/components/friend-lookup";
import { readNickname } from "@/lib/nickname";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Amigos — maresias",
};

function FriendsFrame({ account, children }: { account: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="relative z-20 shrink-0 border-b border-foreground/30 px-3 py-2 sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <Link href="/" className="shrink-0 text-3xl font-bold leading-tight text-foreground no-underline">
            maresias
          </Link>
          {account}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">
          <h1 className="text-3xl font-bold">Amigos</h1>
          {children}
        </main>
      </div>
    </div>
  );
}

async function FriendsConnected() {
  await connection();
  const account = await loadAccount();
  if (!account.signedIn) redirect("/entrar");
  return (
    <FriendsFrame
      account={<AccountLinks signedIn={account.signedIn} firstName={account.firstName} nickname={account.nickname} />}
    >
      <FriendLookup mine={account.nickname} />
    </FriendsFrame>
  );
}

export default function Page({ searchParams }: { searchParams: Promise<{ apelido?: string | string[] }> }) {
  if (!isGoogleConfigured()) redirect("/");

  return (
    <Suspense
      fallback={
        <FriendsFrame account={signedOutAccount}>
          <p className="text-2xl leading-snug">Abrindo…</p>
        </FriendsFrame>
      }
    >
      <FriendsFromParams searchParams={searchParams} />
    </Suspense>
  );
}

async function FriendsFromParams({ searchParams }: { searchParams: Promise<{ apelido?: string | string[] }> }) {
  const params = await searchParams;
  const raw = Array.isArray(params.apelido) ? params.apelido[0] : params.apelido;
  const apelido = readNickname(raw);
  if (apelido) redirect(`/amigos/${apelido}`);
  return <FriendsConnected />;
}
