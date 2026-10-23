"use server";

import { isGoogleConfigured, signIn, signOut } from "@/auth";

export async function entrarComGoogle() {
  if (!isGoogleConfigured()) return;
  await signIn("google", { redirectTo: "/" });
}

export async function sair() {
  if (!isGoogleConfigured()) return;
  await signOut({ redirectTo: "/" });
}
