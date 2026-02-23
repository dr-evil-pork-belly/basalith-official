'use client';

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian text-cream p-6 md:p-12">
      <div className="max-w-3xl text-center space-y-8 md:space-y-12">
        
        {/* The Monolithic Logo - Adjusted for Mobile sizes */}
        <div className="space-y-4">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-amber rounded-full blur-3xl opacity-20 mx-auto animate-pulse"></div>
          <h1 className="text-3xl sm:text-4xl md:text-7xl font-extralight tracking-[0.3em] text-amber uppercase">
            BASALITH
          </h1>
        </div>
        
        {/* Core Message - Reduced font size for small screens */}
        <p className="text-lg md:text-2xl font-light text-basalt leading-relaxed px-2">
          The world’s first sovereign vault designed to turn memories into a 
          <span className="text-cream italic"> functional AI Double</span> that lives for generations.
        </p>

        {/* Buttons - Stacked on Mobile, Side-by-Side on Desktop */}
        <div className="flex flex-col md:flex-row gap-4 justify-center pt-8 w-full max-w-xs mx-auto md:max-w-none">
          <Link href="/vision" className="w-full md:w-auto">
            <button className="w-full px-8 py-4 bg-amber text-obsidian font-bold rounded-sm hover:bg-opacity-90 transition uppercase tracking-widest text-xs md:text-sm">
              Secure Your Legacy
            </button>
          </Link>
          
          <Link href="/circle" className="w-full md:w-auto">
            <button className="w-full px-8 py-4 border border-basalt text-cream font-bold rounded-sm hover:bg-basalt transition uppercase tracking-widest text-xs md:text-sm">
              Become a Guardian
            </button>
          </Link>
        </div>

      </div>
    </main>
  );
}