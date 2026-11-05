'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { group } = require('../src/sidebar-conversation-data.js');
test('all conversation sources share project groups, stable identities and recent ordering', () => {
  const groups = group({ workspace: 'D:/fallback',
    histories: [{ id: 'local', providerId: 'codex', runtimeThreadId: 'one', title: 'saved', workspace: 'D:/Work/Alpha', lastResponseAt: 1000 },
      { id: 'old', title: 'old unknown', lastResponseAt: 2 }, { id: 'archived', archived: true }],
    native: [{ id: 'one', cwd: 'd:\\work\\alpha\\', name: 'native', updatedAt: 4 },
      { id: 'two', cwd: 'D:/Other/Alpha', name: 'other project', updatedAt: 5 }],
    tabs: [{ id: 'tab', historyId: 'local', providerId: 'codex', runtimeThreadId: 'one', title: 'open', workspace: 'D:/Work/Alpha' }] });
  assert.equal(groups.length, 3);
  assert.equal(groups.reduce((n, p) => n + p.entries.length, 0), 3);
  assert.equal(groups[0].path, 'D:/Other/Alpha');
  const open = groups.flatMap(p => p.entries).find(e => e.key === 'codex:one');
  assert.equal(open.kind, 'tab'); assert.equal(open.title, 'open');
  assert.equal(groups.find(p => !p.path).label, '未归属项目');
});
test('search finds project paths and preserves Linux path case', () => {
  const native = [{ id: 'a', cwd: '/work/Alpha', name: 'one' }, { id: 'b', cwd: '/work/alpha', name: 'two' }];
  assert.equal(group({ native }).length, 2);
  assert.equal(group({ native, query: 'two' })[0].entries[0].item.id, 'b');
  assert.equal(group({ native, query: '/work/alpha' }).length, 2);
  assert.equal(group({ native: [{ id: 'win', cwd: 'D:\\work\\Alpha', name: 'one' }], query: 'D:\\work\\Alpha' })[0].entries[0].item.id, 'win');
});

test('provider menus do not mix native threads or local histories',()=>{
 const inputs={histories:[{id:'c',providerId:'claude',runtimeThreadId:'one',title:'Claude',workspace:'D:/work'},{id:'x',providerId:'codex',runtimeThreadId:'one',title:'Codex',workspace:'D:/work'}],
 tabs:[{id:'openClaude',historyId:'c',runtimeThreadId:'one',title:'Claude open'}],native:[{id:'one',name:'Codex native',cwd:'D:/work'},{id:'two',name:'Codex other',cwd:'D:/other'}]};
 const claude=group({...inputs,providerId:'claude'}).flatMap(g=>g.entries);
 assert.equal(claude.length,1);assert.equal(claude[0].kind,'tab');assert.equal(claude[0].key,'claude:one');
 const codex=group({...inputs,providerId:'codex'}).flatMap(g=>g.entries);
 assert.equal(codex.length,2);assert.ok(codex.every(e=>e.key.startsWith('codex:')));
});
