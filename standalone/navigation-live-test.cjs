const fs=require('fs'),assert=require('node:assert/strict'),path=require('path');
const dir=process.env.SIDEBAR_TEST_ARTIFACTS||path.resolve(__dirname,'../test-artifacts/navigation-live');fs.mkdirSync(dir,{recursive:true});
async function run({window:nativeWindow}={}){
let ws;
if(nativeWindow){
 const debuggerClient=nativeWindow.webContents.debugger;
 debuggerClient.attach('1.3');
 const message=(_event,method,params)=>ws.onmessage?.({data:JSON.stringify({method,params})});
 ws={send(raw){const {id,method,params}=JSON.parse(raw);debuggerClient.sendCommand(method,params).then(result=>ws.onmessage({data:JSON.stringify({id,result})}),error=>ws.onmessage({data:JSON.stringify({id,error:{message:error.message}})}))},close(){debuggerClient.removeListener('message',message);debuggerClient.detach()}};
 debuggerClient.on('message',message);
}else{
 const pages=await(await fetch('http://127.0.0.1:'+(process.env.SIDEBAR_DEBUG_PORT||19439)+'/json/list')).json(),page=pages.find(p=>p.url.includes('claudian-sidebar.html'));
 ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
}
let id=0;const pending=new Map();
const report={rounds:[],switches:[],errors:[],startedAt:new Date().toISOString()};let film=[];
const send=(method,params={})=>{if(nativeWindow){if(method==='Page.captureScreenshot')return nativeWindow.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true}).then(image=>({data:image.toPNG().toString('base64')}));if(method==='Page.bringToFront')return Promise.resolve({});if(method==='Emulation.setDeviceMetricsOverride'){nativeWindow.setContentSize(params.width,params.height);return Promise.resolve({})}if(method==='Emulation.clearDeviceMetricsOverride'){nativeWindow.setContentSize(440,760);return Promise.resolve({})}}return new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>reject(Error(method+' timeout')),12000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}))})};
ws.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}if(m.method==='Runtime.exceptionThrown')report.errors.push(m.params);if(m.method==='Page.screencastFrame'){film.push(m.params);void send('Page.screencastFrameAck',{sessionId:m.params.sessionId})}};
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value},pause=ms=>new Promise(r=>setTimeout(r,ms)),save=()=>fs.writeFileSync(dir+'/report.json',JSON.stringify(report,null,2));
const until=async(expression,timeout=20000)=>{const end=Date.now()+timeout;while(!await ev(expression)){if(Date.now()>end)throw Error('Timeout '+expression);await pause(100)}};
const click=async selector=>{await ev(`document.querySelector(${JSON.stringify(selector)}).click();undefined`);await pause(180)};
const shot=async name=>{await send('Page.bringToFront');await pause(200);const s=await send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(dir+'/'+name+'.png',Buffer.from(s.data,'base64'))};
async function prepareSwitch(){await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:220,y:120});await pause(160);const r=await ev(`(()=>{const r=document.querySelector('.sidebar-provider-switch').getBoundingClientRect();return{x:r.x,y:r.y}})()`);await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:r.x+16,y:r.y+16});await until(`document.querySelector('.sidebar-provider-switch').dataset.expanded==='true'`);const before=await ev('document.documentElement.dataset.sidebarProvider');await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:r.x+52,y:r.y+16});await pause(180);assert.equal(await ev('document.documentElement.dataset.sidebarProvider'),before);return {x:r.x+52,y:r.y+16,before,target:before==='claude'?'codex':'claude'}}
async function press(r){await send('Input.dispatchMouseEvent',{type:'mousePressed',x:r.x,y:r.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:r.x,y:r.y,button:'left',clickCount:1});await until(`document.documentElement.dataset.sidebarProvider===${JSON.stringify(r.target)}`)}
async function switchTo(p){if(await ev('document.documentElement.dataset.sidebarProvider')!==p){await press(await prepareSwitch());await pause(350)}}
async function theme(t){await click('[aria-label="设置"]');await until(`!![...document.querySelectorAll('select')].find(n=>[...n.options].some(o=>o.value==='light'))`);await ev(`(()=>{const n=[...document.querySelectorAll('select')].find(n=>[...n.options].some(o=>o.value==='light'));n.value=${JSON.stringify(t)};n.dispatchEvent(new Event('change',{bubbles:true}))})()`);await click('[aria-label="返回对话"]');await until(`document.documentElement.dataset.theme===${JSON.stringify(t)}`);await pause(250)}
try{
await send('Runtime.enable');await send('Page.bringToFront');await send('Emulation.setFocusEmulationEnabled',{enabled:true});await ev('window.claudianSidebar.updateSettings({enableAutoTitleGeneration:false})');
if(process.argv.includes('--recheck-ui')){report.rounds=JSON.parse(fs.readFileSync(dir+'/report.json','utf8')).rounds;assert.equal(report.rounds.length,2);assert.ok(report.rounds.every(r=>r.done&&r.usage.length&&!r.errors.length))}
else for(const provider of ['claude','codex']){
await switchTo(provider);const config=await ev('window.claudianSidebar.getState().then(s=>({model:s.settings.model,effort:s.settings.effort}))');assert.equal(config.model,provider==='claude'?'claude-haiku-5-5':'gpt-6.1-sol');assert.equal(config.effort,'high');
await ev(`window.__motionRound={done:false,usage:[],errors:[],text:''};window.__motionOff=window.claudianSidebar.onEvent(e=>{const r=window.__motionRound;if(e.chunk?.type==='usage')r.usage.push(e.chunk.usage);if(e.chunk?.type==='text')r.text+=e.chunk.content||'';if(e.type==='error')r.errors.push(e.content);if(e.type==='done')r.done=true});document.querySelector('textarea.claudian-input,[contenteditable=true]').focus();undefined`);
await send('Input.insertText',{text:'这是独立会话菜单的真实验收。请用中文写 3 条会话管理建议，每条单独一段、约 20 字。最后输出一个 JavaScript 代码块：console.log("NAVIGATION_REAL_'+provider.toUpperCase()+'"); 不调用工具，不修改文件。'});
await click(provider==='claude'?'[data-cds=ChatComposer] button[aria-label=Send]':'[aria-label="发送消息"]');await until('window.__motionRound.done||window.__motionRound.errors.length',180000);
const round=await ev('window.__motionRound');await ev('window.__motionOff();undefined');report.rounds.push({provider,...config,...round});save();assert.ok(round.done&&round.usage.length&&!round.errors.length);assert.ok(round.text.includes('NAVIGATION_REAL_'+provider.toUpperCase()));await shot(provider+'-real-result');console.log('PASS real '+provider);
}

report.menus=[];
await ev('document.querySelector("summary[aria-label=近期对话]").closest("details").open=false;undefined');
for(const mode of ['light','dark']){await theme(mode);for(const width of [360,900]){await send('Emulation.setDeviceMetricsOverride',{width,height:760,deviceScaleFactor:1,mobile:false});await pause(200);for(const provider of ['claude','codex']){
 await switchTo(provider);await click('summary[aria-label="近期对话"]');await until('!!document.querySelector("[data-conversation-menu] [data-conversation-id]")');await pause(800);
 const measurement=await ev('('+(()=>{
   const menu=document.querySelector('[data-conversation-menu]'),provider=menu.dataset.conversationMenu;
   const rows=[...menu.querySelectorAll('[data-conversation-id]')],scroll=menu.querySelector('.claude-conversation-scroll,.codex-conversation-scroll');
   return {provider,menu:menu.getBoundingClientRect().toJSON(),scroll:{height:scroll.clientHeight,total:scroll.scrollHeight},rows:rows.map(r=>{
    const label=r.querySelector('.dframe-fade-label,[data-thread-title]');const rect=r.getBoundingClientRect();
    return{id:r.dataset.conversationId,provider:r.dataset.sessionProvider,rect:rect.toJSON(),label:label?.getBoundingClientRect().toJSON(),whiteSpace:label?getComputedStyle(label).whiteSpace:null};
   }),styles:[...document.querySelectorAll('link[data-provider-style]')].filter(l=>l.sheet.media.mediaText==='all').map(l=>l.dataset.providerStyle),overflow:document.documentElement.scrollWidth>innerWidth+1};
 }).toString()+')()');
 assert.equal(measurement.provider,provider);assert.ok(measurement.rows.length);assert.ok(measurement.rows.every(r=>r.provider===provider));assert.ok(measurement.styles.every(p=>p===provider));assert.equal(measurement.overflow,false);
 for(const row of measurement.rows){assert.ok(row.rect.height>=25&&row.rect.height<=33,'Wrong native row height');assert.ok(row.label&&row.label.height<=row.rect.height+1,'Title overlaps adjacent row');assert.ok(row.label.x+row.label.width<=measurement.menu.right+1,'Title outside popup');}
 assert.ok(measurement.menu.right<=width&&measurement.menu.left>=0);await shot(provider+'-'+mode+'-'+width+'-menu');
 await ev('(()=>{const s=document.querySelector(".claude-conversation-scroll,.codex-conversation-scroll");s.scrollTop=s.scrollHeight})()');await pause(150);
 const scrolled=await ev('(()=>{const s=document.querySelector(".claude-conversation-scroll,.codex-conversation-scroll");return s.scrollTop})()');assert.ok(measurement.scroll.total<=measurement.scroll.height||scrolled>0);await shot(provider+'-'+mode+'-'+width+'-scrolled');
 const entry=await ev('(()=>{const state=JSON.parse(localStorage.getItem("claudian-sidebar-mock-state-v1")),p=document.documentElement.dataset.sidebarProvider;const tab=state.tabs.find(t=>t.providerId===p&&t.messages.length);return {key:p+":"+tab.runtimeThreadId,tabId:tab.id}})()');
 const ownSelector='[data-conversation-id='+JSON.stringify(entry.key)+']';assert.ok(await ev('!!document.querySelector('+JSON.stringify(ownSelector)+')'),'Real test conversation absent');
 await click(ownSelector);await until('!document.querySelector("[data-conversation-menu]")');assert.equal(await ev('document.documentElement.dataset.sidebarProvider'),provider);assert.equal(await ev('JSON.parse(localStorage.getItem("claudian-sidebar-mock-state-v1")).activeTabId'),entry.tabId);
 report.menus.push({mode,width,...measurement,scrolled,opened:entry});save();console.log('PASS menu '+provider+' '+mode+' '+width);
}}}
// Restore persisted conversations from disk and reopen each provider's own row.
await send('Emulation.clearDeviceMetricsOverride');await send('Page.reload',{ignoreCache:true});await until('!!document.querySelector("summary[aria-label=近期对话]")');await pause(1000);
for(const provider of ['claude','codex']){await switchTo(provider);await click('summary[aria-label="近期对话"]');await until('!!document.querySelector("[data-conversation-id]")');await pause(500);
 const entry=report.menus.find(m=>m.provider===provider).opened;
 await click('[data-conversation-id='+JSON.stringify(entry.key)+']');assert.equal(await ev('document.documentElement.dataset.sidebarProvider'),provider);await shot(provider+'-restored');}

report.reopened=[];
for(const provider of ['claude','codex']){
 await switchTo(provider);await click('summary[aria-label="近期对话"]');
 await until('!![...document.querySelectorAll("[data-conversation-menu] button")].find(b=>b.getAttribute("aria-label")?.startsWith("关闭 "))');
 const before=await ev('JSON.parse(localStorage.getItem("claudian-sidebar-mock-state-v1")).tabs.length');
 await shot(provider+'-close-control');
 await click('[data-conversation-menu] button[aria-label^="关闭 "]');
 await until('JSON.parse(localStorage.getItem("claudian-sidebar-mock-state-v1")).tabs.length==='+ (before-1));
 await switchTo(provider);await click('summary[aria-label="近期对话"]');
 const entry=report.menus.find(m=>m.provider===provider).opened;
 await until('!!document.querySelector('+JSON.stringify('[data-conversation-id='+JSON.stringify(entry.key)+']')+')');
 await click('[data-conversation-id='+JSON.stringify(entry.key)+']');
 await until('!document.querySelector("[data-conversation-menu]")');
 await until('(()=>{const s=JSON.parse(localStorage.getItem("claudian-sidebar-mock-state-v1")),t=s.tabs.find(t=>t.id===s.activeTabId);return t?.messages.length>=2&&t?.runtimeThreadId==='+JSON.stringify(entry.key.slice(provider.length+1))+'})()');
 const restored=await ev('(()=>{const s=JSON.parse(localStorage.getItem("claudian-sidebar-mock-state-v1")),t=s.tabs.find(t=>t.id===s.activeTabId);return {provider:t.providerId,thread:t.runtimeThreadId,messages:t.messages.length}})()');
 assert.equal(restored.provider,provider);assert.equal(provider+':'+restored.thread,entry.key);assert.ok(restored.messages>=2);
 report.reopened.push(restored);await shot(provider+'-reopened-history');console.log('PASS close and resume '+provider);
}
assert.equal(report.errors.length,0);report.ok=true;
}catch(e){report.ok=false;report.error=e.stack;console.error(e.stack);await shot('failure').catch(()=>{});process.exitCode=1}
finally{await send('Emulation.clearDeviceMetricsOverride').catch(()=>{});await send('Emulation.setFocusEmulationEnabled',{enabled:false}).catch(()=>{});report.finishedAt=new Date().toISOString();save();ws.close()}
console.log(JSON.stringify({ok:report.ok,menus:report.menus?.length,dir}));
return report;
}
exports.run=run;
if(require.main===module)run().catch(e=>{console.error(e.stack);process.exitCode=1});




