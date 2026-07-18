// TMDB (The Movie Database) integration — search shows, get posters & episode counts.
// Uses a free v3 API key that the user enters in Settings (stored in localStorage).
// Docs: https://developer.themoviedb.org/docs

const TMDB = (() => {
  const BASE = "https://api.themoviedb.org/3";
  const IMG = "https://image.tmdb.org/t/p"; // + /w154 + poster_path

  function key() {
    return (Settings.get().tmdbKey || "").trim();
  }

  function enabled() {
    return key().length > 0;
  }

  function posterUrl(path, size = "w154") {
    if (!path) return "";
    return `${IMG}/${size}${path}`;
  }

  async function req(path, params = {}) {
    if (!enabled()) throw new Error("No TMDB API key set");
    const url = new URL(BASE + path);
    url.searchParams.set("api_key", key());
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`TMDB ${res.status}`);
    return res.json();
  }

  // Returns [{ tmdbId, name, year, poster, overview }]
  async function search(query) {
    const data = await req("/search/tv", { query, include_adult: "false" });
    return (data.results || []).slice(0, 12).map((r) => ({
      tmdbId: r.id,
      name: r.name,
      year: (r.first_air_date || "").slice(0, 4),
      poster: r.poster_path || "",
      overview: r.overview || "",
    }));
  }

  // Returns { poster, totalEpisodes, totalSeasons, year, name }
  async function details(tmdbId) {
    const d = await req(`/tv/${tmdbId}`);
    return {
      name: d.name,
      poster: d.poster_path || "",
      totalEpisodes: d.number_of_episodes || 0,
      totalSeasons: d.number_of_seasons || 0,
      year: (d.first_air_date || "").slice(0, 4),
    };
  }

  return { enabled, posterUrl, search, details };
})();
