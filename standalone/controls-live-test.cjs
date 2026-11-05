'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const capture=require('./capture-ui.cjs');
exports.run=async({window,runtime,workspace,runDir})=>{
  const report={realTokens:true,startedAt:new Date().toISOString(),modelSelections:[],scenarios:[],screenshots:[],rendererErrors:[],limitations:['Native Windows file-picker selection still requires manual verification; no dialog result is mocked.']};
  const evaluate=code=>window.webContents.executeJavaScript(code),pause=ms=>new Promise(r=>setTimeout(r,ms));
  const arg=name=>process.argv.find(s=>s.startsWith('--'+name+'='))?.slice(name.length+3);
  assert.equal(arg('test-model'),'claude-haiku-5-5');assert.equal(arg('test-effort'),'high');
  const nonce='CONTROL_'+crypto.randomUUID(),fixture=path.join(workspace,'UI-CONTROL-PROBE.txt');
  fs.writeFileSync(fixture,nonce+'\n菜单、主题和真实 CLI 联通检查。\n');
  const reportPath=path.join(runDir,'controls-live.json');
  const save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
  window.webContents.on('console-message',(event,level,message)=>{if(event.level==='error'||level>=3){report.rendererErrors.push(event.message||message);save()}});
  const debuggerClient=window.webContents.debugger;debuggerClient.attach('1.3');
  async function until(code,ms=180000){const end=Date.now()+ms;while(!await evaluate(code)){if(Date.now()>end)throw Error('Timed out: '+code);await pause(120)}}
  async function shot(name){
    if (/^(claude|codex)-(model|effort|add)-/.test(name)) {
      const geometry=await evaluate(`(()=>{const p=document.documentElement.dataset.sidebarProvider;const nodes=p==='claude'?[...document.querySelectorAll('[data-cds=ModelSelector][role=menu], [data-cds=ModelSelectorEffort]:not(button), [data-cds=Menu][role=menu]')]:[...document.querySelectorAll('[data-control-menu]')];return nodes.map(n=>{const r=n.getBoundingClientRect();return{height:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right,text:n.innerText?.length||0}}).filter(r=>r.text&&r.height>30&&r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1)})()`);
      assert.ok(geometry.length,'Native menu is missing, clipped or off-screen: '+name);
    }
    const file=path.join(runDir,name+'.png');await capture(window,file);report.screenshots.push(file);save();return file}
  async function click(selector){await until(`!!document.querySelector(${JSON.stringify(selector)})`,12000);const point=await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});const r=n.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);if(!process.argv.includes('--background-test')){window.show();window.focus()}for(const type of ['mouseMoved','mousePressed','mouseReleased'])await debuggerClient.sendCommand('Input.dispatchMouseEvent',{type,...point,...(type==='mouseMoved'?{}:{button:'left',clickCount:1})});await pause(220)}
  async function escape(){await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(200)}
  async function provider(id){await escape();await evaluate(`document.querySelector('[aria-label="返回对话"]')?.click();document.querySelector('[data-engine="${id}"]').click();undefined`);await until(`document.documentElement.dataset.sidebarProvider==='${id}'`);await pause(600)}
  async function theme(value){await click('[aria-label="设置"]');await until(`!![...document.querySelectorAll('select')].find(n=>[...n.options].some(o=>o.value==='light'))`,12000);await evaluate(`(()=>{const n=[...document.querySelectorAll('select')].find(n=>[...n.options].some(o=>o.value==='light'));n.value=${JSON.stringify(value)};n.dispatchEvent(new Event('change',{bubbles:true}));})()`);await until(`document.documentElement.dataset.theme===${JSON.stringify(value)}`,12000);const backgrounds=await evaluate(`(()=>{const panel=document.querySelector('.sw-settings'),layer=document.querySelector('.sw-settings-layer');const probe=document.createElement('div');probe.style.background='var('+ (document.documentElement.dataset.sidebarProvider==='claude'?'--cds-page-bg':'--color-surface')+')';panel.appendChild(probe);const result={panel:getComputedStyle(panel).backgroundColor,layer:getComputedStyle(layer).backgroundColor,expected:getComputedStyle(probe).backgroundColor};probe.remove();return result})()`);
    assert.equal(backgrounds.panel,backgrounds.expected,'Settings must follow the native page background');assert.equal(backgrounds.layer,backgrounds.expected);
    await shot('settings-'+await evaluate('document.documentElement.dataset.sidebarProvider')+'-'+value);await click('[aria-label="返回对话"]');await pause(300)}
  async function newChat(){await click('[aria-label="新对话"]');await pause(500)}
  async function sendCase(id,prompt,proof){
    if (await evaluate("document.documentElement.dataset.sidebarProvider==='claude'")) {
      await until("window.claudianSidebar.getState().then(s=>s.settings.model==='claude-haiku-5-5'&&s.settings.effort==='high')",15000);
      assert.ok(await evaluate("document.querySelector('[data-cds=ModelSelectorEffort]').innerText.includes('High')"),'High is required before sending');
    }
    const rec={id,startedAt:new Date().toISOString(),ui:await evaluate(`({provider:document.documentElement.dataset.sidebarProvider,theme:document.documentElement.dataset.theme})`)};report.scenarios.push(rec);save();
    await evaluate(`window.__controlsCase={events:[],text:'',usage:[],errors:[],done:false};window.__controlsOff=window.claudianSidebar.onEvent(e=>{const s=window.__controlsCase;s.events.push(e);if(e.chunk?.type==='text')s.text+=e.chunk.content||'';if(e.chunk?.type==='usage')s.usage.push(e.chunk.usage);if(e.type==='error')s.errors.push(e.content);if(e.type==='done')s.done=true;});document.querySelector('textarea.claudian-input,[contenteditable=true]').focus();undefined`);
    await debuggerClient.sendCommand('Input.insertText',{text:prompt});await pause(150);
    await click(rec.ui.provider==='claude'?'[data-cds="ChatComposer"] button[aria-label="Send"]':'[aria-label="发送消息"]');
    const end=Date.now()+180000;let approvalCount=0;
    while(!await evaluate('window.__controlsCase.done||window.__controlsCase.errors.length')){
      if(Date.now()>end)throw Error('Real model request timed out: '+id);
      const pending=await evaluate(`window.__controlsCase.events.filter(e=>e.type==='approval')`);
      if(pending.length>approvalCount){await shot(id+'-approval-'+approvalCount);const last=pending.at(-1),payload=JSON.stringify(last);if(/Remove-Item|Set-Content|rm -|https?:\/\//i.test(payload))throw Error('Unexpected approval command in read-only test');const selected=await evaluate(`(()=>{const n=[...document.querySelectorAll('button')].find(n=>/^(Allow once|允许一次|仅本次允许|允许本次)/.test(n.textContent.trim()));if(!n)return false;n.click();return true})()`);if(selected)approvalCount=pending.length;}
      await pause(200);
    }
    await pause(450);Object.assign(rec,await evaluate('window.__controlsCase'));await evaluate('window.__controlsOff?.();undefined');
    rec.finishedAt=new Date().toISOString();rec.configuration={model:runtime.settings.model,effort:runtime.settings.effort};rec.screenshot=await shot(id+'-done');
    assert.deepEqual(rec.errors,[]);assert.equal(rec.done,true);assert.ok(rec.usage.length,'Missing real service usage');assert.ok(rec.text.includes(proof),'Expected marker not returned');
    if(rec.ui.provider==='claude'){assert.equal(rec.configuration.model,'claude-haiku-5-5');assert.equal(rec.configuration.effort,'high');rec.usage.forEach(u=>{if(u.model)assert.equal(u.model,'claude-haiku-5-5')});}
    rec.ok=true;save();console.log('PASS real '+id+' '+rec.configuration.model+'/'+rec.configuration.effort);
  }
  try{
    await evaluate("window.__modelInputs=[];for(const type of ['click','pointerdown','keydown'])document.addEventListener(type,e=>{if(type==='keydown'&&!['Escape','Home','ArrowRight'].includes(e.key))return;const trigger=document.querySelector('.codex-source-model');window.__modelInputs.push({type,key:e.key,tag:e.target.tagName,text:e.target.closest('button,[role=menuitemradio],[data-model-picker-view-toggle]')?.textContent?.slice(0,60),open:trigger?.getAttribute('aria-expanded'),menu:document.querySelector('[data-model-picker-view]')?.dataset.modelPickerView});if(window.__modelInputs.length>100)window.__modelInputs.shift()},true);undefined");
    if(!process.argv.includes('--controls-codex-only')){
    await until(`!!document.querySelector('[data-cds="ChatComposer"]')`);await pause(800);
    await newChat();await theme('dark');
    // Change only settings while checking the picker; no request is sent to
    // alternative Claude models. Restore Haiku/high before every real call.
    report.modelSelections=[];
    await click('[aria-label="Model"]');
    await until("document.querySelectorAll('[data-model-id]').length>=2",12000);
    const alternative=await evaluate("[...document.querySelectorAll('[data-model-id]')].find(n=>!n.dataset.modelId.endsWith('claude-haiku-5-5')).dataset.modelId");
    await click('[data-model-id="'+alternative+'"]');
    await until("window.claudianSidebar.getState().then(s=>s.settings.model==="+JSON.stringify(alternative.replace('claude-code/',''))+")",12000);
    if(!await evaluate("!!document.querySelector('[data-cds=ModelSelector][role=menu]')"))await click('[aria-label="Model"]');
    await until("!!document.querySelector('[data-cds=ModelSelector][role=menu] [data-model-id]')",12000);
    assert.equal(await evaluate("document.querySelector('[data-model-id="+JSON.stringify(alternative)+"]').getAttribute('aria-checked')"),'true');
    await shot('claude-model-alternative');
    await click('[data-model-id="claude-code/claude-haiku-5-5"]');
    await until("window.claudianSidebar.getState().then(s=>s.settings.model==='claude-haiku-5-5')",12000);
    await click('[aria-label="Model"]');await shot('claude-model-dark');
    const originalSize=window.getSize();window.setSize(360,620);await pause(300);await shot('claude-model-narrow');
    report.claudeScroll=await evaluate("(()=>{const menu=document.querySelector('[data-cds=ModelSelector][role=menu]');const candidates=[menu,...menu.querySelectorAll('*')].filter(n=>n.scrollHeight>n.clientHeight+2&&/auto|scroll/.test(getComputedStyle(n).overflowY));return candidates.map(n=>{n.scrollTop=n.scrollHeight;return {clientHeight:n.clientHeight,scrollHeight:n.scrollHeight,reachedBottom:Math.abs(n.scrollHeight-n.clientHeight-n.scrollTop)<=2}})})()");
    assert.ok(report.claudeScroll.every(r=>r.reachedBottom),'Native model menu cannot scroll to its last item');
    await shot('claude-model-narrow-scrolled');window.setSize(...originalSize);await pause(250);await escape();
    report.modelSelections.push({provider:'claude',alternative,restored:'claude-haiku-5-5',ok:true});
    assert.equal(await evaluate(`document.querySelector('[data-cds="ModelSelectorEffort"]').disabled`),false);
    await click('[data-cds="ModelSelectorEffort"]');await until(`!!document.querySelector('input[type="range"]')`,12000);await shot('claude-effort-dark');
    await evaluate(`document.querySelector('input[type="range"]').focus();undefined`);
    for(const key of ['Home','End']){await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:key==='Home'?36:35});await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:key==='Home'?36:35});await pause(200)}
    await escape();await until(`document.querySelector('[data-cds="ModelSelectorEffort"]').innerText.includes('High')`,12000);
    await click('[aria-label="Permission mode"]');await shot('claude-permission-dark');await escape();
    await click('[aria-label="Add"]');await shot('claude-add-dark');await escape();
    await evaluate(`document.querySelector('.claudian-native-input').focus();undefined`);
    await debuggerClient.sendCommand('Input.insertText',{text:'/'});
    await until(`!!document.querySelector('[data-claude-controls-source] [role=menu]')`,12000);
    await shot('claude-slash-dark');
    await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
    await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
    await escape();
    await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
    await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});
    await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
    await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});

    const documentNode=await debuggerClient.sendCommand('DOM.getDocument');const fileNode=await debuggerClient.sendCommand('DOM.querySelector',{nodeId:documentNode.root.nodeId,selector:'input[type=file]'});await debuggerClient.sendCommand('DOM.setFileInputFiles',{nodeId:fileNode.nodeId,files:[fixture]});await pause(300);assert.ok(await evaluate(`document.querySelector('.claudian-context-row').innerText.includes('UI-CONTROL-PROBE.txt')`));
    await sendCase('claude-dark-read',`这是只读真实 UI 验收。只用 Read 读取 ${fixture}，不要修改任何文件、联网或调用其他模型。逐字完整输出文件第一行（包括 CONTROL_ 前缀），再用一个中文小标题和一个 js 代码块展示 const theme = "dark";。`,nonce);
    await theme('light');await click('[aria-label="Model"]');await shot('claude-model-light');await escape();
    await click('[aria-label="Permission mode"]');await shot('claude-permission-light');await escape();
    await sendCase('claude-light-render','不要调用工具。回复 CLAUDE_LIGHT_CONTROL_OK，然后输出一个有两行数据、三列的中文 Markdown 表格，以及一个 js 代码块。','CLAUDE_LIGHT_CONTROL_OK');
    await window.webContents.reloadIgnoringCache();await until(`!!document.querySelector('[data-cds="ChatComposer"]')`,20000);await pause(500);assert.equal(await evaluate('document.documentElement.dataset.theme'),'light');await shot('claude-light-restored');
    }
    await until(`!!document.querySelector('textarea.claudian-input,[data-cds=ChatComposer]')`,20000);
    await provider('codex');await newChat();await theme('dark');
    await click('[aria-label="选择模型和推理强度"]');await until(`!!document.querySelector('[data-model-picker-view-toggle]')`,12000);await shot('codex-model-dark');
    await click('[data-model-picker-view-toggle]');
    assert.ok(await evaluate(`[...document.querySelectorAll('[data-control-menu=model] .sr-only')].every(n=>n.getBoundingClientRect().width<=1&&getComputedStyle(n).clipPath==='inset(50%)')`),'Native accessibility hints must stay visually hidden');
    assert.ok(await evaluate(`(()=>{const n=document.querySelector('[data-control-menu=model]');return !!getComputedStyle(n).getPropertyValue('--radix-dropdown-menu-content-available-height')})()`),'Native model panels require the portal available-height service');
    await shot('codex-model-list-dark');
    const codexSize=window.getSize();window.setSize(360,620);await pause(300);await shot('codex-model-narrow');window.setSize(...codexSize);await pause(250);
    const initialCodex=await evaluate("window.claudianSidebar.getState().then(s=>({model:s.settings.model,effort:s.settings.effort}))");
    const modelRows='[data-control-menu=model] [role=menuitemradio]';
    const chosen=await evaluate("[...document.querySelectorAll('"+modelRows+"')].find(n=>n.getAttribute('aria-checked')!=='true').textContent.trim()");
    await evaluate("[...document.querySelectorAll('"+modelRows+"')].find(n=>n.textContent.trim()==="+JSON.stringify(chosen)+").click();undefined");
    await until("window.claudianSidebar.getState().then(s=>s.settings.model!=="+JSON.stringify(initialCodex.model)+")",12000);
    // The source intentionally returns to the power panel after a model pick.
    // Dismiss that panel before checking the next independent open cycle.
    await escape();await click('[aria-label="选择模型和推理强度"]');
    await until("!!document.querySelector('[data-control-menu=model]')",12000);
    if(await evaluate("document.querySelector('[data-model-picker-view]')?.dataset.modelPickerView==='simple'"))await click('[data-model-picker-view-toggle]');
    const changed=await evaluate("window.claudianSidebar.getState().then(s=>s.settings.model)");
    assert.equal(await evaluate("[...document.querySelectorAll('"+modelRows+"')].find(n=>n.textContent.trim()==="+JSON.stringify(chosen)+")?.getAttribute('aria-checked')"),'true');
    await shot('codex-model-alternative');
    await evaluate("[...document.querySelectorAll('"+modelRows+"')].find(n=>n.textContent.trim()==='GPT-6.1 Sol').click();undefined");
    await until("window.claudianSidebar.getState().then(s=>s.settings.model==="+JSON.stringify(initialCodex.model)+")",12000);
    await escape();await click('[aria-label="选择模型和推理强度"]');
    await until("document.querySelector('[data-model-picker-view]')?.dataset.modelPickerView==='simple'",12000);
    await until("!!document.querySelector('[role=slider]')",12000);
    await evaluate("document.querySelector('[role=slider]').focus();undefined");
    for(const key of ['Home','ArrowRight','ArrowRight']){
      await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:key==='Home'?36:39});
      await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:key==='Home'?36:39});await pause(200);
    }
    await until("window.claudianSidebar.getState().then(s=>s.settings.effort==='high')",12000);
    await shot('codex-effort-high');await escape();
    report.modelSelections.push({provider:'codex',alternative:changed,restored:initialCodex.model,effort:'high',ok:true});
    await click('[aria-label="更改权限"]');await shot('codex-permission-dark');await escape();
    await click('[aria-label="添加文件与上下文"]');await shot('codex-add-dark');await escape();
    assert.equal(await evaluate(`document.querySelectorAll('.cx-mic,[aria-label*="语音输入"]').length`),0);
    await sendCase('codex-dark-read',`这是只读真实 UI 验收。读取 ${fixture}，不要修改文件或联网。逐字完整输出文件第一行（包括 CONTROL_ 前缀），再用一个中文标题和一个 js 代码块展示 const theme = "dark";。`,nonce);
    await theme('light');await click('[aria-label="选择模型和推理强度"]');await shot('codex-model-light');await escape();
    await click('[aria-label="更改权限"]');await shot('codex-permission-light');await escape();
    await evaluate(`document.querySelector('textarea.claudian-input').focus();undefined`);await debuggerClient.sendCommand('Input.insertText',{text:'/'});await until(`!!document.querySelector('[data-codex-slash-menu]')`,12000);await shot('codex-slash-light');
    // A real reply alone does not validate CSS extraction. Inspect the actual
    // painted menu and compare its geometry with the native token expressions.
    report.codexSlash=await evaluate(`(()=>{const n=document.querySelector('[data-codex-slash-menu]'),row=n.querySelector('[role=option]'),s=getComputedStyle(n),r=getComputedStyle(row),g=getComputedStyle(row.firstChild);return{radius:s.borderRadius,padding:r.padding,gap:g.gap,nativeRow:row.tagName==='BUTTON',scrollArea:!!n.querySelector('[data-mention-list-scroll-area]'),overflow:n.scrollWidth>n.clientWidth+1}})()`);
    assert.equal(report.codexSlash.radius,'16px');assert.equal(report.codexSlash.padding,'4px 8px');assert.equal(report.codexSlash.gap,'8px');assert.ok(report.codexSlash.nativeRow&&report.codexSlash.scrollArea);assert.equal(report.codexSlash.overflow,false);
    const slashSize=window.getSize();window.setSize(360,620);await pause(300);await shot('codex-slash-narrow');
    assert.ok(await evaluate(`(()=>{const n=document.querySelector('[data-codex-slash-menu]'),r=n.getBoundingClientRect();return r.top>=0&&r.left>=0&&r.right<=innerWidth+1&&n.scrollWidth<=n.clientWidth+1})()`));
    await debuggerClient.sendCommand('Input.insertText',{text:'re'});await pause(250);await shot('codex-slash-filtered');
    assert.ok(await evaluate(`[...document.querySelectorAll('[data-codex-slash-menu] [role=option]')].slice(0,2).every(n=>n.innerText.includes('/re'))`));
    await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
    assert.ok(await evaluate(`document.querySelector('[data-codex-slash-menu] [role=option]:nth-child(2)').getAttribute('aria-selected')==='true'`));
    await shot('codex-slash-keyboard');window.setSize(...slashSize);await pause(250);

    await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2,windowsVirtualKeyCode:65});await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});await debuggerClient.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});await escape();
    await sendCase('codex-light-render','不要调用工具。回复 CODEX_LIGHT_CONTROL_OK，然后输出一个有两行数据、三列的中文 Markdown 表格，以及一个 js 代码块。','CODEX_LIGHT_CONTROL_OK');
    await window.webContents.reloadIgnoringCache();await until(`!!document.querySelector('textarea.claudian-input')`,20000);await pause(500);assert.equal(await evaluate('document.documentElement.dataset.theme'),'light');await shot('codex-light-restored');
    if(process.argv.includes('--conversation-switch-check')) {
      const persisted=await evaluate(`JSON.parse(localStorage.getItem('claudian-sidebar-mock-state-v1'))`);
      const claude=persisted.tabs.find(t=>t.providerId==='claude'&&t.messages.some(m=>(m.content||'').includes('CLAUDE_LIGHT_CONTROL_OK')||m.contentBlocks?.some(b=>b.content?.includes('CLAUDE_LIGHT_CONTROL_OK'))));
      const codex=persisted.tabs.find(t=>t.id===persisted.activeTabId);
      assert.ok(claude,'The original Claude conversation must survive creating Codex conversations');assert.equal(codex.providerId,'codex');
      report.switchChecks=[];
      async function switchTo(tab,name){
        await evaluate(`window.__switchFrames=[];window.__switchAudit=true;(function frame(){if(!window.__switchAudit)return;const root=document.querySelector('.claudian-standalone-host');window.__switchFrames.push({provider:document.documentElement.dataset.sidebarProvider,root:root?.dataset.provider,text:root?.innerText.length||0,styles:[...document.querySelectorAll('link[data-provider-style]')].filter(n=>n.sheet?.media.mediaText==='all').map(n=>n.dataset.providerStyle)});requestAnimationFrame(frame)})();undefined`);
        await click('[aria-label="近期对话"]');
        const key=tab.runtimeThreadId?tab.providerId+':'+tab.runtimeThreadId:'history:'+(tab.historyId||tab.id);
        await click('[data-conversation-id="'+key+'"]');
        await until(`document.documentElement.dataset.sidebarProvider===${JSON.stringify(tab.providerId)}`,12000);await pause(300);
        const frames=await evaluate('window.__switchAudit=false;window.__switchFrames');
        assert.ok(frames.length);for(const f of frames){assert.ok(f.text>0,'Empty painted conversation');assert.equal(f.provider,f.root,'Provider style/frame mismatch');assert.ok(f.styles.every(p=>p===f.provider),'Both provider styles enabled in one frame');}
        const stored=await evaluate(`JSON.parse(localStorage.getItem('claudian-sidebar-mock-state-v1'))`);
        const selected=stored.tabs.find(t=>t.id===stored.activeTabId);assert.equal(selected.id,tab.id);assert.equal(selected.providerId,tab.providerId);assert.equal(selected.model,tab.model);
        await shot(name);report.switchChecks.push({name,frames:frames.length,provider:selected.providerId,model:selected.model,ok:true});save();
      }
      for(let i=0;i<3;i++){await switchTo(claude,'return-claude-'+i);await switchTo(codex,'return-codex-'+i);}
      await switchTo(claude,'claude-before-resume');
      await sendCase('claude-resume-after-switch','不要调用工具。继续当前会话，回复 CLAUDE_SWITCH_RESUME_OK。','CLAUDE_SWITCH_RESUME_OK');
      await theme('dark');await window.webContents.reloadIgnoringCache();await until(`!!document.querySelector('[data-cds="ChatComposer"]')`,20000);await pause(400);assert.equal(await evaluate('document.documentElement.dataset.theme'),'dark');await shot('claude-dark-reload');
      await click('[aria-label="新对话"]');await pause(400);assert.equal(await evaluate('document.documentElement.dataset.sidebarProvider'),'claude');await shot('new-chat-stays-claude');
      await switchTo(codex,'codex-before-resume');
      await sendCase('codex-resume-after-switch','不要调用工具。继续当前会话，回复 CODEX_SWITCH_RESUME_OK。','CODEX_SWITCH_RESUME_OK');
      await theme('dark');await window.webContents.reloadIgnoringCache();await until(`!!document.querySelector('textarea.claudian-input')`,20000);await pause(400);assert.equal(await evaluate('document.documentElement.dataset.theme'),'dark');await shot('codex-dark-reload');
      await theme('light');await shot('final-open-for-review');
    }
    assert.deepEqual(report.rendererErrors,[]);assert.equal(fs.readFileSync(fixture,'utf8'),nonce+'\n菜单、主题和真实 CLI 联通检查。\n');report.ok=true;
  }catch(error){report.ok=false;report.error=error.stack||error.message;report.modelDiagnostics=await evaluate("({inputs:window.__modelInputs,trigger:document.querySelector('.codex-source-model')?.outerHTML,menu:document.querySelector('[data-control-menu=model]')?.outerHTML.slice(0,1000),provider:document.documentElement.dataset.sidebarProvider})").catch(()=>null);await shot('failure').catch(()=>{});console.error(report.error)}
  finally{if(debuggerClient.isAttached())debuggerClient.detach();report.finishedAt=new Date().toISOString();report.reportPath=reportPath;save();}
  return report;
};
