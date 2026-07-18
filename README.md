# 📺 TV Tracker

A tiny personal web app to track the TV shows you watch. It runs in the browser,
installs to your iPhone home screen like an app (PWA), and is hosted for free on
GitHub Pages. Your data is stored on your device and can be exported/imported as a
JSON backup.

> All AI output must be human reviewed

---

## What you get right now

- A list of your **705 shows** (imported from your old export).
- Search, filter by status (Watching / Completed / Plan to watch / Dropped) and Favorites.
- Tap **＋** on a show to add a watched episode, tap a show to edit it, tap **★** to favorite.
- **Add / edit / delete** shows.
- **Posters & episode counts from TMDB** — search shows when adding, or bulk-fetch
  posters for your whole library (optional, see Part D).
- **Automatic Google Drive sync** to a private folder in your own Drive (optional, see Part E).
- **Export** a backup file and **Import** it back (a manual backup option too).
- Works **offline** once installed.

---

## Project structure

```
index.html            The app screen
styles.css            Styling
app.js                Main app logic
settings.js           Stores your API keys locally
tmdb.js               TMDB search / posters / episode data
drive.js              Google Drive sync
manifest.webmanifest  Makes it installable as an app
service-worker.js     Offline support
data/shows.json       Your shows (the seed data)
icons/                App icons
scripts/              Helper scripts (data conversion, icon generation)
gdpr-data/            Your raw export — NEVER uploaded (blocked by .gitignore)
```

---

## ⚠️ Privacy — read this first

Your `gdpr-data/` folder contains **passwords, Facebook tokens, your email, and IP
addresses**. The included `.gitignore` blocks that folder so it will **never** be
uploaded. Do not remove that line.

`data/shows.json` only contains your **show names, episode counts, and ratings** —
no logins. It *will* be uploaded so the app is pre-filled. If you'd rather not have
even your show list public, make your GitHub repo **Private** (Step 2 mentions how).

---

## Part A — Run it on your computer first (optional but recommended)

1. Open the Terminal in this folder.
2. Start a local server:
   ```
   python3 -m http.server 8123
   ```
3. Open http://localhost:8123 in your browser. You should see your shows.
4. Press `Ctrl + C` in the Terminal to stop it when done.

---

## Part B — Put it online with GitHub Pages

You only do this once.

### Step 1 — Create a GitHub account
Go to https://github.com and sign up (free) if you don't already have one.

### Step 2 — Create a new repository
1. Click the **+** (top-right) → **New repository**.
2. Name it e.g. `tv-tracker`.
3. Choose **Private** if you want your show list kept off the public web
   (GitHub Pages still works). Choose **Public** if you don't mind.
4. Click **Create repository**.

### Step 3 — Upload the project files
Easiest (no command line):
1. On the new repo page, click **uploading an existing file**.
2. In Finder, open this `TV-Tracking` folder and select **everything EXCEPT the
   `gdpr-data` folder** (files: `index.html`, `styles.css`, `app.js`,
   `manifest.webmanifest`, `service-worker.js`, `.gitignore`, `.nojekyll`,
   and the `data`, `icons`, `scripts` folders).
3. Drag them into the browser upload area.
4. Click **Commit changes**.

<details>
<summary>Or, if you're comfortable with Git in the Terminal</summary>

```
cd /Users/sadiya/Desktop/TV-Tracking
git init
git add .
git commit -m "Initial TV Tracker"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/tv-tracker.git
git push -u origin main
```
The `.gitignore` already prevents `gdpr-data/` from being pushed.
</details>

### Step 4 — Turn on GitHub Pages
1. In the repo, go to **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Branch: **main**, folder: **/ (root)**. Click **Save**.
4. Wait ~1 minute. The page will show your live URL, like:
   `https://YOUR-USERNAME.github.io/tv-tracker/`

Open that URL — your app is live. 🎉

---

## Part C — Install it on your iPhone

