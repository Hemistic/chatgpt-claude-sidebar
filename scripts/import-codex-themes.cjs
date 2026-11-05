// Read the installed archive as bytes rather than Electron ASAR virtual paths.
process.noAsar=true;
require('../standalone/process-output.cjs');
const {app,BrowserWindow}=require('electron');
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const {readInstalledAssets}=require('./read-installed-assets.cjs');
const archive=process.argv.find(s=>s.startsWith('--asar='))?.slice(7)||'C:/Program Files/WindowsApps/OpenAI.Codex_26.1027.3384.0_x64__2p2nqsd0c76g0/app/resources/app.asar';
const reader=readInstalledAssets(archive),check=process.argv.includes('--check');
function write(file,value){if(check){if(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==value.replace(/\r\n/g,'\n'))throw Error('Native theme drift: '+file);}else fs.writeFileSync(file,value);}

app.whenReady().then(async()=>{
 const w=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,nodeIntegration:false}});
 await w.loadURL('data:text/html,'+encodeURIComponent('<html data-codex-window-type="electron" data-theme="dark"><head></head><body></body></html>'));
 const sheets=['5257da4ba4ae.css','b74e19ff7ff4.css','5c5c6535635b.css'];
 await w.webContents.executeJavaScript(`(()=>{for(const css of ${JSON.stringify(sheets.map(f=>reader.read(f)))}){const s=new CSSStyleSheet();s.replaceSync(css);document.adoptedStyleSheets=[...document.adoptedStyleSheets,s]}})()`);
 const theme=reader.read('app-theme-98273c284c4e.js');
 const vars=vm.runInNewContext(theme.slice(theme.indexOf('var d;'),theme.indexOf('export{'))+';f();W();J();({light:p(d.light,"light").variables,dark:p(d.dark,"dark").variables});',{e:callback=>callback},{timeout:1000});
 const names=[...new Set(sheets.flatMap(f=>[...reader.read(f).matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map(m=>m[1])))];
 const themes={};let output='/* Codex native light/dark CSS cascade and p(defaults, variant).variables. Generated without application services. */\n';
 for(const variant of ['light','dark']){
   themes[variant]=await w.webContents.executeJavaScript(`(()=>{document.documentElement.dataset.theme=${JSON.stringify(variant)};document.documentElement.style.cssText='';for(const [k,v]of Object.entries(${JSON.stringify(vars[variant])}))document.documentElement.style.setProperty(k,v);const s=getComputedStyle(document.documentElement);return Object.fromEntries(${JSON.stringify(names)}.map(k=>[k,s.getPropertyValue(k).trim()]).filter(([k,v])=>v&&/^--(?:color-|app-color-|font-|radius-|text-|spacing|leading|height-token|padding-|line-height-|shadow-|dropdown-|app-menu-|icon-|container-)/.test(k)));})()`);
   output+=`[data-sidebar-provider="codex"][data-theme="${variant}"],\n[data-sidebar-provider="codex"][data-theme="${variant}"] :is(body,[data-sidebar-surface="chat"],.cg-request-host) {\n`+Object.entries(themes[variant]).map(([k,v])=>`  ${k}: ${v.replace(/(-?(?:[0-9]*\.)?[0-9]+)rem\b/g,(_,n)=>Number(n)*16+'px')};`).join('\n')+'\n}\n';
 }
 write(path.join(root,'src/codex-themes.source.css'),output);
 write(path.join(root,'docs/codex-themes-source.json'),JSON.stringify({version:'26.1027.3384.0',resources:[...sheets,'app-theme-98273c284c4e.js'],tokens:themes},null,2));
 console.log(JSON.stringify(Object.fromEntries(Object.entries(themes).map(([k,v])=>[k,{count:Object.keys(v).length,text:v['--color-text'],surface:v['--color-surface'],elevated:v['--color-surface-elevated-secondary']}]))));reader.close();w.destroy();app.exit(0);
}).catch(e=>{console.error(e);app.exit(1)});
