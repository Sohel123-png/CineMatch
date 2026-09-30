"""
train_model.py
================
Unsupervised Learning Movie Recommendation Engine (Content-Based Filtering)

Approach
--------
This is a *content-based, unsupervised* recommender. There is no labeled
"user liked / disliked" target — we never train against ground truth ratings.
Instead we:

  1. Engineer a combined textual "tag" per movie from genres, keywords,
     top cast, director, and overview.
  2. Vectorize all movie tags into a high-dimensional sparse matrix
     (Bag-of-Words via CountVectorizer — TF-IDF is offered as an alternative).
  3. Compute pairwise Cosine Similarity between every movie's vector.
     This is the unsupervised step: we are clustering/measuring proximity
     in feature space with no labels, exactly like a Nearest-Neighbors
     search over an unlabeled embedding space.
  4. Persist the processed DataFrame + similarity matrix as .pkl artifacts
     that the FastAPI backend loads at startup.

Dataset
-------
TMDB 5000 Movie Dataset (Kaggle):
  https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata
Download `tmdb_5000_movies.csv` and `tmdb_5000_credits.csv` and place them
in the `data/` folder before running this script.

Usage
-----
    cd ml
    pip install -r ../backend/requirements.txt
    python train_model.py
"""

import ast
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.neighbors import NearestNeighbors

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
ARTIFACT_DIR = BASE_DIR / "backend" / "artifacts"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

MOVIES_CSV = DATA_DIR / "tmdb_5000_movies.csv"
CREDITS_CSV = DATA_DIR / "tmdb_5000_credits.csv"

TOP_N_CAST = 3          # how many top-billed actors to include as features
MAX_VOCAB_FEATURES = 5000
N_NEIGHBORS = 11        # 1 self + 10 recommendations
N_CLUSTERS = 25         # KMeans "mood/theme" buckets for the Discover page
GENRE_BOOST = 2         # repeat genre tokens this many extra times so genre
                        # carries more weight than one-off overview words


# --------------------------------------------------------------------------
# Helper parsers for TMDB's stringified-JSON columns
# --------------------------------------------------------------------------
def parse_names(obj: str) -> list[str]:
    """Turn a stringified list of dicts like '[{"name": "Action"}, ...]'
    into ['Action', ...], stripping spaces so 'Science Fiction' becomes
    'ScienceFiction' — this prevents the vectorizer from confusing e.g.
    the genre 'Science Fiction' with the word 'Fiction' appearing elsewhere.
    Used for the *tags* fed into the vectorizer, not for display.
    """
    try:
        items = ast.literal_eval(obj) if isinstance(obj, str) else []
    except (ValueError, SyntaxError):
        return []
    return [str(i["name"]).replace(" ", "") for i in items]


def parse_names_display(obj: str) -> list[str]:
    """Same as parse_names but keeps natural spacing (e.g. 'Science
    Fiction') — used for the human-readable genre list shown in the UI
    and for the /genres and /discover filter endpoints.
    """
    try:
        items = ast.literal_eval(obj) if isinstance(obj, str) else []
    except (ValueError, SyntaxError):
        return []
    return [str(i["name"]) for i in items]


def parse_top_cast(obj: str, n: int = TOP_N_CAST) -> list[str]:
    try:
        items = ast.literal_eval(obj) if isinstance(obj, str) else []
    except (ValueError, SyntaxError):
        return []
    return [str(i["name"]).replace(" ", "") for i in items[:n]]


def parse_director(obj: str) -> list[str]:
    try:
        crew = ast.literal_eval(obj) if isinstance(obj, str) else []
    except (ValueError, SyntaxError):
        return []
    for member in crew:
        if member.get("job") == "Director":
            return [str(member["name"]).replace(" ", "")]
    return []


