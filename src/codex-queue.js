(function () {
  'use strict';
  const h = React.createElement;
  const { useState, useEffect, useRef } = React;
  const textOf = item => (item.input || []).filter(part => part.type === 'text').map(part => part.text).join('\n');

  function Queue({ api, threadId, sessionKey, streaming }) {
    const [open, setOpen] = useState(false), [items, setItems] = useState([]);
    const [draft, setDraft] = useState(''), [editing, setEditing] = useState(null);
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    async function call(payload) {
      const response = await api.codexAction({ threadId, sessionKey, ...payload });
      if (!response?.ok) throw new Error(response?.error || '读取原生队列失败');
      return response.data;
    }
    async function refresh() {
      const data = await call({ action: 'queueList' });
      if (alive.current) setItems(data.data || []);
    }
    async function action(payload, clear = false) {
      setBusy(true); setError('');
      try {
        await call(payload); await refresh();
        if (clear && alive.current) { setDraft(''); setEditing(null); }
      } catch (e) { if (alive.current) setError(e.message); }
      finally { if (alive.current) setBusy(false); }
    }
    useEffect(() => api?.onEvent?.(event => {
      if (event.type !== 'codex-queue' || event.threadId !== threadId) return;
      if (event.items) setItems(event.items);
      if (event.error) setError(event.error);
    }), [api, threadId]);
    const show = () => { setOpen(value => !value); if (!open && threadId) void action({ action: 'queueList' }); };
    function move(index, direction) {
      const ids = items.map(item => item.id), target = index + direction;
      [ids[index], ids[target]] = [ids[target], ids[index]];
      void action({ action: 'queueReorder', ids });
    }
    return h('div', { className: 'cx-native-queue' },
      h('button', { type: 'button', onClick: show, 'aria-expanded': open }, '后续消息', items.length ? ` · ${items.length}` : ''),
      open ? h('section', { 'aria-label': 'CLI 原生待发队列' },
        !threadId ? h('p', null, '先创建一个会话，再管理它的后续消息。') : h(React.Fragment, null,
          h('p', { className: 'cx-native-muted' }, '保存在 CLI 中，当前任务结束后按顺序执行。停止当前任务不会删除待发消息。'),
          h('ol', null, items.map((item, index) => h('li', { key: item.id, 'data-queue-id': item.id },
            h('p', { className: 'cx-queue-text' }, textOf(item) || '含附件的消息'),
            h('div', { className: 'cx-queue-actions' },
              h('button', { type: 'button', disabled: busy || item.input.some(part => part.type !== 'text'), onClick: () => { setEditing(item.id); setDraft(textOf(item)); } }, '编辑'),
              h('button', { type: 'button', disabled: busy || index === 0, onClick: () => move(index, -1), 'aria-label': '上移消息' }, '↑'),
              h('button', { type: 'button', disabled: busy || index === items.length - 1, onClick: () => move(index, 1), 'aria-label': '下移消息' }, '↓'),
              h('button', { type: 'button', disabled: busy, onClick: () => action({ action: 'queueDelete', id: item.id }), 'aria-label': '删除待发消息' }, '删除'))))),
          h('form', { onSubmit: event => { event.preventDefault(); if (draft.trim()) void action(editing ? { action: 'queueUpdate', id: editing, text: draft } : { action: 'queueAdd', clientId: crypto.randomUUID(), text: draft }, true); } },
            h('textarea', { value: draft, rows: 3, maxLength: 128000, disabled: busy, 'aria-label': '后续消息内容', placeholder: '输入后续任务', onChange: event => setDraft(event.target.value) }),
            h('button', { type: 'submit', disabled: busy || !draft.trim() || !editing && !streaming }, editing ? '保存修改' : '加入队列'),
            editing ? h('button', { type: 'button', onClick: () => { setEditing(null); setDraft(''); } }, '取消编辑') : null),
          !streaming && items.length ? h('button', { type: 'button', disabled: busy, onClick: () => action({ action: 'queueStart' }) }, '开始队列') : null,
          h('button', { type: 'button', disabled: busy, onClick: () => action({ action: 'queueList' }) }, '刷新队列')),
        busy ? h('p', { role: 'status' }, '同步 CLI…') : null,
        error ? h('p', { className: 'cx-native-error', role: 'alert' }, error) : null) : null);
  }
  window.CodexQueueUI = Object.freeze({ Queue, textOf });
})();
