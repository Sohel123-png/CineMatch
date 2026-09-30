"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useWatchlist } from "@/lib/useWatchlist";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#", label: "Home" },
  { href: "#trending", label: "Trending" },
  { href: "#discover", label: "Discover" },
  { href: "#mylist", label: "My List" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { list } = useWatchlist();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300 border-b border-transparent",
        scrolled ? "bg-background/80 backdrop-blur-md border-white/10 shadow-sm" : "bg-gradient-to-b from-background/80 to-transparent"
      )}
    >
      <div className="flex items-center justify-between px-6 md:px-12 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-10">
          <span className="font-semibold text-2xl tracking-tight text-white flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-sm"></div>
            </div>
            CineMatch
          </span>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-muted">
            {LINKS.map((l) => (
              <a key={l.label} href={l.href} className="hover:text-white transition-colors flex items-center gap-2 relative group">
                {l.label}
                {l.label === "My List" && list.length > 0 && (
                  <span className="text-[10px] bg-primary text-white rounded-full px-2 py-0.5">
                    {list.length}
                  </span>
                )}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
              </a>
            ))}
          </nav>
        </div>

        <button
          className="md:hidden text-white p-1"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        <div className="hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-surface border border-white/10 text-sm font-semibold hover:border-primary/50 transition-colors cursor-pointer shadow-sm">
          U
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden flex flex-col gap-1 bg-background/95 backdrop-blur-xl px-6 py-6 border-b border-white/10 text-sm font-medium text-muted absolute w-full shadow-xl">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="py-3 hover:text-white transition-colors border-b border-white/5 last:border-none flex items-center justify-between"
            >
              {l.label} 
              {l.label === "My List" && list.length > 0 && (
                <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">{list.length}</span>
              )}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
