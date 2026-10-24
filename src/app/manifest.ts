import type { MetadataRoute } from "next";

const PAPER = "#f6f1e8";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "maresias",
    short_name: "maresias",
    description: "Letras grandes para cantar junto, sem anúncio.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: PAPER,
    theme_color: PAPER,
    lang: "pt-BR",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
