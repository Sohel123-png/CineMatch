"use client";

import { Check, Info, Plus, Star } from "lucide-react";
import type { MovieCard as MovieCardType } from "@/lib/api";
import { useWatchlist } from "@/lib/useWatchlist";
import ImageWithFallback from "./ImageWithFallback";

interface MovieCardProps {
  movie: MovieCardType;
  onOpenDetails?: (id: number) => void;
  fullWidth?: boolean;
}

export default function MovieCard({ movie, onOpenDetails, fullWidth }: MovieCardProps) {
  const { isSaved, toggle } = useWatchlist();
  const saved = isSaved(movie.id);

  return (
    <div
      className={`group relative transition-all duration-300 ease-out hover:-translate-y-2 hover:z-20 cursor-pointer ${
        fullWidth ? "w-full" : "shrink-0 w-[160px] md:w-[220px]"
      }`}
      onClick={() => onOpenDetails?.(movie.id)}
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-panel shadow-card border border-white/5 transition-all group-hover:border-primary/30 group-hover:shadow-glow">
        <ImageWithFallback
          src={movie.poster_url || ""}
          alt={movie.title}
          fallbackText={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
          {movie.match_score != null && (
            <span className="text-xs font-semibold text-emerald-400 mb-1.5 bg-emerald-400/10 w-fit px-2 py-0.5 rounded-full border border-emerald-400/20 backdrop-blur-md">
              {Math.round(movie.match_score)}% Match
            </span>
          )}
          <p className="text-sm font-bold leading-tight line-clamp-2 text-white mb-2">
            {movie.title}
          </p>
          <div className="flex items-center gap-3 text-xs font-medium text-muted/90 mb-3">
            {movie.rating != null && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-accent text-accent" />
                {movie.rating.toFixed(1)}
              </span>
            )}
            {movie.genres && movie.genres.length > 0 && (
              <span className="truncate">{movie.genres.slice(0, 2).join(", ")}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggle(movie);
              }}
              aria-label={saved ? "Remove from My List" : "Add to My List"}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 grid place-items-center transition-all hover:scale-110 active:scale-95 text-white"
            >
              {saved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
            {onOpenDetails && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetails(movie.id);
                }}
                aria-label="More info"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 grid place-items-center transition-all hover:scale-110 active:scale-95 text-white"
              >
                <Info className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
