'use strict';
const fs=require('fs'),path=require('path'),postcss=require('postcss'),crypto=require('crypto');
const repo=path.resolve(__dirname,'..');
const check=process.argv.includes('--check');
function write(file,value){
 if(check){const expected=Buffer.isBuffer(value)?value:Buffer.from(value);if(!fs.existsSync(file)||!fs.readFileSync(file).equals(expected))throw Error('Source snapshot drift: '+path.relative(repo,file));}
 else fs.writeFileSync(file,value);
}

const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const {readAsarDirectory}=require('./read-asar-directory.cjs');
const reader=readAsarDirectory('C:/Program Files/WindowsApps/Claude_4.4212.0.0_x64__pzs8sxrjxfjjc/app/resources/ion-dist.asar',['assets','v1']);
const manifest=JSON.parse(fs.readFileSync(path.join(repo,'docs/claude-controls-source-manifest.json'),'utf8'));
const sheets=['shared-frame-CegduNQ2.css','shared-styles-BawOO5XW.css','c6a992d55-DOxJvg9D.css'];let css=sheets.map(n=>reader.read(n).toString('utf8')).join('\n');
const acorn=require('acorn');for(const {file}of manifest.resources){const s=reader.read(file).toString('utf8'),ast=acorn.parse(s,{ecmaVersion:'latest',sourceType:'module'});for(const n of ast.body){const c=n.type==='ExpressionStatement'&&n.expression;if(c?.type==='CallExpression'&&s.slice(c.callee.start,c.callee.end).includes('data-inline-css')){const value=c.arguments[1];if(typeof value?.value==='string')css+='\n'+value.value;}}}
const fonts=[],properties=[],tree=postcss.parse(css);
tree.walkAtRules('layer',r=>r.nodes?r.replaceWith(...r.nodes):r.remove());
tree.walkAtRules('import',r=>r.remove());
tree.walkAtRules('font-face',r=>{fonts.push(r);r.remove()});tree.walkAtRules('property',r=>{properties.push(r);r.remove()});
const assetDir=path.join(repo,'src/claude-control-assets');if(!check)fs.mkdirSync(assetDir,{recursive:true});const assetHashes=new Map();
function assets(value){return value.replace(/url\((['"]?)([^)'"\s]+)\1\)/g,(all,q,url)=>{if(url.startsWith('data:'))return all;const file=path.basename(url.split(/[?#]/)[0]),from=file;if(!reader.has(from))return all;const data=reader.read(from);write(path.join(assetDir,file),data);assetHashes.set(file,sha(data));return 'url("./claude-control-assets/'+file+'")'})}
const fontNames=new Map();for(const r of fonts)r.walkDecls('font-family',d=>fontNames.set(d.value,d.value.replace(/(['"]?)$/,' Controls$1')));
for(const root of [tree,...fonts,...properties])root.walkDecls(d=>{d.value=assets(d.value);for(const [old,name]of fontNames)if(d.prop==='font-family'||d.prop.startsWith('--'))d.value=d.value.replaceAll(old,name);d.value=d.value.replace(/(-?(?:[0-9]*\.)?[0-9]+)rem\b/g,(_,n)=>Number(n)*16+'px')});
tree.walkRules(r=>{if(r.parent.type==='atrule'&&/keyframes$/.test(r.parent.name))return;r.selector=r.selector.replace(/:root|:host|(?<![\w-])html(?![\w-])|(?<![\w-])body(?![\w-])/g,':scope')});
write(path.join(repo,'src/claude-controls.source.css'),'/* Original Claude 4.4212 styles; scope is limited to imported controls. Fonts are namespaced; font files and declarations retain their source. */\n'+fonts.concat(properties).map(r=>r.toString()).join('\n')+'\n@scope ([data-claude-controls-source]) {\n'+tree.toString()+'\n}\n');console.log(JSON.stringify({cssBytes:css.length,fonts:fonts.length,properties:properties.length}));

write(path.join(repo,'docs/claude-controls-style-manifest.json'),JSON.stringify({version:'4.4212.0.0',styles:sheets.map(file=>({file,sha256:sha(reader.read(file))})),assets:[...assetHashes].map(([file,sha256])=>({file,sha256})),changes:['controls-only CSS scope','rem units resolved against the source 16px root','font family namespace; original font bytes retained'],inlineStylesFrom:'claude-controls-source-manifest.json'},null,2));
reader.close();
