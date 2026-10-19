const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHostBridge } = require('../src/claudian-host-bridge');
const { sourcePath } = require('../index.cjs');

test('file iframe RPC, events, source restriction and disposal', async () => {
  const messages = []; let handler; let emit; let called = 0; let removed = 0;
  const child = { postMessage: (message, origin) => { assert.equal(origin, '*'); messages.push(message); } };
  const host = { location: {protocol:'file:',origin:'null'}, document:{querySelector:()=>({contentWindow:child})},
    addEventListener: (_, fn) => {handler=fn;}, removeEventListener:()=>{removed++;} };
  const bridge = createHostBridge({hostWindow:host,sourceSelector:'#ai',api:{getState:()=>{called++;return {ready:true};},onEvent:fn=>{emit=fn;return ()=>removed++;}}});
  const request = {type:'claudian-sidebar:request',payload:{id:'one',method:'getState'}};
  handler({origin:'null',source:{},data:request});
  handler({origin:'https://evil.invalid',source:child,data:request});
  assert.equal(called,0);
  handler({origin:'null',source:child,data:request});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(called,1); assert.equal(messages[0].payload.result.ready,true);
  emit({type:'delta'}); assert.equal(messages.at(-1).type,'claudian-sidebar:event');
  bridge.dispose(); bridge.dispose(); assert.equal(removed,2);
  emit({type:'ignored'}); assert.equal(messages.length,2);
});

test('resources cannot escape package source root', () => {
  assert.match(sourcePath('claudian-sidebar.html'),/claudian-sidebar\.html$/);
  assert.throws(()=>sourcePath('../package.json'));
});
