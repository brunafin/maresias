import { auth, isGoogleConfigured } from "@/auth";
import { entrarComGoogle } from "@/app/entrar/actions";
import { bigButtonClass } from "@/components/controls";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

const backClass =
  "inline-flex min-h-11 items-center text-lg text-foreground/80 underline-offset-4 hover:underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground";

function EntrarScreen({ connected }: { connected: boolean }) {
  return (
    <div className="relative h-full">
      <Link href="/" className={`${backClass} absolute top-6 right-4 sm:right-8`}>
        Voltar para a busca
      </Link>
      <main className="flex h-full items-center justify-center px-4">
        {connected ? (
          <form action={entrarComGoogle}>
            <Button type="submit" size="grande" className={cn(bigButtonClass, "w-auto max-w-full")}>
              Entrar com Google
            </Button>
          </form>
        ) : (
          <p className="max-w-sm text-center text-2xl leading-snug">O Google ainda não está ligado.</p>
        )}
      </main>
    </div>
  );
}

async function EntrarConnected() {
  await connection();
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }
  return <EntrarScreen connected />;
}

export default function Page() {
  if (!isGoogleConfigured()) {
    return <EntrarScreen connected={false} />;
  }

  return (
    <Suspense fallback={<EntrarScreen connected />}>
      <EntrarConnected />
    </Suspense>
  );
}
