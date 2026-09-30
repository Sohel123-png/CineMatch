"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { MovieCard as MovieCardType } from "@/lib/api";
import MovieCard from "./MovieCard";

interface MovieCarouselProps {
  title: string;
  movies: MovieCardType[];
  id?: string;
  onOpenDetails?: (id: number) => void;
}

export default function MovieCarousel({ title, movies, id, onOpenDetails }: MovieCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    trackRef.current?.scrollBy({
      left: dir === "left" ? -800 : 800,
      behavior: "smooth",
    });
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section id={id} className="relative px-6 md:px-12 py-8 group/row max-w-7xl mx-auto">
      {title && (
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-white flex items-center gap-2">
          {title}
        </h2>
      )}

      <button
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        className="hidden md:flex absolute left-4 top-[55%] -translate-y-1/2 z-30 h-14 w-14 rounded-full items-center justify-center bg-background/80 backdrop-blur-md border border-white/10 opacity-0 group-hover/row:opacity-100 transition-all hover:scale-110 hover:bg-surface shadow-xl text-white"
      >
        <ChevronLeft className="w-7 h-7" />
      </button>

      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth py-4 -my-4 px-1 -mx-1"
      >
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} onOpenDetails={onOpenDetails} />
        ))}
      </div>

      <button
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        className="hidden md:flex absolute right-4 top-[55%] -translate-y-1/2 z-30 h-14 w-14 rounded-full items-center justify-center bg-background/80 backdrop-blur-md border border-white/10 opacity-0 group-hover/row:opacity-100 transition-all hover:scale-110 hover:bg-surface shadow-xl text-white"
      >
        <ChevronRight className="w-7 h-7" />
      </button>
    </section>
  );
}
