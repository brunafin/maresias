import { APP_VERSION } from "@/lib/version";
import { connection } from "next/server";

export async function GET() {
  await connection();
  return Response.json({ version: APP_VERSION }, { headers: { "Cache-Control": "no-store" } });
}
