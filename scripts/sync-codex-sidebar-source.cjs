'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),archive='C:/Program Files/WindowsApps/OpenAI.Codex_26.1023.6621.0_x64__2p2nqsd0c76g0/app/resources/app.asar';
const fd=fs.openSync(archive,'r');
try {
  const prefix=Buffer.alloc(16);fs.readSync(fd,prefix,0,16,0);const header=Buffer.alloc(prefix.readUInt32LE(12));fs.readSync(fd,header,0,header.length,16);
  const entry=JSON.parse(header).files.webview.files.assets.files['app-primary-83c2b5ae05b6.js'];const data=Buffer.alloc(entry.size);fs.readSync(fd,data,0,data.length,8+prefix.readUInt32LE(4)+Number(entry.offset));const source=data.toString();
  function fragment(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<a)throw Error('Native sidebar boundary changed: '+start);return source.slice(a,b);}
  const row=fragment('function nX(','var Mqn,Nqn;');
  // Cpn is followed by another function; search after its own declaration.
  const pressStart=source.indexOf('function Cpn('),pressEnd=source.indexOf('function ',pressStart+13);
  const output=`/* Generated: unchanged native SidebarRow.nX and selectable-row Cpn.\n * Codex desktop 26.1023.6621.0, app-primary-83c2b5ae05b6.js. */\n(function(){'use strict';const h=React.createElement;const jsx=(type,props,key)=>{const {children,...rest}=props||{};return h(type,{...rest,...(key==null?{}:{key})},children);};const Nqn={jsx,jsxs:jsx,Fragment:React.Fragment};const Mqn={c:size=>{const ref=React.useRef(null);if(!ref.current)ref.current=Array(size).fill(Symbol.for('react.memo_cache_sentinel'));return ref.current;}};const Do=(...values)=>values.flat(Infinity).filter(value=>typeof value==='string'&&value).join(' ');\n${source.slice(pressStart,pressEnd)}\n${row}\nwindow.CodexNativeSidebarSource=Object.freeze({Row:nX});})();\n`;
  const classes=['sidebar-navigation','sidebar-item','flex','h-full','w-full','min-w-0','flex-1','items-center','gap-2','shrink-0','w-4','text-base','leading-5','truncate','ps-4','py-row-y','px-[var(--padding-row-cell-x,var(--padding-row-x))]'];
  for(const m of output.matchAll(/`([^`]+)`|"([^"\n]+)"|'([^'\n]+)'/g))for(const token of (m[1]||m[2]||m[3]).split(/\s+/))if(token&&!/[{};=]/.test(token))classes.push(token);
  for(const [name,value] of [['src/sidebar-row.native.js',output],['scripts/codex-sidebar-native-classes.json',JSON.stringify([...new Set(classes)].sort(),null,2)+'\n']]){const file=path.join(root,name);if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==value)throw Error('Native sidebar source drift: '+name);}else fs.writeFileSync(file,value);}
  console.log('Verified native SidebarRow and keyboard/click selection functions.');
}finally{fs.closeSync(fd);}
