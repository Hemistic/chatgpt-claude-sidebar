'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// Executed in the real renderer. Messages enter through the textarea, not a mocked transport.
async function runTurn(config) {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const until = async (fn, timeout) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) { if (fn()) return; await wait(100); }
    throw new Error('等待真实 CLI 响应超时');
  };
  const api = window.claudianSidebar;
  const state = await api.getState();
  const started = Date.now();
  const result = { id: config.id, category: config.category, provider: state.settings.provider,
    model: document.querySelector('.claudian-model-label')?.textContent, prompt: config.prompt,
    text: '', textChunks: 0, firstTextMs: null, tools: [], errors: [], approvals: [], usageEvents: [],
    completed: false, cancelled: false, plans: [], diffs: [], reviews: [], proposals: [], planApprovals: [] };
  window.__categoryTotals ||= {};
  const off = api.onEvent(event => {
    if (event.threadId) result.threadId = event.threadId;
    if (event.turnId) result.turnId = event.turnId;
    if (event.type === 'chunk') {
      const chunk = event.chunk || {};
      if (chunk.type === 'text') {
        result.text += String(chunk.content || ''); result.textChunks++;
        result.firstTextMs ??= Date.now() - started;
      }
      if (chunk.type === 'tool_use') result.tools.push({ name: chunk.name, summary: chunk.summary, input: chunk.input });
      if (chunk.type === 'task_plan') result.plans.push(chunk);
      if (chunk.type === 'turn_diff') result.diffs.push(chunk);
      if (chunk.type === 'review_result') result.reviews.push(chunk.review);
      if (chunk.type === 'plan_proposal') result.proposals.push(chunk);
      if (chunk.type === 'plan_completed') result.planApprovals.push(chunk);
      if (chunk.type === 'usage') {
        result.usageEvents.push({ normalized: chunk.usage, native: event.raw?.params });
        const key = event.raw?.params?.threadId;
        const total = event.raw?.params?.tokenUsage?.total;
        if (key && total) {
          result.threadId = key;
          result.tokenBaseline ??= window.__categoryTotals[key] || { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
          result.nativeTotal = total;
        }
      }
    }
    if (event.type === 'approval') {
      const approval = event.approval || {};
      const changes = result.tools.flatMap(tool => tool.input?.changes || []);
      const allowed = config.approvedFile && approval.kind === 'file_change' && changes.length > 0
        && changes.every(change => change.path?.toLowerCase() === config.approvedFile.toLowerCase());
      result.approvals.push({ id: approval.id, kind: approval.kind, allowed: !!allowed });
      if (allowed) void api.respondApproval({ id: approval.id, decision: 'allow' });
    }
    if (event.type === 'error') result.errors.push(String(event.content || event.message || 'CLI error'));
    if (event.type === 'status' && event.status === 'cancelled') result.cancelled = true;
    if (event.type === 'done') result.completed = true;
  });
  try {
    await until(() => document.querySelector(config.clickSelector || 'textarea.claudian-input'), 20000);
    if (config.clickSelector) {
      if (config.feedback) {
        const textarea = document.querySelector(config.feedbackSelector || '.cx-plan-decision textarea');
        Object.getOwnPropertyDescriptor(textarea.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value').set.call(textarea, config.feedback);
        textarea.dispatchEvent(new Event('input', { bubbles: true })); await wait(120);
      }
      document.querySelector(config.clickSelector).click();
    } else {
      const textarea = document.querySelector('textarea.claudian-input');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, config.prompt);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(120);
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    }
    if (config.cancel) {
      await until(() => result.textChunks > 0 || result.completed || result.errors.length, 120000);
      const stop = document.querySelector('[aria-label="停止生成"]');
      result.stopButtonSeen = !!stop;
      if (stop && !result.completed) { result.cancelRequested = true; stop.click(); }
    }
    await until(() => result.completed || result.cancelled || result.errors.length || result.approvals.some(a => !a.allowed), 150000);
    await wait(800);
    if (result.approvals.some(a => !a.allowed)) await api.cancelTurn();
    result.ui = { activityGroups: document.querySelectorAll('.cx-activity-group').length,
      toolRows: document.querySelectorAll('.cx-activity-line').length,
      plans: document.querySelectorAll('.cx-task-plan').length, diffs: document.querySelectorAll('.cx-turn-diff').length,
      reviews: document.querySelectorAll('.cx-review-result').length,
      proposals: document.querySelectorAll('.cx-plan-proposal,.cg-plan-card').length, planDecision: !!document.querySelector('.cx-plan-decision,.cg-plan-implementation'),
      protocolTags: /<\/?proposed_plan>/.test(document.body.innerText),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      assistantText: [...document.querySelectorAll('.claudian-message-assistant')].at(-1)?.textContent || '',
      providerTheme: document.documentElement.dataset.sidebarProvider,
      stopButtonRemaining: !!document.querySelector('[aria-label="停止生成"]') };
    if (result.nativeTotal) {
      const base = result.tokenBaseline;
      result.tokens = Object.fromEntries(['inputTokens', 'outputTokens', 'cachedInputTokens'].map(key => [key, result.nativeTotal[key] - (base[key] || 0)]));
      window.__categoryTotals[result.threadId] = result.nativeTotal;
      result.tokenSource = 'native thread/tokenUsage/updated total delta; cached input is part of input';
      if (config.cancel && result.textChunks > 0 && result.tokens.outputTokens === 0) {
        result.tokens = null;
        result.tokenSource = 'generation interrupted; no incremental output usage reported';
      }
    } else {
      const usage = result.usageEvents.at(-1)?.normalized;
      result.tokens = usage || null;
      result.tokenSource = usage ? 'provider usage event' : 'provider did not report usage';
    }
  } catch (error) {
    result.errors.push(error.message);
    await api.cancelTurn().catch(() => {});
  } finally { off(); }
  result.elapsedMs = Date.now() - started;
  return result;
}

