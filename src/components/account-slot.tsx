import { auth, firstNameFromSession } from "@/auth";
import { AccountLinks } from "@/components/account-links";
import { isMongoConfigured } from "@/lib/mongo";
import { ensureUser, userFromSession } from "@/lib/users";
import { connection } from "next/server";
import { cache } from "react";

export type AccountView = {
  signedIn: boolean;
  firstName: string | null;
  nickname: string | null;
};

export const signedOutAccount = <AccountLinks signedIn={false} firstName={null} nickname={null} />;

export const loadAccount = cache(async (): Promise<AccountView> => {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const firstName = firstNameFromSession(session);
  const person = userFromSession(session);
  if (!person || !isMongoConfigured()) return { signedIn, firstName, nickname: null };
  try {
    const { nickname } = await ensureUser(person);
    return { signedIn, firstName, nickname };
  } catch {
    return { signedIn, firstName, nickname: null };
  }
});

export async function AccountSlot() {
  await connection();
  const account = await loadAccount();
  return <AccountLinks signedIn={account.signedIn} firstName={account.firstName} nickname={account.nickname} />;
}
