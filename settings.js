// Small settings store (API keys + preferences) kept in localStorage.
// Keys are only stored on your own device — they are never committed to GitHub.

const Settings = (() => {
  const KEY = "tvtracker.settings";
  const defaults = {
    tmdbKey: "",
    googleClientId: "",
    autoSync: false,
  };

  function get() {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
    } catch {
      return { ...defaults };
    }
  }

  function set(patch) {
    const next = { ...get(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }

  return { get, set };
})();
