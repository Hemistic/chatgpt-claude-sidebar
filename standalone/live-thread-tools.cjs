'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { runTurn } = require('./live-categories.cjs');
const capture = require('./capture-ui.cjs');

exports.run = async ({ window, runDir, runtime }) => {
  const reportPath = path.join(runDir, 'thread-tools.json');
  const report = { startedAt: new Date().toISOString(), realCli: true, results: [] };
  const evaluate = code => window.webContents.executeJavaScript(code);
  const call = payload => evaluate(`window.claudianSidebar.codexAction(${JSON.stringify(payload)})`);
  const until = async fn => { const deadline = Date.now() + 30000; while (!await fn()) { if (Date.now() > deadline) throw new Error('CLI/UI state did not converge'); await new Promise(resolve => setTimeout(resolve, 100)); } };
  const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  async function checkpoint(id, detail) {
    const snapshot = path.join(runDir, `${id}.png`); await capture(window, snapshot);
    report.results.push({ id, passed: true, snapshot, ...detail }); save(); console.log(`PASS ${id}: ${snapshot}`);
    if (process.argv.includes('--pause-after-each')) {
      console.log(`WAIT visual check: ${id}`);
      const gate = path.join(runDir, `${id}.checked`), deadline = Date.now() + 600000;
      while (!fs.existsSync(gate)) { if (Date.now() > deadline) throw new Error(`Visual check timed out: ${id}`); await new Promise(resolve => setTimeout(resolve, 250)); }
    }
  }
  const connected = await evaluate(`(${runTurn.toString()})(${JSON.stringify({ id: 'thread-fixture', prompt: '这是独立侧栏的会话管理测试。不要调用工具，只回复 SIDEBAR_THREAD_READY。' })})`);
  if (!connected.completed || connected.errors.length || !connected.text.includes('SIDEBAR_THREAD_READY')) throw new Error('Real thread fixture failed');
  const threadId = runtime.threadId;
  report.threadId = threadId; report.connection = connected;
  await call({ action: 'rename', threadId, name: '本轮目标与归档测试' });
  try {
    await evaluate(`document.querySelector('.cx-add-menu').open = true; document.querySelector('.cx-native-goal > button').click()`);
    await until(() => evaluate(`!!document.querySelector('.cx-native-goal textarea:not(:disabled)')`));
    await evaluate(`(() => { const input = document.querySelector('.cx-native-goal textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, '验证独立侧栏的原生目标同步'); input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
    await new Promise(resolve => setTimeout(resolve, 100));
    await evaluate(`document.querySelector('.cx-goal-save').click()`);
    await until(async () => (await call({ action: 'goalGet', threadId })).data?.goal?.status === 'paused');
    const created = await call({ action: 'goalGet', threadId });
    await checkpoint('goal-paused', { goal: created.data.goal });
    await evaluate(`document.querySelector('.cx-goal-complete').click()`);
    await until(async () => (await call({ action: 'goalGet', threadId })).data?.goal?.status === 'complete');
    await checkpoint('goal-complete', {});
    await evaluate(`document.querySelector('.cx-goal-clear').click()`);
    await until(async () => (await call({ action: 'goalGet', threadId })).data?.goal === null);
    await checkpoint('goal-cleared', {});
  } catch (error) {
    report.results.push({ id: 'goal', passed: false, error: error.message }); save();
    await capture(window, path.join(runDir, 'goal-error.png')); console.log(`FAIL goal: ${error.message}`);
  }
  await evaluate(`document.querySelector('.cx-add-menu').open = false; document.querySelector('[aria-label="打开会话导航"]').click()`);
  await until(() => evaluate(`!!document.querySelector('.cx-native-archive')`));
  await evaluate(`document.querySelector('.cx-native-archive').click()`);
  await until(async () => (await call({ action: 'threads', archived: true })).data?.data?.some(item => item.id === threadId));
  const active = await call({ action: 'threads' });
  if (active.data.data.some(item => item.id === threadId)) throw new Error('Archived thread still appears in active list');
  await evaluate(`[...document.querySelectorAll('.cx-history-filter button')].find(button => button.textContent === '已归档').click()`);
  await until(() => evaluate(`!!document.querySelector('.cx-native-archive') && document.querySelector('.cx-native-archive').textContent === '恢复'`));
  await checkpoint('thread-archived', {});
  await evaluate(`document.querySelector('.cx-native-archive').click()`);
  await until(async () => (await call({ action: 'threads' })).data?.data?.some(item => item.id === threadId));
  await evaluate(`[...document.querySelectorAll('.cx-history-filter button')].find(button => button.textContent === '会话').click()`);
  await until(() => evaluate(`!!document.querySelector('.cx-native-thread')`));
  await checkpoint('thread-restored', {});
  const restoredGoal = await call({ action: 'goalSet', threadId, objective: '验证恢复后目标可写', status: 'paused' });
  if (!restoredGoal.ok) throw new Error(`Goal after restore failed: ${restoredGoal.error}`);
  const clearedGoal = await call({ action: 'goalClear', threadId });
  if (!clearedGoal.ok || (await call({ action: 'goalGet', threadId })).data.goal !== null) throw new Error(`Goal cleanup after restore failed: ${clearedGoal.error}`);
  await checkpoint('restored-goal-write', { goalCleared: true });
  report.finishedAt = new Date().toISOString(); save();
  return { ...report, reportPath };
};
