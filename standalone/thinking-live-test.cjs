'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),capture=require('./capture-ui.cjs');
exports.run=async({window,runtime,runDir})=>{
 const report={realTokens:true,startedAt:new Date().toISOString(),observations:[],screenshots:[],rendererErrors:[]},reportPath=path.join(runDir,'thinking-live.json');
 const save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2)),evaluate=code=>window.webContents.executeJavaScript(code),pause=ms=>new Promise(r=>setTimeout(r,ms));
 const arg=name=>process.argv.find(s=>s.startsWith('--'+name+'='))?.slice(name.length+3);
 assert.equal(arg('test-model'),'claude-haiku-5-5');assert.equal(arg('test-effort'),'high');
 const client=window.webContents.debugger;client.attach('1.3');
 window.webContents.on('console-message',(event,level,message)=>{if(event.level==='error'||level>=3)report.rendererErrors.push(event.message||message)});
 async function until(code,ms=180000){const end=Date.now()+ms;while(!await evaluate(code)){if(Date.now()>end)throw Error('Timed out: '+code);await pause(50)}}
 async function click(selector){await until('!!document.querySelector('+JSON.stringify(selector)+')',15000);const point=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mouseMoved','mousePressed','mouseReleased'])await client.sendCommand('Input.dispatchMouseEvent',{type,...point,...(type==='mouseMoved'?{}:{button:'left',clickCount:1})});await pause(100)}
 async function shot(name){const file=path.join(runDir,name+'.png');await capture(window,file);report.screenshots.push(file);save()}
 try{
  await until("!!document.querySelector('[data-cds=ChatComposer]')",30000);await click('[aria-label="新对话"]');
  assert.ok(await evaluate("window.claudianSidebar.getState().then(s=>s.settings.model==='claude-haiku-5-5'&&s.settings.effort==='high')"));
  await evaluate("window.__thinkingLive={events:[],text:'',usage:[],errors:[],done:false};window.__thinkingOff=window.claudianSidebar.onEvent(e=>{const s=window.__thinkingLive;s.events.push(e);if(e.chunk?.type==='text')s.text+=e.chunk.content||'';if(e.chunk?.type==='usage')s.usage.push(e.chunk.usage);if(e.type==='error')s.errors.push(e.content);if(e.type==='done')s.done=true});document.querySelector('[contenteditable=true]').focus();undefined");
  await client.sendCommand('Input.insertText',{text:'不要调用工具、联网、修改文件或其他模型。请手工解答字母算式 SEND + MORE = MONEY，字母对应不同数字，首位不能为零。给出一个完整解并逐列验算，最后输出 THINKING_TIMER_REAL_OK。'});
  await click('[data-cds=ChatComposer] button[aria-label=Send]');
  const end=Date.now()+180000;let lastKey='',saved=0;
  while(!await evaluate('window.__thinkingLive.done||window.__thinkingLive.errors.length')){
   if(Date.now()>end)throw Error('Real thinking request timed out');
   const rows=await evaluate("[...document.querySelectorAll('[data-thinking-block-id]')].map(n=>({id:n.dataset.thinkingBlockId,running:n.dataset.thinkingRunning==='true',seconds:Number(n.dataset.thinkingSeconds),startedAt:Number(n.dataset.thinkingStartedAt),at:Date.now(),heading:n.firstElementChild?.innerText||'',chunks:window.__thinkingLive.events.length}))");
   for(const row of rows){const key=row.id+':'+row.running+':'+row.seconds;if(key!==lastKey){report.observations.push(row);lastKey=key;save();if(row.running&&row.seconds>=saved*2&&saved<3){await shot('thinking-running-'+row.seconds);saved++}}}
   await pause(120);
  }
  await pause(500);Object.assign(report,await evaluate('window.__thinkingLive'));await evaluate('window.__thinkingOff();undefined');report.configuration={model:runtime.settings.model,effort:runtime.settings.effort};
  assert.deepEqual(report.errors,[]);assert.equal(report.done,true);assert.ok(report.usage.length,'Missing real usage');assert.ok(report.text.includes('THINKING_TIMER_REAL_OK'));assert.deepEqual(report.configuration,{model:'claude-haiku-5-5',effort:'high'});report.usage.forEach(u=>{if(u.model)assert.equal(u.model,'claude-haiku-5-5')});
  const groups=new Map();for(const row of report.observations.filter(r=>r.running)){if(!groups.has(row.id))groups.set(row.id,[]);groups.get(row.id).push(row)}
  const advancing=[...groups.values()].find(rows=>rows.at(-1).seconds-rows[0].seconds>=2);assert.ok(advancing,'No single real thinking block advanced for at least two seconds');
  assert.ok(advancing.some(row=>/\d/.test(row.heading)),'Visible native heading has no time');
  for(let i=1;i<advancing.length;i++)assert.ok(advancing[i].seconds>=advancing[i-1].seconds,'Time moved backwards');
  const snapshot=()=>evaluate("[...document.querySelectorAll('[data-thinking-block-id]')].map(n=>({id:n.dataset.thinkingBlockId,running:n.dataset.thinkingRunning,seconds:Number(n.dataset.thinkingSeconds),heading:n.firstElementChild?.innerText||''}))");
  report.completed=await snapshot();assert.ok(report.completed.every(r=>r.running==='false'));await shot('thinking-completed');await pause(2200);report.afterCompletion=await snapshot();assert.deepEqual(report.afterCompletion,report.completed,'Completed thinking kept ticking');await shot('thinking-stopped');
  report.completedBehavior=report.completed.length?'completed-duration-frozen':'waiting-placeholder-unmounted';const loaded=new Promise(resolve=>window.webContents.once('did-finish-load',resolve));window.webContents.reloadIgnoringCache();await loaded;await until("!!document.querySelector('[data-cds=ChatComposer]')",30000);await pause(300);report.afterReload=await snapshot();assert.deepEqual(report.afterReload.map(r=>({id:r.id,seconds:r.seconds,running:r.running})),report.completed.map(r=>({id:r.id,seconds:r.seconds,running:r.running})),'Reload changed completed duration');await shot('thinking-reloaded');
  assert.deepEqual(report.rendererErrors,[]);report.ok=true;console.log('PASS real Claude thinking timer '+JSON.stringify(advancing.map(r=>({seconds:r.seconds,heading:r.heading}))));
 }catch(error){report.ok=false;report.error=error.stack||error.message;await shot('failure').catch(()=>{});console.error(report.error)}
 finally{await evaluate('window.__thinkingOff?.();undefined').catch(()=>{});if(client.isAttached())client.detach();report.finishedAt=new Date().toISOString();report.reportPath=reportPath;save()}
 return report;
};
