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

  // Split a stored name like "Doctor Who (2005)" into { clean: "Doctor Who", year: "2005" }.
  function parseName(name) {
    const m = String(name || "").match(/\((\d{4})\)\s*$/);
    const year = m ? m[1] : "";
    const clean = String(name || "").replace(/\s*\(\d{4}\)\s*$/, "").trim();
    return { clean: clean || String(name || "").trim(), year };
  }

  function normalize(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  // Returns [{ tmdbId, name, year, poster, overview }]
  async function search(query) {
    const { clean, year } = parseName(query);
    const params = { query: clean, include_adult: "false" };
    if (year) params.first_air_date_year = year;
    const data = await req("/search/tv", params);
    return (data.results || []).slice(0, 12).map((r) => ({
      tmdbId: r.id,
      name: r.name,
      year: (r.first_air_date || "").slice(0, 4),
      poster: r.poster_path || "",
      overview: r.overview || "",
    }));
  }

  // Best single match for a stored show name — used by the bulk "Fetch posters" action.
  // Prefers an exact (normalized) name match, then a matching year, then the top result.
  async function searchBest(name) {
    const { clean, year } = parseName(name);
    let results = await search(name);
    // If the year filter was too strict and returned nothing, retry without it.
    if (results.length === 0 && year) {
      const data = await req("/search/tv", { query: clean, include_adult: "false" });
      results = (data.results || []).slice(0, 12).map((r) => ({
        tmdbId: r.id,
        name: r.name,
        year: (r.first_air_date || "").slice(0, 4),
        poster: r.poster_path || "",
        overview: r.overview || "",
      }));
    }
    if (results.length === 0) return null;

    const target = normalize(clean);
    const exact = results.filter((r) => normalize(r.name) === target);
    if (exact.length) {
      if (year) {
        const byYear = exact.find((r) => r.year === year);
        if (byYear) return byYear;
      }
      return exact[0];
    }
    if (year) {
      const byYear = results.find((r) => r.year === year);
      if (byYear) return byYear;
    }
    return results[0];
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

  return { enabled, posterUrl, search, searchBest, details };
})();

