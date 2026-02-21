'use client';

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian text-cream p-6">
      <div className="max-w-3xl text-center space-y-12">
        
        {/* The Monolithic Logo */}
        <div className="space-y-4">
          <div className="w-24 h-24 bg-amber rounded-full blur-3xl opacity-20 mx-auto animate-pulse"></div>
          <h1 className="text-5xl md:text-7xl font-extralight tracking-[0.4em] text-amber uppercase">
            BASALITH
          </h1>
        </div>
        
        {/* The Core Message */}
        <p className="text-xl md:text-2xl font-light text-basalt leading-relaxed">
          The world’s first sovereign vault designed to turn memories into a 
          <span className="text-cream italic"> functional AI Double</span> that lives for generations.
        </p>

        {/* The Navigation Buttons */}
        <div className="flex flex-col md:flex-row gap-4 justify-center pt-8">
          <Link href="/vision">
            <button className="w-full md:w-auto px-12 py-4 bg-amber text-obsidian font-bold rounded-sm hover:bg-opacity-90 transition uppercase tracking-widest text-sm">
              Secure Your Legacy
            </button>
          </Link>
          
          <Link href="/circle">
            <button className="w-full md:w-auto px-12 py-4 border border-basalt text-cream font-bold rounded-sm hover:bg-basalt transition uppercase tracking-widest text-sm">
              Become a Guardian
            </button>
          </Link>
        </div>

      </div>
    </main>
  );
}