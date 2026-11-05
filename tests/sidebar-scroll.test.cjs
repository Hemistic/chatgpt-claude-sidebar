const test=require('node:test'),assert=require('node:assert/strict');
const Scroll=require('../src/sidebar-scroll.js');
function surface(){
 const frames=new Map(),events={},observers=[];let id=0;
 class Observer{constructor(callback){this.callback=callback;observers.push(this)}observe(){}unobserve(){}disconnect(){this.disconnected=true}}
 const view={ResizeObserver:Observer,MutationObserver:Observer,requestAnimationFrame:callback=>{frames.set(++id,callback);return id},cancelAnimationFrame:id=>frames.delete(id),getComputedStyle:()=>({overflowY:'auto'})};
 const node={ownerDocument:{defaultView:view},children:[],dataset:{},scrollTop:0,scrollHeight:1000,clientHeight:300,addEventListener:(type,handler)=>events[type]=handler,removeEventListener:type=>delete events[type]};
 return {node,frames,observers,emit:(type,event={})=>events[type]?.({target:node,...event}),paint:()=>{const pending=[...frames.values()];frames.clear();pending.forEach(f=>f())}};
}
test('upward input cancels an already queued follow while output keeps growing',()=>{
 const s=surface(),c=new Scroll(s.node);assert.equal(s.node.scrollTop,700);
 s.node.scrollHeight=1300;c.schedule();s.emit('wheel',{deltaY:-120});s.node.scrollTop=500;s.emit('scroll');s.paint();
 s.node.scrollHeight=1800;s.observers[0].callback();assert.equal(s.node.scrollTop,500);assert.equal(c.following,false);assert.equal(s.node.dataset.autoScroll,'false');
 c.resume();assert.equal(s.node.scrollTop,1500);s.node.scrollHeight=1900;s.observers[0].callback();assert.equal(s.node.scrollTop,1600);c.destroy();
});
test('growing and shrinking output stays settled without cancelling following',()=>{
 const s=surface(),c=new Scroll(s.node);
 for(const height of [1400,1600,1100,900]){s.node.scrollHeight=height;c.flush();s.emit('scroll');assert.equal(c.following,true);assert.equal(s.node.scrollTop,height-300)}c.destroy();
});
test('scrollbar dragging pauses following and reaching bottom alone does not resume it',()=>{
 const s=surface(),c=new Scroll(s.node);s.node.scrollTop=350;s.emit('scroll');assert.equal(c.following,false);
 s.node.scrollTop=700;s.emit('scroll');s.node.scrollHeight=1400;c.flush();assert.equal(s.node.scrollTop,700);assert.equal(c.following,false);c.destroy();
});
test('conversation cleanup cancels writes and restored reading position stays paused',()=>{
 const s=surface(),c=new Scroll(s.node);c.schedule();c.destroy();s.node.scrollTop=80;s.paint();assert.equal(s.node.scrollTop,80);assert.ok(s.observers.every(o=>o.disconnected));
 const restored=new Scroll(s.node,{following:false,top:200});s.node.scrollHeight=2000;restored.flush();assert.equal(s.node.scrollTop,200);restored.destroy();
});
