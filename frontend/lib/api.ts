// lib/api.ts
// Thin typed client around the FastAPI backend. All poster/backdrop URLs
// arrive pre-built (live TMDB data) from the backend — the frontend never
// talks to TMDB directly, so the API key stays server-side only.

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface MovieCard {
  id: number;
  title: string;
  overview?: string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number | null;
  genres?: string[];
  release_date?: string | null;
  match_score?: number | null;
}

export interface RecommendResponse {
  query: string;
  results: MovieCard[];
}

export interface CastMember {
  id: number;
  name: string;
  character?: string | null;
  profile_url?: string | null;
}

export interface MovieDetail extends MovieCard {
  cast: CastMember[];
  director?: string | null;
  runtime?: number | null;
}

export interface DiscoverResponse {
  genre?: string | null;
  page: number;
  total_pages: number;
  results: MovieCard[];
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${path}`);
  }
  return res.json();
}

export const api = {
  trending: (window: "day" | "week" = "week") =>
    getJSON<MovieCard[]>(`/trending?window=${window}`),

  searchTitles: (query: string) =>
    getJSON<string[]>(`/search?query=${encodeURIComponent(query)}`),

  recommend: (movieTitle: string, topN = 12) =>
    getJSON<RecommendResponse>(
      `/recommend?movie_title=${encodeURIComponent(movieTitle)}&top_n=${topN}`
    ),

  movieDetails: (id: number) => getJSON<MovieCard>(`/movie/${id}`),

  movieFullDetails: (id: number) => getJSON<MovieDetail>(`/movie/${id}/full`),

  similarById: (id: number, topN = 12) =>
    getJSON<RecommendResponse>(`/movie/${id}/similar?top_n=${topN}`),

  genres: () => getJSON<string[]>(`/genres`),

  discover: (genre?: string, page = 1, sortBy: "popularity" | "rating" = "popularity") =>
    getJSON<DiscoverResponse>(
      `/discover?${genre ? `genre=${encodeURIComponent(genre)}&` : ""}page=${page}&sort_by=${sortBy}`
    ),
};
