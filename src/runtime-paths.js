const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function isPackagedApp() {
	return !!app?.isPackaged;
}

function getProjectRoot() {
	return require('./host-config').getHostConfig().projectRoot;
}

function getPlatformResourceKey() {
	const platform = String(process.platform || '').trim().toLowerCase();
	const arch = String(process.arch || '').trim().toLowerCase();
	return `${platform}-${arch}`;
}

function pathExists(targetPath) {
	try {
		return fs.existsSync(targetPath);
	}
	catch {
		return false;
	}
}

function isFile(targetPath) {
	try {
		return fs.statSync(targetPath).isFile();
	}
	catch {
		return false;
	}
}

function isDirectory(targetPath) {
	try {
		return fs.statSync(targetPath).isDirectory();
	}
	catch {
		return false;
	}
}

function toRelativeDisplayPath(targetPath) {
	const basePath = isPackagedApp() ? process.resourcesPath : getProjectRoot();
	const relativePath = path.relative(basePath, targetPath);
	return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
		? relativePath.replace(/\\/g, '/')
		: targetPath;
}

function createRuntimePathCheck(label, targetPath, kind, required = true, options = {}) {
	const exists = kind === 'file' ? isFile(targetPath) : isDirectory(targetPath);
	return {
		label,
		path: targetPath,
		displayPath: toRelativeDisplayPath(targetPath),
		kind,
		required,
		warnIfMissing: options.warnIfMissing !== false,
		exists,
	};
}

function findClaudeRuntimeAsset(resourceDir, platformKey = getPlatformResourceKey()) {
	const candidates = process.platform === 'win32'
		? [
			'claude.exe',
			`claude-${platformKey}.zst`,
			'claude.exe.zst',
		]
		: [
			'claude',
			`claude-${platformKey}.zst`,
		];
	for (const candidate of candidates) {
		const candidatePath = path.join(resourceDir, candidate);
		if (isFile(candidatePath)) {
			return candidatePath;
		}
	}
	return '';
}

function findCodexRuntimeAsset(resourceDir) {
	const candidates = process.platform === 'win32'
		? [
			'bin/codex.exe',
			'codex.exe',
			'vendor/x86_64-pc-windows-msvc/bin/codex.exe',
			'package/vendor/x86_64-pc-windows-msvc/bin/codex.exe',
		]
		: [
			'bin/codex',
			'codex',
		];
	for (const candidate of candidates) {
		const candidatePath = path.join(resourceDir, candidate);
		if (isFile(candidatePath)) {
			return candidatePath;
		}
	}
	return '';
}

function findCodexCompressedRuntimeAsset(resourceDir) {
	const candidates = process.platform === 'win32'
		? [
			'codex.exe.zst',
			'bin/codex.exe.zst',
			'codex-win32-x64.exe.zst',
			'codex-x86_64-pc-windows-msvc.exe.zst',
		]
		: [
			'codex.zst',
			'bin/codex.zst',
		];
	for (const candidate of candidates) {
		const candidatePath = path.join(resourceDir, candidate);
		if (isFile(candidatePath)) {
			return candidatePath;
		}
	}
	return '';
}

function getGeneratedPlatformDistributionDir() {
	return path.join(require('./host-config').getHostConfig().electronDir, 'build-resources', 'platform-distribution');
}

function getClaudePlatformResourceDir() {
	const platformKey = getPlatformResourceKey();
	if (isPackagedApp()) {
		return path.join(process.resourcesPath, 'claude', platformKey);
	}

	const stagedDir = path.join(getGeneratedPlatformDistributionDir(), 'claude', platformKey);
	if (pathExists(stagedDir)) {
		return stagedDir;
	}

	return path.join(getProjectRoot(), 'claude');
}

function getCodexPlatformResourceDir() {
	const platformKey = getPlatformResourceKey();
	if (isPackagedApp()) {
		return path.join(process.resourcesPath, 'codex', platformKey);
	}

	const stagedDir = path.join(getGeneratedPlatformDistributionDir(), 'codex', platformKey);
	if (pathExists(stagedDir)) {
		return stagedDir;
	}

	return path.join(getProjectRoot(), 'codex', platformKey);
}

