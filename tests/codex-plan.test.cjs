'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CodexPlan, proposedPlan } = require('../src/codex-plan.cjs');
const { ClaudianSidebarRuntime, __testing } = require('../src/claudian-sidebar-runtime.js');

test('completed native plan replaces deltas; failed and interrupted turns offer no execution', () => {
  const plan = new CodexPlan(true);
  plan.delta('draft'); plan.capture('Final specification', true); plan.delta('stale');
  assert.equal(plan.completed('completed'), 'Final specification');
  assert.equal(plan.completed('failed'), ''); assert.equal(plan.completed('interrupted'), '');
  plan.capture('<proposed_plan>stale raw text</proposed_plan>');
  assert.equal(plan.text, 'Final specification');
});
test('tagged compatibility proposals require plan mode and a closing tag', () => {
  assert.equal(proposedPlan('<proposed_plan>draft'), null);
  assert.equal(new CodexPlan().capture('<proposed_plan>example</proposed_plan>'), false);
  const plan = new CodexPlan(true);
  assert.equal(plan.capture('Before\n<proposed_plan>\n## Plan\nDo it.\n</proposed_plan>\nAfter'), true);
  assert.equal(plan.text, '## Plan\nDo it.');
});
test('native completed plan is accepted even if the server emitted no deltas', () => {
  const events = [];
  const runtime = Object.assign(Object.create(ClaudianSidebarRuntime.prototype), { codexPlan: new CodexPlan(true), currentTurnId: 't1', emit: event => events.push(event) });
  runtime.handleItemCompleted({ item: { type: 'plan', id: 'p1', text: 'Full final plan' } });
  assert.equal(runtime.codexPlan.completed('completed'), 'Full final plan');
  assert.equal(events[0].chunk.type, 'plan_proposal');
});
test('planning uses read-only sandbox with no privilege escalation', () => {
  const policy = __testing.resolveSandboxConfig({ permissionMode: 'plan', sandbox: 'workspace-write' });
  assert.equal(policy.sandboxPolicy.type, 'readOnly'); assert.equal(policy.approvalPolicy, 'never');
});
