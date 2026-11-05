const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const acorn=require('acorn'),postcss=require('postcss'),selectorParser=require('postcss-selector-parser');
const {readInstalledAssets}=require('./read-installed-assets.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'src');
const archive=process.argv.find(s=>s.startsWith('--asar='))?.slice(7)||'C:/Program Files/WindowsApps/OpenAI.Codex_26.1027.3384.0_x64__2p2nqsd0c76g0/app/resources/app.asar';
const assetsDir=process.argv.find(s=>s.startsWith('--assets-dir='))?.slice(13);
const reader=assetsDir?{names:fs.readdirSync(assetsDir),read(name){if(!/^[\w.-]+$/.test(name))throw Error('Invalid asset name');return fs.readFileSync(path.join(assetsDir,name),'utf8')},close(){}}:readInstalledAssets(archive),readAsset=name=>reader.read(name),check=process.argv.includes('--check');
function scoped(selector){const output=[];selectorParser(tree=>tree.each(item=>{const tail=[];while(item.last?.type==='pseudo'&&/^::/.test(item.last.value)){tail.unshift(item.last.toString());item.last.remove();}output.push(':where([data-codex-control-surface]):is('+item.toString()+')'+tail.join(''));output.push(':where([data-codex-control-surface]) :is('+item.toString()+')'+tail.join(''));})).processSync(selector);return output.join(',');}
function write(file,value){if(check){if(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==value.replace(/\r\n/g,'\n'))throw Error('Source snapshot drift: '+path.relative(root,file));}else fs.writeFileSync(file,value);}
const modules=new Map(), records=[];
function mod(file){if(modules.has(file))return modules.get(file);const text=readAsset(file),ast=acorn.parse(text,{ecmaVersion:'latest',sourceType:'module'}),decl=new Map(),assign=new Map();
 for(const n of ast.body){if(n.id)decl.set(n.id.name,n);if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')decl.set(d.id.name,d);}
 // Initializer assignments for native CSS-module constants are at module scope,
 // inside the bundler's initializer function. Local render assignments are ignored.
 function walk(n,render=false){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&n.params.length)render=true;if(!render&&n.type==='AssignmentExpression'&&n.left.type==='Identifier')assign.set(n.left.name,n.right);for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(x=>walk(x,render));else if(v&&typeof v==='object')walk(v,render)}}walk(ast);
 const value={text,ast,decl,assign};modules.set(file,value);return value;}
