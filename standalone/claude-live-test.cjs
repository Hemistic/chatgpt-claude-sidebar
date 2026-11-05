"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const capture = require("./capture-ui.cjs");
const argument=name=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3);

exports.run = async ({ window, workspace, runDir }) => {
  const policy={model:argument('test-model'),effort:argument('test-effort')};
  if(!policy.model||!policy.effort)throw Error('Supply --test-model and --test-effort for the real CLI test.');
  const label=policy.model.replace(/^claude-(haiku|sonnet|opus)-(.+)$/i,(_,name,version)=>name[0].toUpperCase()+name.slice(1)+' '+version.replace(/-/g,'.'));
  const evaluate = (code) => window.webContents.executeJavaScript(code);
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function until(code, timeout = 20000) {
    const end = Date.now() + timeout;
    while (!(await evaluate(code))) {
      if (Date.now() > end) throw Error("Real Claude UI timeout: " + code);
      await pause(100);
    }
  }
  const marker = `CLAUDE_NATIVE_UI_${randomUUID()}`;
  const fixture = path.join(workspace, "native-ui-read.txt");
  fs.writeFileSync(fixture, marker);
  const resultFile = path.join(runDir, "claude-live.json");
  let report;
  try {
    await until(`!!document.querySelector('[data-engine=claude]')`);
    await evaluate(`document.querySelector('[data-engine=claude]').click()`);
    await until(`document.documentElement.dataset.sidebarProvider==='claude'`);
    await evaluate(`window.claudianSidebar.updateSettings({provider:'claude',model:${JSON.stringify(policy.model)},effort:${JSON.stringify(policy.effort)},claudeCustomModels:${JSON.stringify(policy.model)}})`);
    await pause(700);
    await evaluate(`document.querySelector('[aria-label=Model]').click()`);
    await until(`!![...document.querySelectorAll('[role=menuitemradio],[role=menuitem]')].find(n=>n.innerText.includes(${JSON.stringify(label)}))`);
    await evaluate(`[...document.querySelectorAll('[role=menuitemradio],[role=menuitem]')].find(n=>n.innerText.includes(${JSON.stringify(label)})).click()`);
    await pause(300);
    await evaluate(`document.querySelector('[aria-label=新对话]').click()`);
    await until(
      `!!document.querySelector('[data-cds=ChatComposer] [contenteditable=true]')`,
    );
    await evaluate(
      `window.__claudeLive={events:[],text:'',tools:[],usage:[],errors:[],done:false};window.__claudeLiveUnsubscribe=window.claudianSidebar.onEvent(e=>{const s=window.__claudeLive;s.events.push(e.type);if(e.type==='chunk'){if(e.chunk.type==='text')s.text+=e.chunk.content||'';if(e.chunk.type==='tool_use')s.tools.push(e.chunk.name);if(e.chunk.type==='usage')s.usage.push(e.chunk.usage);}if(e.type==='error')s.errors.push(e.content||e.message);if(e.type==='done')s.done=true;});document.querySelector('[data-cds=ChatComposer] [contenteditable=true]').focus()`,
    );
    window.webContents.debugger.attach("1.3");
    try {
      // Exercise Chromium editing and the contenteditable bridge, not a direct backend call.
      await window.webContents.debugger.sendCommand("Input.insertText", {
        text: "第一行\n第二行",
      });
      const text = await evaluate(
        `document.querySelector('[contenteditable=true]').value`,
      );
      if (text !== "第一行\n第二行")
        throw Error("Multiline editor changed text: " + JSON.stringify(text));
      await capture(window, path.join(runDir, "claude-live-multiline.png"));
      await evaluate(
        `const input=document.querySelector('[contenteditable=true]');input.focus();input.select()`,
      );
      const prompt = `Read-only integration test: use your Read tool to read exactly ${fixture}. Reply with the exact file content and one short Chinese sentence explaining that you read it. Do not edit files or use shell commands or network.`;
      await window.webContents.debugger.sendCommand("Input.insertText", {
        text: prompt,
      });
      await pause(150);
      await evaluate(
        `document.querySelector('[data-cds=ChatComposer] button[aria-label=Send]').click()`,
      );
    } finally {
      window.webContents.debugger.detach();
    }
    await until(
      `window.__claudeLive.done||window.__claudeLive.errors.length`,
      180000,
    );
    await pause(600);
    report = { ...(await evaluate(`window.__claudeLive`)), requiredConfiguration:policy };
    report.fixtureUnchanged = fs.readFileSync(fixture, "utf8") === marker;
    report.rendered = await evaluate(
      `!![...document.querySelectorAll('.epitaxy-markdown,[data-cds=Prose]')].find(n=>n.innerText.includes(${JSON.stringify(marker)})) || [...document.querySelectorAll('.epitaxy-codeblock *')].some(n=>n.shadowRoot?.textContent.includes(${JSON.stringify(marker)}))`,
    );
    report.ok =
      report.done &&
      !report.errors.length &&
      report.text.includes(marker) &&
      report.tools.length > 0 &&
      report.rendered &&
      report.fixtureUnchanged;
    await capture(window, path.join(runDir, "claude-live-response.png"));
    fs.writeFileSync(resultFile, JSON.stringify(report, null, 2));
    if (!report.ok)
      throw Error("Real Claude UI failed: " + JSON.stringify(report));
    console.log("PASS real Claude CLI → Read → native renderer");
    return report;
  } catch (error) {
    report = {
      ...(await evaluate(`window.__claudeLive||{}`)),
      ok: false,
      requiredConfiguration:policy,
      error: error.stack || error.message,
    };
    fs.writeFileSync(resultFile, JSON.stringify(report, null, 2));
    await capture(window, path.join(runDir, "claude-live-error.png"));
    throw error;
  } finally {
    await evaluate(`window.__claudeLiveUnsubscribe?.();undefined`);
  }
};
