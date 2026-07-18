// TV Tracker – simple client-side app.
// Data lives in the browser (localStorage). First run seeds from data/shows.json.
// Export/Import lets you back up (e.g. to Google Drive) and restore.

const STORAGE_KEY = "tvtracker.v1";
const SEED_URL = "data/shows.json";

let state = { version: 1, shows: [] };
let filter = "all";
let query = "";

// ---------- storage ----------
function save({ sync = true } = {}) {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (sync) scheduleSync();
}

async function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      state = JSON.parse(raw);
      if (!Array.isArray(state.shows)) throw new Error("bad data");
      return;
    } catch {
      /* fall through to seed */
    }
  }
  await seedFromBundle();
}

async function seedFromBundle() {
  try {
    const res = await fetch(SEED_URL, { cache: "no-store" });
    const data = await res.json();
    state = { version: 1, shows: data.shows || [] };
  } catch {
    state = { version: 1, shows: [] };
  }
  save();
}

// ---------- helpers ----------
function uid() {
  return "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function ratingStars(r) {
  if (!r) return "";
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  return "★".repeat(full) + (half ? "½" : "");
}

function matches(show) {
  if (query && !show.name.toLowerCase().includes(query)) return false;
  if (filter === "all") return true;
  if (filter === "favorite") return !!show.favorite;
  return show.status === filter;
}

// ---------- rendering ----------
const listEl = document.getElementById("list");
const statsEl = document.getElementById("stats");

function render() {
  const shows = state.shows.filter(matches).sort((a, b) => {
    if (!!b.favorite !== !!a.favorite) return b.favorite ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  statsEl.textContent =
    `${state.shows.length} shows · ` +
    `${state.shows.filter((s) => s.status === "watching").length} watching · ` +
    `${state.shows.filter((s) => s.status === "completed").length} completed`;

  if (shows.length === 0) {
    listEl.innerHTML = `<div class="empty">No shows here yet.<br>Tap ＋ to add one.</div>`;
    return;
  }

  listEl.innerHTML = shows
    .map(
      (s) => `
    <div class="card" data-id="${s.id}">
      ${posterHtml(s)}
      <div class="card-main" data-edit>
        <div class="card-title">${escapeHtml(s.name)}</div>
        <div class="card-sub">
          <span class="badge ${s.status}">${s.status}</span>
          <span>${s.episodesSeen}${s.totalEpisodes ? "/" + s.totalEpisodes : ""} ep</span>
          ${s.rating ? `<span class="rating">${ratingStars(s.rating)}</span>` : ""}
        </div>
      </div>
      <div class="card-actions">
        <button class="fav-btn ${s.favorite ? "on" : ""}" data-fav aria-label="Favorite">★</button>
        <button class="plus-btn" data-plus aria-label="Add episode">＋</button>
      </div>
    </div>`
    )
    .join("");
}

function posterHtml(s) {
  if (s.poster) {
    return `<img class="poster" loading="lazy" src="${TMDB.posterUrl(s.poster)}" alt="" />`;
  }
  return `<div class="poster placeholder">🎬</div>`;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ---------- interactions ----------
function findShow(id) {
  return state.shows.find((s) => s.id === id);
}

listEl.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  const show = findShow(card.dataset.id);
  if (!show) return;

  if (e.target.closest("[data-fav]")) {
    show.favorite = !show.favorite;
    save();
    render();
  } else if (e.target.closest("[data-plus]")) {
    show.episodesSeen = (show.episodesSeen || 0) + 1;
    save();
    render();
    toast(`+1 · ${show.name} (${show.episodesSeen})`);
  } else if (e.target.closest("[data-edit]")) {
    openEdit(show);
  }
});

// filters
document.getElementById("filters").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  filter = chip.dataset.filter;
  render();
});

// search
document.getElementById("search").addEventListener("input", (e) => {
  query = e.target.value.trim().toLowerCase();
  render();
});

// ---------- edit / add sheet ----------
const editSheet = document.getElementById("editSheet");
let editingId = null;
let editDraft = {}; // holds tmdbId / poster / totalEpisodes / year while editing

function openEdit(show) {
  editingId = show ? show.id : null;
  editDraft = show
    ? { tmdbId: show.tmdbId, poster: show.poster, totalEpisodes: show.totalEpisodes, year: show.year }
    : {};
  document.getElementById("editTitle").textContent = show ? "Edit show" : "Add show";
  document.getElementById("f_name").value = show ? show.name : "";
  document.getElementById("f_status").value = show ? show.status : "watching";
  document.getElementById("f_episodes").value = show ? show.episodesSeen : 0;
  document.getElementById("f_rating").value = show ? show.rating : 0;
  document.getElementById("f_favorite").checked = show ? !!show.favorite : false;
  document.getElementById("deleteBtn").style.display = show ? "" : "none";

  // TMDB search only appears when adding a new show and a key is set.
  const searchWrap = document.getElementById("tmdbSearchWrap");
  document.getElementById("tmdbQuery").value = "";
  document.getElementById("tmdbResults").innerHTML = "";
  searchWrap.classList.toggle("hidden", !!show || !TMDB.enabled());

  editSheet.classList.remove("hidden");
}