function literal(file,name){const m=mod(file),node=m.decl.get(name)?.init||m.assign.get(name);if(!node){const imp=m.ast.body.filter(n=>n.type==='ImportDeclaration').flatMap(n=>n.specifiers.map(p=>({p,file:n.source.value.slice(2)}))).find(x=>x.p.local.name===name);if(imp){const module=mod(imp.file),ex=module.ast.body.filter(n=>n.type==='ExportNamedDeclaration').flatMap(n=>n.specifiers).find(p=>p.exported.name===imp.p.imported.name);return literal(imp.file,ex?.local.name||imp.p.imported.name)}throw Error('Missing source constant '+name)};function read(n){if(n.type==='Literal')return n.value;if(n.type==='TemplateLiteral'&&!n.expressions.length)return n.quasis[0].value.cooked;if(n.type==='Identifier')return literal(file,n.name);if(n.type==='BinaryExpression'){const a=read(n.left),b=read(n.right);if(n.operator==='+')return a+b;if(n.operator==='-')return a-b;if(n.operator==='*')return a*b;if(n.operator==='/')return a/b;}if(n.type==='UnaryExpression'&&n.operator==='!')return !read(n.argument);if(n.type==='UnaryExpression'&&n.operator==='-')return -read(n.argument);if(n.type==='ArrayExpression')return n.elements.map(read);if(n.type==='CallExpression'&&n.callee.name==='X')return n.arguments.map(read).join(' ');if(n.type==='MemberExpression')return read(n.object)[n.property.name||n.property.value];if(n.type==='ObjectExpression')return Object.fromEntries(n.properties.map(p=>[p.key?.name||p.key?.value,read(p.value)]));throw Error('Nonliteral source constant '+name+': '+n.type)}return read(node);}
function declaration(file,name){const m=mod(file),node=m.decl.get(name);if(!node||node.type!=='FunctionDeclaration')throw Error('Missing native render '+name);const text=m.text.slice(node.start,node.end);records.push({resource:file,name,start:node.start,end:node.end,sha256:crypto.createHash('sha256').update(text).digest('hex')});return text;}
const primary='app-primary-998934e837fc.js',shared='app-shared-b9a49a97ca55.js',permissions='permissions-mode-dropdown-909131b529ed.js';
const primaryFunctions=['xWr','mWr','PUr','wWr','CWr','SWr','RUr','FUr','LUr','IUr'];
const sharedFunctions=['j3','sxn','Abn','F3','Cxn','Axn','Sxn','uxn','lxn','cxn','oxn','nbn','xBt','r1','M3'];
const maps=Object.fromEntries(['Y8','u5','K8'].map(n=>[n,literal(primary,n)]));
const sharedMaps=Object.fromEntries(['Q3','L3','G3','obn'].map(n=>[n,literal(shared,n)]));
// Import original vector assets and the native Chinese message catalog as data.
const wantedIcons={copy:'square-on-square-light-16',code:'code-light-20',wrap:'text-wrap-light-16',overflow:'text-overflow-light-16',attachment:'paperclip-light-16',terminal:'terminal-light-16',folder:'folder-light-16',plus:'plus-md-light-20',check:'checkmark-md-light-16',down:'chevron-down-sm-light-16',shield:'shield-exclamationmark-light-16'};
const icons={},iconRecords=[];
const nameOf=n=>n?.type==='Literal'?n.value:n?.type==='TemplateLiteral'&&!n.expressions.length?n.quasis[0].value.cooked:undefined;
const property=(node,name)=>node.properties?.find(p=>(p.key?.name||p.key?.value)===name)?.value;
function collect(node){
 if(!node||typeof node!=='object')return;
 if(node.type==='ObjectExpression'){
  const name=nameOf(property(node,'name')),key=Object.keys(wantedIcons).find(k=>wantedIcons[k]===name);
  if(key){const canvas=property(node,'canvas');icons[key]={name,viewBox:nameOf(property(canvas,'viewBox')),width:nameOf(property(canvas,'width')),height:nameOf(property(canvas,'height')),body:nameOf(property(node,'body'))};iconRecords.push({name,start:node.start,end:node.end,sha256:crypto.createHash('sha256').update(mod(shared).text.slice(node.start,node.end)).digest('hex')});}
 }
 for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(collect);else if(value&&typeof value==='object')collect(value);}
}
collect(mod(shared).ast);
for(const key of Object.keys(wantedIcons))if(!icons[key]?.body)throw Error('Pinned vector missing: '+wantedIcons[key]);
write(path.join(out,'codex-icons.source.js'),'/* Original Codex vector data, no app initialization. */\n(function(){const icons='+JSON.stringify(icons)+';function Icon({name,size=16,...props}){const icon=icons[name];if(!icon)return null;return React.createElement("svg",{width:size,height:size,viewBox:icon.viewBox,fill:"currentColor","aria-hidden":true,...props,dangerouslySetInnerHTML:{__html:icon.body}})}window.CodexSourceIcons=Object.freeze({Icon,has:name=>!!icons[name]});})();\n');
const vectorComponents=[];
for(const [name,file]of [['Manual','hand-aa0019f4f694.js'],['FullAccess','shield-exclamation-e04de751c2cb.js']]){
 const source=readAsset(file),ast=acorn.parse(source,{ecmaVersion:'latest',sourceType:'module'});let expression;
 function find(node){if(!node||typeof node!=='object')return;if(node.type==='AssignmentExpression'&&node.left.name==='i'&&node.right.type==='ArrowFunctionExpression')expression=node.right;for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(find);else if(value&&typeof value==='object')find(value)}}find(ast);
 if(!expression)throw Error('Pinned SVG renderer changed: '+file);
 vectorComponents.push('const '+name+'='+source.slice(expression.start,expression.end)+';');iconRecords.push({name,file,sha256:crypto.createHash('sha256').update(source.slice(expression.start,expression.end)).digest('hex')});
}
write(path.join(out,'codex-permission-icons.source.js'),'/* Unchanged native permission SVG render functions. */\n(function(){const r={jsx:(...args)=>window.CodexControlBindings.jsx.jsx(...args),jsxs:(...args)=>window.CodexControlBindings.jsx.jsxs(...args)};'+vectorComponents.join('\n')+'window.CodexPermissionIcons=Object.freeze({Manual,FullAccess});})();\n');
const localeFile='zh-CN-88ebb426d686.js',localeSource=readAsset(localeFile),localeAst=acorn.parse(localeSource,{ecmaVersion:'latest',sourceType:'module'}),messages={};
function locale(node){if(!node||typeof node!=='object')return;if(node.type==='Property'){const key=node.key.value||node.key.name,value=nameOf(node.value);if(typeof key==='string'&&/^(?:composer\.(?:modelPicker|mode\.local\.reasoning|permissionsDropdown)|restricted\.aeon\.messaging\.addAttachments|codeSnippet\.|[Cc]opyButton\.)/.test(key)&&typeof value==='string')messages[key]=value;}for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(locale);else if(value&&typeof value==='object')locale(value);}}
locale(localeAst);
write(path.join(out,'codex-controls.locale.js'),'/* Native Codex zh-CN message data. */\nwindow.CodexControlsMessages=Object.freeze('+JSON.stringify(messages)+');\n');


