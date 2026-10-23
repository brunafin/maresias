import { auth, firstNameFromSession, isGoogleConfigured } from "@/auth";
import { AccountLinks } from "@/components/account-links";
import { HomeScreen } from "@/components/home-screen";
import { Suspense } from "react";

async function HomeAccount() {
  const session = await auth();
  return <AccountLinks signedIn={Boolean(session?.user)} firstName={firstNameFromSession(session)} />;
}

export default function Page() {
  const account = isGoogleConfigured() ? (
    <Suspense fallback={<AccountLinks signedIn={false} firstName={null} />}>
      <HomeAccount />
    </Suspense>
  ) : (
    <AccountLinks signedIn={false} firstName={null} />
  );

  return <HomeScreen account={account} />;
}
