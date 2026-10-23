import { isMongoConfigured } from "@/lib/mongo";
import { ensureUser } from "@/lib/users";
import NextAuth, { type NextAuthResult } from "next-auth";
import Google from "next-auth/providers/google";
import type { Session } from "next-auth";

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

const configuredAuth: NextAuthResult | null = isGoogleConfigured()
  ? NextAuth({
      trustHost: true,
      session: { strategy: "jwt" },
      pages: { signIn: "/entrar" },
      providers: [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
      ],
      events: {
        async signIn({ user, account, profile }) {
          const id = account?.providerAccountId?.trim();
          if (!id || !isMongoConfigured()) return;
          const record = profile as { given_name?: unknown } | undefined;
          const givenName = typeof record?.given_name === "string" ? record.given_name : null;
          try {
            await ensureUser({
              id,
              email: user.email ?? null,
              name: user.name ?? null,
              givenName,
              image: user.image ?? null,
            });
          } catch {
            // A próxima página tenta de novo, se o apelido ainda não existir.
          }
        },
      },
      callbacks: {
        jwt({ token, profile, account }) {
          // Sem um banco do Auth.js, cada login recebe um id novo. O id da conta Google não muda.
          if (typeof account?.providerAccountId === "string" && account.providerAccountId) {
            token.sub = account.providerAccountId;
          }
          const given = profile?.given_name?.trim();
          if (given) token.givenName = given;
          return token;
        },
        session({ session, token }) {
          if (session.user) {
            if (typeof token.sub === "string") session.user.id = token.sub;
            if (typeof token.givenName === "string") session.user.givenName = token.givenName;
          }
          return session;
        },
      },
    })
  : null;

function googleUnavailable(): Response {
  return new Response("O Google ainda não está ligado.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export const handlers: NextAuthResult["handlers"] = configuredAuth?.handlers ?? {
  GET: async () => googleUnavailable(),
  POST: async () => googleUnavailable(),
};

export const auth: NextAuthResult["auth"] = configuredAuth
  ? configuredAuth.auth
  : (async () => null) as NextAuthResult["auth"];

export const signIn: NextAuthResult["signIn"] = configuredAuth
  ? configuredAuth.signIn
  : (async () => undefined) as NextAuthResult["signIn"];

export const signOut: NextAuthResult["signOut"] = configuredAuth
  ? configuredAuth.signOut
  : (async () => undefined) as NextAuthResult["signOut"];

export function firstNameFromSession(session: Session | null): string | null {
  const given = session?.user?.givenName?.trim();
  if (given) return given.split(/\s+/)[0] || null;
  const name = session?.user?.name?.trim();
  if (!name) return null;
  return name.split(/\s+/)[0] || null;
}