// Native autocomplete presentation. Keep editor selection/dispatch in the host.
const initial='app-initial-4267e52fe5b0.js';
const suggestionBindings={Msc:'compiler',Nsc:'jsx',q7:'compiler',J7:'jsx',gOc:'compiler',K9:'jsx',Ki:'cx',x:'j3',nre:'L3',qme:'M3',fde:'F3',ls:'unsupportedNativeAsset',mle:'unsupportedNativeAsset'};
const suggestionGlobals=new Set('Array Object Math Set Map String Number Boolean RegExp Symbol Infinity undefined Error Uint8Array Uint16Array Int32Array parseInt'.split(' '));
const suggestionDecls=new Map();
function suggestionSelect(name){
 if(suggestionBindings[name]||suggestionGlobals.has(name)||suggestionDecls.has(name))return;
 const m=mod(initial),node=m.decl.get(name);let raw,start;
 if(node?.type==='FunctionDeclaration'||node?.type==='ClassDeclaration'){raw=m.text.slice(node.start,node.end);start=node.start;}
 else {const expression=node?.init||m.assign.get(name);if(!expression)throw Error('Missing native suggestion binding '+name);raw='var '+name+'='+m.text.slice(expression.start,expression.end)+';';start=expression.start;}
 suggestionDecls.set(name,{raw,start});
 const ast=acorn.parse(raw,{ecmaVersion:'latest',sourceType:'module',ranges:true});
 const free=require('eslint-scope').analyze(ast,{ecmaVersion:2024,sourceType:'module',ignoreEval:true}).globalScope.through;
 for(const ref of free)suggestionSelect(ref.identifier.name);
}
for(const name of ['Asc','jsc','zsc','pOc','mOc','Usc'])suggestionSelect(name);
let suggestionCode='const NativeSuggestion=(()=>{const unsupportedNativeAsset=()=>{throw Error("Native command asset was not bound")};'+Object.entries(suggestionBindings).map(([name,value])=>'const '+name+'='+value+';').join('')+'\n';
for(const[name,{raw,start}]of [...suggestionDecls].sort((a,b)=>a[1].start-b[1].start)){
 records.push({resource:initial,name,start,sha256:crypto.createHash('sha256').update(raw).digest('hex')});suggestionCode+=raw+'\n';
}
suggestionCode+='return {Surface:Asc,Row:jsc,List:zsc,Content:pOc,preventMouseFocus:Usc};})();\n';

