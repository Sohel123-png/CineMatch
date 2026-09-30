"""
main.py — FastAPI backend for the Movie Recommendation System

Loads the pickled artifacts produced by ml/train_model.py (movie table +
cosine similarity matrix), exposes a content-based recommendation endpoint,
and enriches every result with live poster/backdrop/rating data pulled from
the TMDB API using each movie's numeric TMDB id.

Run:
    cd backend
    pip install -r requirements.txt
    cp .env.example .env   # then add your TMDB_API_KEY
    uvicorn main:app --reload --port 8000
"""

import asyncio
import os
import pickle
import time
from pathlib import Path
from typing import Optional

import httpx
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMG_BASE = "https://image.tmdb.org/t/p"
POSTER_SIZE = "w500"
BACKDROP_SIZE = "original"

ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"

CACHE_TTL_SECONDS = 60 * 30  # 30 min — TMDB metadata rarely changes that fast
_tmdb_cache: dict[str, tuple[float, dict]] = {}

# --------------------------------------------------------------------------
# App + CORS (allow the Next.js dev server / deployed frontend to call us)
# --------------------------------------------------------------------------
app = FastAPI(title="Movie Recommender API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # open for public API / frontend deployment
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# Load ML artifacts once at startup
# --------------------------------------------------------------------------
movies_df: pd.DataFrame = pd.DataFrame()
similarity: Optional[np.ndarray] = None
title_to_index: dict = {}
id_to_index: dict = {}
all_genres: list[str] = []


@app.on_event("startup")
def load_artifacts():
    global movies_df, similarity, title_to_index, id_to_index, all_genres

    movies_path = ARTIFACT_DIR / "movies.pkl"
    similarity_path = ARTIFACT_DIR / "similarity.pkl"

    if not movies_path.exists() or not similarity_path.exists():
        raise RuntimeError(
            "Model artifacts not found. Run `python ml/train_model.py` "
            "first to generate backend/artifacts/movies.pkl and "
            "similarity.pkl."
        )

    movies_df = pd.read_pickle(movies_path)
    with open(similarity_path, "rb") as f:
        similarity = pickle.load(f)

    # lowercase lookup for forgiving title matches, plus a reverse index by
    # TMDB id (used by /movie/{id}/similar and /discover)
    title_to_index = {
        t.lower(): i for i, t in enumerate(movies_df["title"].tolist())
    }
    id_to_index = {
        int(mid): i for i, mid in enumerate(movies_df["id"].tolist())
    }

    genre_set = set()
    if "genres_list" in movies_df.columns:
        for g_list in movies_df["genres_list"]:
            genre_set.update(g_list or [])
    all_genres = sorted(genre_set)

    print(f"Loaded {len(movies_df)} movies + "
          f"{similarity.shape} similarity matrix + "
          f"{len(all_genres)} distinct genres.")

    if not TMDB_API_KEY:
        print("WARNING: TMDB_API_KEY is not set — poster/backdrop data "
              "will be unavailable until you add it to backend/.env")


# --------------------------------------------------------------------------
# Pydantic response models
# --------------------------------------------------------------------------
class MovieCard(BaseModel):
    id: int
    title: str
    overview: Optional[str] = None
    poster_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    rating: Optional[float] = None
    genres: list[str] = []
    release_date: Optional[str] = None
    match_score: Optional[float] = None  # similarity %, only on /recommend


class RecommendResponse(BaseModel):
    query: str
    results: list[MovieCard]


class CastMember(BaseModel):
    id: int
    name: str
    character: Optional[str] = None
    profile_url: Optional[str] = None


class MovieDetail(MovieCard):
    cast: list[CastMember] = []
    director: Optional[str] = None
    runtime: Optional[int] = None


class DiscoverResponse(BaseModel):
    genre: Optional[str] = None
    page: int
    total_pages: int
    results: list[MovieCard]


# --------------------------------------------------------------------------
# TMDB enrichment helpers (with a small in-memory TTL cache so repeat
# lookups — e.g. the same movie showing up in several carousels — don't
# re-hit the TMDB API every time)
# --------------------------------------------------------------------------
def _cache_get(key: str) -> Optional[dict]:
    hit = _tmdb_cache.get(key)
    if not hit:
        return None
    ts, value = hit
    if time.time() - ts > CACHE_TTL_SECONDS:
        _tmdb_cache.pop(key, None)
        return None
    return value


def _cache_set(key: str, value: dict) -> None:
    _tmdb_cache[key] = (time.time(), value)


async def fetch_tmdb_details(client: httpx.AsyncClient, tmdb_id: int) -> dict:
    """Fetch live poster/backdrop/overview/rating for a single movie id.
    Falls back gracefully (returns Nones) on any error so one bad id never
    breaks the whole recommendation response.
    """
    cache_key = f"details:{tmdb_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    if not TMDB_API_KEY:
        return {}
    try:
        resp = await client.get(
            f"{TMDB_BASE}/movie/{tmdb_id}",
            params={"api_key": TMDB_API_KEY, "language": "en-US"},
            timeout=8.0,
        )
        if resp.status_code != 200:
            return {}
        data = resp.json()
        result = {
            "overview": data.get("overview"),
            "poster_url": (
                f"{TMDB_IMG_BASE}/{POSTER_SIZE}{data['poster_path']}"
                if data.get("poster_path") else None
            ),
            "backdrop_url": (
                f"{TMDB_IMG_BASE}/{BACKDROP_SIZE}{data['backdrop_path']}"
                if data.get("backdrop_path") else None
            ),
            "rating": data.get("vote_average"),
            "genres": [g["name"] for g in data.get("genres", [])],
            "release_date": data.get("release_date"),
            "runtime": data.get("runtime"),
        }
        _cache_set(cache_key, result)
        return result
    except httpx.HTTPError:
        return {}


async def fetch_tmdb_credits(client: httpx.AsyncClient, tmdb_id: int) -> dict:
    """Fetch top-billed cast + director for the movie detail modal."""
    cache_key = f"credits:{tmdb_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    if not TMDB_API_KEY:
        return {}
    try:
        resp = await client.get(
            f"{TMDB_BASE}/movie/{tmdb_id}/credits",
            params={"api_key": TMDB_API_KEY},
            timeout=8.0,
        )
        if resp.status_code != 200:
            return {}
        data = resp.json()
        cast = [
            {
                "id": c["id"],
                "name": c["name"],
                "character": c.get("character"),
                "profile_url": (
                    f"{TMDB_IMG_BASE}/w185{c['profile_path']}"
                    if c.get("profile_path") else None
                ),
            }
            for c in data.get("cast", [])[:8]
        ]
        director = next(
            (m["name"] for m in data.get("crew", []) if m.get("job") == "Director"),
            None,
        )
        result = {"cast": cast, "director": director}
        _cache_set(cache_key, result)
        return result
    except httpx.HTTPError:
        return {}


async def enrich_movies(rows: list[dict]) -> list[MovieCard]:
    """rows: list of {id, title, match_score?} from the ML step.
    Fetches TMDB details for all of them concurrently.
    """
    async with httpx.AsyncClient() as client:
        details = await asyncio_gather_details(client, rows)

    cards = []
    for row, extra in zip(rows, details):
        cards.append(MovieCard(
            id=row["id"],
            title=row["title"],
            match_score=row.get("match_score"),
            overview=extra.get("overview"),
            poster_url=extra.get("poster_url"),
            backdrop_url=extra.get("backdrop_url"),
            rating=extra.get("rating"),
            genres=extra.get("genres", []),
            release_date=extra.get("release_date"),
        ))
    return cards


async def asyncio_gather_details(client, rows):
    import asyncio
    tasks = [fetch_tmdb_details(client, r["id"]) for r in rows]
    return await asyncio.gather(*tasks)


# --------------------------------------------------------------------------
# Core unsupervised recommendation logic
# --------------------------------------------------------------------------
def get_recommendations(movie_title: str, top_n: int = 12) -> list[dict]:
    """Looks up the movie's row, pulls its cosine-similarity row against
    every other movie, sorts descending, and returns the top N (excluding
    itself) as {id, title, match_score}.
    """
    key = movie_title.strip().lower()
    if key not in title_to_index:
        raise HTTPException(
            status_code=404,
            detail=f"Movie '{movie_title}' not found in the trained catalog."
        )

    idx = title_to_index[key]
    sims = list(enumerate(similarity[idx]))
    sims.sort(key=lambda x: x[1], reverse=True)
    sims = [s for s in sims if s[0] != idx][:top_n]

    results = []
    for i, score in sims:
        row = movies_df.iloc[i]
        results.append({
            "id": int(row["id"]),
            "title": row["title"],
            "match_score": round(float(score) * 100, 1),
        })
    return results


# --------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "movies_loaded": len(movies_df)}


@app.get("/search")
def search_titles(query: str = Query(..., min_length=1)) -> list[str]:
    """Lightweight autocomplete used by the search bar before the user
    commits to a full recommendation lookup.
    """
    q = query.lower()
    matches = movies_df[movies_df["title"].str.lower().str.contains(q, na=False)]
    return matches["title"].head(10).tolist()


@app.get("/recommend", response_model=RecommendResponse)
async def recommend(
    movie_title: str = Query(..., description="Exact or partial movie title"),
    top_n: int = Query(12, ge=1, le=30),
):
    """Main endpoint: runs the unsupervised similarity lookup, then enriches
    each recommended movie with live TMDB poster/backdrop/rating data.
    """
    raw = get_recommendations(movie_title, top_n=top_n)
    enriched = await enrich_movies(raw)
    return RecommendResponse(query=movie_title, results=enriched)


@app.get("/movie/{tmdb_id}", response_model=MovieCard)
async def movie_details(tmdb_id: int):
    """Fetch a single movie's live TMDB details (used by the hero banner
    and 'More Info' modal)."""
    row = movies_df[movies_df["id"] == tmdb_id]
    title = row.iloc[0]["title"] if not row.empty else ""

    async with httpx.AsyncClient() as client:
        extra = await fetch_tmdb_details(client, tmdb_id)

    if not extra and not title:
        raise HTTPException(status_code=404, detail="Movie not found")

    return MovieCard(id=tmdb_id, title=title or extra.get("title", ""), **{
        k: v for k, v in extra.items() if k != "title"
    })


@app.get("/movie/{tmdb_id}/full", response_model=MovieDetail)
async def movie_full_details(tmdb_id: int):
    """Everything the detail modal needs in one call: live TMDB metadata
    plus top-billed cast and director (fetched concurrently)."""
    row = movies_df[movies_df["id"] == tmdb_id]
    title = row.iloc[0]["title"] if not row.empty else ""

    async with httpx.AsyncClient() as client:
        details, credits = await asyncio.gather(
            fetch_tmdb_details(client, tmdb_id),
            fetch_tmdb_credits(client, tmdb_id),
        )

    if not details and not title:
        raise HTTPException(status_code=404, detail="Movie not found")

    return MovieDetail(
        id=tmdb_id,
        title=title or details.get("title", ""),
        overview=details.get("overview"),
        poster_url=details.get("poster_url"),
        backdrop_url=details.get("backdrop_url"),
        rating=details.get("rating"),
        genres=details.get("genres", []),
        release_date=details.get("release_date"),
        runtime=details.get("runtime"),
        cast=[CastMember(**c) for c in credits.get("cast", [])],
        director=credits.get("director"),
    )


@app.get("/movie/{tmdb_id}/similar", response_model=RecommendResponse)
async def similar_by_id(tmdb_id: int, top_n: int = Query(12, ge=1, le=30)):
    """Same unsupervised cosine-similarity lookup as /recommend, but keyed
    by TMDB id instead of title — used by the detail modal's 'More Like
    This' row so the user doesn't have to retype the title.
    """
    if tmdb_id not in id_to_index:
        raise HTTPException(status_code=404, detail="Movie not found in trained catalog")

    idx = id_to_index[tmdb_id]
    title = movies_df.iloc[idx]["title"]
    raw = get_recommendations(title, top_n=top_n)
    enriched = await enrich_movies(raw)
    return RecommendResponse(query=title, results=enriched)


@app.get("/genres", response_model=list[str])
def list_genres():
    """All distinct genres present in the trained catalog — powers the
    Discover page's genre filter chips."""
    return all_genres


@app.get("/discover", response_model=DiscoverResponse)
async def discover(
    genre: Optional[str] = Query(None, description="Exact genre name, e.g. 'Action'"),
    sort_by: str = Query("popularity", pattern="^(popularity|rating)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(18, ge=1, le=40),
):
    """Browse the trained catalog by genre — a pure metadata filter/sort
    over the same unsupervised feature table (no live TMDB call needed to
    pick the set, only to render posters for the current page).
    """
    subset = movies_df
    if genre:
        subset = subset[subset["genres_list"].apply(lambda gl: genre in (gl or []))]

    sort_col = "popularity" if sort_by == "popularity" else "vote_average"
    subset = subset.sort_values(sort_col, ascending=False)

    total = len(subset)
    total_pages = max(1, (total + page_size - 1) // page_size)
    start = (page - 1) * page_size
    page_rows = subset.iloc[start:start + page_size]

    raw = [{"id": int(r["id"]), "title": r["title"]} for _, r in page_rows.iterrows()]
    enriched = await enrich_movies(raw)
    return DiscoverResponse(genre=genre, page=page, total_pages=total_pages, results=enriched)


@app.get("/trending", response_model=list[MovieCard])
async def trending(window: str = Query("week", pattern="^(day|week)$")):
    """Pulls TMDB's live trending list — used to populate the hero banner
    and a 'Trending Now' carousel with zero ML involvement (pure live data).
    """
    if not TMDB_API_KEY:
        raise HTTPException(status_code=503, detail="TMDB_API_KEY not configured")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{TMDB_BASE}/trending/movie/{window}",
                params={"api_key": TMDB_API_KEY},
                timeout=8.0,
            )
        if resp.status_code != 200:
            raise Exception("Non-200 response")
    except Exception as e:
        print(f"TMDB trending failed: {e}. Falling back to local data.")
        # Fallback to local most popular movies
        fallback_df = movies_df.sort_values("popularity", ascending=False).head(15)
        raw = [{"id": int(r["id"]), "title": r["title"]} for _, r in fallback_df.iterrows()]
        return await enrich_movies(raw)

    cards = []
    for m in resp.json().get("results", [])[:15]:
        cards.append(MovieCard(
            id=m["id"],
            title=m.get("title", ""),
            overview=m.get("overview"),
            poster_url=(f"{TMDB_IMG_BASE}/{POSTER_SIZE}{m['poster_path']}"
                        if m.get("poster_path") else None),
            backdrop_url=(f"{TMDB_IMG_BASE}/{BACKDROP_SIZE}{m['backdrop_path']}"
                          if m.get("backdrop_path") else None),
            rating=m.get("vote_average"),
            release_date=m.get("release_date"),
        ))
    return cards
