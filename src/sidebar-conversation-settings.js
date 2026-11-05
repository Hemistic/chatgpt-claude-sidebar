(function (root) {
  'use strict';
  const fields = ['effort', 'permissionMode', 'claudeSafeMode', 'sandbox', 'serviceTier'];
  function runtimeTab(tab, settings) {
    if (!tab) return tab;
    const current = Object.fromEntries(fields.filter(key => Object.hasOwn(settings, key)).map(key => [key, settings[key]]));
    return { ...tab, conversationSettings: { ...tab.conversationSettings, ...current } };
  }
  // Restore only conversation settings. Appearance belongs to the whole window.
  function activate(settings, tab) {
    if (!tab) return settings;
    const scoped = Object.fromEntries(fields.filter(key => tab.conversationSettings?.[key] !== undefined)
      .map(key => [key, tab.conversationSettings[key]]));
    const provider = tab.providerId || tab.runtimeProviderId || settings.provider;
    return { ...settings, ...scoped, model: tab.model || settings.model, provider,
      runtimeMode: settings.runtimeMode === 'mock' ? 'mock' : provider,
      workspace: tab.workspace || settings.workspace };
  }
  // Provider navigation resumes the last visited real chat, not the first tab.
  function providerTab(tabs, provider) {
    const candidates = tabs.filter(tab => tab.providerId === provider && !tab.sampleId && !tab.archived && !tab.runtimeArchived);
    return candidates.reduce((latest, tab) => {
      const visited = value => Number.isFinite(Number(value)) ? Number(value) : 0;
      return !latest || visited(tab.lastActivatedAt) > visited(latest.lastActivatedAt) ? tab : latest;
    }, null);
  }
  class SyncQueue {
    constructor(update) { this.update = update; this.pending = Promise.resolve(); }
    enqueue(payload) {
      const next = this.pending.catch(() => {}).then(() => this.update(payload));
      this.pending = next;
      return next;
    }
    whenIdle() { return this.pending.catch(() => {}); }
  }
  const api = Object.freeze({ runtimeTab, activate, providerTab, SyncQueue });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SidebarConversationSettings = api;
})(typeof window === 'object' ? window : globalThis);