function getPdf2zhPlatformHomeDir() {
	const platformKey = getPlatformResourceKey();
	if (isPackagedApp()) {
		return path.join(process.resourcesPath, 'bin', 'pdf2zh', platformKey);
	}

	const stagedDir = path.join(getGeneratedPlatformDistributionDir(), 'bin', 'pdf2zh', platformKey);
	if (pathExists(stagedDir)) {
		return stagedDir;
	}

	return path.join(getProjectRoot(), 'zotero-pdf2zh', 'automation');
}

function getNodePlatformRuntimeDir() {
	const platformKey = getPlatformResourceKey();
	if (isPackagedApp()) {
		return path.join(process.resourcesPath, 'bin', 'node', platformKey);
	}

	const stagedDir = path.join(getGeneratedPlatformDistributionDir(), 'bin', 'node', platformKey);
	if (pathExists(stagedDir)) {
		return stagedDir;
	}

	return '';
}

function getReaderDir() {
	return isPackagedApp()
		? path.join(process.resourcesPath, 'reader')
		: path.join(getProjectRoot(), 'reader', 'build', 'electron');
}

function getExtensionDir() {
	return isPackagedApp()
		? path.join(process.resourcesPath, 'extension')
		: path.join(getProjectRoot(), 'extension');
}

function getPdfWorkerDir() {
	return isPackagedApp()
		? path.join(process.resourcesPath, 'pdf-worker')
		: path.join(getProjectRoot(), 'pdf-worker');
}

function getClaudeBinDir() {
	return getClaudePlatformResourceDir();
}

function getClaudeExecutablePath() {
	return path.join(getClaudeBinDir(), process.platform === 'win32' ? 'claude.exe' : 'claude');
}

function getCodexBinDir() {
	return getCodexPlatformResourceDir();
}

function getCodexExecutablePath() {
	const resourceDir = getCodexBinDir();
	return findCodexRuntimeAsset(resourceDir) || path.join(resourceDir, 'bin', process.platform === 'win32' ? 'codex.exe' : 'codex');
}

function getPdf2zhHomeDir() {
	return getPdf2zhPlatformHomeDir();
}

function getPdf2zhBundleDir() {
	const homeDir = getPdf2zhHomeDir();
	return path.join(homeDir, 'portable_python_bundle');
}

