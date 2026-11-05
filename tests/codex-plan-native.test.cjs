'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function load() {
  const store={get:()=>null,removePlanImplementationRequest(){},updateThreadSettingsForNextTurn:async()=>{}};
  const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useRef:value=>({current:value}),useState:value=>[typeof value==='function'?value():value,()=>{}],useContext:()=>({store})};
  const B={Context:{},intl:{formatMessage:message=>message.defaultMessage},Button:'button',CopyButton:'copy',Markdown:'markdown',MotionDiv:'motion',Icon:'icon',ImplementationQuestion:'question'};
  const window={CodexPlanBindings:B};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/codex-plan.native.js'),'utf8'),{React,window,navigator:{clipboard:{writeText:async()=>{}}},console});
  return window.CodexNativePlanSource;
}
function nodes(element) {
  if(!element||typeof element!=='object')return [];
  return [element,...(element.children||[]).flat(Infinity).flatMap(nodes)];
}
test('unchanged native plan renderer binds its imports and retains native collapse controls',()=>{
  const source=load();
  const card=source.Card({item:{content:'# Full plan\n1. Read\n2. Change',completed:true},conversationId:'chat',showOpenButton:false,defaultCollapsed:true});
  const all=nodes(card);
  assert.ok(all.some(node=>node.props['aria-label']==='Expand plan summary'));
  assert.equal(all.find(node=>node.type==='motion').props.animate.height,320);
  assert.ok(all.some(node=>node.type==='markdown'&&node.props.markdown.includes('2. Change')));
});
test('native implementation prompt uses one choice and preserves the original implementation prefix',()=>{
  const source=load(),sent=[];
  const request=source.Implementation({conversationId:'chat',hostId:'standalone',pendingRequest:{turnId:'turn',planContent:'Full plan'},onSubmitLocalFollowup:(...args)=>sent.push(args)});
  assert.equal(request.type,'question');
  assert.equal(request.props.questionAndOptions.length,1);
  assert.equal(request.props.questionAndOptions[0].options[0].id,'implement-plan');
  request.props.onSubmit([{selectedOptionId:'implement-plan',freeformText:null}]);
  assert.equal(sent[0][0],'PLEASE IMPLEMENT THIS PLAN:\nFull plan');
  assert.equal(sent[0][1],'plan_implementation');
});
