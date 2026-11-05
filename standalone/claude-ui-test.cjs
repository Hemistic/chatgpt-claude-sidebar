"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  capture = require("./capture-ui.cjs");
exports.run = async ({ window, runtime, runDir }) => {
  const report = { results: [], errors: [], modelRequests: 0 },
    file = path.join(runDir, "claude-ui.json");
  const evaluate = async (code) => {try{return await window.webContents.executeJavaScript(code);}catch(error){throw Error('Renderer step failed ('+code.slice(0,220)+'): '+error.message);}},
    pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function until(code, timeout = 15000) {
    const end = Date.now() + timeout;
    while (!(await evaluate(code))) {
      if (Date.now() > end) throw Error("Claude UI timed out: " + code);
      await pause(60);
    }
  }
  async function shot(id) {
    const proof = await evaluate(
      `({overflow:document.documentElement.scrollWidth>innerWidth||document.querySelector('.claudian-messages').scrollWidth>document.querySelector('.claudian-messages').clientWidth+1,errors:window.__claudeUiErrors,raw:document.body.innerText.includes('"tool_use_id"'),provider:document.documentElement.dataset.sidebarProvider,rootFont:getComputedStyle(document.documentElement).fontSize})`,
    );
    const screenshot = path.join(runDir, id + ".png");
    proof.activeStyles = await evaluate(
      `Array.from(document.querySelectorAll('link[rel=stylesheet]')).filter(n=>!n.disabled&&matchMedia(n.media||'all').matches).map(n=>n.getAttribute('href'))`,
    );
    proof.inactiveLayersVisible = await evaluate(
      `Array.from(document.querySelectorAll('.claudian-resume-dropdown:not(.visible),.claudian-slash-dropdown:not(.visible),.claudian-mention-dropdown:not(.visible),.claudian-drop-overlay:not(.visible)')).filter(n=>getComputedStyle(n).display!=='none').map(n=>n.className)`,
    );
    await capture(window, screenshot);
    report.results.push({ id, screenshot, proof });
    fs.writeFileSync(file, JSON.stringify(report, null, 2));
    if (proof.overflow || proof.errors.length || proof.raw)
      throw Error("Invalid Claude UI: " + JSON.stringify(proof));
    if (proof.inactiveLayersVisible.length)
      throw Error(
        "Inactive overlays became visible: " +
          proof.inactiveLayersVisible.join(","),
      );
    if (
      proof.activeStyles.some(
        (file) =>
          (proof.provider === "claude") !== file.startsWith("./claude-"),
      )
    )
      throw Error(
        "Provider styles are mixed: " + JSON.stringify(proof.activeStyles),
      );
    console.log("PASS " + id);
  }
  async function sample(id) {
    await evaluate(`document.querySelector('[aria-label=设置]').click()`);
    await until(`!!document.querySelector('.sw-settings-category')`);
    await evaluate(
      `document.querySelector('.sw-settings-category').open=true;[...document.querySelectorAll('.sw-settings-nav button')].find(n=>n.getAttribute('aria-label')==='调试与样例').click()`,
    );
    await until(`!!document.querySelector('[data-sample-id=${id}]')`);
    await evaluate(`document.querySelector('[data-sample-id=${id}]').click()`);
    await until(`!document.querySelector('.sw-settings-layer')`);
    if (
      await evaluate(
        `document.documentElement.dataset.sidebarProvider!=='claude'`,
      )
    )
      await evaluate(`document.querySelector('[data-engine=claude]').click()`);
    await until(
      `!!document.querySelector('[data-cds=UserMessage]') && document.documentElement.dataset.sidebarProvider==='claude'`,
    );
    await pause(120);
    await evaluate(`document.querySelector('.claudian-messages').scrollTop=0`);
  }
  try {
    window.showInactive();
    await evaluate(
      `window.__claudeUiErrors=[];window.addEventListener('error',event=>window.__claudeUiErrors.push(event.error?.stack||event.message))`,
    );
    await until(`!!window.ClaudeNativeSource`);
    for (const id of [
      "conversation",
      "tools",
      "changes",
      "plan",
      "permission",
      "question",
      "review",
      "recovery",
    ]) {
      await sample(id);
      if (id === "plan") {
        await until(`!!document.querySelector('.epitaxy-approval-actions')`);
        await shot("claude-plan");
        await pause(500);
        await evaluate(
          `[...document.querySelectorAll('.epitaxy-approval-actions button')].find(n=>n.innerText.startsWith('Revise')).click()`,
        );
        await until(
          `!!document.querySelector('textarea[aria-label="Plan feedback"]')`,
        );
        await shot("claude-plan-revise");
      } else if (id === "permission") {
        await until(`!!document.querySelector('[data-claude-approval]')`);
        await shot("claude-permission");
        await pause(500);
        await evaluate(
          `[...document.querySelectorAll('[data-claude-approval] button')].find(n=>n.innerText.includes('Allow once')).click()`,
        );
        await until(`document.body.innerText.includes('样例反馈：允许这一次')`);
        await shot("claude-permission-answered");
      } else if (id === "question") {
        await until(`!!document.querySelector('.epitaxy-question-card')`);
        await shot("claude-question");
        await evaluate(
          `document.querySelectorAll('.epitaxy-answer-option')[1].click()`,
        );
        await evaluate(
          `[...document.querySelectorAll('.epitaxy-question-card button')].find(n=>n.innerText.startsWith('Next')).click()`,
        );
        await until(
          `document.querySelector('.epitaxy-question-card').innerText.includes('第一批需要哪些能力')`,
        );
        await evaluate(
          `document.querySelectorAll('.epitaxy-answer-option')[0].click();document.querySelectorAll('.epitaxy-answer-option')[1].click()`,
        );
        if (
          (await evaluate(
            `document.querySelectorAll('.epitaxy-answer-option[aria-pressed=true]').length`,
          )) !== 2
        )
          throw Error("Native multi-select lost an answer");
        await shot("claude-question-multiple");
        await evaluate(
          `[...document.querySelectorAll('.epitaxy-question-card button')].find(n=>n.innerText.startsWith('Submit')).click()`,
        );
        await until(`document.body.innerText.includes('样例反馈：保存方式')`);
        await shot("claude-question-answered");
      } else {
        await shot("claude-" + id);
        if (id === "conversation")
          report.cssParity = await require("./claude-reference-test.cjs").run({
            window,
            runDir,
          });
        if (id === "conversation") {
          for (const width of [320, 900, 1440, 1920]) {
            window.setSize(width, 760);
            await pause(100);
            const geometry = await evaluate(
              `(()=>{const c=document.querySelector('[data-claude-column]'),s=getComputedStyle(c);return {width:c.getBoundingClientRect().width,max:parseFloat(s.getPropertyValue('--max-content-width'))||768}})()`,
            );
            if (geometry.width > geometry.max + 65)
              throw Error(
                "Claude reading column grew beyond native measure: " +
                  JSON.stringify(geometry),
              );
            await shot("claude-width-" + width);
          }
          window.setSize(440, 760);
          await pause(100);
        }
      }
    }
    await evaluate(`document.querySelector('[aria-label=新对话]').click()`);
    await until(
      `!!document.querySelector('[data-cds=ChatComposer] [contenteditable=true]')`,
    );
    await shot("claude-composer");
    const composition = await evaluate(
      `(()=>{const root=document.querySelector('[data-claude-code-composer]'),composer=root.querySelector('[data-cds=ChatComposer]'),card=composer.firstElementChild,chin=composer.querySelector('[data-cds=ChatComposerChin]'),add=chin.querySelector('[aria-label=Add]'),send=card.querySelector('[aria-label=Send]');return {codeShell:!!root.querySelector('.epitaxy-prompt[data-cds-shell]'),addInChin:!!add&&!card.contains(add),sendGhost:send.hasAttribute('data-cds-ghost'),startInset:composer.dataset.startInset||'none'}})()`,
    );
    if (
      !composition.codeShell ||
      !composition.addInChin ||
      !composition.sendGhost ||
      composition.startInset !== "text"
    )
      throw Error(
        "Code composer assembled incorrectly: " + JSON.stringify(composition),
      );
    report.codeComposer = composition;
    async function type(text) {
      await evaluate(
        `(()=>{const input=document.querySelector('[contenteditable=true]');input.focus();input.select()})()`,
      );
      window.webContents.debugger.attach("1.3");
      try {
        await window.webContents.debugger.sendCommand("Input.insertText", {
          text,
        });
      } finally {
        window.webContents.debugger.detach();
      }
      await pause(160);
    }
    await type("short draft");
    if (
      await evaluate(
        `document.querySelector('[aria-label=Send]').disabled||!!document.querySelector('[data-cds=ChatComposer]').dataset.multiline`,
      )
    )
      throw Error("Short draft should enable Send in one row");
    await shot("claude-code-short");
    await type("Long draft ".repeat(70));
    await until(
      `document.querySelector('[data-cds=ChatComposer]').dataset.multiline==='true'`,
    );
    await shot("claude-code-wrapped");
    await type("第一行\n第二行\n第三行");
    if (
      (await evaluate(
        `document.querySelector('[contenteditable=true]').value`,
      )) !== "第一行\n第二行\n第三行"
    )
      throw Error("Native editor changed multiline input");
    await shot("claude-code-multiline");
    await type("");
    await until(
      `!document.querySelector('[data-cds=ChatComposer]').dataset.multiline`,
    );
    await evaluate(`document.querySelector('[aria-label=Add]').click()`);
    await until(
      `!![...document.querySelectorAll('[role=menu]')].find(n=>n.innerText.includes('Add files or photos')&&getComputedStyle(n).opacity!=='0')`,
    );
    await pause(180);
    await shot("claude-code-add-menu");
    await evaluate(
      `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`,
    );
    await evaluate(`document.querySelector('[aria-label=Model]').click()`);
    await until(
      `!![...document.querySelectorAll('[role=menu]')].find(n=>n.innerText.includes('Model')&&getComputedStyle(n).opacity!=='0')`,
    );
    await pause(180);
    await shot("claude-model-menu");
    await evaluate(
      `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`,
    );
    await evaluate(`document.querySelector('[aria-label=设置]').click()`);
    await until(`!!document.querySelector('.sw-settings-layer')`);
    await shot("claude-independent-settings");
    await evaluate(
      `document.querySelector('[aria-label=返回对话]').click();document.querySelector('.sidebar-logo-button').click()`,
    );
    await until(`!!document.querySelector('.claude-sidebar-row')`);
    if (
      await evaluate(
        `!!document.querySelector('.sidebar-conversation-manager .sidebar-native-row')`,
      )
    )
      throw Error("Claude recent menu reused a Codex row");
    await shot("claude-independent-recent");
    await evaluate(
      `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`,
    );
    await evaluate(`document.querySelector('[data-engine=codex]').click()`);
    await until(
      `document.documentElement.dataset.sidebarProvider==='codex' && !!document.querySelector('.cg-composer')`,
    );
    await shot("codex-after-claude");
    if (runtime.currentTurnId)
      throw Error("UI examples started a real model turn");
    if (process.argv.includes("--real-claude-suite"))
      report.realClaude = await require("./claude-live-test.cjs").run({
        window,
        workspace: runtime.settings.workspace,
        runDir,
      });
    report.ok = true;
  } catch (error) {
    report.errors.push(error.stack || error.message);
    report.rendererErrors = await evaluate(`window.__claudeUiErrors||[]`).catch(
      () => [],
    );
    report.ok = false;
    await capture(window, path.join(runDir, "claude-ui-error.png"));
    console.log("FAIL " + error.message);
  }
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log((report.ok ? "PASS " : "FAIL ") + file);
  return { ...report, reportPath: file };
};
