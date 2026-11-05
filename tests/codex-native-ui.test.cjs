'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(search = '') {
  const React = { createElement: (type, props, ...children) => ({ type, props, children }),
    useCallback: fn => fn, useEffect() {}, useLayoutEffect() {}, useMemo: fn => fn(),
    useRef: value => ({ current: value }), useState: value => [value, () => {}] };
  const window = { __CLAUDIAN_ENABLE_TESTING__: true, location: { search, href: 'file:///sidebar.html' }, addEventListener() {}, removeEventListener() {} };
  window.parent = window;
  window.SidebarProviderStyles={ready:Promise.resolve(),apply(){}};
  const context = { React, ReactDOM: { createRoot: () => ({ render() {} }) }, window,
    document: { documentElement: { dataset: {} }, getElementById: () => ({}) }, URL, URLSearchParams, console, setTimeout, clearTimeout };
  for (const file of ['codex-native-ui.js', 'codex-conversation.js', 'claudian-sidebar-react.js']) vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), context);
  return window;
}
const window = load(), renderer = window.__CLAUDIAN_SIDEBAR_TESTING__;

test('completed proposal retains full content and keeps the native implementation request in the footer', () => {
  const chat=load('?surface=chat'),ui=chat.__CLAUDIAN_SIDEBAR_TESTING__;
  const plan='## 实施步骤\n1. 更新默认名称。\n2. 验证空输入。';
  const tab=ui.applyRuntimeChunksForTesting(ui.createRuntimeTestTab(),[
    {type:'plan_proposal',id:'proposal',plan},{type:'plan_completed',id:'approval'},
  ]);
  const blocks=tab.messages.at(-1).contentBlocks;
  assert.equal(blocks.find(block=>block.type==='plan_approval').plan,plan);
  assert.equal(ui.findActiveInlineInteractionBlock(tab).blockId,'approval');
  assert.equal(blocks.filter(block=>block.type==='plan_proposal').length,1);
  assert.equal(blocks.find(block=>block.type==='plan_proposal').plan,plan);
  const completeOnly=ui.applyRuntimeChunksForTesting(ui.createRuntimeTestTab(),[{type:'plan_completed',plan}]);
  assert.equal(completeOnly.messages.at(-1).contentBlocks.find(block=>block.type==='plan_proposal').plan,plan);
  const empty=ui.applyRuntimeChunksForTesting(ui.createRuntimeTestTab(),[{type:'plan_completed'}]);
  assert.equal(empty.messages.at(-1).contentBlocks.some(block=>block.type==='plan_approval'),false);
});

test('successful output mentioning approval stays completed, actual approval gate stays blocked', () => {
  for (const [content, isError, expected] of [['APPROVAL_UI_OK', false, 'completed'], ['waiting for approval', false, 'blocked'], ['command failed', true, 'error']]) {
    const next = renderer.applyRuntimeChunksForTesting(renderer.createRuntimeTestTab(), [
      { type: 'tool_use', id: 'cmd', name: 'Bash', input: { command: 'Write-Output APPROVAL_UI_OK' } },
      { type: 'tool_result', id: 'cmd', content, isError },
    ]);
    assert.equal(next.messages.at(-1).contentBlocks.find(block=>block.id==='cmd').status, expected);
  }
});

test('streaming plan and full-turn diff replace snapshots instead of duplicating blocks', () => {
  const tab = renderer.createRuntimeTestTab();
  const next = renderer.applyRuntimeChunksForTesting(tab, [
    { type: 'task_plan', id: 'plan-1', steps: [{ step: 'edit', status: 'inProgress' }] },
    { type: 'text', content: 'hello' },
    { type: 'turn_diff', id: 'diff-1', diff: '+old' },
    { type: 'task_plan', id: 'plan-1', steps: [{ step: 'edit', status: 'completed' }] },
    { type: 'turn_diff', id: 'diff-1', diff: '+new' },
    { type: 'text', content: ' world' },
  ]);
  const blocks = next.messages.at(-1).contentBlocks;
  assert.equal(blocks.filter(block => block.type === 'task_plan').length, 1);
  assert.equal(blocks.find(block => block.type === 'task_plan').steps[0].status, 'completed');
  assert.equal(blocks.filter(block => block.type === 'turn_diff').length, 1);
  assert.equal(blocks.find(block => block.type === 'turn_diff').diff, '+new');
  assert.equal(blocks.filter(block => block.type === 'text').map(block => block.content).join(''), 'hello world');
});