exports.runTurn = runTurn;
exports.run = async ({ window, workspace, runDir }) => {
  const marker = `SIDEBAR_LIVE_${randomUUID()}`;
  fs.writeFileSync(path.join(workspace, 'read-proof.txt'), marker);
  fs.writeFileSync(path.join(workspace, 'edit-proof.txt'), 'BEFORE\n');
  const cases = [
    { id: 'conversation', category: '普通对话与 Markdown', prompt: '这是独立侧栏真实调用测试。请用中文输出一句简短说明、一个包含两项的列表，以及一行 JavaScript 代码块。不要调用工具。', check: r => r.completed && /```/.test(r.text) && r.ui.assistantText.includes('```') === false },
    { id: 'read', category: '文件读取与执行记录', prompt: '请使用文件读取工具读取当前工作区的 read-proof.txt。只回复文件的完整内容。禁止修改文件和联网。', check: r => r.completed && r.tools.length > 0 && r.text.includes(marker) && r.ui.assistantText.includes(marker) },
    { id: 'memory', category: '多轮上下文', prompt: '不要使用工具。只回复上一轮读到的完整文件内容。', check: r => r.completed && r.text.includes(marker) && !r.tools.length },
    { id: 'command', category: '真实命令执行', prompt: '使用终端执行一条 PowerShell 命令，计算 137 * 29，禁止读写文件和联网。然后只回复结果。', check: r => r.completed && r.tools.length > 0 && r.text.includes('3973') },
    { id: 'edit', category: '文件修改与差异记录', approvedFile: path.join(workspace, 'edit-proof.txt'), prompt: '只修改当前工作区的 edit-proof.txt，将 BEFORE 替换为 AFTER，保留换行。使用文件编辑工具。禁止修改其他文件和联网。完成后只回复“已修改”。', check: r => r.completed && r.tools.length > 0 && fs.readFileSync(path.join(workspace, 'edit-proof.txt'), 'utf8').trim() === 'AFTER' },
    { id: 'cancel', category: '流式输出与停止', prompt: '请从1开始连续输出到3000，每个数字单独一行。不要调用工具，不要省略。', cancel: true, check: r => r.textChunks > 0 && r.stopButtonSeen && r.cancelRequested && (r.cancelled || r.completed) && !r.ui.stopButtonRemaining },
  ];
  const report = { startedAt: new Date().toISOString(), workspace, realCli: true, mocked: false, results: [] };
  const reportPath = path.join(runDir, 'categories.json');
  const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const filter = process.argv.find(arg => arg.startsWith('--category-filter='))?.split('=')[1]?.split(',');
  for (const spec of cases.filter(spec => !filter || filter.includes(spec.id))) {
    console.log(`START ${spec.id}: ${spec.category}`);
    const result = await window.webContents.executeJavaScript(`(${runTurn.toString()})(${JSON.stringify(spec)})`);
    result.passed = !result.errors.length && result.approvals.every(a => a.allowed) && !!spec.check(result);
    report.results.push(result); save();
    await require('./capture-ui.cjs')(window, path.join(runDir, `${spec.id}.png`));
    console.log(`${result.passed ? 'PASS' : 'FAIL'} ${spec.id}: ${JSON.stringify({ tokens: result.tokens, errors: result.errors, tools: result.tools.map(t => t.name) })}`);
    if (result.errors.some(error => /quota|401|403|429|余额|额度/i.test(error))) break;
  }
  // Switch via the real header; a service-side rejection is reported as a failure, never as a pass.
  if (!filter || filter.includes('claude')) {
  console.log('START claude: 引擎切换与 Claude 真实调用');
  await window.webContents.executeJavaScript(`document.querySelector('.sidebar-engine-menu').open = true; document.querySelector('[data-engine="claude"]').click();`);
  const claude = await window.webContents.executeJavaScript(`(${runTurn.toString()})(${JSON.stringify({ id: 'claude', category: 'Claude Code 切换与真实调用', prompt: '这是独立侧栏真实调用测试。不要使用工具，只回复 CLAUDE_SIDEBAR_OK。' })})`);
  claude.passed = claude.provider === 'claude' && claude.ui?.providerTheme === 'claude' && claude.completed && claude.text.includes('CLAUDE_SIDEBAR_OK') && !claude.errors.length;
  report.results.push(claude);
  await require('./capture-ui.cjs')(window, path.join(runDir, 'claude.png'));
  console.log(`${claude.passed ? 'PASS' : 'FAIL'} claude: ${JSON.stringify(claude.errors)}`);
  await window.webContents.executeJavaScript(`document.querySelector('.sidebar-engine-menu').open = true; document.querySelector('[data-engine="codex"]').click();`);
  }
  report.finishedAt = new Date().toISOString(); report.reportPath = reportPath; save();
  const rows = report.results.map(r => `| ${r.category} | ${r.passed ? '通过' : '失败'} | ${r.tokens?.inputTokens ?? '未上报'} | ${r.tokens?.outputTokens ?? '未上报'} | ${r.tokens?.cachedInputTokens ?? r.tokens?.cacheReadInputTokens ?? '未上报'} | ${r.errors.join('; ').replaceAll('|', '/').replaceAll('\n', ' ')} |`);
  fs.writeFileSync(path.join(runDir, 'report.md'), `# 独立侧栏真实 token 测试\n\n${report.startedAt}\n\n真实 Electron → 输入框 → preload IPC → CLI → 事件与界面；文件操作限定在本次隔离工作区。\n\n| 类目 | 结果 | 输入 token | 输出 token | 缓存输入 token（输入子集） | 错误 |\n|---|---|---:|---:|---:|---|\n${rows.join('\n')}\n\n计数来自原生 usage 事件。取消、失败若未上报则标记未上报，不推算为零。模型切换仅在已配置的可用模型间执行，本轮未增加模型或更改账号。\n`);
  return report;
};
