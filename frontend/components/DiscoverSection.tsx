"use client";

import { useEffect, useState } from "react";
import { api, type MovieCard as MovieCardType } from "@/lib/api";
import MovieCard from "./MovieCard";
import { RowSkeleton } from "./Skeleton";

interface DiscoverSectionProps {
  onOpenDetails: (id: number) => void;
}

export default function DiscoverSection({ onOpenDetails }: DiscoverSectionProps) {
  const [genres, setGenres] = useState<string[]>([]);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [results, setResults] = useState<MovieCardType[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.genres().then(setGenres).catch(() => setGenres([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .discover(activeGenre ?? undefined, 1)
      .then((res) => {
        setResults(res.results);
        setTotalPages(res.total_pages);
        setPage(1);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [activeGenre]);

  const loadMore = async () => {
    const next = page + 1;
    setLoading(true);
    try {
      const res = await api.discover(activeGenre ?? undefined, next);
      setResults((prev) => [...prev, ...res.results]);
      setPage(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="discover" className="px-6 md:px-12 py-10 max-w-7xl mx-auto">
      <h2 className="text-xl md:text-2xl font-bold mb-6 text-white">Discover Movies</h2>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-6 -my-2 py-2">
        <button
          onClick={() => setActiveGenre(null)}
          className={`shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all ${
            activeGenre === null
              ? "bg-primary text-white shadow-glow"
              : "bg-surface border border-white/10 text-muted hover:border-white/30 hover:text-white"
          }`}
        >
          All
        </button>
        {genres.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGenre(g)}
            className={`shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all ${
              activeGenre === g
                ? "bg-primary text-white shadow-glow"
                : "bg-surface border border-white/10 text-muted hover:border-white/30 hover:text-white"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {loading && results.length === 0 ? (
        <RowSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {results.map((m) => (
              <MovieCard key={m.id} movie={m} onOpenDetails={onOpenDetails} fullWidth />
            ))}
          </div>

          {page < totalPages && (
            <div className="flex justify-center mt-10">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-8 py-3 rounded-full border border-white/10 bg-surface/50 backdrop-blur-md text-sm font-medium hover:bg-surface hover:border-white/20 transition-all disabled:opacity-50 text-white shadow-sm hover:shadow-lg"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
