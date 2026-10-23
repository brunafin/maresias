import { isGoogleConfigured } from "@/auth";
import { AccountSlot, signedOutAccount } from "@/components/account-slot";
import { HomeLibrary } from "@/components/favorite-library";
import { HomeScreen } from "@/components/home-screen";
import { Suspense } from "react";

export default function Page() {
  const account = isGoogleConfigured() ? (
    <Suspense fallback={signedOutAccount}>
      <AccountSlot />
    </Suspense>
  ) : (
    signedOutAccount
  );

  return <HomeScreen account={account} lists={<HomeLibrary />} />;
}
