(function () {
  'use strict';
  const h = React.createElement;
  const { useState, useEffect, useRef } = React;

  async function request(api, payload) {
    if (!api?.codexAction) throw new Error('宿主尚未提供 Codex 原生连接');
    const result = await api.codexAction(payload);
    if (!result?.ok) throw new Error(result?.error || 'Codex 请求失败');
    return result.data;
  }

  function NativeStatus({ api, enabled }) {
    const [status, setStatus] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [modelCount, setModelCount] = useState(null);
    const alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    async function refresh(models = false) {
      setBusy(true); setError('');
      try {
        const data = await request(api, { action: models ? 'models' : 'status' });
        if (alive.current) { if (models) setModelCount(data.length); else setStatus(data); }
      } catch (e) { if (alive.current) setError(e.message); }
      finally { if (alive.current) setBusy(false); }
    }
    useEffect(() => { if (enabled) void refresh(); }, [enabled]);
    useEffect(() => api?.onEvent?.(event => {
      if (event.type === 'codex-account' && enabled) void refresh();
    }), [enabled, api]);
    const account = status?.account?.account;
    const limits = status?.rateLimits?.rateLimits;
    const windows = [['当前窗口', limits?.primary], ['长期窗口', limits?.secondary]].filter(([, value]) => value);
    return h('section', { className: 'cx-native-status', 'aria-label': 'Codex 原生账户和模型' },
      h('strong', null, 'CLI 原生连接'),
      !enabled ? h('p', null, '切换到 Codex 会话后读取账户与模型。') : h(React.Fragment, null,
        h('p', null, status ? (account ? `${account.type === 'chatgpt' ? 'ChatGPT 账户' : 'API 密钥'}${account.planType ? ' · ' + account.planType : ''}` : status.account?.requiresOpenaiAuth ? '尚未登录，请在终端运行 codex login' : '原生配置连接 · 无需 OpenAI 账户') : '正在读取本机 CLI…'),
        account?.email ? h('p', { className: 'cx-native-muted' }, account.email) : null,
        windows.map(([label, value]) => h('div', { key: label, className: 'cx-native-limit' },
          h('span', null, `${label} · 已用 ${value.usedPercent}%`),
          h('meter', { min: 0, max: 100, value: value.usedPercent, 'aria-label': label }),
          value.resetsAt ? h('small', null, `重置：${new Date(value.resetsAt * 1000).toLocaleString()}`) : null)),
        status && !windows.length ? h('p', { className: 'cx-native-muted' }, '当前连接未提供用量窗口') : null,
        status?.errors?.map((message, i) => h('p', { key: i, className: 'cx-native-muted' }, message)),
        h('div', { className: 'cx-native-actions' },
          h('button', { type: 'button', disabled: busy, onClick: () => refresh() }, busy ? '读取中…' : '刷新账户'),
          h('button', { type: 'button', disabled: busy, onClick: () => refresh(true) }, '同步 CLI 模型')),
        modelCount !== null ? h('p', { role: 'status' }, `已同步 ${modelCount} 个模型，输入栏模型菜单已更新。`) : null),
      error ? h('p', { role: 'alert', className: 'cx-native-error' }, error) : null);
  }

  function NativeHistory({ api, query, workspace, onOpen, onArchiveChange, allowMutations = true, compact = false }) {
    const [archived, setArchived] = useState(false);
    const [items, setItems] = useState([]), [next, setNext] = useState(null);
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const generation = useRef(0);
    async function load(cursor, epoch) {
      setBusy(true); setError('');
      try {
        const page = await request(api, { action: 'threads', cursor, search: query, limit: 20, archived });
        if (epoch !== generation.current) return;
        setItems(current => cursor ? [...current, ...(page.data || []).filter(item => !current.some(old => old.id === item.id))] : page.data || []);
        setNext(page.nextCursor || null);
      } catch (e) { if (epoch === generation.current) setError(e.message); }
      finally { if (epoch === generation.current) setBusy(false); }
    }
    useEffect(() => {
      const epoch = ++generation.current;
      setItems([]); setNext(null);
      const timer = setTimeout(() => load(null, epoch), 220);
      return () => { clearTimeout(timer); generation.current++; };
    }, [query, workspace, api, archived]);
    async function archive(item) {
      setBusy(true); setError('');
      try {
        await request(api, { action: archived ? 'unarchive' : 'archive', threadId: item.id });
        onArchiveChange?.(item.id, !archived);
        await load(null, ++generation.current);
      } catch (e) { setError(e.message); }
      finally { setBusy(false); }
    }
    async function open(item) {
      setBusy(true); setError('');
      try { await onOpen(item); }
      catch (e) { setError(e.message); }
      finally { setBusy(false); }
    }
    return h('section', { className: 'cx-native-history', 'aria-label': 'CLI 原生历史' },
      h('div', { className: 'cx-native-history-heading' }, compact ? archived ? '已归档的对话' : '历史对话' : 'Codex CLI 历史', compact ? h('button',{type:'button',disabled:busy,onClick:()=>setArchived(value=>!value)},archived?'返回':'已归档') : null, h('button', { type: 'button', disabled: busy, onClick: () => load(null, ++generation.current) }, '刷新')),
      !compact ? h('div', { className: 'cx-history-filter' }, [false, true].map(value => h('button', { key: String(value), type: 'button', 'aria-pressed': archived === value, disabled: busy,
        onClick: () => setArchived(value) }, value ? '已归档' : '会话'))) : null,
      items.map(item => compact && window.ChatGPTSidebarUI ? h(window.ChatGPTSidebarUI.Row, {key:item.id,title:item.name||item.preview||'未命名会话',indent:1,className:'cx-native-thread sidebar-history-link',disabled:busy||archived,onSelect:()=>open(item),trailing:h('button',{type:'button',className:'cx-native-archive',disabled:busy||!allowMutations,'aria-label':`${archived?'恢复':'归档'} ${item.name||item.preview||'会话'}`,onClick:event=>{event.stopPropagation();archive(item);}},archived?'恢复':'归档')}) : h('div', { className: 'cx-native-thread-row', key: item.id },
        h('button', { type: 'button', className: 'cx-native-thread', disabled: busy || archived, onClick: () => open(item), title: archived ? '恢复后可继续对话' : item.name || item.preview || item.id },
          h('span', null, item.name || item.preview || '未命名会话'), h('small', null, new Date(item.updatedAt * 1000).toLocaleString())),
        h('button', { type: 'button', className: 'cx-native-archive', disabled: busy || !allowMutations, title: allowMutations ? undefined : '切换到 Codex 后可归档或恢复', onClick: () => archive(item), 'aria-label': `${archived ? '恢复' : '归档'} ${item.name || item.preview || '会话'}` }, archived ? '恢复' : '归档'))),
      !busy && !items.length && !error ? h('p', { className: 'cx-native-muted' }, '当前工作区没有 CLI 会话') : null,
      busy ? h('p', { role: 'status' }, '正在读取 CLI…') : null,
      error ? h('p', { role: 'alert', className: 'cx-native-error' }, error) : null,
      next ? h('button', { type: 'button', disabled: busy, onClick: () => load(next, generation.current) }, '加载更多会话') : null);
  }

  function NativeGoal({ api, threadId }) {
    const [open, setOpen] = useState(false), [goal, setGoal] = useState(null);
    const [objective, setObjective] = useState(''), [budget, setBudget] = useState('');
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    const labels = { active: '进行中', paused: '已暂停', blocked: '等待处理', usageLimited: '用量限制', budgetLimited: '预算限制', complete: '已完成' };
    function apply(value) {
      setGoal(value); setObjective(value?.objective || ''); setBudget(value?.tokenBudget == null ? '' : String(value.tokenBudget));
    }
    async function action(payload) {
      setBusy(true); setError('');
      try {
        const result = await request(api, { threadId, ...payload });
        if (alive.current) apply(result.goal || null);
      } catch (e) { if (alive.current) setError(e.message); }
      finally { if (alive.current) setBusy(false); }
    }
    useEffect(() => api?.onEvent?.(event => {
      if (event.type === 'codex-goal' && event.threadId === threadId) setGoal(event.goal);
    }), [api, threadId]);
    async function toggle() {
      setOpen(value => !value);
      if (!open && threadId) await action({ action: 'goalGet' });
    }
    function save(event) {
      event.preventDefault();
      const payload = { action: 'goalSet', ...(goal ? {} : { status: 'paused' }) };
      if (!goal || goal.objective !== objective.trim()) payload.objective = objective.trim();
      const tokenBudget = budget.trim() ? Number(budget) : null;
      if ((goal?.tokenBudget ?? null) !== tokenBudget) payload.tokenBudget = tokenBudget;
      if (!payload.objective && payload.tokenBudget === undefined) return;
      void action(payload);
    }
    return h('div', { className: 'cx-native-goal' },
      h('button', { type: 'button', onClick: toggle, 'aria-expanded': open }, '会话目标', goal ? ` · ${labels[goal.status] || goal.status}` : ''),
      open ? h('section', { 'aria-label': 'CLI 会话目标' },
        !threadId ? h('p', null, '发送第一条消息后，可管理此 CLI 会话的目标。') : h(React.Fragment, null,
          h('p', { className: 'cx-native-muted' }, goal ? `${labels[goal.status] || goal.status} · 已用 ${Number(goal.tokensUsed || 0).toLocaleString()} token` : '新目标默认暂停，由你决定何时继续。'),
          h('form', { onSubmit: save },
            h('label', null, '目标', h('textarea', { value: objective, disabled: busy, maxLength: 4000, rows: 3, onChange: event => setObjective(event.target.value), 'aria-label': '会话目标内容' })),
            h('label', null, 'Token 预算（可选）', h('input', { value: budget, disabled: busy, type: 'number', min: 1, step: 1, onChange: event => setBudget(event.target.value), placeholder: '不设置', 'aria-label': '目标 token 预算' })),
            h('button', { type: 'submit', disabled: busy || !objective.trim(), className: 'cx-goal-save' }, goal ? '保存目标' : '创建暂停目标')),
          goal ? h('div', { className: 'cx-goal-actions' },
            h('button', { type: 'button', disabled: busy, onClick: () => action({ action: 'goalSet', status: goal.status === 'active' ? 'paused' : 'active' }) }, goal.status === 'active' ? '暂停目标' : '继续目标'),
            h('button', { type: 'button', disabled: busy || goal.status === 'complete', className: 'cx-goal-complete', onClick: () => action({ action: 'goalSet', status: 'complete' }) }, '标记完成'),
            h('button', { type: 'button', disabled: busy, className: 'cx-goal-clear', onClick: () => action({ action: 'goalClear' }) }, '清除目标')) : null),
        busy ? h('p', { role: 'status' }, '同步 CLI…') : null,
        error ? h('p', { className: 'cx-native-error', role: 'alert' }, error) : null) : null);
  }

  function reviewFromText(text) {
    try { const value = JSON.parse(text); if (Array.isArray(value.findings) && typeof value.overall_explanation === 'string') return value; } catch {}
    const marker = String(text || '').search(/\n\s*Review comments?:\s*\n/i);
    if (marker < 0) return null;
    const findings = [];
    const expression = /(?:^|\n)\s*(?:-\s*)?(\[P[0-3]\][^\n]+?)\s+[—–]\s+([^\n]+?):(\d+)(?:-(\d+))?\s*\n([\s\S]*?)(?=\n\s*(?:-\s*)?\[P[0-3]\]|$)/g;
    for (const match of String(text).slice(marker).matchAll(expression)) findings.push({ title: match[1], body: match[5].trim(),
      code_location: { absolute_file_path: match[2], line_range: { start: Number(match[3]), end: Number(match[4] || match[3]) } } });
    return findings.length ? { findings, overall_explanation: text.slice(0, marker).trim() } : null;
  }

  // Convert one descending native page to chronological UI messages. Stable IDs let older
  // pages merge without duplicating turns; native thread IDs remain the resume authority.
  function historyMessages(page) {
    const result = [];
    for (const turn of [...(page.data || [])].reverse()) {
      let blocks = [];
      let reviewed = false;
      let reviewExited = false;
      const timestamp = turn.startedAt ? turn.startedAt * 1000 : Date.now();
      function flush() {
        if (!blocks.length) return;
        const content = blocks.filter(block => block.type === 'text').map(block => block.content).join('\n\n');
        result.push({ id: `native-${turn.id}-${blocks[0].id}`, role: 'assistant', content, contentBlocks: blocks,
          timestamp, runtimeTurnId: turn.id, durationSeconds: turn.completedAt && turn.startedAt ? turn.completedAt - turn.startedAt : 0 });
        blocks = [];
      }
      for (const item of turn.items || []) {
        const base = { id: item.id, status: item.status === 'declined' ? 'declined' : ['failed', 'error'].includes(item.status) ? 'error' : 'completed' };
        if (item.type === 'userMessage') {
          flush();
          const content = (item.content || []).filter(part => part.type === 'text').map(part => part.text).join('\n');
          result.push({ id: item.id, role: 'user', content, contentBlocks: [{ type: 'text', id: item.id, content }], timestamp, runtimeTurnId: turn.id });
        } else if (item.type === 'agentMessage') {
          if (reviewExited) continue; // The CLI repeats exitedReviewMode as a final agent message.
          const review = reviewFromText(item.text);
          if (review) { blocks.push({ ...base, type: 'review_result', review }); reviewed = true; }
          else blocks.push({ ...base, type: 'text', content: item.text || '' });
        }
        else if (item.type === 'exitedReviewMode') {
          reviewExited = true;
          if (!reviewed) {
            const review = reviewFromText(item.review);
            blocks.push(review ? { ...base, type: 'review_result', review } : { ...base, type: 'text', content: item.review || '' });
            reviewed = true;
          }
        }
        else if (item.type === 'plan') blocks.push({ ...base, type: 'plan_proposal', plan: item.text || '' });
        else if (item.type === 'reasoning') blocks.push({ ...base, type: 'thinking', content: (item.summary || []).join('\n') });
        else if (item.type === 'commandExecution') blocks.push({ ...base, type: 'tool_use', name: 'exec_command', input: { command: item.command }, command: item.command, result: item.aggregatedOutput || '' });
        else if (item.type === 'fileChange') blocks.push({ ...base, type: 'tool_use', name: 'apply_patch', input: { changes: item.changes }, result: (item.changes || []).map(change => change.diff).join('\n') });
        else if (item.type === 'webSearch') blocks.push({ ...base, type: 'tool_use', name: 'web_search', input: { query: item.query }, result: '' });
        else if (item.type === 'mcpToolCall') blocks.push({ ...base, type: 'tool_use', name: item.tool, input: item.arguments, result: JSON.stringify(item.result || item.error || '') });
        else if (item.type === 'contextCompaction') blocks.push({ ...base, type: 'context_compacted' });
      }
      if (turn.error?.message) blocks.push({ type: 'text', id: `error-${turn.id}`, content: `执行失败：${turn.error.message}` });
      flush();
    }
    return result;
  }

  window.CodexNativeUI = Object.freeze({ NativeStatus, NativeHistory, NativeGoal, historyMessages, reviewFromText, request });
})();
