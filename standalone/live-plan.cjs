'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { runTurn } = require('./live-categories.cjs');
const capture = require('./capture-ui.cjs');

exports.run = async ({ window, workspace, runDir, runtime }) => {
  const fixture = path.join(workspace, 'greeter.cjs');
  const initial = "exports.greet = name => 'Hello, ' + name;\n";
  fs.writeFileSync(fixture, initial);
  const reportPath = path.join(runDir, 'plan.json');
  const report = { startedAt: new Date().toISOString(), workspace, realCli: true, results: [] };
  const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const specs = [
    { id: 'plan', prompt: '请先读取 greeter.cjs，规划一个小修改：greet 在 name 为空、null 或 undefined 时使用默认名“朋友”。只规划，不修改文件，不运行写入命令。需求已明确，不需要提问。请使用原生计划模式的最终方案格式，写出完整自包含的 Markdown 方案，包含方案标题、目标、具体修改步骤、边界处理、至少三个验收用例。明确空字符串、null、undefined 和正常名称的预期结果。不要只回复一句总结。' },
    { id: 'revise', clickSelector: '.cg-plan-implementation .cg-question-other-row button', feedbackSelector:'.cg-plan-implementation input', feedback: '调整方案：默认名从“朋友”改为“访客”。其余范围不变，仅涉及 greeter.cjs。仍然只规划、不修改文件。给出调整后的完整方案。' },
    { id: 'implement', clickSelector: '.cg-plan-implementation [role=radio]', approvedFile: fixture },
  ];
  if (process.argv.includes('--plan-preview-only')) specs.splice(2,1);
  if (process.argv.includes('--plan-direct')) {
    specs.splice(1, 1);
    specs[0].prompt = specs[0].prompt.replace('朋友', '访客');
  }
  // Choose workspace-write through the real settings UI. Plan mode must still force
  // read-only; accepting the proposal restores this explicitly selected write policy.
  await window.webContents.executeJavaScript(`(async () => {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    document.querySelector('[aria-label="设置"]').click(); await wait(100);
    document.querySelector('.sw-settings-category').open = true;
    [...document.querySelectorAll('.sw-settings-nav button')].find(button => button.textContent.trim() === 'Codex').click(); await wait(100);
    const select = [...document.querySelectorAll('.sw-settings-fields select')].find(node => [...node.options].some(option => option.value === 'read-only'));
    select.value = 'workspace-write'; select.dispatchEvent(new Event('change', { bubbles: true })); await wait(1200);
    document.querySelector('[aria-label="返回对话"]').click(); await wait(100);
  })()`);
  // Plan is a collaboration mode, separate from the native permission menu.
  await window.webContents.executeJavaScript("document.querySelector('textarea.claudian-input').focus()");
  window.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab',modifiers:['shift']});
  window.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab',modifiers:['shift']});
  const deadline=Date.now()+15000;
  while(runtime.settings.permissionMode!=='plan'){
    if(Date.now()>deadline)throw Error('Shift+Tab did not enter real plan mode');
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  for (const spec of specs) {
    console.log(`START ${spec.id}`);
    const result = await window.webContents.executeJavaScript(`(${runTurn.toString()})(${JSON.stringify(spec)})`);
    if(spec.id!=='implement') {
      result.planPresentation=await window.webContents.executeJavaScript(`(() => {const card=[...document.querySelectorAll('.cg-plan-card')].at(-1);const body=card?.querySelector('.cg-plan-content');const request=document.querySelector('.cg-plan-implementation');return {text:body?.innerText||'',steps:body?.querySelectorAll('li').length||0,cards:document.querySelectorAll('.cg-plan-implementation').length,inFooter:!!request?.closest('.claudian-input-footer'),hasActions:!!request?.querySelector('[role=radio]'),canExpand:!!card?.querySelector('[aria-label="展开方案"]')};})()`);
      await window.webContents.executeJavaScript(`[...document.querySelectorAll('.cg-plan-card')].at(-1).querySelector('[aria-label="展开方案"]').click()`);
      result.planExpanded=await window.webContents.executeJavaScript(`!![...document.querySelectorAll('.cg-plan-card')].at(-1).querySelector('[aria-label="折叠方案"]')`);
      await new Promise(resolve=>setTimeout(resolve,350));
      await capture(window,path.join(runDir,spec.id+'-expanded.png'));
      await window.webContents.executeJavaScript(`[...document.querySelectorAll('.cg-plan-card')].at(-1).querySelector('[aria-label="折叠方案"]').click()`);
      await new Promise(resolve=>setTimeout(resolve,350));
    }
    const source = fs.readFileSync(fixture, 'utf8');
    const passed = result.completed && result.usageEvents.length > 0 && !result.errors.length && !result.ui.protocolTags && !result.ui.horizontalOverflow && (spec.id === 'implement'
      ? source !== initial && source.includes('访客') && runtime.settings.permissionMode !== 'plan' && !result.ui.planDecision
      : source === initial && result.planApprovals.length === 1 && result.ui.planDecision && result.proposals.length > 0 && result.planPresentation.text.length>100 && result.planPresentation.steps>=3 && result.planPresentation.cards===1 && result.planPresentation.inFooter && result.planPresentation.hasActions && result.planPresentation.canExpand && result.planExpanded && (spec.id !== 'revise' || result.planApprovals[0].plan.includes('访客')));
    const snapshot = path.join(runDir, `${spec.id}.png`);
    await capture(window, snapshot);
    report.results.push({ id: spec.id, passed, result, snapshot, fixtureUnchanged: source === initial, permissionMode: runtime.settings.permissionMode });
    save(); console.log(`${passed ? 'PASS' : 'FAIL'} ${spec.id}: ${JSON.stringify({ errors: result.errors, proposals: result.proposals.length, approvals: result.planApprovals.length, mode: runtime.settings.permissionMode, snapshot })}`);
    if (!process.argv.includes('--background-test')) { window.show(); window.focus(); }
    if (!passed) break;
    if (process.argv.includes('--pause-after-each')) {
      console.log(`WAIT visual check: ${spec.id}`);
      const gate = path.join(runDir, `${spec.id}.checked`), deadline = Date.now() + 600000;
      while (!fs.existsSync(gate)) { if (Date.now() > deadline) throw new Error(`Visual check timed out: ${spec.id}`); await new Promise(resolve => setTimeout(resolve, 250)); }
    }
  }
  report.ok = report.results.length === specs.length && report.results.every(result => result.passed);
  report.finishedAt = new Date().toISOString(); save();
  return { ...report, reportPath };
};
