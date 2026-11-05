'use strict';
// Real model rounds through the production editor, IPC and SDK. No injected
// approvals, tool responses or model messages are used for these checks.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const capture = require('./capture-ui.cjs');
exports.run = async ({ window, runtime, workspace, runDir }) => {
  const arg = name => process.argv.find(s => s.startsWith(`--${name}=`))?.slice(name.length + 3);
  const configuration = { model: arg('test-model'), effort: arg('test-effort') };
  const stage = arg('claude-source-test');
  if(stage==='plan-native')return require('./claude-plan-source-live.cjs').run({window,runtime,workspace,runDir});
  assert.ok(configuration.model && configuration.effort);
  const reportPath = path.join(runDir, `claude-source-${stage}.json`);
  const report = { configuration, stage, realTokens: true, results: [], errors: [], reportPath };
  const consoleError = (event, level, message) => {
    if (event.level === 'error' || level >= 3) (report.rendererErrors ||= []).push(event.message || message);
  };
  window.webContents.on('console-message', consoleError);
  const evaluate = code => window.webContents.executeJavaScript(code);
  const pause = ms => new Promise(r => setTimeout(r, ms));
  let modeSequence = 0;
  async function until(code, ms = 120000) {
    const end = Date.now() + ms;
    while (!await evaluate(code)) { if (Date.now() > end) throw Error('Timeout: ' + code); await pause(100); }
  }
  async function shot(name) { const file = path.join(runDir, name + '.png'); await capture(window, file); return file; }
  async function click(selector) {
    await until(`!!document.querySelector(${JSON.stringify(selector)})`, 10000);
    window.show(); window.focus(); await pause(450);
    const point = await evaluate(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});n.scrollIntoView({block:'nearest'});for(let a=n.parentElement;a;a=a.parentElement)if(['hidden','clip'].includes(getComputedStyle(a).overflowY)){a.scrollTop=0;a.scrollLeft=0;}window.scrollTo(0,0);const r=n.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
    for (const type of ['mouseMove', 'mouseDown', 'mouseUp']) window.webContents.sendInputEvent({ type, ...point, ...(type === 'mouseMove' ? {} : { button: 'left', clickCount: 1 }) });
  }
  async function chooseMode(label, expected, safe) {
    await click('[aria-label="Permission mode"]');
    await until(`!![...document.querySelectorAll('[role=menuitemradio]')].find(n=>n.innerText.trim()===${JSON.stringify(label)}||n.innerText.includes(${JSON.stringify(label)}))`, 10000);
    const before = await shot(`mode-${++modeSequence}-${safe}-menu`);
    await evaluate(`[...document.querySelectorAll('[role=menuitemradio]')].find(n=>n.innerText.includes(${JSON.stringify(label)})).click()`);
    // Settings are scoped to the active conversation and are sent to the SDK
    // at the next turn. The native checkmark verifies the draft selection here.
    await until(`document.querySelector('[aria-label="Permission mode"]').innerText.includes(${JSON.stringify(label)})`, 15000);
    return before;
  }
  async function send(prompt) {
    assert.equal(runtime.settings.model, configuration.model); assert.equal(runtime.settings.effort, configuration.effort);
    await evaluate(`window.__sourceCase={events:[],text:'',errors:[],usage:[],done:false};window.__sourceOff=window.claudianSidebar.onEvent(e=>{const s=window.__sourceCase;s.events.push(e);if(e.type==='error')s.errors.push(e.content);if(e.type==='done')s.done=true;if(e.chunk?.type==='text')s.text+=e.chunk.content||'';if(e.chunk?.type==='usage')s.usage.push(e.chunk.usage)});document.querySelector('[contenteditable=true]').focus();undefined`);
    const d = window.webContents.debugger; d.attach('1.3');
    try { await d.sendCommand('Input.insertText', { text: prompt }); } finally { d.detach(); }
    await pause(100); await click('[data-cds=ChatComposer] button[aria-label=Send]');
  }
  async function done(id, proof) {
    await until('window.__sourceCase.done||window.__sourceCase.errors.length'); await pause(350);
    const result = await evaluate('window.__sourceCase');
    assert.deepEqual(result.errors, []); assert.ok(result.done); assert.ok(result.usage.length, 'Missing real service usage');
    result.usage.forEach(u => { if (u.model) assert.equal(u.model, configuration.model); });
    report.results.push({ id, proof, ...result, screenshot: await shot(id + '-done') });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    await evaluate('window.__sourceOff?.();undefined'); console.log('REAL PASS ' + id);
    return result;
  }
  try {
    report.connection = await require('./claude-live-test.cjs').run({ window, workspace, runDir });
    await click('[data-testid="epitaxy-cds-model-selector"]');
    report.modelMenu = { screenshot: await shot('native-model-menu'),
      rows: await evaluate(`[...document.querySelectorAll('[role=menuitemradio]')].map(n=>({text:n.innerText,checked:n.getAttribute('aria-checked')}))`),
    };
    await evaluate(`document.querySelector('[data-testid="epitaxy-cds-model-selector"]').click();undefined`);
    report.modelMenu.effort = await evaluate(`(()=>{const n=document.querySelector('[data-cds=ModelSelectorEffort]');return n?{label:n.ariaLabel,disabled:n.disabled,text:n.innerText}:null})()`);
    assert.ok(report.modelMenu.effort?.label.toLowerCase().includes(configuration.effort));
    if (stage === 'permissions' || stage === 'all') {
      const menu = await chooseMode('Manual', 'normal', 'default');
      const manual = path.join(workspace, 'manual-source.txt'), nonce = 'SOURCE_' + Date.now();
      await send(`Use Write exactly once to write ${JSON.stringify(manual)} with exactly ${nonce}. Wait for approval. If denied, stop. Do not use any other tools or touch any other file.`);
      await until(`!!document.querySelector('[data-claude-approval]')||window.__sourceCase.done||window.__sourceCase.errors.length`);
      assert.ok(await evaluate(`!!document.querySelector('[data-claude-approval]')`));
      assert.equal(runtime.settings.claudeSafeMode, 'default');
      const approval = await shot('manual-real-approval');
      // Identify by native source action text, rather than relying on button order.
      await evaluate(`[...document.querySelectorAll('[data-claude-interaction] button')].find(n=>n.innerText.startsWith('Allow once')).dataset.realSourceAction='';undefined`);
      await click('[data-real-source-action]');
      await done('manual-write', { menu, approval }); assert.equal(fs.readFileSync(manual, 'utf8').trim(), nonce);
      const editsMenu = await chooseMode('Accept edits', 'normal', 'acceptEdits');
      const accepted = path.join(workspace, 'accept-edits-source.txt');
      await send(`Use Write once to create ${JSON.stringify(accepted)} containing exactly ${nonce}. This session is in acceptEdits mode. Do not touch other files or use shell commands.`);
      const edits = await done('accept-edits-write', { menu: editsMenu });
      assert.equal(runtime.settings.claudeSafeMode, 'acceptEdits');
      assert.equal(edits.events.some(e => e.type === 'approval'), false, 'Accept edits unexpectedly requested approval');
      assert.equal(fs.readFileSync(accepted, 'utf8').trim(), nonce);
      await chooseMode('Plan', 'plan', 'acceptEdits');
      await send(`This is a read-only planning check. Read ${JSON.stringify(accepted)}, write a short plan in the designated plan file, then call ExitPlanMode and wait for my decision. Do not implement changes.`);
      await until(`!!document.querySelector('[data-claude-interaction=plan_approval]')||window.__sourceCase.done||window.__sourceCase.errors.length`);
      assert.ok(await evaluate(`!!document.querySelector('[data-claude-interaction=plan_approval]')`));
      assert.equal(runtime.settings.permissionMode, 'plan');
      const plan = await shot('menu-plan-real-approval');
      await evaluate(`[...document.querySelectorAll('[data-claude-interaction] button')].find(n=>n.innerText.startsWith('Reject')).dataset.realSourceAction='';undefined`);
      await click('[data-real-source-action]'); await done('plan-mode', { plan });
      // Check source warning state without running a bypassed model round.
      await chooseMode('Bypass permissions', 'yolo', 'bypassPermissions');
      report.bypassState = await shot('bypass-trigger');
      await chooseMode('Manual', 'normal', 'default');
    }
    if (stage === 'code' || stage === 'all') {
      const nonce = 'CODE_SOURCE_' + Date.now();
      await send(`This is a code rendering test; do not call tools or change files. Reply in Chinese with exactly three fenced code blocks. First javascript: a function greet(name = "访客") that returns a template literal containing ${nonce} and the name; include a Chinese comment and a 180-character long string on a single source line. Second json: an object with marker "${nonce}", enabled true, values [1,2,3]. Third sidebar-unknown-language: plain lines containing "${nonce}" and "中文未知语言回退". Keep fences and line breaks intact.`);
      await until(`!!document.querySelector('.epitaxy-codeblock')||window.__sourceCase.done||window.__sourceCase.errors.length`);
      const streaming = await shot('code-streaming');
      await done('code-native-render', { streaming, nonce });
      await until(`document.querySelectorAll('.epitaxy-codeblock').length===3`, 15000);
      // The source renderer writes highlighted tokens into native shadow roots.
      await until(`[...document.querySelectorAll('.epitaxy-codeblock')].every(n=>[...n.querySelectorAll('*')].some(e=>e.shadowRoot?.querySelector('[data-line]')))`, 30000);
      const structure = await evaluate(`[...document.querySelectorAll('.epitaxy-codeblock')].map(n=>({fence:!!n.querySelector('.epitaxy-diff.epitaxy-fence'),copy:!!n.querySelector('[aria-label="Copy code"]'),text:n.querySelector('[data-code-text]')?.getAttribute('data-code-text'),shadow:[...n.querySelectorAll('*')].filter(e=>e.shadowRoot).map(e=>({lines:e.shadowRoot.querySelectorAll('[data-line]').length,error:e.shadowRoot.querySelector('[data-error-message]')?.textContent,tokens:e.shadowRoot.querySelectorAll('[data-line] span').length}))}))`);
      assert.ok(await evaluate(`!!customElements.get('diffs-container')&&[...document.querySelectorAll('diffs-container')].every(n=>n.shadowRoot.adoptedStyleSheets.length>0)`), 'Native shadow stylesheet was not initialized');
      assert.equal(structure.length, 3); structure.forEach(block => { assert.ok(block.fence && block.copy); assert.ok(block.text.includes(nonce)); block.shadow.forEach(s => assert.ok(!s.error, s.error)); });
      const copy = '.epitaxy-codeblock [aria-label="Copy code"]';
      await click(copy); await until(`!!document.querySelector('.epitaxy-codeblock [aria-label=Copied]')`, 10000);
      // Windows CF_UNICODETEXT uses CRLF. Compare the unchanged code content
      // after normalizing that platform newline representation only.
      const clipboard = require('electron').clipboard.readText(); assert.equal(clipboard.replace(/\r\n/g, '\n'), structure[0].text);
      report.code = { structure, clipboard, newlineNormalization: 'Windows CRLF to LF', copied: await shot('code-copied'), final: await shot('code-final') };
      const initial = window.getBounds(); window.setBounds({ ...initial, width: 1100, height: 800 }); await pause(300);
      report.code.wide = await shot('code-wide');
      report.code.overflow = await evaluate(`({document:document.documentElement.scrollWidth>innerWidth,blocks:[...document.querySelectorAll('.epitaxy-codeblock')].some(n=>n.getBoundingClientRect().right>innerWidth)})`);
      assert.deepEqual(report.code.overflow, { document: false, blocks: false });
      window.setBounds(initial);
    } else if (!['models','permissions'].includes(stage)) throw Error('Unknown source test stage: ' + stage);
    assert.deepEqual(report.rendererErrors || [], []);
    report.ok = true;
  } catch (error) {
    report.ok = false; report.errors.push(error.stack || error.message); report.screenshot = await shot('source-error');
  } finally {
    await evaluate('window.__sourceOff?.();undefined').catch(() => {});
    if (runtime.currentTurnId) await runtime.handleCancelTurn().catch(() => {});
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    window.webContents.removeListener('console-message', consoleError);
  }
  console.log((report.ok ? 'PASS ' : 'FAIL ') + reportPath); return report;
};
