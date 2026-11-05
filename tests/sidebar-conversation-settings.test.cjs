const test=require('node:test'),assert=require('node:assert/strict');
const {runtimeTab,SyncQueue}=require('../src/sidebar-conversation-settings.js');
test('a new effort choice wins over the previous conversation snapshot',()=>{
 const old={id:'a',model:'claude-haiku-5-5',conversationSettings:{effort:'low',permissionMode:'normal'}};
 const next=runtimeTab(old,{effort:'high',theme:'light'});
 assert.equal(next.conversationSettings.effort,'high');assert.equal(old.conversationSettings.effort,'low');
 assert.equal(next.conversationSettings.permissionMode,'normal');assert.equal(next.conversationSettings.theme,undefined);assert.equal(next.model,old.model);
});
test('rapid effort updates reach the runtime in user order',async()=>{
 const applied=[],release=[];
 const queue=new SyncQueue(async value=>{await new Promise(r=>release.push(r));applied.push(value.effort)});
 const first=queue.enqueue({effort:'low'}),second=queue.enqueue({effort:'high'});
 await new Promise(r=>setImmediate(r));assert.equal(release.length,1);
 release.shift()();await first;await new Promise(r=>setImmediate(r));assert.deepEqual(applied,['low']);
 release.shift()();await queue.whenIdle();await second;assert.deepEqual(applied,['low','high']);
});
test('one failed settings update does not discard a later valid choice',async()=>{
 const applied=[];const queue=new SyncQueue(async value=>{if(value==='bad')throw Error('unavailable');applied.push(value)});
 await assert.rejects(queue.enqueue('bad'));await queue.enqueue('high');assert.deepEqual(applied,['high']);
});

const {activate}=require('../src/sidebar-conversation-settings.js');
test('activating a Claude conversation restores its CLI even without a settings snapshot',()=>{
 const global={runtimeMode:'codex',provider:'codex',model:'gpt-6.1-sol',theme:'dark',workspace:'D:/codex'};
 const tab={providerId:'claude',model:'claude-haiku-5-5',workspace:'D:/claude'};
 const restored=activate(global,tab);
 assert.equal(restored.runtimeMode,'claude');assert.equal(restored.provider,'claude');assert.equal(restored.model,tab.model);
 assert.equal(restored.workspace,tab.workspace);assert.equal(global.provider,'codex');
});
test('conversation snapshots cannot restore stale themes or undefined permission defaults',()=>{
 const restored=activate({runtimeMode:'claude',theme:'light',permissionMode:'normal',effort:'high'},
  {providerId:'codex',model:'gpt-6.1-sol',conversationSettings:{theme:'dark',provider:'claude',permissionMode:undefined,effort:'xhigh'}});
 assert.equal(restored.theme,'light');assert.equal(restored.provider,'codex');assert.equal(restored.runtimeMode,'codex');
 assert.equal(restored.permissionMode,'normal');assert.equal(restored.effort,'xhigh');
});
const appearance=require('../src/sidebar-appearance.js');
test('theme choice persists synchronously and survives a new appearance reader',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
 appearance.saveTheme(storage,'dark');assert.equal(appearance.readTheme(storage,'light'),'dark');
 appearance.saveTheme(storage,'light');assert.equal(appearance.readTheme(storage,'dark'),'light');
 assert.equal(appearance.readTheme({getItem(){throw Error('unavailable')}},'dark'),'dark');
});

const {providerTab}=require('../src/sidebar-conversation-settings.js');
test('provider switching restores last visited chat, excluding samples and closed chats',()=>{
 const tabs=[{id:'old',providerId:'claude',lastActivatedAt:2},{id:'used',providerId:'claude',lastActivatedAt:8},{id:'sample',providerId:'claude',lastActivatedAt:99,sampleId:'debug'},{id:'archived',providerId:'claude',lastActivatedAt:100,archived:true},{id:'codex',providerId:'codex',lastActivatedAt:200}];
 assert.equal(providerTab(tabs,'claude').id,'used');
 assert.equal(providerTab(JSON.parse(JSON.stringify(tabs)),'claude').id,'used');
 assert.equal(providerTab(tabs.filter(t=>t.id!=='used'),'claude').id,'old');
 assert.equal(providerTab(tabs,'codex').id,'codex');
 assert.equal(providerTab([],'codex'),null);
});
test('older profiles without visit times retain a stable provider fallback',()=>{
 const tabs=[{id:'one',providerId:'codex'},{id:'two',providerId:'codex',lastActivatedAt:'invalid'}];
 assert.equal(providerTab(tabs,'codex').id,'one');
 assert.deepEqual(tabs,[{id:'one',providerId:'codex'},{id:'two',providerId:'codex',lastActivatedAt:'invalid'}]);
});
