"use client";

import { useEffect, useState } from "react";
import DiscoverSection from "@/components/DiscoverSection";
import HeroBanner from "@/components/HeroBanner";
import MovieCarousel from "@/components/MovieCarousel";
import MovieModal from "@/components/MovieModal";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import { HeroSkeleton, RowSkeleton } from "@/components/Skeleton";
import { api, type MovieCard } from "@/lib/api";
import { useWatchlist } from "@/lib/useWatchlist";

const FEATURED_GENRES = ["Action", "Comedy", "Horror", "Romance", "Animation"];

export default function HomePage() {
  const [trending, setTrending] = useState<MovieCard[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  const [genreRows, setGenreRows] = useState<Record<string, MovieCard[]>>({});
  const [loadingGenres, setLoadingGenres] = useState(true);

  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<MovieCard[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openMovieId, setOpenMovieId] = useState<number | null>(null);
  const { list: watchlist } = useWatchlist();

  useEffect(() => {
    api
      .trending("week")
      .then(setTrending)
      .catch(() => setTrending([]))
      .finally(() => setLoadingTrending(false));
  }, []);

  useEffect(() => {
    Promise.all(
      FEATURED_GENRES.map((g) =>
        api
          .discover(g, 1)
          .then((res) => [g, res.results] as const)
          .catch(() => [g, []] as const)
      )
    )
      .then((entries) => setGenreRows(Object.fromEntries(entries)))
      .finally(() => setLoadingGenres(false));
  }, []);

  const handleSelectMovie = async (title: string) => {
    setActiveQuery(title);
    setLoadingRecs(true);
    setError(null);
    try {
      const res = await api.recommend(title, 14);
      setRecommendations(res.results);
    } catch {
      setError("Couldn't fetch recommendations. Is the backend running?");
      setRecommendations([]);
    } finally {
      setLoadingRecs(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {loadingTrending ? (
        <HeroSkeleton />
      ) : (
        <HeroBanner movies={trending} onMoreInfo={setOpenMovieId} />
      )}

      <section className="px-6 md:px-12 -mt-8 relative z-20 max-w-7xl mx-auto">
        <SearchBar onSelectMovie={handleSelectMovie} />
      </section>

      <div className="mt-12 pb-24">
        {activeQuery && (
          <section id="picks" className="px-6 md:px-12 py-8 max-w-7xl mx-auto bg-primary/5 rounded-3xl border border-primary/10 mb-8 mx-4 md:mx-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-2 text-white">
              Because you like{" "}
              <span className="text-primary">{activeQuery}</span>
            </h2>
            {loadingRecs && (
              <div className="flex items-center gap-2 text-sm text-muted mb-4 font-medium">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                Running AI similarity engine...
              </div>
            )}
            {error && <p className="text-sm text-red-400 font-medium">{error}</p>}
            {!loadingRecs && recommendations.length > 0 && (
              <div className="-mx-6 md:-mx-12">
                <MovieCarousel title="" movies={recommendations} onOpenDetails={setOpenMovieId} />
              </div>
            )}
          </section>
        )}

        <MovieCarousel
          id="trending"
          title="Trending This Week"
          movies={trending}
          onOpenDetails={setOpenMovieId}
        />

        {watchlist.length > 0 && (
          <MovieCarousel
            id="mylist"
            title="My List"
            movies={watchlist}
            onOpenDetails={setOpenMovieId}
          />
        )}

        {loadingGenres
          ? FEATURED_GENRES.map((g) => <RowSkeleton key={g} label={g} />)
          : FEATURED_GENRES.map(
              (g) =>
                genreRows[g]?.length > 0 && (
                  <MovieCarousel
                    key={g}
                    title={g}
                    movies={genreRows[g]}
                    onOpenDetails={setOpenMovieId}
                  />
                )
            )}

        <DiscoverSection onOpenDetails={setOpenMovieId} />
      </div>

      <MovieModal
        movieId={openMovieId}
        onClose={() => setOpenMovieId(null)}
        onSelectMovie={setOpenMovieId}
      />

      <footer className="px-6 md:px-12 py-12 max-w-7xl mx-auto border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
           <div className="w-5 h-5 rounded-[4px] bg-primary flex items-center justify-center shrink-0">
             <div className="w-2 h-2 bg-white rounded-sm"></div>
           </div>
           <span className="font-semibold text-lg tracking-tight text-white/90">CineMatch</span>
        </div>
        <p className="text-sm font-medium text-muted/70 text-center md:text-right max-w-lg">
          Powered by an unsupervised AI recommendation engine. Data provided by TMDB.
        </p>
      </footer>
    </main>
  );
}
