const NICKNAME = /^[a-z]{1,3}\d{4,8}$/;

export function isNickname(value: string): boolean {
  return NICKNAME.test(value);
}

export function readNickname(value: string | null | undefined): string | null {
  const nickname = value?.trim().toLowerCase() ?? "";
  return isNickname(nickname) ? nickname : null;
}

// Começo do nome, em letras minúsculas e sem acento. Sem nome, fica o começo de maresias.
export function nicknameStem(givenName: string | null, name: string | null): string {
  const source = givenName?.trim() || name?.trim().split(/\s+/)[0] || "";
  const letters = source
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return letters.slice(0, 3) || "mar";
}
