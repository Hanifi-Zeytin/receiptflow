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
  title: "Fiş Uygulaması",
  description: "Fiş yükleme ve onay uygulaması",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <main className="p-6">
          <nav className="mb-6 flex gap-4 text-sm">
            <a href="/" className="underline">Ana sayfa</a>
            <a href="/upload" className="underline">Fiş Yükle</a>
            <a href="/receipts" className="underline">Fişler</a>
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
