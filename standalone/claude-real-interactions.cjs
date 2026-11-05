'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const capture=require('./capture-ui.cjs');
exports.run=async({window,runtime,workspace,runDir})=>{
 const arg=name=>process.argv.find(s=>s.startsWith(`--${name}=`))?.slice(name.length+3);
 const configuration={model:arg('test-model'),effort:arg('test-effort')};
 assert.equal(configuration.model,'claude-haiku-5-5');assert.equal(configuration.effort,'high');
 const report={configuration,realTokens:true,results:[],errors:[]},reportPath=path.join(runDir,'claude-real-interactions.json');
 window.webContents.on('console-message',(event,level,message)=>{if(event.level==='error'||level>=3)(report.rendererErrors||=[]).push(event.message||message)});
 const save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
 const evaluate=code=>window.webContents.executeJavaScript(code),pause=ms=>new Promise(r=>setTimeout(r,ms));
 async function until(code,ms=90000){const end=Date.now()+ms;while(!await evaluate(code)){if(Date.now()>end)throw Error('Real interaction timed out: '+code);await pause(100)}}
 async function shot(name){const file=path.join(runDir,name+'.png');await capture(window,file);return file}
 async function click(label){
  const expression=`[...document.querySelectorAll('[data-claude-interaction] button')].find(n=>n.innerText.trim().startsWith(${JSON.stringify(label)})&&(${JSON.stringify(label)}!=='Accept'||!n.innerText.includes('and'))&&!n.disabled)`;
  await until(`!!(${expression})`,10000);window.focus();await pause(450);
  const point=await evaluate(`(()=>{const n=(${expression});n.scrollIntoView({block:'nearest'});const r=n.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
  for(const type of ['mouseMove','mouseDown','mouseUp'])window.webContents.sendInputEvent({type,...point,...(type==='mouseMove'?{}:{button:'left',clickCount:1})});
 }
 async function chord(key, modifiers=[]) {
  window.show(); window.focus(); await pause(650);
  window.webContents.sendInputEvent({type:'keyDown',keyCode:key,modifiers});
  window.webContents.sendInputEvent({type:'keyUp',keyCode:key,modifiers});
 }
 async function type(selector,text){
  await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});n.focus();n.select()})()`);
  const d=window.webContents.debugger,own=!d.isAttached();if(own)d.attach('1.3');try{await d.sendCommand('Input.insertText',{text})}finally{if(own)d.detach()}
 }
 async function send(prompt){
  assert.equal(runtime.settings.model,configuration.model);assert.equal(runtime.settings.effort,configuration.effort);
  await evaluate(`window.__realCase={events:[],text:'',errors:[],usage:[],done:false};window.__realCaseOff=window.claudianSidebar.onEvent(e=>{const s=window.__realCase;s.events.push(e);if(e.type==='error')s.errors.push(e.content);if(e.type==='done')s.done=true;if(e.chunk?.type==='text')s.text+=e.chunk.content||'';if(e.chunk?.type==='usage')s.usage.push(e.chunk.usage)});undefined`);
  await until(`!!document.querySelector('[contenteditable=true]')`,15000);
  await type('[contenteditable=true]',prompt);await pause(150);
  await evaluate(`document.querySelector('[data-cds=ChatComposer] button[aria-label=Send]').click()`);
 }
 async function waitCard(selector){
  await until(`!!document.querySelector(${JSON.stringify(selector)})||window.__realCase.done||window.__realCase.errors.length`);
  if(!await evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))throw Error('Model did not emit required real request: '+JSON.stringify(await evaluate('window.__realCase')));
 }
 async function done(id,proof={}){
  await until(`window.__realCase.done||window.__realCase.errors.length`);await pause(200);
  const result=await evaluate('window.__realCase');assert.deepEqual(result.errors,[]);
  assert.ok(result.usage.length,'A real completed round must report usage');
  for(const usage of result.usage)if(usage.model)assert.equal(usage.model,configuration.model);
  report.results.push({id,proof,usage:result.usage,screenshot:await shot(id+'-done'),events:result.events});save();
  await evaluate('window.__realCaseOff?.();undefined');console.log('REAL PASS '+id);
  return result;
 }
 try{
  report.connection=await require('./claude-live-test.cjs').run({window,workspace,runDir});save();
  await evaluate(`document.querySelector('[aria-label="Permission mode"]').click()`);
  await until(`[...document.querySelectorAll('[role=menuitemradio]')].some(n=>n.innerText.includes('Manual'))`,10000);
  await evaluate(`[...document.querySelectorAll('[role=menuitemradio]')].find(n=>n.innerText.includes('Manual')).click()`);
  await pause(500);
  for(const [id,label,allowed] of [['approval-allow','Allow once',true],['approval-deny','Deny',false],['approval-always','Always allow',true]]){
   const marker='REAL_'+id.replaceAll('-','_')+'_'+Date.now(),file=path.join(workspace,id+'.txt');
   await send(`Real UI integration test. Use the Write tool exactly once to write ${JSON.stringify(file)} with exactly ${marker}. It must require approval. Wait for the UI response. If denied, do not retry or use any other tool; reply DENIED. Do not touch any other file.`);
   await waitCard('[data-claude-approval]');const approvalShot=await shot(id+'-pending');await evaluate("document.querySelector('[data-claude-approval]').focus({preventScroll:true})");
   await chord(allowed?'Enter':'Escape',id==='approval-always'?['control','shift']:allowed?['control']:[]);
   await done(id,{approvalShot});assert.equal(fs.existsSync(file),allowed);if(allowed)assert.equal(fs.readFileSync(file,'utf8').trim(),marker);
  }
  {
   await send('Real UI question test: use AskUserQuestion exactly once with two questions. Question 1 header Storage, question "Where should the data live?", options "Local" and "Host". Question 2 header Features, question "Which features?", multiSelect true, options "Files" and "Terminal". Wait for the user answers, then summarize them. Do not ask in plain text, do not use any other tools, do not edit files.');
   await waitCard('.epitaxy-question-card');const pending=await shot('question-pending');
   await evaluate(`document.querySelectorAll('.epitaxy-answer-option')[0].click();document.querySelector('.epitaxy-question-card').focus({preventScroll:true})`);await chord('Enter',['control']);
   await until(`document.querySelector('.epitaxy-question-card')?.innerText.includes('Which features?')`,10000);
   await evaluate(`document.querySelectorAll('.epitaxy-answer-option')[0].click();document.querySelectorAll('.epitaxy-answer-option')[1].click()`);
   await until(`document.querySelectorAll('.epitaxy-answer-option[aria-pressed=true]').length===2`,10000);
   assert.ok(await evaluate("document.activeElement===document.querySelector('.epitaxy-question-card')"),'Question focus did not follow pagination');
   const selected=await evaluate(`document.querySelectorAll('.epitaxy-answer-option[aria-pressed=true]').length`);assert.equal(selected,2);
   const answers=await shot('question-multiple');await chord('Enter',['control']);
   const result=await done('question-submit',{pending,answers});assert.match(result.text,/Local/i);assert.match(result.text,/Files/i);assert.match(result.text,/Terminal/i);
  }
  {
   const answer='中文回答：仅使用本机工作区';
   await send('Real UI custom answer test: use AskUserQuestion once with one question "How should this work?", options "Local" and "Host". Wait for the user answer, then repeat their exact answer. Do not edit files or call any other tool.');
   await waitCard('.epitaxy-question-card');await evaluate(`document.querySelector('button[aria-label=Other]').click()`);
   await until(`!!document.querySelector('textarea[aria-label="Other option"]')`,10000);
   assert.ok(await evaluate(`document.activeElement===document.querySelector('textarea[aria-label="Other option"]')`),'Other input was not focused');
   await type('textarea[aria-label="Other option"]',answer);const pending=await shot('question-other-pending');await click('Submit');
   const result=await done('question-other',{pending});assert.ok(result.text.includes(answer));
  }
  {
   await send('Real UI skip test: use AskUserQuestion exactly once with one question "Which color?", options "Blue" and "Green". Wait for the answer. If the user skips, acknowledge no preference and finish. Do not edit files or call any other tools.');
   await waitCard('.epitaxy-question-card');const pending=await shot('question-skip-pending');await click('Skip');await done('question-skip',{pending});
  }
  if(!process.argv.includes('--interactions-controls-only')){
   // The current plan component has its own real keyboard/layout suite.
   report.plan=await require('./claude-plan-source-live.cjs').run({window,runtime,workspace,runDir});
   save();assert.equal(report.plan.ok,true,'Native plan interaction suite failed');
  }
  assert.deepEqual(report.rendererErrors||[],[]);report.ok=true;
 }catch(error){report.ok=false;report.errors.push(error.stack||error.message);report.failedRound=await evaluate('window.__realCase||null').catch(()=>null);report.screenshot=await shot('real-interaction-error');console.log('FAIL '+error.message)}
 finally{await evaluate('window.__realCaseOff?.();undefined').catch(()=>{});if(runtime.currentTurnId)await runtime.handleCancelTurn().catch(()=>{});save()}
 console.log((report.ok?'PASS ':'FAIL ')+reportPath);return {...report,reportPath};
};