1. Open the GitHub Pages URL in **Safari** on your iPhone.
2. Tap the **Share** button (the square with an arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**. You now have a "TV Tracker" icon that opens full-screen like an app.

---

## Backups (your data safety net)

Your shows live in the browser on your phone. To back up:
1. In the app, tap **⋯ → Export data**. A `.json` file is saved.
2. Put that file in **Google Drive / iCloud / email it to yourself**.
3. To restore (or move to a new phone): **⋯ → Import data** and pick the file.

---

## Part D — Posters & episode data (TMDB) — optional

This lets you search for shows when adding them (with posters) and auto-fill
episode counts, plus a one-tap "fetch posters" for your whole library.

### Step 1 — Get a free TMDB API key
1. Create a free account at https://www.themoviedb.org/signup.
2. Go to **Settings → API** (https://www.themoviedb.org/settings/api).
3. Request an API key (choose "Developer", personal use). Fill the short form.
4. Copy the **API Key (v3 auth)** — a long string of letters/numbers.

### Step 2 — Add it to the app
1. Open the app, tap **⋯ → Settings (API keys)**.
2. Paste the key into **TMDB API key**, tap **Save**.

Now:
- Tap **＋** to add a show → type a name → pick from the search results (poster and
  episode count fill in automatically).
- To add posters to your existing 705 shows, tap **⋯ → Fetch posters & episode
  counts**. It runs in the background; you can leave it and it will keep going.
  Run it again any time to fill in any that were missed.

> Your TMDB key is stored only on your device (never committed to GitHub).

---

## Part E — Automatic Google Drive sync — optional

This saves your data to a **private, hidden folder in your own Google Drive** and
keeps multiple devices in sync. Nothing is shared publicly and no server is needed.

### Step 1 — Create a Google Cloud project
1. Go to https://console.cloud.google.com/ and sign in.
2. Top bar → project dropdown → **New Project** → name it e.g. `tv-tracker` → **Create**.

### Step 2 — Enable the Drive API
1. Left menu → **APIs & Services → Library**.
2. Search **Google Drive API** → open it → **Enable**.

### Step 3 — Configure the consent screen
1. **APIs & Services → OAuth consent screen**.
2. User type: **External** → **Create**.
3. Fill App name (`TV Tracker`), your email for support + developer contact → **Save and continue**.
4. Scopes: skip (**Save and continue**).
5. **Test users → Add users →** add your own Google email → **Save and continue**.
   (Keeping it in "Testing" mode is fine for personal use.)

### Step 4 — Create an OAuth Client ID
1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Under **Authorized JavaScript origins**, add BOTH:
   - `http://localhost:8123` (for local testing)
   - `https://YOUR-USERNAME.github.io` (your GitHub Pages origin — no path, just the origin)
4. Click **Create** and copy the **Client ID** (ends in `.apps.googleusercontent.com`).

### Step 5 — Turn it on in the app
1. App → **⋯ → Settings (API keys)**.
2. Paste the Client ID into **Google OAuth Client ID**.
3. Tick **Auto-sync to Google Drive on changes**.
4. Tap **Connect Google Drive** → sign in and approve.
5. The little cloud icon (top-right) shows sync status: `☁︎` synced, `⟳` working, `⚠︎` error.

From then on, changes sync automatically, and opening the app on another device
(with the same Client ID + signed in) pulls your latest data. You can also force a
sync with **⋯ → Sync with Google Drive now**.

> Note: because the app stays in Google's "Testing" mode, you may be asked to
> re-approve every so often — that's normal and fine for personal use.

---

## Re-generating the seed data or icons (only if you need to)


From this folder:
```
node scripts/convert-data.mjs    # rebuilds data/shows.json from gdpr-data/
node scripts/generate-icons.mjs  # rebuilds the app icons
```

---

## Where this can go next (ideas for later)

- **Per-season / "up next" episode tracking** using TMDB season data.
- Watch statistics and charts.
- Sort options (by rating, recently added, most episodes).
- Publish the Google app (out of "Testing" mode) if you want sync without re-approvals.

Start simple, use it for a while, then pick the next feature you actually miss.
