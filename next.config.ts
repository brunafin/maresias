import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";

const months = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

function git(args: string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function appRevision(): string {
  const sha = git(["rev-parse", "--short", "HEAD"]);
  const iso = git(["log", "-1", "--format=%cI"]);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const month = match ? months[Number(match[2]) - 1] : "";
  const when = match && month ? `${Number(match[3])} ${month} ${match[1]}` : "";
  if (when && sha) return `${when} · ${sha}`;
  return when || sha;
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_REVISION: appRevision(),
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