document.getElementById("saveBtn").addEventListener("click", () => {
  const name = document.getElementById("f_name").value.trim();
  if (!name) {
    toast("Name is required");
    return;
  }
  const values = {
    name,
    status: document.getElementById("f_status").value,
    episodesSeen: Math.max(0, parseInt(document.getElementById("f_episodes").value, 10) || 0),
    rating: Math.min(5, Math.max(0, parseFloat(document.getElementById("f_rating").value) || 0)),
    favorite: document.getElementById("f_favorite").checked,
    tmdbId: editDraft.tmdbId,
    poster: editDraft.poster,
    totalEpisodes: editDraft.totalEpisodes,
    year: editDraft.year,
  };

  if (editingId) {
    Object.assign(findShow(editingId), values);
  } else {
    state.shows.push({ id: uid(), followed: true, addedAt: today(), ...values });
  }
  save();
  render();
  closeSheets();
});

// TMDB live search inside the add dialog
let tmdbTimer;
document.getElementById("tmdbQuery").addEventListener("input", (e) => {
  const q = e.target.value.trim();
  clearTimeout(tmdbTimer);
  if (q.length < 2) {
    document.getElementById("tmdbResults").innerHTML = "";
    return;
  }
  tmdbTimer = setTimeout(() => runTmdbSearch(q), 350);
});

async function runTmdbSearch(q) {
  const box = document.getElementById("tmdbResults");
  box.innerHTML = `<div class="hint">Searching…</div>`;
  try {
    const results = await TMDB.search(q);
    if (results.length === 0) {
      box.innerHTML = `<div class="hint">No matches.</div>`;
      return;
    }
    box.innerHTML = results
      .map(
        (r, i) => `
      <button class="tmdb-result" data-idx="${i}">
        ${
          r.poster
            ? `<img src="${TMDB.posterUrl(r.poster, "w92")}" alt="" />`
            : `<span class="noimg">🎬</span>`
        }
        <span>
          <span class="t-name">${escapeHtml(r.name)}</span>
          <span class="t-year">${r.year || ""}</span>
        </span>
      </button>`
      )
      .join("");
    box.querySelectorAll(".tmdb-result").forEach((btn) => {
      btn.addEventListener("click", () => pickTmdb(results[+btn.dataset.idx]));
    });
  } catch (err) {
    box.innerHTML = `<div class="hint">Search failed — check your TMDB key.</div>`;
  }
}

async function pickTmdb(r) {
  document.getElementById("f_name").value = r.name;
  editDraft.tmdbId = r.tmdbId;
  editDraft.poster = r.poster;
  editDraft.year = r.year;
  document.getElementById("tmdbResults").innerHTML = `<div class="hint">Loading episode count…</div>`;
  try {
    const d = await TMDB.details(r.tmdbId);
    editDraft.totalEpisodes = d.totalEpisodes;
    if (d.poster) editDraft.poster = d.poster;
    document.getElementById("tmdbResults").innerHTML =
      `<div class="hint">Added details: ${d.totalEpisodes} episodes.</div>`;
  } catch {
    document.getElementById("tmdbResults").innerHTML = "";
  }
}


document.getElementById("deleteBtn").addEventListener("click", () => {
  if (!editingId) return;
  if (!confirm("Delete this show?")) return;
  state.shows = state.shows.filter((s) => s.id !== editingId);
  save();
  render();
  closeSheets();
});

document.getElementById("addBtn").addEventListener("click", () => openEdit(null));

// ---------- menu ----------
const menuSheet = document.getElementById("menuSheet");
document.getElementById("menuBtn").addEventListener("click", () =>
  menuSheet.classList.remove("hidden")
);

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tv-tracker-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  closeSheets();
});

document.getElementById("importBtn").addEventListener("click", () =>
  document.getElementById("importFile").click()
);

document.getElementById("importFile").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.shows)) throw new Error("Invalid file");
    state = { version: 1, shows: data.shows };
    save();
    render();
    toast(`Imported ${data.shows.length} shows`);
  } catch {
    toast("Could not read that file");
  }
  closeSheets();
  e.target.value = "";
});

document.getElementById("resetBtn").addEventListener("click", async () => {
  if (!confirm("Replace current data with the bundled show list?")) return;
  await seedFromBundle();
  render();
  toast("Reloaded bundled data");
  closeSheets();
});

