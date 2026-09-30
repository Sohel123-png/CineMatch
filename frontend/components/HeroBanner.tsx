"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info, Play, Star } from "lucide-react";
import { useEffect, useState } from "react";
import type { MovieCard } from "@/lib/api";
import ImageWithFallback from "./ImageWithFallback";

interface HeroBannerProps {
  movies: MovieCard[];
  onMoreInfo?: (id: number) => void;
  rotateMs?: number;
}

export default function HeroBanner({ movies, onMoreInfo, rotateMs = 8000 }: HeroBannerProps) {
  const [index, setIndex] = useState(0);
  const slides = movies.slice(0, 5);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, rotateMs);
    return () => clearInterval(timer);
  }, [slides.length, rotateMs]);

  const movie = slides[index];

  if (!movie) {
    return null;
  }

  return (
    <section className="relative h-[85vh] lg:h-[80vh] w-full overflow-hidden flex items-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={movie.id}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          {movie.backdrop_url && (
            <ImageWithFallback
              src={movie.backdrop_url}
              alt={movie.title}
              fallbackText=""
              className="absolute inset-0 w-full h-full object-cover object-top opacity-60"
            />
          )}
          <div className="absolute inset-0 bg-hero-fade" />
          <div className="absolute inset-0 bg-hero-side hidden md:block" />

          <div className="relative z-10 flex h-full flex-col justify-end md:justify-center px-6 md:px-12 max-w-7xl mx-auto pb-24 md:pb-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="max-w-3xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full border border-primary/20 backdrop-blur-md">
                  Featured
                </span>
                {movie.rating != null && (
                  <span className="flex items-center gap-1.5 text-accent font-medium text-sm">
                    <Star className="w-4 h-4 fill-accent" />
                    {movie.rating.toFixed(1)}
                  </span>
                )}
              </div>
              
              <h1 className="font-bold text-5xl md:text-6xl lg:text-7xl leading-tight tracking-tight text-white mb-4 text-shadow-lg">
                {movie.title}
              </h1>

              <div className="flex items-center gap-4 text-sm font-medium text-muted mb-6">
                {movie.release_date && <span>{movie.release_date.slice(0, 4)}</span>}
                {movie.genres && movie.genres.length > 0 && (
                  <span className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-muted/50"></span>
                    {movie.genres.slice(0, 3).join(", ")}
                  </span>
                )}
              </div>

              {movie.overview && (
                <p className="text-muted/90 text-base md:text-lg max-w-2xl leading-relaxed mb-8">
                  {movie.overview}
                </p>
              )}

              <div className="flex items-center gap-4">
                <button className="group flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-7 py-3.5 rounded-full font-medium transition-all shadow-glow hover:shadow-primary/50 hover:scale-105 active:scale-95">
                  <Play className="w-5 h-5 fill-white" />
                  Watch Trailer
                </button>
                <button
                  onClick={() => onMoreInfo?.(movie.id)}
                  className="flex items-center gap-2 bg-surface/50 hover:bg-surface border border-white/10 hover:border-white/20 backdrop-blur-md text-white px-7 py-3.5 rounded-full font-medium transition-all hover:scale-105 active:scale-95"
                >
                  <Info className="w-5 h-5" />
                  Details
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-8 right-6 md:right-12 z-20 flex gap-3">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setIndex(i)}
            aria-label={`Show ${s.title}`}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === index ? "w-8 bg-primary" : "w-2 bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
