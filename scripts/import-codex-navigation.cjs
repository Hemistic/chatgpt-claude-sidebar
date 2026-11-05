const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const acorn=require('acorn'),postcss=require('postcss'),selectorParser=require('postcss-selector-parser');
const {readInstalledAssets}=require('./read-installed-assets.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'src');
const archive=process.argv.find(s=>s.startsWith('--asar='))?.slice(7)||'C:/Program Files/WindowsApps/OpenAI.Codex_26.1027.6604.0_x64__2p2nqsd0c76g0/app/resources/app.asar';
const assetsDir=process.argv.find(s=>s.startsWith('--assets-dir='))?.slice(13);
const reader=assetsDir?{names:fs.readdirSync(assetsDir),read(name){if(!/^[\w.-]+$/.test(name))throw Error('Invalid asset name');return fs.readFileSync(path.join(assetsDir,name),'utf8')},close(){}}:readInstalledAssets(archive),readAsset=name=>reader.read(name),check=process.argv.includes('--check');
function scoped(selector){const output=[];selectorParser(tree=>tree.each(item=>{const tail=[];while(item.last?.type==='pseudo'&&/^::/.test(item.last.value)){tail.unshift(item.last.toString());item.last.remove();}output.push(':where([data-codex-navigation-source]):is('+item.toString()+')'+tail.join(''));output.push(':where([data-codex-navigation-source]) :is('+item.toString()+')'+tail.join(''));})).processSync(selector);return output.join(',');}
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

const initial='app-initial-fb51ee65d20a.js', primary='app-primary-93b5541c5ac8.js';
const initialNames=['Tja','xja','Cja','dMa','aMa','cMa','sMa','oMa','nMa','Vja','Hja','Uja','Wja'];
const primaryNames=['QAn','ijn','ejn','tjn','njn','rjn'];
const constants=Object.fromEntries(['s$','Jja','Yja','Xja','Zja','Qja','$ja','eMa'].map(n=>[n,literal(initial,n)]));
const source=initialNames.map(n=>declaration(initial,n)).join('\n')+'\n'+primaryNames.map(n=>declaration(primary,n)).join('\n');
const ast=acorn.parse(source,{ecmaVersion:'latest',sourceType:'module',ranges:true});
const free=[...new Set(require('eslint-scope').analyze(ast,{ecmaVersion:2024,sourceType:'module'}).globalScope.through.map(r=>r.identifier.name))];
const aliases={Eja:'compiler',Dja:'jsx',Ui:'cx',fMa:'compiler',pMa:'React',l$:'jsx',lMa:'compiler',c$:'jsx',rMa:'jsx',Gja:'compiler',Kja:'React',qja:'jsx',sK:'compiler',cK:'React',lK:'jsx',tc:'cx',Zt:'()=>B.intl',LFe:'Tja',vde:'nMa',nve:'Vja',FRe:'({children})=>children',J:'()=>null',Ed:'()=>{}',sU:'()=>false',iPe:'()=>null',Axe:'{}',yjn:'16',bjn:'6',xjn:'8',Ont:'{}',cn:'()=>1',Mn:'value=>value',ha:'()=>matchMedia("(prefers-reduced-motion: reduce)").matches',wt:'useEvent',gi:'useMeasure'};
const globals=new Set('React window document HTMLElement Node getComputedStyle Number String Array Object Symbol Math undefined'.split(' '));
const unbound=free.filter(n=>!aliases[n]&&!Object.hasOwn(constants,n)&&!globals.has(n));
// Optional cloud status badges, environment hover cards, and archive services
// are never passed by this CLI navigation adapter. Fail loudly if one is used.
let native='/* Generated unchanged Codex 26.1027.6604.0 navigation render declarations. */\n(function(){"use strict";const B=window.CodexControlBindings,{compiler,jsx,cx}=B;\n';
native+='function useEvent(fn){const ref=React.useRef(fn);ref.current=fn;return React.useCallback((...args)=>ref.current(...args),[])}\n';
native+='function useMeasure(fn){const callback=useEvent(fn),observer=React.useRef(null);React.useEffect(()=>()=>observer.current?.disconnect(),[]);return React.useCallback(node=>{observer.current?.disconnect();if(!node)return;observer.current=new (window.SidebarLayoutObserver||ResizeObserver)(entries=>callback(entries[0],node));observer.current.observe(node);callback(null,node)},[callback])}\n';
native+='const {'+Object.keys(constants).join(',')+'}='+JSON.stringify(constants)+';\n';
native+=Object.entries(aliases).map(([key,value])=>'const '+key+'='+value+';').join('\n')+'\n';
native+=unbound.map(name=>'const '+name+'=()=>{throw Error("Unsupported native navigation service: '+name+'")};').join('\n')+'\n'+source;
native+='\nwindow.CodexNavigationSource=Object.freeze({Project:dMa,Session:QAn,Row:Tja,Title:Vja});})();\n';
write(path.join(out,'codex-navigation.native.js'),native);
const classes=new Set();function collect(n){if(!n||typeof n!=='object')return;const text=n.type==='Literal'&&typeof n.value==='string'?n.value:n.type==='TemplateElement'?n.value.cooked:null;if(text)text.split(/\s+/).forEach(t=>classes.add(t));for(const v of Object.values(n))if(Array.isArray(v))v.forEach(collect);else if(v&&typeof v==='object')collect(v)}
collect(acorn.parse(native,{ecmaVersion:'latest'}));
const css=[];for(const file of reader.names.filter(n=>/\.css$/.test(n))){postcss.parse(readAsset(file)).walkRules(rule=>{let keep=false;selectorParser(tree=>tree.walkClasses(n=>{if(classes.has(n.value))keep=true})).processSync(rule.selector);if(!keep)return;let node=rule.clone();node.selector=scoped(node.selector);let parent=rule.parent;while(parent&&parent.type!=='root'){if(parent.name!=='layer')node=postcss.atRule({name:parent.name,params:parent.params,nodes:[node]});parent=parent.parent}css.push(node.toString())})}
write(path.join(out,'codex-navigation.source.css'),'/* Original Codex navigation CSS, scoped to its own menu. */\n'+css.join('\n').replace(/(-?(?:[0-9]*\.)?[0-9]+)rem\b/g,(_,n)=>Number(n)*16+'px')+'\n');
write(path.join(root,'docs/codex-navigation-source-manifest.json'),JSON.stringify({version:'26.1027.6604.0',declarations:records,unavailableAppServices:unbound,adapterBoundaries:['CLI histories and project grouping','local popup anchor instead of full app sidebar','host ResizeObserver and intl','optional cloud status, hover cards and archive are not enabled']},null,2));
reader.close();console.log(JSON.stringify({declarations:records.length,cssRules:css.length,unbound}));
