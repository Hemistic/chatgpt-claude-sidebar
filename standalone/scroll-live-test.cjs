'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const capture=require('./capture-ui.cjs');
exports.run=async({window,runtime,runDir})=>{
 const report={realTokens:true,startedAt:new Date().toISOString(),scenarios:[],screenshots:[],rendererErrors:[]};
 const reportPath=path.join(runDir,'scroll-live.json'),save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
 const evaluate=code=>window.webContents.executeJavaScript(code),pause=ms=>new Promise(r=>setTimeout(r,ms));
 const arg=name=>process.argv.find(s=>s.startsWith('--'+name+'='))?.slice(name.length+3);
 assert.equal(arg('test-model'),'claude-haiku-5-5');assert.equal(arg('test-effort'),'high');
 const client=window.webContents.debugger;client.attach('1.3');
 window.webContents.on('console-message',(event,level,message)=>{if(event.level==='error'||level>=3)report.rendererErrors.push(event.message||message)});
 async function until(code,ms=180000){const end=Date.now()+ms;while(!await evaluate(code)){if(Date.now()>end)throw Error('Timed out: '+code);await pause(30)}}
 async function click(selector){await until('!!document.querySelector('+JSON.stringify(selector)+')',12000);const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);for(const type of ['mouseMoved','mousePressed','mouseReleased'])await client.sendCommand('Input.dispatchMouseEvent',{type,...p,...(type==='mouseMoved'?{}:{button:'left',clickCount:1})});await pause(120)}
 async function move(where){const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(where)}).getBoundingClientRect();return{x:r.right-3,y:r.y+r.height/2}})()`);await client.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await pause(60)}
 async function shot(name){const file=path.join(runDir,name+'.png');await capture(window,file);report.screenshots.push(file);save();return file}
 const metrics=`(()=>{const n=document.querySelector('.claudian-messages'),r=n.getBoundingClientRect(),style=getComputedStyle(n);return{top:n.scrollTop,height:n.scrollHeight,viewport:n.clientHeight,distance:Math.max(0,n.scrollHeight-n.clientHeight-n.scrollTop),following:n.dataset.autoScroll,button:!!document.querySelector('.sidebar-scroll-to-bottom'),leftGutter:n.clientLeft-parseFloat(style.borderLeftWidth),rightGutter:n.offsetWidth-n.clientWidth-n.clientLeft-parseFloat(style.borderRightWidth),width:r.width,scrollbar:style.scrollbarColor,thumb:getComputedStyle(n,'::-webkit-scrollbar-thumb').backgroundColor,arrowDisplay:getComputedStyle(n,'::-webkit-scrollbar-button').display,hover:n.matches(':hover'),cornerLoaders:document.querySelectorAll('.claudian-runtime-corner-loader,.claude-runtime-indicator').length}})()`;
 async function theme(value){await click('[aria-label="设置"]');await until(`!![...document.querySelectorAll('select')].find(n=>[...n.options].some(o=>o.value==='light'))`,12000);await evaluate(`(()=>{const n=[...document.querySelectorAll('select')].find(n=>[...n.options].some(o=>o.value==='light'));n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}));})()`);await click('[aria-label="返回对话"]');await pause(100)}
 async function runProvider(provider){
  const record={provider,phases:{},startedAt:new Date().toISOString()};report.scenarios.push(record);save();
  await click('[aria-label="新对话"]');
  if(provider==='claude')assert.ok(await evaluate("window.claudianSidebar.getState().then(s=>s.settings.model==='claude-haiku-5-5'&&s.settings.effort==='high')"));
  const prompt='这是实时滚动真实验收，请勿调用工具、联网、修改文件或其他模型。直接输出 SCROLL_STREAM_START，接着写一篇至少三千汉字的中文文章，讨论软件可维护性、可读性、可扩展性与交互体验。分自然段写，每段两三句话，不用列提纲或统计字数，不要用代码块。内容完整，不省略。最后单独输出 SCROLL_STREAM_END。';
  await evaluate(`window.__scrollRun={events:[],text:'',usage:[],errors:[],done:false,phase:'initial',frames:[],recording:true};window.__scrollOff=window.claudianSidebar.onEvent(e=>{const s=window.__scrollRun;s.events.push(e);if(e.chunk?.type==='text')s.text+=e.chunk.content||'';if(e.chunk?.type==='usage')s.usage.push(e.chunk.usage);if(e.type==='error')s.errors.push(e.content);if(e.type==='done')s.done=true});(function frame(){const s=window.__scrollRun;if(!s?.recording)return;const n=document.querySelector('.claudian-messages');s.frames.push({at:performance.now(),phase:s.phase,top:n.scrollTop,height:n.scrollHeight,viewport:n.clientHeight,following:n.dataset.autoScroll});requestAnimationFrame(frame)})();document.querySelector('textarea.claudian-input,[contenteditable=true]').focus();undefined`);
  await client.sendCommand('Input.insertText',{text:prompt});
  await click(provider==='claude'?'[data-cds=ChatComposer] button[aria-label=Send]':'[aria-label="发送消息"]');
  await until("window.__scrollRun.errors.length||(window.__scrollRun.text.length>1200&&document.querySelector('.claudian-messages').scrollHeight>document.querySelector('.claudian-messages').clientHeight*2)",240000);
  assert.deepEqual(await evaluate('window.__scrollRun.errors'),[]);
  assert.equal(await evaluate('window.__scrollRun.done'),false,'Output ended before live scrolling could be tested');
  await evaluate("window.__scrollRun.phase='following';undefined");await pause(160);
  record.phases.following=await evaluate(metrics);assert.equal(record.phases.following.following,'true');assert.ok(record.phases.following.distance<=2);assert.equal(record.phases.following.cornerLoaders,0);await shot(provider+'-live-following');
  const wheel=await evaluate(`(()=>{const r=document.querySelector('.claudian-messages').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await client.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',...wheel});
  await client.sendCommand('Input.dispatchMouseEvent',{type:'mouseWheel',...wheel,deltaX:0,deltaY:-520});
  await until("document.querySelector('.claudian-messages').dataset.autoScroll==='false'",3000);
  // Wheel input has native inertia. Measure the reading position only once
  // that user-initiated motion has settled, while real output continues.
  let lastTop=-1,stable=0;
  for(let i=0;i<40&&stable<5;i++){await pause(30);const top=await evaluate("document.querySelector('.claudian-messages').scrollTop");stable=Math.abs(top-lastTop)<1?stable+1:0;lastTop=top;}
  await evaluate("window.__scrollRun.phase='paused';undefined");
  const before=await evaluate('({top:document.querySelector(".claudian-messages").scrollTop,length:window.__scrollRun.text.length})');
  await until(`window.__scrollRun.text.length>${before.length+250}||window.__scrollRun.done`,30000);
  const after=await evaluate('({top:document.querySelector(".claudian-messages").scrollTop,length:window.__scrollRun.text.length})');
  record.readingProbe={before,after};save();
  assert.ok(after.length>before.length,'No actual output arrived while reading older content');assert.ok(Math.abs(after.top-before.top)<=2,'Output pulled the user away from their reading position');
  record.phases.paused={...await evaluate(metrics),newCharacters:after.length-before.length,readingPositionDrift:after.top-before.top};assert.equal(record.phases.paused.following,'false');assert.ok(record.phases.paused.button);await shot(provider+'-live-paused');
  await click('.sidebar-scroll-to-bottom');await until("document.querySelector('.claudian-messages').dataset.autoScroll==='true'",3000);
  await evaluate("window.__scrollRun.phase='resumed';undefined");
  await pause(180);record.phases.resumed=await evaluate(metrics);assert.ok(record.phases.resumed.distance<=2);assert.equal(record.phases.resumed.button,false);await shot(provider+'-live-resumed');
  await until('window.__scrollRun.done||window.__scrollRun.errors.length',240000);await pause(250);
  Object.assign(record,await evaluate('window.__scrollRun.recording=false;window.__scrollRun'));
  await evaluate('window.__scrollOff();undefined');
  assert.deepEqual(record.errors,[]);assert.equal(record.done,true);assert.ok(record.usage.length,'Missing real token usage');assert.ok(record.text.includes('SCROLL_STREAM_END'));
  record.configuration={model:runtime.settings.model,effort:runtime.settings.effort};
  if(provider==='claude'){assert.equal(record.configuration.model,'claude-haiku-5-5');assert.equal(record.configuration.effort,'high');record.usage.forEach(u=>{if(u.model)assert.equal(u.model,'claude-haiku-5-5')});}
  record.phases.completed=await evaluate(metrics);assert.ok(record.phases.completed.distance<=2);assert.equal(record.phases.completed.cornerLoaders,0);
  await move('.sidebar-header-main');record.phases.hiddenScrollbar=await evaluate(metrics);assert.equal(record.phases.hiddenScrollbar.hover,false);await shot(provider+'-scrollbar-hidden');
  await move('.claudian-messages');record.phases.hoverScrollbar=await evaluate(metrics);assert.equal(record.phases.hoverScrollbar.hover,true);assert.notEqual(record.phases.hoverScrollbar.thumb,record.phases.hiddenScrollbar.thumb);assert.equal(record.phases.hiddenScrollbar.thumb,'rgba(0, 0, 0, 0)');assert.equal(record.phases.hiddenScrollbar.arrowDisplay,'none');assert.equal(record.phases.hiddenScrollbar.width,record.phases.hoverScrollbar.width);assert.ok(Math.abs(record.phases.hoverScrollbar.leftGutter-record.phases.hoverScrollbar.rightGutter)<=1);await shot(provider+'-scrollbar-hover');
  await theme('light');await move('.sidebar-header-main');await shot(provider+'-light-completed');
  await theme('dark');await move('.sidebar-header-main');await shot(provider+'-dark-completed');
  record.frameAudit={samples:record.frames.length,backwardMoves:record.frames.filter((f,i,a)=>{const p=a[i-1];return p&&['following','resumed'].includes(f.phase)&&f.phase===p.phase&&f.following==='true'&&p.following==='true'&&f.height>=p.height&&f.top<p.top-2}).length};
  assert.equal(record.frameAudit.backwardMoves,0,'Following output moved backwards while content grew');
  record.ok=true;save();console.log('PASS real scroll '+provider+' '+JSON.stringify(record.frameAudit));
 }
 try{
  await until("!!document.querySelector('[data-cds=ChatComposer]')",30000);
  await theme('dark');await runProvider('claude');
  await evaluate("document.querySelector('[data-engine=codex]').click();undefined");await until("document.documentElement.dataset.sidebarProvider==='codex'",15000);await runProvider('codex');
  assert.deepEqual(report.rendererErrors,[]);report.ok=true;
 }catch(error){report.ok=false;report.error=error.stack||error.message;report.failureState=await evaluate('({run:window.__scrollRun,metrics:'+metrics+'})').catch(()=>null);await shot('failure').catch(()=>{});console.error(report.error)}
 finally{await evaluate('if(window.__scrollRun)window.__scrollRun.recording=false;window.__scrollOff?.();undefined').catch(()=>{});if(client.isAttached())client.detach();report.finishedAt=new Date().toISOString();report.reportPath=reportPath;save()}
 return report;
};