test('declined native commands keep their non-executed state in live results and history', () => {
  const next=renderer.applyRuntimeChunksForTesting(renderer.createRuntimeTestTab(),[
    {type:'tool_use',id:'denied',name:'Bash',input:{command:'Write-Output CANCEL_MUST_NOT_EXECUTE'}},
    {type:'tool_result',id:'denied',isError:true,nativeStatus:'declined',content:'rejected by user'},
  ]);
  assert.equal(next.messages.at(-1).contentBlocks.find(block=>block.id==='denied').status,'declined');
  const restored=window.CodexNativeUI.historyMessages({data:[{id:'turn',items:[{id:'denied',type:'commandExecution',status:'declined',command:'Write-Output CANCEL_MUST_NOT_EXECUTE'}]}]});
  assert.equal(restored[0].contentBlocks[0].status,'declined');
});

test('native history restores chronological text, tool output and review result with stable IDs', () => {
  const page = { data: [
    { id: 'new', items: [{ id: 'review', type: 'exitedReviewMode', review: 'empty input fails' }] },
    { id: 'old', items: [{ id: 'u1', type: 'userMessage', content: [{ type: 'text', text: 'read file' }] },
      { id: 'cmd', type: 'commandExecution', command: 'Get-Content file', aggregatedOutput: 'proof', status: 'failed' },
      { id: 'a1', type: 'agentMessage', text: 'done' }] },
  ] };
  const messages = window.CodexNativeUI.historyMessages(page);
  assert.equal(messages[0].role, 'user');
  assert.equal(messages[0].content, 'read file');
  assert.equal(messages[1].contentBlocks[0].result, 'proof');
  assert.equal(messages[1].contentBlocks[0].status, 'error');
  assert.equal(messages.at(-1).content, 'empty input fails');
  assert.equal(JSON.stringify(messages.map(message => message.id)), JSON.stringify(window.CodexNativeUI.historyMessages(page).map(message => message.id)));
});

test('native bridge errors are displayed as errors instead of successful empty history', async () => {
  await assert.rejects(window.CodexNativeUI.request({ codexAction: async () => ({ ok: false, error: 'authentication expired' }) }, { action: 'history' }), /authentication expired/);
});

test('structured review replaces raw JSON while keeping surrounding commentary', () => {
  const review = { findings: [{ title: '[P2] Fix empty values', body: 'NaN' }], overall_explanation: 'A regression exists' };
  const next = renderer.applyRuntimeChunksForTesting(renderer.createRuntimeTestTab(), [
    { type: 'text', content: JSON.stringify(review) },
    { type: 'review_result', id: 'review-1', review },
  ]);
  const blocks = next.messages.at(-1).contentBlocks;
  assert.equal(blocks.filter(block => block.type === 'text').length, 0);
  assert.equal(blocks.filter(block => block.type === 'review_result').length, 1);
  const restored = window.CodexNativeUI.historyMessages({ data: [{ id: 't1', items: [
    { id: 'a1', type: 'agentMessage', text: JSON.stringify(review) },
    { id: 'exit', type: 'exitedReviewMode', review: 'A regression exists' },
  ] }] });
  assert.equal(restored[0].contentBlocks.length, 1);
  assert.equal(restored[0].contentBlocks[0].type, 'review_result');
});

test('persisted native review summary restores one structured finding without the duplicate agent message', () => {
  const text = 'Empty input fails.\n\nReview comment:\n\n- [P2] Restore empty values — D:\\work\\average.cjs:1-2\n  Empty arrays return NaN.';
  const messages = window.CodexNativeUI.historyMessages({ data: [{ id: 't1', items: [
    { id: 'exit', type: 'exitedReviewMode', review: text }, { id: 'final', type: 'agentMessage', text },
  ] }] });
  const blocks = messages[0].contentBlocks;
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].type, 'review_result');
  assert.equal(blocks[0].review.findings[0].code_location.line_range.start, 1);
  assert.equal(blocks[0].review.findings[0].body, 'Empty arrays return NaN.');
});

test('native final plans survive history restoration without reoffering old execution approvals', () => {
  const messages = window.CodexNativeUI.historyMessages({ data: [{ id: 't1', items: [{ id: 'p1', type: 'plan', text: '## Proposal\nDo the work.' }] }] });
  assert.equal(messages[0].contentBlocks[0].type, 'plan_proposal');
  assert.equal(messages[0].contentBlocks[0].plan, '## Proposal\nDo the work.');
});

test('adjacent plan snapshots coalesce to the latest without merging different turns', () => {
  const chunks = renderer.coalesceRuntimeChunks([
    { type: 'plan_proposal', id: 'p1', plan: 'old' }, { type: 'plan_proposal', id: 'p1', plan: 'new' }, { type: 'plan_proposal', id: 'p2', plan: 'other' },
  ]);
  assert.equal(chunks.length, 2); assert.equal(chunks[0].plan, 'new'); assert.equal(chunks[1].plan, 'other');
});

