"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSelectMovie: (title: string) => void;
}

export default function SearchBar({ onSelectMovie }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api.searchTitles(query);
        setSuggestions(results);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 200); // reduced latency
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (title: string) => {
    setQuery(title);
    setOpen(false);
    onSelectMovie(title);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto z-40">
      <div 
        className={cn(
          "flex items-center gap-3 bg-surface/80 backdrop-blur-xl border rounded-2xl px-6 py-4 transition-all duration-300",
          isFocused ? "border-primary/50 shadow-glow bg-surface scale-[1.02]" : "border-white/10 hover:border-white/20 hover:bg-surface"
        )}
      >
        <Search className={cn("w-5 h-5 shrink-0 transition-colors", isFocused ? "text-primary" : "text-muted")} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (suggestions.length > 0) setOpen(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            // delay closing to allow click event to fire on suggestions
            setTimeout(() => setOpen(false), 200);
          }}
          onKeyDown={(e) => e.key === "Enter" && query && handleSelect(query)}
          placeholder="Search a movie you love — we'll find what's similar..."
          className="flex-1 bg-transparent outline-none text-base md:text-lg placeholder:text-muted/60 text-white font-medium"
        />
        {query && (
          <button 
            onClick={() => { setQuery(""); setSuggestions([]); }} 
            aria-label="Clear search"
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-muted hover:text-white transition-colors" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.ul 
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 mt-3 w-full bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto custom-scrollbar"
          >
            {suggestions.map((title, i) => (
              <motion.li 
                key={title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <button
                  onClick={() => handleSelect(title)}
                  className="w-full text-left px-6 py-3.5 text-sm md:text-base hover:bg-white/5 transition-colors border-b border-white/5 last:border-none text-white/90 hover:text-white"
                >
                  <Search className="w-4 h-4 inline-block mr-3 text-muted/50" />
                  {title}
                </button>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