function validateRuntimePaths(options = {}) {
	const strict = options.strict === true || process.env.PDF_AI_STRICT_RUNTIME_PATHS === '1';
	const platformKey = getPlatformResourceKey();
	const readerDir = getReaderDir();
	const pdfWorkerDir = getPdfWorkerDir();
	const claudeDir = getClaudePlatformResourceDir();
	const codexDir = getCodexPlatformResourceDir();
	const pdf2zhHomeDir = getPdf2zhPlatformHomeDir();
	const pdf2zhBundleDir = getPdf2zhBundleDir();
	const nodeRuntimeDir = getNodePlatformRuntimeDir();
	const fallbackNodeRuntimeDir = isPackagedApp()
		? path.join(process.resourcesPath, 'bin', 'node', platformKey)
		: path.join(getGeneratedPlatformDistributionDir(), 'bin', 'node', platformKey);
	const checks = [
		createRuntimePathCheck('reader root', readerDir, 'directory', true),
		createRuntimePathCheck('reader html', path.join(readerDir, 'reader.html'), 'file', true),
		createRuntimePathCheck('reader bundle', path.join(readerDir, 'reader.js'), 'file', true),
		createRuntimePathCheck('reader pdf assets', path.join(readerDir, 'pdf', 'web'), 'directory', true),
		createRuntimePathCheck('pdf-worker root', pdfWorkerDir, 'directory', true),
		createRuntimePathCheck('pdf-worker entry', path.join(pdfWorkerDir, 'src', 'index.js'), 'file', true),
		createRuntimePathCheck('pdf-worker pako', path.join(pdfWorkerDir, 'node_modules', 'pako'), 'directory', true),
		createRuntimePathCheck('pdf-worker levenshtein', path.join(pdfWorkerDir, 'node_modules', 'fastest-levenshtein'), 'directory', true),
		createRuntimePathCheck('pdf.js build', path.join(pdfWorkerDir, 'pdf.js', 'build'), 'directory', true),
		createRuntimePathCheck('Claude resource dir', claudeDir, 'directory', false, { warnIfMissing: process.env.PDF_AI_WARN_LEGACY_CLAUDE_RUNTIME === '1' }),
		createRuntimePathCheck('Codex resource dir', codexDir, 'directory', false, { warnIfMissing: false }),
		createRuntimePathCheck('pdf2zh home', pdf2zhHomeDir, 'directory', isPackagedApp()),
		createRuntimePathCheck('pdf2zh bundle', pdf2zhBundleDir, 'directory', isPackagedApp()),
		createRuntimePathCheck('portable Node runtime', nodeRuntimeDir || fallbackNodeRuntimeDir, 'directory', false, { warnIfMissing: process.env.PDF_AI_WARN_OPTIONAL_NODE_RUNTIME === '1' }),
	];
	const claudeAssetPath = findClaudeRuntimeAsset(claudeDir, platformKey);
	checks.push({
		label: 'Claude runtime asset',
		path: claudeAssetPath || path.join(claudeDir, process.platform === 'win32' ? `claude-${platformKey}.zst` : 'claude'),
		displayPath: toRelativeDisplayPath(claudeAssetPath || path.join(claudeDir, process.platform === 'win32' ? `claude-${platformKey}.zst` : 'claude')),
		kind: 'file',
		required: false,
		warnIfMissing: process.env.PDF_AI_WARN_LEGACY_CLAUDE_RUNTIME === '1',
		exists: !!claudeAssetPath,
	});
	const codexAssetPath = findCodexRuntimeAsset(codexDir) || findCodexCompressedRuntimeAsset(codexDir);
	checks.push({
		label: 'Codex runtime asset',
		path: codexAssetPath || (process.platform === 'win32' ? path.join(codexDir, 'codex.exe.zst') : getCodexExecutablePath()),
		displayPath: toRelativeDisplayPath(codexAssetPath || (process.platform === 'win32' ? path.join(codexDir, 'codex.exe.zst') : getCodexExecutablePath())),
		kind: 'file',
		required: false,
		warnIfMissing: false,
		exists: !!codexAssetPath,
	});

	const errors = [];
	const warnings = [];
	for (const check of checks) {
		if (check.exists) {
			continue;
		}
		const message = `${check.label} missing: ${check.displayPath}`;
		if (check.required) {
			errors.push(message);
		}
		else if (check.warnIfMissing !== false) {
			warnings.push(message);
		}
	}

	for (const resourceDir of [claudeDir, codexDir, pdf2zhHomeDir]) {
		const markerPath = path.join(resourceDir, 'RESOURCE_REQUIRED.txt');
		if (isFile(markerPath)) {
			const message = `placeholder runtime resource present: ${toRelativeDisplayPath(markerPath)}`;
			if (isPackagedApp()) {
				errors.push(message);
			}
			else {
				warnings.push(message);
			}
		}
	}

	const result = {
		ok: errors.length === 0,
		strict,
		platformKey,
		packaged: isPackagedApp(),
		errors,
		warnings,
		checks,
	};
	if (strict && errors.length) {
		const error = new Error(`Runtime path validation failed:\n- ${errors.join('\n- ')}`);
		error.validation = result;
		throw error;
	}
	return result;
}

module.exports = {
	findCodexCompressedRuntimeAsset,
	findCodexRuntimeAsset,
	getClaudePlatformResourceDir,
	getClaudeBinDir,
	getClaudeExecutablePath,
	getCodexPlatformResourceDir,
	getCodexBinDir,
	getCodexExecutablePath,
	getExtensionDir,
	getGeneratedPlatformDistributionDir,
	getNodePlatformRuntimeDir,
	getPdf2zhPlatformHomeDir,
	getPdf2zhBundleDir,
	getPdf2zhHomeDir,
	getPdfWorkerDir,
	getPlatformResourceKey,
	getReaderDir,
	isPackagedApp,
	validateRuntimePaths,
};