test('native command summaries replace matching orchestration wrappers without hiding unrelated calls', () => {
  const wrapper = { id: 'outer', name: 'exec', status: 'completed', input: { input: 'text(await tools.exec_command({cmd:"Get-Content file.txt"}))' } };
  const native = { id: 'inner', name: 'Bash', input: { command: 'pwsh -Command "Get-Content file.txt"' } };
  const adapters = { workspace: 'D:/work', fileDiffs: () => [] };
  assert.equal(window.CodexSidebarView.visibleActivities([wrapper, native], adapters).length, 1);
  assert.equal(window.CodexSidebarView.visibleActivities([{ ...wrapper, status: 'running' }, native], adapters).length, 1);
  assert.equal(window.CodexSidebarView.visibleActivities([wrapper], adapters).length, 1);
  assert.equal(window.CodexSidebarView.visibleActivities([wrapper, { ...native, input: { command: 'Get-Content other.txt' } }], adapters).length, 2);
});

test('persisted empty patch summaries do not duplicate a detailed patch for the same file', () => {
  const wrapper = { id: 'outer', name: 'exec', status: 'completed', input: { input: 'tools.apply_patch("patch")' } };
  const native = { id: 'inner', name: 'apply_patch', status: 'completed' };
  const adapters = { workspace: 'D:/work', fileDiffs: block => block === wrapper
    ? [{ filePath: 'file.cjs', diffLines: [{ type: 'insert', text: 'new' }] }]
    : [{ filePath: 'D:\\work\\file.cjs' }] };
  const rows = window.CodexSidebarView.visibleActivities([wrapper, native], adapters);
  assert.equal(rows.length, 1); assert.equal(rows[0].id, 'outer');
});

test('mixed patch and command wrappers resolve commands across visual groups in the same turn', () => {
  const wrapper = { id: 'outer', name: 'exec', status: 'completed', input: { input: 'text(await tools.apply_patch("patch")); text(await tools.exec_command({cmd:"node verify.cjs"}))' } };
  const native = { id: 'inner', name: 'apply_patch', status: 'completed' };
  const command = { id: 'shell', name: 'Bash', input: { command: 'pwsh -Command "node verify.cjs"' } };
  const adapters = { workspace: 'D:/work', fileDiffs: b => b === command ? [] : [{ filePath: 'file.cjs', diffLines: [{ type: 'insert', text: 'new' }] }] };
  const allTools = [wrapper, native, command];
  const rows = window.CodexSidebarView.visibleActivities([wrapper, native], adapters, allTools);
  assert.deepEqual(Array.from(rows, r => r.id), ['inner']);
  // A missing native command must not erase the wrapper's otherwise hidden work.
  assert.equal(window.CodexSidebarView.visibleActivities([wrapper, native], adapters).length, 2);
  // Separate native edits, even with the same content, are not collapsed.
  const second = { ...native, id: 'second' };
  assert.deepEqual(Array.from(window.CodexSidebarView.visibleActivities([wrapper, native, second], adapters, allTools), r => r.id), ['inner', 'second']);
});

test('conversation passes command context through the actual activity group renderer', () => {
  const wrapper = { type: 'tool_use', id: 'outer', name: 'exec', status: 'completed', input: { input: 'tools.apply_patch("patch"); tools.exec_command({cmd:"node verify.cjs"})' } };
  const native = { type: 'tool_use', id: 'inner', name: 'apply_patch', status: 'completed' };
  const command = { type: 'tool_use', id: 'shell', name: 'Bash', input: { command: 'node verify.cjs' } };
  const adapters = { workspace: 'D:/work', isInteractiveTool: () => false, fileDiffs: b => b === command ? [] : [{ filePath: 'file.cjs', diffLines: [{ type: 'insert', text: 'new' }] }] };
  const blocks = [wrapper, native, { type: 'text', content: 'Checking now' }, command];
  window.ChatGPTSurface = { Message: 'article' };
  const tree = window.CodexSidebarView.ConversationTurn({ message: { role: 'assistant' }, blocks, adapters });
  const nodes = [];
  function walk(n) { if (Array.isArray(n)) return n.forEach(walk); if (!n || typeof n !== 'object') return; nodes.push(n); walk(n.children); }
  walk(tree);
  const group = nodes.find(n => n.type?.name === 'ActivityGroup');
  assert.equal(group.props.commandBlocks.length, 3);
  nodes.length = 0; walk(group.type(group.props));
  const rows = nodes.filter(n => n.type?.name === 'ActivityRow');
  assert.deepEqual(rows.map(n => n.props.block.id), ['inner']);
});
