"use client";

import { useCallback, useEffect, useState } from "react";
import type { MovieCard } from "@/lib/api";

const STORAGE_KEY = "cinematch:watchlist";

function readList(): MovieCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MovieCard[]) : [];
  } catch {
    return [];
  }
}

/**
 * Simple client-side "My List" — persisted per-browser via localStorage.
 * There's no backend user model in this project, so this keeps the watchlist
 * feature fully functional without requiring auth.
 */
export function useWatchlist() {
  const [list, setList] = useState<MovieCard[]>([]);

  useEffect(() => {
    setList(readList());
  }, []);

  const persist = useCallback((next: MovieCard[]) => {
    setList(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or unavailable — fail silently, state still updates */
    }
  }, []);

  const isSaved = useCallback(
    (id: number) => list.some((m) => m.id === id),
    [list]
  );

  const toggle = useCallback(
    (movie: MovieCard) => {
      if (isSaved(movie.id)) {
        persist(list.filter((m) => m.id !== movie.id));
      } else {
        persist([movie, ...list]);
      }
    },
    [list, isSaved, persist]
  );

  return { list, isSaved, toggle };
}
