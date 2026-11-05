'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const capture=require('./capture-ui.cjs');
exports.run=async({window,runtime,runDir,workspace})=>{
 const report={results:[],errors:[],kind:'Claude SDK callback → runtime event → renderer → preload IPC → SDK result; deterministic requests, no model inference',modelRequests:0};
 const reportPath=path.join(runDir,'claude-interactions.json');
 const evaluate=async code=>{try{return await window.webContents.executeJavaScript(code)}catch(error){throw Error(code.slice(0,180)+': '+error.message)}},pause=ms=>new Promise(r=>setTimeout(r,ms));
 const save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
 async function until(code){const end=Date.now()+15000;while(!await evaluate(code)){if(Date.now()>end)throw Error('Interaction timeout: '+code);await pause(40)}}
 async function shot(id,proof={}){
  await pause(120);
  const state=await evaluate(`({errors:window.__interactionErrors,overflow:document.documentElement.scrollWidth>innerWidth,provider:document.documentElement.dataset.sidebarProvider,dialogs:document.querySelectorAll('[data-claude-interaction]').length,raw:document.body.innerText.includes('"tool_use_id"')})`);
  const screenshot=path.join(runDir,id+'.png');await capture(window,screenshot);
  report.results.push({id,screenshot,proof,state});save();
  assert.deepEqual(state.errors,[]);assert.equal(state.overflow,false);assert.equal(state.raw,false);assert.equal(state.provider,'claude');
  console.log('PASS '+id);
 }
 async function click(label){
  const selector=`[...document.querySelectorAll('[data-claude-interaction] button')].find(n=>n.innerText.trim().startsWith(${JSON.stringify(label)}) && (${JSON.stringify(label)}!=='Accept'||!n.innerText.includes('and')) && !n.disabled)`;
  await until(`!!(${selector})`);
  window.focus();await pause(450); // Native actions re-arm for 400ms after focus.
  const point=await evaluate(`(()=>{const n=(${selector});n.scrollIntoView({block:'nearest'});const r=n.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
  for(const type of ['mouseMove','mouseDown','mouseUp'])window.webContents.sendInputEvent({type,...point,...(type==='mouseMove'?{}:{button:'left',clickCount:1})});
 }
 async function type(selector,text){
  await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});n.focus();n.select()})()`);
  const d=window.webContents.debugger,attach=!d.isAttached();if(attach)d.attach('1.3');
  try{await d.sendCommand('Input.insertText',{text})}finally{if(attach)d.detach()}
  await pause(70);
 }
 const callback=runtime.createClaudeSdkApprovalCallback();
 async function request(tool,input){
  const promise=callback(tool,input,{toolUseID:'fixture-'+report.results.length});
  await until(`document.querySelectorAll('[data-claude-interaction]').length===1`);
  await pause(450);return {promise};
 }
 async function answered(promise){
  const value=await Promise.race([promise,new Promise((_,j)=>setTimeout(()=>j(Error('SDK callback never resolved')),15000))]);
  await until(`!document.querySelector('[data-claude-interaction]')`);return value;
 }
 const questionInput={questions:[
  {header:'保存方式',question:'对话记录保存在哪里？',options:[{label:'保存在本机',value:'local',description:'离线可用。'},{label:'交给宿主软件',value:'host',description:'由宿主管理。'}]},
  {header:'首批功能',question:'第一批需要哪些能力？',multiSelect:true,options:[{label:'文件修改',value:'files'},{label:'终端执行',value:'terminal'}]},
 ]};
 const plan='# 审批交互测试方案\n\n只验证交互，不修改用户文件。\n\n1. 读取专用夹具。\n2. 执行用户选择的步骤。';
 try{
  window.showInactive();
  await until(`!!window.ClaudeNativeSource && !!document.querySelector('[data-engine=claude]')`);
  await evaluate(`window.__interactionErrors=[];window.addEventListener('error',e=>window.__interactionErrors.push(e.error?.stack||e.message));document.querySelector('[data-engine=claude]').click()`);
  await until(`document.documentElement.dataset.sidebarProvider==='claude'`);
  await until(`!!document.querySelector('[contenteditable=true]')`);
  await pause(700);
  assert.equal(runtime.settings.provider,'claude');
  runtime.emit({type:'turn-started',nativeQueued:true,turnId:'interaction-fixture-turn',provider:'claude'});
  await pause(150);
  for(const [label,decision] of [['Allow once','allow'],['Always allow','allow-always'],['Deny','deny']]){
   const {promise}=await request('Bash',{command:'echo CLAUDE_APPROVAL_FIXTURE'});
   await shot('approval-'+decision);
   await click(label);
   const response=await answered(promise);
   assert.equal(response.behavior,decision==='deny'?'deny':'allow');
   if(decision==='allow-always')assert.ok(response.updatedPermissions?.length);
   await shot('approval-'+decision+'-resolved',response);
  }
  {
   const {promise}=await request('AskUserQuestion',questionInput);
   assert.equal(await evaluate(`[...document.querySelectorAll('.epitaxy-question-card button')].find(n=>n.innerText.trim().startsWith('Next')).disabled`),true);
   await shot('question-unanswered');
   await evaluate(`document.querySelectorAll('.epitaxy-answer-option')[1].click()`);await click('Next');
   await until(`document.querySelector('.epitaxy-question-card').innerText.includes('第一批需要哪些能力')`);
   await evaluate(`document.querySelectorAll('.epitaxy-answer-option')[1].click();document.querySelectorAll('.epitaxy-answer-option')[0].click()`);
   assert.equal(await evaluate(`document.querySelectorAll('.epitaxy-answer-option[aria-pressed=true]').length`),2);
   await evaluate(`document.querySelector('[aria-label="Show previous question"]').click()`);
   assert.equal(await evaluate(`document.querySelectorAll('.epitaxy-answer-option')[1].getAttribute('aria-pressed')`),'true');
   await evaluate(`document.querySelector('[aria-label="Show next question"]').click()`);
   await shot('question-multi-and-pagination');await click('Submit');
   const response=await answered(promise);
   assert.deepEqual(response.updatedInput.answers,{'对话记录保存在哪里？':'交给宿主软件','第一批需要哪些能力？':['文件修改','终端执行']});
   await shot('question-native-answer-payload',response);
  }
  for(const text of ['','中文补充：采用工作区存储']){
   const {promise}=await request('AskUserQuestion',{questions:[questionInput.questions[0]]});
   await evaluate(`document.querySelector('button[aria-label=Other]').click()`);
   await until(`!!document.querySelector('textarea[aria-label="Other option"]')`);
   if(text)await type('textarea[aria-label="Other option"]',text);
   await shot(text?'question-other-chinese':'question-other-empty');await click('Submit');
   const response=await answered(promise);
   assert.equal(response.updatedInput.answers['对话记录保存在哪里？'],text||'Something else');
  }
  {
   const {promise}=await request('AskUserQuestion',questionInput);
   await click('Skip');await click('Skip');const response=await answered(promise);
   assert.deepEqual(response.updatedInput.answers,{'对话记录保存在哪里？':'[No preference]','第一批需要哪些能力？':'[No preference]'});
   await shot('question-skip-all',response);
  }
  for(const [button,mode] of [['Accept and allow edits','acceptEdits'],['Accept','default'],['Reject',null]]){
   const {promise}=await request('ExitPlanMode',{plan});
   assert.equal(await evaluate(`document.querySelector('.claudian-messages').innerText.includes('审批交互测试方案')`),true);
   assert.equal(await evaluate(`!![...document.querySelectorAll('[data-claude-interaction] button')].find(n=>n.innerText.includes('Open plan'))`),true);
   await shot('plan-'+(mode||'reject'));
   await click(button);const response=await answered(promise);
   assert.equal(response.behavior,mode?'allow':'deny');
   if(mode)assert.equal(response.updatedPermissions[0].mode,mode);else assert.equal(response.interrupt,true);
   await shot('plan-'+(mode||'reject')+'-resolved',response);
  }
  for(const text of ['','只调整第二步，不要写文件']){
   const {promise}=await request('ExitPlanMode',{plan});
   await click('Revise…');await until(`!!document.querySelector('textarea[aria-label="Plan feedback"]')`);
   assert.equal(await evaluate(`document.activeElement.getAttribute('aria-label')`),'Plan feedback');
   if(text)await type('textarea[aria-label="Plan feedback"]',text);
   await shot(text?'plan-feedback-chinese':'plan-feedback-empty');
   if(text){window.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'});window.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'})}else await click('Revise');
   const response=await answered(promise);assert.equal(response.behavior,'deny');assert.equal(response.interrupt,false);assert.equal(response.message,text||'Continue planning.');
   await shot(text?'plan-feedback-enter-submitted':'plan-feedback-empty-continues',response);
  }
  // Run the real serialized control-response writer against a closed then restored
  // test sink. The renderer and preload IPC stay unchanged; no CLI is impersonated.
  {
   const writes=[],original=runtime.writeClaudeControlResponse.bind(runtime);let closed=true;
   runtime.writeClaudeControlResponse=(id,response)=>{const proc=runtime.proc;runtime.proc={stdin:{destroyed:closed,writableEnded:false,write:line=>writes.push(JSON.parse(line))}};try{return original(id,response)}finally{runtime.proc=proc}};
   try{
    const promise=runtime.requestApproval({kind:'command',title:'Retry closed pipe',tool:'Bash',input:{command:'echo RETRY_FIXTURE'}},{source:'claude-control',requestId:'retry-fixture',controlRequest:{toolName:'Bash',input:{command:'echo RETRY_FIXTURE'}}});
    await until(`!!document.querySelector('[data-claude-approval]')`);await pause(450);await click('Allow once');
    await until(`!!document.querySelector('[data-claude-interaction] [role=alert]')`);
    assert.equal(runtime.pendingApprovals.size,1);await shot('approval-delivery-failed-retained');
    closed=false;await click('Allow once');await answered(promise);
    assert.equal(writes.length,1);assert.equal(writes[0].response.request_id,'retry-fixture');await shot('approval-delivery-retry-resolved',writes[0]);
   }finally{runtime.writeClaudeControlResponse=original;}
  }
  report.protocolOk=true;
  if(process.argv.includes('--real-claude-suite')){
   try{report.realService=await require('./claude-live-test.cjs').run({window,workspace,runDir});report.modelRequests=1}
   catch(error){report.modelRequests=1;report.realService={ok:false,error:error.message,report:path.join(runDir,'claude-live.json')}}
  }
  report.ok=report.protocolOk && (!report.realService || report.realService.ok);
 }catch(error){report.ok=false;report.errors.push(error.stack||error.message);await capture(window,path.join(runDir,'interaction-error.png'));console.log('FAIL '+error.message)}
 finally{runtime.resolvePendingClaudeTurnApprovals('deny','test-finished');}
 save();console.log((report.ok?'PASS ':'FAIL ')+reportPath);return {...report,reportPath};
};