let native=`/* Generated from Codex 26.1027.3384.0 compiled presentation.\n * Native render declarations below are unchanged. Host services live in codex-controls-bindings.js. */\n(function(){'use strict';const ResizeObserver=window.SidebarLayoutObserver||window.ResizeObserver;const B=window.CodexControlBindings;const {jsx,compiler,cx,Message,intl}=B;\nconst r5=React,VUr=React,J3=React;const TWr=compiler,vWr=compiler,BUr=compiler,q3=compiler,Mbn=compiler,cbn=compiler;const i5=jsx,n5=jsx,X8=jsx,Y3=jsx,z3=jsx,lbn=jsx;const Zt=()=>intl,$=Message,X=cx,qs=cx;const {Y8,u5,K8,Q3,L3,G3,obn}=${JSON.stringify({...maps,...sharedMaps})};\nconst _xn=()=>null,w0=B.Asset,aD=B.ItemSlot,Z3=({children})=>children;\nconst af=B.Check,Bne=B.Lock,E3=B.ModelLabel,ZUr=({kind,selectedPowerSelection:s})=>kind==='effort'?s.labels?.effort:s.labels?.model;\nconst yWr=React,lCe=()=>null,_Wr=()=>false,gWr=()=>false,hWr=()=>false,Gee=()=>null,Yr=()=>null,fo=B.Chevron,Oa=B.Asset,Yn=B.Chevron,lWr=()=>null,Yxr=()=>null,sie=()=>null,ase=()=>null,ZVr='ComposerNavigation';\nconst C3=B.effortMessages;const zUr=(s)=>[s.labels?.model||s.modelLabel,s.labels?.effort||s.reasoningEffort].filter(Boolean).join(' ');const rle=(values,s,d)=>values[Math.max(0,Math.min(values.length-1,values.findIndex(x=>x.id===s.id)+(d==='decrease'?-1:1)))];const CHr=(props)=>React.createElement(B.PowerSlider,{...props,classes:K8});\n`;
native+='\nconst i1=compiler,a1=jsx,SBt=React,mBt=B.Lock;const {lBt,TBt,CBt,wBt}='+JSON.stringify(Object.fromEntries(['lBt','TBt','CBt','wBt'].map(n=>[n,literal(shared,n)])))+';\n';
native+='const M0=()=>1,V0=React.createContext(null),H3=React.createContext(null),Vbn=()=>({onOpenAutoFocus:()=>{},onCloseAutoFocus:()=>{},onInteractOutside:()=>{}}),xxn=n=>[...n.parentElement.querySelectorAll("[role^=menuitem]")],Rbn=({children})=>children,rD=B.PopupSlot;const X3='+JSON.stringify(literal(shared,'X3'))+';\n';
native+=sharedFunctions.map(n=>declaration(shared,n)).join('\n');
native+='\nconst ua={Item:sxn,SectionLabel:Cxn,Title:Axn,Separator:Sxn};\n';
native+=primaryFunctions.map(n=>declaration(primary,n)).join('\n');
native+=suggestionCode;

const composerNames=literal(initial,'ND');
native+='const NativeComposer=(()=>{const PD=compiler,FD=React,ID=jsx,Ki=cx;const WDn=React.createContext("default"),kD=React.createContext({hasComposerSurface:false,floatingComposerPresentation:null}),LD=React.createContext({});const eie=()=>document.documentElement.dataset.theme==="dark";const Si={DefaultsProvider:({children})=>children};const ND='+JSON.stringify(composerNames)+';const KDn='+JSON.stringify(literal(initial,'KDn'))+';\n';
native+=['gOn','SOn','yOn','GDn'].map(n=>declaration(initial,n)).join('\n');
native+='return {Root:gOn,Footer:SOn,Input:yOn,classes:ND};})();\n';


