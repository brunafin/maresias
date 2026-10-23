import { PreferencesProvider } from "@/components/preferences";
import type { Metadata } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  title: "maresias",
  description: "Letras grandes para cantar junto, sem anúncio.",
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
            __html: `(function(){try{document.documentElement.removeAttribute("data-contrast");var s=Number(localStorage.getItem("letras-da-roda-tamanho"));var ok=[28,32,40,48,56,64,72,80];if(ok.indexOf(s)!==-1){document.documentElement.style.setProperty("--lyric-size",s+"px");}}catch(e){}})();`,
          }}
        />
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
