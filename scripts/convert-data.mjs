// Converts the raw TVShowTime GDPR CSV export into a single seed file the app can load.
// Usage:  node scripts/convert-data.mjs
// Reads from ../gdpr-data, writes ../data/shows.json
//
// Only show-level info is extracted (name, followed/favorite flags, episodes seen,
// rating). No credentials, emails, tokens or IP addresses are ever read or written.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "gdpr-data");
const outDir = join(__dirname, "..", "data");

// --- tiny CSV parser (handles quoted fields, commas and newlines inside quotes) ---
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); field = "";
      rows.push(row); row = [];
    } else if (c === "\r") {
      // ignore
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function readTable(name) {
  const text = readFileSync(join(dataDir, name), "utf8");
  const rows = parseCSV(text);
  const header = rows.shift().map((h) => h.trim());
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

// --- load the tables we care about ---
const showRows = readTable("user_tv_show_data.csv");
const ratingRows = readTable("tv_show_rate.csv");
const followedRows = readTable("followed_tv_show.csv");

// rating by tv_show_id
const ratingById = new Map();
for (const r of ratingRows) {
  const id = String(r.tv_show_id || "").trim();
  const val = parseFloat(r.rating);
  if (id && !Number.isNaN(val)) ratingById.set(id, val);
}

// added date + archived flag by tv_show_id
const metaById = new Map();
for (const r of followedRows) {
  const id = String(r.tv_show_id || "").trim();
  if (!id) continue;
  metaById.set(id, {
    addedAt: (r.created_at || "").slice(0, 10),
    archived: r.archived === "1",
  });
}

const shows = showRows
  .map((r) => {
    const id = String(r.tv_show_id || "").trim();
    const meta = metaById.get(id) || {};
    const favorite = r.is_favorited === "1";
    let status = "watching";
    if (meta.archived) status = "completed";
    return {
      id,
      name: (r.tv_show_name || "").trim(),
      followed: r.is_followed === "1",
      favorite,
      episodesSeen: parseInt(r.nb_episodes_seen || "0", 10) || 0,
      rating: ratingById.get(id) || 0,
      status,
      addedAt: meta.addedAt || "",
    };
  })
  .filter((s) => s.id && s.name)
  .sort((a, b) => a.name.localeCompare(b.name));

const out = {
  version: 1,
  exportedAt: new Date().toISOString(),
  shows,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "shows.json"), JSON.stringify(out, null, 2));

console.log(`Wrote ${shows.length} shows to data/shows.json`);
console.log(`  followed:  ${shows.filter((s) => s.followed).length}`);
console.log(`  favorite:  ${shows.filter((s) => s.favorite).length}`);
console.log(`  rated:     ${shows.filter((s) => s.rating > 0).length}`);
