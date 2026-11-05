'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ClaudianSidebarRuntime}=require('../src/claudian-sidebar-runtime.js');
function fixture(){
  const events=[],writes=[];
  const runtime=Object.assign(Object.create(ClaudianSidebarRuntime.prototype),{
    settings:{provider:'claude',permissionMode:'plan',claudeSafeMode:'acceptEdits'},
    pendingApprovals:new Map(),pendingClaudeControlRequests:new Map(),
    proc:{stdin:{write:line=>writes.push(JSON.parse(line)),destroyed:false,writableEnded:false}},
    emit:event=>events.push(event),log(){},
  });
  return {runtime,events,writes};
}
test('Claude plan approval leaves plan mode and honors the explicit accept mode',()=>{
  const {runtime}=fixture();
  const control={toolName:'ExitPlanMode',input:{plan:'Read-only plan'}};
  for(const mode of ['default','acceptEdits','bypassPermissions']){
    const response=runtime.buildClaudeControlApprovalResponse(control,{planDecision:{type:'approve',targetMode:mode}});
    assert.equal(response.behavior,'allow');
    assert.equal(response.updatedPermissions[0].mode,mode);
  }
  assert.equal(runtime.buildClaudeControlApprovalResponse(control,{planDecision:{type:'approve'}}).updatedPermissions[0].mode,'acceptEdits');
});
test('Claude plan feedback continues planning while rejection interrupts',()=>{
  const {runtime}=fixture(),control={toolName:'ExitPlanMode',input:{plan:'original'}};
  const feedback=runtime.buildClaudeControlApprovalResponse(control,{planDecision:{type:'feedback',text:'Change only the title'}});
  assert.equal(feedback.behavior,'deny');assert.equal(feedback.interrupt,false);assert.equal(feedback.message,'Change only the title');
  const reject=runtime.buildClaudeControlApprovalResponse(control,{planDecision:{type:'cancel'}});
  assert.equal(reject.behavior,'deny');assert.equal(reject.interrupt,true);
});
test('failed Claude reply delivery retains the approval for retry',async()=>{
  const {runtime,events,writes}=fixture();
  const pending=runtime.requestApproval({kind:'command',title:'Read fixture'}, {source:'claude-control',requestId:'closed-pipe',controlRequest:{toolName:'Read',input:{file_path:'fixture.txt'}}});
  const id=events.find(e=>e.type==='approval').approval.id;
  try{
    runtime.proc.stdin.destroyed=true;
    assert.equal(runtime.handleApprovalResponse({id,decision:'allow'}).ok,false);
    assert.equal(runtime.pendingApprovals.has(id),true);
    assert.equal(events.some(e=>e.type==='approval_resolved'),false);
    runtime.proc.stdin.destroyed=false;
    assert.equal(runtime.handleApprovalResponse({id,decision:'allow'}).ok,true);
    assert.equal(await pending,'allow');
    assert.equal(writes.length,1);assert.equal(writes[0].response.request_id,'closed-pipe');
    assert.equal(runtime.handleApprovalResponse({id,decision:'allow'}).ok,false);
  }finally{for(const item of runtime.pendingApprovals.values())clearTimeout(item.timer);}
});
test('Claude question uses the native question text and option labels in the reply',()=>{
  const {runtime}=fixture();
  const response=runtime.buildClaudeControlApprovalResponse({toolName:'AskUserQuestion',toolUseId:'q-tool',input:{questions:[{question:'保存在哪里？',options:[{label:'保存在本机'}]}]}},{answers:{'保存在哪里？':'保存在本机'}});
  assert.deepEqual(response.updatedInput.answers,{'保存在哪里？':'保存在本机'});
  assert.equal(response.toolUseID,'q-tool');
});

test('accepted Claude plans mirror the CLI permission mode without restarting the turn',async()=>{
  for(const source of ['claude-sdk','claude-control'])for(const mode of ['default','acceptEdits']){
    const {runtime,events,writes}=fixture();
    const proc=runtime.proc;
    const result=runtime.requestApproval({kind:'exit_plan',plan:'Read fixture'},
      {source,requestId:'plan-mode',controlRequest:{toolName:'ExitPlanMode',input:{plan:'Read fixture'}}});
    const id=events.find(e=>e.type==='approval').approval.id;
    const planDecision={type:'approve',targetMode:mode};
    assert.equal(runtime.handleApprovalResponse({id,planDecision}).ok,true);
    assert.deepEqual(await result,{planDecision});
    assert.equal(runtime.settings.claudeSafeMode,mode);
    assert.equal(runtime.settings.permissionMode,'normal');
    assert.equal(runtime.proc,proc);
    if(source==='claude-control')assert.equal(writes[0].response.response.updatedPermissions[0].mode,mode);
  }
});

test('failed plan delivery does not change permission mode and remains retryable',async()=>{
  const {runtime,events}=fixture();
  const result=runtime.requestApproval({kind:'exit_plan',plan:'Read fixture'},
    {source:'claude-control',requestId:'plan-fail',controlRequest:{toolName:'ExitPlanMode',input:{plan:'Read fixture'}}});
  const id=events.find(e=>e.type==='approval').approval.id;
  try{
    runtime.proc.stdin.destroyed=true;
    assert.equal(runtime.handleApprovalResponse({id,planDecision:{type:'approve',targetMode:'default'}}).ok,false);
    assert.equal(runtime.settings.claudeSafeMode,'acceptEdits');
    assert.equal(runtime.settings.permissionMode,'plan');
    assert.ok(runtime.pendingApprovals.has(id));
    runtime.proc.stdin.destroyed=false;
    assert.equal(runtime.handleApprovalResponse({id,planDecision:{type:'cancel'}}).ok,true);
    await result;
    assert.equal(runtime.settings.permissionMode,'plan');
  }finally{for(const item of runtime.pendingApprovals.values())clearTimeout(item.timer);}
});

