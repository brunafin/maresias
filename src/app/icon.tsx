import { appIcon } from "@/app/app-icon";

const sizes = [32, 192, 512];

export function generateImageMetadata() {
  return sizes.map((size) => ({
    id: String(size),
    size: { width: size, height: size },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const size = Number(await id);
  return appIcon(sizes.includes(size) ? size : 512);
}