# --------------------------------------------------------------------------
# Main pipeline
# --------------------------------------------------------------------------
def main():
    if not MOVIES_CSV.exists() or not CREDITS_CSV.exists():
        raise FileNotFoundError(
            f"Expected dataset files not found.\n"
            f"Download the TMDB 5000 dataset from Kaggle and place:\n"
            f"  {MOVIES_CSV}\n  {CREDITS_CSV}\n"
        )

    print("Loading raw CSVs...")
    movies = pd.read_csv(MOVIES_CSV)
    credits = pd.read_csv(CREDITS_CSV)

    # Kaggle's credits file uses 'movie_id' + 'title'; merge on title, then
    # standardize on TMDB's numeric id (needed later to call the live API).
    credits = credits.rename(columns={"movie_id": "id"})
    df = movies.merge(credits[["id", "cast", "crew"]], on="id", how="left")

    keep_cols = ["id", "title", "overview", "genres", "keywords",
                 "cast", "crew", "vote_average", "vote_count",
                 "release_date", "popularity"]
    df = df[[c for c in keep_cols if c in df.columns]].copy()
    df.dropna(subset=["overview"], inplace=True)
    df.reset_index(drop=True, inplace=True)

    print(f"Loaded {len(df)} movies. Engineering features...")

    df["genres_list"] = df["genres"].apply(parse_names)
    df["genres_display"] = df["genres"].apply(parse_names_display)
    df["keywords_list"] = df["keywords"].apply(parse_names)
    df["cast_list"] = df["cast"].apply(parse_top_cast)
    df["director_list"] = df["crew"].apply(parse_director)
    df["overview_tokens"] = df["overview"].apply(lambda x: str(x).split())

    # Combine everything into one "tag soup" per movie — this is the feature
    # representation fed into the unsupervised vectorizer/similarity step.
    # Genres are repeated (GENRE_BOOST extra times) so two movies sharing a
    # genre pull noticeably closer together than two that merely share a
    # common overview word.
    df["tags"] = (
        df["overview_tokens"]
        + df["genres_list"] * (1 + GENRE_BOOST)
        + df["keywords_list"]
        + df["cast_list"]
        + df["director_list"]
    )
    df["tags"] = df["tags"].apply(lambda tokens: " ".join(tokens).lower())

    # Final lightweight table served to the API / frontend
    processed = df[["id", "title", "tags", "genres_display", "vote_average",
                     "vote_count", "release_date", "popularity"]].copy()
    processed.rename(columns={"genres_display": "genres_list"}, inplace=True)

    # ----------------------------------------------------------------
    # UNSUPERVISED STEP 1: Vectorize text into a Bag-of-Words matrix
    # ----------------------------------------------------------------
    print("Vectorizing tags (CountVectorizer, max_features="
          f"{MAX_VOCAB_FEATURES})...")
    vectorizer = CountVectorizer(max_features=MAX_VOCAB_FEATURES,
                                  stop_words="english")
    vectors = vectorizer.fit_transform(processed["tags"]).toarray()

    # ----------------------------------------------------------------
    # UNSUPERVISED STEP 2: Cosine similarity matrix (dense, for small
    # datasets like this 5000-movie set this is perfectly tractable:
    # ~5000 x 5000 floats ≈ 100MB).
    # ----------------------------------------------------------------
    print("Computing cosine similarity matrix...")
    similarity = cosine_similarity(vectors)

    # ----------------------------------------------------------------
    # UNSUPERVISED STEP 3 (alternative/complement): fit a NearestNeighbors
    # model too. This scales better for larger catalogs since it doesn't
    # require a full pairwise matrix, and is exposed as a fallback method
    # in the backend.
    # ----------------------------------------------------------------
    print("Fitting NearestNeighbors index...")
    nn_model = NearestNeighbors(n_neighbors=N_NEIGHBORS, metric="cosine",
                                 algorithm="brute")
    nn_model.fit(vectors)

    # ----------------------------------------------------------------
    # UNSUPERVISED STEP 4: K-Means clustering into "mood/theme" buckets.
    # This groups the whole catalog into N_CLUSTERS unlabeled groups purely
    # from the same feature vectors — no target variable — and powers a
    # "More like this vibe" / Discover-by-cluster feature in the API.
    # We first reduce dimensionality with TruncatedSVD (safe for sparse/
    # high-dimensional BoW vectors and much faster for KMeans to converge
    # on) before clustering.
    # ----------------------------------------------------------------
    print(f"Reducing dimensionality (SVD) and fitting KMeans "
          f"(k={N_CLUSTERS})...")
    n_components = min(100, vectors.shape[1] - 1)
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    reduced_vectors = svd.fit_transform(vectors)

    kmeans = KMeans(n_clusters=N_CLUSTERS, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(reduced_vectors)
    processed["cluster"] = cluster_labels

    # ----------------------------------------------------------------
    # Persist artifacts
    # ----------------------------------------------------------------
    print(f"Saving artifacts to {ARTIFACT_DIR} ...")
    processed.to_pickle(ARTIFACT_DIR / "movies.pkl")

    with open(ARTIFACT_DIR / "similarity.pkl", "wb") as f:
        pickle.dump(similarity.astype(np.float32), f)

    with open(ARTIFACT_DIR / "nn_model.pkl", "wb") as f:
        pickle.dump(nn_model, f)

    with open(ARTIFACT_DIR / "vectors.pkl", "wb") as f:
        pickle.dump(vectors.astype(np.float32), f)

    with open(ARTIFACT_DIR / "kmeans_model.pkl", "wb") as f:
        pickle.dump({"kmeans": kmeans, "svd": svd}, f)

    print("Done. Artifacts written:")
    for f in ARTIFACT_DIR.glob("*.pkl"):
        print(f"  - {f.name} ({f.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
