import { workerSource } from "@/lib/pwa";
import { APP_VERSION } from "@/lib/version";
import { connection } from "next/server";

const headers = {
  "Content-Type": "application/javascript; charset=utf-8",
  "Cache-Control": "no-store",
  "Service-Worker-Allowed": "/",
};

export async function GET() {
  await connection();
  return new Response(workerSource(APP_VERSION), { headers });
}
