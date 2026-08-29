import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BackgroundEffect } from "@/components/BackgroundEffect";

export const metadata: Metadata = {
  title: "Electronic Future League (EFL) — База данных команд CS2",
  description: "Официальный реестр и база данных команд киберспортивной лиги Electronic Future League по дисциплине CS2.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className="bg-[#040405] text-[#f5f5f5] min-h-screen flex flex-col antialiased selection:bg-white selection:text-black relative overflow-x-hidden">
        <BackgroundEffect />
        <div className="relative z-10 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}