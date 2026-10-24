import { PreferencesProvider } from "@/components/preferences";
import { APP_VERSION } from "@/lib/version";
import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

const PAPER = "#f6f1e8";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: PAPER,
  colorScheme: "light",
};

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "maresias",
  title: "maresias",
  description: "Letras grandes para cantar junto, sem anúncio.",
  appleWebApp: {
    capable: true,
    title: "maresias",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${atkinson.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-dvh overflow-hidden">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.removeAttribute("data-contrast");var s=Number(localStorage.getItem("letras-da-roda-tamanho"));var ok=[16,20,24,28,32,40,48,56,64,72,80];if(ok.indexOf(s)!==-1){document.documentElement.style.setProperty("--lyric-size",s+"px");}}catch(e){}})();`,
          }}
        />
        <PreferencesProvider>{children}</PreferencesProvider>
        <p className="pointer-events-none fixed right-2 bottom-0 z-30 pb-[max(0.15rem,env(safe-area-inset-bottom))] text-[10px] leading-none text-foreground/25 select-none">
          {APP_VERSION}
        </p>
      </body>
    </html>
  );
}
