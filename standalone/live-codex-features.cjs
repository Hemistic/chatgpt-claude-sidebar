'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runTurn } = require('./live-categories.cjs');

exports.run = async ({ window, workspace, runDir, runtime }) => {
  const report = { startedAt: new Date().toISOString(), realCli: true, workspace, results: [] };
  const reportPath = path.join(runDir, 'codex-features.json');
  const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const call = payload => window.webContents.executeJavaScript(`window.claudianSidebar.codexAction(${JSON.stringify(payload)})`);
  const record = (id, passed, details) => { report.results.push({ id, passed, ...details }); save(); console.log(`${passed ? 'PASS' : 'FAIL'} ${id}`); };
  const status = await call({ action: 'status' });
  record('native-account', status.ok && !!status.data.account, { accountType: status.data?.account?.account?.type || null,
    requiresOpenaiAuth: status.data?.account?.requiresOpenaiAuth, limitsAvailable: !!status.data?.rateLimits, errors: status.data?.errors || [status.error].filter(Boolean) });
  const models = await call({ action: 'models' });
  record('native-models', models.ok && models.data.length > 0, { count: models.data?.length, selectedModel: runtime.settings.model, error: models.error });
  const threads = await call({ action: 'threads', limit: 1 });
  record('native-thread-list', threads.ok && Array.isArray(threads.data?.data), { count: threads.data?.data?.length, error: threads.error });
  if (process.argv.includes('--metadata-only')) return { ...report, reportPath };

  // All edits and review operations stay inside this run's disposable Git repository.
  execFileSync('git', ['init', '-q'], { cwd: workspace, windowsHide: true });
  const fixture = path.join(workspace, 'average.cjs');
  fs.writeFileSync(fixture, 'exports.average = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;\n');
  execFileSync('git', ['add', 'average.cjs'], { cwd: workspace, windowsHide: true });
  execFileSync('git', ['-c', 'user.name=Sidebar Test', '-c', 'user.email=sidebar@example.invalid', 'commit', '-qm', 'review fixture'], { cwd: workspace, windowsHide: true });
  const reviewOnly = process.argv.includes('--review-only');
  if (reviewOnly) fs.writeFileSync(fixture, 'exports.average = values => values.reduce((a, b) => a + b, 0) / values.length;\n');
  const specs = [
    { id: 'file-and-diff', category: '原生文件修改和整轮差异', approvedFile: fixture,
      prompt: '这是隔离测试夹具。先调用 update_plan 建立两步计划：修改 average.cjs、核对变更。仅修改 average.cjs：把函数改成 exports.average = values => values.reduce((a, b) => a + b, 0) / values.length; 保留换行。使用 apply_patch。然后核对文件并把两步计划都标记完成。禁止修改其他文件、提交、联网。最后只回复“夹具已修改”。' },
    { id: 'native-review', category: '原生代码审查', prompt: '/review 检查 average.cjs 对空数组的处理是否存在业务缺陷，约定空数组必须返回 0。指出问题位置和影响。只审查，不修改文件。' },
  ];
  for (const spec of specs) {
    if (reviewOnly && spec.id !== 'native-review') continue;
    console.log(`START ${spec.id}`);
    const result = await window.webContents.executeJavaScript(`(${runTurn.toString()})(${JSON.stringify(spec)})`);
    const passed = result.completed && !result.errors.length && (spec.id === 'file-and-diff'
      ? result.diffs.length > 0 && result.ui.diffs > 0 && !fs.readFileSync(fixture, 'utf8').includes('?')
      : result.reviews.length > 0 && result.ui.reviews === 1 && /NaN|空数组|empty/i.test(result.ui.assistantText) && result.ui.assistantText.includes('average'));
    record(spec.id, passed, { result });
    if (spec.id === 'file-and-diff') {
      report.planEvents = { tested: result.plans.length > 0, passed: result.plans.length > 0 ? result.ui.plans > 0 : null,
        detail: result.plans.length ? 'Received native turn/plan/updated' : 'No native plan event; this CLI route did not expose update_plan. Snapshot updates are covered by unit tests only.' };
      save();
    }
    await require('./capture-ui.cjs')(window, path.join(runDir, `${spec.id}.png`));
    if (result.errors.length || !result.completed) break;
  }
  const threadId = report.results.find(item => item.result?.threadId)?.result.threadId;
  if (threadId) {
    const page = await call({ action: 'history', threadId, limit: 1 });
    const older = page.data?.nextCursor ? await call({ action: 'history', threadId, cursor: page.data.nextCursor, limit: 1 }) : null;
    record('native-history-pagination', page.ok && page.data.data.length === 1 && older?.ok && older.data.data.length === 1 && page.data.data[0].id !== older.data.data[0].id,
      { threadId, firstTurn: page.data?.data?.[0]?.id, olderTurn: older?.data?.data?.[0]?.id, error: page.error || older?.error });
    const rename = await call({ action: 'rename', threadId, name: 'Codex 连接增量测试' });
    const reread = await call({ action: 'history', threadId, limit: 1 });
    record('native-rename', rename.ok && reread.data?.thread?.name === 'Codex 连接增量测试', { error: rename.error });
  }
  report.finishedAt = new Date().toISOString(); save();
  return { ...report, reportPath };
};
