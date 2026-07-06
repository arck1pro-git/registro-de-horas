import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { FooterNav } from "./footer-nav";
import { PwaRegister } from "./pwa-register";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Registro de Horas",
  description: "Sistema de registro de horas",
  // Permite instalar como app (PWA) e ícone na tela de início do iOS.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Horas",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background md:bg-zinc-100 md:dark:bg-black">
        {children}
        <FooterNav isAdmin={isAdmin} />
        <PwaRegister />
      </body>
    </html>
  );
}
