import { auth, firstNameFromSession, isGoogleConfigured } from "@/auth";
import { AccountLinks } from "@/components/account-links";
import { HomeLibrary } from "@/components/favorite-library";
import { HomeScreen } from "@/components/home-screen";
import { connection } from "next/server";
import { Suspense } from "react";

const signedOut = <AccountLinks signedIn={false} firstName={null} />;

async function HomeAccount() {
  await connection();
  const session = await auth();
  return <AccountLinks signedIn={Boolean(session?.user)} firstName={firstNameFromSession(session)} />;
}

export default function Page() {
  const account = isGoogleConfigured() ? (
    <Suspense fallback={signedOut}>
      <HomeAccount />
    </Suspense>
  ) : (
    signedOut
  );

  return <HomeScreen account={account} lists={<HomeLibrary />} />;
}
