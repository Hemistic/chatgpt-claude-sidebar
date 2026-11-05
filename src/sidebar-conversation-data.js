(function (root) {
  'use strict';
  function title(item, index = 0, locale = 'zh-CN') {
    const value = String(item?.title || item?.name || '').trim();
    if (value && !/^(?:New Chat|新会话\s*\d*)$/i.test(value)) return value;
    return String(item?.preview || item?.messages?.find(message => message.role === 'user')?.content || '').split('\n')[0].trim() ||
      (locale === 'zh-CN' ? `新对话 ${index + 1}` : `New chat ${index + 1}`);
  }
  function projectPath(value) {
    const path = String(value || '').trim().replace(/\\/g, '/').replace(/\/+$/, '');
    return { path, key: /^[a-z]:/i.test(path) || path.startsWith('//') ? path.toLowerCase() : path };
  }
  function timestamp(item) {
    const value = item.updatedAt ?? item.lastResponseAt ?? item.createdAt ?? item.messages?.at(-1)?.timestamp ?? 0;
    const n = Number(value);
    return Number.isFinite(n) ? n > 0 && n < 1e11 ? n * 1000 : n : Date.parse(value) || 0;
  }
  function group({ tabs = [], histories = [], native = [], workspace = '', query = '', providerId }) {
    const entries = new Map(), localIds = new Map(histories.map(item => [item.id, item]));
    const keyFor = item => item.runtimeThreadId ? `${item.providerId || 'codex'}:${item.runtimeThreadId}` : `history:${item.historyId || item.id}`;
    const add = (item, kind, index) => {
      if (item.archived || item.runtimeArchived || item.sampleId) return;
      const saved = kind === 'tab' ? localIds.get(item.historyId) : null;
      const provider = kind === 'native' ? 'codex' : item.providerId || saved?.providerId || 'codex';
      if (providerId && provider !== providerId) return;
      const key = kind === 'native' ? `codex:${item.id}` : keyFor({...item,providerId:provider});
      const previous = entries.get(key);
      const project = projectPath(item.cwd || item.workspace || saved?.workspace || saved?.cwd || previous?.project.path || (kind === 'tab' ? workspace : ''));
      entries.set(key, { key, item, kind, project, title: title(item, index), updated: timestamp(item) || previous?.updated || 0 });
    };
    histories.forEach((item, i) => add(item, 'history', i));
    native.forEach((item, i) => add(item, 'native', i));
    tabs.forEach((item, i) => add(item, 'tab', i));
    const groups = new Map(), search = query.trim().replace(/\\/g, '/').toLocaleLowerCase();
    for (const entry of entries.values()) {
      if (search && !`${entry.title} ${entry.project.path}`.toLocaleLowerCase().includes(search)) continue;
      if (!groups.has(entry.project.key)) groups.set(entry.project.key, { ...entry.project, label: entry.project.path.split('/').at(-1) || '未归属项目', entries: [], updated: 0 });
      const project = groups.get(entry.project.key);
      project.entries.push(entry); project.updated = Math.max(project.updated, entry.updated);
    }
    for (const project of groups.values()) project.entries.sort((a, b) => b.updated - a.updated);
    return [...groups.values()].sort((a, b) => b.updated - a.updated || a.path.localeCompare(b.path));
  }
  const api = Object.freeze({ title, projectPath, group });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SidebarConversationData = api;
})(typeof window === 'object' ? window : globalThis);
