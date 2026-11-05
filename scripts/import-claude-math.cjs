'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),postcss=require('postcss');
const root=path.resolve(__dirname,'..'),check=process.argv.includes('--check');
const {readAsarDirectory}=require('./read-asar-directory.cjs');
const archive='C:/Program Files/WindowsApps/Claude_4.4212.0.0_x64__pzs8sxrjxfjjc/app/resources/ion-dist.asar';
const source='cf1a02a1a-Bzv8x2Cs.css',reader=readAsarDirectory(archive,['assets','v1']);
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
function write(file,data){const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);if(check){if(!fs.existsSync(file)||!fs.readFileSync(file).equals(bytes))throw Error('Source drift: '+file)}else fs.writeFileSync(file,bytes)}
try{
 const original=reader.read(source),tree=postcss.parse(original.toString('utf8')),assets=new Map(),fonts=[];
 const assetDir=path.join(root,'src/claude-math-assets');if(!check)fs.mkdirSync(assetDir,{recursive:true});
 tree.walkDecls(d=>{
  d.value=d.value.replace(/\bKaTeX_/g,'ClaudeMath_');
  d.value=d.value.replace(/url\(([^)]+)\)/g,(_,url)=>{
   const name=path.basename(url.replace(/["']/g,''));if(!reader.has(name))throw Error('Missing original math asset '+name);
   const bytes=reader.read(name);write(path.join(assetDir,name),bytes);assets.set(name,digest(bytes));return 'url("./claude-math-assets/'+name+'")';
  });
 });
 tree.walkAtRules('font-face',r=>{fonts.push(r.toString());r.remove()});
 write(path.join(root,'src/claude-math.source.css'),'/* Claude 4.4212 original math CSS. Only font names, local URLs and provider scope are adapted. */\n'+fonts.join('\n')+'\n@scope ([data-claude-native]) {\n'+tree.toString()+'\n}\n');
 write(path.join(root,'docs/claude-math-source-manifest.json'),JSON.stringify({version:'4.4212.0.0',source,sha256:digest(original),assets:[...assets].map(([file,sha256])=>({file,sha256})),changes:['Claude-only stylesheet and scope','font family namespace','local asset URLs'],originalDeclarationsRetained:true},null,2));
 console.log(JSON.stringify({verified:check,source,assets:assets.size}));
}finally{reader.close()}
