'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// Runs inside the real renderer, exercising its input and the real preload IPC.
async function probe({ fixturePath, marker }) {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const until = async (fn, timeout = 20000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) { if (fn()) return; await wait(100); }
    throw new Error('Timed out waiting for sidebar / Codex response');
  };
  await until(() => document.querySelector('textarea.claudian-input'));
  await wait(1500);
  const api = window.claudianSidebar;
  const state = await api.getState();
  const started = Date.now();
  const stats = { provider: state.settings.provider, model: state.settings.model, workspace: state.settings.workspace,
    firstTextMs: null, tools: [], approvals: 0, errors: [], completed: false, streamedText: '' };
  const unsubscribe = api.onEvent(event => {
    if (event.threadId) stats.threadId = event.threadId;
    if (event.turnId) stats.turnId = event.turnId;
    if (event.type === 'chunk' && event.chunk?.type === 'text') {
      stats.firstTextMs ??= Date.now() - started;
      stats.streamedText += String(event.chunk.content || '');
    }
    if (event.type === 'chunk' && event.chunk?.type === 'tool_use') stats.tools.push(event.chunk.name);
    if (event.type === 'approval') stats.approvals++;
    if (event.type === 'error') stats.errors.push(String(event.content || event.message || 'Runtime error'));
    if (event.type === 'done') stats.completed = true;
  });
  try {
    const textarea = document.querySelector('textarea.claudian-input');
    const prompt = `This is a read-only integration test. Use your file-reading tool to read exactly this file: ${fixturePath}. Reply with only the full content of that file. Do not edit files, run other tasks, or access the network.`;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, prompt);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(100);
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await until(() => stats.completed || stats.errors.length || stats.approvals, 180000);
    await wait(1500);
    const matched = Array.from(document.querySelectorAll('.claudian-message-assistant .claudian-text-block'))
      .some(node => node.textContent.includes(marker));
    return { ...stats, matched, elapsedMs: Date.now() - started,
      ok: stats.provider === 'codex' && matched && stats.streamedText.includes(marker) && stats.completed && stats.tools.length > 0 && !stats.errors.length && !stats.approvals };
  } finally {
    unsubscribe();
    if (!stats.completed) await api.cancelTurn().catch(() => {});
  }
}

exports.run = async ({ window, workspace, runDir }) => {
  const marker = `SIDEBAR_CODEX_${randomUUID()}`;
  const fixturePath = path.join(workspace, 'read-test.txt');
  fs.writeFileSync(fixturePath, marker);
  let report;
  try {
    report = await window.webContents.executeJavaScript(`(${probe.toString()})(${JSON.stringify({ fixturePath, marker })})`);
  } catch (error) { report = { ok: false, error: error.message }; }
  fs.writeFileSync(path.join(runDir, 'sidebar.png'), (await window.webContents.capturePage()).toPNG());
  report.fixtureUnchanged = fs.readFileSync(fixturePath, 'utf8') === marker;
  report.ok = report.ok && report.fixtureUnchanged;
  fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`${report.ok ? 'PASS' : 'FAIL'} real Codex UI → file read → streamed answer`);
  console.log(`Report: ${path.join(runDir, 'report.json')}`);
  return report;
};
