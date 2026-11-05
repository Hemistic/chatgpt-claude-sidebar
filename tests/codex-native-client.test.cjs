'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CodexNativeClient, reviewTarget, publicAccount } = require('../src/codex-native-client.cjs');

test('recent sidebar can list projects while existing workspace history stays scoped', async () => {
  const calls = [];
  const client = new CodexNativeClient(async (method, params) => { calls.push(params); return { data: [] }; });
  await client.threads({}, 'D:/current');
  await client.threads({ allProjects: true }, 'D:/current');
  assert.equal(calls[0].cwd, 'D:/current');
  assert.equal(calls[1].cwd, null);
});

test('native catalog follows pagination and rejects a repeated cursor', async () => {
  const calls = [];
  const client = new CodexNativeClient(async (method, params) => {
    calls.push({ method, params });
    return params.cursor ? { data: [{ id: 'second' }] } : { data: [{ id: 'first' }], nextCursor: 'page2' };
  });
  assert.deepEqual((await client.models()).map(m => m.id), ['first', 'second']);
  assert.equal(calls[1].params.cursor, 'page2');
  const broken = new CodexNativeClient(async () => ({ data: [], nextCursor: 'same' }));
  await assert.rejects(broken.models(), /repeated/);
});

test('unsupported capabilities are cached without swallowing auth or network failures', async () => {
  let calls = 0;
  const client = new CodexNativeClient(async () => { calls++; throw Object.assign(new Error('missing'), { code: -32601 }); });
  await assert.rejects(client.models(), { code: 'UNSUPPORTED_METHOD' });
  await assert.rejects(client.models(), { code: 'UNSUPPORTED_METHOD' });
  assert.equal(calls, 1);
  const unauthorized = new CodexNativeClient(async () => { throw Object.assign(new Error('unauthorized'), { code: 401 }); });
  await assert.rejects(unauthorized.models(), { code: 401 });
  assert.equal(unauthorized.unsupported.size, 0);
});

test('status strips credentials and preserves independently available account data', async () => {
  const client = new CodexNativeClient(async method => {
    if (method.includes('rateLimits')) throw new Error('limits unavailable');
    return { requiresOpenaiAuth: true, account: { type: 'chatgpt', email: 'test@example.com', planType: 'pro', accessToken: 'secret' }, refreshToken: 'secret' };
  });
  const status = await client.status();
  assert.equal(status.account.account.planType, 'pro');
  assert.equal(JSON.stringify(status).includes('secret'), false);
  assert.deepEqual(status.errors, ['limits unavailable']);
  assert.equal(publicAccount({ account: null }).account, null);
});

test('history requests full paginated items and enforces action and input bounds', async () => {
  const calls = [];
  const client = new CodexNativeClient(async (method, params) => { calls.push({ method, params }); return method === 'thread/read' ? { thread: { id: 't1' } } : { data: [], nextCursor: 'older' }; });
  const result = await client.history({ threadId: 't1', cursor: 'c', limit: 999 });
  assert.equal(result.thread.id, 't1');
  assert.deepEqual(calls[1], { method: 'thread/turns/list', params: { threadId: 't1', cursor: 'c', limit: 100, itemsView: 'full', sortDirection: 'desc' } });
  await assert.rejects(client.action({ action: 'arbitrary/rpc' }), /Unsupported/);
  await assert.rejects(client.history({ threadId: '' }), /threadId/);
});

test('review supports uncommitted, branch, commit and custom targets without shell parsing', () => {
  assert.deepEqual(reviewTarget('/review'), { type: 'uncommittedChanges' });
  assert.deepEqual(reviewTarget('/review --base feature/name'), { type: 'baseBranch', branch: 'feature/name' });
  assert.deepEqual(reviewTarget('/review --commit abc123'), { type: 'commit', sha: 'abc123' });
  assert.deepEqual(reviewTarget('/review 检查边界条件'), { type: 'custom', instructions: '检查边界条件' });
  assert.throws(() => reviewTarget('/review ' + 'a'.repeat(16001)), /instructions/);
});

test('explicit goal actions preserve usage by omitting unchanged objective and token budget', async () => {
  const calls = [];
  const client = new CodexNativeClient(async (method, params) => { calls.push({ method, params }); return {}; });
  await client.action({ action: 'goalSet', threadId: 't1', status: 'paused' });
  assert.deepEqual(calls[0], { method: 'thread/goal/set', params: { threadId: 't1', origin: 'user', status: 'paused' } });
  await client.action({ action: 'goalClear', threadId: 't1' });
  assert.equal(calls[1].method, 'thread/goal/clear');
  await assert.rejects(client.action({ action: 'goalSet', threadId: 't1', status: 'blocked' }), /status/);
  await assert.rejects(client.action({ action: 'goalSet', threadId: 't1', tokenBudget: -1 }), /budget/);
  await assert.rejects(client.action({ action: 'goalSet', threadId: 't1', objective: 'a'.repeat(4001) }), /objective/);
});

test('archived history filter and reversible mutations use native endpoints', async () => {
  const calls = [];
  const client = new CodexNativeClient(async (method, params) => { calls.push({ method, params }); return {}; });
  await client.action({ action: 'threads', archived: true }, 'D:/workspace');
  assert.equal(calls[0].params.archived, true);
  await client.action({ action: 'archive', threadId: 't1' });
  await client.action({ action: 'unarchive', threadId: 't1' });
  assert.deepEqual(calls.slice(1).map(call => call.method), ['thread/archive', 'thread/unarchive']);
});
