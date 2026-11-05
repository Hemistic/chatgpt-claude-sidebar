(function (root) {
  'use strict';
  function create(text, chips = []) {
    const seen = new Set();
    const references = [];
    for (const chip of Array.isArray(chips) ? chips : []) {
      const path = typeof chip?.path === 'string' ? chip.path.trim() : '';
      if (!path || seen.has(path)) continue;
      seen.add(path);
      references.push({ path, name: chip.name || path.split(/[\\/]/).at(-1) });
    }
    const displayText = String(text || '');
    const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return {
      text: references.length
        ? displayText + '\n\n<context_files>\n' + references.map(file => escape(file.path)).join('\n') + '\n</context_files>'
        : displayText,
      contextChips: references.map(file => ({ type: 'file', path: file.path, label: file.name })),
    };
  }
  const api = Object.freeze({ create });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SidebarFileContext = api;
})(typeof window === 'object' ? window : globalThis);
