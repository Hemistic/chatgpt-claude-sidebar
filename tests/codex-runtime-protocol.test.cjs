'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ClaudianSidebarRuntime, __testing } = require('../src/claudian-sidebar-runtime.js');

test('raw command output retains native declined metadata for cancellation rendering', () => {
  const emitted=[];
  const runtime=Object.assign(Object.create(ClaudianSidebarRuntime.prototype),{rawCompletedCallIds:new Set(),emit:event=>emitted.push(event)});
  runtime.emitStoredRawToolResult('denied',{id:'denied',name:'Bash',content:'rejected by user',isError:true},{method:'item/completed',params:{item:{id:'denied',type:'commandExecution',status:'declined'}}});
  assert.equal(emitted[0].chunk.nativeStatus,'declined');
});

test('reading Codex history from a Claude view preserves the active provider and turn', async () => {
  const calls = [];
  const runtime = Object.assign(Object.create(ClaudianSidebarRuntime.prototype), {
    settings: { provider: 'claude' }, currentTurnId: 'claude-turn', activeSessionKey: 'claude-session',
    readCodexHistory: async payload => { calls.push(payload.action); return { data: [] }; },
    ensureCodex: async () => { throw Error('Must not take the active connection'); },
  });
  for (const action of ['threads', 'history']) assert.equal((await runtime.handleCodexAction({ sender: {} }, { action, threadId: 'history' })).ok, true);
  assert.deepEqual(calls, ['threads', 'history']);
  assert.equal(runtime.settings.provider, 'claude');
  assert.equal(runtime.currentTurnId, 'claude-turn');
  assert.equal(runtime.activeSessionKey, 'claude-session');
  assert.equal((await runtime.handleCodexAction({ sender: {} }, { action: 'archive', threadId: 'history' })).ok, false);
});

test('review from raw response is structured once and native summary is not duplicated', () => {
  const emitted = [];
  const runtime = Object.assign(Object.create(ClaudianSidebarRuntime.prototype), {
    currentTurnId: 'turn-1', reviewTurn: true, currentReviewResult: false,
    currentAssistantSegmentText: '', streamedAssistantTurnText: '', emit: event => emitted.push(event),
  });
  const review = { findings: [{ title: '[P2] Empty array', body: 'NaN' }], overall_explanation: 'Empty input fails' };
  runtime.emitRawAssistantText({ id: 'raw-1', role: 'assistant', type: 'message', content: [{ type: 'output_text', text: JSON.stringify(review) }] });
  runtime.handleItemCompleted({ item: { id: 'exit-1', type: 'exitedReviewMode', review: 'Empty input fails\nReview comment: Empty array' } });
  runtime.emitRawAssistantText({ id: 'summary-1', role: 'assistant', type: 'message', content: [{ type: 'output_text', text: 'Empty input fails' }] });
  runtime.handleEventMsg({ type: 'agent_message', message: JSON.stringify(review) });
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].chunk.type, 'review_result');
  assert.deepEqual(emitted[0].chunk.review, review);
});

test('review JSON deltas are buffered instead of rendered as paragraphs', () => {
  const emitted = [];
  const runtime = Object.assign(Object.create(ClaudianSidebarRuntime.prototype), {
    reviewTurn: true, agentMessageDeltaIds: new Set(), currentAssistantSegmentText: '', streamedAssistantTurnText: '', emit: event => emitted.push(event),
  });
  runtime.dispatchNotification('item/agentMessage/delta', { itemId: 'a1', delta: '{"findings":[' });
  assert.equal(emitted.length, 0);
  assert.equal(runtime.currentAssistantSegmentText, '{"findings":[');
});

test('concurrent native reads wait for one completed initialization', async () => {
  let count = 0, release;
  const barrier = new Promise(resolve => { release = resolve; });
  const runtime = Object.assign(Object.create(ClaudianSidebarRuntime.prototype), { connectCodex: async () => { count++; await barrier; } });
  const pending = [runtime.ensureCodex(), runtime.ensureCodex(), runtime.ensureCodex()];
  assert.equal(count, 1);
  release(); await Promise.all(pending);
  assert.equal(runtime.codexConnecting, null);
});

test('RPC transport keeps server error codes for capability detection', async () => {
  const transport = Object.create(__testing.CodexRpcTransport.prototype);
  let reject;
  const response = new Promise((_, fail) => { reject = fail; });
  transport.pending = new Map([[1, { reject, method: 'new/method' }]]);
  transport.handleResponse(1, { error: { code: -32601, message: 'method missing' } });
  await assert.rejects(response, { code: -32601 });
  assert.equal(transport.pending.size, 0);
});

test('goal mutations resume an unloaded restored session before recording instructions', async () => {
  const calls = [];
  const runtime = Object.assign(Object.create(ClaudianSidebarRuntime.prototype), {
    settings: { provider: 'codex' }, currentTurnId: null, loadedThreadId: null,
    ensureCodex: async () => {}, resumeCodexThread: async id => calls.push(`resume:${id}`),
    resolveCodexRepoTargetRoot: () => 'D:/workspace',
    codexNative: { action: async payload => { calls.push(payload.action); return {}; } },
  });
  assert.equal((await runtime.handleCodexAction({ sender: {} }, { action: 'goalClear', threadId: 'restored' })).ok, true);
  assert.deepEqual(calls, ['resume:restored', 'goalClear']);
  runtime.currentTurnId = 'running-turn'; calls.length = 0;
  assert.equal((await runtime.handleCodexAction({ sender: {} }, { action: 'goalSet', threadId: 'other' })).ok, false);
  assert.equal(calls.length, 0);
});
