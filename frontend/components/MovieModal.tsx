"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Play, Plus, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, type MovieCard as MovieCardType, type MovieDetail } from "@/lib/api";
import { useWatchlist } from "@/lib/useWatchlist";
import MovieCard from "./MovieCard";
import ImageWithFallback from "./ImageWithFallback";
import { cn } from "@/lib/utils";

interface MovieModalProps {
  movieId: number | null;
  onClose: () => void;
  onSelectMovie: (id: number) => void; 
}

export default function MovieModal({ movieId, onClose, onSelectMovie }: MovieModalProps) {
  const [detail, setDetail] = useState<MovieDetail | null>(null);
  const [similar, setSimilar] = useState<MovieCardType[]>([]);
  const [loading, setLoading] = useState(false);
  const { isSaved, toggle } = useWatchlist();

  useEffect(() => {
    if (movieId == null) return;
    setLoading(true);
    setDetail(null);
    Promise.all([
      api.movieFullDetails(movieId),
      api.similarById(movieId, 10).catch(() => ({ results: [] })),
    ])
      .then(([full, sim]) => {
        setDetail(full);
        setSimilar(sim.results);
      })
      .finally(() => setLoading(false));
  }, [movieId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {movieId != null && (
        <motion.div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl flex items-start md:items-center justify-center p-0 md:p-6 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full md:max-w-4xl bg-surface md:rounded-2xl overflow-hidden shadow-2xl my-0 md:my-10 border border-white/10"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 border border-white/10 grid place-items-center transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {loading && !detail && (
              <div className="h-[60vh] grid place-items-center text-muted">
                <div className="animate-pulse flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-medium">Loading details...</p>
                </div>
              </div>
            )}

            {detail && (
              <>
                <div className="relative h-[50vh] w-full">
                  {detail.backdrop_url && (
                    <ImageWithFallback
                      src={detail.backdrop_url}
                      alt={detail.title}
                      fallbackText=""
                      className="w-full h-full object-cover object-top opacity-80"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-8 w-full max-w-3xl">
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                      <h2 className="font-bold text-4xl md:text-5xl lg:text-6xl tracking-tight text-shadow-lg text-white mb-3">
                        {detail.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted/90">
                        {detail.rating != null && (
                          <span className="flex items-center gap-1.5 text-accent">
                            <Star className="w-4 h-4 fill-accent" />
                            {detail.rating.toFixed(1)}
                          </span>
                        )}
                        {detail.release_date && <span>{detail.release_date.slice(0, 4)}</span>}
                        {detail.runtime && <span>{Math.floor(detail.runtime / 60)}h {detail.runtime % 60}m</span>}
                        {detail.genres && detail.genres.length > 0 && (
                          <span className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-muted/50"></span>
                            {detail.genres.join(", ")}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>

                <div className="p-8 space-y-10 bg-surface">
                  <div className="flex flex-wrap items-center gap-4">
                    <button className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-full font-semibold transition-all shadow-glow hover:scale-105 active:scale-95">
                      <Play className="w-5 h-5 fill-white" />
                      Play Now
                    </button>
                    <button
                      onClick={() =>
                        toggle({
                          id: detail.id,
                          title: detail.title,
                          poster_url: detail.poster_url,
                          rating: detail.rating,
                          genres: detail.genres,
                        })
                      }
                      className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-full font-medium transition-all hover:scale-105 active:scale-95 text-white"
                    >
                      {isSaved(detail.id) ? (
                        <>
                          <Check className="w-5 h-5 text-emerald-400" /> Saved
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" /> Add to List
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                      {detail.overview && (
                        <div>
                          <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Synopsis</h3>
                          <p className="text-base text-muted/90 leading-relaxed">
                            {detail.overview}
                          </p>
                        </div>
                      )}

                      {similar.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">More Like This</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {similar.slice(0, 3).map((m) => (
                              <MovieCard key={m.id} movie={m} onOpenDetails={onSelectMovie} fullWidth />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-6 bg-background/50 rounded-2xl p-6 border border-white/5 h-fit">
                      {detail.director && (
                        <div>
                          <span className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">Director</span>
                          <span className="text-sm font-medium text-white">{detail.director}</span>
                        </div>
                      )}
                      {detail.cast && detail.cast.length > 0 && (
                        <div>
                          <span className="block text-xs font-medium text-muted uppercase tracking-wider mb-3">Top Cast</span>
                          <div className="space-y-3">
                            {detail.cast.slice(0, 5).map((c) => (
                              <div key={c.id} className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-panel shrink-0 border border-white/5">
                                  {c.profile_url ? (
                                    <img src={c.profile_url} alt={c.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full grid place-items-center text-xs bg-surface text-muted">{c.name[0]}</div>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-white/90 line-clamp-1">{c.name}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
