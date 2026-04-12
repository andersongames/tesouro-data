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
  metadataBase: new URL("https://seu-dominio.com"),

  title: {
    default: "Tesouro Data",
    template: "%s | Tesouro Data",
  },

  description:
    "Consulta de títulos do Tesouro Direto com acesso rápido, histórico e API para integração.",

  openGraph: {
    title: "Tesouro Data",
    description:
      "Consulta de títulos do Tesouro Direto com acesso rápido e API.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
