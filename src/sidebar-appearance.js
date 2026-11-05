(function (root) {
  'use strict';
  const key = 'ai-sidebar-theme-v1';
  function readTheme(storage, fallback = 'light') {
    try { const value = storage.getItem(key); if (value === 'light' || value === 'dark') return value; } catch {}
    return fallback === 'dark' ? 'dark' : 'light';
  }
  function saveTheme(storage, value) {
    const theme = value === 'dark' ? 'dark' : 'light';
    try { storage.setItem(key, theme); } catch {}
    return theme;
  }
  const api = Object.freeze({ readTheme, saveTheme });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SidebarAppearance = api;
})(typeof window === 'object' ? window : globalThis);
