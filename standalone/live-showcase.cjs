'use strict';
const fs = require('node:fs');
const path = require('node:path');
const capture = require('./capture-ui.cjs');
const { randomUUID } = require('node:crypto');

exports.run = async ({ window, runtime, workspace, runDir }) => {
  const report = { results: [], realCli: [], errors: [], startedAt: new Date().toISOString() };
  const reportPath = path.join(runDir, 'showcase.json');
  const evaluate = code => window.webContents.executeJavaScript(code);
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const tokenBaselines = new Map();
  function recordRealCase(id, events, proof = {}) {
    const usageEvent = events.filter(event=>event.chunk?.type==='usage' && event.raw?.params?.tokenUsage?.total).at(-1);
    const threadId = runtime.threadId;
    const total = usageEvent?.raw.params.tokenUsage.total;
    const baseline = tokenBaselines.get(threadId) || {};
    const tokens = total ? Object.fromEntries(['inputTokens','outputTokens','cachedInputTokens','reasoningOutputTokens','totalTokens'].map(key=>[key,Number(total[key]||0)-Number(baseline[key]||0)])) : null;
    if (total) tokenBaselines.set(threadId, total);
    report.realCli.push({id,threadId,tokens,proof,events:[...events]});
    fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
    console.log('REAL '+id+' '+JSON.stringify({threadId,tokens}));
  }
  async function until(fn, timeout = 15000) {
    const end = Date.now() + timeout;
    while (!await fn()) { if (Date.now() > end) throw Error('Showcase verification timed out'); await delay(80); }
  }
  async function checkpoint(id) {
    const proof = await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,oldSidebar:!!document.querySelector('.sidebar-navigation:not(.sidebar-manager-scroll),.claudian-nav-sidebar'),errors:window.__showcaseErrors,footer:document.querySelector('.claudian-input-footer')?.innerText})`);
    proof.approval = await evaluate(`(() => {const node=document.querySelector('.cg-approval');if(!node)return null;const s=getComputedStyle(node);return {background:s.backgroundColor,radius:s.borderRadius,color:s.color};})()`);
    if (proof.approval) {
      const reference = require('../docs/codex-desktop-theme.json').surface;
      if (['background','radius','color'].some(key=>proof.approval[key]!==reference[key])) throw Error('Approval CSS differs from native desktop cascade: '+JSON.stringify(proof.approval));
    }
    if (proof.overflow || proof.oldSidebar || proof.errors.length) throw Error('Invalid visible UI: ' + JSON.stringify(proof));
    const screenshot = path.join(runDir, id + '.png'); await capture(window, screenshot);
    report.results.push({ id, passed: true, screenshot, proof });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2)); console.log('PASS ' + id);
  }
  async function manager(section = 'sessions') {
    if(section==='engines')return;
    await evaluate(`document.querySelector('.sidebar-engine-menu').open=false`);
    await until(() => evaluate(`!document.querySelector('.sidebar-conversation-manager')`));
    if(section==='samples'){
      await evaluate(`document.querySelector('[aria-label=设置]').click()`);
      await until(()=>evaluate(`!!document.querySelector('.sw-settings-category')`));
      await evaluate(`document.querySelector('.sw-settings-category').open=true;[...document.querySelectorAll('.sw-settings-nav button')].find(n=>n.getAttribute('aria-label')==='调试与样例').click()`);
      return;
    }
    await evaluate(`document.querySelector('.sidebar-logo-button').click()`);
    await until(() => evaluate(`!!document.querySelector('.sidebar-session-menu-item')`));
  }
  async function sample(id) {
    await manager('samples');
    await until(() => evaluate(`!!document.querySelector('[data-sample-id=${JSON.stringify(id)}]')`));
    await evaluate(`document.querySelector('[data-sample-id=${JSON.stringify(id)}]').click()`);
    await until(() => evaluate(`!document.querySelector('.sidebar-engine-menu').open`));
    await delay(120);
    await evaluate(`document.querySelector('.claudian-messages').scrollTop=0`);
  }
  async function send(text) {
    await evaluate(`(() => { const t=document.querySelector('textarea.claudian-input'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,${JSON.stringify(text)}); t.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await delay(80);
    await evaluate(`document.querySelector('textarea.claudian-input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))`);
  }
  try {
    await evaluate(`window.__showcaseErrors=[];window.addEventListener('error',event=>window.__showcaseErrors.push(event.message));`);
    if (!process.argv.includes('--real-token-suite')) {
    for (const id of ['conversation', 'tools', 'changes', 'plan', 'permission', 'question', 'review', 'recovery']) {
      await sample(id);
      if (id === 'changes') {
        await evaluate(`document.querySelector('.cx-activity-toggle')?.click()`);
        await until(() => evaluate(`!!document.querySelector('.cx-activity-detail')`));
      }
      if (['permission', 'question'].includes(id)) {
        if (await evaluate(`!!document.querySelector('textarea.claudian-input')`)) throw Error('Request is duplicated beside the composer');
        if (!await evaluate(`!!document.querySelector('.cg-${id === 'permission' ? 'approval' : 'question'}')`)) throw Error('Native request component is missing');
      }
      await checkpoint('sample-' + id);
    }
    await sample('permission');
    await evaluate(`document.querySelector('[aria-label="更多批准选项"]').click()`);
    await until(() => evaluate(`!!document.querySelector('.cg-approval-scope-menu')`));
    await checkpoint('approval-scope-menu');
    await evaluate(`Array.from(document.querySelectorAll('.cg-approval-scope-menu button')).find(button=>button.innerText.includes('允许此会话')).click()`);
    await until(() => evaluate(`document.body.innerText.includes('样例反馈：允许此会话')`));
    await checkpoint('sample-approval-answered');
    await sample('question');
    await evaluate(`document.querySelector('[role=radio][aria-label="交给宿主软件"]').click()`);
    await until(() => evaluate(`!!document.querySelector('[role=checkbox]')`));
    await evaluate(`document.querySelectorAll('[role=checkbox]')[0].click()`);
    await delay(80);
    await evaluate(`document.querySelectorAll('[role=checkbox]')[1].click()`);
    if (!await evaluate(`document.querySelectorAll('[role=checkbox][aria-checked=true]').length===2`)) throw Error('Multi-select lost an answer');
    await checkpoint('sample-question-multiple');
    await evaluate(`document.querySelector('.cg-question-other-row button').click()`);
    await until(() => evaluate(`document.body.innerText.includes('样例反馈：保存方式：交给宿主软件')`));
    await checkpoint('sample-question-answered');
    if (runtime.currentTurnId) throw Error('A sample started a real turn');
    await manager('sessions');
    await until(() => evaluate(`!!document.querySelector('.sidebar-session-menu-item')`));
    await evaluate(`document.querySelector('.sidebar-manager-scroll').scrollTop=0`);
    await checkpoint('conversation-manager');
    if (process.argv.includes('--showcase-ui-only')) { report.ok=true; report.finishedAt=new Date().toISOString(); fs.writeFileSync(reportPath,JSON.stringify(report,null,2)); return {...report,reportPath}; }
    }
    await evaluate(`document.querySelector('.sidebar-engine-menu').open=false;document.querySelector('[aria-label="新对话"]').click()`);
    await until(() => evaluate(`!document.querySelector('textarea.claudian-input').readOnly`));
    const events = [], originalEmit = runtime.emit.bind(runtime);
    runtime.emit = event => { if (['approval','turn-started','done','error'].includes(event.type) || ['tool_use','tool_result','usage'].includes(event.chunk?.type)) events.push(event); originalEmit(event); };
    if (process.argv.includes('--real-token-suite') && !process.argv.includes('--real-token-resume')) {
      const reply = 'LIVE_CHAT_' + randomUUID();
      await send('真实连接验证。不要使用工具，只回复这一串文字：' + reply);
      await until(()=>events.some(event=>event.type==='done'||event.type==='error'),120000);
      if(events.some(event=>event.type==='error') || !await evaluate(`document.querySelector('.cg-assistant-message')?.innerText.includes(${JSON.stringify(reply)})`))throw Error('Real conversation response mismatch');
      if(events.some(event=>event.chunk?.type==='tool_use'))throw Error('Plain conversation unexpectedly used tools');
      recordRealCase('plain-conversation',events);
      await checkpoint('real-conversation');
      events.length=0;
      const marker='LIVE_FILE_'+randomUUID(),fixturePath=path.join(workspace,'real-token-read.txt');
      fs.writeFileSync(fixturePath,marker);
      await send('这是只读真实测试。请使用工具读取这个文件，并只回复文件原文：'+fixturePath+'。不要修改文件，不要访问网络。');
      await until(()=>events.some(event=>['done','error','approval'].includes(event.type)),120000);
      if(!events.some(event=>event.type==='done') || events.some(event=>event.type==='error'||event.type==='approval'))throw Error('Real file read did not complete without escalation');
      if(!events.some(event=>event.chunk?.type==='tool_use'))throw Error('File read used no real tool');
      if(!await evaluate(`Array.from(document.querySelectorAll('.cg-assistant-message')).some(node=>node.innerText.includes(${JSON.stringify(marker)}))`))throw Error('Real file content missing from response');
      if(fs.readFileSync(fixturePath,'utf8')!==marker)throw Error('Read-only fixture was modified');
      recordRealCase('file-read',events,{fixtureUnchanged:true,marker});
      await checkpoint('real-file-read');
      events.length=0;
    }
    if (!process.argv.includes('--showcase-cancel-only') && !process.argv.includes('--real-token-resume')) {
    await send('这是隔离侧栏 UI 验证。请仅通过终端执行 Write-Output APPROVAL_UI_OK，必须把这个 exec_command 调用的 sandbox_permissions 设置为 require_escalated 并说明“验证侧栏审批组件”。不读写文件，不执行其他命令，收到许可并完成命令后只回复 APPROVAL_UI_OK。');
    await until(() => evaluate(`!!document.querySelector('.cg-approval')`) || events.some(event => ['done','error'].includes(event.type)), 120000);
    const approval = events.find(event => event.type === 'approval')?.approval;
    if (!approval || approval.kind !== 'command' || !/APPROVAL_UI_OK/.test(approval.input?.command || '')) throw Error('Expected a real approval for the exact harmless test command');
    if (!await evaluate(`Array.from(document.querySelectorAll('.cg-approval button')).some(button=>/取消|拒绝/.test(button.innerText))`)) throw Error('Approval has no cancel/deny action');
    await checkpoint('real-approval-pending');
    await evaluate(`Array.from(document.querySelectorAll('.cg-approval button')).find(button=>button.innerText==='允许这一次').click()`);
    await until(() => events.some(event => event.type === 'done'), 120000);
    await until(() => evaluate(`Array.from(document.querySelectorAll('.cg-assistant-message')).some(node=>node.innerText.includes('APPROVAL_UI_OK'))`));
    if(!events.some(event=>event.raw?.params?.item?.type==='commandExecution' && /APPROVAL_UI_OK/.test(event.raw.params.item.command || '') && event.raw.params.item.exitCode===0))throw Error('Approved native command returned no successful exit status');
    if (await evaluate(`document.body.innerText.includes('执行失败')`)) throw Error('Successful approved command rendered as failed');
    recordRealCase('command-approval',events);
    await checkpoint('real-approval-completed');
    }
    events.length = 0;
    await send('这是取消审批验证。只尝试终端 Write-Output CANCEL_MUST_NOT_EXECUTE，调用 exec_command 时必须 require_escalated，说明“验证取消审批”。用户如果取消，立即停止工具调用，不重试、不换命令，最后只回复 CANCEL_UI_OK。不要读写文件。');
    await until(() => evaluate(`!!document.querySelector('.cg-approval')`) || events.some(event => ['done','error'].includes(event.type)), 120000);
    const cancelApproval = events.find(event=>event.type==='approval')?.approval;
    if(!cancelApproval || !/CANCEL_MUST_NOT_EXECUTE/.test(cancelApproval.input?.command || '')) throw Error('Expected exact harmless cancel test approval');
    await checkpoint('real-cancel-pending');
    await evaluate(`Array.from(document.querySelectorAll('.cg-approval button')).find(button=>/^(取消|拒绝)$/.test(button.innerText)).click()`);
    await until(() => events.some(event=>event.type==='done'), 120000);
    recordRealCase('command-cancel',events);
    fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
    const cancelledCommand=events.find(event=>event.chunk?.type==='tool_result' && event.raw?.params?.item?.type==='commandExecution' && /CANCEL_MUST_NOT_EXECUTE/.test(event.raw.params.item.command || ''));
    if(!cancelledCommand || cancelledCommand.raw.params.item.status!=='declined' || cancelledCommand.raw.params.item.exitCode===0) throw Error('Cancelled command was not declined by the native CLI');
    if(await evaluate(`!!document.querySelector('.cg-approval')`)) throw Error('Cancelled approval stayed visible');
    await checkpoint('real-cancel-completed');
    if (process.argv.includes('--showcase-cancel-only')) { report.ok=true;report.finishedAt=new Date().toISOString();fs.writeFileSync(reportPath,JSON.stringify(report,null,2));return {...report,reportPath}; }
    await manager('sessions');
    await until(() => evaluate(`document.querySelectorAll('[data-conversation-id^="codex:"]').length>0`));
    await checkpoint('real-native-history');
    await manager('engines');
    await evaluate(`document.querySelector('[data-engine=claude]').click()`);
    await until(() => runtime.settings.provider === 'claude');
    const owner = runtime.activeSessionKey;
    await manager('sessions');
    await until(() => evaluate(`document.querySelectorAll('[data-conversation-id^="codex:"]').length>0`), 30000);
    if (runtime.settings.provider !== 'claude' || runtime.activeSessionKey !== owner) throw Error('Browsing history stole the provider/session');
    await checkpoint('claude-view-codex-history');
    await manager('engines'); await evaluate(`document.querySelector('[data-engine=codex]').click()`);
    await until(() => evaluate(`document.documentElement.dataset.sidebarProvider==='codex'`));
    await evaluate(`document.querySelector('[aria-label="新对话"]').click()`);
    await until(() => evaluate(`document.querySelectorAll('.cg-message').length===0`));
    await evaluate(`document.querySelector('.cx-permission-menu').open=true`);
    await evaluate(`Array.from(document.querySelectorAll('.cx-permission-menu button')).find(button=>button.innerText.includes('计划模式')).click()`);
    await delay(180); events.length = 0;
    await send('这是独立侧栏真实提问测试。请先调用 request_user_input 提出一个单选问题“默认名称采用哪一个？”，选项为“访客”和“用户”。收到回答后只给出一个简短方案，最后写 QUESTION_UI_OK。不读取或修改文件，不调用终端。必须先提问，不能替我作答。');
    await until(() => evaluate(`!!document.querySelector('.cg-question')`) || events.some(event => ['done','error'].includes(event.type)), 120000);
    if (!await evaluate(`!!document.querySelector('.cg-question')`)) throw Error('CLI did not request user input');
    await checkpoint('real-question-pending');
    await evaluate(`document.querySelectorAll('.cg-question [role=radio]')[0].click()`);
    await until(() => events.some(event => event.type === 'done'), 120000);
    if (!await evaluate(`document.body.innerText.includes('QUESTION_UI_OK')`)) throw Error('CLI did not consume the submitted answer');
    recordRealCase('request-user-input',events);
    await checkpoint('real-question-completed');
    if(process.argv.includes('--real-token-suite') && !report.realCli.some(result=>result.tokens?.totalTokens>0)) throw Error('Native CLI reported no token usage');
    report.ok = true;
  } catch (error) {
    report.errors.push(error.message); report.ok = false;
    await capture(window, path.join(runDir, 'showcase-error.png'));
    console.log('FAIL showcase: ' + error.message);
  }
  report.finishedAt = new Date().toISOString(); fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  return { ...report, reportPath };
};
