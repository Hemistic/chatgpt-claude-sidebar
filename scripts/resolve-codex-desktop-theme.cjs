'use strict';
// Run with this repo's Electron. CSS plus isolated pure native color functions.
require('../standalone/process-output.cjs');
const { app, BrowserWindow } = require('electron');
const fs = require('original-fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const archive = 'C:/Program Files/WindowsApps/OpenAI.Codex_26.1023.6621.0_x64__2p2nqsd0c76g0/app/resources/app.asar';
const names = ['app-shared-398c891a59df.css', 'app-initial-161052524772.css', 'app-primary-4ccde6131b6d.css'];

function readStyles() {
  const fd = fs.openSync(archive, 'r');
  try {
    const prefix = Buffer.alloc(16); fs.readSync(fd, prefix, 0, 16, 0);
    const bytes = Buffer.alloc(prefix.readUInt32LE(12)); fs.readSync(fd, bytes, 0, bytes.length, 16);
    const assets = JSON.parse(bytes.toString()).files.webview.files.assets.files;
    const read = name => {
      const entry = assets[name], content = Buffer.alloc(entry.size);
      fs.readSync(fd, content, 0, content.length, 8 + prefix.readUInt32LE(4) + Number(entry.offset));
      return content.toString();
    };
    return { css:names.map(read), theme:read('app-theme-74be6a9cf7df.js'), defaults:read('defaults-930c9f21f410.js') };
  } finally { fs.closeSync(fd); }
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  await window.loadURL('data:text/html,' + encodeURIComponent('<html data-codex-window-type="electron" data-theme="dark"><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'"></head><body></body></html>'));
  const {css,theme,defaults} = readStyles();
  // Only the original pure color functions run in an isolated VM. No app startup,
  // native bridge, filesystem, network, or DOM is exposed to that VM.
  const context = { e:callback=>callback, s:()=>{} };
  context.c=vm.runInNewContext(defaults.slice(defaults.indexOf('var t;'),defaults.indexOf('export{'))+';n();t;',context,{timeout:1000});
  const themeBody=theme.slice(theme.indexOf('function p('),theme.indexOf('export{'));
  const themeVariables=vm.runInNewContext(themeBody+';U();q();p(c.dark,"dark").variables;',context,{timeout:1000});
  const properties = [...new Set([...css.join('\n').matchAll(/--[a-zA-Z0-9_-]+(?=:)/g)].map(match => match[0]))];
  const result = await window.webContents.executeJavaScript(`(() => {
    for (const text of ${JSON.stringify(css)}) { const sheet=new CSSStyleSheet();sheet.replaceSync(text);document.adoptedStyleSheets=[...document.adoptedStyleSheets,sheet]; }
    for(const [name,value] of Object.entries(${JSON.stringify(themeVariables)}))document.documentElement.style.setProperty(name,value);
    const style=getComputedStyle(document.body);
    const tokens=Object.fromEntries(${JSON.stringify(properties)}.map(name=>[name,style.getPropertyValue(name).trim()]).filter(([,value])=>value));
    const probe=document.createElement('div');probe.className='rounded-3xl border border-default bg-surface-elevated-secondary text-default text-size-chat';document.body.append(probe);
    const p=getComputedStyle(probe);
    const surface={background:p.backgroundColor,border:p.border,color:p.color,radius:p.borderRadius,font:p.fontSize};
    return {tokens,surface,rootFont:parseFloat(getComputedStyle(document.documentElement).fontSize)};
  })()`);
  const selected = Object.entries(result.tokens).filter(([name]) => /^--(?:tw-|color-|app-color-|font-|radius-|codex-corner|corner-|text-|spacing|leading|height-token|padding-button|line-height-button)/.test(name));
  const output = '/* Generated from pinned desktop CSS and pure native theme colors.\n * data-codex-window-type=electron, data-theme=dark; no app startup or I/O.\n * Regenerate: electron scripts/resolve-codex-desktop-theme.cjs */\n.cg-request-host {\n'
    + selected.map(([name, value]) => `  ${name}: ${value.replace(/(-?(?:[0-9]*\.)?[0-9]+)rem\b/g, (_, number) => (Number(number) * result.rootFont) + 'px')};`).join('\n') + '\n}\n';
  const classes = [...new Set([...require('./codex-request-utilities.json'), ...require('./codex-approval-native-classes.json'), ...require('./codex-plan-native-classes.json'), ...require('./codex-sidebar-native-classes.json')])];
  const nativeCss = await window.webContents.executeJavaScript(`(() => {
    const names=${JSON.stringify(classes)}.map(name=>'.'+CSS.escape(name));
    const output=[];
    function visit(rules,parents=[]) {
      for(const rule of rules) {
        if(rule.cssText.startsWith('@property --tw-'))output.push(rule.cssText);
        if(rule.selectorText) {
          if(['*, ::after, ::before, ::backdrop', '*, :after, :before, ::backdrop', 'button, input, select, optgroup, textarea', 'button, input:where([type="button"], [type="reset"], [type="submit"])'].includes(rule.selectorText)) {
            output.push(':where([data-codex-request-surface]) :is('+rule.selectorText+'){'+rule.style.cssText+'}');
          }
          if(names.some(name=>rule.selectorText.startsWith(name)&&!/[a-zA-Z0-9_-]/.test(rule.selectorText[name.length]||''))) {
            let value=':where([data-codex-request-surface]) :is('+rule.selectorText+'){'+rule.style.cssText+'}';
            for(const parent of [...parents].reverse())value=parent+'{'+value+'}';
            output.push(value);
          }
        } else if(rule.cssRules) {
          const head=rule.cssText.slice(0,rule.cssText.indexOf('{')).trim();
          visit(rule.cssRules,head.startsWith('@layer')?parents:[...parents,head]);
        }
      }
    }
    for(const sheet of document.adoptedStyleSheets)visit(sheet.cssRules);
    return output.join('\\n');
  })()`);
  fs.writeFileSync(path.join(root,'src/codex-approval.source.css'),'/* Scoped native utilities and registered properties for approval and Plan renderers. */\n'+nativeCss.replace(/(-?(?:[0-9]*\.)?[0-9]+)rem\b/g, (_, number) => (Number(number) * result.rootFont) + 'px')+'\n');
  fs.writeFileSync(path.join(root, 'src/codex-desktop-theme.source.css'), output);
  const layoutNames=['--thread-content-max-width','--thread-body-max-width','--thread-body-inline-padding','--padding-toolbar','--padding-panel','--composer-inline-overhang','--composer-adjacent-max-width','--home-composer-inline-inset'];
  const layout=layoutNames.filter(name=>result.tokens[name]).map(name=>`  ${name}: ${result.tokens[name].replace(/(-?(?:[0-9]*\.)?[0-9]+)rem\b/g,(_,number)=>(Number(number)*result.rootFont)+'px')};`).join('\n');
  fs.writeFileSync(path.join(root,'src/chatgpt-layout.source.css'),'/* Native Electron layout tokens from app-shared-398c891a59df.css.\n * Rem values resolved against the native 16px root, independent of host typography. */\n[data-sidebar-surface="chat"] {\n'+layout+'\n}\n');
  fs.writeFileSync(path.join(root, 'docs/codex-desktop-theme.json'), JSON.stringify({ version: '26.1023.6621.0', resources: [...names,'app-theme-74be6a9cf7df.js','defaults-930c9f21f410.js'], themeFunction:'p(defaults.dark, dark).variables; isolated pure source function', electron: process.versions.electron, chromium: process.versions.chrome, surface: result.surface, tokenCount: selected.length }, null, 2) + '\n');
  console.log(JSON.stringify(result.surface));
  window.destroy(); app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });
