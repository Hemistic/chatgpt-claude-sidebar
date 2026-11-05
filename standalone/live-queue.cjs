'use strict';
const fs = require('node:fs');
const path = require('node:path');
const capture = require('./capture-ui.cjs');

exports.run = async ({ window, runDir, runtime }) => {
  const reportPath = path.join(runDir, 'queue.json');
  const report = { realCli: true, startedAt: new Date().toISOString(), results: [], events: [] };
  const evaluate = code => window.webContents.executeJavaScript(code);
  const call = payload => evaluate(`window.claudianSidebar.codexAction(${JSON.stringify({ threadId: runtime.threadId, ...payload })})`);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function until(fn, timeout = 30000) {
    const deadline = Date.now() + timeout;
    while (!await fn()) { if (Date.now() > deadline) throw new Error('真实队列状态等待超时'); await wait(100); }
  }
  const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  async function checkpoint(id, detail = {}) {
    const snapshot = path.join(runDir, `${id}.png`); await capture(window, snapshot);
    report.results.push({ id, passed: true, snapshot, ...detail }); save(); console.log(`PASS ${id}`);
  }
  await evaluate(`window.__queueProof=[]; void window.claudianSidebar.onEvent(event => { if (['done','turn-started','native-queue-idle','error','approval'].includes(event.type)) window.__queueProof.push(event); });`);
  try {
    await evaluate(`(() => { const t=document.querySelector('textarea.claudian-input');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,'这是隔离队列测试。请仅使用终端执行 Start-Sleep -Seconds 45，等待完成后只回复 QUEUE_BASE_DONE。不要读写文件，不要执行其他命令和操作。');t.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await wait(100);
    await evaluate(`document.querySelector('textarea.claudian-input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))`);
    await until(() => !!runtime.currentTurnId);
    report.threadId = runtime.threadId;
    await evaluate(`document.querySelector('.cx-add-menu').open=true;document.querySelector('.cx-native-queue > button').click()`);
    await until(() => evaluate(`!!document.querySelector('.cx-native-queue textarea:not(:disabled)')`));
    async function add(text) {
      await evaluate(`(() => {const t=document.querySelector('.cx-native-queue textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,${JSON.stringify(text)});t.dispatchEvent(new Event('input',{bubbles:true}));})()`); await wait(100);
      await evaluate(`document.querySelector('.cx-native-queue button[type=submit]').click()`);
    }
    await add('不要使用工具，只回复 QUEUE_A_DONE');
    await until(async () => (await call({ action: 'queueList' })).data?.data?.length === 1);
    await until(() => evaluate(`!document.querySelector('.cx-native-queue textarea').disabled`));
    await add('不要使用工具，只回复 QUEUE_B_DONE');
    await until(async () => (await call({ action: 'queueList' })).data?.data?.length === 2);
    await checkpoint('queue-added', { queue: (await call({ action: 'queueList' })).data });
    await until(() => evaluate(`!document.querySelector('.cx-native-queue textarea').disabled`));
    await evaluate(`document.querySelectorAll('.cx-queue-actions')[1].querySelector('button').click()`);
    await add('不要使用工具，只回复 QUEUE_B_EDITED');
    await until(async () => JSON.stringify((await call({ action: 'queueList' })).data).includes('QUEUE_B_EDITED'));
    await until(() => evaluate(`!document.querySelector('.cx-native-queue textarea').disabled`));
    await evaluate(`document.querySelectorAll('.cx-queue-actions')[1].querySelector('[aria-label="上移消息"]').click()`);
    await until(async () => (await call({ action: 'queueList' })).data?.data?.[0]?.input?.[0]?.text.includes('QUEUE_B_EDITED'));
    await checkpoint('queue-reordered', { queue: (await call({ action: 'queueList' })).data });
    await until(() => evaluate(`!document.querySelector('.cx-native-queue textarea').disabled`));
    await evaluate(`document.querySelectorAll('.cx-queue-actions')[1].querySelector('[aria-label="删除待发消息"]').click()`);
    await until(async () => (await call({ action: 'queueList' })).data?.data?.length === 1);
    await checkpoint('queue-deleted', { queue: (await call({ action: 'queueList' })).data });
    await evaluate(`document.querySelector('.cx-add-menu').open=false`);
    await until(() => evaluate(`document.body.innerText.includes('QUEUE_B_EDITED') && !document.querySelector('[aria-label="停止生成"]')`), 150000);
    const proof = await evaluate(`({messages:[...document.querySelectorAll('.cx-turn')].map(node=>({role:node.dataset.role,text:node.innerText})),events:window.__queueProof,overflow:document.documentElement.scrollWidth>innerWidth})`);
    const assistants = proof.messages.filter(message => message.role === 'assistant');
    if (assistants.length !== 2 || !assistants[0].text.includes('QUEUE_BASE_DONE') || !assistants[1].text.includes('QUEUE_B_EDITED') || proof.overflow) throw new Error('原生队列回复串轮、漏轮或界面溢出');
    report.events = proof.events;
    await checkpoint('queue-executed', { proof });
  } catch (error) {
    report.results.push({ id: 'queue', passed: false, error: error.message }); save();
    await capture(window, path.join(runDir, 'queue-error.png')); console.log(`FAIL queue: ${error.message}`);
  }
  report.finishedAt = new Date().toISOString(); save();
  return { ...report, reportPath };
};
