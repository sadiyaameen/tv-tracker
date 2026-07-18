// Google Drive sync — stores one JSON file in the app's private Drive folder
// (the "appDataFolder", hidden from the rest of your Drive). Uses Google Identity
// Services for OAuth in the browser. No server required.
//
// Requires a Google OAuth Client ID (entered in Settings). Setup steps are in README.

const Drive = (() => {
  const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
  const FILE_NAME = "tv-tracker.json";

  let tokenClient = null;
  let accessToken = null;
  let tokenExpiry = 0;
  let fileId = null;
  let gisReady = false;

  function clientId() {
    return (Settings.get().googleClientId || "").trim();
  }

  function configured() {
    return clientId().length > 0;
  }

  function connected() {
    return !!accessToken && Date.now() < tokenExpiry - 60000;
  }

  // Wait for the Google Identity Services script to load.
  function waitForGIS() {
    return new Promise((resolve, reject) => {
      if (window.google && google.accounts && google.accounts.oauth2) return resolve();
      let tries = 0;
      const t = setInterval(() => {
        if (window.google && google.accounts && google.accounts.oauth2) {
          clearInterval(t);
          resolve();
        } else if (++tries > 40) {
          clearInterval(t);
          reject(new Error("Google sign-in script did not load"));
        }
      }, 100);
    });
  }

  async function initClient() {
    if (!configured()) throw new Error("No Google Client ID set");
    await waitForGIS();
    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId(),
        scope: SCOPE,
        callback: () => {}, // replaced per-request
      });
      gisReady = true;
    }
  }

  // interactive=true shows the Google consent popup; false tries silently.
  function requestToken(interactive) {
    return new Promise((resolve, reject) => {
      tokenClient.callback = (resp) => {
        if (resp.error) return reject(new Error(resp.error));
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000;
        resolve(accessToken);
      };
      try {
        tokenClient.requestAccessToken({ prompt: interactive ? "consent" : "" });
      } catch (e) {
        reject(e);
      }
    });
  }

  async function ensureToken(interactive) {
    if (connected()) return accessToken;
    await initClient();
    return requestToken(interactive);
  }

  async function findFile(token) {
    const url =
      "https://www.googleapis.com/drive/v3/files" +
      "?spaces=appDataFolder&fields=files(id,modifiedTime,name)" +
      `&q=${encodeURIComponent(`name='${FILE_NAME}'`)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Drive list ${res.status}`);
    const data = await res.json();
    return (data.files || [])[0] || null;
  }

  async function downloadFile(token, id) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Drive download ${res.status}`);
    return res.json();
  }

  async function uploadFile(token, id, contentObj) {
    const boundary = "----tvtracker" + Date.now();
    const metadata = id
      ? { name: FILE_NAME }
      : { name: FILE_NAME, parents: ["appDataFolder"] };
    const body =
      `--${boundary}\r\n` +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\n` +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(contentObj) +
      `\r\n--${boundary}--`;
    const url = id
      ? `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=multipart&fields=id,modifiedTime`
      : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime";
    const res = await fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!res.ok) throw new Error(`Drive upload ${res.status}`);
    return res.json();
  }

  // Connect (interactive) — used by the "Connect Google Drive" button.
  async function connect() {
    await ensureToken(true);
    return true;
  }

  // Pull remote data. Returns the remote state object, or null if none exists.
  async function pull() {
    const token = await ensureToken(false);
    const file = await findFile(token);
    if (!file) {
      fileId = null;
      return null;
    }
    fileId = file.id;
    return downloadFile(token, file.id);
  }

  // Push local state object to Drive.
  async function push(stateObj) {
    const token = await ensureToken(false);
    if (!fileId) {
      const existing = await findFile(token);
      if (existing) fileId = existing.id;
    }
    const result = await uploadFile(token, fileId, stateObj);
    if (result && result.id) fileId = result.id;
    return result;
  }

  return { configured, connected, connect, pull, push };
})();
