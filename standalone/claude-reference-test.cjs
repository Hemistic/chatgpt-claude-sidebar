"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  { pathToFileURL } = require("node:url");
const { BrowserWindow } = require("electron");
const capture = require("./capture-ui.cjs");
const selectors = {
  user: ".cds-user-message-body",
  prose: "[data-cds=Prose]",
  composer: "[data-cds=ChatComposer]>div",
  button: "[data-cds=ChatComposer] [data-cds=Button]",
};
const styleExpression = `(() => {const selectors=${JSON.stringify(selectors)},result={};for(const [key,selector] of Object.entries(selectors)){let node=document.querySelector(selector);if(key==='user')node=node?.parentElement.parentElement;if(!node)throw Error('Missing reference node '+key);const s=getComputedStyle(node);result[key]=Object.fromEntries(['color','backgroundColor','fontFamily','fontSize','lineHeight','borderRadius','paddingTop','paddingRight','paddingBottom','paddingLeft'].map(name=>[name,s[name]]));}return result;})()`;
exports.run = async ({ window, runDir }) => {
  const root = path.resolve(__dirname, ".."),
    manifest = require("../docs/claude-ui-source-manifest.json"),
    source = manifest.sourceRoot;
  // Use the installed CSS without selector, layer or token changes as the oracle.
  let css = [
    "shared-frame-DQeP3Fl-.css",
    "shared-styles-rFN8KR6_.css",
    "c6a992d55-BeQte42g.css",
  ]
    .map((file) => fs.readFileSync(path.join(source, file), "utf8"))
    .join("\n");
  for (const item of manifest.inlineStyles)
    css +=
      "\n" +
      require("acorn").parseExpressionAt(
        fs.readFileSync(path.join(source, item.file), "utf8"),
        item.start,
        { ecmaVersion: "latest" },
      ).value;
  css = css.replace(
    /\/assets\/v1\/([^)'"\s]+)/g,
    (_, file) =>
      pathToFileURL(path.join(root, "src/claude-native-assets", file)).href,
  );
  const cssFile = path.join(runDir, "claude-reference.css");
  fs.writeFileSync(cssFile, css);
  const resource = (file) => pathToFileURL(path.join(root, "src", file)).href;
  const html = `<!doctype html><html lang="zh-Hans"><head><meta charset="UTF-8"><link rel="stylesheet" href="${pathToFileURL(cssFile).href}"></head><body style="height:100vh;margin:0"><div id="reference" style="height:100%"></div><script src="${resource("claudian-sidebar-vendor/react.production.min.js")}"></script><script src="${resource("claudian-sidebar-vendor/react-dom.production.min.js")}"></script><script type="module" src="${resource("claude-ui.native.js")}"></script><script src="${resource("claude-editor-bridge.js")}"></script><script src="${resource("claude-code-composer.js")}"></script><script src="${resource("claude-surface.js")}"></script><script type="module">const h=React.createElement,N=window.ClaudeNativeSource,noop=()=>{},models=[{value:"sonnet",label:"Sonnet 5",selected:true}],controls={models,currentModel:"sonnet",permissionMode:"normal",onPermissionMode:noop,onModel:noop,efforts:[],onEffort:noop};const view=ReactDOM.createRoot(document.querySelector("#reference"));window.referenceClicks={send:0,stop:0};window.renderReference=(busy=false,disabled=true)=>view.render(h("div",{className:"cds-root dark bg-page text-primary font-sans h-full epitaxy-root epitaxy-chat-panel @container/tile-slot","data-mode":"dark","data-claude-native":"",lang:"zh-Hans"},h(N.UserMessage,null,"Reference"),h(N.Prose,null,h("p",null,"Reference")),h(window.ClaudeCodeComposer.Footer,{input:h("textarea",{ref:React.createRef(),defaultValue:"",readOnly:!busy&&disabled,"aria-label":"Message"}),tab:{id:"reference",messages:[{}]},busy,disabled,onSend:()=>window.referenceClicks.send++,onCancel:()=>window.referenceClicks.stop++,onAddContext:noop,leading:h(window.ClaudeCodeComposer.Controls,{...controls,slot:"leading"}),trailing:h(window.ClaudeCodeComposer.Controls,{...controls,slot:"trailing"})})));window.renderReference();</script></body></html>`;
  const htmlFile = path.join(runDir, "claude-reference.html");
  fs.writeFileSync(htmlFile, html);
  const reference = new BrowserWindow({
    width: 440,
    height: 760,
    show: false,
    webPreferences: { sandbox: true },
  });
  try {
    await reference.loadFile(htmlFile);
    await reference.webContents.executeJavaScript("document.fonts.ready");
    await new Promise((resolve) => setTimeout(resolve, 150));
    const expected =
      await reference.webContents.executeJavaScript(styleExpression);
    const actual = await window.webContents.executeJavaScript(styleExpression);
    const differences = [];
    for (const [component, styles] of Object.entries(expected))
      for (const [property, value] of Object.entries(styles))
        if (actual[component][property] !== value)
          differences.push({
            component,
            property,
            expected: value,
            actual: actual[component][property],
          });
    await capture(
      reference,
      path.join(runDir, "claude-original-css-reference.png"),
    );
    const report = { expected, actual, differences, ok: !differences.length };
    const evaluate = (code) => reference.webContents.executeJavaScript(code);
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    async function until(code) {
      const end = Date.now() + 10000;
      while (!(await evaluate(code))) {
        if (Date.now() > end)
          throw Error("Code reference controls timed out: " + code);
        await pause(30);
      }
    }
    await evaluate(`window.renderReference(true,false)`);
    await until(`!!document.querySelector('button[aria-label=Stop]')`);
    await pause(160);
    await capture(
      reference,
      path.join(runDir, "claude-code-stop-reference.png"),
    );
    await evaluate(
      `document.querySelector('button[aria-label=Stop]').click();window.renderReference(false,false)`,
    );
    await until(`!!document.querySelector('button[aria-label=Send]')`);
    await evaluate(`document.querySelector('button[aria-label=Send]').click()`);
    if ((await evaluate(`window.referenceClicks.send`)) !== 0)
      throw Error("Code Stop-to-Send guard did not block accidental click");
    await pause(
      await evaluate(`window.ClaudeNativeSource.codeParts.stopGuardMs+80`),
    );
    await evaluate(`document.querySelector('button[aria-label=Send]').click()`);
    report.codeCallbacks = await evaluate(`window.referenceClicks`);
    if (report.codeCallbacks.send !== 1 || report.codeCallbacks.stop !== 1)
      throw Error("Code send/stop callbacks were not wired");
    await capture(
      reference,
      path.join(runDir, "claude-code-send-reference.png"),
    );
    fs.writeFileSync(
      path.join(runDir, "claude-css-parity.json"),
      JSON.stringify(report, null, 2),
    );
    if (differences.length)
      throw Error("Native Claude CSS differs: " + JSON.stringify(differences));
    return report;
  } finally {
    reference.destroy();
  }
};
