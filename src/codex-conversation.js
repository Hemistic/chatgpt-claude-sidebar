(function () {
  'use strict';
  const h = React.createElement;
  const { useState, useEffect, useRef } = React;

  // Shared visual components for both CLI adapters. No provider-specific markup.
  function Glyph({ name, size = 14, ...props }) {
    const paths = {
      terminal: ['M3 4h18v16H3z', 'm6 8 3 3-3 3m6 1h5'],
      globe: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18'],
      edit: ['m15 4 5 5M4 20l5-1L21 7a3.5 3.5 0 0 0-5-5L4 14z'],
      down: ['m7 10 5 5 5-5'], up: ['m7 14 5-5 5 5'], right: ['m10 7 5 5-5 5'],
      download: ['M12 3v12m-4-4 4 4 4-4','M4 17v4h16v-4'],
      copy: ['M8 8h13v13H8z', 'M16 4V2H2v14h2'],
      check: ['m5 12 4 4L19 6'], plus: ['M12 4v16M4 12h16'],
      shield: ['m12 3 7 3v6c0 5-7 9-7 9s-7-4-7-9V6z', 'M12 7v6m0 3v.1'],
      mic: ['M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0z', 'M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-3 0h6'],
      error: ['M12 4v10m0 4v1'],
      question: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M9.5 8.5a2.5 2.5 0 0 1 5 .5c0 2-2.5 2-2.5 4M12 17h.01'],
      search: ['M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0', 'm15 15 6 6'],
      branch: ['M7 3v12a4 4 0 0 0 4 4h6', 'M7 8h6a4 4 0 0 0 4-4', 'M4 3h6M14 4h6M17 16v6'],
      rewind: ['M3 4v6h6', 'M3 10a9 9 0 1 1 1 8'],
    };
    return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, ...props },
      (paths[name] || paths.terminal).map((d, i) => h('path', { key: i, d })));
  }

  function Copy({ text, label = '复制' }) {
    const [copied, setCopied] = useState(false);
    const timer = useRef(null);
    useEffect(() => () => clearTimeout(timer.current), []);
    return h('button', { type: 'button', className: 'cx-icon-button', title: copied ? '已复制' : label, 'aria-label': copied ? '已复制' : label,
      onClick: async () => {
        try { await navigator.clipboard.writeText(text); setCopied(true); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1500); }
        catch { setCopied(false); }
      } }, h(Glyph, { name: copied ? 'check' : 'copy' }));
  }

  function Code({ code, language }) {
    const N = window.CodexControlsSource.Code;
    const [wrap, setWrap] = useState(false);
    return h('div', { className: N.classes.MarkdownRoot + ' ' + N.classes.CodeBlock, 'data-codex-control-surface': '', 'data-codex-native-code': '' },
      h(N.Shell, {
        title: language || 'text', content: code, language, renderSvgAsImage: false,
        shouldWrapCode: wrap, onToggleWrapCode: () => setWrap(value => !value),
        source: h('code', { 'data-code-block-code': '', className: (wrap ? 'whitespace-pre-wrap!' : 'whitespace-pre!') + ' block text-size-code ' + N.classes.CodeContent, onCopy: N.onCopySelection }, code),
      }));
  }

  // Markdown parsing and link resolution are supplied by the existing safe data layer.
  function Markdown({ content, adapters }) {
    function block(node, key) {
      const inline = value => adapters.inline(String(value || ''), key);
      switch (node.type) {
        case 'code': return h(Code, { key, code: node.code, language: node.language });
        case 'math': return h('div', { key }, adapters.math(node.latex));
        case 'heading': return h(`h${Math.min(6, Math.max(1, node.level))}`, { key }, inline(node.text));
        case 'blockquote': return h('blockquote', { key }, inline(node.text));
        case 'hr': return h('hr', { key });
        case 'list': return h(node.ordered ? 'ol' : 'ul', { key }, node.items.map((item, index) => h('li', { key: index, value: node.ordered ? item.value : undefined },
          inline(typeof item === 'string' ? item : item.text), (item.children || []).map((child, ci) => block(child, `${key}-${index}-${ci}`)))));
        case 'table': return h('div', { key, className: 'cx-table-scroll' }, h('table', null,
          h('thead', null, h('tr', null, node.headers.map((text, i) => h('th', { key: i }, inline(text))))),
          h('tbody', null, node.rows.map((row, i) => h('tr', { key: i }, node.headers.map((_, j) => h('td', { key: j }, inline(row[j]))))))));
        default: return h('p', { key }, inline(node.text));
      }
    }
    return h('div', { className: 'cx-markdown' }, adapters.parse(content || '').map((node, i) => block(node, `md-${i}`)));
  }

  function toolKind(block) {
    const name = String(block.name || '');
    if (name === 'AskUserQuestion') return 'question';
    if (/ALL_TOOLS/.test(block.input?.input || '') || /glob|grep|ToolSearch/i.test(name)) return 'search';
    if (/tools\.apply_patch\s*\(/.test(block.input?.input || '')) return 'edit';
    if (/patch|write|edit/i.test(name)) return 'edit';
    if (/web|search_query|browse|fetch/i.test(name)) return 'web';
    if (/read|glob|grep|search|ls/i.test(name)) return 'read';
    return 'command';
  }

  function commandSummary(block) {
    const input = block.input || {};
    if (toolKind(block) === 'question') return (input.questions || []).map(question => question.question || question.header).filter(Boolean).join(' · ') || '请求用户输入';
    if (/ALL_TOOLS/.test(input.input || '')) return /edit|patch|read_file/.test(input.input) ? '查找文件读取和编辑工具' : '查找当前可用工具';
    let text = block.command || input.command || input.cmd || input.query || input.url || input.code || input.input || block.summary || block.name || '工具调用';
    if (typeof text !== 'string') text = JSON.stringify(text);
    // Display the command inside an orchestration wrapper, without evaluating it.
    const quoted = text.match(/\bcmd\s*:\s*("(?:\\.|[^"\\])*")/);
    if (quoted) { try { text = JSON.parse(quoted[1]); } catch {} }
    if (/^(text\(|const |let |await )/.test(text) && !quoted) {
      const tool = text.match(/tools\.([\w]+)\s*\(/)?.[1];
      if (tool && tool !== 'exec_command') return `${tool} 工具调用`;
    }
    return text.replace(/\s+/g, ' ').trim();
  }

  function Diff({ file }) {
    return h('div', { className: 'cx-diff' }, (file.diffLines || []).map((line, i) => {
      const text = typeof line === 'string' ? line : line.text || line.content || '';
      const rawType = typeof line === 'string' ? (line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : 'context') : line.type;
      const type = rawType === 'insert' ? 'add' : rawType === 'delete' ? 'remove' : rawType;
      return h('div', { key: i, className: `cx-diff-line ${type}` }, h('span', null, type === 'add' ? '+' : type === 'remove' ? '−' : ' '), h('code', null, text));
    }));
  }

  function ActivityRow({ block, file, adapters }) {
    const [open, setOpen] = useState(false);
    const kind = file ? 'edit' : toolKind(block);
    const status = block.status || 'running';
    const failed = ['error', 'blocked'].includes(status);
    const running = status === 'running';
    const action = status === 'declined' ? '未执行' : kind === 'question' ? (failed ? '回答失败' : running ? '等待回答' : '已收到回答') : failed ? '执行失败' : running ? (kind === 'edit' ? '正在编辑' : '正在运行')
      : kind === 'edit' ? (file?.operation === 'add' ? '已创建' : file?.operation === 'delete' ? '已删除' : '已编辑')
        : kind === 'web' ? '已搜索网页' : kind === 'read' ? '已读取' : kind === 'search' ? '已检索工具' : '已运行命令';
    const filePath = file?.path || file?.filePath || block.filePath || block.input?.file_path;
    const summary = filePath ? filePath.split(/[\\/]/).pop() : commandSummary(block);
    const stats = file?.stats || block.diffStats || block.diffData?.stats;
    const output = block.result || block.content || (block.lines || []).map(line => line.text || line).join('\n');
    return h('div', { className: `cx-activity-item ${failed ? 'is-error' : ''} ${running ? 'is-running' : ''}` },
      h('div', { className: 'cx-activity-line' },
        h('button', { type: 'button', className: 'cx-activity-toggle', onClick: () => setOpen(value => !value), 'aria-expanded': open, title: summary },
          h(Glyph, { name: kind === 'question' ? 'question' : kind === 'edit' ? 'edit' : kind === 'web' ? 'globe' : kind === 'search' ? 'search' : 'terminal' }),
          h('span', { className: 'cx-activity-action' }, action),
          h('span', { className: `cx-activity-summary ${filePath ? 'is-file' : ''}` }, summary),
          stats ? h('span', { className: 'cx-diff-stats' }, `+${stats.added || 0} −${stats.removed || 0}`) : null,
          kind === 'edit' && status === 'completed' ? h('span', { className: 'cx-edit-dot' }) : null)),
      open ? h('div', { className: 'cx-activity-detail' },
        filePath ? h('button', { type: 'button', className: 'cx-file-link', onClick: () => adapters.openPath(filePath) }, filePath) : null,
        kind === 'command' ? h('pre', { className: 'cx-command-source' }, block.command || block.input?.command || block.input?.cmd || block.input?.code || block.input?.input || summary) : null,
        file?.diffLines?.length ? h(Diff, { file }) : h('pre', null, String(output || (running ? '正在等待结果…' : '本次工具未返回文本'))),
        h(Copy, { text: String(output || summary), label: '复制工具输出' })) : null);
  }

  function visibleActivities(blocks, adapters, commandBlocks = blocks) {
    const normalize = value => String(value || '').replace(/[\\'"\s]/g, '');
    const filePath = file => {
      let path = String(file.path || file.filePath || '').replace(/\\/g, '/');
      if (!/^(?:[a-z]:\/|\/)/i.test(path)) path = `${String(adapters.workspace || '').replace(/\\/g, '/')}/${path}`;
      return path.toLowerCase();
    };
    const fileKey = file => {
      const changes = (file.diffLines || []).filter(line => typeof line === 'string' ? /^[+-]/.test(line) : ['add', 'insert', 'remove', 'delete'].includes(line.type))
        .map(line => typeof line === 'string' ? line : `${['add', 'insert'].includes(line.type) ? '+' : '-'}${line.text || line.content || ''}`);
      return JSON.stringify([filePath(file), changes]);
    };
    const detailedWrapperFiles = new Set(blocks.filter(block => block.name === 'exec' && block.status === 'completed' && /tools\.apply_patch\s*\(/.test(block.input?.input || ''))
      .flatMap(block => adapters.fileDiffs(block).filter(file => file.diffLines?.length).map(filePath)));
    const nativeFiles = new Set(blocks.filter(block => block.name === 'apply_patch').flatMap(block => adapters.fileDiffs(block).map(fileKey)));
    // A command can follow an intervening assistant paragraph, outside this visual group.
    // Match commands within this turn; patch matching stays local to the edit group.
    const nativeCommands = commandBlocks.filter(block => block.name !== 'exec' && (block.command || block.input?.command || block.input?.cmd))
      .map(block => normalize(block.command || block.input.command || block.input.cmd));
    return blocks.filter(block => {
      if (block.name === 'apply_patch' && block.status === 'completed') {
        const files = adapters.fileDiffs(block);
        // Persisted CLI summaries can omit diffs. Keep the adjacent detailed wrapper
        // rather than rendering a second empty row for the same change.
        if (files.length && files.every(file => !file.diffLines?.length && detailedWrapperFiles.has(filePath(file)))) return false;
      }
      if (block.name !== 'exec' || !['running', 'completed'].includes(block.status)) return true;
      const source = block.input?.input || '';
      const calls = [...source.matchAll(/tools\.([\w]+)\s*\(/g)].map(match => match[1]);
      if (!calls.length || calls.some(name => !['apply_patch', 'exec_command'].includes(name))) return true;
      if (calls.includes('apply_patch')) {
        const files = adapters.fileDiffs(block);
        if (!files.length || files.some(file => !nativeFiles.has(fileKey(file)))) return true;
      }
      if (calls.includes('exec_command')) {
        const commands = [...source.matchAll(/\bcmd\s*:\s*("(?:\\.|[^"\\])*")/g)].map(match => { try { return normalize(JSON.parse(match[1])); } catch { return ''; } });
        if (!commands.length || commands.some(command => !command || !nativeCommands.some(native => native.includes(command)))) return true;
      }
      return false;
    });
  }

  function ActivityGroup({ blocks: allBlocks, adapters, commandBlocks }) {
    const blocks = visibleActivities(allBlocks, adapters, commandBlocks);
    const [open, setOpen] = useState(true);
    const scroller = useRef(null);
    const [fade, setFade] = useState(false);
    useEffect(() => {
      const node = scroller.current;
      if (!node) return;
      const update = () => setFade(node.scrollHeight > node.clientHeight + node.scrollTop + 2);
      const observer = new ResizeObserver(update); observer.observe(node);
      node.addEventListener('scroll', update); update();
      return () => { observer.disconnect(); node.removeEventListener('scroll', update); };
    }, [open, blocks]);
    const kinds = new Set(blocks.map(toolKind));
    const running = blocks.some(block => !block.status || block.status === 'running');
    const parts = [kinds.has('edit') ? '编辑了文件' : '', kinds.has('command') || kinds.has('read') ? '运行了命令' : '', kinds.has('web') ? '搜索网页' : '', kinds.has('question') ? '请求了输入' : ''].filter(Boolean);
    const title = blocks.length && blocks.every(block => block.status === 'declined') ? '操作未执行' : running ? '正在执行' : parts.join(parts.length === 2 ? '并' : '、') || '执行记录';
    return h('section', { className: 'cx-activity-group' },
      h('button', { type: 'button', className: 'cx-activity-group-heading', onClick: () => setOpen(value => !value), 'aria-expanded': open },
        h(Glyph, { name: kinds.has('edit') ? 'edit' : 'terminal' }), h('span', null, title), h(Glyph, { name: open ? 'down' : 'right', size: 12 })),
      open ? h('div', { className: `cx-activity-scroll ${fade ? 'has-fade' : ''}`, ref: scroller, tabIndex: 0, 'aria-label': '执行记录' },
        blocks.flatMap(block => {
          const files = adapters.fileDiffs(block);
          return files.length ? files.map((file, index) => h(ActivityRow, { key: `${block.id}-${index}`, block, file, adapters }))
            : h(ActivityRow, { key: block.id, block, adapters });
        })) : null);
  }

  function Thinking({ block, adapters }) {
    const [open, setOpen] = useState(false);
    if (!block.content && !block.runtimeStreaming && !block.runtimeWaiting) return null;
    const label = block.runtimeWaiting ? '正在等待响应' : block.runtimeStreaming ? '正在思考' : block.durationSeconds > 0 ? `已思考 ${Math.round(block.durationSeconds)}秒` : '思考';
    return h('div', { className: 'cx-thinking' },
      h('button', { type: 'button', onClick: () => setOpen(value => !value), 'aria-expanded': open }, label, h(Glyph, { name: open ? 'down' : 'right', size: 12 })),
      open ? h(Markdown, { content: block.content, adapters }) : null);
  }

  function TaskPlan({ block }) {
    const completed = block.steps.filter(step => step.status === 'completed').length;
    return h('details', { className: 'cx-task-plan', open: completed < block.steps.length },
      h('summary', null, h(Glyph, { name: 'check' }), `计划 · ${completed}/${block.steps.length}`),
      block.explanation ? h('p', null, block.explanation) : null,
      h('ol', null, block.steps.map((step, i) => h('li', { key: i, 'data-status': step.status },
        h('span', { 'aria-label': step.status === 'completed' ? '已完成' : step.status === 'inProgress' ? '进行中' : '待处理' }, step.status === 'completed' ? '✓' : step.status === 'inProgress' ? '◉' : '○'), h('span', null, step.step)))));
  }

  function TurnDiff({ block }) {
    if (!block.diff) return null;
    const lines = block.diff.split('\n');
    const added = lines.filter(line => line.startsWith('+') && !line.startsWith('+++')).length;
    const removed = lines.filter(line => line.startsWith('-') && !line.startsWith('---')).length;
    return h('details', { className: 'cx-turn-diff' },
      h('summary', null, h(Glyph, { name: 'edit' }), '本轮全部更改', h('span', { className: 'cx-diff-stats' }, `+${added} −${removed}`)),
      h('pre', null, lines.map((line, i) => h('span', { key: i, className: line.startsWith('+') ? 'is-add' : line.startsWith('-') ? 'is-remove' : '' }, line || ' '))),
      h(Copy, { text: block.diff, label: '复制本轮差异' }));
  }

  function ReviewResult({ block, adapters }) {
    const review = block.review;
    return h('section', { className: 'cx-review-result', 'aria-label': '代码审查结果' },
      h('div', { className: 'cx-review-heading' }, h(Glyph, { name: 'search' }), `代码审查 · ${review.findings.length} 项发现`),
      h(Markdown, { content: review.overall_explanation, adapters }),
      review.findings.map((finding, i) => {
        const location = finding.code_location;
        return h('div', { key: i, className: 'cx-review-finding' },
          h('strong', null, finding.title), h(Markdown, { content: finding.body, adapters }),
          location?.absolute_file_path ? h('button', { type: 'button', className: 'cx-file-link', onClick: () => adapters.openPath(location.absolute_file_path) },
            location.absolute_file_path.split(/[\\/]/).pop(), location.line_range?.start ? `:${location.line_range.start}` : '') : null);
      }), h(Copy, { text: JSON.stringify(review, null, 2), label: '复制审查结果' }));
  }

  function ConversationTurn({ message, blocks, adapters, canFork, canRewind, onFork, onRewind, renderInteraction }) {
    const [activitiesVisible, setActivitiesVisible] = useState(true);
    const user = message.role === 'user';
    const groups = [];
    for (const block of blocks) {
      if (block.type === 'tool_use' && !adapters.isInteractiveTool(block)) {
        const last = groups.at(-1);
        if (last?.type === 'activity') last.blocks.push(block);
        else groups.push({ id: block.id, type: 'activity', blocks: [block] });
      } else if (block.type !== 'thinking' || block.content || block.runtimeStreaming || block.runtimeWaiting) groups.push(block);
    }
    const text = blocks.filter(block => block.type === 'text').map(block => block.content || '').join('\n\n');
    const duration = Math.max(0, Math.round(message.durationSeconds || 0));
    const heading = !user && duration > 0 ? h('button', { type: 'button', className: 'cx-turn-heading', onClick: () => setActivitiesVisible(value => !value), 'aria-expanded': activitiesVisible },
      `用时 ${duration >= 60 ? Math.floor(duration / 60) + '分钟 ' : ''}${duration % 60}秒`, h(Glyph, { name: activitiesVisible ? 'down' : 'right', size: 12 })) : null;
    const actions = text ? h(React.Fragment, null, h(Copy, { text, label: user ? '复制消息' : '复制回复' }),
      user && canFork ? h('button', { type: 'button', title: '从此消息创建分支', 'aria-label': '从此消息创建分支', onClick: () => onFork(message.id) }, h(Glyph, { name: 'branch' })) : null,
      user && canRewind ? h('button', { type: 'button', title: '回退到此消息', 'aria-label': '回退到此消息', onClick: () => onRewind(message.id, 'conversation') }, h(Glyph, { name: 'rewind' })) : null) : null;
    return h(window.ChatGPTSurface.Message, { message, heading, actions },
      user && message.images?.length ? h('div', { className: 'cx-message-images' }, message.images.map((image, i) => h('img', { key: i, src: adapters.imageSrc(image), alt: image.name || '图片' }))) : null,
      user && message.contextChips?.length ? h('div', { className: 'cx-context-chips' }, message.contextChips.map((chip, i) => h('span', { key: i }, chip.label || chip.name || chip.path))) : null,
      groups.map(block => block.type === 'text' ? (user ? h('div', { key: block.id, className: 'cg-user-text', dir: 'auto', 'data-markdown-text-tone': 'user-message' }, block.content) : h(Markdown, { key: block.id, content: block.content, adapters }))
        : block.type === 'activity' ? (activitiesVisible ? h(ActivityGroup, { key: block.id, blocks: block.blocks, adapters, commandBlocks: blocks.filter(item => item.type === 'tool_use') }) : null)
          : block.type === 'thinking' ? (activitiesVisible ? h(Thinking, { key: block.id, block, adapters }) : null)
            : block.type === 'task_plan' ? h(TaskPlan, { key: block.id, block })
              : block.type === 'turn_diff' ? h(TurnDiff, { key: block.id, block })
                : block.type === 'review_result' ? h(ReviewResult, { key: block.id, block, adapters })
                  : block.type === 'plan_proposal' ? window.CodexPlanUI ? h(window.CodexPlanUI.Card, { key:block.id, block, conversationId:message.id, renderMarkdown:content=>h(Markdown,{content,adapters}) }) : h('section', { key: block.id, className: 'cx-plan-proposal', 'aria-label': '计划方案' },
                    h('div', { className: 'cx-review-heading' }, h(Glyph, { name: 'edit' }), '计划方案'), h(Markdown, { content: block.plan, adapters }))
                  : renderInteraction(block)),
      message.isInterrupt ? h('p', { className: 'cx-interrupted' }, '已停止生成') : null);
  }

  function ComposerControls({ slot, onLoadModels, models, currentModel, effort, efforts, onModel, onEffort, onAddCustomModel, onRemoveCustomModel, permissionMode, onPermissionMode, onAddContext, extra }) {
    return h(window.CodexComposerControls.Controls, { slot, onLoadModels, models, currentModel, effort, efforts, onModel, onEffort, onAddCustomModel, onRemoveCustomModel, permissionMode, onPermissionMode, onAddContext, extra });
  }

  window.CodexSidebarView = Object.freeze({ ConversationTurn, ComposerControls, Markdown, Glyph, visibleActivities });
})();
