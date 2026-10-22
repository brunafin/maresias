import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center gap-6 px-5">
      <h1 className="text-4xl font-bold">Essa página não existe.</h1>
      <Link
        href="/"
        className="flex min-h-16 items-center justify-center rounded-2xl border-[3px] border-foreground bg-primary px-5 text-2xl font-bold text-primary-foreground no-underline"
      >
        Voltar ao começo
      </Link>
    </main>
  );
}
