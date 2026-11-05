"use strict";
const path = require("node:path");
const capture = require("./capture-ui.cjs");

exports.run = async ({ window, runDir }) => {
  const evaluate = (code) => window.webContents.executeJavaScript(code);
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const report = { results: [] };
  async function until(code) {
    const end = Date.now() + 15000;
    while (!(await evaluate(code))) {
      if (Date.now() > end) throw Error("Provider switch timed out: " + code);
      await pause(40);
    }
  }
  const geometry = `(() => Object.fromEntries(['.sidebar-header','.sidebar-header-main','.sidebar-current-title','.sidebar-header-actions','.sidebar-logo-button'].map(selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect(),s=getComputedStyle(n);return [selector,{x:r.x,y:r.y,width:r.width,height:r.height,font:s.font,line:s.lineHeight}]})))()`;
  async function shot(id, proof) {
    const screenshot = path.join(runDir, id + ".png");
    await capture(window, screenshot);
    report.results.push({ id, screenshot, proof });
    console.log("PASS " + id);
  }
  function move(x, y) {
    window.webContents.sendInputEvent({
      type: "mouseMove",
      x: Math.round(x),
      y: Math.round(y),
    });
  }
  async function hover() {
    move(240, 120);
    await pause(40);
    const rect = await evaluate(
      `(() => {const r=document.querySelector('.sidebar-logo-button').getBoundingClientRect();return {x:r.left,y:r.top}})()`,
    );
    move(rect.x + 16, rect.y + 16);
    await until(
      `document.querySelector('.sidebar-provider-switch').dataset.expanded==='true'`,
    );
    // The 4px gap must be part of the hover target so the second icon is reachable.
    move(rect.x + 34, rect.y + 16);
    await pause(30);
    if (
      !(await evaluate(
        `document.querySelector('.sidebar-provider-switch').dataset.expanded==='true'`,
      ))
    )
      throw Error("Crossing the icon gap collapsed the capsule");
    await pause(160);
    return rect;
  }
  async function hoverProvider(id) {
    const rect = await evaluate(
      `(() => {const r=document.querySelector('[data-engine=${id}]').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`,
    );
    move(rect.x, rect.y);
    await until(`document.documentElement.dataset.sidebarProvider==='${id}'`);
    await pause(250);
    if (!(await evaluate(`document.querySelector('.sidebar-provider-switch').dataset.expanded==='true' && !document.querySelector('.sidebar-engine-menu').open`)))
      throw Error("Hover must retain the in-place capsule without opening a menu");
    const layout = await evaluate(`(()=>{const rail=document.querySelector('.sidebar-provider-switch').getBoundingClientRect();return [...document.querySelectorAll('.sidebar-cli-button')].map(n=>{const r=n.getBoundingClientRect();return {engine:n.dataset.engine,x:r.x-rail.x,y:r.y-rail.y,width:r.width,height:r.height,position:getComputedStyle(n).position}})})()`);
    if(layout.some((n,i)=>Math.abs(n.x-i*36)>0.6 || Math.abs(n.y)>0.6 || n.width!==32 || n.height!==32 || n.position!=='absolute'))
      throw Error("Provider logos moved outside their capsule: "+JSON.stringify(layout));
  }
  async function circle(provider) {
    await until(`document.querySelector('.sidebar-provider-switch').dataset.expanded==='false' && parseFloat(getComputedStyle(document.querySelector('.sidebar-provider-switch'),'::before').width)===32`);
    const proof = await evaluate(
      `({expanded:document.querySelector('.sidebar-provider-switch').dataset.expanded,width:parseFloat(getComputedStyle(document.querySelector('.sidebar-provider-switch'),'::before').width),icon:document.querySelector('.sidebar-logo-button svg')?.dataset.provider,buttons:[...document.querySelectorAll('.sidebar-cli-button')].map(n=>({visibility:getComputedStyle(n).visibility,tabIndex:n.tabIndex})),focus:document.activeElement.className})`,
    );
    if (
      proof.expanded !== "false" ||
      proof.width !== 32 ||
      proof.icon !== provider ||
      proof.buttons.some((n) => n.visibility !== "hidden" || n.tabIndex !== -1)
    )
      throw Error(
        "Expected one current-provider circle: " + JSON.stringify(proof),
      );
    return proof;
  }
  for (const width of [320, 440, 1440]) {
    window.setContentSize(width, 760);
    move(240, 120);
    await pause(200);
    await evaluate(
      `document.activeElement.blur();document.querySelector('.sidebar-engine-menu').open=false`,
    );
    await circle("codex");
    const baseline = await evaluate(geometry);
    await shot("switch-codex-circle-" + width, baseline);
    await hover();
    const capsule = await evaluate(
      `({width:parseFloat(getComputedStyle(document.querySelector('.sidebar-provider-switch'),'::before').width),menuOpen:document.querySelector('.sidebar-engine-menu').open,brands:[...document.querySelectorAll('.sidebar-cli-button svg')].map(n=>n.dataset.provider),icons:[...document.querySelectorAll('.sidebar-cli-button')].map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,height:n.getBoundingClientRect().height,visibility:getComputedStyle(n).visibility}))})`,
    );
    if (
      capsule.width !== 68 ||
      capsule.menuOpen ||
      capsule.brands.join(",") !== "codex,claude" ||
      capsule.icons.some((n) => n.visibility !== "visible") ||
      capsule.icons[0].x >= capsule.icons[1].x ||
      capsule.icons.some(n=>Math.abs(n.y-baseline['.sidebar-logo-button'].y)>0.6 || n.height!==32) ||
      capsule.icons[0].x !== baseline['.sidebar-logo-button'].x
    )
      throw Error("Incorrect capsule: " + JSON.stringify(capsule));
    await shot("switch-hover-" + width, capsule);
    await evaluate(
      `(()=>{window.__switchFrames=[];window.__switchRecording=true;const frame=()=>{window.__switchFrames.push(${geometry});if(window.__switchRecording)requestAnimationFrame(frame)};frame()})()`,
    );
    await hoverProvider("claude");
    await until(`!!document.querySelector('[data-cds=ChatComposer]')`);
    await shot("switch-hover-claude-" + width, await evaluate(geometry));
    move(240, 120);
    await pause(200);
    const clicked = await circle("claude");
    await evaluate(
      `window.__switchRecording=false;document.querySelector('.sidebar-logo-button').focus()`,
    );
    await circle("claude");
    const frames = await evaluate(`window.__switchFrames`);
    for (const frame of frames)
      for (const [selector, before] of Object.entries(baseline)) {
        const after = frame[selector];
        for (const key of ["x", "y", "width", "height"])
          if (Math.abs(before[key] - after[key]) > 0.6)
            throw Error(
              "Header moved during provider switch: " +
                JSON.stringify({
                  width,
                  selector,
                  key,
                  before: before[key],
                  after: after[key],
                }),
            );
      // Provider fonts intentionally differ; the shared navigation geometry must not move.
      }
    await shot("switch-claude-circle-" + width, {
      ...clicked,
      framesChecked: frames.length,
    });
    // The current-brand circle still opens recent conversations without switching CLI.
    const current = await evaluate(
      `(()=>{const r=document.querySelector('.sidebar-logo-button').getBoundingClientRect();return {x:Math.round(r.left+16),y:Math.round(r.top+16)}})()`,
    );
    move(current.x, current.y);
    window.webContents.sendInputEvent({
      type: "mouseDown",
      ...current,
      button: "left",
      clickCount: 1,
    });
    window.webContents.sendInputEvent({
      type: "mouseUp",
      ...current,
      button: "left",
      clickCount: 1,
    });
    await until(`!!document.querySelector('.sidebar-conversation-manager')`);
    if (
      !(await evaluate(
        `document.documentElement.dataset.sidebarProvider==='claude'`,
      ))
    )
      throw Error("Opening recent chats switched the CLI");
    await circle("claude");
    await shot("switch-claude-recent-" + width, {});
    await evaluate(
      `document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`,
    );
    await hover();
    // Expanding a Claude circle reveals OpenAI on the left; it must not
    // switch until an actual pointer movement enters that logo.
    if (!(await evaluate(`document.documentElement.dataset.sidebarProvider==='claude'`)))
      throw Error("Expanding the Claude circle unexpectedly switched providers");
    await hoverProvider("codex");
    move(240, 120);
    await pause(180);
    await circle("codex");
    await shot("switch-back-codex-" + width, await evaluate(geometry));
  }
  window.setContentSize(440, 760);
  return { ...report, ok: true };
};
