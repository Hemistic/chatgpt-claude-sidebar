'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const capture = require('./capture-ui.cjs');

// A real, persistent development task per provider. Only observation and native
// UI answers are automated; no model text, SDK requests or responses are seeded.
exports.run = async ({ window, runtime, workspace, runDir }) => {
  const argument = name => process.argv.find(s => s.startsWith(`--${name}=`))?.slice(name.length + 3);
  const claude = { model: argument('test-model'), effort: argument('test-effort') };
  if (!claude.model || !claude.effort) throw Error('Specify the Claude test model and effort.');
  const providers = (argument('long-providers') || 'codex,claude').split(',');
  const resumeFile = argument('long-resume');
  const previous = resumeFile ? JSON.parse(fs.readFileSync(resumeFile, 'utf8')) : null;
  const reportPath = path.join(runDir, 'long-task.json');
  const report = { startedAt: new Date().toISOString(), realCli: true, mocked: false, workspace, providers: [], issues: [], rendererErrors: [], reportPath };
  const evaluate = code => window.webContents.executeJavaScript(code);
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  const errorListener = (event, level, message) => { if (event.level === 'error' || level >= 3) { report.rendererErrors.push({ at: Date.now(), message: event.message || message }); save(); } };
  window.webContents.on('console-message', errorListener);
  function issue(provider, phase, kind, details) {
    report.issues.push({ provider, phase, kind, details, at: new Date().toISOString() }); save(); console.log(`ISSUE ${provider}/${phase}: ${kind}`);
  }
  async function until(expression, timeout = 20000) {
    const deadline = Date.now() + timeout;
    while (!await evaluate(expression)) { if (Date.now() > deadline) throw Error('UI timeout: ' + expression); await pause(120); }
  }
  async function shot(name) {
    const file = path.join(runDir, name.replace(/[^a-zA-Z0-9._-]/g, '_') + '.png');
    await capture(window, file); return file;
  }
  async function click(expression) {
    await until(`!!(${expression})`); window.show(); window.focus(); await pause(450);
    const point = await evaluate(`(()=>{const n=(${expression});n.scrollIntoView({block:'nearest'});for(let a=n.parentElement;a;a=a.parentElement)if(['hidden','clip'].includes(getComputedStyle(a).overflowY)){a.scrollTop=0;a.scrollLeft=0;}window.scrollTo(0,0);const r=n.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
    for (const type of ['mouseMove','mouseDown','mouseUp']) window.webContents.sendInputEvent({ type, ...point, ...(type === 'mouseMove' ? {} : { button:'left',clickCount:1 }) });
  }
  async function type(text) {
    await until(`!!document.querySelector('[contenteditable=true],textarea.claudian-input')`);
    await evaluate(`document.querySelector('[contenteditable=true],textarea.claudian-input').focus({preventScroll:true});undefined`);
    const d=window.webContents.debugger; d.attach('1.3');
    try { await d.sendCommand('Input.insertText', { text }); } finally { d.detach(); }
  }
  const sendButton = `document.querySelector('[data-cds=ChatComposer] button[aria-label=Send],.cx-send:not([disabled]),button[aria-label="发送消息"],button[aria-label="发送"]')`;
  const stopButton = `document.querySelector('[data-cds=ChatComposer] button[aria-label=Stop],button[aria-label="停止生成"],.cx-stop')`;
  async function mode(provider, selected) {
    if (provider === 'codex') {
      await evaluate(`document.querySelector('.cx-permission-menu').open=true;undefined`);
      await click(`[...document.querySelectorAll('.cx-permission-menu button')].find(n=>n.innerText.trim()===${JSON.stringify(selected === 'plan' ? '计划模式' : '默认权限')})`);
    } else {
      await click(`document.querySelector('[aria-label="Permission mode"]')`);
      await click(`[...document.querySelectorAll('[role=menuitemradio]')].find(n=>n.innerText.startsWith(${JSON.stringify(selected === 'plan' ? 'Plan' : 'Manual')}))`);
    }
  }
  async function snapshot(provider, phase) {
    return evaluate(`(()=>{
      const root=document.querySelector('.claudian-messages'),turns=[...document.querySelectorAll('[data-role]')];
      const last=turns.filter(n=>n.dataset.role==='assistant').at(-1);
      function text(n){if(!n)return '';if(n.nodeType===3)return n.nodeValue||'';if(n.nodeType!==1)return '';if(['SCRIPT','STYLE'].includes(n.tagName))return '';if(n.shadowRoot)return [...n.shadowRoot.childNodes].map(text).join(' ');return [...n.childNodes].map(text).join(' ')}
      const plain=last?.innerText||'',full=text(last),header=document.querySelector('.sidebar-header')?.getBoundingClientRect(),footer=document.querySelector('.claudian-input-footer')?.getBoundingClientRect();
      const over=[...document.querySelectorAll('.cx-code,.epitaxy-codeblock,table,.cg-plan-card')].filter(n=>{const r=n.getBoundingClientRect();if(!(r.width>0&&(r.right>innerWidth+2||r.left<-2)))return false;for(let p=n.parentElement;p&&p!==document.body;p=p.parentElement){const b=p.getBoundingClientRect();if(['auto','scroll'].includes(getComputedStyle(p).overflowX)&&p.scrollWidth>p.clientWidth&&b.left>=-2&&b.right<=innerWidth+2)return false;}return true;}).map(n=>({tag:n.tagName,class:n.className,width:n.getBoundingClientRect().width}));
      return {provider:document.documentElement.dataset.sidebarProvider,turns:turns.length,assistantCount:turns.filter(n=>n.dataset.role==='assistant').length,assistantText:plain,assistantDeepText:full,code:document.querySelectorAll('.cx-code,.epitaxy-codeblock').length,tables:document.querySelectorAll('.cx-markdown table,.epitaxy-markdown table').length,toolRows:document.querySelectorAll('.cx-activity-line,[data-cds=ToolStep]').length,protocolTags:/<\\/?proposed_plan>|<\\/?tool_call>|\\"jsonrpc\\"\\s*:/.test(plain),documentOverflow:document.documentElement.scrollWidth>innerWidth,over,header:header?.toJSON(),footer:footer?.toJSON(),viewport:{width:innerWidth,height:innerHeight},scroll:root?{top:root.scrollTop,height:root.scrollHeight,client:root.clientHeight}:null,pending:document.querySelectorAll('[data-claude-interaction],.cg-approval,.cg-question').length,stopVisible:!!(${stopButton}),styles:[...document.querySelectorAll('link[data-provider-style]')].filter(n=>n.sheet?.media.mediaText==='all').map(n=>n.getAttribute('href'))};
    })()`);
  }
  function checkUI(provider, phase, ui) {
    if (ui.provider !== provider) issue(provider, phase, 'provider-mismatch', ui.provider);
    if (ui.documentOverflow || ui.over.length) issue(provider, phase, 'horizontal-overflow', { document:ui.documentOverflow,elements:ui.over });
    if (ui.protocolTags) issue(provider, phase, 'protocol-leak', ui.assistantText.slice(-1500));
    if (ui.header && ui.header.top < -2) issue(provider, phase, 'outer-container-scrolled', ui.header);
    if (ui.footer && (ui.footer.bottom > ui.viewport.height + 3 || ui.footer.top < 0)) issue(provider, phase, 'composer-offscreen', ui.footer);
  }
  async function observe() {
    await evaluate(`window.__long={started:Date.now(),events:[],text:'',tools:[],usage:[],errors:[],approvals:[],done:false,cancelled:false};window.__longOff=window.claudianSidebar.onEvent(e=>{const s=window.__long;s.events.push(e);if(e.threadId)s.threadId=e.threadId;if(e.type==='chunk'){if(e.chunk.type==='text')s.text+=e.chunk.content||'';if(e.chunk.type==='tool_use')s.tools.push(e.chunk);if(e.chunk.type==='usage')s.usage.push(e.chunk.usage);}if(e.type==='approval')s.approvals.push(e.approval);if(e.type==='error')s.errors.push(e.content||e.message);if(e.type==='done'){s.done=true;s.doneStatus=e.status;}if(e.type==='status'&&e.status==='cancelled')s.cancelled=true;});undefined`);
  }
  async function handleRequests(provider, phase, record) {
    const state = await evaluate(`({approval:!!document.querySelector('[data-claude-approval],.cg-approval'),claudeQuestion:!!document.querySelector('.epitaxy-question-card'),codexQuestion:!!document.querySelector('.cg-question:not(.cg-plan-implementation .cg-question)'),plan:!!document.querySelector('[data-claude-interaction=plan_approval]')})`);
    if (state.claudeQuestion || state.codexQuestion) {
      record.screenshots.push(await shot(provider+'-'+phase+'-question-'+record.interactions.length));
      if(state.claudeQuestion) {
        await click(`document.querySelector('.epitaxy-answer-option')`);
        await click(`[...document.querySelectorAll('.epitaxy-question-card button')].find(n=>/^(Submit|Next)/.test(n.innerText))`);
      } else await click(`document.querySelector('.cg-question:not(.cg-plan-implementation .cg-question) [role=radio]')`);
      record.interactions.push({type:'question',answer:'first option (include refunds)'});
    }
    if (state.plan) {
      record.screenshots.push(await shot(provider+'-'+phase+'-plan-pending'));
      await click(`[...document.querySelectorAll('[data-claude-interaction=plan_approval] button')].find(n=>n.innerText.startsWith('Accept')&&!n.innerText.includes('and'))`);
      record.interactions.push({type:'plan',answer:'manual Accept'});
    }
    if (state.approval) {
      const approval = await evaluate(`window.__long.approvals.at(-1)`);
      const input = approval?.input || {}, command = String(approval?.command || input.command || '');
      // Inspect command positions, not words inside source files/--format flags.
      // The project explicitly includes code/doc examples with those words.
      if (/(?:^|[;&|\r\n])\s*(?:curl|wget|Invoke-WebRequest|Remove-Item|taskkill|shutdown|Format-Volume|Clear-Disk|diskpart)\b|(?:^|[;&|\r\n])\s*rm\s+-rf|(?:^|[;&|\r\n])\s*git\s+(?:push|reset|clean)\b/i.test(command)) throw Error('Unexpected command outside the long-task test: '+command.slice(0,500));
      record.screenshots.push(await shot(provider+'-'+phase+'-approval-'+record.interactions.length));
      await click(provider==='claude'
        ? `[...document.querySelectorAll('[data-claude-approval] button')].find(n=>n.innerText.startsWith('Allow once'))`
        : `[...document.querySelectorAll('.cg-approval button')].find(n=>n.innerText.includes('允许这一次'))`);
      record.interactions.push({type:'approval',kind:approval?.kind,command});
    }
  }
  async function round(group, id, prompt, options = {}) {
    const provider = group.provider, record = { id, prompt, startedAt:new Date().toISOString(),screenshots:[],interactions:[],samples:[] };
    group.rounds.push(record);save(); await observe();
    try {
      if (options.implement) await click(`document.querySelector('.cg-plan-implementation [role=radio]')`);
      else { await type(prompt); await pause(120); await click(sendButton); }
      const end=Date.now()+(options.timeout || 600000);let lastShot=0,cancelRequested=false;
      while(Date.now()<end) {
        const current=await evaluate(`({done:window.__long.done,errors:window.__long.errors,textLength:window.__long.text.length,tools:window.__long.tools.length})`);
        if(current.errors.length||current.done)break;
        await handleRequests(provider,id,record);
        if(!record.staleQuestionRecorded&&record.interactions.some(i=>i.type==='question')&&await evaluate(`!![...document.querySelectorAll('.cx-activity-action')].find(n=>n.innerText==='等待回答')&&!document.querySelector('.cg-question')&&window.__long.text.includes('chose')`)) {
          issue(provider,id,'answered-question-still-waiting','Answer was submitted and model continued, but tool row still says 等待回答.');record.staleQuestionRecorded=true;
        }
        if(options.cancel && !cancelRequested && current.textLength>120) {
          record.screenshots.push(await shot(provider+'-'+id+'-before-stop'));
          await click(stopButton);cancelRequested=true;
        }
        if(Date.now()-lastShot>15000) {
          record.samples.push({at:Date.now(),ui:await snapshot(provider,id)});
          record.screenshots.push(await shot(provider+'-'+id+'-stream-'+record.samples.length));lastShot=Date.now();save();
          console.log(`PROGRESS ${provider}/${id}: ${current.tools} tool events, ${current.textLength} text chars`);
        }
        await pause(350);
      }
      await pause(600);
      Object.assign(record,await evaluate(`window.__long`));
      record.elapsedMs=Date.now()-Date.parse(record.startedAt);record.cancelRequested=cancelRequested;
      record.ui=await snapshot(provider,id);checkUI(provider,id,record.ui);
      record.screenshots.push(await shot(provider+'-'+id+'-done'));
      record.completed=record.done===true;
      if(!record.done)issue(provider,id,'turn-timeout',{elapsedMs:record.elapsedMs,tools:record.tools?.length});
      if(record.errors.length)issue(provider,id,'cli-error',record.errors);
      record.usageFinal=record.usage.at(-1)||null;
      if(!record.usageFinal)issue(provider,id,options.cancel?'interrupted-usage-not-reported':'usage-not-reported','No zero estimate was substituted.');
      if(provider==='claude'&&record.usage.some(u=>u.model&&u.model!==claude.model))issue(provider,id,'wrong-model',record.usage.map(u=>u.model));
      if(!options.cancel&&record.ui.stopVisible)issue(provider,id,'stale-stop-control',true);
      save();console.log(`FINISH ${provider}/${id}: ${record.completed?'done':'incomplete'}, ${record.elapsedMs}ms, ${record.tools.length} tool events`);
      if(!record.completed||record.errors.length)throw Error('Real round failed: '+provider+'/'+id);
      return record;
    } catch(error) {Object.assign(record,await evaluate('window.__long||{}').catch(()=>({})));record.failure=error.stack||error.message;issue(provider,id,'test-stopped',record.failure);record.screenshots.push(await shot(provider+'-'+id+'-error'));throw error;}
    finally {await evaluate('window.__longOff?.();undefined').catch(()=>{});save();}
  }
  function seed(provider) {
    const project=path.join(workspace,provider),nonce='LONG_'+provider.toUpperCase()+'_'+randomUUID();
    for(const dir of ['src','test','scripts','data','docs'])fs.mkdirSync(path.join(project,dir),{recursive:true});
    fs.writeFileSync(path.join(project,'SPEC.md'),`# Ledger task\nConversation nonce: ${nonce}\n\nImplement a zero-dependency CommonJS Node 20+ ledger library and CLI. Work ONLY inside ${project}. Never install packages or access the network.\n\nRequired files: src/csv.cjs, src/ledger.cjs, src/report.cjs, bin.cjs, test/*.test.cjs, scripts/verify.cjs, docs/usage.md.\n\nparseCsv(text) exported from src/csv.cjs returns array of objects, accepts BOM, CRLF/LF, quoted commas, escaped quotes and quoted newlines, Chinese headers/data, ignores blank rows, rejects duplicate headers or inconsistent columns.\nnormalizeRows(rows) exported from src/ledger.cjs returns {valid,invalid}; valid entries are {date,category,amount,status}, invalid entries preserve row and reason. Dates YYYY-MM-DD must be real; amount is finite numeric; category required; status paid/refund only.\naggregate(valid,{includeRefunds=true,since}={}) returns {count,total,byCategory}, where byCategory is an alphabetically sorted array of {category,count,total}. Refund rows have positive input amount and count negative when included. Since is inclusive YYYY-MM-DD. Monetary results rounded to two decimals.\ntoMarkdown(summary) from src/report.cjs returns a Chinese Markdown table. bin.cjs --input file [--format json|markdown] [--since YYYY-MM-DD] reads, validates, aggregates and writes stdout; invalid rows go to stderr and exit status 2.\n\nFirst ask the user via native question tool whether refunds should be included by default. Put Include refunds as the first option. Then produce a native plan; do not implement until approval/next turn.\n\nBuild >=18 meaningful node:test cases. Run them and recover from failures; explain real results. Keep the nonce in conversation memory.\n`);
    fs.writeFileSync(path.join(project,'data','sales.csv'),'date,category,amount,status\n2026-10-01,图书,12.50,paid\n2026-10-02,文具,7.50,paid\n2026-10-03,图书,2.50,refund\n');
    fs.writeFileSync(path.join(project,'src','ledger.cjs'),"exports.aggregate = () => { throw new Error('not implemented'); };\n");
    fs.writeFileSync(path.join(project,'test','smoke.test.cjs'),"const test=require('node:test');const assert=require('node:assert/strict');const {aggregate}=require('../src/ledger.cjs');test('empty ledger totals zero',()=>assert.equal(aggregate([]).total,0));\n");
    return {project,nonce};
  }
  async function setup(provider) {
    if (previous) {
      await until(`document.documentElement.dataset.sidebarProvider===${JSON.stringify(provider)}`);
      await until(`document.querySelectorAll('[data-role=assistant]').length>=2`);
      return evaluate(`window.claudianSidebar.getState().then(s=>({model:s.settings.model,effort:s.settings.effort,provider:s.settings.provider,resumed:true}))`);
    }
    await evaluate(`document.querySelector('[data-engine=${provider}]').click();undefined`);await until(`document.documentElement.dataset.sidebarProvider===${JSON.stringify(provider)}`);
    if(provider==='claude') {
      await evaluate(`window.claudianSidebar.updateSettings({provider:'claude',model:${JSON.stringify(claude.model)},effort:${JSON.stringify(claude.effort)},claudeCustomModels:${JSON.stringify(claude.model)}})`);await pause(800);
      await click(`document.querySelector('[aria-label=Model]')`);
      const label=claude.model.replace(/^claude-(haiku|sonnet|opus)-(.+)$/i,(_,n,v)=>n[0].toUpperCase()+n.slice(1)+' '+v.replaceAll('-','.'));
      await click(`[...document.querySelectorAll('[role=menuitemradio]')].find(n=>n.innerText.includes(${JSON.stringify(label)}))`);
    }
    await click(`document.querySelector('[aria-label="新对话"]')`);await pause(300);
    return evaluate(`window.claudianSidebar.getState().then(s=>({model:s.settings.model,effort:s.settings.effort,provider:s.settings.provider}))`);
  }
  function verify(group) {
    const script=`const assert=require('node:assert/strict'),fs=require('node:fs'),p=${JSON.stringify(group.project)};const csv=require(p+'/src/csv.cjs'),l=require(p+'/src/ledger.cjs');const parsed=csv.parseCsv(fs.readFileSync(p+'/data/sales.csv','utf8'));const n=l.normalizeRows(parsed);assert.equal(n.invalid.length,0);const a=l.aggregate(n.valid);assert.equal(a.count,3);assert.equal(a.total,17.5);assert.equal(l.aggregate(n.valid,{includeRefunds:false}).total,20);assert.equal(l.aggregate(n.valid,{since:'2026-10-02'}).total,5);console.log(JSON.stringify(a));`;
    try {group.independentVerification=execFileSync(process.execPath,[ '-e', script],{encoding:'utf8',windowsHide:true,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'}});}
    catch(error){issue(group.provider,'artifact-verification','functional-result',{message:error.message,stderr:String(error.stderr||'').slice(-3000)});}
    group.files=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else {const data=fs.readFileSync(file);group.files.push({file:path.relative(group.project,file),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}}}walk(group.project);save();
  }
  try {
    execFileSync('git',['init','-q'],{cwd:workspace,windowsHide:true});
    for(const provider of providers) {
      const prior=previous?.providers.find(g=>g.provider===provider);
      const fixture=prior?{project:prior.project,nonce:prior.nonce}:seed(provider),group={provider,...fixture,rounds:prior?prior.rounds.filter(r=>r.completed):[],startedAt:prior?.startedAt||new Date().toISOString(),...(prior?{resumedFrom:resumeFile,previousAttempts:prior.rounds.filter(r=>!r.completed),resumeAt:new Date().toISOString()}: {})};report.providers.push(group);save();
      try {
        group.configuration=await setup(provider);if(!prior)await mode(provider,'plan');
        const scoped=`This is an authorized long-task UI/CLI test in the disposable project ${fixture.project}. Only read/write that directory (plus the CLI's designated plan file); no network, packages, commits, or unrelated files. Do not spawn agents or subagents or call other models. Do not use shell rm -rf or Remove-Item; leave scratch directories for the test harness to inspect. `;
        if(!prior) {
        await round(group,'01-plan-question',scoped+`Read SPEC.md and all existing project files. Use ${provider==='claude'?'AskUserQuestion':'request_user_input'} for the one refund-policy question described in SPEC.md; wait for the UI answer. Produce the complete native plan. ${provider==='claude'?'You are in plan mode: call ExitPlanMode and await the native UI approval. After approval, only acknowledge the plan and finish this turn; do not implement yet.':'Do not implement; finish with a detailed proposed_plan.'}`);
        const plan=await evaluate(`!!document.querySelector('.cg-plan-implementation')`);
        if(provider==='codex'&&!plan)issue(provider,'01-plan-question','native-plan-request-missing',true);
        if(provider==='claude')await mode(provider,'normal');
        await round(group,'02-implement',scoped+'Implement the approved SPEC.md plan now. Create all modules, CLI, >=18 meaningful tests and usage docs. Actually run node --test and the CSV CLI; fix every failure. Track progress with the available native task/plan tool. Do not stop at describing code.',{implement:provider==='codex'&&plan});
        }
        await round(group,'03-change-request',scoped+'Incremental requirement: count means the number of included transactions (a refund contributes +1 to count, but subtracts its amount from total), not net transaction count. Support --since inclusive date filtering and reject unknown status without silently dropping it; include a quoted multiline Chinese CSV field case and an escaped quote case. Read what you built, add regression tests and documentation, run the entire test suite and CLI. If already supported, strengthen tests instead of rewriting unnecessarily. Finish with a Chinese results table of actual commands and outcomes.');
        await round(group,'04-error-recovery',scoped+'Exercise failure reporting: run node scripts/not-present.cjs once and observe its expected nonzero exit; do not claim that command passed. Then create/complete scripts/verify.cjs to check the actual ledger on data/sales.csv and print 60 numbered verification lines with Chinese text plus the actual total. Run that script and the test suite, fixing any real failures. Explain the failed command separately from the successful recovery.');
        await round(group,'05-long-report',scoped+`Audit the complete project and execute the full tests and CLI once more. Then give a substantial Chinese handover report (roughly 1800-2500 Chinese characters): headings, a requirements/results table of >=12 rows, nested lists, four fenced code examples (JavaScript, JSON, shell, CSV), file links, one long path and Chinese quoted text. Report only real verified results, discuss limitations and the recovered failure. Start with LONG_REPORT_BEGIN and end with LONG_REPORT_END. Recall and include the conversation nonce from SPEC.md. Do not abbreviate to a one-paragraph summary.`);
        const sizes=[{width:360,height:760,name:'narrow'},{width:1100,height:800,name:'wide'},{width:440,height:760,name:'sidebar'}];
        group.layout=[];
        for(const size of sizes){window.setBounds({...window.getBounds(),width:size.width,height:size.height});await pause(450);const root=`document.querySelector('.claudian-messages')`;for(const [position,fraction] of [['top',0],['middle',0.5],['bottom',1]]){await evaluate(`(()=>{const n=${root};n.scrollTop=(n.scrollHeight-n.clientHeight)*${fraction}})()`);await pause(150);const ui=await snapshot(provider,'05-long-report');checkUI(provider,'05-long-report-'+size.name+'-'+position,ui);group.layout.push({size:size.name,position,ui,screenshot:await shot(provider+'-layout-'+size.name+'-'+position)});}}
        verify(group);
        await round(group,'06-cancel','Do not call tools or change files. Produce a detailed numbered 1000-line review of this project, one distinct line per number, starting now. No ellipsis.',{cancel:true,timeout:180000});
        const resume=await round(group,'07-resume','Do not use tools. In Chinese, state the exact conversation nonce from the original SPEC.md and the agreed default refund policy; acknowledge that the previous output was intentionally stopped.');
        if(!resume.text.includes(fixture.nonce))issue(provider,'07-resume','context-not-retained',resume.text);
        const before=await snapshot(provider,'08-reload');await evaluate('window.location.reload();undefined');await pause(2000);await until(`!!document.querySelector('[contenteditable=true],textarea.claudian-input')`);
        const after=await snapshot(provider,'08-reload');group.reload={before,after,screenshot:await shot(provider+'-reload')};
        if(after.provider!==provider||after.turns<before.turns)issue(provider,'08-reload','history-display-regression',{before:before.turns,after:after.turns,provider:after.provider});
        const reconnected=await round(group,'08-reconnect',scoped+'Continue this same conversation after UI reload. Use Read or a terminal to read scripts/verify.cjs and then run it. In your final Chinese answer include the original nonce from memory and the actual total. Do not start a new project.');
        if(!reconnected.text.includes(fixture.nonce))issue(provider,'08-reconnect','reconnect-context-loss',reconnected.text);
        group.ok=!group.rounds.some(r=>r.failure||!r.completed);group.finishedAt=new Date().toISOString();save();
      }catch(error){group.ok=false;group.error=error.stack||error.message;await runtime.handleCancelTurn().catch(()=>{});save();}
    }
  }catch(error){report.error=error.stack||error.message;}
  finally {window.webContents.removeListener('console-message',errorListener);report.finishedAt=new Date().toISOString();report.ok=report.providers.length===providers.length&&report.providers.every(g=>g.ok)&&!report.rendererErrors.length;save();}
  console.log((report.ok?'PASS ':'ISSUES ')+reportPath);return report;
};
