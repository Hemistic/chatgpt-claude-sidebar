'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),capture=require('./capture-ui.cjs');
exports.run=async({window,runtime,runDir})=>{
 const report={realTokens:true,scenarios:[],screenshots:[],rendererErrors:[],startedAt:new Date().toISOString()},file=path.join(runDir,'scroll-paint-live.json');
 const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)),evaluate=code=>window.webContents.executeJavaScript(code),pause=ms=>new Promise(r=>setTimeout(r,ms));
 const client=window.webContents.debugger;client.attach('1.3');
 window.webContents.on('console-message',(event,level,message)=>{if(event.level==='error'||level>=3)report.rendererErrors.push(event.message||message)});
 async function until(code,ms=180000){const end=Date.now()+ms;while(!await evaluate(code)){if(Date.now()>end)throw Error('Timed out: '+code);await pause(40)}}
 async function click(selector){await until('!!document.querySelector('+JSON.stringify(selector)+')',15000);const point=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mouseMoved','mousePressed','mouseReleased'])await client.sendCommand('Input.dispatchMouseEvent',{type,...point,...(type==='mouseMoved'?{}:{button:'left',clickCount:1})});await pause(150)}
 async function shot(name){const p=path.join(runDir,name+'.png');await capture(window,p);report.screenshots.push(p);save()}
 const metrics=`(()=>{const n=document.querySelector('.claudian-messages'),s=getComputedStyle(n),r=n.getBoundingClientRect();return{top:n.scrollTop,height:n.scrollHeight,viewport:n.clientHeight,distance:Math.max(0,n.scrollHeight-n.clientHeight-n.scrollTop),following:n.dataset.autoScroll,button:!!document.querySelector('.sidebar-scroll-to-bottom'),leftGutter:n.clientLeft-parseFloat(s.borderLeftWidth),rightGutter:n.offsetWidth-n.clientWidth-n.clientLeft-parseFloat(s.borderRightWidth),width:r.width,thumb:getComputedStyle(n,'::-webkit-scrollbar-thumb').backgroundColor,arrowDisplay:getComputedStyle(n,'::-webkit-scrollbar-button').display,hover:n.matches(':hover'),loaders:document.querySelectorAll('.claudian-runtime-corner-loader,.claude-runtime-indicator').length}})()`;
 async function move(selector){const point=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.right-3,y:r.y+r.height/2}})()`);await client.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await pause(70)}
 async function theme(value){await click('[aria-label="设置"]');await until(`!![...document.querySelectorAll('select')].find(n=>[...n.options].some(o=>o.value==='light'))`,15000);await evaluate(`(()=>{const n=[...document.querySelectorAll('select')].find(n=>[...n.options].some(o=>o.value==='light'));n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}));})()`);await click('[aria-label="返回对话"]')}
 async function choose(provider){
  const tab=await evaluate(`(()=>{const s=JSON.parse(localStorage.getItem('claudian-sidebar-mock-state-v1'));return s.tabs.find(t=>t.providerId===${JSON.stringify(provider)}&&t.runtimeThreadId&&t.messages.length)})()`);assert.ok(tab,'Real long conversation required');
  await click('[aria-label="近期对话"]');await click('[data-conversation-id="'+provider+':'+tab.runtimeThreadId+'"]');await until(`document.documentElement.dataset.sidebarProvider===${JSON.stringify(provider)}`,15000);return tab;
 }
 try{
  await until("!!document.querySelector('.claudian-messages')",30000);
  for(const provider of ['claude','codex']){
   const tab=await choose(provider),rec={provider,phases:{}};report.scenarios.push(rec);save();
   const setting=await evaluate('window.claudianSidebar.getState().then(s=>({model:s.settings.model,effort:s.settings.effort}))');
   if(provider==='claude'){assert.equal(setting.model,'claude-haiku-5-5');assert.equal(setting.effort,'high')}
   await evaluate("window.__paintTurn={done:false,usage:[],errors:[],text:''};window.__paintOff=window.claudianSidebar.onEvent(e=>{const s=window.__paintTurn;if(e.chunk?.type==='text')s.text+=e.chunk.content||'';if(e.chunk?.type==='usage')s.usage.push(e.chunk.usage);if(e.type==='error')s.errors.push(e.content);if(e.type==='done')s.done=true});document.querySelector('textarea.claudian-input,[contenteditable=true]').focus();undefined");
   const marker='SCROLL_PAINT_'+provider.toUpperCase()+'_OK';await client.sendCommand('Input.insertText',{text:'不要调用任何工具、联网或其他模型。只回复 '+marker+'。'});await click(provider==='claude'?'[data-cds=ChatComposer] button[aria-label=Send]':'[aria-label="发送消息"]');
   rec.phases.running=await evaluate(metrics);assert.equal(rec.phases.running.loaders,0);await shot(provider+'-running-no-corner-loader');
   await until('window.__paintTurn.done||window.__paintTurn.errors.length',180000);Object.assign(rec,await evaluate('window.__paintTurn'));await evaluate('window.__paintOff();undefined');assert.deepEqual(rec.errors,[]);assert.ok(rec.done&&rec.text.includes(marker)&&rec.usage.length);rec.configuration={model:runtime.settings.model,effort:runtime.settings.effort};if(provider==='claude')assert.deepEqual(rec.configuration,{model:'claude-haiku-5-5',effort:'high'});
   for(const value of ['light','dark']){
    await theme(value);await move('.sidebar-header-main');const hidden=await evaluate(metrics);assert.equal(hidden.hover,false);assert.equal(hidden.thumb,'rgba(0, 0, 0, 0)');assert.equal(hidden.arrowDisplay,'none');await shot(provider+'-'+value+'-hidden');
    await move('.claudian-messages');const hovered=await evaluate(metrics);assert.equal(hovered.hover,true);assert.notEqual(hovered.thumb,hidden.thumb);assert.equal(hovered.width,hidden.width);assert.ok(Math.abs(hovered.leftGutter-hovered.rightGutter)<=1);rec.phases[value]={hidden,hovered};await shot(provider+'-'+value+'-hover');
   }
   const point=await evaluate("(()=>{const r=document.querySelector('.claudian-messages').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()");await client.sendCommand('Input.dispatchMouseEvent',{type:'mouseWheel',...point,deltaX:0,deltaY:-480});await until("document.querySelector('.claudian-messages').dataset.autoScroll==='false'",3000);await pause(550);
   const paused=await evaluate(metrics);assert.ok(paused.button);rec.phases.paused=paused;await shot(provider+'-paused-button');
   const empty=await evaluate("(()=>{const s=JSON.parse(localStorage.getItem('claudian-sidebar-mock-state-v1'));return s.tabs.find(t=>!t.messages.length&&t.id!==s.activeTabId&&!t.isStreaming)})()");
   if(empty){const key=empty.runtimeThreadId?empty.providerId+':'+empty.runtimeThreadId:'history:'+(empty.historyId||empty.id);await click('[aria-label="近期对话"]');await until("!!document.querySelector("+JSON.stringify('[data-conversation-id="'+key+'"] .sidebar-session-menu-close')+")",15000);await evaluate("document.querySelector("+JSON.stringify('[data-conversation-id="'+key+'"] .sidebar-session-menu-close')+").scrollIntoView({block:'nearest'});undefined");await click('[data-conversation-id="'+key+'"] .sidebar-session-menu-close')}
   await click('[aria-label="新对话"]');await until("JSON.parse(localStorage.getItem('claudian-sidebar-mock-state-v1')).activeTabId!=="+JSON.stringify(tab.id),5000);rec.newTabCreatedId=await evaluate("JSON.parse(localStorage.getItem('claudian-sidebar-mock-state-v1')).activeTabId");
   await click('[aria-label="近期对话"]');await click('[data-conversation-id="'+provider+':'+tab.runtimeThreadId+'"]');await pause(300);rec.phases.restored=await evaluate(metrics);assert.equal(rec.phases.restored.following,'false');assert.ok(Math.abs(rec.phases.restored.top-paused.top)<=2,'Reading position lost across new conversation');await shot(provider+'-reading-restored');
   await click('.sidebar-scroll-to-bottom');await pause(160);rec.phases.resumed=await evaluate(metrics);assert.equal(rec.phases.resumed.following,'true');assert.ok(rec.phases.resumed.distance<=2);await move('.sidebar-header-main');await shot(provider+'-resumed-final');rec.ok=true;save();console.log('PASS real final scroll paint '+provider);
  }
  assert.deepEqual(report.rendererErrors,[]);report.ok=true;
 }catch(error){report.ok=false;report.error=error.stack||error.message;await shot('failure').catch(()=>{});console.error(report.error)}
 finally{await evaluate('window.__paintOff?.();undefined').catch(()=>{});if(client.isAttached())client.detach();report.finishedAt=new Date().toISOString();report.reportPath=file;save()}
 return report;
};
