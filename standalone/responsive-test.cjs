'use strict';
const fs=require('node:fs'),path=require('node:path');
const capture=require('./capture-ui.cjs');
exports.run=async({window,runtime,runDir})=>{
  const report={kind:'UI geometry; no model requests',results:[],errors:[]};
  const reportPath=path.join(runDir,'responsive.json');
  const evaluate=code=>window.webContents.executeJavaScript(code);
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  try {
    await pause(500);
    for(const [width,height] of [[320,760],[440,760],[900,850],[1440,900],[1920,1080]]) {
      window.setContentSize(width,height);
      await pause(120);
      const short=await evaluate(`(() => {const bubble=document.querySelector('.cg-user-bubble');bubble.textContent='短消息';return bubble.getBoundingClientRect().width;})()`);
      await evaluate(`document.querySelector('.claudian-messages').scrollTop=0`);
      if(width===320||width===1920)await capture(window,path.join(runDir,`layout-${width}-short.png`));
      const proof=await evaluate(`(() => {const bubble=document.querySelector('.cg-user-bubble');bubble.textContent='这是对话布局宽度验证：窄侧栏保持可读，宽窗口居中留白，正文达到原版上限后停止增长。气泡由文字内容决定实际宽度，并由原始最大宽度变量约束。'.repeat(2);const message=bubble.closest('.cg-message'),composer=document.querySelector('.claudian-active-input-slot'),plan=document.querySelector('.cg-plan-card');const box=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};};return {viewport:innerWidth,message:box(message),composer:box(composer),bubble:box(bubble),bubbleLimit:getComputedStyle(bubble).maxWidth,compact: bubble.classList.contains('_compactMessageBubble_168sz_15'),pageOverflow:document.documentElement.scrollWidth>innerWidth,threadLimit:getComputedStyle(document.documentElement).getPropertyValue('--thread-content-max-width'),plan:plan?box(plan):null};})()`);
      if(proof.pageOverflow||proof.compact||proof.message.width>770||Math.abs(proof.bubble.width-proof.message.width*.7)>1||proof.bubble.width<=short)throw Error('Invalid responsive geometry: '+JSON.stringify(proof));
      if(width>=900 && (proof.message.left<40||Math.abs((proof.composer.left+proof.composer.right)/2-proof.viewport/2)>2))throw Error('Wide content is not centered');
      await evaluate(`document.querySelector('.claudian-messages').scrollTop=0`);
      const screenshot=path.join(runDir,`layout-${width}.png`);await capture(window,screenshot);
      report.results.push({width,height,passed:true,shortBubbleWidth:short,proof,screenshot});
      fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log('PASS layout '+width+' '+JSON.stringify({column:proof.message.width,bubble:proof.bubble.width,short}));
    }
    if(runtime.currentTurnId)throw Error('Layout test unexpectedly started a model turn');
    report.ok=true;
  }catch(error){report.ok=false;report.errors.push(error.message);await capture(window,path.join(runDir,'responsive-error.png'));console.log('FAIL '+error.message);}
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2));return {...report,reportPath};
};
