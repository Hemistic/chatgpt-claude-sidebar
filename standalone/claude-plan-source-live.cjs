'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),capture=require('./capture-ui.cjs');
exports.run=async({window,runtime,workspace,runDir})=>{
 const arg=n=>process.argv.find(s=>s.startsWith('--'+n+'='))?.slice(n.length+3);
 assert.equal(arg('test-model'),'claude-haiku-5-5');assert.equal(arg('test-effort'),'high');
 const report={model:arg('test-model'),effort:arg('test-effort'),results:[],rendererErrors:[],realTokens:true},reportPath=path.join(runDir,'claude-plan-source-live.json');
 const save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
 window.once('closed',()=>{report.windowClosedAt=new Date().toISOString();save()});
 window.webContents.on('console-message',(event,level,message)=>{if(event.level==='error'||level>=3)report.rendererErrors.push(event.message||message)});
 const evaluate=s=>window.webContents.executeJavaScript(s),pause=ms=>new Promise(r=>setTimeout(r,ms));
 async function until(s,ms=180000){const deadline=Date.now()+ms;while(!await evaluate(s)){if(Date.now()>deadline)throw Error('Timeout: '+s);await pause(100)}}
 async function shot(name){const file=path.join(runDir,name+'.png');await capture(window,file);return file}
 async function click(selector){const p=await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});n.scrollIntoView({block:'nearest'});const r=n.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);await pause(700);for(const type of ['mouseMove','mouseDown','mouseUp'])window.webContents.sendInputEvent({type,...p,...(type==='mouseMove'?{}:{button:'left',clickCount:1})});}
 async function text(selector,value){await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);const d=window.webContents.debugger;d.attach('1.3');try{await d.sendCommand('Input.insertText',{text:value})}finally{d.detach()}}
 async function chord(key,modifiers=[]){
  // Deliver trusted Chromium input to this test page even if OS focus changes.
  const d=window.webContents.debugger,own=!d.isAttached();if(own)d.attach('1.3');
  try{const code=key==='Enter'?13:27,bits=(modifiers.includes('control')?2:0)|(modifiers.includes('shift')?8:0);
   for(const type of ['keyDown','keyUp'])await d.sendCommand('Input.dispatchKeyEvent',{type,key,code:key,windowsVirtualKeyCode:code,modifiers:bits,...(type==='keyDown'&&key==='Enter'&&!modifiers.includes('control')?{text:'\r'}:{})});
  }finally{if(own&&d.isAttached())d.detach()}await pause(200);
 }
 async function theme(value){await click('[aria-label="设置"]');await until(`!![...document.querySelectorAll('select')].find(n=>[...n.options].some(o=>o.value==='light'))`,10000);await evaluate(`(()=>{const n=[...document.querySelectorAll('select')].find(n=>[...n.options].some(o=>o.value==='light'));n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}))})()`);await until(`document.documentElement.dataset.theme===${JSON.stringify(value)}`,10000);await click('[aria-label="返回对话"]');await pause(350)}
 try{
  report.connection=await require('./claude-live-test.cjs').run({window,workspace,runDir});save();
  const fixture=path.join(workspace,'native-ui-read.txt'),original=fs.readFileSync(fixture,'utf8');
  const modes=arg('plan-cases')?.split(',')||['revise','reject','manual','edits'];
  assert.ok(modes.length&&modes.every(mode=>['revise','reject','manual','edits'].includes(mode)));
  for(const mode of modes){
   await theme(['revise','manual'].includes(mode)?'dark':'light');
   await evaluate(`window.__nativePlan={events:[],usage:[],errors:[],text:'',done:false};window.__nativePlanOff=window.claudianSidebar.onEvent(e=>{const s=window.__nativePlan;s.events.push(e);if(e.chunk?.type==='usage')s.usage.push(e.chunk.usage);if(e.chunk?.type==='text')s.text+=e.chunk.content||'';if(e.type==='error')s.errors.push(e.content);if(e.type==='done')s.done=true});undefined`);
   assert.equal(runtime.settings.model,report.model);assert.equal(runtime.settings.effort,'high');
   const prompt=`Real plan UI check (${mode}). Call EnterPlanMode. Read only ${JSON.stringify(fixture)}. Write a short Chinese plan with heading "独立侧栏计划验证" into your designated plan file, explaining a future read-only inspection of this fixture. Then call ExitPlanMode and wait for my response. Never implement changes, run shell commands, or change any other file. If I revise, acknowledge feedback and finish without another approval. If I reject, stop. If I approve, only Read the same fixture once and finish with PLAN_NATIVE_${mode.toUpperCase()}_OK.`;
   await text('[contenteditable=true]',prompt);await click('[data-cds=ChatComposer] button[aria-label=Send]');
   await until(`!!document.querySelector('[data-claude-native-plan] .epitaxy-approval-card')||window.__nativePlan.done||window.__nativePlan.errors.length`);
   assert.ok(await evaluate(`!!document.querySelector('[data-claude-native-plan] .epitaxy-approval-card')`),'No real native plan card');
   await pause(1000);
   const proof={pending:await shot('plan-'+mode+'-pending'),native:await evaluate(`(()=>{const n=document.querySelector('[data-claude-native-plan]');return{text:n.innerText,source:!!n.closest('[data-claude-controls-source]'),width:n.getBoundingClientRect().width,overflow:n.scrollWidth>n.clientWidth+1,planText:[...document.querySelectorAll('[data-claude-plan]')].at(-1)?.innerText}})()`)};
   assert.ok(proof.native.source);assert.ok(proof.native.planText?.includes('独立侧栏计划验证'));assert.equal(proof.native.overflow,false);assert.match(proof.native.text,/Open plan/);
   if(mode==='reject'){
    for(const width of [360,800]){window.setSize(width,760);await pause(700);proof['width'+width]=await shot('plan-light-'+width);assert.ok(await evaluate(`(()=>{const n=document.querySelector('[data-claude-native-plan]');return n.scrollWidth<=n.clientWidth+1})()`));}
    window.setSize(440,760);await pause(700);
    await evaluate(`[...document.querySelectorAll('[data-claude-native-plan] button')].find(n=>n.innerText.trim()==='Reject').dataset.testReject='';undefined`);await click('[data-test-reject]');
   }else{
    // Original shared-26 Ly requires trusted input after focus/mount and a 400ms
    // grace interval, plus Ty/_y ignores input within 1000ms of window focus.
    // Programmatic focus alone intentionally cannot arm approval.
    await pause(1200);
    const armPoint=await evaluate("(()=>{const r=document.querySelector('[data-claude-native-plan] .epitaxy-approval-card').getBoundingClientRect();return{x:Math.round(r.x+24),y:Math.round(r.y+24)}})()");
    for(const type of ['mouseMove','mouseDown','mouseUp'])window.webContents.sendInputEvent({type,...armPoint,...(type==='mouseMove'?{}:{button:'left',clickCount:1})});
    await pause(650);
    await evaluate(`document.querySelector('[data-claude-native-plan] .epitaxy-approval-card').setAttribute('tabindex','-1');document.querySelector('[data-claude-native-plan] .epitaxy-approval-card').focus({preventScroll:true});undefined`);
    if(mode==='revise'){
     await chord('Escape');await until(`!!document.querySelector('[aria-label="Plan feedback"]')`,8000);
     assert.ok(await evaluate(`document.activeElement===document.querySelector('[aria-label="Plan feedback"]')`));
     await text('[aria-label="Plan feedback"]','仅保留只读检查');await chord('Enter',['shift']);await text('[aria-label="Plan feedback"]','不要创建任何文件');
     assert.ok(await evaluate(`document.querySelector('[aria-label="Plan feedback"]').value.includes(String.fromCharCode(10))`));
     proof.feedback=await shot('plan-native-feedback');
     await chord('Escape');await until(`!document.querySelector('[aria-label="Plan feedback"]')`,8000);
     await chord('Escape');await until(`!!document.querySelector('[aria-label="Plan feedback"]')`,8000);
     assert.equal(await evaluate(`document.querySelector('[aria-label="Plan feedback"]').value`),'');
     await text('[aria-label="Plan feedback"]','仅保留只读检查。确认收到反馈后结束，不要再次请求批准。');await chord('Enter');
    }else await chord('Enter',mode==='manual'?['control','shift']:['control']);
   }
   await until('window.__nativePlan.done||window.__nativePlan.errors.length');await pause(400);
   const result=await evaluate('window.__nativePlan');assert.deepEqual(result.errors,[]);assert.ok(result.done);assert.ok(result.usage.length);result.usage.forEach(u=>assert.equal(u.model,report.model));
   if(['manual','edits'].includes(mode)){assert.match(result.text,new RegExp('PLAN_NATIVE_'+mode.toUpperCase()+'_OK'));assert.equal(runtime.settings.claudeSafeMode,mode==='manual'?'default':'acceptEdits');}
   assert.equal(fs.readFileSync(fixture,'utf8'),original);
   report.results.push({mode,...result,proof,screenshot:await shot('plan-'+mode+'-done')});save();await evaluate('window.__nativePlanOff?.();undefined');console.log('REAL PLAN PASS '+mode);
  }
  assert.deepEqual(report.rendererErrors,[]);report.ok=true;
 }catch(error){report.ok=false;report.error=error.stack;report.failedRound=await evaluate('window.__nativePlan||null').catch(()=>null);report.errorScreenshot=await shot('native-plan-error').catch(e=>{report.screenshotError=e.message;return null});}
 finally{await evaluate('window.__nativePlanOff?.();undefined').catch(()=>{});if(runtime.currentTurnId)await runtime.handleCancelTurn().catch(()=>{});save()}
 console.log(JSON.stringify({ok:report.ok,error:report.error,reportPath}));return{...report,reportPath};
};
