export const NICKNAME_PATTERN = "^[a-z]{4}\\d{4,8}$";

const NICKNAME = new RegExp(NICKNAME_PATTERN);
const STEM_LENGTH = 4;
const FALLBACK = "maresias";

export function isNickname(value: string): boolean {
  return NICKNAME.test(value);
}

export function readNickname(value: string | null | undefined): string | null {
  const nickname = value?.trim().toLowerCase() ?? "";
  return isNickname(nickname) ? nickname : null;
}

// Quatro letras do começo do nome, minúsculas e sem acento. Nome curto ou ausente completa com maresias.
export function nicknameStem(givenName: string | null, name: string | null): string {
  const source = givenName?.trim() || name?.trim().split(/\s+/)[0] || "";
  const letters = source
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return (letters + FALLBACK).slice(0, STEM_LENGTH);
}