// ---------- settings ----------
const settingsSheet = document.getElementById("settingsSheet");
document.getElementById("settingsBtn").addEventListener("click", () => {
  const s = Settings.get();
  document.getElementById("s_tmdb").value = s.tmdbKey;
  document.getElementById("s_client").value = s.googleClientId;
  document.getElementById("s_autosync").checked = s.autoSync;
  menuSheet.classList.add("hidden");
  settingsSheet.classList.remove("hidden");
});

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  Settings.set({
    tmdbKey: document.getElementById("s_tmdb").value.trim(),
    googleClientId: document.getElementById("s_client").value.trim(),
    autoSync: document.getElementById("s_autosync").checked,
  });
  toast("Settings saved");
  closeSheets();
  updateSyncStatus();
});

document.getElementById("connectDriveBtn").addEventListener("click", async () => {
  // Persist whatever is typed before connecting.
  Settings.set({
    tmdbKey: document.getElementById("s_tmdb").value.trim(),
    googleClientId: document.getElementById("s_client").value.trim(),
    autoSync: document.getElementById("s_autosync").checked,
  });
  if (!Drive.configured()) {
    toast("Enter your Google Client ID first");
    return;
  }
  try {
    setSyncStatus("busy");
    await Drive.connect();
    await syncNow(true);
    toast("Google Drive connected");
  } catch (e) {
    setSyncStatus("err");
    toast("Drive connection failed");
  }
});

// ---------- Google Drive sync ----------
let syncTimer = null;
let syncing = false;

function scheduleSync() {
  if (!Settings.get().autoSync || !Drive.configured()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow(false), 2000);
}

async function syncNow(interactive) {
  if (!Drive.configured()) {
    if (interactive) toast("Set up Google Drive in Settings first");
    return;
  }
  if (syncing) return;
  syncing = true;
  setSyncStatus("busy");
  try {
    if (interactive && !Drive.connected()) await Drive.connect();
    const remote = await Drive.pull();
    const localTime = Date.parse(state.updatedAt || 0) || 0;
    const remoteTime = remote ? Date.parse(remote.updatedAt || 0) || 0 : -1;

    if (remote && remoteTime > localTime) {
      // Remote is newer → adopt it.
      state = { version: 1, updatedAt: remote.updatedAt, shows: remote.shows || [] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      render();
    } else {
      // Local is newer or remote missing → push.
      await Drive.push(state);
    }
    setSyncStatus("ok");
    if (interactive) toast("Synced with Google Drive");
  } catch (e) {
    setSyncStatus("err");
    if (interactive) toast("Sync failed — try Connect in Settings");
  } finally {
    syncing = false;
  }
}

document.getElementById("syncNowBtn").addEventListener("click", () => {
  closeSheets();
  syncNow(true);
});

function setSyncStatus(kind) {
  const el = document.getElementById("syncStatus");
  const map = { ok: "☁︎", busy: "⟳", err: "⚠︎" };
  el.textContent = map[kind] || "";
  el.className = "sync-status " + (kind || "");
}

function updateSyncStatus() {
  if (Drive.configured()) setSyncStatus(Drive.connected() ? "ok" : "");
  else setSyncStatus("");
}

// ---------- backfill posters & episode counts from TMDB ----------
let backfilling = false;
document.getElementById("fetchBtn").addEventListener("click", async () => {
  closeSheets();
  if (!TMDB.enabled()) {
    toast("Add your TMDB key in Settings first");
    return;
  }
  if (backfilling) return;
  backfilling = true;

  const todo = state.shows.filter((s) => !s.poster || !s.totalEpisodes);
  if (todo.length === 0) {
    toast("All shows already have posters");
    backfilling = false;
    return;
  }

  let done = 0;
  for (const s of todo) {
    try {
      const results = await TMDB.search(s.name);
      if (results[0]) {
        s.tmdbId = results[0].tmdbId;
        s.poster = results[0].poster || s.poster;
        s.year = results[0].year || s.year;
        const d = await TMDB.details(results[0].tmdbId);
        if (d.totalEpisodes) s.totalEpisodes = d.totalEpisodes;
        if (d.poster) s.poster = d.poster;
      }
    } catch {
      /* skip this show */
    }
    done++;
    if (done % 10 === 0) {
      save({ sync: false });
      render();
      toast(`Fetching… ${done}/${todo.length}`);
    }
    await sleep(140); // be gentle with the API
  }
  save();
  render();
  toast(`Done — updated ${done} shows`);
  backfilling = false;
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}


// close sheets on backdrop / cancel
document.querySelectorAll(".sheet").forEach((sheet) => {
  sheet.addEventListener("click", (e) => {
    if (e.target === sheet || e.target.hasAttribute("data-close")) closeSheets();
  });
});
function closeSheets() {
  menuSheet.classList.add("hidden");
  editSheet.classList.add("hidden");
  settingsSheet.classList.add("hidden");
  editingId = null;
}

// ---------- misc ----------
function today() {
  return new Date().toISOString().slice(0, 10);
}

let toastTimer;
function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

// ---------- boot ----------
(async function init() {
  await load();
  render();
  updateSyncStatus();
  // If Drive is set up and auto-sync is on, pull latest on startup.
  if (Drive.configured() && Settings.get().autoSync) {
    syncNow(false);
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
})();
