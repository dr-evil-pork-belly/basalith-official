import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Basalith | Sovereign Legacy Vault",
  description: "The world’s first sovereign vault designed to turn raw memories into a functional digital double that lives for generations.",
  openGraph: {
    title: "Basalith | Sovereign Legacy Vault",
    description: "Secure your human legacy. Bridge the gap between raw data and digital continuity.",
    type: "website",
    locale: "en_US",
    url: "https://basalith.xyz",
    siteName: "Basalith",
  },
  twitter: {
    card: "summary_large_image",
    title: "Basalith | Sovereign Legacy Vault",
    description: "Turning memories into a living legacy through Sovereign Persona Architecture.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-obsidian antialiased">
        {/* The Navigation Bar */}
        <nav className="fixed top-0 w-full z-50 border-b border-basalt/10 bg-obsidian/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="text-amber font-serif text-2xl tracking-tighter">
              BASALITH
            </Link>
            
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-[10px] md:text-sm tracking-widest">
              <Link href="/vision" className="hover:text-amber transition">Vision</Link>
              <Link href="/hearth" className="hover:text-amber transition">The Hearth</Link>
              <Link href="/vault" className="hover:text-amber transition">The Vault</Link>
              <Link href="/circle" className="hover:text-amber transition">The Circle</Link>
            </div>
          </div>
        </nav>

        {/* This is where the individual pages (Home, Vision, Circle) will appear */}
        <div className="pt-20">
          {children}
        </div>
      </body>
    </html>
  );
}