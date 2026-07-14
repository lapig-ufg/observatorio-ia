import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Observatório IA | Acervo de leituras",
    template: "%s | Observatório IA",
  },
  description: "Acervo público e acadêmico de leituras sobre inteligência artificial, organizado por temas e tipos de publicação.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Observatório IA | Acervo de leituras",
    description: "Opinião, notícias e ciência aberta sobre inteligência artificial.",
    type: "website",
    images: [{ url: "/og.png", width: 1680, height: 945, alt: "Observatório IA - acervo de leituras sobre inteligência artificial" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Observatório IA | Acervo de leituras",
    description: "Opinião, notícias e ciência aberta sobre inteligência artificial.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
