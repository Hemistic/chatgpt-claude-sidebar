'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

test('closing a GUI launcher output pipe does not crash the standalone process', async () => {
  const helper = path.resolve(__dirname, '../standalone/process-output.cjs');
  const child = spawn(process.execPath, ['-e', `require(${JSON.stringify(helper)});setTimeout(()=>{process.stdout.write('diagnostic');setTimeout(()=>process.stderr.write('still-running'),50)},100);`], { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.destroy();
  let stderr = '';
  child.stderr.on('data', data => { stderr += data; });
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  assert.equal(code, 0);
  assert.equal(stderr, 'still-running');
});
