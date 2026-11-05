'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {ClaudePlanTracker}=require('../src/claude-plan-tracker.cjs');
test('plan fallback requires a successful plan-file tool from this launch',()=>{
 const root=path.resolve('plans'),t=new ClaudePlanTracker([root]),file=path.join(root,'current.md');
 t.observe('write','Write',{file_path:file});assert.equal(t.filePath,'');
 t.complete('write',true);assert.equal(t.filePath,'');
 t.complete('write',false);assert.equal(t.filePath,file);
 t.observe('write','Write',{file_path:file});assert.equal(t.filePath,file);
 assert.equal(new ClaudePlanTracker([root]).filePath,'');
});
test('plan fallback rejects other files and resets on a new planning cycle',()=>{
 const root=path.resolve('plans'),t=new ClaudePlanTracker([root]);
 for(const[file,name]of [[path.resolve('other.md'),'Write'],[path.join(root,'..','other.md'),'Read'],[path.join(root,'a.json'),'Write'],[path.join(root,'a.md'),'Bash']]){t.observe('bad',name,{file_path:file});t.complete('bad',false);assert.equal(t.filePath,'');}
 t.observe('old','Write',{file_path:path.join(root,'old.md')});t.complete('old',false);
 t.observe('enter','EnterPlanMode',{});assert.equal(t.filePath,'');
 t.complete('old',false);assert.equal(t.filePath,'');
 t.observe('new','Read',{file_path:path.join(root,'new.md')});t.complete('new',false);
 t.observe('enter','EnterPlanMode',{});assert.equal(t.filePath,path.join(root,'new.md'));
});
