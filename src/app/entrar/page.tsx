import { auth, isGoogleConfigured } from "@/auth";
import { entrarComGoogle } from "@/app/entrar/actions";
import { bigButtonClass } from "@/components/controls";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

const backClass =
  "inline-flex min-h-11 items-center text-lg text-foreground/80 underline-offset-4 hover:underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground";

function EntrarScreen({ connected }: { connected: boolean }) {
  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">
        <div className="flex justify-end">
          <Link href="/" className={backClass}>
            Voltar para a busca
          </Link>
        </div>
        {connected ? (
          <form action={entrarComGoogle}>
            <Button type="submit" size="grande" className={bigButtonClass}>
              Entrar com Google
            </Button>
          </form>
        ) : (
          <p className="text-2xl leading-snug">O Google ainda não está ligado.</p>
        )}
      </main>
    </div>
  );
}

async function EntrarConnected() {
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
