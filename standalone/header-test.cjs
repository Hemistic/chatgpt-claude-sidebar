'use strict';
const fs=require('node:fs'),path=require('node:path');
const capture=require('./capture-ui.cjs');
exports.run=async({window,runDir,runtime})=>{
  const report={results:[],errors:[],modelRequests:0},reportPath=path.join(runDir,'header.json');
  const evaluate=code=>window.webContents.executeJavaScript(code),pause=ms=>new Promise(r=>setTimeout(r,ms));
  async function until(code){const end=Date.now()+15000;while(!await evaluate(code)){if(Date.now()>end)throw Error('Header UI timed out: '+code);await pause(50);}}
  async function shot(id){const file=path.join(runDir,id+'.png');await capture(window,file);return file;}
  try {
    window.showInactive();
    await until('!!document.querySelector(".sidebar-current-title")');
    await evaluate(`window.__headerErrors=[];window.addEventListener('error',event=>window.__headerErrors.push(event.message))`);
    report.providerSwitch=await require('./provider-switch-test.cjs').run({window,runDir});
    if(process.argv.includes('--provider-switch-only')) {
      if(runtime.currentTurnId)throw Error('Provider switch test started a model turn');
      report.ok=true;
      fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
      console.log('PASS provider hover navigation '+reportPath);
      return {...report,reportPath};
    }
    const titleBefore=await evaluate(`document.querySelector('.sidebar-current-title').innerText`);
    await evaluate(`document.querySelector('[aria-label="新对话"]').click()`);
    await until(`document.querySelector('.sidebar-current-title').innerText!==${JSON.stringify(titleBefore)}`);
    await evaluate(`document.querySelector('.sidebar-logo-button').click()`);
    await until(`!!document.querySelector('.sidebar-session-menu-item')`);
    if(await evaluate(`!!document.querySelector('[data-manager-section],.sidebar-sample-list,[data-sample-id]')`))throw Error('Recent menu still contains intermediate navigation or debugging samples');
    await until(`document.querySelectorAll('[data-project-path]').length>1 && !document.querySelector('[role=status]')`);
    const catalog=await evaluate(`window.claudianSidebar.codexAction({action:'threads',allProjects:true,limit:100})`);
    report.nativeCatalog={ok:catalog.ok,count:catalog.data?.data?.length,error:catalog.error,projects:[...new Set((catalog.data?.data||[]).map(item=>item.cwd))]};
    if(!catalog.ok||!catalog.data.data.length)throw Error('Real cross-project catalog is empty');
    await evaluate(`(() => {const input=document.querySelector('[aria-label=搜索全部对话]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'pdf-ai');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await until(`document.querySelectorAll('[data-project-path]').length>0 && [...document.querySelectorAll('[data-project-path]')].every(n=>n.dataset.projectPath.includes('pdf-ai'))`);
    report.results.push({id:'project-search',passed:true,screenshot:await shot('project-search')});
    await evaluate(`(() => {const input=document.querySelector('[aria-label=搜索全部对话]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await until(`document.querySelectorAll('[data-project-path]').length>1`);
    report.results.push({id:'direct-project-list',screenshot:await shot('direct-project-list')});
    const expected=await evaluate(`document.querySelector('.sidebar-session-menu-item [dir=auto]').getAttribute('title')`);
    await evaluate(`document.querySelector('.sidebar-session-menu-item').click()`);
    await until(`!document.querySelector('.sidebar-engine-menu').open && document.querySelector('.sidebar-current-title').innerText===${JSON.stringify(expected)}`);
    report.results.push({id:'switch-title',passed:true});
    for(const [width,height] of [[320,760],[440,760],[1440,900]]) {
      window.setContentSize(width,height);await pause(80);
      await evaluate(`document.querySelector('.sidebar-logo-button').click()`);
      await until(`!!document.querySelector('.sidebar-session-menu-item')`);
      const proof=await evaluate(`(() => {const logo=document.querySelector('.sidebar-logo-button'),menu=document.querySelector('.sidebar-conversation-manager'),title=document.querySelector('.sidebar-current-title'),row=document.querySelector('.sidebar-session-menu-item');title.textContent='这是用于验证当前对话标题在空间不足时仅省略末端的完整长标题'.repeat(4);const r=logo.getBoundingClientRect(),m=menu.getBoundingClientRect(),t=title.getBoundingClientRect();return {viewport:innerWidth,logo:{left:r.left,width:r.width,height:r.height,text:logo.innerText,provider:logo.querySelector('svg')?.dataset.provider},menu:{left:m.left,right:m.right,width:m.width},title:{width:t.width,scrollWidth:title.scrollWidth,ellipsis:getComputedStyle(title).textOverflow,center:(t.left+t.right)/2},rowHeight:row.getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth,errors:window.__headerErrors};})()`);
      if(proof.logo.text||proof.logo.provider!=='codex'||proof.logo.left>16||Math.abs(proof.logo.width-proof.logo.height)>1)throw Error('Logo button is not icon-only and left aligned');
      if(proof.menu.width>282||proof.menu.right>proof.viewport||Math.abs(proof.menu.left-proof.logo.left)>1||proof.overflow||proof.errors.length)throw Error('Invalid conversation menu geometry: '+JSON.stringify(proof));
      if(proof.title.ellipsis!=='ellipsis'||proof.title.scrollWidth<=proof.title.width||Math.abs(proof.title.center-proof.viewport/2)>2)throw Error('Conversation title is not centered and truncated');
      if(Math.abs(proof.rowHeight-30)>1)throw Error('Native sidebar row height differs from source');
      report.results.push({id:'header-'+width,passed:true,proof,screenshot:await shot('header-'+width)});
      await evaluate(`document.querySelector('.sidebar-logo-button').focus();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
      await until(`!document.querySelector('.sidebar-engine-menu').open`);
    }
    await evaluate(`document.querySelector('.sidebar-logo-button').click()`);
    await until(`!!document.querySelector('.sidebar-session-menu-item')`);
    const keyboard=await evaluate(`(() => {const rows=[...document.querySelectorAll('[data-sidebar-cycle-item]')];rows[0].focus();rows[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));return document.activeElement===rows[1];})()`);
    if(!keyboard)throw Error('Keyboard navigation did not move between native rows');
    await until(`!document.querySelector('[role=status]')`);
    const geometry=await evaluate(`(() => {const list=document.querySelector('.sidebar-manager-scroll'),menu=document.querySelector('.sidebar-conversation-manager');return {scrollHeight:list.scrollHeight,clientHeight:list.clientHeight,menuBottom:menu.getBoundingClientRect().bottom,viewport:innerHeight,background:document.querySelector('.claudian-messages').scrollTop};})()`);
    if(geometry.scrollHeight<=geometry.clientHeight||geometry.menuBottom>geometry.viewport)throw Error('Recent list is not a constrained scrolling region');
    await evaluate(`document.querySelector('.sidebar-manager-scroll').scrollTop=0`);
    const rect=await evaluate(`(() => {const r=document.querySelector('.sidebar-manager-scroll').getBoundingClientRect();return {x:Math.round(r.left+30),y:Math.round(r.top+80)};})()`);
    window.webContents.sendInputEvent({type:'mouseMove',...rect});
    window.webContents.sendInputEvent({type:'mouseWheel',...rect,deltaY:-400,deltaX:0});await pause(180);
    const moved=await evaluate(`document.querySelector('.sidebar-manager-scroll').scrollTop`);
    if(moved<=0)throw Error('Real wheel input did not scroll recent conversations');
    await evaluate(`const recentList=document.querySelector('.sidebar-manager-scroll');recentList.scrollTop=recentList.scrollHeight`);
    window.webContents.sendInputEvent({type:'mouseWheel',...rect,deltaY:-400,deltaX:0});await pause(180);
    if(await evaluate(`document.querySelector('.claudian-messages').scrollTop`)!==geometry.background)throw Error('Recent list scroll leaked into background conversation');
    report.results.push({id:'wheel-scroll',passed:true,geometry,screenshot:await shot('wheel-scroll')});
    await evaluate(`document.querySelector('.sidebar-engine-menu').open=false;document.activeElement.blur()`);
    window.webContents.sendInputEvent({type:'mouseMove',x:240,y:100});await pause(200);
    const hoverRect=await evaluate(`(() => {const r=document.querySelector('.sidebar-logo-button').getBoundingClientRect();return {x:Math.round(r.left+16),y:Math.round(r.top+16)};})()`);
    window.webContents.sendInputEvent({type:'mouseMove',...hoverRect});await until(`parseFloat(getComputedStyle(document.querySelector('.sidebar-provider-switch'),'::before').width)===68`);
    const capsule=await evaluate(`({width:parseFloat(getComputedStyle(document.querySelector('.sidebar-provider-switch'),'::before').width),visible:getComputedStyle(document.querySelector('.sidebar-anthropic-button')).visibility})`);
    if(capsule.width!==68||capsule.visible!=='visible')throw Error('Hover did not reveal the two-brand capsule');
    report.results.push({id:'hover-capsule',passed:true,capsule,screenshot:await shot('hover-capsule')});
    await evaluate(`document.querySelector('[data-engine=claude]').click()`);
    await until(`document.documentElement.dataset.sidebarProvider==='claude'`);
    report.results.push({id:'switch-anthropic',passed:true,screenshot:await shot('switch-anthropic')});
    await evaluate(`document.querySelector('[data-engine=codex]').click()`);
    await until(`document.documentElement.dataset.sidebarProvider==='codex'`);
    await evaluate(`document.querySelector('[aria-label=设置]').click()`);
    await until(`!!document.querySelector('.sw-settings-layer')`);
    await evaluate(`document.querySelector('.sw-settings-category').open=true;[...document.querySelectorAll('.sw-settings-nav button')].find(n=>n.getAttribute('aria-label')==='调试与样例').click()`);
    await until(`document.querySelectorAll('[data-sample-id]').length===8`);
    report.results.push({id:'debug-settings',passed:true,screenshot:await shot('debug-settings')});
    await evaluate(`document.querySelector('[aria-label=返回对话]').click();document.querySelector('.sidebar-logo-button').click()`);
    await until(`!!document.querySelector('.sidebar-session-menu-item') && !document.querySelector('[role=status]')`);
    const nativeEntry=catalog.data.data.find(item=>item.cwd?.includes('2026-10-29T11-53-31-191Z'));
    if(!nativeEntry)throw Error('Missing native history fixture');
    await evaluate(`document.querySelector('[data-conversation-id="codex:${nativeEntry.id}"]').click()`);
    await until(`!document.querySelector('.sidebar-engine-menu').open && document.querySelector('.sidebar-current-title').innerText===${JSON.stringify(nativeEntry.name || nativeEntry.preview?.slice(0,64) || 'Codex 会话')}`);
    report.results.push({id:'real-history-open',passed:true,project:nativeEntry.cwd,screenshot:await shot('real-history-open')});
    if(runtime.currentTurnId)throw Error('Header test started a model turn');
    report.ok=true;
  }catch(error){report.ok=false;report.errors.push(error.message);await shot('header-error');console.log('FAIL '+error.message);}
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log((report.ok?'PASS':'FAIL')+' header navigation '+reportPath);return {...report,reportPath};
};
