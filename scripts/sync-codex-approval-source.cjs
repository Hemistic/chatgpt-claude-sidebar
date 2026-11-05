'use strict';
// Keep shipped render functions byte-for-byte, with independent host bindings.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const archive = process.argv.find(arg=>arg.startsWith('--asar='))?.slice(7) || 'C:/Program Files/WindowsApps/OpenAI.Codex_26.1023.6621.0_x64__2p2nqsd0c76g0/app/resources/app.asar';
const fd = fs.openSync(archive, 'r');
try {
  const prefix=Buffer.alloc(16); fs.readSync(fd,prefix,0,16,0);
  const bytes=Buffer.alloc(prefix.readUInt32LE(12)); fs.readSync(fd,bytes,0,bytes.length,16);
  const assets=JSON.parse(bytes.toString()).files.webview.files.assets.files;
  function read(name) {
    const entry=assets[name]; if(!entry)throw Error('Pinned resource missing: '+name);
    const data=Buffer.alloc(entry.size); fs.readSync(fd,data,0,data.length,8+prefix.readUInt32LE(4)+Number(entry.offset)); return data.toString();
  }
  function fragment(source,start,end) {
    const a=source.indexOf(start),b=source.indexOf(end,a);
    if(a<0||b<a)throw Error('Pinned render boundary changed: '+start);
    return source.slice(a,b);
  }
  const shared=read('app-shared-3b88f728481f.js');
  const approval=read('composer-approval-request-card-46be6498d172.js');
  const file=path.join(root,'src/codex-approval.native.js');
  let output=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
  for(const [name,original] of [
    ['fRt',fragment(shared,'function fRt(','var b1,pRt,x1,mRt,hRt,gRt;')],
    ['R',fragment(approval,'function R(','var z,B;')],
    ['sFn',fragment(shared,'function sFn(','var lFn,uFn,l7;')],
  ]) {
    const pattern=new RegExp('^function '+name+'\\(.*$','m');
    if(!pattern.test(output))throw Error('Local snapshot boundary missing: '+name);
    if(process.argv.includes('--check') && output.match(pattern)[0]!==original)throw Error('Render source drift: '+name);
    output=output.replace(pattern,()=>original);
  }
  const classes=[];
  for(const match of output.matchAll(/`([^`]+)`|"([^"\n]+)"|'([^'\n]+)'/g)) {
    for(const token of (match[1]||match[2]||match[3]).split(/\s+/))if(token&&!/[{};=]/.test(token))classes.push(token);
  }
  const classFile=path.join(root,'scripts/codex-approval-native-classes.json');
  const classOutput=JSON.stringify([...new Set(classes)].sort(),null,2)+'\n';
  if(process.argv.includes('--check')) {
    if(fs.readFileSync(classFile,'utf8').replace(/\r\n/g,'\n')!==classOutput)throw Error('Native utility manifest drift');
  } else { fs.writeFileSync(file,output);fs.writeFileSync(classFile,classOutput); }
  console.log('Verified native ApprovalCard, BaseButton and CompoundButton render functions (26.1023.6621.0).');
} finally { fs.closeSync(fd); }
