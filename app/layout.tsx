import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Electronic Future League (EFL) — Official Team & Player Database",
  description: "Official public registry and directory of teams, rosters, and players competing in Electronic Future League.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#050505] text-[#F5F5F5] min-h-screen flex flex-col antialiased selection:bg-white selection:text-black">
        <Header />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
