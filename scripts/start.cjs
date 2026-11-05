'use strict';
const path = require('node:path');
const { spawn } = require('node:child_process');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.PDF_AI_CLAUDIAN_SETTINGS_PATH;
const child = spawn(require('electron'), [path.join(__dirname, '../standalone/main.cjs'), ...process.argv.slice(2)], {
  cwd: path.join(__dirname, '..'), env, stdio: 'inherit', windowsHide: true,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });

