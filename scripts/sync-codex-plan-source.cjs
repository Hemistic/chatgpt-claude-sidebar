'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const archive='C:/Program Files/WindowsApps/OpenAI.Codex_26.1023.6621.0_x64__2p2nqsd0c76g0/app/resources/app.asar';
const fd=fs.openSync(archive,'r');
try {
  const p=Buffer.alloc(16);fs.readSync(fd,p,0,16,0);const b=Buffer.alloc(p.readUInt32LE(12));fs.readSync(fd,b,0,b.length,16);
  const assets=JSON.parse(b).files.webview.files.assets.files;
  const read=name=>{const e=assets[name],data=Buffer.alloc(e.size);fs.readSync(fd,data,0,data.length,8+p.readUInt32LE(4)+Number(e.offset));return data.toString();};
  const between=(source,start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<a)throw Error('Pinned plan source boundary changed: '+start);return source.slice(a,b);};
  const plan=read('plan-summary-item-content-803a407f92a8.js'),surface=read('surface-da1e1a3255b7.js'),pending=read('pending-request-item-panel-2bd2d1fd9204.js');
  const card=between(plan,'function X(','var Ge,Ke,Z,qe,Je;');
  const frame=between(surface,'function p(','function m(');
  const a=pending.indexOf('function Gr('),end=pending.indexOf('function ',a+12);
  if(a<0||end<a)throw Error('Pinned implementation source boundary changed');
  const implementation=pending.slice(a,end);
  const output=`/* Generated from Codex 26.1023.6621.0. Unchanged PlanSummary.X,
 * Surface.p and ImplementPlanRequest.Gr; host services are separate. */
(function(){'use strict';const B=window.CodexPlanBindings,h=React.createElement;
const jsx=(type,props,key)=>{const {children,...rest}=props||{};return h(type,{...rest,...(key==null?{}:{key})},children);};
const memo={c:size=>{const ref=React.useRef(null);if(!ref.current)ref.current=Array(size).fill(Symbol.for('react.memo_cache_sentinel'));return ref.current;}};
const classes=(...values)=>values.flat(Infinity).filter(value=>typeof value==='string'&&value).join(' ');
const Card=(()=>{const Ge=memo,Ke=React,Z={jsx,jsxs:jsx,Fragment:React.Fragment},x=memo,C=Z,c=classes,_=classes;
const fe='host',ye='analytics',Ee='feedback',d=atom=>{React.useContext(B.Context);return atom===fe?'standalone':atom===Ee?false:{};},r=()=>B.intl,l=props=>B.intl.formatMessage(props);
const te=B.Button,b=({children})=>children,g=B.CopyButton,je=B.Markdown,se={div:B.MotionDiv},ne={duration:300/1e3,ease:[.19,1,.22,1]},qe=320,Je='PLAN.md',Fe='data-plan-selection-surface';
const le=props=>jsx(B.Icon,{name:'download',...props}),ee=props=>jsx(B.Icon,{name:'up',...props}),He=ee,ue=props=>jsx(B.Icon,{name:'edit',...props}),ce=null;
const hCopy=text=>navigator.clipboard.writeText(text),h=hCopy,Se=({children})=>children;
${frame}
const Ae=p;
${card}
return X;})();
const Implementation=(()=>{const ri=memo,ii=React,$={jsx,jsxs:jsx,Fragment:React.Fragment},le={},ln={},v={},te={},ue={},U={},Xt='PLEASE IMPLEMENT THIS PLAN:',ai='implement-plan';
const ee=()=>React.useContext(B.Context).store,Bt=()=>({getModeForSelection:mode=>mode,setSelectedMode:()=>{}}),s=()=>B.intl,et=store=>store,rt=()=>{},se=console,zt=B.ImplementationQuestion;
const yn=()=>Promise.reject(Error('No edited plan is registered with this host'));
${implementation}
return Gr;})();
window.CodexNativePlanSource=Object.freeze({Card,Implementation});})();
`;
  const classesOut=[];for(const m of output.matchAll(/\x60([^\x60]+)\x60|"([^"\n]+)"|'([^'\n]+)'/g))for(const token of (m[1]||m[2]||m[3]).split(/\s+/))if(token&&!/[{};=]/.test(token))classesOut.push(token);
  for(const [name,data] of [['src/codex-plan.native.js',output],['scripts/codex-plan-native-classes.json',JSON.stringify([...new Set(classesOut)].sort(),null,2)+'\n']]) {
    const file=path.join(root,name);if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==data)throw Error('Plan render source drift: '+name);}else fs.writeFileSync(file,data);
  }
  console.log('Verified original PlanSummary, Surface and ImplementPlanRequest functions.');
}finally{fs.closeSync(fd);}
