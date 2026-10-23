import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      givenName?: string;
    } & DefaultSession["user"];
  }
}

export {};
