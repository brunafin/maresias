import { isGoogleConfigured } from "@/auth";
import { loadAccount, signedOutAccount } from "@/components/account-slot";
import { AccountLinks } from "@/components/account-links";
import { FriendLibrary } from "@/components/friend-library";
import { readNickname } from "@/lib/nickname";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Amigo — maresias",
};

function FriendFrame({ account, children }: { account: ReactNode; children: ReactNode }) {
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
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}

async function FriendConnected({ nickname }: { nickname: string }) {
  await connection();
  const account = await loadAccount();
  if (!account.signedIn) redirect("/entrar");
  return (
    <FriendFrame
      account={<AccountLinks signedIn={account.signedIn} firstName={account.firstName} nickname={account.nickname} />}
    >
      <FriendLibrary nickname={nickname} />
    </FriendFrame>
  );
}

export default function Page({ params }: { params: Promise<{ nickname: string }> }) {
  if (!isGoogleConfigured()) redirect("/");

  return (
    <Suspense
      fallback={
        <FriendFrame account={signedOutAccount}>
          <p className="text-2xl leading-snug">Abrindo…</p>
        </FriendFrame>
      }
    >
      <FriendFromParams params={params} />
    </Suspense>
  );
}

async function FriendFromParams({ params }: { params: Promise<{ nickname: string }> }) {
  const { nickname: raw } = await params;
  const nickname = readNickname(raw);
  if (!nickname) redirect("/amigos");
  if (raw !== nickname) redirect(`/amigos/${nickname}`);
  return <FriendConnected nickname={nickname} />;
}
