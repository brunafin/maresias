import { sair } from "@/app/entrar/actions";
import Link from "next/link";

const quietClass =
  "inline-flex min-h-11 items-center text-lg font-normal text-foreground/80 underline-offset-4 hover:underline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-foreground";

export function AccountLinks({ signedIn, firstName }: { signedIn: boolean; firstName: string | null }) {
  if (!signedIn) {
    return (
      <div className="flex justify-end">
        <Link href="/entrar" className={quietClass}>
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-4">
      {firstName ? <span className="text-lg leading-snug text-foreground">{firstName}</span> : null}
      <form action={sair}>
        <button type="submit" className={quietClass}>
          Sair
        </button>
      </form>
    </div>
  );
}
