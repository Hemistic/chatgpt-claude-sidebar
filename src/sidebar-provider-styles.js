(function () {
  "use strict";
  function apply(provider) {
    const active = provider === "claude" ? "claude" : "codex";
    for (const link of document.querySelectorAll("link[data-provider-style]")) {
      const enabled = link.dataset.providerStyle === active;
      const media = enabled ? 'all' : 'not all';
      // Changing the link's media attribute makes Chromium reprocess its load
      // asynchronously, including nested imports. Switch the already parsed
      // CSSStyleSheet through CSSOM instead: the new provider's rules then apply
      // in the same commit, without an unstyled frame or mixed provider sheets.
      if (link.sheet) {
        if (link.sheet.media.mediaText !== media) link.sheet.media.mediaText = media;
      } else if (link.media !== media) link.media = media; // startup only
      link.dataset.providerStyleActive = String(enabled);
    }
    document.documentElement.dataset.sidebarProvider = active;
    if (active === "codex")
      document.documentElement.setAttribute(
        "data-codex-window-type",
        "electron",
      );
    else document.documentElement.removeAttribute("data-codex-window-type");
  }
  // Restore before React mounts, so a Claude/light window has no Codex/dark first frame.
  let initialProvider = 'codex', initialTheme = 'light';
  try {
    const saved = JSON.parse(window.localStorage.getItem('claudian-sidebar-mock-state-v1') || 'null');
    const tab = saved?.tabs?.find(tab => tab.id === saved.activeTabId) || saved?.tabs?.[0];
    initialProvider = tab?.providerId || initialProvider;
    initialTheme = window.SidebarAppearance.readTheme(window.localStorage, saved?.settings?.theme);
  } catch {}
  document.documentElement.dataset.theme = initialTheme;
  document.documentElement.dataset.mode = initialTheme;
  apply(initialProvider);
  const ready=Promise.all(Array.from(document.querySelectorAll('link[data-provider-style]'),link=>{
    if(link.sheet){void link.sheet.cssRules.length;return Promise.resolve();}
    return new Promise((resolve,reject)=>{
      link.addEventListener('load',()=>{void link.sheet.cssRules.length;resolve();},{once:true});
      link.addEventListener('error',()=>reject(Error('Cannot load provider stylesheet: '+link.getAttribute('href'))),{once:true});
    });
  }));
  window.SidebarProviderStyles = Object.freeze({ apply,ready });
})();