// Retain the original snippet shell, header, wrap action and asynchronous copy feedback.
// Optional app preview/execution services are not enabled by the CLI renderer.
native+='const NativeCodeButton=r1;const NativeCode=(()=>{const uJn=compiler,Lqn=compiler,dJn=React,O9=React,N9=jsx,k9=jsx,X=cx,Zj=()=>intl,S0=B.useDark,DFn=x=>x;const A9='+JSON.stringify(literal(shared,'A9'))+',Rqn='+JSON.stringify(literal(shared,'Rqn'))+';const r1=NativeCodeButton;';
native+='const icon=(name,size=16)=>props=>jsx.jsx(window.CodexSourceIcons.Icon,{name,size,...props});const f0=icon("wrap"),d0=icon("overflow"),p0=icon("code",20),u0=icon("check"),v0=icon("copy"),Aqn=f0,Dqn=d0,C3=u0,Nqn=v0;const y6=text=>navigator.clipboard.writeText(text),oM=B.Message,jA=B.CodeTooltip,$0=({tooltipContent,children})=>jsx.jsx(B.CodeTooltip,{content:tooltipContent,children});';
native+=['sJn','lJn','Fqn','IJn'].map(n=>declaration(shared,n)).join('\n');
native+='return {Shell:sJn,onCopySelection:IJn,classes:'+JSON.stringify({...literal(shared,'AJn'),CodeBlock:literal(initial,'q2').CodeBlock,MarkdownRoot:literal(initial,'q2').MarkdownRoot})+'};})();\n';

native+=`\nwindow.CodexControlsSource=Object.freeze({Code:NativeCode,Composer:NativeComposer,Suggestion:NativeSuggestion,ModelMenu:xWr,Popup:oxn,Button:r1,Item:sxn,Title:Axn,SectionLabel:Cxn,Separator:Sxn,Surface:j3,maps:{Y8,u5,K8,Q3,L3,G3}});})();\n`;
write(path.join(out,'codex-controls.native.js'),native);
// Copy the permission labels/descriptions from their source render functions.
let permissionCode=`/* Native permission option render functions, unchanged. */\n(function(){const B=window.CodexControlBindings,bn=B.compiler,Q=B.jsx,H=B.Message,Cn='text-warning',gn=()=>null,E=B.cx;const Lt=window.CodexPermissionIcons.Manual,kt=window.CodexPermissionIcons.FullAccess,Nt=B.Lock,Et=B.Lock,Ft=B.Lock,c=B.Lock,le=B.Check,xn={default:(a,b)=>JSON.stringify(a)===JSON.stringify(b)},_n=({disabledReason})=>String(disabledReason||''),y={Item:window.CodexControlsSource.Item};\n`;
permissionCode+=['mn','hn','vn','an','pn'].map(n=>declaration(permissions,n)).join('\n');
permissionCode+='\nwindow.CodexPermissionSource={Label:mn,Description:hn,Option:pn};})();\n';
write(path.join(out,'codex-permissions.native.js'),permissionCode);
// Keep all native utilities needed by retained declarations and their source CSS
// modules. Copy declarations and parent conditions; flatten only CSS layer wrappers.
const nativeText=native+permissionCode+fs.readFileSync(path.join(out,'codex-conversation.js'),'utf8')+fs.readFileSync(path.join(out,'codex-composer-controls.js'),'utf8')+fs.readFileSync(path.join(out,'codex-controls-bindings.js'),'utf8');
// Parse JavaScript literals instead of pairing quotes with a regexp. Native
// matcher code contains quoted delimiters that can otherwise hide later classes.
const classes=new Set();
function collectClasses(node){
 if(!node||typeof node!=='object')return;
 const text=node.type==='Literal'&&typeof node.value==='string'?node.value:node.type==='TemplateElement'?node.value.cooked:null;
 if(text)for(const token of text.split(/\s+/))if(token)classes.add(token);
 for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(collectClasses);else if(value&&typeof value==='object')collectClasses(value)}
}
collectClasses(acorn.parse(nativeText,{ecmaVersion:'latest',sourceType:'script'}));
classes.add("sr-only");
Object.values({...maps,...sharedMaps}).forEach(map=>Object.values(map).forEach(x=>x.split(/\s+/).forEach(c=>classes.add(c))));
const sheets=reader.names.filter(n=>/\.css$/.test(n));
let css=[],preflight=[];
for(const file of sheets){const tree=postcss.parse(readAsset(file));tree.walkRules(r=>{
 let layer=r.parent;while(layer&&layer.type!=='root'&&!(layer.name==='layer'&&layer.params==='base'))layer=layer.parent;
 if(file==='5257da4ba4ae.css'&&layer?.params==='base'){
  // Native ghost buttons depend on preflight's transparent background. Copy
  // source resets before source utilities, scoped to this provider's controls.
  const reset=r.clone();reset.selector=scoped(reset.selector);preflight.push(reset.toString());return;
 }
 let keep=false;selectorParser(selectors=>selectors.walkClasses(node=>{if(classes.has(node.value))keep=true})).processSync(r.selector);if(!keep)return;let node=r.clone();node.selector=scoped(node.selector);let parent=r.parent;while(parent&&parent.type!=='root'){if(parent.name!=='layer')node=postcss.atRule({name:parent.name,params:parent.params,nodes:[node]});parent=parent.parent}css.push(node.toString());});}
