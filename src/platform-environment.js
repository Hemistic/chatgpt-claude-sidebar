'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// Finder launches do not inherit the user's terminal PATH. Keep discovery
// deterministic and avoid executing shell startup files inside the desktop app.
function getUnixBinDirectories(env = process.env, home = os.homedir()) {
	const dirs = [path.join(home, '.local', 'bin'), path.join(home, '.cargo', 'bin'),
		path.join(home, '.volta', 'bin'), path.join(home, '.pyenv', 'shims'),
		'/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin'];
	for (const [root, suffix] of [
		[path.join(home, '.nvm', 'versions', 'node'), 'bin'],
		['/Library/Frameworks/Python.framework/Versions', 'bin'],
	]) {
		try {
			for (const entry of fs.readdirSync(root, { withFileTypes: true })
				.filter(item => item.isDirectory()).sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }))) {
				dirs.push(path.join(root, entry.name, suffix));
			}
		} catch { /* Optional installation location. */ }
	}
	if (env.VIRTUAL_ENV) dirs.unshift(path.join(env.VIRTUAL_ENV, 'bin'));
	if (env.CONDA_PREFIX) dirs.unshift(path.join(env.CONDA_PREFIX, 'bin'));
	return [...new Set(dirs)].filter(dir => fs.existsSync(dir));
}

function activatePlatformEnvironment(env = process.env, platform = process.platform) {
	if (platform === 'win32') return env;
	const current = String(env.PATH || '').split(path.delimiter).filter(Boolean);
	env.PATH = [...new Set([...current, ...getUnixBinDirectories(env)])].join(path.delimiter);
	return env;
}

function unixExecutableCandidates(name, env = process.env) {
	return getUnixBinDirectories(env).map(dir => path.join(dir, name))
		.filter(file => { try { fs.accessSync(file, fs.constants.X_OK); return fs.statSync(file).isFile(); } catch { return false; } });
}

module.exports = { getUnixBinDirectories, activatePlatformEnvironment, unixExecutableCandidates };