// The stylesheet's native surface classes also depend on row geometry tokens.
write(path.join(out,'codex-controls.source.css'),'/* Native Codex control utilities and CSS modules; scoped host boundary. */\n'+[...preflight,...css].join('\n').replace(/(-?(?:[0-9]*\.)?[0-9]+)rem\b/g,(_,n)=>Number(n)*16+'px')+'\n');

const presentationSheets=['b74e19ff7ff4.css','d754c8cd8b21.css'];let presentation=[];
for(const file of presentationSheets){postcss.parse(readAsset(file)).walkRules(r=>{if(!/_(?:[A-Za-z]+_1hyg8_2|[A-Za-z]+_nu8ad_\d+)/.test(r.selector))return;let node=r.clone(),parent=r.parent;while(parent&&parent.type!=='root'){if(parent.name!=='layer')node=postcss.atRule({name:parent.name,params:parent.params,nodes:[node]});parent=parent.parent}presentation.push(node.toString())})}
write(path.join(out,'chatgpt-composer.source.css'),'/* Current installed Codex 26.1027.3384.0 composer and user-message CSS modules. Original declarations and conditions; CSS layer wrappers flattened. */\n'+presentation.join('\n')+'\n');
write(path.join(root,'docs/chatgpt-source-manifest.json'),JSON.stringify({version:'26.1027.3384.0',kind:'installed compiled frontend',resources:presentationSheets.map(name=>({name,sha256:crypto.createHash('sha256').update(readAsset(name)).digest('hex')})),composerClasses:composerNames,components:['gOn','SOn','yOn','GDn'],declarationManifest:'codex-controls-source-manifest.json',adapterBoundaries:['CLI textarea and toolbar slots','body slot and footer slot arrangement','no voice or home expansion service']},null,2)+'\n');

write(path.join(root,'docs/codex-controls-source-manifest.json'),JSON.stringify({version:'26.1027.3384.0',kind:'installed compiled presentation',archive:'OpenAI.Codex_26.1027.3384.0/app/resources/app.asar',declarations:records,vectorAssets:iconRecords,messageCatalog:{file:localeFile,sha256:crypto.createHash('sha256').update(localeSource).digest('hex')},styleResources:sheets.map(f=>({file:f,sha256:crypto.createHash('sha256').update(readAsset(f)).digest('hex')})),adapterBoundaries:['CLI model catalog and permission data','portal positioning, menu keyboard and focus services','Power slider pointer service with native DOM/CSS-module classes','translations and unavailable app-only fast-mode services'],},null,2));
reader.close();console.log(JSON.stringify({verified:check,functions:records.length,cssRules:css.length}));
