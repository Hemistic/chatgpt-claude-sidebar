const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawn, spawnSync } = require('child_process');
const { createHash, randomUUID } = require('crypto');
const { fileURLToPath, pathToFileURL } = require('url');
const { app, dialog, net, shell } = require('electron');
const tar = require('tar');
const { decompressZstd } = require('./zstd');
const { EnvironmentManager } = require('./environment-manager');
const { activatePlatformEnvironment, unixExecutableCandidates } = require('./platform-environment');
activatePlatformEnvironment();
const {
	findCodexCompressedRuntimeAsset,
	findCodexRuntimeAsset,
	getClaudePlatformResourceDir,
	getCodexPlatformResourceDir,
	getPlatformResourceKey,
} = require('./runtime-paths');
const originalShared = require('./claudian-original-shared');
const { getHostConfig } = require('./host-config');

const IPC = {
	getState: 'claudian-sidebar:get-state',
	getDiagnostics: 'claudian-sidebar:get-diagnostics',
	environment: 'claudian-sidebar:environment',
	updateSettings: 'claudian-sidebar:update-settings',
	saveMcpServers: 'claudian-sidebar:save-mcp-servers',
	testMcpServer: 'claudian-sidebar:test-mcp-server',
	loadProviderAssets: 'claudian-sidebar:load-provider-assets',
	saveProviderAssets: 'claudian-sidebar:save-provider-assets',
	generateTitle: 'claudian-sidebar:generate-title',
	cancelTitleGeneration: 'claudian-sidebar:cancel-title-generation',
	startInstructionRefine: 'claudian-sidebar:start-instruction-refine',
	continueInstructionRefine: 'claudian-sidebar:continue-instruction-refine',
	cancelInstructionRefine: 'claudian-sidebar:cancel-instruction-refine',
	startInlineEdit: 'claudian-sidebar:start-inline-edit',
	continueInlineEdit: 'claudian-sidebar:continue-inline-edit',
	cancelInlineEdit: 'claudian-sidebar:cancel-inline-edit',
	rewindClaudeFiles: 'claudian-sidebar:rewind-claude-files',
	runBangBash: 'claudian-sidebar:run-bang-bash',
	startTurn: 'claudian-sidebar:start-turn',
	steerTurn: 'claudian-sidebar:steer-turn',
	cancelTurn: 'claudian-sidebar:cancel-turn',
	startMarkdownNoteAi: 'claudian-sidebar:start-markdown-note-ai',
	cancelMarkdownNoteAi: 'claudian-sidebar:cancel-markdown-note-ai',
	markdownNoteAiEvent: 'claudian-sidebar:markdown-note-ai-event',
	respondApproval: 'claudian-sidebar:respond-approval',
	pickWorkspace: 'claudian-sidebar:pick-workspace',
	openLogFolder: 'claudian-sidebar:open-log-folder',
	openPath: 'claudian-sidebar:open-path',
	getMineruWorkspaceTrees: 'claudian-sidebar:get-mineru-workspace-trees',
	log: 'claudian-sidebar:log',
	event: 'claudian-sidebar:event',
};
let activeRuntimeIpcOwner = null;
const RUNTIME_IPC_ENTRY_URLS = new Set([
	pathToFileURL(path.join(getHostConfig().electronDir, 'shell.html')).toString(),
	pathToFileURL(path.join(getHostConfig().electronDir, 'claudian-sidebar.html')).toString(),
	pathToFileURL(path.join(getHostConfig().electronDir, 'claudian-sidebar-embed-host.html')).toString(),
	// The standalone Markdown editor owns its own window but uses the same
	// ephemeral Markdown AI runtime as the full workspace.
	pathToFileURL(path.join(getHostConfig().electronDir, 'markdown-snapshot.html')).toString(),
]);

function normalizeRuntimeIpcEntryUrl(value) {
	const text = String(value || '').trim();
	if (!text) {
		return '';
	}
	try {
		const parsed = new URL(text);
		parsed.search = '';
		parsed.hash = '';
		return parsed.toString();
	}
	catch {
		return text;
	}
}

function isAllowedRuntimeIpcEvent(event, allowedEntryUrls = RUNTIME_IPC_ENTRY_URLS) {
	if (!event || !event.sender) {
		return false;
	}
	if (event.senderFrame && event.sender.mainFrame && event.senderFrame !== event.sender.mainFrame) {
		return false;
	}
	const frameUrl = normalizeRuntimeIpcEntryUrl(event.senderFrame?.url || event.sender.getURL?.() || '');
	return allowedEntryUrls.has(frameUrl);
}

function assertAllowedRuntimeIpcEvent(event, channel, allowedEntryUrls) {
	if (!isAllowedRuntimeIpcEvent(event, allowedEntryUrls)) {
		throw new Error(`Blocked AI sidebar IPC from unauthorized frame: ${channel || 'unknown'}`);
	}
}

function readJsonIfPresentSafe(filePath) {
	try {
		const raw = readTextFileLimited(filePath, SETTINGS_JSON_MAX_BYTES);
		return raw === null ? null : JSON.parse(raw);
	}
	catch {
		return null;
	}
}

function getManagedClaudeInstallDir() {
	const userDataDir = app?.getPath?.('userData') || path.join(os.homedir(), '.pdf-ai-reader');
	return path.join(userDataDir, 'tools', 'claude', getPlatformResourceKey());
}

function getManagedCodexInstallDir() {
	const userDataDir = app?.getPath?.('userData') || path.join(os.homedir(), '.pdf-ai-reader');
	return path.join(userDataDir, 'tools', 'codex', getPlatformResourceKey());
}

function getBundledClaudeCompressedPath(resourceDir) {
	if (!resourceDir || !fs.existsSync(resourceDir)) {
		return '';
	}
	return [
		path.join(resourceDir, 'claude-win32-x64.zst'),
		path.join(resourceDir, 'claude.exe.zst'),
	].find((candidate) => fs.existsSync(candidate)) || '';
}

function getBundledCodexCompressedPath(resourceDir) {
	if (!resourceDir || !fs.existsSync(resourceDir)) {
		return '';
	}
	return findCodexCompressedRuntimeAsset(resourceDir);
}

function getManagedCodexPaths() {
	const installDir = getManagedCodexInstallDir();
	const executableName = process.platform === 'win32' ? 'codex.exe' : 'codex';
	return {
		installDir,
		targetExecutable: path.join(installDir, 'bin', executableName),
		stampPath: path.join(installDir, '.codex-resource-stamp.json'),
	};
}

function getCodexRuntimeBundleInfo() {
	const resourceDir = getCodexPlatformResourceDir();
	const bundledExecutable = resourceDir && fs.existsSync(resourceDir)
		? findCodexRuntimeAsset(resourceDir)
		: '';
	const compressedPath = resourceDir && fs.existsSync(resourceDir)
		? getBundledCodexCompressedPath(resourceDir)
		: '';
	const managedPaths = getManagedCodexPaths();
	return {
		platformKey: getPlatformResourceKey(),
		resourceDir,
		bundledExecutable,
		compressedPath,
		managedInstallDir: managedPaths.installDir,
		managedExecutable: managedPaths.targetExecutable,
		hasResourceDir: Boolean(resourceDir && fs.existsSync(resourceDir)),
		hasBundledExecutable: Boolean(bundledExecutable && fs.existsSync(bundledExecutable)),
		hasCompressedResource: Boolean(compressedPath && fs.existsSync(compressedPath)),
		hasBundledRuntime: Boolean(
			(bundledExecutable && fs.existsSync(bundledExecutable))
			|| (compressedPath && fs.existsSync(compressedPath)),
		),
		hasManagedExecutable: Boolean(managedPaths.targetExecutable && fs.existsSync(managedPaths.targetExecutable)),
	};
}

function getClaudeRuntimeBundleInfo() {
	const resourceDir = getClaudePlatformResourceDir();
	const compressedPath = getBundledClaudeCompressedPath(resourceDir);
	const managedPaths = getManagedClaudePaths();
	return {
		platformKey: getPlatformResourceKey(),
		resourceDir,
		compressedPath,
		managedInstallDir: managedPaths.installDir,
		managedExecutable: managedPaths.targetExecutable,
		hasResourceDir: Boolean(resourceDir && fs.existsSync(resourceDir)),
		hasCompressedResource: Boolean(compressedPath && fs.existsSync(compressedPath)),
		hasManagedExecutable: Boolean(managedPaths.targetExecutable && fs.existsSync(managedPaths.targetExecutable)),
	};
}

function normalizeComparablePath(value) {
	const resolved = path.resolve(String(value || ''));
	return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function isPathInsideOrSamePath(targetPath, parentPath) {
	if (!targetPath || !parentPath) {
		return false;
	}
	const target = normalizeComparablePath(targetPath);
	const parent = normalizeComparablePath(parentPath);
	return target === parent || target.startsWith(`${parent}${path.sep}`);
}

function assertPathInsideOrSamePath(targetPath, parentPath, label = 'path') {
	if (!isPathInsideOrSamePath(targetPath, parentPath)) {
		throw new Error(`Refusing to access ${label} outside managed directory: ${targetPath}`);
	}
	return path.resolve(String(targetPath || ''));
}

function getManagedClaudePaths() {
	const installDir = getManagedClaudeInstallDir();
	fs.mkdirSync(installDir, { recursive: true });
	return {
		installDir,
		targetExecutable: path.join(installDir, 'claude.exe'),
		stampPath: path.join(installDir, '.claude-resource-stamp.json'),
	};
}

function getManagedClaudeExpectedStamp(compressedPath) {
	if (!compressedPath || !fs.existsSync(compressedPath)) {
		return null;
	}
	const sourceStat = fs.statSync(compressedPath);
	if (!sourceStat.isFile() || sourceStat.size > MANAGED_CLAUDE_COMPRESSED_MAX_BYTES) {
		return null;
	}
	return {
		sourcePath: compressedPath,
		size: sourceStat.size,
		mtimeMs: Math.round(sourceStat.mtimeMs),
	};
}

function isManagedClaudeStampCurrent(currentStamp, expectedStamp) {
	return Boolean(
		currentStamp
		&& expectedStamp
		&& currentStamp.sourcePath === expectedStamp.sourcePath
		&& currentStamp.size === expectedStamp.size
		&& currentStamp.mtimeMs === expectedStamp.mtimeMs
	);
}

function extractManagedClaudeExecutable(compressedPath) {
	const expectedStamp = getManagedClaudeExpectedStamp(compressedPath);
	if (!expectedStamp) {
		return '';
	}
	const { targetExecutable, stampPath } = getManagedClaudePaths();
	const tempExecutable = `${targetExecutable}.tmp-${process.pid}-${Date.now()}`;
	try {
		const executableBuffer = decompressZstd(fs.readFileSync(compressedPath));
		fs.writeFileSync(tempExecutable, executableBuffer);
		fs.renameSync(tempExecutable, targetExecutable);
		fs.writeFileSync(stampPath, `${JSON.stringify(expectedStamp, null, 2)}\n`, 'utf8');
		return targetExecutable;
	}
	finally {
		if (fs.existsSync(tempExecutable)) {
			try {
				fs.rmSync(tempExecutable, { force: true });
			}
			catch {
				// Best-effort cleanup only.
			}
		}
	}
}

function resolveBundledClaudeExecutable() {
	const resourceDir = getClaudePlatformResourceDir();
	if (!resourceDir || !fs.existsSync(resourceDir)) {
		return '';
	}
	if (process.platform === 'win32') {
		const fallbackExecutable = path.join(getHostConfig().projectRoot, 'claude', 'claude.exe');
		if (!app?.isPackaged) {
			if (fs.existsSync(fallbackExecutable)) {
				return fallbackExecutable;
			}
			const stagedExecutable = path.join(resourceDir, 'claude.exe');
			return fs.existsSync(stagedExecutable) ? stagedExecutable : '';
		}
		const compressedPath = getBundledClaudeCompressedPath(resourceDir);
		if (!compressedPath) {
			return '';
		}
		const { targetExecutable, stampPath } = getManagedClaudePaths();
		const expectedStamp = getManagedClaudeExpectedStamp(compressedPath);
		const currentStamp = readJsonIfPresentSafe(stampPath);
		if (fs.existsSync(targetExecutable) && isManagedClaudeStampCurrent(currentStamp, expectedStamp)) {
			return targetExecutable;
		}
		return extractManagedClaudeExecutable(compressedPath);
	}
	const unixExecutable = path.join(resourceDir, 'claude');
	if (!fs.existsSync(unixExecutable)) {
		return '';
	}
	try {
		fs.chmodSync(unixExecutable, 0o755);
	}
	catch {
	}
	return unixExecutable;
}

function resolveExplicitClaudeCodeExecutable() {
	const explicitCandidates = [
		process.env.CLAUDE_CODE_NATIVE_EXE,
		process.env.CLAUDE_CODE_EXECUTABLE,
		process.env.CLAUDE_CODE_PATH,
	];
	for (const candidate of explicitCandidates) {
		const normalized = String(candidate || '').trim();
		const launchable = resolveWindowsLaunchableCommand(normalized);
		if (launchable && !/\.zst$/iu.test(launchable) && fs.existsSync(launchable)) {
			return path.resolve(launchable);
		}
	}
	return '';
}

function resolveInstalledClaudeCodeExecutable() {
	if (process.platform === 'win32') {
		const localAppData = String(process.env.LOCALAPPDATA || '').trim();
		const programFiles = String(process.env.ProgramFiles || '').trim();
		const programFilesX86 = String(process.env['ProgramFiles(x86)'] || '').trim();
		const commonCandidates = [
			localAppData && path.join(localAppData, 'Programs', 'Claude', 'claudecode.exe'),
			localAppData && path.join(localAppData, 'Programs', 'Claude Code', 'claudecode.exe'),
			localAppData && path.join(localAppData, 'Programs', 'Claude', 'claude.exe'),
			localAppData && path.join(localAppData, 'Programs', 'Claude Code', 'claude.exe'),
			programFiles && path.join(programFiles, 'Claude', 'claudecode.exe'),
			programFiles && path.join(programFiles, 'Claude Code', 'claudecode.exe'),
			programFiles && path.join(programFiles, 'Claude', 'claude.exe'),
			programFiles && path.join(programFiles, 'Claude Code', 'claude.exe'),
			programFilesX86 && path.join(programFilesX86, 'Claude', 'claudecode.exe'),
			programFilesX86 && path.join(programFilesX86, 'Claude Code', 'claudecode.exe'),
			programFilesX86 && path.join(programFilesX86, 'Claude', 'claude.exe'),
			programFilesX86 && path.join(programFilesX86, 'Claude Code', 'claude.exe'),
		].filter(Boolean);
		for (const candidate of commonCandidates) {
			if (fs.existsSync(candidate)) {
				return path.resolve(candidate);
			}
		}
		for (const executableName of ['claudecode.exe', 'claude.exe']) {
			const result = spawnSync('where.exe', [executableName], {
				encoding: 'utf8',
				timeout: 5000,
				windowsHide: true,
			});
			if (result.status !== 0) {
				continue;
			}
			const resolved = String(result.stdout || '')
				.split(/\r?\n/u)
				.map((line) => line.trim())
				.find((line) => line && fs.existsSync(line));
			if (resolved) {
				return path.resolve(resolved);
			}
		}
		return '';
	}
	const unixCandidates = [
		...unixExecutableCandidates('claude'),
		'/usr/local/bin/claudecode',
		'/opt/homebrew/bin/claudecode',
		'/usr/bin/claudecode',
		'/usr/local/bin/claude',
		'/opt/homebrew/bin/claude',
		'/usr/bin/claude',
	];
	for (const candidate of unixCandidates) {
		if (fs.existsSync(candidate)) {
			return path.resolve(candidate);
		}
	}
	for (const executableName of ['claudecode', 'claude']) {
		const result = spawnSync('/bin/sh', ['-lc', `command -v ${executableName}`], {
			encoding: 'utf8',
			timeout: 5000,
			windowsHide: true,
		});
		if (result.status !== 0) {
			continue;
		}
		const resolved = String(result.stdout || '').split(/\r?\n/u)[0]?.trim();
		if (resolved && fs.existsSync(resolved)) {
			return path.resolve(resolved);
		}
	}
	return '';
}

function resolveNativeClaudeCodeExecutable() {
	return resolveExplicitClaudeCodeExecutable() || resolveInstalledClaudeCodeExecutable() || resolveBundledClaudeExecutable();
}

function getManagedCodexExpectedStamp(bundleOrResourceDir, executablePath) {
	const bundle = bundleOrResourceDir && typeof bundleOrResourceDir === 'object' && !Array.isArray(bundleOrResourceDir)
		? bundleOrResourceDir
		: null;
	const compressedPath = bundle?.compressedPath || '';
	const resourceDir = bundle ? bundle.resourceDir : bundleOrResourceDir;
	const sourceExecutablePath = bundle ? bundle.bundledExecutable : executablePath;
	if (compressedPath) {
		if (!fs.existsSync(compressedPath)) {
			return null;
		}
		const compressedStat = fs.statSync(compressedPath);
		if (!compressedStat.isFile() || compressedStat.size > MANAGED_CODEX_COMPRESSED_MAX_BYTES) {
			return null;
		}
		return {
			sourceType: 'compressed',
			sourcePath: path.resolve(compressedPath),
			executableRelativePath: `bin/${process.platform === 'win32' ? 'codex.exe' : 'codex'}`,
			size: compressedStat.size,
			mtimeMs: Math.round(compressedStat.mtimeMs),
		};
	}
	if (!resourceDir || !sourceExecutablePath || !fs.existsSync(resourceDir) || !fs.existsSync(sourceExecutablePath)) {
		return null;
	}
	const executableStat = fs.statSync(sourceExecutablePath);
	if (!executableStat.isFile()) {
		return null;
	}
	return {
		sourceType: 'directory',
		sourceDir: path.resolve(resourceDir),
		executableRelativePath: path.relative(resourceDir, sourceExecutablePath).replace(/\\/g, '/'),
		size: executableStat.size,
		mtimeMs: Math.round(executableStat.mtimeMs),
	};
}

function isManagedCodexStampCurrent(currentStamp, expectedStamp) {
	if (!currentStamp || !expectedStamp) {
		return false;
	}
	const keys = ['sourceType', 'sourceDir', 'sourcePath', 'executableRelativePath', 'size', 'mtimeMs'];
	return keys.every((key) => currentStamp[key] === expectedStamp[key]);
}

function isManagedDownloadedCodexInstallCurrent(currentStamp, executablePath) {
	if (!currentStamp || currentStamp.sourceType !== 'download') {
		return false;
	}
	const artifactId = String(currentStamp.artifactId || 'github-zstd').trim();
	const artifact = getCodexDownloadArtifact(artifactId);
	const legacyGithubDownload = !currentStamp.artifactId;
	const recordedHash = legacyGithubDownload
		? String(currentStamp.sha256 || '').trim().toUpperCase()
		: String(currentStamp.artifactHash || '').trim();
	if (
		!artifact
		|| currentStamp.version !== CODEX_DOWNLOAD_VERSION
		|| currentStamp.platform !== CODEX_DOWNLOAD_PLATFORM
		|| String(currentStamp.hashAlgorithm || (legacyGithubDownload ? 'sha256' : '')).trim().toLowerCase() !== artifact.hashAlgorithm
		|| recordedHash !== artifact.expectedHash
		|| Number(currentStamp.compressedBytes) !== artifact.expectedBytes
	) {
		return false;
	}
	const expectedExecutableBytes = Number(currentStamp.executableBytes);
	if (!Number.isSafeInteger(expectedExecutableBytes) || expectedExecutableBytes < 1024 * 1024) {
		return false;
	}
	try {
		const stat = fs.statSync(executablePath);
		return stat.isFile() && stat.size === expectedExecutableBytes;
	}
	catch {
		return false;
	}
}

function parseCodexVersion(value) {
	const match = String(value || '').match(/(?:codex-cli\s+)?v?(\d+)\.(\d+)\.(\d+)(?:-([A-Za-z0-9.-]+))?/iu);
	if (!match) {
		return null;
	}
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		prerelease: String(match[4] || ''),
		text: `${match[1]}.${match[2]}.${match[3]}${match[4] ? `-${match[4]}` : ''}`,
	};
}

function compareCodexVersions(left, right) {
	const a = typeof left === 'string' ? parseCodexVersion(left) : left;
	const b = typeof right === 'string' ? parseCodexVersion(right) : right;
	if (!a || !b) {
		return null;
	}
	for (const key of ['major', 'minor', 'patch']) {
		if (a[key] !== b[key]) {
			return a[key] > b[key] ? 1 : -1;
		}
	}
	if (a.prerelease === b.prerelease) return 0;
	if (!a.prerelease) return 1;
	if (!b.prerelease) return -1;
	return a.prerelease.localeCompare(b.prerelease);
}

function isManagedCodexCommand(command) {
	const raw = String(command || '').trim();
	return !!raw
		&& /[\\/]/u.test(raw)
		&& isPathInsideOrSamePath(raw, getManagedCodexPaths().installDir);
}

function getCodexUpgradePlan(settings = {}, probe = {}) {
	const target = parseCodexVersion(CODEX_DOWNLOAD_VERSION);
	const installed = parseCodexVersion(probe.version || probe.stdout || probe.stderr || '');
	const comparison = compareCodexVersions(installed, target);
	const available = probe.ok === true && comparison !== null && comparison < 0;
	const configuredPath = String(settings.codexPath || '').trim();
	const managedCommand = isManagedCodexCommand(probe.command);
	return {
		available,
		automatic: process.platform === 'win32' && available && (!configuredPath || managedCommand),
		installedVersion: installed?.text || '',
		targetVersion: target?.text || CODEX_DOWNLOAD_VERSION,
		managedCommand,
		configuredPath: Boolean(configuredPath),
	};
}

function copyBundledCodexToManagedInstall() {
	const bundle = getCodexRuntimeBundleInfo();
	if (!bundle.hasBundledRuntime) {
		throw new Error('Bundled Codex CLI is missing from application resources.');
	}
	const expectedStamp = getManagedCodexExpectedStamp(bundle);
	if (!expectedStamp) {
		throw new Error('Bundled Codex CLI resource is invalid.');
	}
	const { installDir, targetExecutable, stampPath } = getManagedCodexPaths();
	const parentDir = path.dirname(installDir);
	fs.mkdirSync(parentDir, { recursive: true });
	const tempDir = path.join(parentDir, `.codex-install-${process.pid}-${Date.now()}`);
	assertPathInsideOrSamePath(installDir, parentDir, 'managed Codex install dir');
	assertPathInsideOrSamePath(tempDir, parentDir, 'temporary Codex install dir');
	try {
		fs.rmSync(tempDir, { recursive: true, force: true });
		if (bundle.compressedPath) {
			const tempExecutable = path.join(tempDir, 'bin', process.platform === 'win32' ? 'codex.exe' : 'codex');
			fs.mkdirSync(path.dirname(tempExecutable), { recursive: true });
			const executableBuffer = decompressZstd(fs.readFileSync(bundle.compressedPath));
			fs.writeFileSync(tempExecutable, executableBuffer);
		}
		else {
			fs.cpSync(bundle.resourceDir, tempDir, {
				recursive: true,
				force: true,
			});
		}
		fs.rmSync(installDir, { recursive: true, force: true });
		fs.renameSync(tempDir, installDir);
		if (process.platform !== 'win32' && fs.existsSync(targetExecutable)) {
			try { fs.chmodSync(targetExecutable, 0o755); } catch { /* best effort */ }
		}
		if (!fs.existsSync(targetExecutable)) {
			const installedExecutable = findCodexRuntimeAsset(installDir);
			if (!installedExecutable) {
				throw new Error('Managed Codex install did not produce a codex executable.');
			}
		}
		fs.writeFileSync(stampPath, `${JSON.stringify(expectedStamp, null, 2)}\n`, 'utf8');
		return findCodexRuntimeAsset(installDir) || targetExecutable;
	}
	finally {
		if (fs.existsSync(tempDir)) {
			try {
				fs.rmSync(tempDir, { recursive: true, force: true });
			}
			catch {
				// Best-effort cleanup only.
			}
		}
	}
}

function normalizeCodexDownloadUrl(value) {
	const text = String(value || '').trim();
	if (!text) return '';
	try {
		const parsed = new URL(text);
		const insecureLoopbackTest = process.env.PDF_AI_CODEX_ALLOW_INSECURE_TEST_URL === '1'
			&& parsed.protocol === 'http:'
			&& ['127.0.0.1', 'localhost'].includes(parsed.hostname);
		if ((parsed.protocol !== 'https:' && !insecureLoopbackTest) || parsed.username || parsed.password || text.length > 2048) {
			return '';
		}
		return parsed.href;
	}
	catch {
		return '';
	}
}

function normalizeCodexDownloadSource(value, fallback = 'npm-mirror') {
	const source = String(value || '').trim().toLowerCase();
	// Keep existing installations on a maintained mirror rather than obsolete GitHub proxies.
	if (source === 'china-accelerated') return 'npm-mirror';
	if (CODEX_DOWNLOAD_SOURCE_MODES.has(source)) return source;
	const normalizedFallback = String(fallback || '').trim().toLowerCase();
	if (normalizedFallback === 'china-accelerated') return 'npm-mirror';
	return CODEX_DOWNLOAD_SOURCE_MODES.has(normalizedFallback) ? normalizedFallback : 'npm-mirror';
}

function getCodexDownloadArtifact(artifactId) {
	return CODEX_DOWNLOAD_ARTIFACTS[String(artifactId || '').trim()] || null;
}

function createCodexDownloadSource({ url, label, kind, artifactId, switchWhenSlow = false }) {
	const artifact = getCodexDownloadArtifact(artifactId);
	if (!artifact) {
		throw new Error(`Unsupported Codex download artifact: ${artifactId}`);
	}
	return {
		url,
		label,
		kind,
		artifactId: artifact.id,
		archiveFormat: artifact.archiveFormat,
		cacheKey: artifact.cacheKey,
		fileName: artifact.fileName,
		expectedBytes: artifact.expectedBytes,
		hashAlgorithm: artifact.hashAlgorithm,
		expectedHash: artifact.expectedHash,
		expectedIntegrity: `${artifact.hashAlgorithm}-${artifact.expectedHash}`,
		switchWhenSlow,
	};
}

function createOfficialCodexDownloadSource(options = {}) {
	return createCodexDownloadSource({
		url: CODEX_DOWNLOAD_OFFICIAL_URL,
		label: 'OpenAI GitHub Release',
		kind: 'github-release',
		artifactId: 'github-zstd',
		switchWhenSlow: options.switchWhenSlow === true,
	});
}

function createOfficialNpmCodexDownloadSource(options = {}) {
	return createCodexDownloadSource({
		url: CODEX_DOWNLOAD_NPM_OFFICIAL_URL,
		label: 'Official npm registry',
		kind: 'npm-official',
		artifactId: 'npm-win32-x64-tgz',
		switchWhenSlow: options.switchWhenSlow === true,
	});
}

function createNpmMirrorCodexDownloadSource() {
	return createCodexDownloadSource({
		url: CODEX_DOWNLOAD_NPM_MIRROR_URL,
		label: 'npm mirror (npmmirror.com)',
		kind: 'npm-mirror',
		artifactId: 'npm-win32-x64-tgz',
		switchWhenSlow: true,
	});
}

function createConfiguredCodexDownloadSource(url) {
	const artifactId = /\.tgz(?:$|[?#])/iu.test(url) ? 'npm-win32-x64-tgz' : 'github-zstd';
	return createCodexDownloadSource({
		url,
		label: 'Configured HTTPS mirror',
		kind: 'custom',
		artifactId,
		switchWhenSlow: true,
	});
}

function getCodexDownloadSources(settings = {}) {
	const configuredSetting = normalizeCodexDownloadUrl(settings.codexDownloadUrl);
	const configuredEnvironment = normalizeCodexDownloadUrl(
		process.env.PDF_AI_CODEX_DOWNLOAD_URL
		|| process.env.CODEX_DOWNLOAD_URL,
	);
	const configured = configuredSetting || configuredEnvironment;
	const configuredMode = String(
		settings.codexDownloadSource
		|| process.env.PDF_AI_CODEX_DOWNLOAD_SOURCE
		|| process.env.CODEX_DOWNLOAD_SOURCE
		|| '',
	).trim();
	const sourceMode = normalizeCodexDownloadSource(configuredMode, configured ? 'custom' : 'npm-mirror');
	const sources = [];
	const useConfiguredMirror = sourceMode === 'custom'
		|| (sourceMode === 'auto' && !configuredSetting && Boolean(configuredEnvironment));
	if (useConfiguredMirror && configured) {
		sources.push(createConfiguredCodexDownloadSource(configured));
	}
	if (sourceMode === 'npm-mirror') {
		sources.push(createNpmMirrorCodexDownloadSource());
		sources.push(createOfficialNpmCodexDownloadSource({ switchWhenSlow: true }));
		sources.push(createOfficialCodexDownloadSource());
	}
	else if (sourceMode === 'official') {
		sources.push(createOfficialNpmCodexDownloadSource());
		sources.push(createOfficialCodexDownloadSource());
	}
	else if (sourceMode === 'custom') {
		sources.push(createOfficialCodexDownloadSource());
	}
	else {
		sources.push(createNpmMirrorCodexDownloadSource());
		sources.push(createOfficialNpmCodexDownloadSource({ switchWhenSlow: true }));
		sources.push(createOfficialCodexDownloadSource());
	}
	return sources.filter((source, index, list) => list.findIndex((item) => item.url === source.url) === index);
}

function getCodexDownloadInfo(settings = {}) {
	const { installDir, targetExecutable } = getManagedCodexPaths();
	const sources = getCodexDownloadSources(settings);
	const primarySource = sources[0] || createOfficialCodexDownloadSource();
	return {
		version: CODEX_DOWNLOAD_VERSION,
		platform: CODEX_DOWNLOAD_PLATFORM,
		fileName: primarySource.fileName,
		expectedBytes: primarySource.expectedBytes,
		expectedSha256: primarySource.hashAlgorithm === 'sha256' ? primarySource.expectedHash : '',
		expectedIntegrity: primarySource.expectedIntegrity,
		expectedHashAlgorithm: primarySource.hashAlgorithm,
		sources,
		installDir,
		targetExecutable,
	};
}

function hashFileDigest(filePath, algorithm, encoding = 'hex') {
	return new Promise((resolve, reject) => {
		const hash = createHash(algorithm);
		const stream = fs.createReadStream(filePath);
		stream.on('error', reject);
		stream.on('data', (chunk) => hash.update(chunk));
		stream.on('end', () => resolve(hash.digest(encoding)));
	});
}

function hashFileSha256(filePath) {
	return hashFileDigest(filePath, 'sha256', 'hex').then((value) => String(value).toUpperCase());
}

function getCodexDownloadPartPath(downloadDir, source) {
	const cacheKey = String(source?.cacheKey || '').trim();
	if (!/^[A-Za-z0-9._-]+$/u.test(cacheKey)) {
		throw new Error('Invalid Codex download cache key.');
	}
	return path.join(downloadDir, `${CODEX_DOWNLOAD_VERSION}-${cacheKey}.part`);
}

function getCodexDownloadProgressInfo(source) {
	return {
		sourceLabel: source.label,
		sourceUrl: source.url,
		artifactId: source.artifactId,
		archiveFormat: source.archiveFormat,
		expectedBytes: source.expectedBytes,
		expectedSha256: source.hashAlgorithm === 'sha256' ? source.expectedHash : '',
		expectedIntegrity: source.expectedIntegrity,
		expectedHashAlgorithm: source.hashAlgorithm,
	};
}

async function downloadCodexSourceToPart(source, partPath, onProgress, attempt) {
	if (!net || typeof net.fetch !== 'function') {
		throw new Error('Electron network service is unavailable for Codex download.');
	}
	const expectedBytes = Number(source?.expectedBytes);
	if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 1024 * 1024) {
		throw new Error('Codex download source has an invalid expected size.');
	}
	let existingBytes = 0;
	try {
		const stat = fs.statSync(partPath);
		existingBytes = stat.isFile() && stat.size <= expectedBytes ? stat.size : 0;
	}
	catch {
		existingBytes = 0;
	}
	if (existingBytes === expectedBytes) {
		return partPath;
	}
	if (existingBytes <= 0 || existingBytes > expectedBytes) {
		fs.rmSync(partPath, { force: true });
		existingBytes = 0;
	}

	const controller = new AbortController();
	let idleTimer = null;
	let slowTimer = null;
	let switchSourceError = null;
	let downloadedBytes = existingBytes;
	const startedAt = Date.now();
	let startBytes = existingBytes;
	let slowCheckAt = startedAt;
	let slowCheckBytes = existingBytes;
	const resetIdleTimer = () => {
		if (idleTimer) clearTimeout(idleTimer);
		idleTimer = setTimeout(() => {
			switchSourceError = new Error('Codex download stalled for 60 seconds; trying the next source.');
			switchSourceError.codexDownloadSwitchSource = true;
			controller.abort(switchSourceError);
		}, CODEX_DOWNLOAD_IDLE_TIMEOUT_MS);
		idleTimer.unref?.();
	};
	resetIdleTimer();
	if (source.switchWhenSlow === true) {
		const scheduleSlowSpeedCheck = () => {
			slowTimer = setTimeout(() => {
				const now = Date.now();
				const elapsedSeconds = Math.max(0.001, (now - slowCheckAt) / 1000);
				const speedBytesPerSecond = Math.max(0, (downloadedBytes - slowCheckBytes) / elapsedSeconds);
				if (speedBytesPerSecond < CODEX_DOWNLOAD_SLOW_FALLBACK_MIN_BYTES_PER_SECOND) {
					switchSourceError = new Error(
						`Codex download is too slow (${Math.round(speedBytesPerSecond / 1024)} KiB/s); trying the next download source.`,
					);
					switchSourceError.codexDownloadSwitchSource = true;
					controller.abort(switchSourceError);
					return;
				}
				slowCheckAt = now;
				slowCheckBytes = downloadedBytes;
				scheduleSlowSpeedCheck();
			}, CODEX_DOWNLOAD_SLOW_FALLBACK_WINDOW_MS);
			slowTimer.unref?.();
		};
		scheduleSlowSpeedCheck();
	}
	try {
		const headers = {
			'Accept': 'application/octet-stream',
			'User-Agent': 'PDF-Reader-Codex-Downloader/1.0',
		};
		if (existingBytes > 0) {
			headers.Range = `bytes=${existingBytes}-`;
		}
		const response = await net.fetch(source.url, {
			method: 'GET',
			headers,
			redirect: 'follow',
			signal: controller.signal,
		});
		if (existingBytes > 0 && response.status === 200) {
			fs.rmSync(partPath, { force: true });
			existingBytes = 0;
			downloadedBytes = 0;
			startBytes = 0;
			slowCheckAt = Date.now();
			slowCheckBytes = 0;
		}
		else if (existingBytes > 0 && response.status !== 206) {
			throw new Error(`Codex download resume failed (HTTP ${response.status})`);
		}
		else if (existingBytes === 0 && response.status !== 200) {
			throw new Error(`Codex download failed (HTTP ${response.status})`);
		}
		if (!response.body) {
			throw new Error('Codex download response has no body.');
		}

		fs.mkdirSync(path.dirname(partPath), { recursive: true });
		const fileDescriptor = fs.openSync(partPath, existingBytes > 0 ? 'a' : 'w');
		const reader = response.body.getReader();
		let lastProgressAt = 0;
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				resetIdleTimer();
				const chunk = Buffer.from(value);
				fs.writeSync(fileDescriptor, chunk);
				downloadedBytes += chunk.length;
				if (downloadedBytes > expectedBytes) {
					throw new Error(`Codex download exceeds expected size (${expectedBytes} bytes)`);
				}
				const now = Date.now();
				if (now - lastProgressAt >= 250 || downloadedBytes === expectedBytes) {
					lastProgressAt = now;
					const elapsedSeconds = Math.max(0.001, (now - startedAt) / 1000);
					onProgress?.({
						stage: 'downloading',
						attempt,
						...getCodexDownloadProgressInfo(source),
						downloadedBytes,
						totalBytes: expectedBytes,
						percent: Math.min(100, downloadedBytes / expectedBytes * 100),
						speedBytesPerSecond: Math.max(0, (downloadedBytes - startBytes) / elapsedSeconds),
						resumed: startBytes > 0,
					});
				}
			}
		}
		finally {
			fs.closeSync(fileDescriptor);
		}
		if (downloadedBytes !== expectedBytes) {
			throw new Error(`Codex download is incomplete (${downloadedBytes}/${expectedBytes} bytes)`);
		}
		return partPath;
	}
	catch (error) {
		throw switchSourceError || error;
	}
	finally {
		if (idleTimer) clearTimeout(idleTimer);
		if (slowTimer) clearTimeout(slowTimer);
	}
}

async function downloadCodexCompressed(settings, onProgress) {
	const info = getCodexDownloadInfo(settings);
	const downloadDir = path.join(path.dirname(info.installDir), 'downloads');
	assertPathInsideOrSamePath(downloadDir, path.dirname(info.installDir), 'Codex download directory');
	let lastError = null;
	for (const source of info.sources) {
		const partPath = getCodexDownloadPartPath(downloadDir, source);
		for (let attempt = 1; attempt <= CODEX_DOWNLOAD_MAX_ATTEMPTS; attempt += 1) {
			try {
				onProgress?.({
					stage: 'connecting',
					attempt,
					...getCodexDownloadProgressInfo(source),
					downloadedBytes: fs.existsSync(partPath) ? fs.statSync(partPath).size : 0,
					totalBytes: source.expectedBytes,
				});
				const downloadedPath = await downloadCodexSourceToPart(source, partPath, onProgress, attempt);
				return { source, compressedPath: downloadedPath };
			}
			catch (error) {
				lastError = error;
					onProgress?.({
						stage: 'retrying',
						attempt,
						...getCodexDownloadProgressInfo(source),
						error: error instanceof Error ? error.message : String(error),
						totalBytes: source.expectedBytes,
					});
					if (error?.codexDownloadSwitchSource === true) {
						break;
					}
					if (attempt < CODEX_DOWNLOAD_MAX_ATTEMPTS) {
					await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
				}
			}
		}
	}
	throw lastError || new Error('No Codex download source is available.');
}

async function extractNpmCodexPackage(compressedPath, tempDir) {
	fs.mkdirSync(tempDir, { recursive: true });
	await tar.x({
		file: compressedPath,
		cwd: tempDir,
		gzip: true,
		strip: 3,
		strict: true,
		filter(entryPath, entry) {
			const normalizedPath = String(entryPath || '').replace(/\\/g, '/');
			if (!normalizedPath.startsWith(CODEX_NPM_VENDOR_PREFIX)) {
				return false;
			}
			return entry?.type === 'File' || entry?.type === 'Directory';
		},
	});
	const executable = path.join(tempDir, 'bin', 'codex.exe');
	if (!fs.existsSync(executable)) {
		throw new Error('Downloaded npm Codex package does not contain bin/codex.exe.');
	}
	return executable;
}

async function extractCodexDownloadArtifact(compressedPath, source, tempDir) {
	if (source.archiveFormat === 'npm-tgz') {
		return extractNpmCodexPackage(compressedPath, tempDir);
	}
	if (source.archiveFormat === 'zstd-executable') {
		const tempExecutable = path.join(tempDir, 'bin', 'codex.exe');
		const executableBuffer = decompressZstd(fs.readFileSync(compressedPath));
		if (executableBuffer.length < 1024 * 1024 || executableBuffer[0] !== 0x4d || executableBuffer[1] !== 0x5a) {
			throw new Error('Downloaded Codex did not decompress to a valid Windows executable.');
		}
		fs.mkdirSync(path.dirname(tempExecutable), { recursive: true });
		fs.writeFileSync(tempExecutable, executableBuffer);
		return tempExecutable;
	}
	throw new Error(`Unsupported Codex download archive format: ${source.archiveFormat}`);
}

async function downloadAndInstallManagedCodex(settings, onProgress) {
	if (process.platform !== 'win32' || process.arch !== 'x64') {
		throw new Error(`Automatic Codex download is not configured for ${process.platform}-${process.arch}.`);
	}
	const info = getCodexDownloadInfo(settings);
	const { source, compressedPath } = await downloadCodexCompressed(settings, onProgress);
	const hashEncoding = source.hashAlgorithm === 'sha256' ? 'hex' : 'base64';
	onProgress?.({
		stage: 'verifying',
		...info,
		...getCodexDownloadProgressInfo(source),
		downloadedBytes: source.expectedBytes,
		totalBytes: source.expectedBytes,
		percent: 100,
	});
	const actualHash = await hashFileDigest(compressedPath, source.hashAlgorithm, hashEncoding);
	const normalizedActualHash = source.hashAlgorithm === 'sha256' ? String(actualHash).toUpperCase() : actualHash;
	if (normalizedActualHash !== source.expectedHash) {
		fs.rmSync(compressedPath, { force: true });
		throw new Error(`Codex ${source.hashAlgorithm.toUpperCase()} mismatch: expected ${source.expectedHash}, got ${normalizedActualHash}`);
	}

	const parentDir = path.dirname(info.installDir);
	const tempDir = path.join(parentDir, `.codex-download-install-${process.pid}-${Date.now()}`);
	const tempExecutable = path.join(tempDir, 'bin', 'codex.exe');
	assertPathInsideOrSamePath(tempDir, parentDir, 'temporary downloaded Codex install dir');
	try {
		onProgress?.({
			stage: 'decompressing',
			...info,
			...getCodexDownloadProgressInfo(source),
			downloadedBytes: source.expectedBytes,
			totalBytes: source.expectedBytes,
			percent: 100,
		});
		const extractedExecutable = await extractCodexDownloadArtifact(compressedPath, source, tempDir);
		if (path.resolve(extractedExecutable) !== path.resolve(tempExecutable)) {
			throw new Error('Downloaded Codex archive resolved an unexpected executable path.');
		}
		const executableBytes = fs.statSync(tempExecutable).size;
		onProgress?.({
			stage: 'validating',
			...info,
			...getCodexDownloadProgressInfo(source),
			executableBytes,
			downloadedBytes: source.expectedBytes,
			totalBytes: source.expectedBytes,
			percent: 100,
		});
		const probe = spawnSync(tempExecutable, ['--version'], {
			encoding: 'utf8',
			timeout: 30000,
			windowsHide: true,
		});
		const versionOutput = String(probe.stdout || probe.stderr || '').trim();
		if (
			probe.status !== 0
			|| !/codex-cli\s+\d+/iu.test(versionOutput)
			|| compareCodexVersions(parseCodexVersion(versionOutput), parseCodexVersion(CODEX_DOWNLOAD_VERSION)) !== 0
		) {
			throw new Error(`Downloaded Codex version check failed: ${String(probe.stderr || probe.stdout || '').trim() || `exit ${probe.status}`}`);
		}
		fs.rmSync(info.installDir, { recursive: true, force: true });
		fs.renameSync(tempDir, info.installDir);
		fs.writeFileSync(path.join(info.installDir, '.codex-resource-stamp.json'), `${JSON.stringify({
			sourceType: 'download',
			version: CODEX_DOWNLOAD_VERSION,
			platform: CODEX_DOWNLOAD_PLATFORM,
			artifactId: source.artifactId,
			hashAlgorithm: source.hashAlgorithm,
			artifactHash: normalizedActualHash,
			sha256: source.hashAlgorithm === 'sha256' ? normalizedActualHash : '',
			compressedBytes: source.expectedBytes,
			executableBytes,
			installedAt: new Date().toISOString(),
		}, null, 2)}\n`, 'utf8');
		fs.rmSync(compressedPath, { force: true });
		onProgress?.({
			stage: 'ready',
			...info,
			...getCodexDownloadProgressInfo(source),
			versionOutput,
			executableBytes,
			downloadedBytes: source.expectedBytes,
			totalBytes: source.expectedBytes,
			percent: 100,
		});
		return info.targetExecutable;
	}
	finally {
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	}
}

function resolveManagedCodexExecutable() {
	const { installDir, targetExecutable, stampPath } = getManagedCodexPaths();
	const installedExecutable = findCodexRuntimeAsset(installDir) || targetExecutable;
	if (!installedExecutable || !fs.existsSync(installedExecutable)) {
		return '';
	}
	const currentStamp = readJsonIfPresentSafe(stampPath);
	if (isManagedDownloadedCodexInstallCurrent(currentStamp, installedExecutable)) {
		return installedExecutable;
	}
	const bundle = getCodexRuntimeBundleInfo();
	if (!bundle.hasBundledRuntime) {
		return installedExecutable;
	}
	const expectedStamp = getManagedCodexExpectedStamp(bundle);
	return isManagedCodexStampCurrent(currentStamp, expectedStamp)
		? installedExecutable
		: '';
}

function resolveInstalledCodexExecutable() {
	const explicitCandidates = [
		process.env.CODEX_NATIVE_EXE,
		process.env.CODEX_EXECUTABLE,
		process.env.CODEX_PATH,
	];
	const candidates = [
		...explicitCandidates,
		...(process.platform !== 'win32' ? unixExecutableCandidates('codex') : []),
		...(process.platform === 'win32'
		? ['codex.exe', 'codex']
			: ['codex']),
	];
	for (const candidate of candidates) {
		const raw = String(candidate || '').trim();
		if (!raw || /\.zst$/iu.test(raw)) {
			continue;
		}
		const command = /[\\/]/.test(raw) && fs.existsSync(raw)
			? path.resolve(raw)
			: raw;
		const executable = probeExecutable(command, process.env, process.cwd());
		if (!executable.ok) {
			continue;
		}
		const resolved = executable.resolvedPath || command;
		const version = probeCommandVersion(resolved, ['--version'], {
			cwd: process.cwd(),
			env: process.env,
			timeoutMs: 9000,
		});
		if (version.ok && /codex/i.test(`${version.version}\n${version.stdout}\n${version.stderr}`)) {
			return resolved;
		}
	}
	return '';
}

function resolveConfiguredClaudeExecutable(configured, options = {}) {
	const raw = String(configured || '').trim();
	if (!raw) {
		return { ok: false, executable: '', reason: 'empty' };
	}
	if (/[\\/]/.test(raw)) {
		const resolved = path.isAbsolute(raw) ? raw : path.resolve(options.cwd || process.cwd(), raw);
		return fs.existsSync(resolved)
			? { ok: true, executable: path.resolve(resolved), reason: 'path-exists' }
			: { ok: false, executable: path.resolve(resolved), reason: 'path-not-found' };
	}
	const probe = probeExecutable(raw, options.env || process.env, options.cwd || process.cwd());
	return probe.ok
		? { ok: true, executable: probe.resolvedPath || raw, reason: probe.reason || 'command-found' }
		: { ok: false, executable: raw, reason: probe.reason || 'command-not-found' };
}

function resolveClaudeRuntimeExecutable(options = {}) {
	const settings = options.settings || {};
	const configured = String(settings.claudePath || options.claudePath || '').trim();
	const bundle = getClaudeRuntimeBundleInfo();
	const result = {
		ok: false,
		source: 'missing',
		executable: '',
		configured,
		configuredStatus: configured ? 'unchecked' : 'empty',
		configuredIsManagedBundle: false,
		installedExecutable: '',
		envExecutable: '',
		bundledExecutable: '',
		bundle,
		error: '',
	};
	try {
		result.configuredIsManagedBundle = Boolean(configured && isPathInsideOrSamePath(configured, bundle.managedInstallDir));
		if (configured) {
			const configuredResult = resolveConfiguredClaudeExecutable(configured, {
				cwd: options.cwd || settings.workspace || process.cwd(),
				env: options.env || process.env,
			});
			result.configuredStatus = configuredResult.reason;
			if (configuredResult.ok && !result.configuredIsManagedBundle) {
				return {
					...result,
					ok: true,
					source: 'configured',
					executable: configuredResult.executable,
				};
			}
		}

		const envExecutable = resolveExplicitClaudeCodeExecutable();
		result.envExecutable = envExecutable;
		if (envExecutable) {
			return {
				...result,
				ok: true,
				source: 'env',
				executable: envExecutable,
			};
		}

		const installedExecutable = resolveInstalledClaudeCodeExecutable();
		result.installedExecutable = installedExecutable;
		if (installedExecutable) {
			return {
				...result,
				ok: true,
				source: 'installed',
				executable: installedExecutable,
			};
		}

		const bundledExecutable = resolveBundledClaudeExecutable();
		result.bundledExecutable = bundledExecutable;
		if (bundledExecutable) {
			return {
				...result,
				ok: true,
				source: 'bundled',
				executable: bundledExecutable,
				bundle: getClaudeRuntimeBundleInfo(),
			};
		}

		return result;
	}
	catch (error) {
		return {
			...result,
			ok: false,
			source: 'error',
			error: error instanceof Error ? error.message : String(error),
			bundle: getClaudeRuntimeBundleInfo(),
		};
	}
}

const DEFAULT_SETTINGS = Object.freeze({
	provider: 'codex',
	workspace: '',
	codexPath: '',
	codexDownloadUrl: '',
	codexDownloadSource: 'npm-mirror',
	codexInstallationMethod: 'native-windows',
	codexWslDistroOverride: '',
	codexHome: '',
	// This is a routing hint only. Credentials stay in the main-process app state.
	claudePath: '',
	model: 'gpt-5.5',
	modelSelectionSource: 'native',
	effort: 'high',
	reasoningSummary: 'detailed',
	serviceTier: 'default',
	sidebarFontSize: 14,
	permissionMode: 'normal',
	sandbox: 'read-only',
	llmProviderMode: 'native-cli',
	openaiApiKey: '',
	openaiBaseUrl: '',
	openaiModel: '',
	anthropicApiKey: '',
	anthropicBaseUrl: '',
	claudeConfigDir: '',
	claudeSafeMode: 'acceptEdits',
	claudeLoadUserSettings: true,
	claudeEnableChrome: false,
	claudeEnableBangBash: true,
	claudeCustomModels: '',
	claudeHiddenCommands: '',
	codexCustomModels: '',
	codexHiddenCommands: '',
	envText: '',
	claudeEnvText: '',
	codexEnvText: '',
	systemPrompt: '',
});

const DEFAULT_CLAUDE_MODEL_OPTIONS = Object.freeze([
	{ value: 'haiku', label: 'Haiku', description: 'Fast and efficient' },
	{ value: 'sonnet', label: 'Sonnet', description: 'Balanced performance' },
	{ value: 'sonnet[1m]', label: 'Sonnet 1M', description: 'Balanced performance (1M context window)' },
	{ value: 'opus', label: 'Opus', description: 'Most capable' },
	{ value: 'opus[1m]', label: 'Opus 1M', description: 'Most capable (1M context window)' },
]);
const DEFAULT_CODEX_MODEL_OPTIONS = Object.freeze([
	{ value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini', description: 'Fast' },
	{ value: 'gpt-5.5', label: 'GPT-5.5', description: 'Latest' },
]);
const DEFAULT_CLAUDE_MODEL_VALUES = new Set(DEFAULT_CLAUDE_MODEL_OPTIONS.map((model) => model.value));
const DEFAULT_CODEX_MODEL_VALUES = new Set(DEFAULT_CODEX_MODEL_OPTIONS.map((model) => model.value));
const DEFAULT_CLAUDE_MODEL = 'sonnet';
const DEFAULT_CODEX_MODEL = 'gpt-5.5';
const REASONING_EFFORT_ORDER = Object.freeze(['low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
const REASONING_EFFORT_SET = new Set(REASONING_EFFORT_ORDER);
const CONTEXT_WINDOW_STANDARD = 200000;
const CONTEXT_WINDOW_1M = 1000000;
const RUNTIME_MODEL_LIST_TIMEOUT_MS = 7000;
const PROCESS_LINE_MAX_BYTES = 8 * 1024 * 1024;
const PROCESS_CAPTURE_MAX_CHARS = 1024 * 1024;
const PROCESS_STDERR_MAX_CHARS = 256 * 1024;
const CODEX_PENDING_TURN_NOTIFICATION_MAX = 256;
const CODEX_TURN_TRACKING_MAX_ENTRIES = 2048;
const CODEX_TURN_TEXT_MEMORY_MAX_CHARS = 512 * 1024;
const CODEX_PLAN_TEXT_MEMORY_MAX_CHARS = 64 * 1024;
const MARKDOWN_NOTE_AI_REQUEST_ID_MAX_CHARS = 160;
const MARKDOWN_NOTE_AI_PROMPT_MAX_CHARS = 512 * 1024;
const MARKDOWN_NOTE_AI_OUTPUT_MAX_CHARS = 512 * 1024;
const MARKDOWN_NOTE_AI_TIMEOUT_MS = 5 * 60 * 1000;
const CODEX_EPHEMERAL_PROBE_TIMEOUT_MS = 90000;
const CLAUDE_RUNTIME_COMMAND_PROBE_TIMEOUT_MS = 15000;
const TITLE_GENERATION_USER_MESSAGE_MAX_CHARS = 8000;
const TITLE_GENERATION_TIMEOUT_MS = 90000;
const TITLE_GENERATION_MAX_CONCURRENT = 8;
const AUXILIARY_INTERACTIVE_TASK_TIMEOUT_MS = 180000;
const INSTRUCTION_REFINE_TEXT_MAX_CHARS = 20000;
const INLINE_EDIT_TEXT_MAX_CHARS = 20000;
const INLINE_EDIT_CONTEXT_FILES_MAX = 50;
const CLAUDE_FILE_REWIND_TIMEOUT_MS = 180000;
const CLAUDE_FILE_REWIND_ID_MAX_CHARS = 256;
const SETTINGS_JSON_MAX_BYTES = 2 * 1024 * 1024;

function normalizeReasoningEffortValue(value) {
	const raw = typeof value === 'object' && value !== null
		? (value.reasoningEffort || value.reasoning_effort || value.value || value.id || value.name)
		: value;
	const normalized = String(raw || '').trim().toLowerCase().replace(/[_\s-]+/gu, '');
	if (normalized === 'minimal' || normalized === 'xlow') return 'low';
	if (normalized === 'extrahigh' || normalized === 'extra-high') return 'xhigh';
	return REASONING_EFFORT_SET.has(normalized) ? normalized : '';
}

function normalizeReasoningEffortList(value) {
	const values = [];
	const visit = (candidate) => {
		if (Array.isArray(candidate)) {
			candidate.forEach(visit);
			return;
		}
		if (typeof candidate === 'string' && /[,\s]/u.test(candidate.trim())) {
			candidate.split(/[\s,]+/u).forEach(visit);
			return;
		}
		const normalized = normalizeReasoningEffortValue(candidate);
		if (normalized && !values.includes(normalized)) values.push(normalized);
	};
	visit(value);
	return values.sort((left, right) => REASONING_EFFORT_ORDER.indexOf(left) - REASONING_EFFORT_ORDER.indexOf(right));
}

function extractModelReasoningMetadata(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
	const supportedSources = [
		value.supportedReasoningEfforts,
		value.supported_reasoning_efforts,
		value.supportedEffortLevels,
		value.supported_effort_levels,
		value.reasoningEfforts,
		value.reasoning_efforts,
		value.capabilities?.supportedReasoningEfforts,
		value.capabilities?.supported_reasoning_efforts,
		value.capabilities?.supportedEffortLevels,
		value.capabilities?.supported_effort_levels,
	];
	const supportedReasoningEfforts = supportedSources
		.flatMap((source) => normalizeReasoningEffortList(source))
		.filter((value, index, list) => list.indexOf(value) === index)
		.sort((left, right) => REASONING_EFFORT_ORDER.indexOf(left) - REASONING_EFFORT_ORDER.indexOf(right));
	const defaultReasoningEffort = normalizeReasoningEffortValue(
		value.defaultReasoningEffort
			|| value.default_reasoning_effort
			|| value.defaultEffort
			|| value.default_effort,
	);
	const supportsEffort = [
		value.supportsReasoningEffort,
		value.supports_reasoning_effort,
		value.supportsEffort,
		value.supports_effort,
		value.capabilities?.supportsReasoningEffort,
		value.capabilities?.supports_reasoning_effort,
		value.capabilities?.supportsEffort,
		value.capabilities?.supports_effort,
	].find((candidate) => typeof candidate === 'boolean');
	return {
		...(supportedReasoningEfforts.length ? { supportedReasoningEfforts } : {}),
		...(defaultReasoningEffort ? { defaultReasoningEffort } : {}),
		...(typeof supportsEffort === 'boolean' ? { supportsReasoningEffort: supportsEffort } : {}),
	};
}
const CUSTOM_MODELS_PER_PROVIDER_MAX = 128;
const CUSTOM_MODEL_ID_MAX_CHARS = 256;
const SIDEBAR_FONT_SIZE_MIN = 12;
const SIDEBAR_FONT_SIZE_MAX = 20;
const SIDEBAR_FONT_SIZE_DEFAULT = 14;
const RUNTIME_LOG_TAIL_MAX_BYTES = 5 * 1024 * 1024;
const NATIVE_HISTORY_JSONL_TAIL_MAX_BYTES = 8 * 1024 * 1024;
const PROVIDER_ASSET_TEXT_MAX_BYTES = 512 * 1024;
const PROVIDER_ASSET_SCAN_MAX_FILES = 2000;
const PROVIDER_ASSET_SCAN_MAX_DEPTH = 16;
const IMMEDIATE_DIRECTORY_SCAN_MAX_ENTRIES = 2000;
const MANAGED_CLAUDE_COMPRESSED_MAX_BYTES = 160 * 1024 * 1024;
const MANAGED_CODEX_COMPRESSED_MAX_BYTES = 160 * 1024 * 1024;
const CODEX_DOWNLOAD_VERSION = '0.144.1';
const CODEX_DOWNLOAD_PLATFORM = 'win32-x64';
const CODEX_DOWNLOAD_FILE_NAME = 'codex-x86_64-pc-windows-msvc.exe.zst';
const CODEX_DOWNLOAD_EXPECTED_BYTES = 84459940;
const CODEX_DOWNLOAD_EXPECTED_SHA256 = 'E53BEEBE5772733C6AE5C89A304FA450B0BE0EF9FF05BC51A7CB01DEC6C78573';
const CODEX_DOWNLOAD_OFFICIAL_URL = `https://github.com/openai/codex/releases/download/rust-v${CODEX_DOWNLOAD_VERSION}/${CODEX_DOWNLOAD_FILE_NAME}`;
const CODEX_DOWNLOAD_NPM_FILE_NAME = `codex-${CODEX_DOWNLOAD_VERSION}-win32-x64.tgz`;
const CODEX_DOWNLOAD_NPM_EXPECTED_BYTES = 145088030;
const CODEX_DOWNLOAD_NPM_EXPECTED_SHA512 = 'qv2HOp6v/nVP31p5I5GxYyL0wa79PMzim1+W9CKSV0UldjFV9AMbualA8PeXcYhbvvh9Y1UASXxwjuQdlyfAvw==';
const CODEX_DOWNLOAD_NPM_MIRROR_URL = `https://registry.npmmirror.com/@openai/codex/-/${CODEX_DOWNLOAD_NPM_FILE_NAME}`;
const CODEX_DOWNLOAD_NPM_OFFICIAL_URL = `https://registry.npmjs.org/@openai/codex/-/${CODEX_DOWNLOAD_NPM_FILE_NAME}`;
const CODEX_NPM_VENDOR_PREFIX = 'package/vendor/x86_64-pc-windows-msvc/';
const CODEX_DOWNLOAD_ARTIFACTS = Object.freeze({
	'github-zstd': Object.freeze({
		id: 'github-zstd',
		archiveFormat: 'zstd-executable',
		cacheKey: 'github-zstd',
		fileName: CODEX_DOWNLOAD_FILE_NAME,
		expectedBytes: CODEX_DOWNLOAD_EXPECTED_BYTES,
		hashAlgorithm: 'sha256',
		expectedHash: CODEX_DOWNLOAD_EXPECTED_SHA256,
	}),
	'npm-win32-x64-tgz': Object.freeze({
		id: 'npm-win32-x64-tgz',
		archiveFormat: 'npm-tgz',
		cacheKey: 'npm-win32-x64-tgz',
		fileName: CODEX_DOWNLOAD_NPM_FILE_NAME,
		expectedBytes: CODEX_DOWNLOAD_NPM_EXPECTED_BYTES,
		hashAlgorithm: 'sha512',
		expectedHash: CODEX_DOWNLOAD_NPM_EXPECTED_SHA512,
	}),
});
const CODEX_DOWNLOAD_SOURCE_MODES = new Set(['auto', 'official', 'npm-mirror', 'custom']);
const CODEX_DOWNLOAD_MAX_ATTEMPTS = 3;
const CODEX_DOWNLOAD_IDLE_TIMEOUT_MS = 60000;
const CODEX_DOWNLOAD_SLOW_FALLBACK_WINDOW_MS = 15000;
const CODEX_DOWNLOAD_SLOW_FALLBACK_MIN_BYTES_PER_SECOND = 128 * 1024;
const CODEX_RESPONSES_BRIDGE_BODY_MAX_BYTES = 64 * 1024 * 1024;
const CODEX_RESPONSES_BRIDGE_TIMEOUT_MS = 120000;

const CODEX_ENV_HASH_KEYS = [
	'OPENAI_MODEL',
	'OPENAI_BASE_URL',
	'OPENAI_API_KEY',
	'CODEX_HOME',
	'PDF_AI_CONTEXT_CLI',
	'PDF_AI_WORKSPACE',
	'PDF_AI_UI_LANGUAGE',
];
const CLAUDE_AGENT_SDK_MODULE_PATH = path.join(__dirname, 'claudian-sidebar-vendor', 'claude-agent-sdk', 'sdk.mjs');

let cachedClaudeAgentSdk = null;
let cachedClaudeAgentSdkLoad = null;

const NOTIFICATION_METHODS = [
	'thread/started',
	'thread/statusChanged',
	'thread/status/changed',
	'turn/started',
	'turn/completed',
	'item/started',
	'item/completed',
	'item/agentMessage/delta',
	'item/reasoning/summaryTextDelta',
	'item/reasoning/textDelta',
	'item/reasoning/summaryPartAdded',
	'item/plan/delta',
	'item/commandExecution/outputDelta',
	'item/fileChange/outputDelta',
	'item/fileChange/patchUpdated',
	'thread/tokenUsage/updated',
	'turn/plan/updated',
	'error',
	'event_msg',
	'rawResponseItem/completed',
	'serverRequest/resolved',
	'server/requestResolved',
];

const SERVER_REQUEST_METHODS = [
	'item/commandExecution/requestApproval',
	'item/fileChange/requestApproval',
	'item/permissions/requestApproval',
	'item/tool/requestUserInput',
];

function isRecord(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function logPreview(value, limit = 240) {
	const text = typeof value === 'string' ? value : value == null ? '' : String(value);
	return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function appendLimitedText(current, value, maxChars = PROCESS_CAPTURE_MAX_CHARS) {
	const base = String(current || '');
	const text = String(value || '');
	if (!text || base.length >= maxChars) {
		return base;
	}
	const remaining = maxChars - base.length;
	if (text.length <= remaining) {
		return `${base}${text}`;
	}
	return `${base}${text.slice(0, remaining)}\n[truncated ${text.length - remaining} chars]`;
}

function statRegularFileWithinLimit(filePath, maxBytes) {
	try {
		const stat = fs.statSync(filePath);
		if (!stat.isFile()) {
			return null;
		}
		if (Number.isFinite(maxBytes) && maxBytes > 0 && stat.size > maxBytes) {
			return null;
		}
		return stat;
	}
	catch {
		return null;
	}
}

function readTextFileLimited(filePath, maxBytes = PROVIDER_ASSET_TEXT_MAX_BYTES) {
	if (!filePath || !statRegularFileWithinLimit(filePath, maxBytes)) {
		return null;
	}
	try {
		return fs.readFileSync(filePath, 'utf8');
	}
	catch {
		return null;
	}
}

function readTextFileTailLimited(filePath, maxBytes = RUNTIME_LOG_TAIL_MAX_BYTES) {
	if (!filePath) {
		return null;
	}
	let stat = null;
	try {
		stat = fs.statSync(filePath);
		if (!stat.isFile()) {
			return null;
		}
	}
	catch {
		return null;
	}
	const bytesToRead = Math.max(0, Math.min(stat.size, maxBytes));
	const start = Math.max(0, stat.size - bytesToRead);
	const buffer = Buffer.alloc(bytesToRead);
	let fd = null;
	try {
		fd = fs.openSync(filePath, 'r');
		const readBytes = fs.readSync(fd, buffer, 0, bytesToRead, start);
		return buffer.subarray(0, readBytes).toString('utf8');
	}
	catch {
		return null;
	}
	finally {
		if (fd !== null) {
			try { fs.closeSync(fd); } catch { /* best effort */ }
		}
	}
}

function addBoundedSetEntry(set, value, maxEntries = CODEX_TURN_TRACKING_MAX_ENTRIES) {
	if (!set || !value) {
		return;
	}
	if (set.has(value)) {
		set.delete(value);
	}
	set.add(value);
	while (set.size > maxEntries) {
		const oldest = set.values().next().value;
		set.delete(oldest);
	}
}

function setBoundedMapEntry(map, key, value, maxEntries = CODEX_TURN_TRACKING_MAX_ENTRIES) {
	if (!map || !key) {
		return;
	}
	if (map.has(key)) {
		map.delete(key);
	}
	map.set(key, value);
	while (map.size > maxEntries) {
		const oldest = map.keys().next().value;
		map.delete(oldest);
	}
}

function terminateProcess(proc, signal = 'SIGTERM') {
	if (!proc || proc.killed) {
		return;
	}
	try {
		if (process.platform === 'win32' && proc.pid) {
			spawnSync('taskkill', ['/pid', String(proc.pid), '/t', '/f'], {
				stdio: 'ignore',
				windowsHide: true,
			});
			return;
		}
		proc.kill(signal);
	}
	catch {
		// Best-effort process cleanup.
	}
}

function summarizeApprovalPayloadForLog(payload = {}, meta = {}) {
	const input = isRecord(payload.input) ? payload.input : {};
	return {
		kind: payload.kind || '',
		title: payload.title || '',
		tool: payload.tool || (payload.kind === 'command' ? 'Bash' : payload.kind === 'file_change' ? 'Edit' : ''),
		requestId: meta.requestId || '',
		threadId: meta.threadId || '',
		source: meta.source || '',
		commandPreview: logPreview(input.command || ''),
		pathPreview: logPreview(input.cwd || input.path || ''),
		descriptionPreview: logPreview(payload.description || input.reason || ''),
		questionCount: Array.isArray(payload.questions) ? payload.questions.length : 0,
	};
}

async function loadClaudeAgentSdk() {
	if (cachedClaudeAgentSdk) {
		return cachedClaudeAgentSdk;
	}
	if (cachedClaudeAgentSdkLoad) {
		return cachedClaudeAgentSdkLoad;
	}
	cachedClaudeAgentSdkLoad = import(pathToFileURL(CLAUDE_AGENT_SDK_MODULE_PATH).href)
		.then((mod) => {
			if (typeof mod?.query !== 'function') {
				throw new Error('Claude Agent SDK query export is missing');
			}
			cachedClaudeAgentSdk = mod;
			return mod;
		})
		.finally(() => {
			cachedClaudeAgentSdkLoad = null;
		});
	return cachedClaudeAgentSdkLoad;
}

function summarizeRuntimeEnvelope(envelope = {}) {
	const chunk = envelope.chunk && typeof envelope.chunk === 'object' ? envelope.chunk : null;
	const usage = chunk?.usage && typeof chunk.usage === 'object' ? chunk.usage : null;
	return {
		type: envelope.type || '',
		sessionKey: envelope.sessionKey || '',
		threadId: envelope.threadId || envelope.runtimeThreadId || envelope.raw?.params?.threadId || '',
		turnId: envelope.turnId || envelope.assistantMessageId || envelope.raw?.params?.turnId || envelope.raw?.params?.turn?.id || '',
		provider: envelope.provider || '',
		status: envelope.status || '',
		detail: logPreview(envelope.detail || envelope.content || ''),
		chunkType: chunk?.type || '',
		chunkId: chunk?.id || '',
		chunkName: chunk?.name || '',
		contentLength: typeof chunk?.content === 'string' ? chunk.content.length : 0,
		contentPreview: logPreview(chunk?.content || ''),
		usageModel: usage?.model || '',
		usageInputTokens: Number(usage?.inputTokens ?? usage?.input_tokens ?? 0) || 0,
		usageOutputTokens: Number(usage?.outputTokens ?? usage?.output_tokens ?? 0) || 0,
		usageCacheReadInputTokens: Number(usage?.cacheReadInputTokens ?? usage?.cache_read_input_tokens ?? 0) || 0,
		usageCacheCreationInputTokens: Number(usage?.cacheCreationInputTokens ?? usage?.cache_creation_input_tokens ?? 0) || 0,
		usageContextTokens: Number(usage?.contextTokens ?? 0) || 0,
		usageContextWindow: Number(usage?.contextWindow ?? 0) || 0,
		usagePercentage: Number(usage?.percentage ?? 0) || 0,
		approval: envelope.type === 'approval' ? summarizeApprovalPayloadForLog(envelope.approval || {}, {
			requestId: envelope.approval?.runtimeRequestId || '',
			threadId: envelope.approval?.runtimeThreadId || '',
		}) : undefined,
		approvalId: envelope.id || envelope.approval?.id || '',
		approvalRequestId: envelope.requestId || envelope.approval?.runtimeRequestId || '',
		rawMethod: envelope.raw?.method || '',
		rawSubtype: envelope.raw?.subtype || envelope.subtype || '',
	};
}

function summarizeCodexNotification(method, params = {}) {
	return {
		method,
		threadId: params?.threadId || '',
		turnId: params?.turnId || params?.turn?.id || params?.turn_id || '',
		itemId: params?.itemId || params?.item?.id || '',
		itemType: params?.item?.type || '',
		status: params?.turn?.status || params?.status || params?.item?.status || '',
		deltaLength: typeof params?.delta === 'string' ? params.delta.length : 0,
		deltaPreview: logPreview(params?.delta || ''),
	};
}

function readRuntimeLogRecords(filePath, maxRecords = 500) {
	if (!filePath || !fs.existsSync(filePath)) {
		return [];
	}
	try {
		const raw = readTextFileTailLimited(filePath, RUNTIME_LOG_TAIL_MAX_BYTES);
		if (!raw) {
			return [];
		}
		const lines = raw
			.split(/\r?\n/)
			.filter((line) => line.trim());
		return lines.slice(Math.max(0, lines.length - maxRecords)).map((line) => {
			try {
				return JSON.parse(line);
			}
			catch {
				return { event: 'log.parseError', payload: { line: logPreview(line) } };
			}
		});
	}
	catch {
		return [];
	}
}

function parseFlowLoggerMessage(record) {
	const message = String(record?.message || '').trim();
	const match = message.match(/^([A-Za-z0-9_.:-]+)\s+(\{[\s\S]*\})$/);
	if (!match) {
		return null;
	}
	try {
		const payload = JSON.parse(match[2]);
		return {
			event: match[1],
			payload: isRecord(payload) ? payload : { value: payload },
		};
	}
	catch {
		return null;
	}
}

function logRecordEvent(record) {
	return String(record?.event || record?.meta?.event || parseFlowLoggerMessage(record)?.event || '');
}

function logRecordPayload(record) {
	if (isRecord(record?.payload)) return record.payload;
	if (isRecord(record?.meta?.payload)) return record.meta.payload;
	return parseFlowLoggerMessage(record)?.payload || {};
}

function diagnosticApprovalKey(payload) {
	return String(
		payload.approvalRequestId
		|| payload.requestId
		|| payload.approval?.requestId
		|| payload.approval?.runtimeRequestId
		|| payload.approvalId
		|| payload.id
		|| '',
	).trim();
}

function diagnosticTurnKey(payload) {
	const threadId = String(payload.threadId || '').trim();
	const turnId = String(payload.turnId || '').trim();
	const sessionKey = String(payload.sessionKey || '').trim();
	if (threadId || turnId) {
		return `${threadId || 'thread'}#${turnId || 'turn'}`;
	}
	return sessionKey ? `session#${sessionKey}` : '';
}

function compactRuntimeDiagnosticRecord(record) {
	const payload = logRecordPayload(record);
	return {
		at: record?.at || record?.timestamp || '',
		event: logRecordEvent(record),
		type: payload.type || '',
		status: payload.status || '',
		detail: payload.detail || payload.contentPreview || payload.message || '',
		requestId: payload.approvalRequestId || payload.requestId || payload.approval?.requestId || '',
		threadId: payload.threadId || payload.approval?.threadId || '',
		turnId: payload.turnId || '',
	};
}

function buildRuntimeLogDiagnostics(records) {
	const pendingApprovals = new Map();
	const activeTurns = new Map();
	const issues = [];
	let emptyResponseCount = 0;
	let mojibakeCount = 0;
	let errorCount = 0;
	let latestStatus = null;
	let latestDone = null;
	let latestError = null;
	let latestApproval = null;
	const emptyResponseRecords = [];
	const mojibakeRecords = [];
	const errorRecords = [];
	for (const record of records) {
		const payload = logRecordPayload(record);
		const event = logRecordEvent(record);
		const type = String(payload.type || '');
		if (event === 'runtime.approval.request' || type === 'approval') {
			const key = diagnosticApprovalKey(payload);
			if (key) pendingApprovals.set(key, record);
			latestApproval = record;
		}
		if (event === 'runtime.approval.response' || type === 'approval_resolved') {
			const key = diagnosticApprovalKey(payload);
			if (key) pendingApprovals.delete(key);
			latestApproval = record;
		}
		if (event === 'runtime.startTurn' || type === 'turn-started') {
			const key = diagnosticTurnKey(payload);
			if (key) activeTurns.set(key, record);
		}
		if (type === 'done') {
			const key = diagnosticTurnKey(payload);
			if (key) activeTurns.delete(key);
			latestDone = record;
		}
		if (type === 'error' || /\.error$/i.test(event) || /error/i.test(String(payload.status || ''))) {
			errorCount += 1;
			errorRecords.push(record);
			latestError = record;
			const key = diagnosticTurnKey(payload);
			if (key) activeTurns.delete(key);
		}
		if (event === 'runtime.emptyResponse') {
			emptyResponseCount += 1;
			emptyResponseRecords.push(record);
		}
		if (event === 'runtime.encoding.mojibakeDetected') {
			mojibakeCount += 1;
			mojibakeRecords.push(record);
		}
		if (type === 'status') latestStatus = record;
	}
	if (pendingApprovals.size > 0) {
		issues.push({
			kind: 'pending-approval',
			message: `${pendingApprovals.size} approval request(s) are unresolved.`,
			records: [...pendingApprovals.values()].slice(-3).map(compactRuntimeDiagnosticRecord),
		});
	}
	if (activeTurns.size > 0) {
		issues.push({
			kind: 'open-turn',
			message: `${activeTurns.size} turn(s) started without done/error in the inspected log window.`,
			records: [...activeTurns.values()].slice(-3).map(compactRuntimeDiagnosticRecord),
		});
	}
	if (emptyResponseCount > 0) {
		issues.push({
			kind: 'empty-response',
			message: `${emptyResponseCount} empty response marker(s) logged.`,
			records: emptyResponseRecords.slice(-3).map(compactRuntimeDiagnosticRecord),
		});
	}
	if (mojibakeCount > 0) {
		issues.push({
			kind: 'mojibake',
			message: `${mojibakeCount} possible encoding issue(s) logged.`,
			records: mojibakeRecords.slice(-3).map(compactRuntimeDiagnosticRecord),
		});
	}
	if (errorCount > 0) {
		issues.push({
			kind: 'error',
			message: `${errorCount} error event(s) logged.`,
			records: errorRecords.slice(-3).map(compactRuntimeDiagnosticRecord),
		});
	}
	const importantPattern = /(error|approval|emptyResponse|mojibake|stderr|status|done|parseError)/i;
	const recentImportant = records
		.filter((record) => {
			const payload = logRecordPayload(record);
			return importantPattern.test(logRecordEvent(record))
				|| importantPattern.test(String(payload.type || ''))
				|| importantPattern.test(String(payload.status || ''));
		})
		.slice(-20)
		.map(compactRuntimeDiagnosticRecord);
	return {
		pendingApprovalCount: pendingApprovals.size,
		openTurnCount: activeTurns.size,
		emptyResponseCount,
		mojibakeCount,
		errorCount,
		latestStatus: latestStatus ? compactRuntimeDiagnosticRecord(latestStatus) : null,
		latestDone: latestDone ? compactRuntimeDiagnosticRecord(latestDone) : null,
		latestError: latestError ? compactRuntimeDiagnosticRecord(latestError) : null,
		latestApproval: latestApproval ? compactRuntimeDiagnosticRecord(latestApproval) : null,
		recentImportant,
		issues,
	};
}

function getSettingsPath() {
	const overriddenPath = String(process.env.PDF_AI_CLAUDIAN_SETTINGS_PATH || '').trim();
	if (overriddenPath) {
		return path.resolve(overriddenPath);
	}
	const baseDir = app?.getPath ? app.getPath('userData') : path.join(os.homedir(), '.pdf-ai-reader');
	return path.join(baseDir, 'claudian-sidebar', 'settings.json');
}

function readJsonFile(filePath, fallback) {
	try {
		const raw = readTextFileLimited(filePath, SETTINGS_JSON_MAX_BYTES);
		if (raw === null) {
			return fallback;
		}
		return JSON.parse(raw);
	}

	catch {
		return fallback;
	}
}

function writeJsonFile(filePath, value) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

const DEFAULT_MCP_SERVER_META = Object.freeze({
	enabled: true,
	contextSaving: true,
});
const MCP_SERVER_NAME_PATTERN = /^[A-Za-z0-9._-]{1,80}$/u;
const MCP_TOOL_NAME_PATTERN = /^[A-Za-z0-9._-]{1,128}$/u;

function getClaudeMcpConfigPath(workspace) {
	const root = String(workspace || '').trim();
	return root ? path.join(root, '.claude', 'mcp.json') : '';
}

function parseHttpMcpUrl(value) {
	try {
		const url = new URL(String(value || '').trim());
		return (url.protocol === 'http:' || url.protocol === 'https:') ? url.toString() : '';
	}
	catch {
		return '';
	}
}

function normalizeMcpHeaders(headers) {
	if (!isRecord(headers)) {
		return undefined;
	}
	const normalized = {};
	for (const [key, value] of Object.entries(headers)) {
		const name = String(key || '').trim();
		if (!name || /[\r\n:]/u.test(name)) {
			continue;
		}
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			normalized[name] = String(value);
		}
	}
	return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeMcpEnv(env) {
	if (!isRecord(env)) {
		return undefined;
	}
	const normalized = {};
	for (const [key, value] of Object.entries(env)) {
		if (!isValidEnvName(key)) {
			continue;
		}
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			normalized[key] = String(value);
		}
	}
	return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeMcpConfig(config) {
	if (!config || typeof config !== 'object' || Array.isArray(config)) {
		return null;
	}
	if (typeof config.command === 'string' && config.command.trim()) {
		const normalized = { ...config, command: config.command.trim() };
		if (Array.isArray(config.args)) {
			normalized.args = config.args.map((arg) => String(arg));
		}
		const env = normalizeMcpEnv(config.env);
		if (env) normalized.env = env;
		else delete normalized.env;
		return normalized;
	}
	if (typeof config.url === 'string' && config.url.trim()) {
		const url = parseHttpMcpUrl(config.url);
		if (!url) {
			return null;
		}
		const normalized = { ...config, url };
		const headers = normalizeMcpHeaders(config.headers);
		if (headers) normalized.headers = headers;
		else delete normalized.headers;
		return normalized;
	}
	return null;
}

function isValidMcpConfig(config) {
	return Boolean(normalizeMcpConfig(config));
}

function normalizeManagedMcpServer(server) {
	const name = String(server?.name || '').trim();
	const config = server?.config && typeof server.config === 'object' && !Array.isArray(server.config)
		? normalizeMcpConfig(server.config)
		: null;
	if (!MCP_SERVER_NAME_PATTERN.test(name) || !config) {
		return null;
	}
	const disabledTools = Array.isArray(server.disabledTools)
		? server.disabledTools.map((tool) => String(tool || '').trim()).filter((tool) => MCP_TOOL_NAME_PATTERN.test(tool))
		: [];
	return {
		name,
		config,
		enabled: server.enabled !== false,
		contextSaving: server.contextSaving !== false,
		disabledTools,
		description: String(server.description || ''),
	};
}

function loadClaudeMcpServers(workspace) {
	const filePath = getClaudeMcpConfigPath(workspace);
	if (!filePath || !fs.existsSync(filePath)) {
		return { exists: false, path: filePath, servers: [] };
	}
	const file = readJsonFile(filePath, {});
	const rawServers = file && typeof file.mcpServers === 'object' && !Array.isArray(file.mcpServers)
		? file.mcpServers
		: {};
	const metaServers = file?._claudian && typeof file._claudian === 'object' && file._claudian.servers && typeof file._claudian.servers === 'object'
		? file._claudian.servers
		: {};
	const servers = [];
	for (const [name, config] of Object.entries(rawServers)) {
		if (!isValidMcpConfig(config)) {
			continue;
		}
		const meta = metaServers[name] && typeof metaServers[name] === 'object' ? metaServers[name] : {};
		servers.push(normalizeManagedMcpServer({
			name,
			config,
			enabled: meta.enabled ?? DEFAULT_MCP_SERVER_META.enabled,
			contextSaving: meta.contextSaving ?? DEFAULT_MCP_SERVER_META.contextSaving,
			disabledTools: Array.isArray(meta.disabledTools) ? meta.disabledTools : [],
			description: meta.description || '',
		}));
	}
	return { exists: true, path: filePath, servers: servers.filter(Boolean) };
}

function saveClaudeMcpServers(workspace, servers) {
	const filePath = getClaudeMcpConfigPath(workspace);
	if (!filePath) {
		throw new Error('Workspace is required to save Claude MCP servers');
	}
	const normalizedServers = (Array.isArray(servers) ? servers : [])
		.map(normalizeManagedMcpServer)
		.filter(Boolean);
	const mcpServers = {};
	const claudianServers = {};
	for (const server of normalizedServers) {
		mcpServers[server.name] = server.config;
		const meta = {};
		if (server.enabled !== DEFAULT_MCP_SERVER_META.enabled) {
			meta.enabled = server.enabled;
		}
		if (server.contextSaving !== DEFAULT_MCP_SERVER_META.contextSaving) {
			meta.contextSaving = server.contextSaving;
		}
		if (server.disabledTools.length > 0) {
			meta.disabledTools = server.disabledTools;
		}
		if (server.description) {
			meta.description = server.description;
		}
		if (Object.keys(meta).length > 0) {
			claudianServers[server.name] = meta;
		}
	}
	const existing = readJsonFile(filePath, {});
	const file = existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {};
	file.mcpServers = mcpServers;
	const existingClaudian = file._claudian && typeof file._claudian === 'object' && !Array.isArray(file._claudian)
		? { ...file._claudian }
		: {};
	if (Object.keys(claudianServers).length > 0) {
		file._claudian = { ...existingClaudian, servers: claudianServers };
	}
	else {
		delete existingClaudian.servers;
		if (Object.keys(existingClaudian).length > 0) {
			file._claudian = existingClaudian;
		}
		else {
			delete file._claudian;
		}
	}
	writeJsonFile(filePath, file);
	return { path: filePath, servers: normalizedServers };
}

function getMcpServerType(config) {
	if (config?.type === 'sse') return 'sse';
	if (config?.type === 'http') return 'http';
	if (typeof config?.url === 'string') return 'http';
	return 'stdio';
}

function splitCommandString(command) {
	const parts = [];
	let current = '';
	let inQuote = false;
	let quoteChar = '';
	for (const char of String(command || '')) {
		if ((char === '"' || char === "'") && !inQuote) {
			inQuote = true;
			quoteChar = char;
			continue;
		}
		if (char === quoteChar && inQuote) {
			inQuote = false;
			quoteChar = '';
			continue;
		}
		if (/\s/.test(char) && !inQuote) {
			if (current) {
				parts.push(current);
				current = '';
			}
			continue;
		}
		current += char;
	}
	if (current) {
		parts.push(current);
	}
	return parts;
}

function parseMcpCommand(command, providedArgs) {
	if (Array.isArray(providedArgs) && providedArgs.length > 0) {
		return { cmd: String(command || ''), args: providedArgs.map(String) };
	}
	const parts = splitCommandString(command);
	return { cmd: parts[0] || '', args: parts.slice(1) };
}

function safeMcpTools(tools) {
	return (Array.isArray(tools) ? tools : []).map((tool) => ({
		name: String(tool?.name || ''),
		description: typeof tool?.description === 'string' ? tool.description : '',
		inputSchema: isRecord(tool?.inputSchema) ? tool.inputSchema : undefined,
	})).filter((tool) => tool.name);
}

async function testManagedMcpServer(server) {
	const normalized = normalizeManagedMcpServer(server);
	if (!normalized) {
		return { success: false, tools: [], error: 'Invalid MCP server configuration' };
	}
	let client = null;
	try {
		const { Client } = require('@modelcontextprotocol/sdk/client');
		let transport = null;
		const type = getMcpServerType(normalized.config);
		if (type === 'stdio') {
			const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
			const config = normalized.config || {};
			const parsed = parseMcpCommand(config.command, config.args);
			if (!parsed.cmd) {
				return { success: false, tools: [], error: 'Missing command' };
			}
			transport = new StdioClientTransport({
				command: parsed.cmd,
				args: parsed.args,
				env: withUtf8ProcessEnv({ ...process.env, ...(isRecord(config.env) ? config.env : {}) }),
				stderr: 'ignore',
			});
		}
		else {
			const config = normalized.config || {};
			const url = new URL(String(config.url || ''));
			const options = isRecord(config.headers) ? { requestInit: { headers: config.headers } } : {};
			if (type === 'sse') {
				const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
				transport = new SSEClientTransport(url, options);
			}
			else {
				const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
				transport = new StreamableHTTPClientTransport(url, options);
			}
		}

		client = new Client({ name: 'claudian-sidebar-tester', version: '0.1.0' });
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10000);
		try {
			await client.connect(transport, { signal: controller.signal });
			const serverVersion = typeof client.getServerVersion === 'function' ? client.getServerVersion() : null;
			let tools = [];
			try {
				const result = await client.listTools(undefined, { signal: controller.signal });
				tools = safeMcpTools(result?.tools);
			}
			catch {
				tools = [];
			}
			return {
				success: true,
				serverName: serverVersion?.name || '',
				serverVersion: serverVersion?.version || '',
				tools,
			};
		}
		catch (error) {
			return {
				success: false,
				tools: [],
				error: controller.signal.aborted
					? 'Connection timeout (10s)'
					: (error instanceof Error ? error.message : String(error)),
			};
		}
		finally {
			clearTimeout(timeout);
			try {
				await client.close();
			}
			catch {
				// Ignore close errors.
			}
		}
	}
	catch (error) {
		try {
			await client?.close?.();
		}
		catch {
			// Ignore close errors.
		}
		return {
			success: false,
			tools: [],
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

const CLAUDE_COMMANDS_PATH = '.claude/commands';
const CLAUDE_SKILLS_PATH = '.claude/skills';
const CLAUDE_AGENTS_PATH = '.claude/agents';
const CLAUDE_PROJECT_SETTINGS_PATH = '.claude/settings.json';
const CLAUDE_CODE_SETTINGS_SCHEMA = 'https://json.schemastore.org/claude-code-settings.json';
const DEFAULT_CLAUDE_CODE_PERMISSIONS = {
	allow: [],
	deny: [],
	ask: [],
};
const FALLBACK_CLAUDE_AGENT_NAMES = ['Explore', 'Plan', 'Bash', 'general-purpose'];
const FALLBACK_CLAUDE_AGENT_DESCRIPTIONS = {
	Explore: 'Fast codebase exploration and search',
	Plan: 'Implementation planning and architecture',
	Bash: 'Command execution specialist',
	'general-purpose': 'Multi-step tasks and complex workflows',
};
const CODEX_VAULT_SKILLS_PATH = '.codex/skills';
const AGENTS_VAULT_SKILLS_PATH = '.agents/skills';
const CODEX_AGENTS_PATH = '.codex/agents';
const CODEX_SKILL_ROOT_PATHS = Object.freeze({
	'vault-codex': CODEX_VAULT_SKILLS_PATH,
});
const LEGACY_CODEX_SKILL_ROOT_PATHS = Object.freeze({
	'vault-codex': CODEX_VAULT_SKILLS_PATH,
	'vault-agents': AGENTS_VAULT_SKILLS_PATH,
});
const CODEX_SUBAGENT_KNOWN_KEYS = new Set([
	'name',
	'description',
	'developer_instructions',
	'nickname_candidates',
	'model',
	'model_reasoning_effort',
	'sandbox_mode',
]);

function resolveProviderSkillRoot(workspace, options = {}) {
	const configured = String(options.providerSkillRoot || '').trim();
	return configured ? path.resolve(configured) : resolveWorkspaceRoot(workspace);
}

function resolveWorkspaceRoot(workspace) {
	const root = String(workspace || '').trim();
	if (!root) {
		throw new Error('Workspace is required');
	}
	return path.resolve(root);
}

function workspacePath(workspace, relativePath) {
	const root = resolveWorkspaceRoot(workspace);
	const parts = String(relativePath || '').split(/[\\/]+/).filter(Boolean);
	const target = path.resolve(root, ...parts);
	const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
	if (target !== root && !target.startsWith(rootWithSep)) {
		throw new Error(`Refusing to access path outside workspace: ${relativePath}`);
	}
	return target;
}

function stripLocalPathDecorations(value) {
	let text = String(value || '').trim();
	if (!text) return '';
	const hashIndex = text.indexOf('#');
	const queryIndex = text.indexOf('?');
	const cutIndexes = [hashIndex, queryIndex].filter((index) => index >= 0);
	if (cutIndexes.length > 0) {
		text = text.slice(0, Math.min(...cutIndexes));
	}
	try {
		return decodeURIComponent(text);
	}
	catch {
		return text;
	}
}

function hasPathControlCharacters(value) {
	return /[\u0000-\u001f\u007f]/u.test(String(value || ''));
}

function parseRuntimeExternalUrl(value) {
	const rawTarget = String(value || '').trim();
	if (!rawTarget) {
		return null;
	}
	try {
		const parsed = new URL(rawTarget);
		return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
			? parsed.toString()
			: null;
	}
	catch {
		return null;
	}
}

function resolveOpenPathTarget(target, workspace, defaultWorkspace = process.cwd()) {
	const rawTarget = String(target || '').trim();
	if (!rawTarget) {
		throw new Error('Path is required');
	}
	if (hasPathControlCharacters(rawTarget)) {
		throw new Error('Path contains invalid control characters');
	}
	const externalUrl = parseRuntimeExternalUrl(rawTarget);
	if (externalUrl) {
		return { type: 'external', target: externalUrl };
	}
	if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/u.test(rawTarget) && !/^file:/i.test(rawTarget) && !/^[a-zA-Z]:[\\/]/u.test(rawTarget)) {
		throw new Error('Unsupported path or URL protocol');
	}
	let localPath = rawTarget;
	if (/^file:/i.test(localPath)) {
		try {
			localPath = fileURLToPath(localPath);
		}
		catch {
			localPath = localPath.replace(/^file:\/+/i, '');
		}
	}
	localPath = stripLocalPathDecorations(localPath.replace(/^["']+|["']+$/g, ''));
	if (!localPath) {
		throw new Error('Path is required');
	}
	if (hasPathControlCharacters(localPath)) {
		throw new Error('Path contains invalid control characters');
	}
	if (/^~[\\/]/.test(localPath)) {
		localPath = path.join(os.homedir(), localPath.slice(2));
	}
	const base = String(workspace || defaultWorkspace || process.cwd()).trim() || process.cwd();
	const resolvedPath = path.isAbsolute(localPath)
		? path.resolve(localPath)
		: path.resolve(base, localPath);
	return { type: 'path', target: resolvedPath };
}

function resolveBangBashWorkspace(requestedWorkspace, settingsWorkspace, defaultWorkspace = process.cwd()) {
	const root = path.resolve(String(settingsWorkspace || defaultWorkspace || process.cwd()).trim() || process.cwd());
	const requested = String(requestedWorkspace || '').trim();
	if (!requested) {
		return root;
	}
	if (hasPathControlCharacters(requested)) {
		throw new Error('Workspace contains invalid control characters');
	}
	const resolved = path.isAbsolute(requested)
		? path.resolve(requested)
		: path.resolve(root, requested);
	if (!isPathInsideOrSamePath(resolved, root)) {
		throw new Error('Bang-bash workspace must be inside the active workspace');
	}
	return resolved;
}

function toVaultPath(baseRelativePath, absolutePath, workspace) {
	const base = workspacePath(workspace, baseRelativePath);
	return `${baseRelativePath}/${path.relative(base, absolutePath).split(path.sep).join('/')}`;
}

function listFilesRecursiveAbsolute(root, options = {}) {
	const maxFiles = Math.max(1, Number(options.maxFiles || PROVIDER_ASSET_SCAN_MAX_FILES) || PROVIDER_ASSET_SCAN_MAX_FILES);
	const maxDepth = Math.max(1, Number(options.maxDepth || PROVIDER_ASSET_SCAN_MAX_DEPTH) || PROVIDER_ASSET_SCAN_MAX_DEPTH);
	const files = [];
	function walk(dir, depth = 0) {
		if (files.length >= maxFiles || depth > maxDepth) {
			return;
		}
		let entries = [];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		}
		catch {
			return;
		}
		for (const entry of entries) {
			if (files.length >= maxFiles) {
				break;
			}
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(fullPath, depth + 1);
			}
			else if (entry.isFile()) {
				files.push(fullPath);
			}
		}
	}
	walk(root);
	return files;
}

function listImmediateFilesAbsolute(root) {
	try {
		return fs.readdirSync(root, { withFileTypes: true })
			.filter((entry) => entry.isFile())
			.slice(0, IMMEDIATE_DIRECTORY_SCAN_MAX_ENTRIES)
			.map((entry) => path.join(root, entry.name));
	}
	catch {
		return [];
	}
}

function listImmediateFoldersAbsolute(root) {
	try {
		return fs.readdirSync(root, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.slice(0, IMMEDIATE_DIRECTORY_SCAN_MAX_ENTRIES)
			.map((entry) => path.join(root, entry.name));
	}
	catch {
		return [];
	}
}

function deleteFileAndMaybeFolder(filePath, folderPath, options = {}) {
	const managedRoot = options.managedRoot ? path.resolve(options.managedRoot) : '';
	if (managedRoot) {
		assertPathInsideOrSamePath(filePath, managedRoot, 'provider asset');
		if (folderPath) {
			assertPathInsideOrSamePath(folderPath, managedRoot, 'provider asset folder');
		}
	}
	try {
		fs.rmSync(filePath, { force: true });
	}
	catch {
		// Non-critical: the file may have been removed by another process.
	}
	if (folderPath) {
		try {
			fs.rmdirSync(folderPath);
		}
		catch {
			// Keep non-empty folders intact.
		}
	}
}

function deleteFileAndEmptyParentFolders(filePath, stopFolder) {
	deleteFileAndMaybeFolder(filePath, '', { managedRoot: stopFolder });
	const stop = path.resolve(stopFolder);
	const stopWithSep = stop.endsWith(path.sep) ? stop : `${stop}${path.sep}`;
	let current = path.dirname(path.resolve(filePath));
	while (current !== stop && current.startsWith(stopWithSep)) {
		try {
			fs.rmdirSync(current);
		}
		catch {
			break;
		}
		const parent = path.dirname(current);
		if (parent === current) break;
		current = parent;
	}
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const VALID_FRONTMATTER_KEY = /^[\w-]+$/;

function unquoteFrontmatterValue(value) {
	if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
		return value.slice(1, -1).replace(/\\"/g, '"');
	}
	return value;
}

function parseScalarValue(rawValue) {
	const value = String(rawValue || '').trim();
	if (value === 'true') return true;
	if (value === 'false') return false;
	if (value === 'null' || value === '') return null;
	if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
	if (value.startsWith('[') && value.endsWith(']')) {
		try {
			const parsed = JSON.parse(value.replace(/'/g, '"'));
			if (Array.isArray(parsed)) return parsed;
		}
		catch {
			return value.slice(1, -1).split(',').map((item) => unquoteFrontmatterValue(item.trim())).filter(Boolean);
		}
	}
	if (value.startsWith('{') && value.endsWith('}')) {
		try {
			return JSON.parse(value);
		}
		catch {
			return unquoteFrontmatterValue(value);
		}
	}
	return unquoteFrontmatterValue(value);
}

function parseFrontmatterFallback(yamlContent) {
	const result = {};
	const lines = String(yamlContent || '').split(/\r?\n/);
	let currentListKey = null;
	let currentList = [];
	let pendingBareKey = null;

	function flushList() {
		if (!currentListKey) return;
		result[currentListKey] = currentList;
		currentListKey = null;
		currentList = [];
	}

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		if (currentListKey) {
			if (trimmed.startsWith('- ')) {
				currentList.push(parseScalarValue(trimmed.slice(2)));
				continue;
			}
			flushList();
		}

		if (pendingBareKey) {
			if (trimmed.startsWith('- ')) {
				currentListKey = pendingBareKey;
				currentList = [parseScalarValue(trimmed.slice(2))];
				pendingBareKey = null;
				continue;
			}
			result[pendingBareKey] = '';
			pendingBareKey = null;
		}

		const colonIndex = trimmed.indexOf(':');
		if (colonIndex === -1) continue;
		const key = trimmed.slice(0, colonIndex).trim();
		if (!VALID_FRONTMATTER_KEY.test(key)) continue;
		const rest = trimmed.slice(colonIndex + 1).trim();
		if (!rest) {
			pendingBareKey = key;
			continue;
		}
		result[key] = parseScalarValue(rest);
	}

	if (pendingBareKey) {
		result[pendingBareKey] = '';
	}
	flushList();
	return result;
}

function parseFrontmatter(content) {
	const match = String(content || '').match(FRONTMATTER_PATTERN);
	if (!match) return null;
	const frontmatter = parseFrontmatterFallback(match[1]);
	return { frontmatter, body: match[2] || '' };
}

function extractString(fm, key) {
	const value = fm?.[key];
	if (typeof value === 'string' && value.length > 0) return value;
	if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
		return value.map((item) => `[${item}]`).join(' ');
	}
	return undefined;
}

function normalizeStringArray(value) {
	if (value === undefined || value === null) return undefined;
	if (Array.isArray(value)) {
		const items = value.map((item) => String(item || '').trim()).filter(Boolean);
		return items.length ? items : undefined;
	}
	if (typeof value === 'string') {
		const items = value.split(',').map((item) => item.trim()).filter(Boolean);
		return items.length ? items : undefined;
	}
	return undefined;
}

function extractStringArray(fm, key) {
	return normalizeStringArray(fm?.[key]);
}

function extractBoolean(fm, key) {
	return typeof fm?.[key] === 'boolean' ? fm[key] : undefined;
}

function yamlString(value) {
	const text = String(value || '');
	if (
		text.includes(':')
		|| text.includes('#')
		|| text.includes('\n')
		|| text.startsWith(' ')
		|| text.endsWith(' ')
		|| text.startsWith('[')
		|| text.startsWith('{')
	) {
		return `"${text.replace(/"/g, '\\"')}"`;
	}
	return text || '""';
}

function parseSlashCommandContent(content) {
	const parsed = parseFrontmatter(content);
	if (!parsed) {
		return { promptContent: String(content || '') };
	}
	const fm = parsed.frontmatter || {};
	return {
		description: extractString(fm, 'description'),
		argumentHint: extractString(fm, 'argument-hint') || extractString(fm, 'argumentHint'),
		allowedTools: extractStringArray(fm, 'allowed-tools') || extractStringArray(fm, 'allowedTools'),
		model: extractString(fm, 'model'),
		promptContent: parsed.body,
		disableModelInvocation: extractBoolean(fm, 'disable-model-invocation') ?? extractBoolean(fm, 'disableModelInvocation'),
		userInvocable: extractBoolean(fm, 'user-invocable') ?? extractBoolean(fm, 'userInvocable'),
		context: extractString(fm, 'context') === 'fork' ? 'fork' : undefined,
		agent: extractString(fm, 'agent'),
		hooks: fm.hooks && typeof fm.hooks === 'object' && !Array.isArray(fm.hooks) ? fm.hooks : undefined,
	};
}

function serializeSlashCommandMarkdown(command, body) {
	const lines = ['---'];
	if (command.name) lines.push(`name: ${command.name}`);
	if (command.description) lines.push(`description: ${yamlString(command.description)}`);
	if (command.argumentHint) lines.push(`argument-hint: ${yamlString(command.argumentHint)}`);
	if (Array.isArray(command.allowedTools) && command.allowedTools.length > 0) {
		lines.push('allowed-tools:');
		for (const tool of command.allowedTools) {
			lines.push(`  - ${yamlString(tool)}`);
		}
	}
	if (command.model) lines.push(`model: ${command.model}`);
	if (command.disableModelInvocation !== undefined) lines.push(`disable-model-invocation: ${command.disableModelInvocation}`);
	if (command.userInvocable !== undefined) lines.push(`user-invocable: ${command.userInvocable}`);
	if (command.context) lines.push(`context: ${command.context}`);
	if (command.agent) lines.push(`agent: ${command.agent}`);
	if (command.hooks !== undefined) lines.push(`hooks: ${JSON.stringify(command.hooks)}`);
	if (lines.length === 1) lines.push('');
	lines.push('---');
	lines.push(String(body || command.content || ''));
	return lines.join('\n');
}

function firstParagraph(value) {
	return String(value || '').split(/\n\s*\n/).map((line) => line.trim()).find(Boolean) || '';
}

function commandRelativeNameFromPath(baseRelativePath, absolutePath, workspace) {
	const base = workspacePath(workspace, baseRelativePath);
	return path.relative(base, absolutePath).split(path.sep).join('/').replace(/\.md$/i, '');
}

function commandIdFromRelativeName(relativeName) {
	const escaped = String(relativeName || '')
		.replace(/-/g, '-_')
		.replace(/\//g, '--');
	return `cmd-${escaped}`;
}

function safeCommandFileName(name) {
	return `${String(name || 'command').replace(/[^a-zA-Z0-9_/-]/g, '-')}.md`;
}

function safeFolderName(name) {
	return String(name || 'item').replace(/[^a-zA-Z0-9_-]/g, '-');
}

function isSafeImmediateFileName(fileName, extension = '') {
	const value = String(fileName || '').trim();
	if (!value || value !== path.basename(value) || /[\\/]/.test(value)) {
		return false;
	}
	return !extension || value.toLowerCase().endsWith(extension.toLowerCase());
}

function safeDecodeURIComponent(value) {
	try {
		return decodeURIComponent(String(value || ''));
	}
	catch {
		return '';
	}
}

function isDeletedProviderAsset(entry) {
	return entry?.deleted === true || entry?._deleted === true;
}

function resolveWorkspaceAssetPath(workspace, assetPath) {
	const value = String(assetPath || '').trim();
	if (!value) return '';
	if (path.isAbsolute(value)) return value;
	return workspacePath(workspace, value);
}

function providerAssetFilePath(workspace, baseRelativePath, entry, fallbackName, fileNameBuilder) {
	const managedRoot = workspacePath(workspace, baseRelativePath);
	const existingPath = resolveWorkspaceAssetPath(workspace, entry?.filePath);
	if (existingPath) return assertPathInsideOrSamePath(existingPath, managedRoot, 'provider asset');
	return workspacePath(workspace, `${baseRelativePath}/${fileNameBuilder(fallbackName)}`);
}

function parseClaudeCommandFile(content, relativeName, vaultPath, overrides = {}) {
	const parsed = parseSlashCommandContent(content);
	return {
		id: overrides.id || commandIdFromRelativeName(relativeName),
		providerId: 'claude',
		kind: 'command',
		name: relativeName,
		description: parsed.description || firstParagraph(parsed.promptContent),
		argumentHint: parsed.argumentHint || '',
		allowedTools: parsed.allowedTools,
		model: parsed.model || '',
		content: parsed.promptContent,
		disableModelInvocation: parsed.disableModelInvocation === true,
		userInvocable: parsed.userInvocable === false ? false : undefined,
		context: parsed.context,
		agent: parsed.agent || '',
		scope: overrides.scope || 'vault',
		source: overrides.source || 'user',
		isEditable: overrides.isEditable !== undefined ? overrides.isEditable : true,
		isDeletable: overrides.isDeletable !== undefined ? overrides.isDeletable : true,
		displayPrefix: '/',
		insertPrefix: '/',
		persistenceKey: overrides.persistenceKey || `claude-command:${encodeURIComponent(relativeName)}`,
		filePath: vaultPath,
		pluginName: overrides.pluginName,
		hooks: parsed.hooks,
	};
}

function parseClaudeSkillFile(content, skillName, vaultPath, overrides = {}) {
	const parsed = parseSlashCommandContent(content);
	return {
		id: overrides.id || `skill-${skillName}`,
		providerId: 'claude',
		kind: 'skill',
		name: skillName,
		description: parsed.description || firstParagraph(parsed.promptContent),
		argumentHint: parsed.argumentHint || '',
		allowedTools: parsed.allowedTools,
		model: parsed.model || '',
		content: parsed.promptContent,
		disableModelInvocation: parsed.disableModelInvocation === true,
		userInvocable: parsed.userInvocable === false ? false : undefined,
		context: parsed.context,
		agent: parsed.agent || '',
		scope: overrides.scope || 'vault',
		source: overrides.source || 'user',
		isEditable: overrides.isEditable !== undefined ? overrides.isEditable : true,
		isDeletable: overrides.isDeletable !== undefined ? overrides.isDeletable : true,
		displayPrefix: '/',
		insertPrefix: '/',
		persistenceKey: overrides.persistenceKey || `claude-skill:${encodeURIComponent(skillName)}`,
		filePath: vaultPath,
		pluginName: overrides.pluginName,
		hooks: parsed.hooks,
	};
}

function normalizeClaudeRuntimeCommandName(value) {
	return String(value || '')
		.trim()
		.replace(/^[$/]+/, '')
		.replace(/\s+/g, '-');
}

function claudeRuntimeCommandFromInitEntry(entry, kind) {
	const source = entry && typeof entry === 'object' ? entry : { name: entry };
	const name = normalizeClaudeRuntimeCommandName(
		source.name || source.command || source.id || source.title,
	);
	if (!name) return null;
	const entryKind = kind === 'skill' ? 'skill' : 'command';
	const description = String(
		source.description || source.desc || source.summary || (entryKind === 'skill' ? 'Claude skill' : 'Claude runtime command'),
	).trim();
	const argumentHint = source.argumentHint || source.argument_hint || source.args || source.usage || '';
	return {
		id: `sdk:${entryKind}:${name}`,
		providerId: 'claude',
		kind: entryKind,
		name,
		description,
		argumentHint: String(argumentHint || '').trim(),
		content: '',
		scope: 'runtime',
		source: 'sdk',
		isEditable: false,
		isDeletable: false,
		displayPrefix: '/',
		insertPrefix: '/',
	};
}

function extractClaudeRuntimeCommandsFromInitMessage(message) {
	const commands = [];
	const seen = new Set();
	const add = (entry) => {
		if (!entry?.name) return;
		const key = `${entry.kind || 'command'}:${String(entry.name).toLowerCase()}`;
		if (seen.has(key)) return;
		seen.add(key);
		commands.push(entry);
	};
	for (const entry of Array.isArray(message?.slash_commands) ? message.slash_commands : []) {
		add(claudeRuntimeCommandFromInitEntry(entry, 'command'));
	}
	for (const entry of Array.isArray(message?.skills) ? message.skills : []) {
		add(claudeRuntimeCommandFromInitEntry(entry, 'skill'));
	}
	return commands;
}

function loadClaudeCommandAssets(workspace) {
	const root = workspacePath(workspace, CLAUDE_COMMANDS_PATH);
	const commands = [];
	for (const filePath of listFilesRecursiveAbsolute(root)) {
		if (!filePath.toLowerCase().endsWith('.md')) continue;
		try {
			const content = readTextFileLimited(filePath, PROVIDER_ASSET_TEXT_MAX_BYTES);
			if (content === null) continue;
			const relativeName = commandRelativeNameFromPath(CLAUDE_COMMANDS_PATH, filePath, workspace);
			commands.push(parseClaudeCommandFile(content, relativeName, toVaultPath(CLAUDE_COMMANDS_PATH, filePath, workspace)));
		}
		catch {
			// Skip malformed command files.
		}
	}
	return commands;
}

function loadClaudeSkillAssets(workspace, options = {}) {
	const skillRoot = resolveProviderSkillRoot(workspace, options);
	const root = workspacePath(skillRoot, CLAUDE_SKILLS_PATH);
	const skills = [];
	for (const folder of listImmediateFoldersAbsolute(root)) {
		const skillName = path.basename(folder);
		const filePath = path.join(folder, 'SKILL.md');
		if (!fs.existsSync(filePath)) continue;
		try {
			const content = readTextFileLimited(filePath, PROVIDER_ASSET_TEXT_MAX_BYTES);
			if (content === null) continue;
			skills.push(parseClaudeSkillFile(content, skillName, `${CLAUDE_SKILLS_PATH}/${skillName}/SKILL.md`));
		}
		catch {
			// Skip malformed skill files.
		}
	}
	return skills;
}

function loadClaudeCommandAssetsFromRoot(root, options = {}) {
	const commands = [];
	for (const filePath of listFilesRecursiveAbsolute(root)) {
		if (!filePath.toLowerCase().endsWith('.md')) continue;
		try {
			const content = readTextFileLimited(filePath, PROVIDER_ASSET_TEXT_MAX_BYTES);
			if (content === null) continue;
			const relativeName = path.relative(root, filePath).split(path.sep).join('/').replace(/\.md$/i, '');
			commands.push(parseClaudeCommandFile(content, relativeName, filePath, {
				id: `${options.idPrefix || 'runtime-command'}:${encodeURIComponent(relativeName)}`,
				scope: options.scope || 'runtime',
				source: options.source || 'sdk',
				isEditable: false,
				isDeletable: false,
				persistenceKey: `${options.persistencePrefix || 'claude-runtime-command'}:${encodeURIComponent(relativeName)}`,
				pluginName: options.pluginName,
			}));
		}
		catch {
			// Runtime command discovery is best-effort.
		}
	}
	return commands;
}

function loadClaudeSkillAssetsFromRoot(root, options = {}) {
	const skills = [];
	for (const folder of listImmediateFoldersAbsolute(root)) {
		const skillName = path.basename(folder);
		const filePath = path.join(folder, 'SKILL.md');
		if (!fs.existsSync(filePath)) continue;
		try {
			const content = readTextFileLimited(filePath, PROVIDER_ASSET_TEXT_MAX_BYTES);
			if (content === null) continue;
			skills.push(parseClaudeSkillFile(content, skillName, filePath, {
				id: `${options.idPrefix || 'runtime-skill'}:${encodeURIComponent(skillName)}`,
				scope: options.scope || 'runtime',
				source: options.source || 'sdk',
				isEditable: false,
				isDeletable: false,
				persistenceKey: `${options.persistencePrefix || 'claude-runtime-skill'}:${encodeURIComponent(skillName)}`,
				pluginName: options.pluginName,
			}));
		}
		catch {
			// Runtime skill discovery is best-effort.
		}
	}
	return skills;
}

function parseAgentFile(content, meta = {}) {
	const parsed = parseFrontmatter(content);
	if (!parsed) return null;
	const fm = parsed.frontmatter || {};
	const name = typeof fm.name === 'string' ? fm.name.trim() : '';
	const description = typeof fm.description === 'string' ? fm.description.trim() : '';
	if (!name || !description) return null;
	const known = new Set(['name', 'description', 'tools', 'disallowedTools', 'model', 'skills', 'permissionMode', 'hooks']);
	const extraFrontmatter = {};
	for (const [key, value] of Object.entries(fm)) {
		if (!known.has(key)) extraFrontmatter[key] = value;
	}
	const model = typeof fm.model === 'string' && ['sonnet', 'opus', 'haiku', 'inherit'].includes(fm.model.toLowerCase().trim())
		? fm.model.toLowerCase().trim()
		: 'inherit';
	return {
		id: String(meta.id || name),
		name,
		description,
		prompt: parsed.body.trim(),
		model,
		tools: normalizeStringArray(fm.tools),
		disallowedTools: normalizeStringArray(fm.disallowedTools),
		skills: extractStringArray(fm, 'skills'),
		permissionMode: typeof fm.permissionMode === 'string' ? fm.permissionMode : undefined,
		hooks: fm.hooks && typeof fm.hooks === 'object' && !Array.isArray(fm.hooks) ? fm.hooks : undefined,
		extraFrontmatter: Object.keys(extraFrontmatter).length ? extraFrontmatter : undefined,
		source: meta.source || 'vault',
		filePath: meta.filePath,
		pluginName: meta.pluginName,
	};
}

function serializeAgentMarkdown(agent) {
	const lines = ['---'];
	lines.push(`name: ${agent.name}`);
	lines.push(`description: ${yamlString(agent.description)}`);
	function pushList(key, values) {
		if (!Array.isArray(values) || values.length === 0) return;
		lines.push(`${key}:`);
		for (const value of values) {
			lines.push(`  - ${yamlString(value)}`);
		}
	}
	pushList('tools', agent.tools);
	pushList('disallowedTools', agent.disallowedTools);
	if (agent.model && agent.model !== 'inherit') lines.push(`model: ${agent.model}`);
	if (agent.permissionMode) lines.push(`permissionMode: ${agent.permissionMode}`);
	pushList('skills', agent.skills);
	if (agent.hooks !== undefined) lines.push(`hooks: ${JSON.stringify(agent.hooks)}`);
	if (agent.extraFrontmatter && typeof agent.extraFrontmatter === 'object') {
		for (const [key, value] of Object.entries(agent.extraFrontmatter)) {
			if (VALID_FRONTMATTER_KEY.test(key)) {
				lines.push(`${key}: ${JSON.stringify(value)}`);
			}
		}
	}
	lines.push('---');
	lines.push(String(agent.prompt || ''));
	return lines.join('\n');
}

function normalizeClaudePluginAgentNamespace(name) {
	return String(name || '').toLowerCase().replace(/\s+/g, '-');
}

function makeFallbackClaudeAgent(name) {
	return {
		id: name,
		name: name.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
		description: FALLBACK_CLAUDE_AGENT_DESCRIPTIONS[name] || '',
		prompt: '',
		model: 'inherit',
		source: 'builtin',
	};
}

function addUniqueAgent(agents, agent) {
	if (!agent || agents.some((existing) => existing.id === agent.id)) {
		return;
	}
	agents.push(agent);
}

function loadClaudeAgentsFromDirectory(root, metaForFile) {
	const agents = [];
	for (const filePath of listImmediateFilesAbsolute(root)) {
		if (!filePath.toLowerCase().endsWith('.md')) continue;
		try {
			const content = readTextFileLimited(filePath, PROVIDER_ASSET_TEXT_MAX_BYTES);
			if (content === null) continue;
			addUniqueAgent(agents, parseAgentFile(content, metaForFile(filePath)));
		}
		catch {
			// Skip malformed agent files.
		}
	}
	return agents;
}

function loadClaudePluginAgentAssets(plugins) {
	const agents = [];
	for (const plugin of Array.isArray(plugins) ? plugins : []) {
		if (plugin.enabled === false || !plugin.installPath) continue;
		const namespace = normalizeClaudePluginAgentNamespace(plugin.name || extractPluginName(plugin.id));
		const pluginAgents = loadClaudeAgentsFromDirectory(path.join(plugin.installPath, 'agents'), (filePath) => {
			let agentName = path.basename(filePath, path.extname(filePath));
			try {
				const content = readTextFileLimited(filePath, PROVIDER_ASSET_TEXT_MAX_BYTES);
				const parsed = content === null ? null : parseFrontmatter(content);
				if (typeof parsed?.frontmatter?.name === 'string' && parsed.frontmatter.name.trim()) {
					agentName = parsed.frontmatter.name.trim();
				}
			}
			catch {
				// parseAgentFile will skip malformed files.
			}
			return {
				id: `${namespace}:${agentName}`,
				source: 'plugin',
				pluginName: plugin.name || extractPluginName(plugin.id),
				filePath,
			};
		});
		for (const agent of pluginAgents) {
			addUniqueAgent(agents, agent);
		}
	}
	return agents;
}

function loadClaudeVaultAgentAssets(workspace) {
	return loadClaudeAgentsFromDirectory(workspacePath(workspace, CLAUDE_AGENTS_PATH), (filePath) => ({
		source: 'vault',
		filePath: `${CLAUDE_AGENTS_PATH}/${path.basename(filePath)}`,
	}));
}

function loadClaudeGlobalAgentAssets() {
	return loadClaudeAgentsFromDirectory(path.join(getClaudeHomeDir(), 'agents'), (filePath) => ({
		source: 'global',
		filePath,
	}));
}

function loadClaudeAgentAssets(workspace, plugins = null) {
	const agents = [];
	for (const name of FALLBACK_CLAUDE_AGENT_NAMES) {
		addUniqueAgent(agents, makeFallbackClaudeAgent(name));
	}
	for (const agent of loadClaudePluginAgentAssets(plugins || loadClaudePlugins(workspace))) {
		addUniqueAgent(agents, agent);
	}
	for (const agent of loadClaudeVaultAgentAssets(workspace)) {
		addUniqueAgent(agents, agent);
	}
	for (const agent of loadClaudeGlobalAgentAssets()) {
		addUniqueAgent(agents, agent);
	}
	return agents;
}

function normalizeCodexSkillRootId(rootId) {
	return 'vault-codex';
}

function codexSkillRootPath(rootId) {
	return CODEX_SKILL_ROOT_PATHS[normalizeCodexSkillRootId(rootId)];
}

function codexSkillLegacyRootPath(rootId) {
	return LEGACY_CODEX_SKILL_ROOT_PATHS[rootId] || CODEX_VAULT_SKILLS_PATH;
}

function resolveNativeCliHomeDir(options = {}) {
	const requested = String(options.homeDir || '').trim();
	return requested ? path.resolve(requested) : os.homedir();
}

function resolveNativeCliConfigDir(value, fallbackPath) {
	const requested = String(value || '').trim();
	return requested ? path.resolve(requested) : fallbackPath;
}

function getCodexHomeDir(options = {}) {
	const homeDir = resolveNativeCliHomeDir(options);
	return resolveNativeCliConfigDir(
		options.codexHome || process.env.CODEX_HOME,
		path.join(homeDir, '.codex'),
	);
}

function getClaudeConfigDir(options = {}) {
	const homeDir = resolveNativeCliHomeDir(options);
	return resolveNativeCliConfigDir(
		options.claudeConfigDir || process.env.CLAUDE_CONFIG_DIR,
		path.join(homeDir, '.claude'),
	);
}

function createCodexSkillPersistenceKey(rootId, currentName) {
	return ['codex-skill', normalizeCodexSkillRootId(rootId), currentName ? encodeURIComponent(currentName) : '']
		.filter(Boolean)
		.join(':');
}

function parseCodexSkillPersistenceKey(persistenceKey) {
	const text = String(persistenceKey || '');
	if (text === CODEX_VAULT_SKILLS_PATH) return { rootId: 'vault-codex' };
	if (text === AGENTS_VAULT_SKILLS_PATH) return { rootId: 'vault-agents' };
	const [prefix, rootId, encodedName] = text.split(':');
	if (prefix !== 'codex-skill') return null;
	if (rootId !== 'vault-codex' && rootId !== 'vault-agents') return null;
	return {
		rootId,
		currentName: encodedName ? safeDecodeURIComponent(encodedName) : undefined,
	};
}

function loadCodexSkillAssets(workspace, options = {}) {
	const skillRoot = resolveProviderSkillRoot(workspace, options);
	const skills = [];
	for (const [rootId, rootPath] of Object.entries(CODEX_SKILL_ROOT_PATHS)) {
		const root = workspacePath(skillRoot, rootPath);
		for (const folder of listImmediateFoldersAbsolute(root)) {
			const skillName = path.basename(folder);
			const filePath = path.join(folder, 'SKILL.md');
			if (!fs.existsSync(filePath)) continue;
			try {
				const content = readTextFileLimited(filePath, PROVIDER_ASSET_TEXT_MAX_BYTES);
				if (content === null) continue;
				const parsed = parseSlashCommandContent(content);
				skills.push({
					id: `codex-skill-${rootId}-${skillName}`,
					providerId: 'codex',
					kind: 'skill',
					name: skillName,
					description: parsed.description || firstParagraph(parsed.promptContent),
					content: parsed.promptContent,
					scope: 'vault',
					source: 'user',
					rootId,
					persistenceKey: createCodexSkillPersistenceKey(rootId, skillName),
					isEditable: true,
					isDeletable: true,
					displayPrefix: '$',
					insertPrefix: '$',
				});
			}
			catch {
				// Skip malformed Codex skill files.
			}
		}
	}
	return skills;
}

function codexRuntimeSkillDescription(skill) {
	return skill?.interface?.shortDescription
		|| skill?.shortDescription
		|| skill?.description
		|| undefined;
}

function normalizeCodexRuntimeSkill(scope, skill, options = {}) {
	const name = String(skill?.name || '').trim();
	if (!name) return null;
	const rawPathValue = String(skill?.path || skill?.filePath || '').trim();
	const mappedPathValue = typeof options.mapPath === 'function'
		? options.mapPath(rawPathValue)
		: rawPathValue;
	const pathValue = String(mappedPathValue || rawPathValue || '').trim();
	const runtimeScope = String(scope || skill?.scope || 'user').trim() || 'user';
	return {
		id: options.id || `codex-runtime-skill-${runtimeScope}-${encodeURIComponent(pathValue || name)}`,
		providerId: 'codex',
		kind: 'skill',
		name,
		description: codexRuntimeSkillDescription(skill) || '',
		content: '',
		scope: runtimeScope === 'repo' ? 'vault' : 'user',
		runtimeScope,
		source: 'runtime',
		path: pathValue,
		isEditable: false,
		isDeletable: false,
		displayPrefix: '$',
		insertPrefix: '$',
		enabled: skill?.enabled === true,
	};
}

function loadCodexRuntimeSkillAssetsFromAppServerResult(result, options = {}) {
	const entries = Array.isArray(result?.data) ? result.data : [];
	const skills = [];
	for (const entry of entries) {
		for (const skill of Array.isArray(entry?.skills) ? entry.skills : []) {
			const normalized = normalizeCodexRuntimeSkill(skill?.scope, skill, options);
			if (normalized && normalized.enabled === true) {
				skills.push(normalized);
			}
		}
	}
	return skills.sort(compareCodexSkillPriority);
}

function loadCodexHomeSkillAssets() {
	const skills = [];
	const roots = [
		{ rootId: 'home-codex', root: path.join(getCodexHomeDir(), 'skills'), scope: 'user' },
		{ rootId: 'home-agents', root: path.join(os.homedir(), '.agents', 'skills'), scope: 'user' },
	];
	for (const rootInfo of roots) {
		for (const folder of listImmediateFoldersAbsolute(rootInfo.root)) {
			const skillName = path.basename(folder);
			const filePath = path.join(folder, 'SKILL.md');
			if (!fs.existsSync(filePath)) continue;
			try {
				const content = readTextFileLimited(filePath, PROVIDER_ASSET_TEXT_MAX_BYTES);
				if (content === null) continue;
				const parsed = parseSlashCommandContent(content);
				const normalized = normalizeCodexRuntimeSkill(rootInfo.scope, {
					name: skillName,
					description: parsed.description || firstParagraph(parsed.promptContent),
					path: filePath,
					enabled: true,
				}, {
					id: `codex-runtime-skill-${rootInfo.rootId}-${skillName}`,
				});
				if (normalized) skills.push(normalized);
			}
			catch {
				// Home skill discovery is best-effort.
			}
		}
	}
	return skills.sort(compareCodexSkillPriority);
}

function parseTomlString(raw) {
	const value = String(raw || '').trim();
	if (!value) return '';
	if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
		try {
			return JSON.parse(value.startsWith('"') ? value : `"${value.slice(1, -1).replace(/"/g, '\\"')}"`);
		}
		catch {
			return value.slice(1, -1);
		}
	}
	return value;
}

function parseTomlValue(raw) {
	const value = String(raw || '').trim();
	if (value.startsWith('[') && value.endsWith(']')) {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) return parsed;
		}
		catch {
			return value.slice(1, -1).split(',').map(parseTomlString).filter(Boolean);
		}
	}
	if (value === 'true') return true;
	if (value === 'false') return false;
	if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
	return parseTomlString(value);
}

function parseSimpleToml(content) {
	const result = {};
	for (const line of String(content || '').split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		if (!VALID_FRONTMATTER_KEY.test(key)) continue;
		result[key] = parseTomlValue(trimmed.slice(eq + 1));
	}
	return result;
}

function tomlValue(value) {
	if (Array.isArray(value)) {
		return `[${value.map((item) => JSON.stringify(String(item))).join(', ')}]`;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return JSON.stringify(String(value ?? ''));
}

function parseCodexSubagentToml(content, fileName) {
	const parsed = parseSimpleToml(content);
	const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
	const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';
	const developerInstructions = typeof parsed.developer_instructions === 'string' ? parsed.developer_instructions : '';
	if (!name || !description || !developerInstructions) return null;
	const extraFields = {};
	for (const [key, value] of Object.entries(parsed)) {
		if (!CODEX_SUBAGENT_KNOWN_KEYS.has(key)) {
			extraFields[key] = value;
		}
	}
	const agent = {
		name,
		description,
		developerInstructions,
		persistenceKey: `codex-subagent:${encodeURIComponent(fileName)}`,
	};
	if (Array.isArray(parsed.nickname_candidates)) {
		const candidates = parsed.nickname_candidates.map((item) => String(item || '').trim()).filter(Boolean);
		if (candidates.length > 0) agent.nicknameCandidates = candidates;
	}
	if (typeof parsed.model === 'string') agent.model = parsed.model;
	if (typeof parsed.model_reasoning_effort === 'string') agent.modelReasoningEffort = parsed.model_reasoning_effort;
	if (typeof parsed.sandbox_mode === 'string') agent.sandboxMode = parsed.sandbox_mode;
	if (Object.keys(extraFields).length > 0) agent.extraFields = extraFields;
	return agent;
}

function serializeCodexSubagentToml(agent) {
	const doc = {
		name: agent.name,
		description: agent.description,
		developer_instructions: agent.developerInstructions,
	};
	if (Array.isArray(agent.nicknameCandidates) && agent.nicknameCandidates.length > 0) {
		doc.nickname_candidates = agent.nicknameCandidates;
	}
	if (agent.model) doc.model = agent.model;
	if (agent.modelReasoningEffort) doc.model_reasoning_effort = agent.modelReasoningEffort;
	if (agent.sandboxMode) doc.sandbox_mode = agent.sandboxMode;
	if (agent.extraFields && typeof agent.extraFields === 'object') {
		for (const [key, value] of Object.entries(agent.extraFields)) {
			if (VALID_FRONTMATTER_KEY.test(key) && !Object.prototype.hasOwnProperty.call(doc, key)) {
				doc[key] = value;
			}
		}
	}
	return `${Object.entries(doc).map(([key, value]) => `${key} = ${tomlValue(value)}`).join('\n')}\n`;
}

function parseCodexSubagentPersistenceKey(persistenceKey) {
	const text = String(persistenceKey || '');
	if (text.startsWith(`${CODEX_AGENTS_PATH}/`) && text.endsWith('.toml')) {
		const fileName = text.slice(CODEX_AGENTS_PATH.length + 1);
		return isSafeImmediateFileName(fileName, '.toml') ? { fileName } : null;
	}
	const [prefix, encodedFileName] = text.split(':');
	if (prefix !== 'codex-subagent' || !encodedFileName) return null;
	const fileName = safeDecodeURIComponent(encodedFileName);
	return isSafeImmediateFileName(fileName, '.toml') ? { fileName } : null;
}

function loadCodexSubagentAssets(workspace) {
	const root = workspacePath(workspace, CODEX_AGENTS_PATH);
	const agents = [];
	for (const filePath of listImmediateFilesAbsolute(root)) {
		if (!filePath.toLowerCase().endsWith('.toml')) continue;
		try {
			const content = readTextFileLimited(filePath, PROVIDER_ASSET_TEXT_MAX_BYTES);
			if (content === null) continue;
			const agent = parseCodexSubagentToml(content, path.basename(filePath));
			if (agent) agents.push(agent);
		}
		catch {
			// Skip malformed Codex subagent files.
		}
	}
	return agents;
}

function getClaudeHomeDir() {
	return process.env.CLAUDIAN_CLAUDE_HOME || path.join(os.homedir(), '.claude');
}

function normalizePathForComparison(filePath) {
	try {
		const resolved = fs.realpathSync(filePath);
		if (resolved) return resolved;
	}
	catch {
		// Fall back to absolute normalization.
	}
	return path.resolve(filePath);
}

function extractPluginName(pluginId) {
	const atIndex = String(pluginId || '').indexOf('@');
	return atIndex > 0 ? pluginId.slice(0, atIndex) : String(pluginId || '');
}

function selectInstalledPluginEntry(entries, normalizedWorkspace) {
	const list = Array.isArray(entries) ? entries : (entries && typeof entries === 'object' ? [entries] : []);
	for (const entry of list) {
		if (entry?.scope !== 'project' || !entry.projectPath) continue;
		if (normalizePathForComparison(entry.projectPath) === normalizedWorkspace) {
			return entry;
		}
	}
	return list.find((entry) => entry?.scope === 'user') || null;
}

function normalizeClaudePlugin(plugin, enabledOverrides = {}) {
	const id = String(plugin?.id || '').trim();
	if (!id) return null;
	const enabled = enabledOverrides[id] ?? plugin.enabled;
	return {
		id,
		name: String(plugin.name || extractPluginName(id) || id),
		enabled: enabled !== false,
		scope: plugin.scope === 'project' ? 'project' : 'user',
		installPath: String(plugin.installPath || ''),
		version: plugin.version ? String(plugin.version) : '',
		description: plugin.description ? String(plugin.description) : '',
		error: plugin.error ? String(plugin.error) : '',
	};
}

function loadClaudeProjectSettings(workspace) {
	return readJsonFile(workspacePath(workspace, CLAUDE_PROJECT_SETTINGS_PATH), {});
}

function normalizeClaudePermissionRules(value) {
	return Array.isArray(value) ? value.filter((rule) => typeof rule === 'string') : [];
}

function normalizeClaudeCodePermissions(value) {
	if (!isRecord(value)) {
		return { ...DEFAULT_CLAUDE_CODE_PERMISSIONS };
	}
	const permissions = {
		allow: normalizeClaudePermissionRules(value.allow),
		deny: normalizeClaudePermissionRules(value.deny),
		ask: normalizeClaudePermissionRules(value.ask),
	};
	if (typeof value.defaultMode === 'string') {
		permissions.defaultMode = value.defaultMode;
	}
	if (Array.isArray(value.additionalDirectories)) {
		permissions.additionalDirectories = value.additionalDirectories.filter((entry) => typeof entry === 'string');
	}
	return permissions;
}

function loadClaudePlugins(workspace) {
	const root = resolveWorkspaceRoot(workspace);
	const claudeHome = getClaudeHomeDir();
	const installed = readJsonFile(path.join(claudeHome, 'plugins', 'installed_plugins.json'), {});
	const globalSettings = readJsonFile(path.join(claudeHome, 'settings.json'), {});
	const projectSettings = loadClaudeProjectSettings(root);
	const globalEnabled = isRecord(globalSettings.enabledPlugins) ? globalSettings.enabledPlugins : {};
	const projectEnabled = isRecord(projectSettings.enabledPlugins) ? projectSettings.enabledPlugins : {};
	const normalizedWorkspace = normalizePathForComparison(root);
	const plugins = [];
	const installedPlugins = isRecord(installed.plugins) ? installed.plugins : {};
	for (const [pluginId, entries] of Object.entries(installedPlugins)) {
		const entry = selectInstalledPluginEntry(entries, normalizedWorkspace);
		if (!entry) continue;
		const normalized = normalizeClaudePlugin({
			id: pluginId,
			name: extractPluginName(pluginId),
			enabled: projectEnabled[pluginId] ?? globalEnabled[pluginId] ?? true,
			scope: entry.scope === 'project' ? 'project' : 'user',
			installPath: entry.installPath || '',
			version: entry.version || '',
		});
		if (normalized) plugins.push(normalized);
	}
	return plugins.sort((left, right) => (
		left.scope === right.scope
			? left.id.localeCompare(right.id)
			: left.scope === 'project' ? -1 : 1
	));
}

function addUniqueClaudeRuntimeCommand(commands, entry) {
	if (!entry?.name) return;
	const key = `${entry.kind || 'command'}:${String(entry.name).toLowerCase()}`;
	if (commands.some((existing) => `${existing.kind || 'command'}:${String(existing.name).toLowerCase()}` === key)) {
		return;
	}
	commands.push(entry);
}

function loadClaudePluginRuntimeCommandAssets(plugins) {
	const commands = [];
	for (const plugin of plugins || []) {
		if (!plugin?.enabled || !plugin.installPath) continue;
		const namespace = normalizeClaudePluginAgentNamespace(plugin.name || extractPluginName(plugin.id));
		const common = {
			scope: 'plugin',
			source: 'plugin',
			pluginName: plugin.id || plugin.name || '',
		};
		for (const entry of loadClaudeCommandAssetsFromRoot(path.join(plugin.installPath, 'commands'), {
			...common,
			idPrefix: `plugin-command:${namespace}`,
			persistencePrefix: `claude-plugin-command:${namespace}`,
		})) {
			addUniqueClaudeRuntimeCommand(commands, entry);
		}
		for (const entry of loadClaudeSkillAssetsFromRoot(path.join(plugin.installPath, 'skills'), {
			...common,
			idPrefix: `plugin-skill:${namespace}`,
			persistencePrefix: `claude-plugin-skill:${namespace}`,
		})) {
			addUniqueClaudeRuntimeCommand(commands, entry);
		}
	}
	return commands;
}

function loadClaudeGlobalRuntimeCommandAssets() {
	const claudeHome = getClaudeHomeDir();
	const commands = [];
	for (const entry of loadClaudeCommandAssetsFromRoot(path.join(claudeHome, 'commands'), {
		scope: 'global',
		source: 'sdk',
		idPrefix: 'global-command',
		persistencePrefix: 'claude-global-command',
	})) {
		addUniqueClaudeRuntimeCommand(commands, entry);
	}
	for (const entry of loadClaudeSkillAssetsFromRoot(path.join(claudeHome, 'skills'), {
		scope: 'global',
		source: 'sdk',
		idPrefix: 'global-skill',
		persistencePrefix: 'claude-global-skill',
	})) {
		addUniqueClaudeRuntimeCommand(commands, entry);
	}
	return commands;
}

function loadClaudeRuntimeCommandAssets(plugins) {
	const commands = [];
	for (const entry of loadClaudePluginRuntimeCommandAssets(plugins)) {
		addUniqueClaudeRuntimeCommand(commands, entry);
	}
	for (const entry of loadClaudeGlobalRuntimeCommandAssets()) {
		addUniqueClaudeRuntimeCommand(commands, entry);
	}
	return commands;
}

function loadProviderAssets(workspace, options = {}) {
	const root = resolveWorkspaceRoot(workspace);
	const providerSkillRoot = resolveProviderSkillRoot(root, options);
	const claudePlugins = loadClaudePlugins(root);
	const assets = {
		workspace: root,
		providerSkillRoot,
		claudeCommands: [...loadClaudeCommandAssets(root), ...loadClaudeSkillAssets(root, { providerSkillRoot })],
		claudeCommandsLoaded: true,
		claudeRuntimeCommands: loadClaudeRuntimeCommandAssets(claudePlugins),
		claudeRuntimeCommandsLoaded: true,
		claudeAgents: loadClaudeAgentAssets(root, claudePlugins),
		claudeAgentsLoaded: true,
		claudePlugins,
		claudePluginsLoaded: true,
		codexSkills: loadCodexSkillAssets(root, { providerSkillRoot }),
		codexSkillsLoaded: true,
		codexRuntimeSkills: [],
		codexRuntimeSkillsLoaded: true,
		codexSubagents: loadCodexSubagentAssets(root),
		codexSubagentsLoaded: true,
		paths: {
			claudeCommands: path.join(root, CLAUDE_COMMANDS_PATH),
			claudeSkills: path.join(providerSkillRoot, CLAUDE_SKILLS_PATH),
			claudeAgents: path.join(root, CLAUDE_AGENTS_PATH),
			claudeProjectSettings: path.join(root, CLAUDE_PROJECT_SETTINGS_PATH),
			claudeInstalledPlugins: path.join(getClaudeHomeDir(), 'plugins', 'installed_plugins.json'),
			codexSkills: path.join(providerSkillRoot, CODEX_VAULT_SKILLS_PATH),
			codexSubagents: path.join(root, CODEX_AGENTS_PATH),
		},
	};
	assets.hasAny = assets.claudeCommands.length > 0
		|| assets.claudeRuntimeCommands.length > 0
		|| assets.claudeAgents.length > 0
		|| assets.claudePlugins.length > 0
		|| assets.codexSkills.length > 0
		|| assets.codexRuntimeSkills.length > 0
		|| assets.codexSubagents.length > 0;
	return assets;
}

function summarizeProviderAssets(assets) {
	const deletedNames = (items) => (Array.isArray(items) ? items : [])
		.filter(isDeletedProviderAsset)
		.map((item) => item?.name || item?.id || item?.filePath || '')
		.filter(Boolean);
	return {
		claudeCommands: Array.isArray(assets?.claudeCommands) ? assets.claudeCommands.length : 0,
		claudeRuntimeCommands: Array.isArray(assets?.claudeRuntimeCommands) ? assets.claudeRuntimeCommands.length : 0,
		claudeModels: Array.isArray(assets?.claudeModels) ? assets.claudeModels.length : 0,
		claudeRuntimeModels: Array.isArray(assets?.claudeRuntimeModels) ? assets.claudeRuntimeModels.length : 0,
		claudeAgents: Array.isArray(assets?.claudeAgents) ? assets.claudeAgents.length : 0,
		claudePlugins: Array.isArray(assets?.claudePlugins) ? assets.claudePlugins.length : 0,
		codexSkills: Array.isArray(assets?.codexSkills) ? assets.codexSkills.length : 0,
		codexRuntimeSkills: Array.isArray(assets?.codexRuntimeSkills) ? assets.codexRuntimeSkills.length : 0,
		codexModels: Array.isArray(assets?.codexModels) ? assets.codexModels.length : 0,
		codexRuntimeModels: Array.isArray(assets?.codexRuntimeModels) ? assets.codexRuntimeModels.length : 0,
		codexSubagents: Array.isArray(assets?.codexSubagents) ? assets.codexSubagents.length : 0,
		deleted: {
			claudeCommands: deletedNames(assets?.claudeCommands),
			claudeAgents: deletedNames(assets?.claudeAgents),
			codexSkills: deletedNames(assets?.codexSkills),
			codexSubagents: deletedNames(assets?.codexSubagents),
		},
	};
}

function formatCodexModelLabel(model) {
	const value = String(model || '').trim();
	const match = value.match(/^gpt-([^-]+)(?:-(.+))?$/i);
	if (!match) return value;
	const suffix = match[2]
		? ` ${match[2].split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ')}`
		: '';
	return `GPT-${match[1]}${suffix}`;
}

function formatClaudeModelLabel(model) {
	const value = String(model || '').trim();
	const lower = value.toLowerCase();
	if (lower === 'haiku') return 'Haiku';
	if (lower === 'sonnet') return 'Sonnet';
	if (lower === 'sonnet[1m]') return 'Sonnet 1M';
	if (lower === 'opus') return 'Opus';
	if (lower === 'opus[1m]') return 'Opus 1M';
	const match = lower.match(/^claude-(haiku|sonnet|opus)-(.+)$/);
	if (match) {
		return `${match[1].charAt(0).toUpperCase()}${match[1].slice(1)} ${match[2].replace(/-/g, '.')}`;
	}
	return value;
}

function createModelAsset(providerId, value, description = 'Runtime model', metadata = {}) {
	const model = String(value || '').trim();
	if (!model) return null;
	const normalizedDescription = String(description || '').toLowerCase();
	const reasoningMetadata = extractModelReasoningMetadata(metadata);
	return {
		value: model,
		label: providerId === 'codex' ? formatCodexModelLabel(model) : formatClaudeModelLabel(model),
		description,
		source: normalizedDescription.includes('custom')
			? 'custom'
			: normalizedDescription.includes('env') ? 'env' : 'runtime',
		...reasoningMetadata,
	};
}

function isLikelyClaudeModel(model) {
	const decoded = originalShared.decodeProviderModelSelectionId(model);
	if (decoded) {
		return decoded.providerId === 'claude';
	}
	const value = String(model || '').trim();
	const lower = value.toLowerCase();
	return DEFAULT_CLAUDE_MODEL_VALUES.has(value)
		|| lower.startsWith('claude-')
		|| lower.includes('sonnet')
		|| lower.includes('opus')
		|| lower.includes('haiku')
		|| lower === 'fable'
		|| lower === 'best'
		|| lower === 'opusplan';
}

function isLikelyCodexModel(model) {
	const decoded = originalShared.decodeProviderModelSelectionId(model);
	if (decoded) {
		return decoded.providerId === 'codex';
	}
	const value = String(model || '').trim();
	const lower = value.toLowerCase();
	return DEFAULT_CODEX_MODEL_VALUES.has(value)
		|| lower.startsWith('gpt-')
		|| lower.startsWith('o1')
		|| lower.startsWith('o3')
		|| lower.startsWith('o4')
		|| lower.includes('codex');
}

function modelLooksOwnedByOtherProvider(providerId, model) {
	const provider = providerId === 'claude' ? 'claude' : 'codex';
	const decoded = originalShared.decodeProviderModelSelectionId(model);
	if (decoded) {
		return decoded.providerId !== provider;
	}
	if (provider === 'claude') {
		return isLikelyCodexModel(model);
	}
	return isLikelyClaudeModel(model);
}

function defaultModelForProvider(providerId) {
	return providerId === 'claude' ? DEFAULT_CLAUDE_MODEL : DEFAULT_CODEX_MODEL;
}

function normalizeModelForProvider(providerId, candidate) {
	const provider = providerId === 'claude' ? 'claude' : 'codex';
	const decoded = originalShared.decodeProviderModelSelectionId(candidate);
	if (decoded && decoded.providerId !== provider) return '';
	const model = decoded?.providerId === provider
		? decoded.modelId
		: originalShared.toProviderRuntimeModelId(provider, candidate).trim();
	return model && !modelLooksOwnedByOtherProvider(provider, model) ? model : '';
}

function isLegacyDefaultModelForProvider(providerId, candidate) {
	return normalizeModelForProvider(providerId, candidate) === defaultModelForProvider(providerId);
}

function nativeConfiguredModelForProvider(providerId, settings) {
	const provider = providerId === 'claude' ? 'claude' : 'codex';
	const candidates = provider === 'claude'
		? collectClaudeEnvModels(settings)
		: collectCodexEnvModels(settings);
	for (const candidate of candidates) {
		const model = normalizeModelForProvider(provider, candidate);
		if (model) return model;
	}
	return '';
}

function resolveRuntimeModelForProvider(providerId, settings, payload = {}) {
	const provider = providerId === 'claude' ? 'claude' : 'codex';
	const nativeConfiguredModel = nativeConfiguredModelForProvider(provider, settings);
	const selectionSource = settings?.modelSelectionSource === 'user' ? 'user' : 'native';
	const candidates = [];
	if (nativeConfiguredModel
		&& selectionSource !== 'user'
		&& (!payload?.model || isLegacyDefaultModelForProvider(provider, payload.model))) {
		candidates.push(nativeConfiguredModel);
	}
	if (payload?.model) {
		candidates.push(payload.model);
	}
	if (provider === 'codex' && settings?.openaiModel) {
		candidates.push(settings.openaiModel);
	}
	if (settings?.model) {
		candidates.push(settings.model);
	}
	if (nativeConfiguredModel) {
		candidates.push(nativeConfiguredModel);
	}
	candidates.push(defaultModelForProvider(provider));
	for (const candidate of candidates) {
		const model = normalizeModelForProvider(provider, candidate);
		if (!model) continue;
		return model;
	}
	return defaultModelForProvider(provider);
}

function reasoningModelId(providerId, model) {
	const provider = providerId === 'claude' ? 'claude' : 'codex';
	const decoded = originalShared.decodeProviderModelSelectionId(model);
	if (decoded?.providerId === provider) return String(decoded.modelId || '').trim();
	return String(model || '').trim().replace(new RegExp(`^${provider === 'claude' ? 'claude-code' : 'openai-codex'}/`, 'iu'), '');
}

function modelAssetMatchesModel(asset, model) {
	const assetValue = String(asset?.value || asset?.id || asset?.model || '').trim().toLowerCase();
	const modelValue = String(model || '').trim().toLowerCase();
	return !!assetValue && (assetValue === modelValue
		|| assetValue === reasoningModelId('codex', model).toLowerCase()
		|| assetValue === reasoningModelId('claude', model).toLowerCase());
}

function findReasoningModelAsset(providerId, model, options = {}) {
	if (options.modelAsset && typeof options.modelAsset === 'object') return options.modelAsset;
	const provider = providerId === 'claude' ? 'claude' : 'codex';
	const sources = [
		...(Array.isArray(options.runtimeModelAssets?.[`${provider}RuntimeModels`]) ? options.runtimeModelAssets[`${provider}RuntimeModels`] : []),
		...(Array.isArray(options.settings?.[`${provider}RuntimeModels`]) ? options.settings[`${provider}RuntimeModels`] : []),
		...(Array.isArray(options.settings?.[`${provider}Models`]) ? options.settings[`${provider}Models`] : []),
	];
	return sources.find((asset) => modelAssetMatchesModel(asset, model)) || null;
}

function isCodexGpt56OrLater(model) {
	const normalized = reasoningModelId('codex', model).toLowerCase();
	const match = normalized.match(/^gpt-5\.(\d+)(?:-|$)/u);
	return !!match && Number(match[1]) >= 6;
}

function supportsClaudeXHighEffort(model) {
	const normalized = reasoningModelId('claude', model).toLowerCase();
	return ['best', 'fable', 'opus', 'opus[1m]', 'opusplan'].includes(normalized)
		|| /^(?:claude-fable-5|claude-opus-5|claude-sonnet-5|claude-opus-4-(?:7|8))(?:-|\[|$)/u.test(normalized);
}

function supportsClaudeMaxEffort(model) {
	const normalized = reasoningModelId('claude', model).toLowerCase();
	return supportsClaudeXHighEffort(model)
		|| normalized === 'sonnet'
		|| normalized === 'sonnet[1m]'
		|| /^(?:claude-opus-4-6|claude-sonnet-4-6)(?:-|\[|$)/u.test(normalized);
}

function getReasoningEffortCapabilities(providerId, model, options = {}) {
	const provider = providerId === 'claude' ? 'claude' : 'codex';
	const asset = findReasoningModelAsset(provider, model, options);
	const explicit = normalizeReasoningEffortList(asset?.supportedReasoningEfforts);
	if (asset?.supportsReasoningEffort === false) return [];

	if (provider === 'claude') {
		if (explicit.length > 0) {
			return explicit.filter((effort) => effort !== 'ultra');
		}
		const known = [];
		if (supportsClaudeMaxEffort(model)) known.push('low', 'medium', 'high', 'max');
		if (supportsClaudeXHighEffort(model)) known.splice(3, 0, 'xhigh');
		// Claude's `ultracode` is a separate workflow mode, not a model
		// reasoning effort. It is intentionally not represented by `ultra` here.
		return normalizeReasoningEffortList(known)
			.filter((effort) => effort !== 'ultra');
	}

	const gpt56OrLater = isCodexGpt56OrLater(model);
	if (explicit.length > 0 && !gpt56OrLater) return explicit;
	const known = ['low', 'medium', 'high', 'xhigh'];
	if (gpt56OrLater) known.push('max');
	if (gpt56OrLater) known.push('ultra');
	return normalizeReasoningEffortList([...known, ...explicit]);
}

function safeReasoningEffort(providerId, model, value, options = {}) {
	const requested = normalizeRuntimeEffort(value);
	const capabilities = getReasoningEffortCapabilities(providerId, model, options);
	if (capabilities.length === 0) return providerId === 'claude' ? 'high' : requested === 'ultra' || requested === 'max' ? 'high' : requested;
	if (capabilities.includes(requested)) return requested;
	const requestedIndex = REASONING_EFFORT_ORDER.indexOf(requested);
	const fallback = capabilities
		.filter((effort) => REASONING_EFFORT_ORDER.indexOf(effort) <= requestedIndex)
		.at(-1);
	return fallback || capabilities[Math.min(2, capabilities.length - 1)] || 'high';
}

function mergeModelReasoningMetadata(target, source) {
	const next = extractModelReasoningMetadata(source);
	if (next.supportedReasoningEfforts?.length) {
		target.supportedReasoningEfforts = normalizeReasoningEffortList([
			...(target.supportedReasoningEfforts || []),
			...next.supportedReasoningEfforts,
		]);
	}
	if (next.defaultReasoningEffort) target.defaultReasoningEffort = next.defaultReasoningEffort;
	if (typeof next.supportsReasoningEffort === 'boolean') {
		target.supportsReasoningEffort = next.supportsReasoningEffort;
	}
	return target;
}

function addUniqueModelAsset(target, providerId, value, description, metadata = {}) {
	const asset = createModelAsset(providerId, value, description, metadata);
	if (!asset) return;
	const existing = target.find((item) => String(item?.value || '').toLowerCase() === asset.value.toLowerCase());
	if (existing) {
		mergeModelReasoningMetadata(existing, asset);
		return;
	}
	target.push(asset);
}

function normalizeCustomModelList(value, providerId) {
	const uniqueModels = [];
	const seen = new Set();
	for (const rawModel of String(value || '').split(/\r?\n/)) {
		const model = normalizeModelForProvider(providerId, rawModel);
		if (!model || model.length > CUSTOM_MODEL_ID_MAX_CHARS) {
			continue;
		}
		const key = model.toLowerCase();
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		uniqueModels.push(model);
		if (uniqueModels.length >= CUSTOM_MODELS_PER_PROVIDER_MAX) {
			break;
		}
	}
	return uniqueModels;
}

function customModelsForProvider(settings, providerId) {
	const key = providerId === 'claude' ? 'claudeCustomModels' : 'codexCustomModels';
	return normalizeCustomModelList(settings?.[key], providerId);
}

function combineEnvironmentText(...parts) {
	return parts
		.map((part) => String(part || '').trim())
		.filter(Boolean)
		.join('\n');
}

function collectClaudeEnvModels(settings) {
	const env = readClaudeCliEnv();
	return [
		env.ANTHROPIC_MODEL,
		env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
		env.ANTHROPIC_DEFAULT_SONNET_MODEL,
		env.ANTHROPIC_DEFAULT_OPUS_MODEL,
	].filter(Boolean);
}

function collectCodexEnvModels(settings) {
	const cliConfig = readCodexCliConfig({ codexHome: settings?.codexHome || '' });
	return [cliConfig.model].filter(Boolean);
}

function unmaskedSecret(value) {
	const text = String(value || '').trim();
	return text && text !== '********' ? text : '';
}

function normalizeLlmProviderMode() {
	return 'native-cli';
}

function isThirdPartyLlmProvider() {
	return false;
}

function mergeSettingsPatchPreservingSecrets(previous, patch) {
	const source = isRecord(patch) ? patch : {};
	return { ...(previous || {}), ...source };
}

function buildClaudeModelEnvOverrides(settings = {}) {
	const nativeEnv = readClaudeCliEnv();
	const parsedEnv = stripRoutingEnvironmentVariables(
		parseEnvText(combineEnvironmentText(settings.envText, settings.claudeEnvText)),
	);
	const env = { ...nativeEnv, ...parsedEnv };
	return Object.fromEntries(Object.entries(env).filter(([key]) => isValidEnvName(key)));
}

function splitTomlSectionPath(value) {
	const parts = [];
	let current = '';
	let quote = '';
	let escaped = false;
	for (const character of String(value || '')) {
		if (quote) {
			current += character;
			if (escaped) {
				escaped = false;
			}
			else if (character === '\\') {
				escaped = true;
			}
			else if (character === quote) {
				quote = '';
			}
			continue;
		}
		if (character === '"' || character === "'") {
			quote = character;
			current += character;
			continue;
		}
		if (character === '.') {
			const part = String(parseTomlValue(current) || '').trim();
			if (part) parts.push(part);
			current = '';
			continue;
		}
		current += character;
	}
	const part = String(parseTomlValue(current) || '').trim();
	if (part) parts.push(part);
	return parts;
}

function parseTomlTopLevelAndSections(content) {
	const root = {};
	let current = root;
	for (const line of String(content || '').split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const sectionMatch = trimmed.match(/^\[([^\]]+)]$/);
		if (sectionMatch) {
			current = root;
			for (const part of splitTomlSectionPath(sectionMatch[1])) {
				if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
					current[part] = {};
				}
				current = current[part];
			}
			continue;
		}
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		if (!VALID_FRONTMATTER_KEY.test(key)) continue;
		current[key] = parseTomlValue(trimmed.slice(eq + 1));
	}
	return root;
}

function readCodexCliConfig(options = {}) {
	const codexHome = getCodexHomeDir(options);
	const configPath = path.join(codexHome, 'config.toml');
	const authPath = path.join(codexHome, 'auth.json');
	let config = {};
	try {
		const rawConfig = readTextFileLimited(configPath, SETTINGS_JSON_MAX_BYTES);
		config = rawConfig === null ? {} : parseTomlTopLevelAndSections(rawConfig);
	}
	catch {
		config = {};
	}
	const providerName = String(config.model_provider || '').trim();
	const providerConfig = providerName && config.model_providers && typeof config.model_providers === 'object'
		? config.model_providers[providerName]
		: null;
	const auth = readJsonFile(authPath, {});
	return {
		configPath,
		authPath,
		providerName,
		providerLabel: typeof providerConfig?.name === 'string' ? providerConfig.name.trim() : '',
		model: typeof config.model === 'string' ? config.model.trim() : '',
		baseUrl: typeof providerConfig?.base_url === 'string' ? providerConfig.base_url.trim() : '',
		wireApi: typeof providerConfig?.wire_api === 'string' ? providerConfig.wire_api.trim().toLowerCase() : '',
		requiresOpenaiAuth: providerConfig?.requires_openai_auth === true,
		apiKey: typeof auth.OPENAI_API_KEY === 'string' && auth.OPENAI_API_KEY.trim()
			? auth.OPENAI_API_KEY.trim()
			: typeof providerConfig?.experimental_bearer_token === 'string'
				? providerConfig.experimental_bearer_token.trim()
				: '',
		authMode: classifyNativeCodexAuthMode(
			auth.OPENAI_API_KEY || providerConfig?.experimental_bearer_token,
		),
	};
}

const API_ROUTE_ENVIRONMENT_KEYS = new Set([
	'ALL_PROXY',
	'ANTHROPIC_API_KEY',
	'ANTHROPIC_AUTH_TOKEN',
	'ANTHROPIC_BASE_URL',
	'CLAUDE_CONFIG_DIR',
	'CODEX_HOME',
	'HTTP_PROXY',
	'HTTPS_PROXY',
	'NO_PROXY',
	'OPENAI_API_KEY',
	'OPENAI_BASE_URL',
]);

const NATIVE_CLAUDE_ROUTE_ENVIRONMENT_KEYS = new Set([
	'ANTHROPIC_API_KEY',
	'ANTHROPIC_AUTH_TOKEN',
	'ANTHROPIC_BASE_URL',
	'ANTHROPIC_MODEL',
	'ANTHROPIC_DEFAULT_HAIKU_MODEL',
	'ANTHROPIC_DEFAULT_SONNET_MODEL',
	'ANTHROPIC_DEFAULT_OPUS_MODEL',
]);

function normalizeRuntimeApiBaseUrl(value) {
	const text = String(value || '').trim();
	if (!text) return '';
	try {
		const url = new URL(text);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return '';
		}
		url.search = '';
		url.hash = '';
		return url.toString().replace(/\/+$/u, '');
	}
	catch {
		return '';
	}
}

function isLoopbackAddress(value) {
	const address = String(value || '').trim().toLowerCase().replace(/^\[|\]$/gu, '');
	return address === '127.0.0.1'
		|| address === '::1'
		|| address === '::ffff:127.0.0.1'
		|| address === 'localhost';
}

function classifyNativeCodexAuthMode(value) {
	const text = String(value || '').trim();
	if (!text) return 'missing';
	if (text === 'PROXY_MANAGED') {
		return 'proxy-managed-marker';
	}
	if (/^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/u.test(text)
		|| /^%[A-Za-z_][A-Za-z0-9_]*%$/u.test(text)) {
		return 'environment-reference';
	}
	return text === '********' ? 'masked' : 'configured';
}

function describeCodexProviderTarget(value) {
	const normalized = normalizeRuntimeApiBaseUrl(value);
	if (!normalized) return null;
	try {
		const url = new URL(normalized);
		const hostname = String(url.hostname || '').replace(/^\[|\]$/gu, '');
		const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
		if (!hostname || !Number.isInteger(port) || port < 1 || port > 65535) {
			return null;
		}
		return {
			protocol: url.protocol,
			hostname,
			port,
			pathname: String(url.pathname || '/'),
			isLoopback: isLoopbackAddress(hostname),
		};
	}
	catch {
		return null;
	}
}

function providerTargetLabel(target) {
	if (!target) return 'configured provider';
	return `${target.hostname}:${target.port}`;
}

function notifyCodexResponsesBridge(callback, payload) {
	try {
		if (typeof callback === 'function') callback(payload);
	}
	catch {
		// Diagnostics must never interrupt a provider request.
	}
}

function probeLoopbackCodexProvider(target, timeoutMs = 1200) {
	if (!target?.isLoopback) {
		return Promise.resolve({ checked: false, reachable: true, errorCode: '' });
	}
	return new Promise((resolve) => {
		const socket = require('net').createConnection({ host: target.hostname, port: target.port });
		let settled = false;
		const finish = (result) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			resolve(result);
		};
		socket.setTimeout(timeoutMs);
		socket.once('connect', () => finish({ checked: true, reachable: true, errorCode: '' }));
		socket.once('timeout', () => finish({ checked: true, reachable: false, errorCode: 'ETIMEDOUT' }));
		socket.once('error', (error) => finish({
			checked: true,
			reachable: false,
			errorCode: String(error?.code || error?.name || 'CONNECTION_ERROR'),
		}));
	});
}

function isSafeCodexProviderName(value) {
	return /^[A-Za-z0-9_-]{1,128}$/u.test(String(value || '').trim());
}

function readHttpRequestBody(request, maxBytes) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let totalBytes = 0;
		let settled = false;
		const finish = (callback, value) => {
			if (settled) return;
			settled = true;
			callback(value);
		};
		request.on('data', (chunk) => {
			const buffer = Buffer.from(chunk);
			totalBytes += buffer.length;
			if (totalBytes > maxBytes) {
				finish(reject, new Error('Responses request exceeds the local bridge size limit.'));
				request.destroy();
				return;
			}
			chunks.push(buffer);
		});
		request.once('aborted', () => finish(reject, new Error('Responses request was aborted.')));
		request.once('error', (error) => finish(reject, error));
		request.once('end', () => finish(resolve, Buffer.concat(chunks)));
	});
}

function bridgeTargetUrl(upstreamBaseUrl, requestUrl) {
	const upstream = new URL(upstreamBaseUrl);
	const incoming = new URL(requestUrl || '/', 'http://127.0.0.1');
	const basePath = String(upstream.pathname || '').replace(/\/+$/u, '');
	const requestPath = incoming.pathname.startsWith('/') ? incoming.pathname : `/${incoming.pathname}`;
	upstream.pathname = `${basePath}${requestPath}`.replace(/\/{2,}/gu, '/');
	upstream.search = incoming.search;
	return upstream;
}

function forwardCodexResponsesBridgeRequest(request, response, targetUrl, body, options = {}) {
	const client = targetUrl.protocol === 'https:' ? https : http;
	const target = describeCodexProviderTarget(targetUrl.toString());
	const headers = { ...request.headers };
	delete headers.host;
	delete headers['content-length'];
	delete headers['transfer-encoding'];
	headers.host = targetUrl.host;
	headers['content-length'] = String(body.length);
	const upstreamRequest = client.request(targetUrl, {
		method: request.method,
		headers,
		timeout: CODEX_RESPONSES_BRIDGE_TIMEOUT_MS,
	}, (upstreamResponse) => {
		notifyCodexResponsesBridge(options.onResponse, {
			target,
			statusCode: Number(upstreamResponse.statusCode || 502),
			cfRay: String(upstreamResponse.headers?.['cf-ray'] || ''),
		});
		response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
		upstreamResponse.pipe(response);
	});
	upstreamRequest.once('timeout', () => {
		upstreamRequest.destroy(new Error('Configured provider request timed out.'));
	});
	upstreamRequest.once('error', (error) => {
		const errorCode = String(error?.code || error?.name || 'CONNECTION_ERROR');
		notifyCodexResponsesBridge(options.onError, { target, errorCode });
		if (!response.headersSent) {
			response.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
		}
		if (!response.writableEnded) {
			const targetLabel = providerTargetLabel(target);
			const message = target?.isLoopback
				? `The configured local Codex proxy at ${targetLabel} is unavailable. Start the proxy service (for example, CC Switch) and try again.`
				: `PDF AI could not reach the configured Codex provider at ${targetLabel}.`;
			response.end(JSON.stringify({ error: { message, type: 'upstream_error', code: errorCode } }));
		}
	});
	upstreamRequest.end(body);
}

async function startCodexResponsesReasoningBridge(options = {}) {
	const upstreamBaseUrl = normalizeRuntimeApiBaseUrl(options.upstreamBaseUrl);
	const providerName = String(options.providerName || '').trim();
	if (!upstreamBaseUrl || !isSafeCodexProviderName(providerName)) {
		return null;
	}
	let effort = normalizeRuntimeEffort(options.effort);
	const routeToken = randomUUID().replace(/-/gu, '');
	const routePrefix = `/pdf-ai-responses-${routeToken}`;
	const sockets = new Set();
	const server = http.createServer(async (request, response) => {
		if (!isLoopbackAddress(request.socket?.remoteAddress)) {
			response.writeHead(403).end();
			return;
		}
		let incomingUrl;
		try {
			incomingUrl = new URL(request.url || '/', 'http://127.0.0.1');
		}
		catch {
			response.writeHead(400).end();
			return;
		}
		if (incomingUrl.pathname !== routePrefix && !incomingUrl.pathname.startsWith(`${routePrefix}/`)) {
			response.writeHead(404).end();
			return;
		}
		const targetPath = incomingUrl.pathname.slice(routePrefix.length) || '/';
		let targetUrl;
		try {
			targetUrl = bridgeTargetUrl(upstreamBaseUrl, `${targetPath}${incomingUrl.search}`);
		}
		catch {
			response.writeHead(502).end();
			return;
		}
		let body;
		try {
			body = await readHttpRequestBody(request, CODEX_RESPONSES_BRIDGE_BODY_MAX_BYTES);
		}
		catch {
			response.writeHead(413, { 'content-type': 'application/json; charset=utf-8' });
			response.end(JSON.stringify({ error: { message: 'Responses request is too large for the local bridge.', type: 'request_too_large' } }));
			return;
		}
		const isResponsesRequest = request.method === 'POST' && /\/responses$/u.test(targetPath);
		if (isResponsesRequest && body.length > 0) {
			try {
				const payload = JSON.parse(body.toString('utf8'));
				if (isRecord(payload)) {
					const reasoning = isRecord(payload.reasoning) ? payload.reasoning : {};
					if (!reasoning.effort) {
						payload.reasoning = { ...reasoning, effort };
						body = Buffer.from(JSON.stringify(payload), 'utf8');
						try {
							options.onInjected?.({
								model: String(payload.model || ''),
								effort,
							});
						}
						catch {
							// Diagnostic callbacks must never interrupt the configured provider request.
						}
					}
				}
			}
			catch {
				// Preserve a malformed or non-JSON request; the configured provider will report it.
			}
		}
		forwardCodexResponsesBridgeRequest(request, response, targetUrl, body, {
			onResponse: options.onUpstreamResponse,
			onError: options.onUpstreamError,
		});
	});
	server.on('connection', (socket) => {
		sockets.add(socket);
		socket.once('close', () => sockets.delete(socket));
	});
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const address = server.address();
	if (!address || typeof address === 'string') {
		await new Promise((resolve) => server.close(resolve));
		return null;
	}
	return {
		providerName,
		baseUrl: `http://127.0.0.1:${address.port}${routePrefix}`,
		setEffort(value) {
			effort = normalizeRuntimeEffort(value);
		},
		close() {
			for (const socket of sockets) {
				socket.destroy();
			}
			return new Promise((resolve) => server.close(() => resolve()));
		},
	};
}

function stripRoutingEnvironmentVariables(source = {}) {
	const env = { ...(source || {}) };
	for (const key of Object.keys(env)) {
		if (API_ROUTE_ENVIRONMENT_KEYS.has(String(key || '').toUpperCase())) {
			delete env[key];
		}
	}
	return env;
}

function readNativeClaudeCliEnv(options = {}) {
	const source = readClaudeCliEnv(options);
	const env = {};
	for (const [key, value] of Object.entries(source)) {
		if (!NATIVE_CLAUDE_ROUTE_ENVIRONMENT_KEYS.has(key)) {
			continue;
		}
		if (key === 'ANTHROPIC_BASE_URL') {
			const baseUrl = normalizeRuntimeApiBaseUrl(value);
			if (baseUrl) {
				env[key] = baseUrl;
			}
			continue;
		}
		env[key] = value;
	}
	return env;
}

function resolveNativeCliRoute(providerId = '', options = {}) {
	const provider = String(providerId || '').trim().toLowerCase();
	const wantsCodex = provider !== 'claude' && provider !== 'anthropic';
	const wantsClaude = provider !== 'codex' && provider !== 'openai';
	if (wantsCodex) {
		const codex = readCodexCliConfig(options);
		const baseUrl = normalizeRuntimeApiBaseUrl(codex.baseUrl);
		if (baseUrl) {
			return {
				providerId: 'codex',
				baseUrl,
				apiKey: unmaskedSecret(codex.apiKey),
				model: codex.model,
				wireApi: codex.wireApi,
				allowEmptyApiKey: codex.requiresOpenaiAuth !== true,
			};
		}
	}
	if (wantsClaude) {
		const claudeEnv = readNativeClaudeCliEnv(options);
		const baseUrl = normalizeRuntimeApiBaseUrl(claudeEnv.ANTHROPIC_BASE_URL);
		if (baseUrl) {
			return {
				providerId: 'claude',
				baseUrl,
				apiKey: unmaskedSecret(claudeEnv.ANTHROPIC_AUTH_TOKEN || claudeEnv.ANTHROPIC_API_KEY),
				model: String(claudeEnv.ANTHROPIC_MODEL || claudeEnv.ANTHROPIC_DEFAULT_SONNET_MODEL || '').trim(),
				wireApi: 'messages',
				allowEmptyApiKey: false,
			};
		}
	}
	return {
		providerId: provider === 'codex' || provider === 'openai' ? 'codex' : 'claude',
		baseUrl: '',
		apiKey: '',
		model: '',
		wireApi: '',
		allowEmptyApiKey: false,
	};
}


function resolveClaudeSettingSources() {
	return 'user,project,local';
}

function readClaudeCliConfig(options = {}) {
	const homeDir = resolveNativeCliHomeDir(options);
	const configDir = getClaudeConfigDir({ ...options, homeDir });
	const candidates = [
		path.join(homeDir, '.claude.json'),
		path.join(configDir, 'settings.json'),
	].filter((filePath, index, list) => list.indexOf(filePath) === index);
	const env = {};
	for (const filePath of candidates) {
		const data = readJsonFile(filePath, {});
		if (data?.env && typeof data.env === 'object' && !Array.isArray(data.env)) {
			for (const [key, value] of Object.entries(data.env)) {
				if (isValidEnvName(key) && typeof value === 'string' && value.trim()) {
					env[key] = value.trim();
				}
			}
		}
	}
	return {
		homeDir,
		configDir,
		configPaths: candidates,
		env,
	};
}

function readClaudeCliEnv(options = {}) {
	return readClaudeCliConfig(options).env;
}

function getNativeCliConfigurationFingerprint() {
	const codex = readCodexCliConfig();
	const claude = readClaudeCliConfig();
	const paths = [
		codex.configPath,
		codex.authPath,
		...claude.configPaths,
	]
		.filter(Boolean)
		.map((filePath) => path.resolve(filePath))
		.filter((filePath, index, list) => list.indexOf(filePath) === index)
		.sort();
	return paths.map((filePath) => {
		try {
			const stat = fs.statSync(filePath);
			return `${filePath}:${stat.size}:${Math.trunc(stat.mtimeMs)}`;
		}
		catch {
			return `${filePath}:missing`;
		}
	}).join('|');
}

function normalizeModelAssetList(providerId, values, description) {
	return normalizeRuntimeModelAssets(providerId, (Array.isArray(values) ? values : []).filter(Boolean), description);
}

function normalizeRuntimeModelListUrl(baseUrl, fallbackBaseUrl) {
	const source = String(baseUrl || fallbackBaseUrl || '').trim();
	if (!source) return '';
	try {
		const url = new URL(source);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return '';
		}
		url.search = '';
		url.hash = '';
		let pathname = String(url.pathname || '').replace(/\/+$/u, '');
		if (pathname.endsWith('/models')) {
			url.pathname = pathname;
			return url.toString();
		}
		if (pathname.endsWith('/chat/completions')) {
			pathname = pathname.slice(0, -'/chat/completions'.length);
		}
		else if (pathname.endsWith('/messages')) {
			pathname = pathname.slice(0, -'/messages'.length);
		}
		url.pathname = `${pathname || ''}/models`;
		return url.toString();
	}
	catch {
		return '';
	}
}

function normalizeClaudeRuntimeModelListUrl(baseUrl) {
	const normalized = normalizeRuntimeApiBaseUrl(baseUrl);
	if (!normalized) return '';
	try {
		const url = new URL(normalized);
		url.search = '';
		url.hash = '';
		let pathname = String(url.pathname || '').replace(/\/+$/u, '');
		if (pathname.endsWith('/v1/models')) {
			url.pathname = pathname;
			return url.toString();
		}
		if (pathname.endsWith('/models')) {
			pathname = pathname.slice(0, -'/models'.length);
		}
		if (pathname.endsWith('/v1/messages')) {
			pathname = pathname.slice(0, -'/messages'.length);
		}
		url.pathname = pathname.endsWith('/v1')
			? `${pathname}/models`
			: `${pathname}/v1/models`;
		return url.toString();
	}
	catch {
		return '';
	}
}

function requestJson(urlString, headers = {}, timeoutMs = RUNTIME_MODEL_LIST_TIMEOUT_MS) {
	return new Promise((resolve, reject) => {
		let url;
		try {
			url = new URL(urlString);
		}
		catch (error) {
			reject(error);
			return;
		}
		const client = url.protocol === 'http:' ? http : https;
		const request = client.request(url, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				...headers,
			},
		}, (response) => {
			let body = '';
			response.setEncoding('utf8');
			response.on('data', (chunk) => {
				body += chunk;
				if (body.length > 2 * 1024 * 1024) {
					request.destroy(new Error('Model list response is too large'));
				}
			});
			response.on('end', () => {
				const statusCode = Number(response.statusCode || 0);
				let payload = null;
				try {
					payload = body ? JSON.parse(body) : {};
				}
				catch (error) {
					if (statusCode >= 200 && statusCode < 300) {
						reject(new Error(`Model list response was not JSON: ${body.slice(0, 120)}`));
						return;
					}
				}
				if (statusCode < 200 || statusCode >= 300) {
					const message = payload?.error?.message || payload?.message || body.slice(0, 160);
					reject(new Error(`Model list request failed with HTTP ${statusCode}${message ? `: ${message}` : ''}`));
					return;
				}
				resolve(payload || {});
			});
		});
		request.setTimeout(timeoutMs, () => {
			request.destroy(new Error('Model list request timed out'));
		});
		request.on('error', reject);
		request.end();
	});
}

function modelItemsFromResponse(payload) {
	if (Array.isArray(payload)) return payload;
	if (Array.isArray(payload?.data)) return payload.data;
	if (Array.isArray(payload?.models)) return payload.models;
	if (Array.isArray(payload?.result?.data)) return payload.result.data;
	if (Array.isArray(payload?.result?.models)) return payload.result.models;
	return [];
}

function runtimeModelValue(item) {
	if (typeof item === 'string') return item;
	if (!item || typeof item !== 'object') return '';
	return String(item.id || item.name || item.model || item.value || '').trim();
}

function runtimeModelLabel(providerId, value, item) {
	if (item && typeof item === 'object') {
		const label = String(item.display_name || item.displayName || item.label || '').trim();
		if (label) return label;
	}
	return providerId === 'codex' ? formatCodexModelLabel(value) : formatClaudeModelLabel(value);
}

function addRuntimeModelAsset(target, providerId, item, description) {
	const value = runtimeModelValue(item);
	if (!value || modelLooksOwnedByOtherProvider(providerId, value)) return;
	const existing = target.find((entry) => String(entry?.value || '').toLowerCase() === value.toLowerCase());
	if (existing) {
		mergeModelReasoningMetadata(existing, item);
		return;
	}
	const asset = createModelAsset(providerId, value, description, item);
	if (!asset) return;
	asset.label = runtimeModelLabel(providerId, value, item);
	asset.source = 'runtime';
	target.push(asset);
}

function normalizeRuntimeModelAssets(providerId, payload, description = 'Available runtime model') {
	const models = [];
	for (const item of modelItemsFromResponse(payload)) {
		addRuntimeModelAsset(models, providerId, item, description);
	}
	return models;
}

function mergeRuntimeModelAssets(providerId, ...sources) {
	const merged = [];
	for (const source of sources) {
		for (const item of Array.isArray(source) ? source : []) {
			addRuntimeModelAsset(merged, providerId, item, item?.description || 'Available runtime model');
		}
	}
	return merged;
}

async function fetchCodexRuntimeModelAssets(settings = {}) {
	const route = resolveNativeCliRoute('codex', { codexHome: settings?.codexHome || '' });
	if (!route.baseUrl) return [];
	const endpoint = normalizeRuntimeModelListUrl(route.baseUrl, '');
	if (!endpoint) return [];
	const headers = route.apiKey ? { Authorization: `Bearer ${route.apiKey}` } : {};
	const payload = await requestJson(endpoint, headers);
	return normalizeRuntimeModelAssets(
		'codex',
		payload,
		'Native Codex CLI model',
	);
}

async function fetchClaudeRuntimeModelAssets(settings = {}) {
	const route = resolveNativeCliRoute('claude');
	if (!route.baseUrl) {
		return [];
	}
	const endpoint = normalizeClaudeRuntimeModelListUrl(route.baseUrl);
	if (!endpoint) return [];
	const headers = { 'anthropic-version': '2023-06-01' };
	if (route.apiKey) {
		headers['x-api-key'] = route.apiKey;
		if (!endpoint.includes('api.anthropic.com')) {
			headers.Authorization = `Bearer ${route.apiKey}`;
		}
	}
	const payload = await requestJson(endpoint, headers);
	return normalizeRuntimeModelAssets(
		'claude',
		payload,
		'Native Claude CLI model',
	);
}

function buildProviderModelAssets(settings, runtimeModelAssets = {}) {
	const configuredModelDescription = 'Native CLI configured model';
	const customModelDescription = 'Custom sidebar model';
	const claudeRuntimeModels = [];
	for (const model of collectClaudeEnvModels(settings)) {
		addUniqueModelAsset(claudeRuntimeModels, 'claude', model, configuredModelDescription);
	}
	for (const model of runtimeModelAssets.claudeRuntimeModels || []) {
		addUniqueModelAsset(claudeRuntimeModels, 'claude', model?.value || model, model?.description || 'Available runtime model', model);
	}
	for (const model of customModelsForProvider(settings, 'claude')) {
		addUniqueModelAsset(claudeRuntimeModels, 'claude', model, customModelDescription);
	}

	const codexRuntimeModels = [];
	for (const model of collectCodexEnvModels(settings)) {
		addUniqueModelAsset(codexRuntimeModels, 'codex', model, configuredModelDescription);
	}
	for (const model of runtimeModelAssets.codexRuntimeModels || []) {
		addUniqueModelAsset(codexRuntimeModels, 'codex', model?.value || model, model?.description || 'Available runtime model', model);
	}
	for (const model of customModelsForProvider(settings, 'codex')) {
		addUniqueModelAsset(codexRuntimeModels, 'codex', model, customModelDescription);
	}

	return {
		// The selectable list is sourced exclusively from the native CLI config and its model endpoint.
		claudeModels: [],
		claudeModelsLoaded: true,
		claudeRuntimeModels,
		codexModels: [],
		codexModelsLoaded: true,
		codexRuntimeModels,
	};
}

function attachProviderModelAssets(assets, settings, runtimeModelAssets) {
	const modelAssets = buildProviderModelAssets(settings, runtimeModelAssets);
	Object.assign(assets, modelAssets);
	if (modelAssets.claudeModels.length
		|| modelAssets.claudeRuntimeModels.length
		|| modelAssets.codexModels.length
		|| modelAssets.codexRuntimeModels.length) {
		assets.hasAny = true;
	}
	return assets;
}

function normalizeAssetName(value, fallback) {
	return String(value || fallback || 'item').trim() || fallback || 'item';
}

function saveClaudeCommandAssets(workspace, entries) {
	for (const entry of entries.filter((item) => item?.kind !== 'skill')) {
		const name = normalizeAssetName(entry.name, 'command');
		const target = providerAssetFilePath(workspace, CLAUDE_COMMANDS_PATH, entry, name, safeCommandFileName);
		if (isDeletedProviderAsset(entry)) {
			deleteFileAndEmptyParentFolders(target, workspacePath(workspace, CLAUDE_COMMANDS_PATH));
			continue;
		}
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, serializeSlashCommandMarkdown({ ...entry, name }, entry.content), 'utf8');
	}
}

function saveClaudeSkillAssets(workspace, entries, options = {}) {
	const skillRoot = resolveProviderSkillRoot(workspace, options);
	const managedRoot = workspacePath(skillRoot, CLAUDE_SKILLS_PATH);
	for (const entry of entries.filter((item) => item?.kind === 'skill')) {
		const name = safeFolderName(normalizeAssetName(entry.name, 'skill'));
		const filePath = providerAssetFilePath(skillRoot, CLAUDE_SKILLS_PATH, entry, name, (value) => `${safeFolderName(value)}/SKILL.md`);
		const folder = path.dirname(filePath);
		if (isDeletedProviderAsset(entry)) {
			deleteFileAndMaybeFolder(filePath, folder, { managedRoot });
			continue;
		}
		fs.mkdirSync(folder, { recursive: true });
		fs.writeFileSync(filePath, serializeSlashCommandMarkdown({ ...entry, name }, entry.content), 'utf8');
	}
}

function saveClaudeAgentAssets(workspace, agents) {
	const root = workspacePath(workspace, CLAUDE_AGENTS_PATH);
	const existing = new Set(listImmediateFilesAbsolute(root).filter((filePath) => filePath.toLowerCase().endsWith('.md')));
	const written = new Set();
	for (const agent of Array.isArray(agents) ? agents : []) {
		const name = safeFolderName(normalizeAssetName(agent.name || agent.id, 'agent'));
		const filePath = workspacePath(workspace, `${CLAUDE_AGENTS_PATH}/${name}.md`);
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, serializeAgentMarkdown({ ...agent, id: name, name }), 'utf8');
		written.add(filePath);
	}
	for (const filePath of existing) {
		if (!written.has(filePath)) {
			deleteFileAndMaybeFolder(filePath, '', { managedRoot: root });
		}
	}
}

function saveCodexSkillAssets(workspace, skills, options = {}) {
	const skillRoot = resolveProviderSkillRoot(workspace, options);
	for (const skill of Array.isArray(skills) ? skills : []) {
		const previous = parseCodexSkillPersistenceKey(skill.persistenceKey);
		const rootId = normalizeCodexSkillRootId(skill.rootId || previous?.rootId);
		const name = safeFolderName(normalizeAssetName(skill.name, 'skill'));
		const rootPath = codexSkillRootPath(rootId);
		const filePath = workspacePath(skillRoot, `${rootPath}/${safeFolderName(name)}/SKILL.md`);
		const folder = path.dirname(filePath);
		const previousName = previous?.currentName ? safeFolderName(previous.currentName) : '';
		const previousRootId = previous?.rootId || rootId;
		const previousFilePath = previousName
			? workspacePath(skillRoot, `${codexSkillLegacyRootPath(previousRootId)}/${previousName}/SKILL.md`)
			: '';
		const previousFolder = previousFilePath ? path.dirname(previousFilePath) : '';
		const currentManagedRoot = workspacePath(skillRoot, rootPath);
		const previousManagedRoot = workspacePath(skillRoot, codexSkillLegacyRootPath(previousRootId));
		if (isDeletedProviderAsset(skill)) {
			if (previousFilePath) {
				deleteFileAndMaybeFolder(previousFilePath, previousFolder, { managedRoot: previousManagedRoot });
			}
			if (!previousFilePath || path.resolve(previousFilePath) !== path.resolve(filePath)) {
				deleteFileAndMaybeFolder(filePath, folder, { managedRoot: currentManagedRoot });
			}
			continue;
		}
		fs.mkdirSync(folder, { recursive: true });
		fs.writeFileSync(filePath, serializeSlashCommandMarkdown({ name, description: skill.description || '' }, skill.content), 'utf8');
		if (previousFilePath && path.resolve(previousFilePath) !== path.resolve(filePath)) {
			deleteFileAndMaybeFolder(previousFilePath, previousFolder, { managedRoot: previousManagedRoot });
		}
	}
}

function saveCodexSubagentAssets(workspace, agents) {
	const root = workspacePath(workspace, CODEX_AGENTS_PATH);
	const existing = new Set(listImmediateFilesAbsolute(root).filter((filePath) => filePath.toLowerCase().endsWith('.toml')));
	const written = new Set();
	for (const agent of Array.isArray(agents) ? agents : []) {
		const current = parseCodexSubagentPersistenceKey(agent.persistenceKey);
		const sameName = current?.fileName?.replace(/\.toml$/i, '') === agent.name;
		const fileName = sameName && current?.fileName ? current.fileName : `${safeFolderName(normalizeAssetName(agent.name, 'agent'))}.toml`;
		const filePath = workspacePath(workspace, `${CODEX_AGENTS_PATH}/${fileName}`);
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, serializeCodexSubagentToml(agent), 'utf8');
		written.add(filePath);
	}
	for (const filePath of existing) {
		if (!written.has(filePath)) {
			deleteFileAndMaybeFolder(filePath, '', { managedRoot: root });
		}
	}
}

function saveClaudePluginAssets(workspace, plugins) {
	if (!Array.isArray(plugins)) {
		return;
	}
	const filePath = workspacePath(workspace, CLAUDE_PROJECT_SETTINGS_PATH);
	const existing = readJsonFile(filePath, {});
	const settings = existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {};
	settings.$schema = CLAUDE_CODE_SETTINGS_SCHEMA;
	settings.permissions = normalizeClaudeCodePermissions(settings.permissions);
	const enabledPlugins = isRecord(settings.enabledPlugins) ? { ...settings.enabledPlugins } : {};
	for (const plugin of plugins) {
		const normalized = normalizeClaudePlugin(plugin);
		if (!normalized) continue;
		enabledPlugins[normalized.id] = normalized.enabled !== false;
	}
	settings.enabledPlugins = enabledPlugins;
	writeJsonFile(filePath, settings);
}

function saveProviderAssets(workspace, assets, options = {}) {
	const root = resolveWorkspaceRoot(workspace);
	const providerSkillRoot = resolveProviderSkillRoot(root, options);
	const commands = Array.isArray(assets?.claudeCommands) ? assets.claudeCommands : [];
	saveClaudeCommandAssets(root, commands);
	saveClaudeSkillAssets(root, commands, { providerSkillRoot });
	saveClaudeAgentAssets(root, assets?.claudeAgents || []);
	saveClaudePluginAssets(root, assets?.claudePlugins);
	saveCodexSkillAssets(root, assets?.codexSkills || [], { providerSkillRoot });
	saveCodexSubagentAssets(root, assets?.codexSubagents || []);
	return loadProviderAssets(root, { providerSkillRoot });
}

function readJsonlRecords(filePath, maxLines = 2000) {
	const records = [];
	try {
		const raw = readTextFileTailLimited(filePath, NATIVE_HISTORY_JSONL_TAIL_MAX_BYTES);
		if (!raw) {
			return [];
		}
		const lines = raw.split(/\r?\n/).filter((line) => line.trim());
		for (const line of lines.slice(Math.max(0, lines.length - maxLines))) {
			if (records.length >= maxLines) {
				break;
			}
			const trimmed = line.trim();
			if (!trimmed) {
				continue;
			}
			try {
				records.push(JSON.parse(trimmed));
			}
			catch {
				// Ignore malformed transcript lines; providers can append partial lines during active turns.
			}
		}
	}
	catch {
		return [];
	}
	return records;
}

function collectJsonlFiles(root, options = {}) {
	const limit = Number(options.limit || 40);
	const exclude = options.exclude || (() => false);
	const files = [];
	function walk(dir) {
		if (files.length >= limit * 4) {
			return;
		}
		let entries = [];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		}
		catch {
			return;
		}
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (exclude(fullPath)) {
				continue;
			}
			if (entry.isDirectory()) {
				walk(fullPath);
			}
			else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
				try {
					const stat = fs.statSync(fullPath);
					files.push({ path: fullPath, mtimeMs: stat.mtimeMs });
				}
				catch {
					// Ignore files that disappear while scanning.
				}
			}
		}
	}
	walk(root);
	return files.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, limit);
}

function textFromProviderContent(content) {
	if (typeof content === 'string') {
		return content;
	}
	if (!Array.isArray(content)) {
		return '';
	}
	return content.map((part) => {
		if (typeof part === 'string') {
			return part;
		}
		if (!part || typeof part !== 'object') {
			return '';
		}
		return part.text || part.input_text || part.output_text || '';
	}).filter(Boolean).join('\n');
}

function nativeBlockId(prefix, id, timestamp, index = 0) {
	return `${prefix}-${id || timestamp}-${index}`;
}

function stringifyNativeValue(value) {
	if (value === undefined || value === null) {
		return '';
	}
	if (typeof value === 'string') {
		return value;
	}
	try {
		return JSON.stringify(value, null, 2);
	}
	catch {
		return String(value);
	}
}

function parseJsonish(value) {
	if (!value || typeof value !== 'string') {
		return value || {};
	}
	try {
		return JSON.parse(value);
	}
	catch {
		return { input: value };
	}
}

function nativeToolLines(name, input) {
	if (!input || typeof input !== 'object') {
		return [];
	}
	if (name === 'Skill') {
		return [];
	}
	const lines = [];
	for (const key of ['command', 'cwd', 'file_path', 'path', 'query', 'url', 'reason']) {
		if (input[key]) {
			lines.push({ text: `${key}: ${stringifyNativeValue(input[key])}`, wrap: true });
		}
	}
	return lines;
}

function nativeFileNameOnly(filePath) {
	const normalized = String(filePath || '').replace(/\\/g, '/');
	const parts = normalized.split('/');
	return parts[parts.length - 1] || normalized;
}

function nativeApplyPatchSummary(input) {
	if (!input || typeof input !== 'object') {
		return '';
	}
	const patchText = typeof input.patch === 'string' ? input.patch : '';
	const patchFiles = [...patchText.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)]
		.map((match) => match[1]?.trim())
		.filter(Boolean);
	const changeFiles = Array.isArray(input.changes)
		? input.changes.map((change) => change?.path).filter(Boolean)
		: [];
	const files = [...new Set([...patchFiles, ...changeFiles])];
	if (files.length === 0) {
		return patchText ? 'patch' : '';
	}
	return files.length === 1 ? nativeFileNameOnly(files[0]) : `${files.length} files`;
}

function nativeIsAgentLifecycleTool(name) {
	return originalShared.isAgentLifecycleTool(name);
}

function nativeTruncateSummary(text, maxLength) {
	const value = String(text || '');
	return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function nativeAgentLifecycleSummary(name, input) {
	if (name === 'spawn_agent') {
		return nativeTruncateSummary(input?.message || input?.prompt || input?.description || '', 50);
	}
	if (name === 'send_input') {
		return nativeTruncateSummary(input?.message || input?.input || '', 40);
	}
	if (name === 'wait') {
		const ids = Array.isArray(input?.ids) ? input.ids.length : 0;
		const timeoutMs = typeof input?.timeout_ms === 'number' ? input.timeout_ms : undefined;
		const parts = [];
		if (ids > 0) parts.push(`${ids} agent${ids === 1 ? '' : 's'}`);
		if (timeoutMs !== undefined) parts.push(`${Math.round(timeoutMs / 1000)}s`);
		return parts.join(', ');
	}
	return '';
}

function nativeToolSummary(name, input) {
	if (!input || typeof input !== 'object') {
		return name || 'Tool';
	}
	if (name === 'apply_patch') {
		const summary = nativeApplyPatchSummary(input);
		return summary || name || 'Tool';
	}
	if (nativeIsAgentLifecycleTool(name)) {
		return nativeAgentLifecycleSummary(name, input) || '';
	}
	if (name === 'Read') {
		return nativeFileNameOnly(input.file_path || input.path || '') || 'file';
	}
	if (name === 'Glob' || name === 'Grep') {
		return input.pattern || name || 'Tool';
	}
	if (name === 'LS') {
		return nativeFileNameOnly(input.path || '.') || '.';
	}
	if (name === 'Skill') {
		return stringifyNativeValue(input.skill);
	}
	if (name === 'ToolSearch') {
		const query = String(input.query || '');
		const body = query.startsWith('select:') ? query.slice('select:'.length) : query;
		return body.split(',').map((item) => item.trim()).filter(Boolean).join(', ') || 'tools';
	}
	if (name === 'write_stdin') {
		const sessionId = input.session_id ?? input.sessionId;
		const chars = typeof input.chars === 'string' ? input.chars.replace(/\n/g, '\\n') : '';
		if (chars) {
			const preview = chars.length > 24 ? `${chars.slice(0, 24)}...` : chars;
			return sessionId ? `#${sessionId} ${preview}` : preview;
		}
		return sessionId ? `#${sessionId}` : name || 'Tool';
	}
	return input.command || input.file_path || input.path || input.query || input.url || input.reason || name || 'Tool';
}

function nativeToolIcon(name) {
	const sharedIcon = originalShared.getToolIcon(name);
	if (sharedIcon && sharedIcon !== originalShared.MCP_ICON_MARKER && sharedIcon !== 'wrench') {
		return sharedIcon;
	}
	const explicit = {
		Read: 'file',
		Write: 'file',
		Edit: 'file',
		MultiEdit: 'file',
		NotebookEdit: 'file',
		Bash: 'terminal',
		BashOutput: 'terminal',
		KillShell: 'terminal',
		Glob: 'search',
		Grep: 'search',
		LS: 'list',
		TodoWrite: 'check',
		Task: 'bot',
		Agent: 'bot',
		TaskOutput: 'bot',
		WebSearch: 'globe',
		WebFetch: 'download',
		Skill: 'zap',
		ToolSearch: 'search',
		AskUserQuestion: 'help-circle',
		EnterPlanMode: 'map',
		ExitPlanMode: 'check-circle',
		apply_patch: 'file',
		write_stdin: 'terminal',
		spawn_agent: 'bot',
		send_input: 'bot',
		wait: 'clock',
		wait_agent: 'clock',
		resume_agent: 'bot',
		close_agent: 'bot',
	};
	if (explicit[name]) {
		return explicit[name];
	}
	const lower = String(name || '').toLowerCase();
	if (lower.includes('edit') || lower.includes('write') || lower.includes('file') || lower.includes('patch') || lower === 'read' || lower === 'ls') {
		return 'file';
	}
	if (lower.includes('ask') || lower.includes('question')) {
		return 'help-circle';
	}
	if (lower.includes('search') || lower.includes('fetch') || lower.includes('web') || lower === 'grep' || lower === 'glob') {
		return 'search';
	}
	return 'terminal';
}

function normalizeNativeCodexToolName(rawName) {
	const name = String(rawName || '');
	if (name === 'tool_search') return 'ToolSearch';
	return originalShared.normalizeCodexToolName(name) || 'Tool';
}

function nativeCountLineChanges(diffLines) {
	return (diffLines || []).reduce((stats, line) => {
		if (line?.type === 'insert') {
			stats.added += 1;
		}
		else if (line?.type === 'delete') {
			stats.removed += 1;
		}
		return stats;
	}, { added: 0, removed: 0 });
}

function nativeStructuredPatchToDiffLines(hunks) {
	const diffLines = [];
	for (const hunk of Array.isArray(hunks) ? hunks : []) {
		let oldLineNum = Number(hunk?.oldStart || 1);
		let newLineNum = Number(hunk?.newStart || 1);
		for (const rawLine of Array.isArray(hunk?.lines) ? hunk.lines : []) {
			const line = String(rawLine || '');
			const prefix = line[0];
			const text = line.slice(1);
			if (prefix === '+') {
				diffLines.push({ type: 'insert', text, newLineNum: newLineNum++ });
			}
			else if (prefix === '-') {
				diffLines.push({ type: 'delete', text, oldLineNum: oldLineNum++ });
			}
			else {
				diffLines.push({ type: 'equal', text, oldLineNum: oldLineNum++, newLineNum: newLineNum++ });
			}
		}
	}
	return diffLines;
}

function nativeParseUnifiedDiffLines(diffText) {
	const diffLines = [];
	let oldLineNum = 1;
	let newLineNum = 1;
	for (const line of String(diffText || '').split(/\r?\n/)) {
		if (!line || line.startsWith('--- ') || line.startsWith('+++ ')) {
			continue;
		}
		if (line.startsWith('@@')) {
			const match = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
			if (match) {
				oldLineNum = Number(match[1]);
				newLineNum = Number(match[2]);
			}
			continue;
		}
		const prefix = line[0];
		const text = line.slice(1);
		if (prefix === '+') {
			diffLines.push({ type: 'insert', text, newLineNum: newLineNum++ });
		}
		else if (prefix === '-') {
			diffLines.push({ type: 'delete', text, oldLineNum: oldLineNum++ });
		}
		else if (prefix === ' ') {
			diffLines.push({ type: 'equal', text, oldLineNum: oldLineNum++, newLineNum: newLineNum++ });
		}
	}
	return diffLines;
}

function nativeBuildReplacementDiffLines(pairs) {
	const diffLines = [];
	let oldLineNum = 1;
	let newLineNum = 1;
	for (const pair of pairs || []) {
		for (const line of String(pair.oldText ?? '').split('\n')) {
			diffLines.push({ type: 'delete', text: line, oldLineNum: oldLineNum++ });
		}
		for (const line of String(pair.newText ?? '').split('\n')) {
			diffLines.push({ type: 'insert', text: line, newLineNum: newLineNum++ });
		}
	}
	return diffLines;
}

function nativeStringValue(value) {
	return typeof value === 'string' ? value : null;
}

function nativeNonEmptyStringValue(value) {
	return typeof value === 'string' && value.trim() ? value : null;
}

function nativeToolFilePath(input) {
	const source = isRecord(input) ? input : {};
	return nativeNonEmptyStringValue(source.file_path) || nativeNonEmptyStringValue(source.path) || 'file';
}

function nativeReplacementPair(value) {
	if (!isRecord(value)) {
		return null;
	}
	const oldText = nativeStringValue(value.oldText ?? value.old_text ?? value.old_string);
	const newText = nativeStringValue(value.newText ?? value.new_text ?? value.new_string);
	return oldText !== null && newText !== null ? { oldText, newText } : null;
}

function nativeEditPairs(input) {
	const topLevelPair = nativeReplacementPair(input);
	if (topLevelPair) {
		return [topLevelPair];
	}
	const pairs = [];
	if (Array.isArray(input?.edits)) {
		for (const edit of input.edits) {
			const pair = nativeReplacementPair(edit);
			if (pair) {
				pairs.push(pair);
			}
		}
	}
	return pairs;
}

function nativeUnifiedDiffText(result) {
	if (!isRecord(result)) {
		return null;
	}
	if (typeof result.diff === 'string' && result.diff.trim()) {
		return result.diff;
	}
	if (isRecord(result.details) && typeof result.details.diff === 'string' && result.details.diff.trim()) {
		return result.details.diff;
	}
	return null;
}

function nativeDiffFromToolInput(name, input, filePath) {
	const toolName = String(name || '');
	if (toolName === 'Edit' || toolName === 'MultiEdit' || toolName === 'NotebookEdit') {
		const pairs = nativeEditPairs(input || {});
		if (pairs.length > 0) {
			const diffLines = nativeBuildReplacementDiffLines(pairs);
			return { filePath, diffLines, stats: nativeCountLineChanges(diffLines) };
		}
	}
	if (toolName === 'Write') {
		const content = input?.content;
		if (typeof content === 'string') {
			const newLines = content.split('\n');
			const diffLines = newLines.map((text, index) => ({ type: 'insert', text, newLineNum: index + 1 }));
			return { filePath, diffLines, stats: { added: newLines.length, removed: 0 } };
		}
	}
	return undefined;
}

function extractNativeDiffData(toolUseResult, toolCall) {
	const input = isRecord(toolCall?.input) ? toolCall.input : {};
	const filePath = nativeToolFilePath(input);
	if (isRecord(toolUseResult)) {
		if (Array.isArray(toolUseResult.structuredPatch) && toolUseResult.structuredPatch.length > 0) {
			const resultFilePath = nativeNonEmptyStringValue(toolUseResult.filePath) || filePath;
			const diffLines = nativeStructuredPatchToDiffLines(toolUseResult.structuredPatch);
			return { filePath: resultFilePath, diffLines, stats: nativeCountLineChanges(diffLines) };
		}
		const unifiedDiff = nativeUnifiedDiffText(toolUseResult);
		if (unifiedDiff) {
			const diffLines = nativeParseUnifiedDiffLines(unifiedDiff);
			if (diffLines.length > 0) {
				const resultFilePath = nativeNonEmptyStringValue(toolUseResult.filePath)
					|| nativeNonEmptyStringValue(toolUseResult.path)
					|| filePath;
				return { filePath: resultFilePath, diffLines, stats: nativeCountLineChanges(diffLines) };
			}
		}
	}
	return nativeDiffFromToolInput(toolCall?.name, input, filePath);
}

function nativeParseApplyPatchDiffs(patchText) {
	if (!String(patchText || '').trim()) {
		return [];
	}
	const fileDiffs = [];
	const lines = String(patchText || '').split(/\r?\n/);
	let current = null;
	const flushCurrent = () => {
		if (!current) {
			return;
		}
		fileDiffs.push(nativeBuildApplyPatchFileDiff(current));
		current = null;
	};
	for (const line of lines) {
		if (line.startsWith('*** Begin Patch') || line.startsWith('*** End Patch')) {
			continue;
		}
		if (line.startsWith('*** Add File: ')) {
			flushCurrent();
			current = { filePath: line.slice('*** Add File: '.length).trim(), operation: 'add', rawLines: [] };
			continue;
		}
		if (line.startsWith('*** Update File: ')) {
			flushCurrent();
			current = { filePath: line.slice('*** Update File: '.length).trim(), operation: 'update', rawLines: [] };
			continue;
		}
		if (line.startsWith('*** Delete File: ')) {
			flushCurrent();
			fileDiffs.push({
				filePath: line.slice('*** Delete File: '.length).trim(),
				operation: 'delete',
				diffLines: [],
				stats: { added: 0, removed: 0 },
			});
			continue;
		}
		if (!current) {
			continue;
		}
		if (line.startsWith('*** Move to: ')) {
			current.movedTo = line.slice('*** Move to: '.length).trim();
			continue;
		}
		if (line === '*** End of File' || line.startsWith('@@') || line.startsWith('--- ') || line.startsWith('+++ ')) {
			continue;
		}
		const prefix = line[0];
		if (prefix === '+' || prefix === '-' || prefix === ' ') {
			current.rawLines.push(line);
		}
	}
	flushCurrent();
	return fileDiffs;
}

function nativeBuildApplyPatchFileDiff(current) {
	const diffLines = [];
	let oldLineNum = 1;
	let newLineNum = 1;
	for (const line of current.rawLines || []) {
		const prefix = line[0];
		const text = line.slice(1);
		if (prefix === '+') {
			diffLines.push({ type: 'insert', text, newLineNum: newLineNum++ });
		}
		else if (prefix === '-') {
			diffLines.push({ type: 'delete', text, oldLineNum: oldLineNum++ });
		}
		else {
			diffLines.push({ type: 'equal', text, oldLineNum: oldLineNum++, newLineNum: newLineNum++ });
		}
	}
	return {
		filePath: current.filePath,
		operation: current.operation,
		...(current.movedTo ? { movedTo: current.movedTo } : {}),
		diffLines,
		stats: nativeCountLineChanges(diffLines),
	};
}

function nativeNormalizePatchOperation(value) {
	return value === 'add' || value === 'delete' || value === 'update' ? value : 'update';
}

function nativeParseFileUpdateKind(value) {
	if (typeof value === 'string') {
		return { operation: nativeNormalizePatchOperation(value) };
	}
	if (isRecord(value)) {
		return {
			operation: nativeNormalizePatchOperation(typeof value.type === 'string' ? value.type : ''),
			...(typeof value.move_path === 'string' ? { movedTo: value.move_path } : {}),
		};
	}
	return { operation: 'update' };
}

function nativeParseFileUpdateChangeDiffs(changes) {
	if (!Array.isArray(changes)) {
		return [];
	}
	return changes.map((change) => {
		if (!isRecord(change)) {
			return null;
		}
		const filePath = typeof change.path === 'string' ? change.path : '';
		const diff = typeof change.diff === 'string' ? change.diff : '';
		if (!filePath || !diff.trim()) {
			return null;
		}
		const kindInfo = nativeParseFileUpdateKind(change.kind ?? change.type);
		const diffLines = nativeParseUnifiedDiffLines(diff);
		return {
			filePath,
			operation: kindInfo.operation,
			...(kindInfo.movedTo ? { movedTo: kindInfo.movedTo } : {}),
			diffLines,
			stats: nativeCountLineChanges(diffLines),
		};
	}).filter(Boolean);
}

function nativeApplyPatchFileDiffs(input) {
	if (!isRecord(input)) {
		return [];
	}
	const patchText = typeof input.patch === 'string' ? input.patch : '';
	const parsedPatch = patchText ? nativeParseApplyPatchDiffs(patchText) : [];
	return parsedPatch.length > 0 ? parsedPatch : nativeParseFileUpdateChangeDiffs(input.changes);
}

function nativePatchStats(fileDiffs) {
	return (fileDiffs || []).reduce((stats, fileDiff) => ({
		added: stats.added + (fileDiff?.stats?.added || 0),
		removed: stats.removed + (fileDiff?.stats?.removed || 0),
	}), { added: 0, removed: 0 });
}

function attachNativeDiffData(block, toolUseResult) {
	const diffData = extractNativeDiffData(toolUseResult, block);
	if (diffData) {
		block.diffData = diffData;
		block.diffLines = diffData.diffLines;
		block.diffStats = diffData.stats;
		block.filePath = diffData.filePath;
	}
	if (block.name === 'apply_patch') {
		const fileDiffs = nativeApplyPatchFileDiffs(block.input);
		if (fileDiffs.length > 0) {
			block.patchFileDiffs = fileDiffs;
			block.patchStats = nativePatchStats(fileDiffs);
		}
	}
}

function makeNativeToolBlock(id, name, input, timestamp, result, toolUseResult) {
	const block = {
		type: 'tool_use',
		id: id || nativeBlockId('native-tool', name, timestamp),
		name: name || 'Tool',
		icon: nativeToolIcon(name),
		summary: nativeToolSummary(name, input),
		status: 'completed',
		input: input && typeof input === 'object' ? input : {},
		lines: nativeToolLines(name, input),
	};
	if (block.name === 'Bash' && block.input.command) {
		block.command = block.input.command;
	}
	if (result !== undefined && result !== null && stringifyNativeValue(result).trim()) {
		block.result = stringifyNativeValue(result);
	}
	if (block.name === 'AskUserQuestion') {
		block.contentClass = 'claudian-tool-content-ask';
		const resolvedAnswers = parseAskAnswersFromJsonObject(block.result) || parseAskAnswersFromQuotedPairs(block.result);
		if (resolvedAnswers) {
			block.resolvedAnswers = resolvedAnswers;
		}
	}
	attachNativeDiffData(block, toolUseResult !== undefined ? toolUseResult : result);
	return block;
}

function makeNativeMessage(role, content, timestamp, id, displayContent, images) {
	const visibleContent = displayContent !== undefined && displayContent !== null ? String(displayContent || '') : String(content || '');
	const message = {
		id: id || `native-${role}-${timestamp}-${Math.random().toString(36).slice(2)}`,
		role,
		content: String(content || ''),
		displayContent: displayContent || undefined,
		contentBlocks: [],
		toolCalls: [],
		timestamp,
		durationSeconds: role === 'assistant' ? 1 : 0,
		durationFlavorWord: 'Loaded',
	};
	if (role === 'user' && Array.isArray(images) && images.length > 0) {
		message.images = images;
	}
	if (role === 'assistant') {
		message.contentBlocks = [{ type: 'text', id: `${message.id}-text`, content: message.content }];
		message.runtimeTurnId = id || null;
	}
	else if (visibleContent.trim()) {
		message.contentBlocks = [{ type: 'text', id: `${message.id}-text`, content: visibleContent }];
	}
	return message;
}

function isClaudeTaskToolName(name) {
	const value = String(name || '').trim();
	return value === 'Task' || value === 'Agent' || value.startsWith('Task(');
}

function normalizeSubagentStatus(subagent) {
	return String(subagent?.asyncStatus || subagent?.status || '').trim() || 'completed';
}

function normalizeSubagentMode(subagent) {
	return subagent?.mode === 'async' ? 'async' : subagent?.mode === 'sync' ? 'sync' : undefined;
}

function normalizeSubagentToolForBlock(toolCall) {
	const input = toolCall?.input && typeof toolCall.input === 'object' && !Array.isArray(toolCall.input) ? toolCall.input : {};
	return {
		id: String(toolCall?.id || nativeBlockId('native-subagent-tool', toolCall?.name || 'tool', Date.now())),
		name: String(toolCall?.name || 'Tool'),
		icon: toolCall?.icon || nativeToolIcon(toolCall?.name),
		summary: toolCall?.summary || nativeToolSummary(toolCall?.name, input),
		status: String(toolCall?.status || (toolCall?.isError ? 'error' : 'completed')),
		result: stringifyNativeValue(toolCall?.result || toolCall?.content || ''),
		input,
	};
}

function parseNativeHistoryTimestamp(raw, fallback = Date.now()) {
	if (typeof raw !== 'string') {
		return fallback;
	}
	const parsed = Date.parse(raw);
	return Number.isNaN(parsed) ? fallback : parsed;
}

function isClaudePathSafeId(value) {
	const text = String(value || '');
	return text.length > 0
		&& text.length <= 128
		&& !text.includes('..')
		&& !text.includes('/')
		&& !text.includes('\\')
		&& /^[a-zA-Z0-9_-]+$/.test(text);
}

function encodeClaudeSdkVaultPath(vaultPath) {
	return path.resolve(String(vaultPath || process.cwd())).replace(/[^a-zA-Z0-9]/g, '-');
}

function claudeSubagentSidecarCandidates(homeDir, workspace, sessionId, agentId, sessionPath = '') {
	if (!isClaudePathSafeId(sessionId) || !isClaudePathSafeId(agentId)) {
		return [];
	}
	const candidates = [];
	if (sessionPath) {
		candidates.push(path.join(path.dirname(sessionPath), sessionId, 'subagents', `agent-${agentId}.jsonl`));
	}
	if (workspace) {
		candidates.push(path.join(String(homeDir || os.homedir()), '.claude', 'projects', encodeClaudeSdkVaultPath(workspace), sessionId, 'subagents', `agent-${agentId}.jsonl`));
	}
	return [...new Set(candidates)];
}

function parseClaudeSubagentSidecarEvents(record) {
	if (!isRecord(record)) {
		return [];
	}
	const content = record.message?.content;
	if (!Array.isArray(content)) {
		return [];
	}
	const timestamp = parseNativeHistoryTimestamp(record.timestamp);
	const events = [];
	for (const block of content) {
		if (!isRecord(block)) continue;
		if (block.type === 'tool_use' && typeof block.id === 'string' && typeof block.name === 'string') {
			events.push({
				type: 'tool_use',
				toolUseId: block.id,
				toolName: block.name,
				toolInput: isRecord(block.input) ? block.input : {},
				timestamp,
			});
		}
		else if (block.type === 'tool_result' && typeof block.tool_use_id === 'string') {
			events.push({
				type: 'tool_result',
				toolUseId: block.tool_use_id,
				content: textFromProviderContent(block.content) || stringifyNativeValue(block.content),
				isError: block.is_error === true,
				timestamp,
			});
		}
	}
	return events;
}

function buildClaudeSubagentToolCallsFromEvents(events) {
	const byId = new Map();
	for (const event of events) {
		let entry = byId.get(event.toolUseId);
		if (event.type === 'tool_use') {
			if (!entry) {
				entry = {
					toolCall: {
						id: event.toolUseId,
						name: event.toolName,
						input: { ...event.toolInput },
						status: 'running',
						isExpanded: false,
					},
					hasToolUse: true,
					hasToolResult: false,
					timestamp: event.timestamp,
				};
				byId.set(event.toolUseId, entry);
			}
			else {
				entry.toolCall.name = event.toolName;
				entry.toolCall.input = { ...event.toolInput };
				entry.hasToolUse = true;
				entry.timestamp = event.timestamp;
			}
			continue;
		}
		if (!entry) {
			entry = {
				toolCall: {
					id: event.toolUseId,
					name: 'Unknown',
					input: {},
					status: event.isError ? 'error' : 'completed',
					result: event.content,
					isExpanded: false,
				},
				hasToolUse: false,
				hasToolResult: true,
				timestamp: event.timestamp,
			};
			byId.set(event.toolUseId, entry);
			continue;
		}
		entry.toolCall.status = event.isError ? 'error' : 'completed';
		entry.toolCall.result = event.content;
		entry.hasToolResult = true;
	}
	return Array.from(byId.values())
		.filter((entry) => entry.hasToolUse)
		.sort((a, b) => a.timestamp - b.timestamp)
		.map((entry) => entry.toolCall);
}

function loadClaudeSubagentToolCallsFromSidecars(homeDir, workspace, sessionEntries, agentId) {
	for (const entry of sessionEntries || []) {
		const sessionId = String(entry?.sessionId || '').trim();
		const sessionPath = String(entry?.path || '');
		for (const filePath of claudeSubagentSidecarCandidates(homeDir, workspace, sessionId, agentId, sessionPath)) {
			const records = readJsonlRecords(filePath, 4000);
			if (records.length === 0) {
				continue;
			}
			const events = [];
			const seen = new Set();
			for (const record of records) {
				for (const event of parseClaudeSubagentSidecarEvents(record)) {
					const key = `${event.type}:${event.toolUseId}`;
					if (seen.has(key)) continue;
					seen.add(key);
					events.push(event);
				}
			}
			const toolCalls = buildClaudeSubagentToolCallsFromEvents(events);
			if (toolCalls.length > 0) {
				return toolCalls;
			}
		}
	}
	return [];
}

function enrichClaudeSubagentDataFromSidecars(subagentData, homeDir, workspace, sessionEntries) {
	for (const subagent of Object.values(subagentData || {})) {
		if (!isRecord(subagent)) continue;
		if (subagent.mode !== 'async') continue;
		if (!subagent.agentId) continue;
		if (Array.isArray(subagent.toolCalls) && subagent.toolCalls.length > 0) continue;
		const toolCalls = loadClaudeSubagentToolCallsFromSidecars(homeDir, workspace, sessionEntries, String(subagent.agentId));
		if (toolCalls.length > 0) {
			subagent.toolCalls = toolCalls.map((toolCall) => ({
				...toolCall,
				input: isRecord(toolCall.input) ? { ...toolCall.input } : {},
			}));
		}
	}
}

function extractClaudeXmlTag(content, tagName) {
	const match = String(content || '').match(new RegExp(`<${tagName}>\\s*([\\s\\S]*?)\\s*</${tagName}>`, 'i'));
	const value = match?.[1]?.trim() || '';
	return value || null;
}

function collectClaudeAsyncSubagentResults(records) {
	const results = new Map();
	for (const record of records || []) {
		if (record?.type !== 'queue-operation' || record.operation !== 'enqueue') {
			continue;
		}
		const content = typeof record.content === 'string' ? record.content : '';
		if (!content.includes('<task-notification>')) {
			continue;
		}
		const taskId = extractClaudeXmlTag(content, 'task-id');
		const result = extractClaudeXmlTag(content, 'result');
		if (!taskId || !result) {
			continue;
		}
		results.set(taskId, {
			result,
			status: extractClaudeXmlTag(content, 'status') || 'completed',
		});
	}
	return results;
}

function extractClaudeAgentIdFromToolUseResult(toolUseResult) {
	if (!isRecord(toolUseResult)) {
		return null;
	}
	const direct = toolUseResult.agentId ?? toolUseResult.agent_id;
	if (typeof direct === 'string' && direct.length > 0) {
		return direct;
	}
	if (isRecord(toolUseResult.data)) {
		const nested = toolUseResult.data.agentId ?? toolUseResult.data.agent_id;
		if (typeof nested === 'string' && nested.length > 0) {
			return nested;
		}
	}
	return null;
}

function resolveClaudeAsyncStatus(toolUseResult, fallbackStatus) {
	if (!isRecord(toolUseResult)) {
		return fallbackStatus;
	}
	const raw = String(toolUseResult.retrieval_status || toolUseResult.status || '').toLowerCase();
	if (raw === 'error' || raw === 'failed' || raw === 'stopped' || raw === 'killed') {
		return 'error';
	}
	if (raw === 'completed' || raw === 'success') {
		return 'completed';
	}
	if (toolUseResult.isAsync === true || raw === 'async_launched') {
		return 'running';
	}
	return fallbackStatus;
}

function buildNativeAsyncSubagentInfo(toolBlock, toolUseResult, asyncSubagentResults) {
	const agentId = extractClaudeAgentIdFromToolUseResult(toolUseResult);
	if (!agentId) {
		return null;
	}
	const queueResult = asyncSubagentResults?.get(agentId);
	let fallback = 'running';
	if (toolBlock.status === 'error') {
		fallback = 'error';
	}
	else if (toolBlock.status === 'completed') {
		fallback = 'completed';
	}
	const asyncStatus = queueResult
		? resolveClaudeAsyncStatus({ status: queueResult.status }, 'completed')
		: resolveClaudeAsyncStatus(toolUseResult, fallback);
	const status = asyncStatus === 'orphaned' ? 'error' : asyncStatus;
	return {
		id: toolBlock.id,
		description: String(toolBlock.input?.description || toolBlock.summary || 'Background task'),
		summary: String(toolBlock.input?.description || toolBlock.summary || 'Background task'),
		prompt: String(toolBlock.input?.prompt || ''),
		mode: 'async',
		isExpanded: false,
		status,
		asyncStatus,
		agentId,
		result: queueResult?.result ?? toolBlock.result,
		toolCalls: [],
	};
}

function makeNativeSubagentBlock(subagentId, subagent) {
	const mode = normalizeSubagentMode(subagent);
	const tools = (Array.isArray(subagent?.toolCalls) ? subagent.toolCalls : []).map(normalizeSubagentToolForBlock);
	return {
		type: 'subagent',
		id: `native-subagent-${subagentId}`,
		subagentId,
		mode,
		description: String(subagent?.description || subagent?.summary || 'Subagent task'),
		summary: String(subagent?.summary || subagent?.description || 'Subagent task'),
		prompt: String(subagent?.prompt || ''),
		status: normalizeSubagentStatus(subagent),
		asyncStatus: subagent?.asyncStatus,
		agentId: subagent?.agentId,
		outputToolId: subagent?.outputToolId,
		result: stringifyNativeValue(subagent?.result || ''),
		tools,
		toolCalls: tools,
	};
}

function nativeToolCallFromBlock(block) {
	if (!isRecord(block)) {
		return null;
	}
	if (block.type === 'tool_use') {
		return {
			id: String(block.id || block.toolId || ''),
			name: String(block.name || 'Tool'),
			input: isRecord(block.input) ? { ...block.input } : {},
			status: String(block.status || 'completed'),
			result: typeof block.result === 'string' ? block.result : stringifyNativeValue(block.result || ''),
			isError: block.isError === true || block.status === 'error',
			isExpanded: block.isExpanded === true,
			...(block.diffData ? { diffData: block.diffData } : {}),
			...(block.patchStats ? { patchStats: block.patchStats } : {}),
			...(block.patchFileDiffs ? { patchFileDiffs: block.patchFileDiffs } : {}),
			...(block.resolvedAnswers ? { resolvedAnswers: block.resolvedAnswers } : {}),
		};
	}
	if (block.type === 'subagent') {
		const mode = block.mode === 'sync' ? 'sync' : 'async';
		const input = {
			description: block.description || block.summary || 'Subagent task',
			prompt: block.prompt || '',
			...(mode === 'async' ? { run_in_background: true } : {}),
		};
		const subagent = {
			id: block.subagentId,
			description: block.description || block.summary || 'Subagent task',
			summary: block.summary || block.description || 'Subagent task',
			prompt: block.prompt || '',
			mode,
			status: block.status || block.asyncStatus || 'completed',
			asyncStatus: block.asyncStatus || (mode === 'async' ? block.status : undefined),
			result: block.result || '',
			toolCalls: Array.isArray(block.toolCalls) ? block.toolCalls : (Array.isArray(block.tools) ? block.tools : []),
			agentId: block.agentId,
			outputToolId: block.outputToolId,
			isExpanded: block.isExpanded === true,
		};
		return {
			id: String(block.subagentId || block.id || ''),
			name: 'Task',
			input,
			status: subagent.status,
			result: subagent.result,
			isExpanded: false,
			subagent,
		};
	}
	return null;
}

function refreshNativeMessageToolCalls(message) {
	if (!message || message.role !== 'assistant') {
		return;
	}
	message.toolCalls = (Array.isArray(message.contentBlocks) ? message.contentBlocks : [])
		.map(nativeToolCallFromBlock)
		.filter(Boolean);
}

function mergeNativeSubagentInfo(toolCall, subagent) {
	const existing = toolCall?.subagent && typeof toolCall.subagent === 'object' ? toolCall.subagent : {};
	const mode = normalizeSubagentMode(subagent) || normalizeSubagentMode(existing);
	const sdkToolCalls = Array.isArray(existing.toolCalls) ? existing.toolCalls : [];
	const cachedToolCalls = Array.isArray(subagent?.toolCalls) ? subagent.toolCalls : [];
	const resultText = stringifyNativeValue(toolCall?.result || existing.result || '').trim();
	const cachedResult = stringifyNativeValue(subagent?.result || '').trim();
	return {
		...subagent,
		...existing,
		description: existing.description || subagent?.description || subagent?.summary || 'Subagent task',
		prompt: existing.prompt || subagent?.prompt || '',
		mode,
		status: normalizeSubagentStatus(subagent) || normalizeSubagentStatus(existing),
		asyncStatus: subagent?.asyncStatus || existing.asyncStatus,
		result: resultText.length >= cachedResult.length ? (toolCall?.result || existing.result || subagent?.result) : subagent?.result,
		toolCalls: sdkToolCalls.length >= cachedToolCalls.length ? sdkToolCalls : cachedToolCalls,
		agentId: existing.agentId || subagent?.agentId,
		outputToolId: existing.outputToolId || subagent?.outputToolId,
		startedAt: existing.startedAt ?? subagent?.startedAt,
		completedAt: existing.completedAt ?? subagent?.completedAt,
		isExpanded: existing.isExpanded ?? subagent?.isExpanded,
	};
}

function ensureNativeSubagentToolCall(message, subagentId, subagent) {
	message.toolCalls = Array.isArray(message.toolCalls) ? message.toolCalls : [];
	let toolCall = message.toolCalls.find((candidate) => (
		candidate?.id === subagentId && isClaudeTaskToolName(candidate.name)
	));
	const mode = normalizeSubagentMode(subagent);
	if (!toolCall) {
		toolCall = {
			id: subagentId,
			name: 'Task',
			input: {
				description: subagent?.description || subagent?.summary || 'Subagent task',
				prompt: subagent?.prompt || '',
				...(mode === 'async' ? { run_in_background: true } : {}),
			},
			status: normalizeSubagentStatus(subagent),
			result: subagent?.result,
			isExpanded: false,
			subagent,
		};
		message.toolCalls.push(toolCall);
	}
	toolCall.input = toolCall.input && typeof toolCall.input === 'object' && !Array.isArray(toolCall.input)
		? toolCall.input
		: {};
	if (!toolCall.input.description) {
		toolCall.input.description = subagent?.description || subagent?.summary || 'Subagent task';
	}
	if (!toolCall.input.prompt) {
		toolCall.input.prompt = subagent?.prompt || '';
	}
	if (mode === 'async') {
		toolCall.input.run_in_background = true;
	}
	toolCall.subagent = mergeNativeSubagentInfo(toolCall, subagent);
	toolCall.status = toolCall.subagent.status;
	if (toolCall.subagent.result !== undefined) {
		toolCall.result = toolCall.subagent.result;
	}
	return toolCall;
}

function applyClaudeSubagentDataToNativeMessages(messages, subagentData) {
	const entries = Object.entries(subagentData || {}).filter(([, subagent]) => subagent && typeof subagent === 'object');
	if (entries.length === 0) {
		return;
	}
	const attached = new Set();
	for (const message of messages) {
		if (message?.role !== 'assistant') continue;
		message.contentBlocks = Array.isArray(message.contentBlocks) ? message.contentBlocks : [];
		for (const [subagentId, subagent] of entries) {
			const hasSubagentBlock = message.contentBlocks.some((block) => (
				(block?.type === 'subagent' && block.subagentId === subagentId)
				|| (block?.type === 'tool_use' && block.toolId === subagentId)
				|| (block?.type === 'tool_use' && block.id === subagentId)
			));
			const hasTaskToolCall = (Array.isArray(message.toolCalls) ? message.toolCalls : []).some((tool) => (
				tool?.id === subagentId && isClaudeTaskToolName(tool.name)
			));
			if (!hasSubagentBlock && !hasTaskToolCall) continue;
			ensureNativeSubagentToolCall(message, subagentId, subagent);
			let hasNormalizedBlock = false;
			message.contentBlocks = message.contentBlocks.map((block) => {
				if (block?.type === 'tool_use' && (block.toolId === subagentId || block.id === subagentId)) {
					hasNormalizedBlock = true;
					return makeNativeSubagentBlock(subagentId, subagent);
				}
				if (block?.type === 'subagent' && block.subagentId === subagentId) {
					hasNormalizedBlock = true;
					return { ...makeNativeSubagentBlock(subagentId, subagent), ...block, mode: block.mode || normalizeSubagentMode(subagent) };
				}
				return block;
			});
			if (!hasNormalizedBlock) {
				message.contentBlocks.push(makeNativeSubagentBlock(subagentId, subagent));
			}
			attached.add(subagentId);
		}
	}
	for (const [subagentId, subagent] of entries) {
		if (attached.has(subagentId)) continue;
		let anchor = [...messages].reverse().find((message) => message?.role === 'assistant');
		if (!anchor) {
			anchor = makeNativeAssistantMessage([], Number(subagent?.completedAt || subagent?.startedAt || Date.now()), `subagent-recovery-${subagentId}`);
			messages.push(anchor);
		}
		ensureNativeSubagentToolCall(anchor, subagentId, subagent);
		anchor.contentBlocks = Array.isArray(anchor.contentBlocks) ? anchor.contentBlocks : [];
		if (!anchor.contentBlocks.some((block) => block?.type === 'subagent' && block.subagentId === subagentId)) {
			anchor.contentBlocks.push(makeNativeSubagentBlock(subagentId, subagent));
		}
	}
}

function makeNativeAssistantMessage(blocks, timestamp, id) {
	const normalizedBlocks = (blocks || []).filter(Boolean);
	const text = normalizedBlocks
		.filter((block) => block.type === 'text')
		.map((block) => block.content || '')
		.join('\n')
		.trim();
	const message = makeNativeMessage('assistant', text, timestamp, id);
	message.contentBlocks = normalizedBlocks;
	refreshNativeMessageToolCalls(message);
	message.runtimeTurnId = id || null;
	return message;
}

function extractClaudeToolResults(records) {
	const results = new Map();
	for (const record of records) {
		if (record?.type !== 'user') {
			continue;
		}
		const content = record.message?.content ?? record.content;
		if (!Array.isArray(content)) {
			continue;
		}
		for (const block of content) {
			if (block?.type !== 'tool_result' || !block.tool_use_id) {
				continue;
			}
			results.set(block.tool_use_id, {
				content: textFromProviderContent(block.content) || stringifyNativeValue(block.content),
				isError: block.is_error === true,
				toolUseResult: record.toolUseResult,
			});
		}
	}
	return results;
}

function normalizeAskAnswerValue(value) {
	if (typeof value === 'string') {
		return value || undefined;
	}
	if (Array.isArray(value)) {
		const normalized = value.map((item) => typeof item === 'string' ? item : String(item)).filter(Boolean);
		if (normalized.length === 0) {
			return undefined;
		}
		return normalized.length === 1 ? normalized[0] : normalized;
	}
	if (value && typeof value === 'object') {
		if ('answers' in value) return normalizeAskAnswerValue(value.answers);
		if ('answer' in value) return normalizeAskAnswerValue(value.answer);
		if ('value' in value) return normalizeAskAnswerValue(value.value);
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return undefined;
}

function normalizeAskAnswersObject(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return undefined;
	}
	const answers = {};
	for (const [question, rawValue] of Object.entries(value)) {
		const normalized = normalizeAskAnswerValue(rawValue);
		if (normalized) {
			answers[question] = normalized;
		}
	}
	return Object.keys(answers).length > 0 ? answers : undefined;
}

function parseAskAnswersFromJsonObject(resultText) {
	const text = String(resultText || '');
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start < 0 || end <= start) {
		return undefined;
	}
	try {
		const parsed = JSON.parse(text.slice(start, end + 1));
		return normalizeAskAnswersObject(parsed?.answers) || normalizeAskAnswersObject(parsed);
	}
	catch {
		return undefined;
	}
}

function parseAskAnswersFromQuotedPairs(resultText) {
	const answers = {};
	const pattern = /"([^"]+)"="([^"]*)"/g;
	for (const match of String(resultText || '').matchAll(pattern)) {
		const question = match[1]?.trim();
		if (question) {
			answers[question] = match[2] || '';
		}
	}
	return Object.keys(answers).length > 0 ? answers : undefined;
}

function extractAskUserResolvedAnswers(result) {
	return normalizeAskAnswersObject(result?.toolUseResult?.answers)
		|| parseAskAnswersFromJsonObject(result?.content)
		|| parseAskAnswersFromQuotedPairs(result?.content);
}

function extractClaudeTextContent(content) {
	if (typeof content === 'string') {
		return content;
	}
	if (!Array.isArray(content)) {
		return '';
	}
	return content
		.map((part) => {
			if (typeof part === 'string') {
				return part;
			}
			if (!part || typeof part !== 'object') {
				return '';
			}
			if (part.type === 'text' && typeof part.text === 'string' && part.text.trim() !== '(no content)') {
				return part.text;
			}
			return '';
		})
		.filter(Boolean)
		.join('\n');
}

function extractClaudeImages(content, timestamp, messageId) {
	if (!Array.isArray(content)) {
		return undefined;
	}
	const images = [];
	for (const part of content) {
		if (part?.type !== 'image' || !part.source?.data) {
			continue;
		}
		images.push({
			id: nativeBlockId('native-img', messageId, timestamp, images.length),
			name: `image-${images.length + 1}`,
			mediaType: part.source.media_type || 'image/png',
			data: String(part.source.data || ''),
			size: Math.ceil(String(part.source.data || '').length * 0.75),
			source: 'paste',
		});
	}
	return images.length > 0 ? images : undefined;
}

function filterActiveClaudeBranch(records, resumeAtMessageId) {
	if (!Array.isArray(records) || records.length === 0) {
		return [];
	}
	const isRealUserBranchChild = (entry) => !!entry
		&& entry.type === 'user'
		&& !('toolUseResult' in entry)
		&& !entry.isMeta
		&& !('sourceToolUseID' in entry);
	const isDirectRealUserBranchChild = (parentUuid, entry) => !!entry
		&& entry.parentUuid === parentUuid
		&& isRealUserBranchChild(entry);
	const seen = new Set();
	const deduped = [];
	for (const entry of records) {
		if (entry?.uuid) {
			if (seen.has(entry.uuid)) {
				continue;
			}
			seen.add(entry.uuid);
		}
		deduped.push(entry);
	}
	const progressUuids = new Set();
	const progressParentOf = new Map();
	for (const entry of deduped) {
		if (entry?.type === 'progress' && entry.uuid) {
			progressUuids.add(entry.uuid);
			progressParentOf.set(entry.uuid, entry.parentUuid ?? null);
		}
	}
	const resolveParent = (parentUuid) => {
		if (!parentUuid) {
			return parentUuid;
		}
		let current = parentUuid;
		let guard = progressUuids.size + 1;
		while (current && progressUuids.has(current)) {
			if (guard < 0) {
				break;
			}
			guard -= 1;
			current = progressParentOf.get(current) ?? null;
		}
		return current;
	};
	const conversationEntries = deduped.filter((entry) => entry?.type !== 'progress');
	const byUuid = new Map();
	const childrenOf = new Map();
	for (const entry of conversationEntries) {
		if (entry?.uuid) {
			byUuid.set(entry.uuid, entry);
		}
		const effectiveParent = resolveParent(entry?.parentUuid) ?? null;
		if (effectiveParent && entry?.uuid) {
			if (!childrenOf.has(effectiveParent)) {
				childrenOf.set(effectiveParent, new Set());
			}
			childrenOf.get(effectiveParent).add(entry.uuid);
		}
	}
	const findLatestLeaf = () => {
		for (let index = conversationEntries.length - 1; index >= 0; index -= 1) {
			const uuid = conversationEntries[index]?.uuid;
			if (uuid && !childrenOf.has(uuid)) {
				return conversationEntries[index];
			}
		}
		return undefined;
	};
	const latestLeaf = findLatestLeaf();
	const latestBranchUuids = new Set();
	const activeChildOf = new Map();
	let latestCurrent = latestLeaf;
	while (latestCurrent?.uuid) {
		latestBranchUuids.add(latestCurrent.uuid);
		const parent = resolveParent(latestCurrent.parentUuid);
		if (parent) {
			activeChildOf.set(parent, latestCurrent.uuid);
		}
		latestCurrent = parent ? byUuid.get(parent) : undefined;
	}
	const conversationContentCache = new Map();
	const hasConversationContent = (uuid) => {
		if (conversationContentCache.has(uuid)) {
			return conversationContentCache.get(uuid);
		}
		const entry = byUuid.get(uuid);
		let result = false;
		if (entry?.type === 'assistant') {
			result = true;
		}
		else if (entry?.type === 'user' && !entry.isMeta && !('sourceToolUseID' in entry)) {
			result = true;
		}
		else {
			const children = childrenOf.get(uuid);
			if (children) {
				for (const childUuid of children) {
					if (hasConversationContent(childUuid)) {
						result = true;
						break;
					}
				}
			}
		}
		conversationContentCache.set(uuid, result);
		return result;
	};
	const hasBranching = [...latestBranchUuids].some((uuid) => {
		const children = childrenOf.get(uuid);
		if (!children || children.size <= 1) {
			return false;
		}
		const activeChildUuid = activeChildOf.get(uuid);
		let sawRealUserChild = false;
		let sawAlternateConversationChild = false;
		for (const childUuid of children) {
			const child = byUuid.get(childUuid);
			if (isDirectRealUserBranchChild(uuid, child)) {
				sawRealUserChild = true;
			}
			if (childUuid !== activeChildUuid && hasConversationContent(childUuid)) {
				sawAlternateConversationChild = true;
			}
			if (sawRealUserChild && sawAlternateConversationChild) {
				return true;
			}
		}
		return false;
	});
	let leaf;
	if (hasBranching) {
		leaf = latestLeaf;
		if (resumeAtMessageId && leaf?.uuid && byUuid.has(resumeAtMessageId)) {
			let current = leaf;
			while (current?.uuid) {
				if (current.uuid === resumeAtMessageId) {
					leaf = current;
					break;
				}
				const parent = resolveParent(current.parentUuid);
				current = parent ? byUuid.get(parent) : undefined;
			}
		}
	}
	else if (resumeAtMessageId) {
		leaf = byUuid.get(resumeAtMessageId);
	}
	else {
		return conversationEntries;
	}
	if (!leaf?.uuid) {
		return conversationEntries;
	}
	const activeUuids = new Set();
	let current = leaf;
	while (current?.uuid) {
		activeUuids.add(current.uuid);
		const parent = resolveParent(current.parentUuid);
		current = parent ? byUuid.get(parent) : undefined;
	}
	if (hasBranching) {
		const pending = [];
		for (const uuid of [...activeUuids]) {
			const children = childrenOf.get(uuid);
			if (!children || children.size <= 1) {
				continue;
			}
			const activeChildUuid = activeChildOf.get(uuid);
			if (activeChildUuid && isDirectRealUserBranchChild(uuid, byUuid.get(activeChildUuid))) {
				continue;
			}
			for (const childUuid of children) {
				if (activeUuids.has(childUuid)) {
					continue;
				}
				const child = byUuid.get(childUuid);
				if (!child || isRealUserBranchChild(child)) {
					continue;
				}
				activeUuids.add(childUuid);
				pending.push(childUuid);
			}
		}
		while (pending.length > 0) {
			const parentUuid = pending.pop();
			const children = childrenOf.get(parentUuid);
			if (!children) {
				continue;
			}
			for (const childUuid of children) {
				if (activeUuids.has(childUuid)) {
					continue;
				}
				const child = byUuid.get(childUuid);
				if (!child || isRealUserBranchChild(child)) {
					continue;
				}
				activeUuids.add(childUuid);
				pending.push(childUuid);
			}
		}
	}
	const prevIsActive = [];
	const nextIsActive = [];
	let lastPrevActive = false;
	for (let index = 0; index < conversationEntries.length; index += 1) {
		if (conversationEntries[index]?.uuid) {
			lastPrevActive = activeUuids.has(conversationEntries[index].uuid);
		}
		prevIsActive[index] = lastPrevActive;
	}
	let lastNextActive = false;
	for (let index = conversationEntries.length - 1; index >= 0; index -= 1) {
		if (conversationEntries[index]?.uuid) {
			lastNextActive = activeUuids.has(conversationEntries[index].uuid);
		}
		nextIsActive[index] = lastNextActive;
	}
	return conversationEntries.filter((entry, index) => {
		if (entry?.uuid) {
			return activeUuids.has(entry.uuid);
		}
		return prevIsActive[index] && nextIsActive[index];
	});
}

function isClaudeCompactionCanceledStderr(text) {
	return /^<local-command-stderr>\s*Error:\s*Compaction canceled\.?\s*<\/local-command-stderr>$/i.test(String(text || '').trim());
}

function isClaudeSystemInjectedRecord(record) {
	if (record?.type !== 'user') {
		return false;
	}
	if ('toolUseResult' in record || 'sourceToolUseID' in record || record.isMeta) {
		return true;
	}
	const text = extractClaudeTextContent(record.message?.content ?? record.content);
	if (!text) {
		return false;
	}
	if (text.includes('<command-name>') && text.includes('<command-message>')) {
		return false;
	}
	if (isClaudeCompactionCanceledStderr(text)) {
		return false;
	}
	if (text.startsWith('This session is being continued from a previous conversation')) {
		return true;
	}
	if (text.includes('<command-name>')) {
		return true;
	}
	if (text.includes('<local-command-stdout>') || text.includes('<local-command-stderr>')) {
		return true;
	}
	if (text.includes('<task-notification>')) {
		return true;
	}
	return false;
}

function claudeUserDisplayContent(text) {
	const commandNameMatch = String(text || '').match(/<command-name>(\/[^<]+)<\/command-name>/);
	if (commandNameMatch) {
		return commandNameMatch[1];
	}
	const xmlMatch = String(text || '').match(/\n\n<(?:linked_note|current_note|editor_selection|editor_cursor|context_files|canvas_selection|browser_selection)[\s>]/);
	if (xmlMatch?.index !== undefined) {
		return text.substring(0, xmlMatch.index).trim();
	}
	const bracketMatch = String(text || '').match(/\n\[(?:Current note|Editor selection from|Browser selection from|Canvas selection from)\b/);
	if (bracketMatch?.index !== undefined) {
		return text.substring(0, bracketMatch.index).trim();
	}
	return undefined;
}

function mergeNativeAssistantMessage(target, source) {
	if (source.content) {
		target.content = target.content ? `${target.content}\n\n${source.content}` : source.content;
	}
	if (Array.isArray(source.contentBlocks) && source.contentBlocks.length > 0) {
		target.contentBlocks = [...(target.contentBlocks || []), ...source.contentBlocks];
	}
	if (Array.isArray(source.toolCalls) && source.toolCalls.length > 0) {
		target.toolCalls = [...(target.toolCalls || []), ...source.toolCalls];
	}
	if (source.runtimeTurnId) {
		target.runtimeTurnId = source.runtimeTurnId;
	}
	if (source.assistantMessageId) {
		target.assistantMessageId = source.assistantMessageId;
	}
	target.timestamp = Math.max(target.timestamp || 0, source.timestamp || 0);
}

function isToolResultOnlyClaudeUser(record) {
	const content = record?.message?.content ?? record?.content;
	if (!Array.isArray(content) || content.length === 0) {
		return false;
	}
	return content.every((block) => block?.type === 'tool_result');
}

function claudeBlocksFromContent(content, toolResults, timestamp, messageId, options = {}) {
	if (typeof content === 'string') {
		return content.trim()
			? [{ type: 'text', id: nativeBlockId('native-text', messageId, timestamp), content }]
			: [];
	}
	if (!Array.isArray(content)) {
		return [];
	}
	const blocks = [];
	content.forEach((part, index) => {
		if (!part || typeof part !== 'object') {
			return;
		}
		if (part.type === 'text' && part.text) {
			const trimmed = String(part.text).trim();
			if (trimmed && trimmed !== '(no content)') {
				blocks.push({ type: 'text', id: nativeBlockId('native-text', messageId, timestamp, index), content: part.text });
			}
		}
		else if ((part.type === 'thinking' || part.type === 'reasoning') && (part.thinking || part.text)) {
			blocks.push({
				type: 'thinking',
				id: nativeBlockId('native-thinking', messageId, timestamp, index),
				label: 'Thinking',
				content: part.thinking || part.text,
				durationSeconds: 0,
			});
		}
		else if (part.type === 'tool_use') {
			const result = toolResults.get(part.id);
			const block = makeNativeToolBlock(part.id, part.name || 'Tool', part.input || {}, timestamp, result?.content, result?.toolUseResult);
			block.status = result ? (result.isError ? 'error' : 'completed') : 'running';
			if (block.name === 'AskUserQuestion') {
				block.contentClass = 'claudian-tool-content-ask';
				const resolvedAnswers = extractAskUserResolvedAnswers(result);
				if (resolvedAnswers) {
					block.resolvedAnswers = resolvedAnswers;
				}
			}
			if (isClaudeTaskToolName(block.name) && block.input?.run_in_background === true) {
				const subagent = buildNativeAsyncSubagentInfo(block, result?.toolUseResult, options.asyncSubagentResults);
				if (subagent) {
					const toolCalls = loadClaudeSubagentToolCallsFromSidecars(
						options.homeDir,
						options.workspace,
						options.sessionEntries,
						subagent.agentId,
					);
					if (toolCalls.length > 0) {
						subagent.toolCalls = toolCalls;
					}
					blocks.push(makeNativeSubagentBlock(block.id, subagent));
					return;
				}
			}
			blocks.push(block);
		}
	});
	return blocks;
}

const CODEX_SYSTEM_MESSAGE_PREFIXES = [
	'# AGENTS.md instructions',
];

const CODEX_CONTROL_BLOCK_TAGS = [
	'system_instruction',
	'environment_context',
	'turn_aborted',
	'user-preferences',
	'subagent_notification',
	'skill',
];

function stripLeadingTaggedBlock(text, tagName) {
	const openTag = `<${tagName}>`;
	if (!text.startsWith(openTag)) {
		return null;
	}
	const closeTag = `</${tagName}>`;
	const closeIndex = text.indexOf(closeTag, openTag.length);
	if (closeIndex === -1) {
		return '';
	}
	return text.slice(closeIndex + closeTag.length);
}

function codexVisibleUserText(text) {
	let remaining = String(text || '').trimStart();
	if (!remaining) {
		return null;
	}
	if (CODEX_SYSTEM_MESSAGE_PREFIXES.some((prefix) => remaining.startsWith(prefix))) {
		return null;
	}
	let stripped = true;
	while (stripped) {
		stripped = false;
		for (const tagName of CODEX_CONTROL_BLOCK_TAGS) {
			const next = stripLeadingTaggedBlock(remaining, tagName);
			if (next === null) {
				continue;
			}
			remaining = next.trimStart();
			stripped = true;
			break;
		}
	}
	const visible = remaining.trim();
	return visible ? visible : null;
}

function codexReasoningText(payload) {
	const source = payload.summary || payload.content || payload.text || '';
	if (typeof source === 'string') {
		return source;
	}
	if (!Array.isArray(source)) {
		return '';
	}
	return source.map((item) => {
		if (typeof item === 'string') {
			return item;
		}
		return item?.text || '';
	}).filter(Boolean).join('\n');
}

function codexToolName(payload) {
	if (payload.type === 'web_search_call') {
		return 'WebSearch';
	}
	if (payload.type === 'mcp_tool_call') {
		return payload.tool ? `mcp__${payload.server || 'mcp'}__${payload.tool}` : 'MCP Tool';
	}
	return normalizeNativeCodexToolName(payload.name || (payload.type === 'custom_tool_call' ? 'CustomTool' : 'Tool'));
}

function normalizeRawCodexToolInput(payload, input) {
	const rawName = String(payload?.name || payload?.type || '');
	if (payload?.type === 'mcp_tool_call') {
		return originalShared.normalizeCodexMcpToolInput(input);
	}
	if (payload?.type === 'web_search_call') {
		return originalShared.normalizeCodexToolInput('web_search_call', payload);
	}
	const normalizedInput = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
	return originalShared.normalizeCodexToolInput(rawName, normalizedInput);
}

function codexToolInput(payload) {
	if (payload.type === 'function_call') {
		return normalizeRawCodexToolInput(payload, parseJsonish(payload.arguments));
	}
	if (payload.type === 'custom_tool_call') {
		return normalizeRawCodexToolInput(payload, parseJsonish(payload.input || payload.arguments));
	}
	if (payload.type === 'web_search_call') {
		return normalizeRawCodexToolInput(payload, {});
	}
	if (payload.type === 'mcp_tool_call') {
		return normalizeRawCodexToolInput(payload, parseJsonish(payload.arguments));
	}
	return {};
}

function codexToolResult(payload) {
	if (payload.type === 'function_call_output' || payload.type === 'custom_tool_call_output') {
		return stringifyNativeValue(payload.output);
	}
	if (payload.type === 'mcp_tool_call') {
		if (payload.error) {
			return payload.error;
		}
		const content = payload.result?.content;
		if (Array.isArray(content)) {
			return textFromProviderContent(content) || stringifyNativeValue(payload.result);
		}
		return stringifyNativeValue(payload.result || payload.status || '');
	}
	if (payload.type === 'web_search_call') {
		return payload.status || '';
	}
	return '';
}

function normalizeRawCodexToolOutput(name, rawOutput, input) {
	if (Array.isArray(rawOutput) && name === 'Read') {
		const filePath = input?.file_path || input?.path || '';
		if (filePath) return String(filePath);
	}
	const text = stringifyNativeValue(rawOutput);
	const normalizedText = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
	return originalShared.normalizeCodexToolResult(name, normalizedText);
}

function isCodexRawToolOutputError(rawOutput) {
	const text = stringifyNativeValue(rawOutput);
	return originalShared.isCodexToolOutputError(text);
}

function isSilentWriteStdinInput(input) {
	return typeof input?.chars !== 'string' || input.chars.length === 0;
}

function readNativeTerminalSessionIdArgument(input) {
	const value = input?.session_id ?? input?.sessionId;
	if (typeof value === 'string' && value) return value;
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	return '';
}

function appendNativeCommandOutput(previous, next) {
	const existing = String(previous || '');
	const incoming = String(next || '');
	if (!incoming) return existing;
	if (!existing) return incoming;
	return existing.endsWith('\n') || incoming.startsWith('\n')
		? `${existing}${incoming}`
		: `${existing}\n${incoming}`;
}

function readNativeCodexCommandToolResult(rawOutputText) {
	const text = String(rawOutputText || '');
	const output = normalizeRawCodexToolOutput('Bash', text, {});
	const exitCodeMatch = text.match(/(?:Exit code:|Process exited with code)\s*(-?\d+)/i);
	const runningMatch = text.match(/Process running with session ID\s*([^\n]+)/i);
	return {
		output,
		status: exitCodeMatch ? 'completed' : runningMatch ? 'running' : 'unknown',
		exitCode: exitCodeMatch ? Number(exitCodeMatch[1] || 0) : undefined,
		terminalSessionId: runningMatch ? String(runningMatch[1] || '').trim() : '',
	};
}

function applyNativeToolInput(block, input) {
	if (!isRecord(input)) {
		return;
	}
	block.input = { ...(isRecord(block.input) ? block.input : {}), ...input };
	block.summary = nativeToolSummary(block.name, block.input);
	block.lines = nativeToolLines(block.name, block.input);
	if (block.name === 'Bash' && block.input.command) {
		block.command = block.input.command;
	}
	attachNativeDiffData(block, undefined);
}

function applyNativeToolResult(block, result, status = 'completed', input) {
	applyNativeToolInput(block, input);
	block.status = status;
	block.result = stringifyNativeValue(result);
	attachNativeDiffData(block, result);
	if (block.name === 'AskUserQuestion') {
		block.contentClass = 'claudian-tool-content-ask';
		const resolvedAnswers = parseAskAnswersFromJsonObject(block.result) || parseAskAnswersFromQuotedPairs(block.result);
		if (resolvedAnswers) {
			block.resolvedAnswers = resolvedAnswers;
		}
	}
}

function applyNativeCodexPersistedToolOutput(block, rawOutputValue, rawOutputText, terminalSessionToCommandId, options = {}) {
	if (block.name === 'Bash') {
		const commandResult = readNativeCodexCommandToolResult(rawOutputText);
		block.result = appendNativeCommandOutput(block.result, commandResult.output);
		if (commandResult.terminalSessionId) {
			terminalSessionToCommandId.set(commandResult.terminalSessionId, block.id);
		}
		if (commandResult.status === 'running') {
			block.status = 'running';
			return;
		}
		if (commandResult.status === 'unknown' && options.allowImplicitCommandCompletion === false) {
			return;
		}
		block.status = commandResult.exitCode !== undefined
			? (commandResult.exitCode === 0 ? 'completed' : 'error')
			: (isCodexRawToolOutputError(rawOutputText) ? 'error' : 'completed');
		return;
	}
	const result = normalizeRawCodexToolOutput(block.name, rawOutputValue, block.input || {});
	applyNativeToolResult(block, result, isCodexRawToolOutputError(rawOutputText) ? 'error' : 'completed');
}

function updateNativeToolResult(messages, blocks, callId, result, status = 'completed', input) {
	if (!callId) {
		return false;
	}
	for (let index = blocks.length - 1; index >= 0; index -= 1) {
		const block = blocks[index];
		if (block?.type === 'tool_use' && (block.nativeCallId === callId || block.id === callId)) {
			applyNativeToolResult(block, result, status, input);
			return true;
		}
	}
	for (let msgIndex = messages.length - 1; msgIndex >= 0; msgIndex -= 1) {
		const message = messages[msgIndex];
		for (const block of message.contentBlocks || []) {
			if (block?.type === 'tool_use' && (block.nativeCallId === callId || block.id === callId)) {
				applyNativeToolResult(block, result, status, input);
				refreshNativeMessageToolCalls(message);
				return true;
			}
		}
	}
	return false;
}

function updateNativeCodexPersistedToolOutput(messages, blocks, callId, rawOutputValue, rawOutputText, terminalSessionToCommandId, options = {}) {
	if (!callId) {
		return false;
	}
	for (let index = blocks.length - 1; index >= 0; index -= 1) {
		const block = blocks[index];
		if (block?.type === 'tool_use' && (block.nativeCallId === callId || block.id === callId)) {
			applyNativeCodexPersistedToolOutput(block, rawOutputValue, rawOutputText, terminalSessionToCommandId, options);
			return true;
		}
	}
	for (let msgIndex = messages.length - 1; msgIndex >= 0; msgIndex -= 1) {
		const message = messages[msgIndex];
		for (const block of message.contentBlocks || []) {
			if (block?.type === 'tool_use' && (block.nativeCallId === callId || block.id === callId)) {
				applyNativeCodexPersistedToolOutput(block, rawOutputValue, rawOutputText, terminalSessionToCommandId, options);
				refreshNativeMessageToolCalls(message);
				return true;
			}
		}
	}
	return false;
}

function buildNativeHistory(providerId, sessionId, filePath, messages, mtimeMs) {
	if (!sessionId || messages.length === 0) {
		return null;
	}
	const firstUser = messages.find((message) => message.role === 'user');
	const titleText = String(firstUser?.content || sessionId).replace(/\s+/g, ' ').trim();
	const timestamps = messages
		.map((message) => Number(message?.timestamp || 0))
		.filter((timestamp) => Number.isFinite(timestamp) && timestamp > 0);
	const fallbackTime = Number.isFinite(Number(mtimeMs)) && Number(mtimeMs) > 0 ? Number(mtimeMs) : Date.now();
	const createdAt = timestamps.length ? Math.min(...timestamps) : fallbackTime;
	const lastResponseAt = timestamps.length ? Math.max(...timestamps) : fallbackTime;
	return {
		id: `native-${providerId}-${sessionId}`,
		title: titleText ? titleText.slice(0, 64) : `${providerId} session`,
		date: new Date(lastResponseAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' }),
		createdAt,
		lastResponseAt,
		messages,
		providerId,
		model: providerId === 'codex' ? 'gpt-5.5' : 'sonnet',
		runtimeSessionKey: `native-${providerId}-${sessionId}`,
		runtimeThreadId: sessionId,
		runtimeProviderId: providerId,
		nativeSessionPath: filePath,
		nativeSessionMtimeMs: fallbackTime,
		nativeHistory: true,
	};
}

function buildCodexNativeTurns(messages) {
	const turns = [];
	let current = null;
	for (const message of messages || []) {
		const turnId = message?.runtimeTurnId || null;
		if (!current || current.turnId !== turnId) {
			current = { turnId, messages: [] };
			turns.push(current);
		}
		current.messages.push(message);
	}
	return turns.filter((turn) => turn.messages.length > 0);
}

function truncateCodexNativeTurnsAtCheckpoint(turns, resumeAt) {
	const checkpoint = String(resumeAt || '').trim();
	if (!checkpoint) {
		return null;
	}
	const index = (turns || []).findIndex((turn) => turn.turnId === checkpoint);
	return index >= 0 ? turns.slice(0, index + 1) : null;
}

function codexSessionFileInfo(filePath) {
	if (!filePath) {
		return null;
	}
	try {
		const stat = fs.statSync(filePath);
		return { path: filePath, mtimeMs: stat.mtimeMs };
	}
	catch {
		return null;
	}
}

function deriveCodexSessionsRootFromSessionPath(sessionFilePath) {
	const normalized = path.normalize(String(sessionFilePath || ''));
	if (!normalized) {
		return null;
	}
	const marker = `${path.sep}.codex${path.sep}sessions${path.sep}`;
	const markerIndex = normalized.toLowerCase().indexOf(marker.toLowerCase());
	if (markerIndex < 0) {
		return null;
	}
	return normalized.slice(0, markerIndex + marker.length - 1);
}

function findCodexSessionFile(sessionId, transcriptRootPath) {
	const id = String(sessionId || '').trim();
	const root = String(transcriptRootPath || '').trim();
	if (!id || !root || !fs.existsSync(root)) {
		return null;
	}
	const direct = path.join(root, `${id}.jsonl`);
	if (fs.existsSync(direct)) {
		return direct;
	}
	const files = collectJsonlFiles(root, { limit: 200 });
	const match = files.find((fileInfo) => {
		const base = path.basename(fileInfo.path);
		return base === `${id}.jsonl` || base.endsWith(`-${id}.jsonl`);
	});
	return match?.path || null;
}

function collectSessionMetadata(rootPath) {
	const root = String(rootPath || '').trim();
	if (!root) {
		return [];
	}
	const dirs = [
		path.join(root, '.claudian', 'sessions'),
		path.join(root, '.claude', 'sessions'),
	];
	const metas = [];
	const seen = new Set();
	for (const dir of dirs) {
		let entries = [];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		}
		catch {
			continue;
		}
		for (const entry of entries) {
			if (!entry.isFile() || !entry.name.endsWith('.meta.json')) {
				continue;
			}
			const filePath = path.join(dir, entry.name);
			if (seen.has(filePath)) {
				continue;
			}
			seen.add(filePath);
			const meta = readJsonFile(filePath, null);
			if (isRecord(meta)) {
				metas.push({ ...meta, metadataPath: filePath });
			}
		}
	}
	return metas;
}

function loadCodexForkMetadataByThread(homeDir, workspace) {
	const roots = [workspace, homeDir].filter(Boolean);
	const byThread = new Map();
	for (const root of [...new Set(roots.map((item) => path.normalize(String(item))))]) {
		for (const meta of collectSessionMetadata(root)) {
			if (meta.providerId && meta.providerId !== 'codex') {
				continue;
			}
			const state = isRecord(meta.providerState) ? meta.providerState : {};
			if (!isRecord(state.forkSource)) {
				continue;
			}
			const threadId = String(state.threadId || meta.sessionId || '').trim();
			if (!threadId) {
				continue;
			}
			byThread.set(threadId, { meta, state });
		}
	}
	return byThread;
}

function loadClaudeConversationMetadata(homeDir, workspace) {
	const roots = [workspace, homeDir].filter(Boolean);
	const byCurrentSession = new Map();
	const previousSessionIds = new Set();
	for (const root of [...new Set(roots.map((item) => path.normalize(String(item))))]) {
		for (const meta of collectSessionMetadata(root)) {
			if (meta.providerId && meta.providerId !== 'claude') {
				continue;
			}
			const state = isRecord(meta.providerState) ? meta.providerState : {};
			const previousIds = Array.isArray(state.previousProviderSessionIds)
				? state.previousProviderSessionIds.map((id) => String(id || '').trim()).filter(Boolean)
				: [];
			for (const id of previousIds) {
				previousSessionIds.add(id);
			}
			const currentSessionId = String(state.providerSessionId || meta.sessionId || state.forkSource?.sessionId || '').trim();
			if (!currentSessionId) {
				continue;
			}
			byCurrentSession.set(currentSessionId, { meta, state });
		}
	}
	return { byCurrentSession, previousSessionIds };
}

function findClaudeSessionFile(sessionId, homeDir) {
	const id = String(sessionId || '').trim();
	if (!id) {
		return null;
	}
	const directRoot = path.join(String(homeDir || os.homedir()), '.claude', 'projects');
	for (const fileInfo of collectJsonlFiles(directRoot, {
		limit: 240,
		exclude: (filePath) => filePath.includes(`${path.sep}subagents${path.sep}`),
	})) {
		if (path.basename(fileInfo.path, '.jsonl') === id) {
			return fileInfo.path;
		}
	}
	return null;
}

function dedupeNativeMessages(messages) {
	const seen = new Set();
	const result = [];
	for (const message of messages || []) {
		const id = String(message?.id || '').trim();
		if (id) {
			if (seen.has(id)) {
				continue;
			}
			seen.add(id);
		}
		result.push(message);
	}
	return result;
}

function parseClaudeNativeHistoryBundle(fileInfo, resumeAtMessageId = '', options = {}) {
	const records = filterActiveClaudeBranch(readJsonlRecords(fileInfo.path), resumeAtMessageId);
	const messages = [];
	const toolResults = extractClaudeToolResults(records);
	const sessionId = String(options.sessionId || path.basename(fileInfo.path, '.jsonl')).trim();
	const blockOptions = {
		homeDir: options.homeDir,
		workspace: options.workspace,
		sessionEntries: [{ sessionId, path: fileInfo.path }],
		asyncSubagentResults: collectClaudeAsyncSubagentResults(records),
	};
	let pendingAssistant = null;
	const flushAssistant = () => {
		if (!pendingAssistant) {
			return;
		}
		messages.push(pendingAssistant);
		pendingAssistant = null;
	};
	for (const record of records) {
		if (record?.type === 'system' && record.subtype === 'compact_boundary') {
			flushAssistant();
			const timestamp = record.timestamp ? new Date(record.timestamp).getTime() : fileInfo.mtimeMs;
			messages.push(makeNativeAssistantMessage([
				{ type: 'context_compacted', id: nativeBlockId('native-compact', record.uuid, timestamp) },
			], timestamp, record.uuid));
			continue;
		}
		if (record?.type !== 'user' && record?.type !== 'assistant') {
			continue;
		}
		const timestamp = record.timestamp ? new Date(record.timestamp).getTime() : fileInfo.mtimeMs;
		const content = record.message?.content ?? record.content;
		if (record.type === 'user') {
			if (isToolResultOnlyClaudeUser(record) || isClaudeSystemInjectedRecord(record)) {
				continue;
			}
			flushAssistant();
			const text = extractClaudeTextContent(content);
			const images = extractClaudeImages(content, timestamp, record.uuid);
			if (text.trim() || images?.length) {
				const message = makeNativeMessage('user', text, timestamp, record.uuid, claudeUserDisplayContent(text), images);
				if (isClaudeCompactionCanceledStderr(text)) {
					message.isInterrupt = true;
				}
				messages.push(message);
			}
			continue;
		}
		if (record.message?.model === '<synthetic>') {
			continue;
		}
		const blocks = claudeBlocksFromContent(content, toolResults, timestamp, record.uuid, blockOptions);
		if (blocks.length > 0) {
			const message = makeNativeAssistantMessage(blocks, timestamp, record.uuid);
			if (record.uuid) {
				message.assistantMessageId = record.uuid;
			}
			if (pendingAssistant) {
				mergeNativeAssistantMessage(pendingAssistant, message);
			}
			else {
				pendingAssistant = message;
			}
		}
	}
	flushAssistant();
	messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
	return {
		history: buildNativeHistory('claude', sessionId, fileInfo.path, messages, fileInfo.mtimeMs),
		sessionId,
		messages,
	};
}

function parseClaudeNativeHistory(fileInfo, homeDir = '', workspace = '') {
	return parseClaudeNativeHistoryBundle(fileInfo, '', {
		homeDir,
		workspace,
		sessionId: path.basename(fileInfo.path, '.jsonl'),
	}).history;
}

function composeClaudeNativeHistory(fileInfo, metadataEntry, homeDir, workspace = '') {
	const state = metadataEntry?.state || {};
	const meta = metadataEntry?.meta || {};
	const currentSessionId = String(state.providerSessionId || meta.sessionId || state.forkSource?.sessionId || path.basename(fileInfo.path, '.jsonl')).trim();
	const previousSessionIds = Array.isArray(state.previousProviderSessionIds)
		? state.previousProviderSessionIds.map((id) => String(id || '').trim()).filter(Boolean)
		: [];
	const isPendingFork = isRecord(state.forkSource) && !state.providerSessionId && !meta.sessionId;
	const allSessionIds = isPendingFork
		? [String(state.forkSource.sessionId || '').trim()].filter(Boolean)
		: [...previousSessionIds, currentSessionId].filter(Boolean);
	if (allSessionIds.length === 0) {
		return null;
	}
	const allMessages = [];
	const sessionEntries = [];
	for (const sessionId of allSessionIds) {
		const sessionPath = sessionId === currentSessionId
			? fileInfo.path
			: findClaudeSessionFile(sessionId, homeDir);
		const nextFileInfo = codexSessionFileInfo(sessionPath);
		if (!nextFileInfo) {
			continue;
		}
		sessionEntries.push({ sessionId, path: nextFileInfo.path });
		const truncateAt = sessionId === currentSessionId
			? (isPendingFork ? String(state.forkSource?.resumeAt || '') : String(meta.resumeAtMessageId || ''))
			: '';
		const bundle = parseClaudeNativeHistoryBundle(nextFileInfo, truncateAt, {
			homeDir,
			workspace,
			sessionId,
		});
		allMessages.push(...bundle.messages);
	}
	const messages = dedupeNativeMessages(allMessages).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
	if (isRecord(state.subagentData)) {
		enrichClaudeSubagentDataFromSidecars(state.subagentData, homeDir, workspace, sessionEntries);
		applyClaudeSubagentDataToNativeMessages(messages, state.subagentData);
		messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
	}
	const history = buildNativeHistory('claude', currentSessionId, fileInfo.path, messages, fileInfo.mtimeMs);
	if (!history) {
		return null;
	}
	if (meta.title) {
		history.title = String(meta.title).slice(0, 64);
	}
	history.runtimeSessionKey = meta.id || history.runtimeSessionKey;
	history.providerState = {
		...(state.providerSessionId ? { providerSessionId: state.providerSessionId } : {}),
		...(previousSessionIds.length ? { previousProviderSessionIds: previousSessionIds } : {}),
		...(state.forkSource ? { forkSource: state.forkSource } : {}),
	};
	return history;
}

function parseCodexNativeHistoryBundle(fileInfo) {
	const records = readJsonlRecords(fileInfo.path);
	const messages = [];
	let sessionId = '';
	let assistantBlocks = [];
	let assistantTimestamp = fileInfo.mtimeMs;
	let assistantId = '';
	let assistantTurnId = '';
	let currentTurnId = '';
	const terminalSessionToCommandId = new Map();
	const stdinCallToCommandId = new Map();
	const suppressedToolOutputIds = new Set();
	const flushAssistant = () => {
		if (assistantBlocks.length === 0) {
			return;
		}
		const message = makeNativeAssistantMessage(assistantBlocks, assistantTimestamp, assistantId);
		if (assistantTurnId) {
			message.runtimeTurnId = assistantTurnId;
		}
		messages.push(message);
		assistantBlocks = [];
		assistantTimestamp = fileInfo.mtimeMs;
		assistantId = '';
		assistantTurnId = '';
	};
	const noteAssistantTurn = () => {
		if (currentTurnId && !assistantTurnId) {
			assistantTurnId = currentTurnId;
		}
	};
	const upsertAssistantBlock = (block, matcher) => {
		const index = assistantBlocks.findIndex(matcher);
		if (index >= 0) {
			assistantBlocks[index] = { ...assistantBlocks[index], ...block };
		}
		else {
			assistantBlocks.push(block);
		}
	};
	const upsertLegacyText = (id, content, timestamp) => {
		if (!String(content || '').trim()) {
			return;
		}
		noteAssistantTurn();
		upsertAssistantBlock(
			{ type: 'text', id: nativeBlockId('native-text', id, timestamp), content },
			(block) => block.type === 'text' && block.nativeLegacyId === id,
		);
		const textBlock = assistantBlocks.find((block) => block.type === 'text' && block.id === nativeBlockId('native-text', id, timestamp));
		if (textBlock) {
			textBlock.nativeLegacyId = id;
		}
		assistantTimestamp = timestamp;
		assistantId = assistantId || id || '';
	};
	const upsertLegacyThinking = (id, content, timestamp) => {
		if (!String(content || '').trim()) {
			return;
		}
		noteAssistantTurn();
		upsertAssistantBlock(
			{
				type: 'thinking',
				id: nativeBlockId('native-thinking', id, timestamp),
				label: 'Thinking',
				content,
				durationSeconds: 0,
				nativeLegacyId: id,
			},
			(block) => block.type === 'thinking' && block.nativeLegacyId === id,
		);
		assistantTimestamp = timestamp;
		assistantId = assistantId || id || '';
	};
	const legacyToolInput = (item = {}) => {
		if (item.type === 'command_execution') {
			return { command: item.command || item.cmd || '' };
		}
		if (item.type === 'web_search') {
			return { query: item.query || '' };
		}
		if (item.type === 'file_change') {
			return { changes: item.changes || [] };
		}
		if (item.type === 'mcp_tool_call') {
			return { server: item.server || '', tool: item.tool || '' };
		}
		return item.input && typeof item.input === 'object' ? item.input : {};
	};
	const legacyToolResult = (item = {}, name) => {
		if (item.type === 'command_execution') {
			return item.aggregated_output || item.output || '';
		}
		if (item.type === 'web_search') {
			return item.result || 'Search complete';
		}
		if (item.type === 'file_change') {
			const changes = Array.isArray(item.changes) ? item.changes : [];
			const paths = changes.map((change) => `${change.kind || 'change'}: ${change.path || ''}`).join(', ');
			return paths ? `Applied: ${paths}` : (item.result || 'Applied');
		}
		if (item.type === 'mcp_tool_call') {
			return item.result || (item.status === 'completed' ? 'Completed' : item.status || '');
		}
		return item.result || item.output || name || '';
	};
	const upsertLegacyTool = (eventType, item = {}, timestamp) => {
		if (!item.id) {
			return;
		}
		noteAssistantTurn();
		const name = item.type === 'mcp_tool_call'
			? (item.tool ? `${item.server || 'mcp'}:${item.tool}` : 'MCP Tool')
			: normalizeNativeCodexToolName(item.type || item.name);
		const completed = eventType === 'item.completed';
		const failed = item.status === 'failed' || item.status === 'error' || item.exit_code > 0;
		const result = completed ? legacyToolResult(item, name) : undefined;
		const existingUpdated = completed && updateNativeToolResult(
			messages,
			assistantBlocks,
			item.id,
			result,
			failed ? 'error' : 'completed',
			legacyToolInput(item),
		);
		if (existingUpdated) {
			assistantTimestamp = timestamp;
			assistantId = assistantId || item.id || '';
			return;
		}
		const block = makeNativeToolBlock(item.id, name, legacyToolInput(item), timestamp, result);
		block.nativeCallId = item.id;
		block.status = completed ? (failed ? 'error' : 'completed') : 'running';
		upsertAssistantBlock(block, (candidate) => candidate.type === 'tool_use' && (candidate.nativeCallId === item.id || candidate.id === item.id));
		assistantTimestamp = timestamp;
		assistantId = assistantId || item.id || '';
	};
	const handleLegacyCodexEvent = (event = {}, timestamp) => {
		if (event.type === 'turn.started') {
			flushAssistant();
			currentTurnId = String(event.turn_id || event.turnId || event.id || '').trim();
			return;
		}
		if (event.type === 'turn.completed' || event.type === 'turn.failed') {
			flushAssistant();
			currentTurnId = '';
			return;
		}
		if (event.type === 'user_message') {
			flushAssistant();
			const visible = codexVisibleUserText(event.message || event.text || '');
			if (visible) {
				const message = makeNativeMessage('user', visible, timestamp, event.id);
				if (currentTurnId) {
					message.runtimeTurnId = currentTurnId;
				}
				messages.push(message);
			}
			return;
		}
		if (event.type === 'agent_message') {
			upsertLegacyText(event.id || nativeBlockId('legacy-agent', event.type, timestamp), event.message || event.text || '', timestamp);
			return;
		}
		if (event.type === 'agent_reasoning') {
			upsertLegacyThinking(event.id || nativeBlockId('legacy-reasoning', event.type, timestamp), codexReasoningText(event), timestamp);
			return;
		}
		if ((event.type === 'item.started' || event.type === 'item.updated' || event.type === 'item.completed') && event.item) {
			const item = event.item;
			if (item.type === 'agent_message') {
				upsertLegacyText(item.id, item.text || item.message || '', timestamp);
			}
			else if (item.type === 'reasoning') {
				upsertLegacyThinking(item.id, item.text || codexReasoningText(item), timestamp);
			}
			else {
				upsertLegacyTool(event.type, item, timestamp);
			}
		}
	};
	for (const record of records) {
		const timestamp = record.timestamp ? new Date(record.timestamp).getTime() : fileInfo.mtimeMs;
		if (record?.type === 'session_meta') {
			sessionId = record.payload?.id || sessionId;
			continue;
		}
		if (record?.type === 'event' && record.event) {
			handleLegacyCodexEvent(record.event, timestamp);
			continue;
		}
		if (record?.type === 'compacted') {
			// Codex replacement_history is provider context, not visible transcript.
			continue;
		}
		const payload = record?.payload || {};
		if (record?.type === 'event_msg' && payload.type === 'task_started') {
			flushAssistant();
			currentTurnId = String(payload.turn_id || payload.turnId || payload.id || '').trim();
			continue;
		}
		if (record?.type === 'event_msg' && (payload.type === 'task_complete' || payload.type === 'turn_aborted')) {
			if (!currentTurnId) {
				currentTurnId = String(payload.turn_id || payload.turnId || '').trim();
			}
			flushAssistant();
			currentTurnId = '';
			continue;
		}
		if (record?.type === 'event_msg' && payload.type === 'user_message') {
			flushAssistant();
			const content = codexVisibleUserText(payload.message || payload.text || '');
			if (content) {
				const message = makeNativeMessage('user', content, timestamp, payload.id);
				if (currentTurnId) {
					message.runtimeTurnId = currentTurnId;
				}
				messages.push(message);
			}
			continue;
		}
		if (record?.type === 'event_msg' && payload.type === 'context_compacted') {
			noteAssistantTurn();
			assistantBlocks.push({ type: 'context_compacted', id: nativeBlockId('native-compact', payload.id, timestamp) });
			assistantTimestamp = timestamp;
			continue;
		}
		if (record?.type !== 'response_item') {
			continue;
		}
		if (payload.type === 'message') {
			const role = payload.role === 'assistant' ? 'assistant' : payload.role === 'user' ? 'user' : '';
			if (!role) {
				continue;
			}
			const content = textFromProviderContent(payload.content);
			if (role === 'user') {
				flushAssistant();
				const visible = codexVisibleUserText(content);
				if (visible) {
					const message = makeNativeMessage(role, visible, timestamp, payload.id);
					if (currentTurnId) {
						message.runtimeTurnId = currentTurnId;
					}
					messages.push(message);
				}
			}
			else if (content.trim()) {
				noteAssistantTurn();
				assistantBlocks.push({ type: 'text', id: nativeBlockId('native-text', payload.id, timestamp), content });
				assistantTimestamp = timestamp;
				assistantId = assistantId || payload.id || '';
			}
		}
		else if (payload.type === 'reasoning') {
			const content = codexReasoningText(payload);
			if (content.trim()) {
				noteAssistantTurn();
				assistantBlocks.push({
					type: 'thinking',
					id: nativeBlockId('native-thinking', payload.id, timestamp),
					label: 'Thinking',
					content,
					durationSeconds: 0,
				});
				assistantTimestamp = timestamp;
				assistantId = assistantId || payload.id || '';
			}
		}
		else if (payload.type === 'function_call' || payload.type === 'custom_tool_call' || payload.type === 'web_search_call' || payload.type === 'mcp_tool_call') {
			const callId = payload.call_id || payload.id || nativeBlockId('native-tool', payload.name || payload.type, timestamp);
			const rawName = String(payload.name || payload.type || '');
			const input = codexToolInput(payload);
			if (payload.type === 'function_call' && rawName === 'write_stdin' && isSilentWriteStdinInput(input)) {
				const terminalSessionId = readNativeTerminalSessionIdArgument(input);
				const parentCallId = terminalSessionId ? terminalSessionToCommandId.get(terminalSessionId) : '';
				if (parentCallId) {
					stdinCallToCommandId.set(callId, parentCallId);
				}
				suppressedToolOutputIds.add(callId);
				continue;
			}
			noteAssistantTurn();
			const result = payload.type === 'mcp_tool_call' ? codexToolResult(payload) : undefined;
			const block = makeNativeToolBlock(callId, codexToolName(payload), input, timestamp, result);
			block.nativeCallId = callId;
			assistantBlocks.push(block);
			assistantTimestamp = timestamp;
			assistantId = assistantId || payload.id || callId;
		}
		else if (payload.type === 'file_change') {
			noteAssistantTurn();
			const callId = payload.call_id || payload.id || nativeBlockId('native-tool', payload.type, timestamp);
			const input = { changes: Array.isArray(payload.changes) ? payload.changes : [] };
			const failed = payload.status === 'failed' || payload.status === 'error' || payload.status === 'declined';
			const completed = payload.status === 'completed' || failed;
			const paths = input.changes.map((change) => `${change.kind || 'change'}: ${change.path || ''}`).join(', ');
			const result = completed ? (paths ? `Applied: ${paths}` : (payload.result || 'Applied')) : undefined;
			const existingUpdated = completed && updateNativeToolResult(
				messages,
				assistantBlocks,
				callId,
				result,
				failed ? 'error' : 'completed',
				input,
			);
			if (!existingUpdated) {
				const block = makeNativeToolBlock(callId, normalizeNativeCodexToolName('file_change'), input, timestamp, result);
				block.nativeCallId = callId;
				block.status = completed ? (failed ? 'error' : 'completed') : 'running';
				upsertAssistantBlock(block, (candidate) => candidate.type === 'tool_use' && (candidate.nativeCallId === callId || candidate.id === callId));
			}
			assistantTimestamp = timestamp;
			assistantId = assistantId || payload.id || callId;
		}
		else if (payload.type === 'function_call_output' || payload.type === 'custom_tool_call_output') {
			noteAssistantTurn();
			const callId = payload.call_id || payload.id || '';
			const result = codexToolResult(payload);
			const parentCommandId = stdinCallToCommandId.get(callId);
			if (parentCommandId) {
				updateNativeCodexPersistedToolOutput(
					messages,
					assistantBlocks,
					parentCommandId,
					payload.output,
					result,
					terminalSessionToCommandId,
					{ allowImplicitCommandCompletion: false },
				);
				stdinCallToCommandId.delete(callId);
				suppressedToolOutputIds.delete(callId);
				assistantTimestamp = timestamp;
				continue;
			}
			if (suppressedToolOutputIds.delete(callId)) {
				assistantTimestamp = timestamp;
				continue;
			}
			if (!updateNativeCodexPersistedToolOutput(messages, assistantBlocks, callId, payload.output, result, terminalSessionToCommandId) && result.trim()) {
				assistantBlocks.push(makeNativeToolBlock(callId || nativeBlockId('native-tool-output', payload.type, timestamp), 'Tool Output', {}, timestamp, result));
			}
			assistantTimestamp = timestamp;
		}
		else if (payload.type === 'compaction') {
			noteAssistantTurn();
			assistantBlocks.push({ type: 'context_compacted', id: nativeBlockId('native-compact', payload.id, timestamp) });
			assistantTimestamp = timestamp;
		}
	}
	flushAssistant();
	if (!sessionId) {
		const match = path.basename(fileInfo.path, '.jsonl').match(/[0-9a-f]{8}-[0-9a-f-]{27,}/i);
		sessionId = match ? match[0] : path.basename(fileInfo.path, '.jsonl');
	}
	return {
		history: buildNativeHistory('codex', sessionId, fileInfo.path, messages, fileInfo.mtimeMs),
		sessionId,
		turns: buildCodexNativeTurns(messages),
	};
}

function parseCodexNativeHistory(fileInfo) {
	return parseCodexNativeHistoryBundle(fileInfo).history;
}

function composeCodexForkNativeHistory(fileInfo, metadataEntry, transcriptRootPath) {
	const state = metadataEntry?.state || {};
	const meta = metadataEntry?.meta || {};
	const forkSource = isRecord(state.forkSource) ? state.forkSource : null;
	const forkThreadId = String(state.threadId || meta.sessionId || '').trim();
	const sourceSessionId = String(forkSource?.sessionId || '').trim();
	const resumeAt = String(forkSource?.resumeAt || '').trim();
	if (!forkThreadId || !sourceSessionId || !resumeAt) {
		return null;
	}
	const sourceRoot = String(state.forkSourceTranscriptRootPath || deriveCodexSessionsRootFromSessionPath(state.forkSourceSessionFilePath) || transcriptRootPath || '').trim();
	const sourceSessionPath = String(state.forkSourceSessionFilePath || findCodexSessionFile(sourceSessionId, sourceRoot) || '').trim();
	const sourceFileInfo = codexSessionFileInfo(sourceSessionPath);
	if (!sourceFileInfo) {
		return null;
	}
	const sourceBundle = parseCodexNativeHistoryBundle(sourceFileInfo);
	const forkBundle = parseCodexNativeHistoryBundle(fileInfo);
	const sourcePrefix = truncateCodexNativeTurnsAtCheckpoint(sourceBundle.turns, resumeAt);
	if (!sourcePrefix) {
		return null;
	}
	const sourceTurnIds = new Set(sourceBundle.turns.map((turn) => turn.turnId).filter(Boolean));
	const forkOnlyTurns = forkBundle.turns.filter((turn) => !turn.turnId || !sourceTurnIds.has(turn.turnId));
	const messages = [
		...sourcePrefix.flatMap((turn) => turn.messages),
		...forkOnlyTurns.flatMap((turn) => turn.messages),
	];
	const history = buildNativeHistory('codex', forkThreadId, fileInfo.path, messages, fileInfo.mtimeMs);
	if (!history) {
		return null;
	}
	if (meta.title) {
		history.title = String(meta.title).slice(0, 64);
	}
	history.runtimeSessionKey = meta.id || history.runtimeSessionKey;
	history.forkSource = forkSource;
	history.providerState = {
		threadId: forkThreadId,
		sessionFilePath: state.sessionFilePath || fileInfo.path,
		forkSource,
		...(sourceSessionPath ? { forkSourceSessionFilePath: sourceSessionPath } : {}),
		...(sourceRoot ? { forkSourceTranscriptRootPath: sourceRoot } : {}),
	};
	return history;
}

function discoverNativeHistories(limit = 12, nativeHistoryHome = '', workspace = '') {
	const histories = [];
	const homeDir = nativeHistoryHome || os.homedir();
	const codexRoot = path.join(homeDir, '.codex', 'sessions');
	const codexForkMetadataByThread = loadCodexForkMetadataByThread(homeDir, workspace);
	for (const fileInfo of collectJsonlFiles(codexRoot, { limit })) {
		const basic = parseCodexNativeHistoryBundle(fileInfo);
		const item = codexForkMetadataByThread.has(basic.sessionId)
			? composeCodexForkNativeHistory(fileInfo, codexForkMetadataByThread.get(basic.sessionId), codexRoot)
			: basic.history;
		if (item) {
			histories.push(item);
		}
	}
	const claudeRoot = path.join(homeDir, '.claude', 'projects');
	const claudeMetadata = loadClaudeConversationMetadata(homeDir, workspace);
	for (const fileInfo of collectJsonlFiles(claudeRoot, {
		limit,
		exclude: (filePath) => filePath.includes(`${path.sep}subagents${path.sep}`),
	})) {
		const sessionId = path.basename(fileInfo.path, '.jsonl');
		if (claudeMetadata.previousSessionIds.has(sessionId) && !claudeMetadata.byCurrentSession.has(sessionId)) {
			continue;
		}
		const item = claudeMetadata.byCurrentSession.has(sessionId)
			? composeClaudeNativeHistory(fileInfo, claudeMetadata.byCurrentSession.get(sessionId), homeDir, workspace)
			: parseClaudeNativeHistory(fileInfo, homeDir, workspace);
		if (item) {
			histories.push(item);
		}
	}
	return histories.sort((a, b) => {
		const aPath = a.nativeSessionPath || '';
		const bPath = b.nativeSessionPath || '';
		const aTime = aPath && fs.existsSync(aPath) ? fs.statSync(aPath).mtimeMs : 0;
		const bTime = bPath && fs.existsSync(bPath) ? fs.statSync(bPath).mtimeMs : 0;
		return bTime - aTime;
	}).slice(0, limit * 2);
}

function normalizeHiddenCommandName(value) {
	return String(value || '').trim().replace(/^[/$]+/, '');
}

function normalizeHiddenCommandNames(value) {
	if (!Array.isArray(value)) {
		return [];
	}
	const seen = new Set();
	const names = [];
	for (const item of value) {
		if (typeof item !== 'string') continue;
		const name = normalizeHiddenCommandName(item);
		if (!name) continue;
		const key = name.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		names.push(name);
	}
	return names;
}

function hiddenCommandsTextFromProviderSettings(source, providerId) {
	const hiddenProviderCommands = isRecord(source?.hiddenProviderCommands) ? source.hiddenProviderCommands : {};
	const providerCommands = normalizeHiddenCommandNames(hiddenProviderCommands[providerId]);
	if (providerCommands.length > 0) {
		return providerCommands.join('\n');
	}
	if (providerId === 'claude') {
		const legacyClaudeCommands = normalizeHiddenCommandNames(source?.hiddenSlashCommands);
		if (legacyClaudeCommands.length > 0) {
			return legacyClaudeCommands.join('\n');
		}
	}
	return '';
}

function normalizeSidebarFontSize(value) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) {
		return SIDEBAR_FONT_SIZE_DEFAULT;
	}
	return Math.min(SIDEBAR_FONT_SIZE_MAX, Math.max(SIDEBAR_FONT_SIZE_MIN, Math.round(numeric)));
}

function normalizeSettings(input, defaultWorkspace) {
	const source = isRecord(input) ? input : {};
	const settings = {
		...DEFAULT_SETTINGS,
		...source,
	};
	delete settings.goRelayActive;
	settings.workspace = String(settings.workspace || defaultWorkspace || process.cwd()).trim();
	settings.sidebarFontSize = normalizeSidebarFontSize(settings.sidebarFontSize);
	settings.codexInstallationMethod = process.platform === 'win32' && settings.codexInstallationMethod === 'wsl' ? 'wsl' : 'native-windows';
	const configuredCodexPath = String(settings.codexPath || '').trim();
	settings.codexPath = settings.codexInstallationMethod === 'native-windows'
		? resolveWindowsLaunchableCommand(configuredCodexPath, settings.workspace)
		: configuredCodexPath;
	settings.codexDownloadUrl = String(settings.codexDownloadUrl || '').trim();
	settings.codexDownloadSource = normalizeCodexDownloadSource(
		source.codexDownloadSource,
		settings.codexDownloadUrl ? 'custom' : 'npm-mirror',
	);
	settings.codexWslDistroOverride = String(settings.codexWslDistroOverride || '').trim();
	settings.codexHome = String(settings.codexHome || '').trim()
		? path.resolve(String(settings.codexHome || '').trim())
		: '';
	settings.claudePath = String(settings.claudePath || '').trim();
	settings.model = String(settings.model || DEFAULT_SETTINGS.model).trim();
	const configuredProvider = settings.provider === 'claude' ? 'claude' : 'codex';
	const sourceModel = String(source.model || '').trim();
	const sourceModelProvider = originalShared.decodeProviderModelSelectionId(sourceModel)?.providerId
		|| (isLikelyClaudeModel(sourceModel) ? 'claude' : isLikelyCodexModel(sourceModel) ? 'codex' : configuredProvider);
	const sourceMarkedUser = source.modelSelectionSource === 'user';
	const inferredUserModel = sourceModel
		&& !isLegacyDefaultModelForProvider(sourceModelProvider, sourceModel);
	settings.modelSelectionSource = sourceMarkedUser || inferredUserModel ? 'user' : 'native';
	const nativeConfiguredModel = nativeConfiguredModelForProvider(configuredProvider, settings);
	if (settings.modelSelectionSource === 'native' && nativeConfiguredModel) {
		settings.model = nativeConfiguredModel;
	}
	settings.effort = safeReasoningEffort(settings.provider, settings.model, settings.effort, {
		settings,
	});
	settings.reasoningSummary = ['auto', 'concise', 'detailed', 'none'].includes(settings.reasoningSummary)
		? settings.reasoningSummary
		: DEFAULT_SETTINGS.reasoningSummary;
	settings.serviceTier = settings.serviceTier === 'fast' ? 'fast' : DEFAULT_SETTINGS.serviceTier;
	settings.permissionMode = ['normal', 'plan', 'yolo'].includes(settings.permissionMode)
		? settings.permissionMode
		: DEFAULT_SETTINGS.permissionMode;
	settings.sandbox = ['workspace-write', 'read-only', 'danger-full-access'].includes(settings.sandbox)
		? settings.sandbox
		: DEFAULT_SETTINGS.sandbox;
	// Endpoint and credential routing belongs to the user's native CLI configuration.
	settings.llmProviderMode = 'native-cli';
	delete settings.apiRoutePolicy;
	settings.openaiApiKey = '';
	settings.openaiBaseUrl = '';
	settings.openaiModel = String(settings.openaiModel || '').trim();
	settings.anthropicApiKey = '';
	settings.anthropicBaseUrl = '';
	settings.claudeConfigDir = '';
	settings.claudeSafeMode = ['acceptEdits', 'auto', 'default', 'bypassPermissions', 'plan'].includes(settings.claudeSafeMode)
		? settings.claudeSafeMode
		: DEFAULT_SETTINGS.claudeSafeMode;
	settings.claudeLoadUserSettings = true;
	settings.claudeEnableChrome = settings.claudeEnableChrome === true;
	settings.claudeEnableBangBash = settings.claudeEnableBangBash !== false;
	settings.claudeCustomModels = customModelsForProvider(settings, 'claude').join('\n');
	settings.codexCustomModels = customModelsForProvider(settings, 'codex').join('\n');
	settings.claudeHiddenCommands = String(settings.claudeHiddenCommands || hiddenCommandsTextFromProviderSettings(source, 'claude'));
	settings.codexHiddenCommands = String(settings.codexHiddenCommands || hiddenCommandsTextFromProviderSettings(source, 'codex'));
	settings.envText = String(settings.envText || '');
	settings.claudeEnvText = String(settings.claudeEnvText || '');
	settings.codexEnvText = String(settings.codexEnvText || '');
	settings.systemPrompt = String(settings.systemPrompt || '');
	return settings;
}

function resolveCodexServiceTier(settings, model) {
	return String(model || settings?.model || '').trim() === 'gpt-5.5' && settings?.serviceTier === 'fast'
		? 'fast'
		: null;
}

function parseEnvText(envText) {
	const result = {};
	for (const rawLine of String(envText || '').split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) {
			continue;
		}
		const idx = line.indexOf('=');
		if (idx <= 0) {
			continue;
		}
		const key = line.slice(0, idx).trim();
		const value = line.slice(idx + 1);
		if (key) {
			result[key] = value;
		}
	}
	return result;
}

function withUtf8ProcessEnv(env = {}) {
	const next = { ...(env || {}) };
	next.PYTHONIOENCODING = 'utf-8';
	next.PYTHONUTF8 = '1';
	next.PYTHONLEGACYWINDOWSSTDIO = '0';
	next.LANG = 'C.UTF-8';
	next.LC_ALL = 'C.UTF-8';
	next.LC_CTYPE = 'C.UTF-8';
	next.LESSCHARSET = 'utf-8';
	next.NPM_CONFIG_UNICODE = 'true';
	if (process.platform === 'win32') {
		next.CHCP = '65001';
		const bootstrap = getWindowsUtf8ShellBootstrapPath();
		if (bootstrap) {
			const existingBashEnv = String(next.BASH_ENV || '').trim();
			if (existingBashEnv && existingBashEnv !== bootstrap) {
				next.CLAUDIAN_USER_BASH_ENV = existingBashEnv;
			}
			next.BASH_ENV = bootstrap;
		}
	}
	return next;
}

function getWindowsUtf8ShellBootstrapPath() {
	if (process.platform !== 'win32') {
		return '';
	}
	try {
		const filePath = path.join(os.tmpdir(), 'claudian-sidebar-utf8-shell-init.sh');
		const script = [
			'if [ -n "${CLAUDIAN_USER_BASH_ENV:-}" ] && [ -r "${CLAUDIAN_USER_BASH_ENV}" ]; then',
			'  . "${CLAUDIAN_USER_BASH_ENV}"',
			'fi',
			'export PYTHONIOENCODING=utf-8',
			'export PYTHONUTF8=1',
			'export PYTHONLEGACYWINDOWSSTDIO=0',
			'export LANG=C.UTF-8',
			'export LC_ALL=C.UTF-8',
			'export LC_CTYPE=C.UTF-8',
			'export LESSCHARSET=utf-8',
			'command -v chcp.com >/dev/null 2>&1 && chcp.com 65001 >/dev/null 2>&1 || true',
			'',
		].join('\n');
		const existing = readTextFileLimited(filePath, 64 * 1024);
		if (existing !== script) {
			fs.writeFileSync(filePath, script, 'utf8');
		}
		return filePath.replace(/\\/g, '/');
	}
	catch {
		return '';
	}
}

function installUtf8ProcessDefaults() {
	const next = withUtf8ProcessEnv(process.env);
	for (const key of ['PYTHONIOENCODING', 'PYTHONUTF8', 'PYTHONLEGACYWINDOWSSTDIO', 'LANG', 'LC_ALL', 'LC_CTYPE', 'LESSCHARSET', 'NPM_CONFIG_UNICODE', 'CHCP', 'BASH_ENV', 'CLAUDIAN_USER_BASH_ENV']) {
		if (next[key]) {
			process.env[key] = next[key];
		}
	}
}

installUtf8ProcessDefaults();

function countReplacementCharacters(text) {
	return (String(text || '').match(/\uFFFD/g) || []).length;
}

function countMatches(text, pattern) {
	return (String(text || '').match(pattern) || []).length;
}

function countCjkCharacters(text) {
	return countMatches(text, /[\u3400-\u9FFF]/g);
}

function countSuspiciousUtf8MojibakeCharacters(text) {
	return countMatches(text, /[\u00C0-\u024F\u02B0-\u02FF\u0370-\u03FF\u0400-\u052F\u0590-\u05FF]/g);
}

function looksLikeGbkDecodedAsUtf8Text(text) {
	const value = String(text || '');
	if (!value) return false;
	if (/[\u02B0-\u02FF]/.test(value)) return true;
	const suspiciousCount = countSuspiciousUtf8MojibakeCharacters(value);
	const cjkCount = countCjkCharacters(value);
	return suspiciousCount >= 2 && cjkCount === 0;
}

function looksLikeMojibakeText(text) {
	const value = String(text || '');
	if (!value) return false;
	const replacementCount = countReplacementCharacters(value);
	if (replacementCount >= 2) return true;
	return /锟斤拷|ï¿½/.test(value) || looksLikeGbkDecodedAsUtf8Text(value);
}

function scoreDecodedProcessText(text) {
	const value = String(text || '');
	if (!value) return 0;
	let score = 0;
	score += Math.min(countCjkCharacters(value), 80) * 2;
	score += Math.min(countMatches(value, /[，。！？、：；（）《》]/g), 30);
	score -= countReplacementCharacters(value) * 20;
	score -= countMatches(value, /[\uE000-\uF8FF]/g) * 8;
	score -= countMatches(value, /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) * 8;
	if (/锟斤拷|ï¿½/.test(value)) score -= 30;
	if (looksLikeGbkDecodedAsUtf8Text(value)) score -= 16;
	return score;
}

function decodeGb18030Bytes(bytes) {
	try {
		const decoder = new TextDecoder('gb18030');
		return decoder.decode(bytes);
	}
	catch {
		return '';
	}
}

function decodeUtf8Strict(bytes) {
	try {
		const decoder = new TextDecoder('utf-8', { fatal: true });
		return decoder.decode(bytes);
	}
	catch {
		return null;
	}
}

function decodeProcessChunk(chunk) {
	if (chunk === undefined || chunk === null) return '';
	if (typeof chunk === 'string') return chunk;
	const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
	const utf8 = bytes.toString('utf8');
	const strictUtf8 = decodeUtf8Strict(bytes);
	if (strictUtf8 !== null && !looksLikeGbkDecodedAsUtf8Text(strictUtf8)) {
		return utf8;
	}
	const gb18030 = decodeGb18030Bytes(bytes);
	if (!gb18030) return utf8;
	const utf8Score = scoreDecodedProcessText(utf8);
	const gb18030Score = scoreDecodedProcessText(gb18030);
	if (strictUtf8 === null) {
		return gb18030Score >= utf8Score ? gb18030 : utf8;
	}
	return gb18030Score > utf8Score ? gb18030 : utf8;
}

function chunkToBuffer(chunk) {
	if (chunk === undefined || chunk === null) return Buffer.alloc(0);
	return Buffer.isBuffer(chunk) ? chunk : Buffer.from(typeof chunk === 'string' ? chunk : String(chunk), 'utf8');
}

function createProcessTextDecoder() {
	const buffers = [];
	let mode = 'utf8';
	let emitted = '';
	let utf8Decoder = null;
	let gb18030Decoder = null;
	try {
		utf8Decoder = new TextDecoder('utf-8', { fatal: true });
	}
	catch {
		utf8Decoder = null;
	}
	const switchToGb18030 = () => {
		mode = 'gb18030';
		try {
			gb18030Decoder = new TextDecoder('gb18030');
			const decoded = gb18030Decoder.decode(Buffer.concat(buffers), { stream: true });
			const suffix = decoded.startsWith(emitted) ? decoded.slice(emitted.length) : '';
			emitted = decoded;
			return suffix;
		}
		catch {
			return '';
		}
	};
	return {
		append(chunk) {
			const bytes = chunkToBuffer(chunk);
			if (bytes.length === 0) return '';
			buffers.push(bytes);
			if (mode === 'gb18030') {
				if (!gb18030Decoder) return '';
				const decoded = gb18030Decoder.decode(bytes, { stream: true });
				emitted += decoded;
				return decoded;
			}
			if (!utf8Decoder) {
				const decoded = decodeProcessChunk(bytes);
				emitted += decoded;
				return decoded;
			}
			try {
				const decoded = utf8Decoder.decode(bytes, { stream: true });
				if (decoded && looksLikeGbkDecodedAsUtf8Text(decoded)) {
					const bestDecoded = decodeProcessChunk(Buffer.concat(buffers));
					if (bestDecoded && bestDecoded !== `${emitted}${decoded}` && bestDecoded.startsWith(emitted)) {
						return switchToGb18030();
					}
				}
				emitted += decoded;
				return decoded;
			}
			catch {
				return switchToGb18030();
			}
		},
		flush() {
			if (mode === 'gb18030') {
				if (!gb18030Decoder) return '';
				const decoded = gb18030Decoder.decode();
				emitted += decoded;
				return decoded;
			}
			if (!utf8Decoder) return '';
			try {
				const decoded = utf8Decoder.decode();
				emitted += decoded;
				return decoded;
			}
			catch {
				return switchToGb18030();
			}
		},
		text() {
			if (buffers.length === 0) return '';
			return decodeProcessChunk(Buffer.concat(buffers));
		},
		byteLength() {
			return buffers.reduce((total, bytes) => total + bytes.length, 0);
		},
	};
}

function createDecodedLineReader(stream, onLine, options = {}) {
	const maxLineBytes = Math.max(1024, Number(options.maxLineBytes || PROCESS_LINE_MAX_BYTES) || PROCESS_LINE_MAX_BYTES);
	let pending = Buffer.alloc(0);
	let ended = false;
	const emitLine = (bytes) => {
		let lineBytes = bytes;
		if (lineBytes.length > 0 && lineBytes[lineBytes.length - 1] === 13) {
			lineBytes = lineBytes.subarray(0, lineBytes.length - 1);
		}
		onLine(decodeProcessChunk(lineBytes));
	};
	const flush = () => {
		if (ended) return;
		ended = true;
		if (pending.length > 0) {
			emitLine(pending);
			pending = Buffer.alloc(0);
		}
	};
	const onData = (chunk) => {
		if (ended) return;
		const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
		pending = pending.length > 0 ? Buffer.concat([pending, bytes]) : bytes;
		while (pending.length > maxLineBytes) {
			emitLine(Buffer.concat([
				pending.subarray(0, maxLineBytes),
				Buffer.from('\n[truncated oversized process line]', 'utf8'),
			]));
			if (typeof options.onOverflow === 'function') {
				options.onOverflow(pending.length);
			}
			pending = pending.subarray(maxLineBytes);
		}
		let offset = 0;
		for (;;) {
			const newlineIndex = pending.indexOf(10, offset);
			if (newlineIndex < 0) break;
			emitLine(pending.subarray(offset, newlineIndex));
			offset = newlineIndex + 1;
		}
		if (offset > 0) {
			pending = pending.subarray(offset);
		}
	};
	stream.on('data', onData);
	stream.once('end', flush);
	stream.once('close', flush);
	return {
		close() {
			flush();
			stream.off?.('data', onData);
			stream.off?.('end', flush);
			stream.off?.('close', flush);
			pending = Buffer.alloc(0);
		},
	};
}

function buildUtf8ShellCommand(command) {
	if (process.platform !== 'win32') {
		return command;
	}
	return `chcp 65001>nul && ${command}`;
}

function buildPathWithCommand(currentPath, command) {
	const parts = [];
	if (currentPath) {
		parts.push(currentPath);
	}
	if (command && /[\\/]/.test(command)) {
		parts.unshift(path.dirname(command));
	}
	return [...new Set(parts.filter(Boolean))].join(path.delimiter);
}

function isSafeBareCommandName(command) {
	const raw = String(command || '').trim();
	return !!raw && !/[\\/]/.test(raw) && /^[A-Za-z0-9_.@+-]+$/u.test(raw);
}

function assertSafeLaunchCommand(command, label = 'command') {
	const raw = String(command || '').trim();
	if (!raw) {
		throw new Error(`${label} is empty`);
	}
	if (!/[\\/]/.test(raw) && !isSafeBareCommandName(raw)) {
		throw new Error(`Unsafe ${label} name: ${raw}`);
	}
	return raw;
}

function shouldUseWindowsShellForCommand(command) {
	if (process.platform !== 'win32') {
		return false;
	}
	const raw = String(command || '').trim();
	return !/[\\/]/.test(raw) || /\.(?:cmd|bat)$/iu.test(raw);
}

function uniqueStringList(values) {
	return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
}

function executableNamesForCommand(command) {
	const base = path.basename(String(command || '').trim());
	if (!base) {
		return [];
	}
	if (process.platform !== 'win32' || path.extname(base)) {
		return [base];
	}
	return ['.exe', '.cmd', '.bat', '.com']
		.flatMap((ext) => [`${base}${ext}`, `${base}${ext.toUpperCase()}`]);
}

function resolveWindowsLaunchableCommand(command, cwd = process.cwd()) {
	const raw = String(command || '').trim();
	if (process.platform !== 'win32' || !raw || !/[\\/]/.test(raw)) {
		return raw;
	}
	const resolved = path.isAbsolute(raw) ? path.normalize(raw) : path.resolve(cwd || process.cwd(), raw);
	if (path.extname(resolved)) {
		return resolved;
	}
	for (const ext of ['.exe', '.cmd', '.bat', '.com']) {
		const candidate = `${resolved}${ext}`;
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}
	return resolved;
}

function probeExecutable(command, env = process.env, cwd = process.cwd()) {
	const raw = String(command || '').trim();
	const result = {
		command: raw,
		ok: false,
		resolvedPath: '',
		reason: '',
	};
	if (!raw) {
		return { ...result, reason: 'empty-command' };
	}
	const hasPathSeparator = /[\\/]/.test(raw);
	if (!hasPathSeparator && !isSafeBareCommandName(raw)) {
		return { ...result, reason: 'unsafe-command-name' };
	}
	if (hasPathSeparator) {
		const resolved = resolveWindowsLaunchableCommand(raw, cwd);
		const hasLaunchableExtension = process.platform !== 'win32' || /\.(?:exe|cmd|bat|com)$/iu.test(resolved);
		return hasLaunchableExtension && fs.existsSync(resolved)
			? { ...result, ok: true, resolvedPath: resolved, reason: 'path-exists' }
			: { ...result, resolvedPath: resolved, reason: 'path-not-found' };
	}
	const searchPath = String(env?.PATH || process.env.PATH || '')
		.split(path.delimiter)
		.map((entry) => entry.trim())
		.filter(Boolean);
	const names = executableNamesForCommand(raw);
	for (const dir of searchPath) {
		for (const name of names) {
			const candidate = path.join(dir, name);
			if (fs.existsSync(candidate)) {
				return { ...result, ok: true, resolvedPath: candidate, reason: 'found-on-path' };
			}
		}
	}
	return { ...result, reason: 'not-found-on-path' };
}

function probeCommandVersion(command, args = ['--version'], options = {}) {
	const raw = String(command || '').trim();
	if (!raw) {
		return {
			ok: false,
			command: raw,
			version: '',
			stdout: '',
			stderr: '',
			error: 'empty-command',
		};
	}
	const cwd = options.cwd || process.cwd();
	const env = withUtf8ProcessEnv({
		...process.env,
		...(options.env || {}),
	});
	if (!/[\\/]/.test(raw)) {
		const executableProbe = probeExecutable(raw, env, cwd);
		if (!executableProbe.ok) {
			return {
				ok: false,
				command: raw,
				version: '',
				stdout: '',
				stderr: '',
				error: executableProbe.reason || 'command-not-found',
				status: null,
				signal: null,
			};
		}
	}
	try {
		const result = spawnSync(raw, args, {
			cwd,
			env,
			encoding: 'utf8',
			timeout: options.timeoutMs || 7000,
			windowsHide: true,
			shell: shouldUseWindowsShellForCommand(raw),
		});
		const stdout = String(result.stdout || '').trim();
		const stderr = String(result.stderr || '').trim();
		const output = stdout || stderr;
		return {
			ok: result.status === 0 && !!output,
			command: raw,
			version: output.split(/\r?\n/u)[0] || '',
			stdout: logPreview(stdout, 2000),
			stderr: logPreview(stderr, 2000),
			error: result.error ? (result.error.message || String(result.error)) : '',
			status: result.status,
			signal: result.signal,
		};
	}
	catch (error) {
		return {
			ok: false,
			command: raw,
			version: '',
			stdout: '',
			stderr: '',
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

function probeCodexCli(settings) {
	const command = resolveCodexCommand(settings || {});
	const launchSpec = resolveCodexLaunchSpec({ ...(settings || {}), codexPath: command });
	const env = launchSpec?.env || process.env;
	const versionProbe = probeCommandVersion(command, ['--version'], {
		cwd: settings?.workspace || process.cwd(),
		env,
		timeoutMs: 9000,
	});
	const appServerProbe = versionProbe.ok
		? probeCommandVersion(command, ['app-server', '--help'], {
			cwd: settings?.workspace || process.cwd(),
			env,
			timeoutMs: 9000,
		})
		: {
			ok: false,
			command,
			version: '',
			stdout: '',
			stderr: '',
			error: 'Skipped app-server probe because Codex version check failed.',
		};
	const versionOutput = versionProbe.version || `${versionProbe.stdout}\n${versionProbe.stderr}`;
	const appServerOutput = `${appServerProbe.version || ''}\n${appServerProbe.stdout || ''}\n${appServerProbe.stderr || ''}`;
	const versionOk = versionProbe.ok && /codex/i.test(versionOutput);
	const appServerOk = appServerProbe.ok && /app-server|app server|Usage:\s*codex app-server/i.test(appServerOutput);
	return {
		provider: 'codex',
		ok: versionOk && appServerOk,
		command,
		version: versionProbe.version,
		error: versionProbe.error
			|| (!versionOk ? versionProbe.stderr || 'Codex CLI version check failed' : '')
			|| appServerProbe.error
			|| (!appServerOk ? appServerProbe.stderr || 'Codex CLI does not expose app-server.' : ''),
		bundle: getCodexRuntimeBundleInfo(),
		probe: versionProbe,
		appServerProbe,
	};
}

function probeClaudeCli(settings) {
	const command = resolveClaudeCommand(settings || {});
	const env = buildClaudeEnvironment(settings || {});
	const versionProbe = probeCommandVersion(command, ['--version'], {
		cwd: settings?.workspace || process.cwd(),
		env,
		timeoutMs: CLAUDE_RUNTIME_COMMAND_PROBE_TIMEOUT_MS,
	});
	return {
		provider: 'claude',
		ok: versionProbe.ok && /claude/i.test(versionProbe.version || `${versionProbe.stdout}\n${versionProbe.stderr}`),
		command,
		version: versionProbe.version,
		error: versionProbe.error || (versionProbe.ok ? '' : versionProbe.stderr || 'Claude Code CLI version check failed'),
		bundle: getClaudeRuntimeBundleInfo(),
		probe: versionProbe,
	};
}

function resolveCodexCommand(settings) {
	const configured = String(settings.codexPath || '').trim();
	if (configured) {
		return resolveWindowsLaunchableCommand(
			assertSafeLaunchCommand(configured, 'Codex executable'),
			settings.workspace || process.cwd(),
		);
	}
	const managed = resolveManagedCodexExecutable();
	if (managed) {
		return managed;
	}
	const installed = resolveInstalledCodexExecutable();
	if (installed) {
		return installed;
	}
	return 'codex';
}

function normalizeWindowsPath(value) {
	if (!value) {
		return '';
	}
	let normalized = String(value).replace(/\//g, '\\');
	if (normalized.startsWith('\\\\?\\UNC\\')) {
		normalized = `\\\\${normalized.slice('\\\\?\\UNC\\'.length)}`;
	}
	else if (normalized.startsWith('\\\\?\\')) {
		normalized = normalized.slice('\\\\?\\'.length);
	}
	return path.win32.normalize(normalized);
}

function normalizePosixPath(value) {
	if (!value) {
		return '';
	}
	const normalized = path.posix.normalize(String(value).replace(/\\/g, '/'));
	return normalized === '/' ? normalized : normalized.replace(/\/+$/, '');
}

function mapWindowsDriveToWsl(hostPath) {
	const normalized = normalizeWindowsPath(hostPath);
	const match = normalized.match(/^([A-Za-z]):(?:\\(.*))?$/);
	if (!match) {
		return null;
	}
	const drive = match[1].toLowerCase();
	const tail = (match[2] || '').replace(/\\/g, '/');
	return tail ? `/mnt/${drive}/${tail}` : `/mnt/${drive}`;
}

function mapWslUncToLinux(hostPath, distroName) {
	const normalized = normalizeWindowsPath(hostPath);
	const match = normalized.match(/^\\\\wsl\$\\([^\\]+)(?:\\(.*))?$/i);
	if (!match) {
		return null;
	}
	if (distroName && match[1].toLowerCase() !== distroName.toLowerCase()) {
		return null;
	}
	const tail = match[2] ? match[2].replace(/\\/g, '/') : '';
	return tail ? `/${tail}` : '/';
}

function mapHostPathToWsl(hostPath, distroName) {
	if (!hostPath) {
		return null;
	}
	if (String(hostPath).startsWith('/')) {
		return normalizePosixPath(hostPath);
	}
	return mapWslUncToLinux(hostPath, distroName) || mapWindowsDriveToWsl(hostPath);
}

function mapWslToWindowsDrive(targetPath) {
	const normalized = normalizePosixPath(targetPath);
	const match = normalized.match(/^\/mnt\/([a-zA-Z])(?:\/(.*))?$/);
	if (!match) {
		return null;
	}
	const drive = match[1].toUpperCase();
	const tail = match[2] ? match[2].replace(/\//g, '\\') : '';
	return tail ? `${drive}:\\${tail}` : `${drive}:\\`;
}

function mapWslToUnc(targetPath, distroName) {
	if (!distroName) {
		return null;
	}
	const normalized = normalizePosixPath(targetPath);
	if (!normalized.startsWith('/')) {
		return null;
	}
	const tail = normalized === '/' ? '' : normalized.slice(1).replace(/\//g, '\\');
	return tail ? `\\\\wsl$\\${distroName}\\${tail}` : `\\\\wsl$\\${distroName}`;
}

function isValidEnvName(name) {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(name || ''));
}

function resolvePdfAiContextCliPath() {
	const candidates = [
		process.env.PDF_AI_CONTEXT_CLI,
		process.resourcesPath && path.join(process.resourcesPath, 'pdfai-context-cli.js'),
		path.join(getHostConfig().electronDir, 'pdfai-context-cli.js'),
	]
		.filter((candidate) => typeof candidate === 'string' && candidate.trim())
		.map((candidate) => path.resolve(candidate));
	return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0] || '';
}

function buildPdfAiContextEnvironment(settings = {}) {
	const workspace = String(settings.workspace || '').trim();
	const cliPath = resolvePdfAiContextCliPath();
	const language = String(settings.locale || settings.uiLanguage || '').trim().toLowerCase().startsWith('zh') ? 'zh' : 'en';
	return Object.fromEntries([
		['PDF_AI_CONTEXT_CLI', cliPath],
		['PDF_AI_WORKSPACE', workspace],
		['PDF_AI_UI_LANGUAGE', language],
	].filter(([, value]) => Boolean(value)));
}

function buildCodexEnvOverrides(settings = {}) {
	const parsedEnv = stripRoutingEnvironmentVariables(
		parseEnvText(combineEnvironmentText(settings?.envText, settings?.codexEnvText)),
	);
	const env = { ...parsedEnv };
	const codexHome = String(settings?.codexHome || '').trim();
	const cliConfig = readCodexCliConfig({ codexHome });
	if (codexHome) {
		env.CODEX_HOME = path.resolve(codexHome);
	}
	if (settings?.openaiModel) {
		env.OPENAI_MODEL = settings.openaiModel;
	}
	else if (!env.OPENAI_MODEL && cliConfig.model) {
		env.OPENAI_MODEL = cliConfig.model;
	}
	Object.assign(env, buildPdfAiContextEnvironment(settings));
	return Object.fromEntries(Object.entries(env).filter(([key]) => isValidEnvName(key)));
}

const CODEX_UTF8_ENV_CONFIG_ARGS = Object.freeze(['-c', 'shell_environment_policy.inherit="all"']);
const CODEX_APP_SERVER_ARGS = Object.freeze([
	'app-server',
	'--listen',
	'stdio://',
	...CODEX_UTF8_ENV_CONFIG_ARGS,
]);

function computeCodexEnvironmentHash(settings) {
	const env = buildCodexEnvOverrides(settings || {});
	return CODEX_ENV_HASH_KEYS
		.filter((key) => env[key])
		.map((key) => `${key}=${env[key]}`)
		.sort()
		.join('|');
}

function computeClaudeRuntimeCommandHash(settings) {
	const env = parseEnvText(combineEnvironmentText(settings?.envText, settings?.claudeEnvText));
	const pdfAiContextEnvironment = buildPdfAiContextEnvironment(settings);
	return [
		settings?.claudePath || '',
		settings?.claudeSafeMode || '',
		resolveClaudeSettingSources(settings),
		settings?.claudeEnableChrome ? 'chrome' : '',
		env.PATH || '',
		pdfAiContextEnvironment.PDF_AI_UI_LANGUAGE || '',
	].join('|');
}

function didCodexEnvironmentHashChange(previous, next) {
	return computeCodexEnvironmentHash(previous) !== computeCodexEnvironmentHash(next);
}

function maskLaunchEnvValue(key, value) {
	if (/KEY|TOKEN|SECRET|PASSWORD/i.test(key)) {
		return '********';
	}
	return String(value ?? '');
}

function quoteLaunchArg(value) {
	const text = String(value ?? '');
	if (!text) {
		return '""';
	}
	return /[\s"]/u.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}

function formatLaunchCommand(command, args, envPairs = []) {
	const displayArgs = [...args];
	if (envPairs.length) {
		const envIndex = displayArgs.indexOf('env');
		if (envIndex >= 0) {
			for (let index = 0; index < envPairs.length; index += 1) {
				const [key, value] = envPairs[index];
				displayArgs[envIndex + 1 + index] = `${key}=${maskLaunchEnvValue(key, value)}`;
			}
		}
	}
	return [command, ...displayArgs].map(quoteLaunchArg).join(' ');
}

function resolveCodexLaunchSpec(settings) {
	const workspace = settings.workspace || process.cwd();
	const envOverrides = buildCodexEnvOverrides(settings);
	const inheritedEnv = process.env;
	const useWsl = settings.codexInstallationMethod === 'wsl' && process.platform === 'win32';
	if (useWsl) {
		const distro = settings.codexWslDistroOverride || '';
		const targetWorkspace = mapHostPathToWsl(workspace, distro) || normalizePosixPath(workspace);
		const configuredCommand = String(settings.codexPath || '').trim() || 'codex';
		const targetCommand = mapHostPathToWsl(configuredCommand, distro) || configuredCommand;
		const targetEnv = withUtf8ProcessEnv({ ...envOverrides });
		if (targetEnv.CODEX_HOME) {
			targetEnv.CODEX_HOME = mapHostPathToWsl(targetEnv.CODEX_HOME, distro) || normalizePosixPath(targetEnv.CODEX_HOME);
		}
		for (const key of ['PDF_AI_CONTEXT_CLI', 'PDF_AI_WORKSPACE']) {
			if (targetEnv[key]) {
				targetEnv[key] = mapHostPathToWsl(targetEnv[key], distro) || normalizePosixPath(targetEnv[key]);
			}
		}
		const envPairs = Object.entries(targetEnv);
		const args = [];
		if (distro) {
			args.push('-d', distro);
		}
		if (targetWorkspace) {
			args.push('--cd', targetWorkspace);
		}
		args.push('--');
		if (envPairs.length) {
			args.push('env', ...envPairs.map(([key, value]) => `${key}=${value}`));
		}
		args.push(targetCommand, ...CODEX_APP_SERVER_ARGS);
		return {
			method: 'wsl',
			command: 'wsl.exe',
			args,
			cwd: workspace,
			env: withUtf8ProcessEnv({ ...inheritedEnv }),
			shell: false,
			targetWorkspace,
			targetCommand,
			displayCommand: formatLaunchCommand('wsl.exe', args, envPairs),
		};
	}

	const command = resolveCodexCommand(settings);
	const env = withUtf8ProcessEnv({
		...inheritedEnv,
		...envOverrides,
		PATH: buildPathWithCommand(envOverrides.PATH || inheritedEnv.PATH, command),
	});
	const args = [...CODEX_APP_SERVER_ARGS];
	return {
		method: 'native-windows',
		command,
		args,
		cwd: workspace,
		env,
		shell: shouldUseWindowsShellForCommand(command),
		targetWorkspace: workspace,
		targetCommand: command,
		displayCommand: formatLaunchCommand(command, args),
	};
}

function resolveClaudeCommand(settings) {
	const configured = String(settings.claudePath || '').trim();
	if (configured) {
		return assertSafeLaunchCommand(configured, 'Claude executable');
	}
	return resolveNativeClaudeCodeExecutable() || (process.platform === 'win32' ? 'claude.cmd' : 'claude');
}

function buildClaudeEnvironment(settings) {
	const claudeCommand = resolveClaudeCommand(settings);
	const claudeEnvText = stripRoutingEnvironmentVariables(
		parseEnvText(combineEnvironmentText(settings?.envText, settings?.claudeEnvText)),
	);
	const inheritedEnv = process.env;
	const claudeEnv = withUtf8ProcessEnv({
		...inheritedEnv,
		...claudeEnvText,
		...buildPdfAiContextEnvironment(settings),
		PATH: buildPathWithCommand(claudeEnvText.PATH || inheritedEnv.PATH, claudeCommand),
	});
	return claudeEnv;
}

function buildMarkdownNoteCodexExecLaunchSpec(settings, payload = {}) {
	const launchSpec = resolveCodexLaunchSpec(settings);
	const model = resolveRuntimeModelForProvider('codex', settings, payload);
	const effort = safeReasoningEffort('codex', model, payload.effort || settings.effort, {
		settings,
	});
	const execArgs = [
		'exec',
		'--ephemeral',
		'--json',
		'--skip-git-repo-check',
		'--sandbox',
		'read-only',
		...CODEX_UTF8_ENV_CONFIG_ARGS,
		'-c',
		`model_reasoning_effort=${JSON.stringify(effort)}`,
		'-m',
		model,
		'-',
	];
	if (launchSpec.method !== 'wsl') {
		return {
			...launchSpec,
			args: execArgs,
			provider: 'codex',
			model,
			effort,
		};
	}

	// Reuse the existing WSL launcher prefix and replace only the app-server command.
	const commandIndex = launchSpec.args.lastIndexOf(launchSpec.targetCommand);
	if (commandIndex < 0) {
		throw new Error('Could not construct the Codex ephemeral launcher');
	}
	return {
		...launchSpec,
		args: [...launchSpec.args.slice(0, commandIndex + 1), ...execArgs],
		provider: 'codex',
		model,
		effort,
	};
}

function buildMarkdownNoteCodexAppServerLaunchSpec(settings, payload = {}) {
	const launchSpec = resolveCodexLaunchSpec(settings);
	const model = resolveRuntimeModelForProvider('codex', settings, payload);
	return {
		...launchSpec,
		provider: 'codex',
		model,
		effort: safeReasoningEffort('codex', model, payload.effort || settings.effort, {
			settings,
		}),
	};
}

function buildMarkdownNoteClaudeExecLaunchSpec(settings, payload = {}) {
	const workspace = settings.workspace || process.cwd();
	const command = resolveClaudeCommand(settings);
	const model = resolveRuntimeModelForProvider('claude', settings, payload);
	const effort = resolveClaudeEffort(payload.effort || settings.effort, { model, settings });
	return {
		provider: 'claude',
		command,
		args: [
			'-p',
			'--verbose',
			'--output-format',
			'stream-json',
			'--include-partial-messages',
			'--model',
			model,
			...(effort ? ['--effort', effort] : []),
			...resolveClaudeAuxQueryArgs(settings, { persistSession: false }),
		],
		cwd: workspace,
		env: buildClaudeEnvironment(settings),
		shell: process.platform === 'win32' && !/[\\/]/.test(command),
		model,
		effort,
	};
}

// One-off work such as document translation must use the same configured
// native CLI as the sidebar, without creating a persistent chat session.
function buildEphemeralCliTranslationLaunchSpec(settings, payload = {}) {
	const provider = String(payload?.provider || settings?.provider || '').trim().toLowerCase() === 'claude'
		? 'claude'
		: 'codex';
	return provider === 'claude'
		? buildMarkdownNoteClaudeExecLaunchSpec(settings, payload)
		: buildMarkdownNoteCodexExecLaunchSpec(settings, payload);
}

function buildRuntimePreflight(settingsInput, options = {}) {
	const settings = normalizeSettings(settingsInput || {}, options.defaultWorkspace || process.cwd());
	const workspace = settings.workspace || options.defaultWorkspace || process.cwd();
	const workspaceExists = fs.existsSync(workspace);
	const claudeRuntime = resolveClaudeRuntimeExecutable({ settings, cwd: workspace });
	const claudeCommand = resolveClaudeCommand(settings);
	const claudeEnvText = parseEnvText(combineEnvironmentText(settings.envText, settings.claudeEnvText));
	const claudeEnv = buildClaudeEnvironment(settings);
	const claudeBaseUrl = normalizeRuntimeApiBaseUrl(readClaudeCliEnv().ANTHROPIC_BASE_URL);
	const codexLaunch = resolveCodexLaunchSpec(settings);
	const sandbox = resolveSandboxConfig(settings);
	const codexExecutable = codexLaunch.method === 'wsl'
		? probeExecutable(codexLaunch.command, codexLaunch.env, workspace)
		: probeExecutable(codexLaunch.command, codexLaunch.env, codexLaunch.cwd);
	const claudeExecutable = probeExecutable(claudeCommand, claudeEnv, workspace);
	const warnings = [];
	if (!workspaceExists) {
		warnings.push(`Workspace does not exist: ${workspace}`);
	}
	if (settings.provider === 'claude' && !claudeExecutable.ok) {
		warnings.push(`Claude command not found: ${claudeCommand}`);
	}
	if (settings.provider !== 'claude' && !codexExecutable.ok) {
		warnings.push(`Codex launcher not found: ${codexLaunch.command}`);
	}
	if (codexLaunch.method === 'wsl' && !mapHostPathToWsl(workspace, settings.codexWslDistroOverride || '')) {
		warnings.push(`Workspace may not be reachable from WSL: ${workspace}`);
	}
	return {
		ok: warnings.length === 0,
		settingsPath: options.settingsPath || getSettingsPath(),
		workspace: {
			path: workspace,
			exists: workspaceExists,
		},
		provider: settings.provider,
		model: resolveRuntimeModelForProvider(settings.provider, settings, {}),
		configuredModel: settings.model,
		permissionMode: settings.permissionMode,
		claude: {
			command: claudeCommand,
			runtime: claudeRuntime,
			executable: claudeExecutable,
			permissionArgs: resolveClaudePermissionArgs(settings),
			settingSources: resolveClaudeSettingSources(settings).split(','),
			safeMode: settings.claudeSafeMode,
			chromeEnabled: settings.claudeEnableChrome === true,
			configDir: getClaudeConfigDir(),
			envKeys: uniqueStringList(Object.keys(claudeEnvText).concat(
				claudeBaseUrl ? ['ANTHROPIC_BASE_URL'] : [],
			)).sort(),
		},
		codex: {
			method: codexLaunch.method,
			command: codexLaunch.command,
			args: codexLaunch.args,
			cwd: codexLaunch.cwd,
			targetWorkspace: codexLaunch.targetWorkspace,
			targetCommand: codexLaunch.targetCommand,
			displayCommand: codexLaunch.displayCommand,
			executable: codexExecutable,
			approvalPolicy: sandbox.approvalPolicy,
			sandbox: sandbox.sandbox,
			envKeys: Object.keys(buildCodexEnvOverrides(settings)).sort(),
		},
		warnings,
	};
}

function resolveClaudePermissionArgs(settings) {
	const settingSources = resolveClaudeSettingSources(settings);
	const args = ['--setting-sources', settingSources];
	if (settings.claudeSafeMode === 'auto') {
		args.push('--enable-auto-mode');
	}
	if (settings.claudeEnableChrome) {
		args.push('--chrome');
	}
	if (settings.permissionMode === 'yolo') {
		return [...args, '--permission-mode', 'bypassPermissions', '--dangerously-skip-permissions'];
	}
	if (settings.permissionMode === 'plan') {
		return [...args, '--permission-mode', 'plan'];
	}
	return [...args, '--permission-mode', settings.claudeSafeMode || 'acceptEdits'];
}

function resolveClaudeAuxQueryArgs(settings, options = {}) {
	const settingSources = resolveClaudeSettingSources(settings);
	const args = [
		'--setting-sources',
		settingSources,
		'--permission-mode',
		'bypassPermissions',
		'--dangerously-skip-permissions',
		'--tools',
		'',
	];
	if (options.persistSession === false) {
		args.push('--no-session-persistence');
	}
	if (settings.claudeSafeMode === 'auto') {
		args.push('--enable-auto-mode');
	}
	return args;
}

function normalizeRuntimeEffort(value) {
	const lower = String(value || '').trim().toLowerCase();
	if (lower === 'minimal') return 'low';
	return REASONING_EFFORT_SET.has(lower) ? lower : DEFAULT_SETTINGS.effort;
}

function resolveClaudeEffort(value, options = {}) {
	const effort = normalizeRuntimeEffort(value);
	const hasModelContext = !!options.model || !!options.settings || !!options.modelAsset;
	if (!hasModelContext) return effort === 'ultra' ? 'max' : effort;
	const capabilities = getReasoningEffortCapabilities('claude', options.model, options);
	if (capabilities.length === 0) return '';
	return capabilities.includes(effort)
		? effort
		: safeReasoningEffort('claude', options.model, effort, options);
}

const CLAUDE_DISABLED_BUILTIN_SUBAGENTS = ['Task(statusline-setup)'];
const CLAUDE_ALWAYS_ALLOWED_TOOLS_WITH_RESTRICTIONS = ['Skill'];

function normalizePathList(value) {
	const seen = new Set();
	for (const entry of Array.isArray(value) ? value : []) {
		const text = String(entry?.path || entry || '').trim();
		if (text) seen.add(text);
	}
	return [...seen];
}

function normalizeNameList(value) {
	const seen = new Set();
	for (const entry of Array.isArray(value) ? value : []) {
		const text = String(entry?.name || entry || '').trim();
		if (text) seen.add(text);
	}
	return [...seen];
}

function normalizeClaudeAllowedTools(value) {
	const tools = normalizeNameList(value);
	if (tools.length === 0) {
		return [];
	}
	const seen = new Set(tools);
	for (const tool of CLAUDE_ALWAYS_ALLOWED_TOOLS_WITH_RESTRICTIONS) {
		if (!seen.has(tool)) {
			tools.push(tool);
			seen.add(tool);
		}
	}
	return tools;
}

function getClaudeContextSavingMcpNames(servers) {
	return new Set((Array.isArray(servers) ? servers : [])
		.filter((server) => server?.enabled !== false && server?.contextSaving !== false)
		.map((server) => server.name));
}

function escapeRegExpText(value) {
	return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMcpMentionNames(text, servers) {
	const names = new Set();
	const contextSavingNames = getClaudeContextSavingMcpNames(servers);
	const mentionPattern = /@([a-zA-Z0-9._-]+)(?!\/)/g;
	let match;
	while ((match = mentionPattern.exec(String(text || ''))) !== null) {
		const name = match[1];
		if (contextSavingNames.has(name)) {
			names.add(name);
		}
	}
	return names;
}

function transformClaudeMcpMentions(text, servers) {
	const source = String(text || '');
	const contextSavingNames = getClaudeContextSavingMcpNames(servers);
	if (contextSavingNames.size === 0) {
		return source;
	}
	const escapedNames = [...contextSavingNames]
		.sort((left, right) => right.length - left.length)
		.map(escapeRegExpText)
		.join('|');
	const pattern = new RegExp(`@(${escapedNames})(?! MCP)(?!/)(?![a-zA-Z0-9_-])(?!\\.[a-zA-Z0-9_-])`, 'g');
	return source.replace(pattern, '@$1 MCP');
}

function buildClaudeActiveMcpConfig(workspace, payload = {}, text = '') {
	const sourceServers = Array.isArray(payload.mcpServers)
		? payload.mcpServers
		: loadClaudeMcpServers(workspace).servers;
	const servers = sourceServers.map(normalizeManagedMcpServer).filter(Boolean);
	const mentionedNames = new Set([
		...normalizeNameList(payload.mcpMentions),
		...normalizeNameList(payload.enabledMcpServers),
		...extractMcpMentionNames(text, servers),
	]);
	const mcpServers = {};
	const disallowedTools = new Set();
	for (const server of servers) {
		if (server.enabled === false) continue;
		if (server.contextSaving !== false && !mentionedNames.has(server.name)) continue;
		mcpServers[server.name] = server.config;
		for (const tool of server.disabledTools || []) {
			const normalized = String(tool || '').trim();
			if (normalized) {
				disallowedTools.add(`mcp__${server.name}__${normalized}`);
			}
		}
	}
	if (Object.keys(mcpServers).length === 0) {
		return { configPath: '', tempDir: '', disallowedTools: [...disallowedTools], servers, mcpServers };
	}
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claudian-claude-mcp-'));
	const configPath = path.join(tempDir, 'mcp.json');
	fs.writeFileSync(configPath, JSON.stringify({ mcpServers }, null, 2));
	return { configPath, tempDir, disallowedTools: [...disallowedTools], servers, mcpServers };
}

function extractClaudeTextFromMessage(message) {
	const content = Array.isArray(message?.content) ? message.content : [];
	return content
		.map((block) => (block?.type === 'text' ? block.text || '' : ''))
		.join('');
}

const TITLE_GENERATION_SYSTEM_PROMPT = `You are a specialist in summarizing user intent.

**Task**: Generate a **concise, descriptive title** (max 50 chars) summarizing the user's task/request.

**Rules**:
1.  **Format**: Sentence case. No periods/quotes.
2.  **Structure**: Start with a **strong verb** (e.g., Create, Fix, Debug, Explain, Analyze).
3.  **Forbidden**: "Conversation with...", "Help me...", "Question about...", "I need...".
4.  **Tech Context**: Detect and include the primary language/framework if code is present (e.g., "Debug Python script", "Refactor React hook").

**Output**: Return ONLY the raw title text.`;

function buildTitleGenerationPrompt(userMessage) {
	const text = String(userMessage || '');
	const truncated = text.length > 500 ? `${text.slice(0, 500)}...` : text;
	return `User's request:\n"""\n${truncated}\n"""\n\nGenerate a title for this conversation:`;
}

function parseTitleGenerationResponse(responseText) {
	let title = String(responseText || '').trim();
	if (!title) {
		return null;
	}
	if ((title.startsWith('"') && title.endsWith('"')) || (title.startsWith("'") && title.endsWith("'"))) {
		title = title.slice(1, -1);
	}
	title = title.replace(/[.!?:;,]+$/, '');
	if (title.length > 50) {
		title = `${title.slice(0, 47)}...`;
	}
	return title || null;
}

function buildDryGeneratedTitle(userMessage) {
	const text = String(userMessage || '').replace(/^[/#!$@]+/, '').replace(/\s+/g, ' ').trim();
	const words = text.split(/\s+/).filter(Boolean);
	const meaningful = words.slice(0, 6).join(' ') || 'conversation';
	return parseTitleGenerationResponse(`Summarize ${meaningful}`) || 'Summarize conversation';
}

function buildRefineSystemPrompt(existingInstructions) {
	return originalShared.buildRefineSystemPrompt(existingInstructions);
}

function parseInstructionRefineResponse(responseText) {
	return originalShared.parseInstructionRefineResponse(responseText);
}

function buildDryInstructionRefineText(rawInstruction, existingInstructions, continuationMessage) {
	const raw = String(rawInstruction || '').replace(/^#\s*/, '').trim();
	const continuation = String(continuationMessage || '').trim();
	if (!continuation && /clarify|detail|\?|具体/i.test(raw)) {
		return 'What scope, tone, or constraint should this custom instruction apply to?';
	}
	const lines = [
		'When assisting in this workspace:',
		`- Provider-refined instruction: ${raw || 'Follow the user instruction precisely.'}`,
	];
	if (continuation) {
		lines.push(`- Additional detail: ${continuation}`);
	}
	if (String(existingInstructions || '').trim()) {
		lines.push('- Respect existing custom instructions without duplicating them.');
	}
	return `<instruction>${lines.join('\n')}</instruction>`;
}

function parseInlineEditResponse(responseText) {
	const text = String(responseText || '');
	const replacementMatch = text.match(/<replacement>([\s\S]*?)<\/replacement>/);
	if (replacementMatch) {
		return { success: true, editedText: replacementMatch[1] };
	}
	const insertionMatch = text.match(/<insertion>([\s\S]*?)<\/insertion>/);
	if (insertionMatch) {
		return { success: true, insertedText: insertionMatch[1] };
	}
	const trimmed = text.trim();
	if (trimmed) {
		return { success: true, clarification: trimmed };
	}
	return { success: false, error: 'Empty response' };
}

function appendContextFiles(prompt, contextFiles) {
	const files = Array.isArray(contextFiles) ? contextFiles.map(String).filter(Boolean) : [];
	if (!files.length) return prompt;
	return `${prompt}\n\n<context_files>\n${files.join(', ')}\n</context_files>`;
}

function buildInlineEditPrompt(request) {
	const req = request && typeof request === 'object' ? request : {};
	let prompt = '';
	if (req.mode === 'cursor') {
		const ctx = req.cursorContext && typeof req.cursorContext === 'object' ? req.cursorContext : {};
		const line = Number.isFinite(Number(ctx.line)) ? Number(ctx.line) : 0;
		const lineAttr = ` line="${line + 1}"`;
		let cursorContent = '';
		if (ctx.isInbetween) {
			const parts = [];
			if (ctx.beforeCursor) parts.push(String(ctx.beforeCursor));
			parts.push('| #inbetween');
			if (ctx.afterCursor) parts.push(String(ctx.afterCursor));
			cursorContent = parts.join('\n');
		}
		else {
			cursorContent = `${String(ctx.beforeCursor || '')}|${String(ctx.afterCursor || '')} #inline`;
		}
		prompt = [
			String(req.instruction || ''),
			'',
			`<editor_cursor path="${String(req.notePath || 'untitled.md')}"${lineAttr}>`,
			cursorContent,
			'</editor_cursor>',
		].join('\n');
	}
	else {
		const startLine = Number(req.startLine || 0);
		const lineCount = Number(req.lineCount || 0);
		const lineAttr = startLine && lineCount ? ` lines="${startLine}-${startLine + lineCount - 1}"` : '';
		prompt = [
			String(req.instruction || ''),
			'',
			`<editor_selection path="${String(req.notePath || 'untitled.md')}"${lineAttr}>`,
			String(req.selectedText || ''),
			'</editor_selection>',
		].join('\n');
	}
	return appendContextFiles(prompt, req.contextFiles);
}

const INLINE_EDIT_READ_ONLY_TOOLS = [...originalShared.READ_ONLY_TOOLS];

function getTodayDate() {
	const now = new Date();
	const readable = now.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
	const iso = now.toISOString().split('T')[0];
	return `${readable} (${iso})`;
}

function getInlineEditSystemPrompt() {
	const pathRules = '- **Paths**: Must be RELATIVE to vault root (e.g., "notes/file.md").';

	return `Today is ${getTodayDate()}.

You are an expert editor and writing assistant. You help users refine their text, answer questions, and generate content with high precision.

## Core Directives

1.  **Style Matching**: Mimic the user's tone, voice, and formatting style (indentation, bullet points, capitalization).
2.  **Context Awareness**: Always Read the full file (or significant context) to understand the broader topic before editing. Do not rely solely on the selection.
3.  **Silent Execution**: Use tools (Read, WebSearch) silently. Your final output must be ONLY the result.
4.  **No Fluff**: No pleasantries, no "Here is the text", no "I have updated...". Just the content.

## Input Format

User messages have the instruction first, followed by XML context tags:

### Selection Mode
\`\`\`
user's instruction

<editor_selection path="path/to/file.md">
selected text here
</editor_selection>
\`\`\`
Use \`<replacement>\` tags for edits.

### Cursor Mode
\`\`\`
user's instruction

<editor_cursor path="path/to/file.md">
text before|text after #inline
</editor_cursor>
\`\`\`
Or between paragraphs:
\`\`\`
user's instruction

<editor_cursor path="path/to/file.md">
Previous paragraph
| #inbetween
Next paragraph
</editor_cursor>
\`\`\`
Use \`<insertion>\` tags to insert new content at the cursor position (\`|\`).

## Tools & Path Rules

- **Tools**: Read, Grep, Glob, LS, WebSearch, WebFetch. (All read-only).
${pathRules}

## Thinking Process

Before generating the final output, mentally check:
1.  **Context**: Have I read enough of the file to understand the *topic* and *structure*?
2.  **Style**: What is the user's indentation (2 vs 4 spaces, tabs)? What is their tone?
3.  **Type**: Is this **Prose** (flow, grammar, clarity) or **Code** (syntax, logic, variable names)?
    - *Prose*: Ensure smooth transitions.
    - *Code*: Preserve syntax validity; do not break surrounding brackets/indentation.

## Output Rules - CRITICAL

**ABSOLUTE RULE**: Your text output must contain ONLY the final answer, replacement, or insertion. NEVER output:
- "I'll read the file..." / "Let me check..." / "I will..."
- "I'm asked about..." / "The user wants..."
- "Based on my analysis..." / "After reading..."
- "Here's..." / "The answer is..."
- ANY announcement of what you're about to do or did

Use tools silently. Your text output = final result only.

### When Replacing Selected Text (Selection Mode)

If the user wants to MODIFY or REPLACE the selected text, wrap the replacement in <replacement> tags:

<replacement>your replacement text here</replacement>

The content inside the tags should be ONLY the replacement text - no explanation.

### When Inserting at Cursor (Cursor Mode)

If the user wants to INSERT new content at the cursor position, wrap the insertion in <insertion> tags:

<insertion>your inserted text here</insertion>

The content inside the tags should be ONLY the text to insert - no explanation.

### When Answering Questions or Providing Information

If the user is asking a QUESTION, respond WITHOUT tags. Output the answer directly.

WRONG: "I'll read the full context of this file to give you a better explanation. This is a guide about..."
CORRECT: "This is a guide about..."

### When Clarification is Needed

If the request is ambiguous, ask a clarifying question. Keep questions concise and specific.

## Examples

### Selection Mode
Input:
\`\`\`
translate to French

<editor_selection path="notes/readme.md">
Hello world
</editor_selection>
\`\`\`

CORRECT (replacement):
<replacement>Bonjour le monde</replacement>

Input:
\`\`\`
what does this do?

<editor_selection path="notes/code.md">
const x = arr.reduce((a, b) => a + b, 0);
</editor_selection>
\`\`\`

CORRECT (question - no tags):
This code sums all numbers in the array \`arr\`. It uses \`reduce\` to iterate through the array, accumulating the total starting from 0.

### Cursor Mode

Input:
\`\`\`
what animal?

<editor_cursor path="notes/draft.md">
The quick brown | jumps over the lazy dog. #inline
</editor_cursor>
\`\`\`

CORRECT (insertion):
<insertion>fox</insertion>

### Q&A
Input:
\`\`\`
add a brief description section

<editor_cursor path="notes/readme.md">
# Introduction
This is my project.
| #inbetween
## Features
</editor_cursor>
\`\`\`

CORRECT (insertion):
<insertion>
## Description

This project provides tools for managing your notes efficiently.
</insertion>

Input:
\`\`\`
translate to Spanish

<editor_selection path="notes/draft.md">
The bank was steep.
</editor_selection>
\`\`\`

CORRECT (asking for clarification):
"Bank" can mean a financial institution (banco) or a river bank (orilla). Which meaning should I use?

Then after user clarifies "river bank":
<replacement>La orilla era empinada.</replacement>`;
}

function buildDryInlineEditText(request, continuationMessage) {
	const req = request && typeof request === 'object' ? request : {};
	const instruction = String(continuationMessage || req.instruction || '').trim();
	const contextFiles = Array.isArray(req.contextFiles) ? req.contextFiles.map(String).filter(Boolean) : [];
	const contextLine = contextFiles.length ? `Context files: ${contextFiles.join(', ')}` : '';
	if (!continuationMessage && /clarify/i.test(instruction)) {
		return 'What tone, audience, or constraint should I apply to this inline edit?';
	}
	if (req.mode === 'cursor') {
		const text = [
			'Provider-backed insertion draft.',
			`Instruction: ${instruction || 'Insert helpful content.'}`,
			contextLine,
			'This result came through the inline edit runtime IPC.',
		].filter(Boolean).join('\n');
		return `<insertion>${text}</insertion>`;
	}
	const selected = String(req.selectedText || '').trim();
	const text = selected
		? `${selected}\n\nProvider edit note: ${instruction || 'Refine this selection'}.`
		: `Provider edit note: ${instruction || 'Refine this selection'}.`;
	return `<replacement>${[text, contextLine].filter(Boolean).join('\n')}</replacement>`;
}

function getClaudeToolInput(input) {
	if (!input || typeof input !== 'object') {
		return {};
	}
	return input;
}

function extractClaudeToolResultContent(content) {
	if (typeof content === 'string') {
		return content;
	}
	if (content === undefined || content === null) {
		return '';
	}
	if (Array.isArray(content)) {
		const textParts = content
			.filter((block) => block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string')
			.map((block) => block.text);
		if (textParts.length > 0) {
			return textParts.join('\n');
		}
		if (content.length === 0) {
			return '';
		}
	}
	try {
		return JSON.stringify(content, null, 2);
	}
	catch {
		return String(content || '');
	}
}

function joinCodexTargetPath(settings, ...parts) {
	const useWsl = settings?.codexInstallationMethod === 'wsl' && process.platform === 'win32';
	return useWsl
		? path.posix.join(...parts.map((part) => String(part || '').replace(/\\/g, '/')))
		: path.join(...parts);
}

function resolveCodexTargetWorkspace(settings) {
	const workspace = String(settings?.workspace || process.cwd()).trim();
	return mapCodexHostPathToTarget(settings, workspace) || workspace;
}

function mapRequiredCodexHostPathsToTarget(settings, hostPaths, label) {
	return normalizePathList(hostPaths).map((hostPath) => {
		const targetPath = mapCodexHostPathToTarget(settings, hostPath);
		if (!targetPath) {
			throw new Error(`Codex cannot access ${label} from the selected target: ${hostPath}`);
		}
		return targetPath;
	});
}

function resolveCodexMemoriesDirTarget(settings) {
	const codexHome = String(buildCodexEnvOverrides(settings || {}).CODEX_HOME || '').trim();
	if (codexHome) {
		const targetHome = mapCodexHostPathToTarget(settings, codexHome);
		return targetHome ? joinCodexTargetPath(settings, targetHome, 'memories') : null;
	}
	const useWsl = settings?.codexInstallationMethod === 'wsl' && process.platform === 'win32';
	return useWsl ? null : path.join(os.homedir(), '.codex', 'memories');
}

function buildCodexWritableRoots(settings, options = {}) {
	const useWsl = settings?.codexInstallationMethod === 'wsl' && process.platform === 'win32';
	const mappedExternalContextPaths = mapRequiredCodexHostPathsToTarget(
		settings,
		options.externalContextPaths || [],
		'external context path',
	);
	const tempRoots = [
		os.tmpdir(),
		process.env.TMPDIR,
		...(Array.isArray(options.tempDirs) ? options.tempDirs : []),
	].map((entry) => mapCodexHostPathToTarget(settings, entry)).filter(Boolean);
	const roots = [
		resolveCodexTargetWorkspace(settings),
		...mappedExternalContextPaths,
		resolveCodexMemoriesDirTarget(settings),
		...tempRoots,
		useWsl ? '/tmp' : null,
	].map((entry) => String(entry || '').trim()).filter(Boolean);
	return [...new Set(roots)];
}

function resolveSandboxConfig(settings, options = {}) {
	if (settings.permissionMode === 'yolo') {
		return {
			approvalPolicy: 'never',
			sandbox: 'danger-full-access',
			sandboxPolicy: { type: 'dangerFullAccess' },
		};
	}
	if (settings.sandbox === 'read-only') {
		return {
			approvalPolicy: 'on-request',
			sandbox: 'read-only',
			sandboxPolicy: {
				type: 'readOnly',
				access: { type: 'fullAccess' },
				networkAccess: false,
			},
		};
	}
	return {
		approvalPolicy: 'on-request',
		sandbox: 'workspace-write',
			sandboxPolicy: {
				type: 'workspaceWrite',
				writableRoots: buildCodexWritableRoots(settings, options),
				readOnlyAccess: { type: 'fullAccess' },
				networkAccess: false,
				excludeTmpdirEnvVar: false,
			excludeSlashTmp: false,
		},
	};
}

function getItemId(item) {
	return item && typeof item.id === 'string' ? item.id : '';
}

function isCodexContextCompactionItem(item) {
	const type = String(item?.type || item?.kind || '').trim();
	return type === 'contextCompaction'
		|| type === 'context_compaction'
		|| type === 'context_compacted'
		|| type === 'compaction';
}

function toTextInput(text) {
	return [{ type: 'text', text: String(text || '') }];
}

function isCompactCommand(text) {
	return /^\/compact(\s|$)/i.test(String(text || '').trim());
}

function extractHistoryTextFromBlocks(blocks) {
	const parts = [];
	for (const block of Array.isArray(blocks) ? blocks : []) {
		if (!block || typeof block !== 'object') continue;
		if (block.type === 'text' && typeof block.content === 'string') {
			parts.push(block.content);
		}
	}
	return parts.map((part) => String(part || '').trim()).filter(Boolean).join('\n\n');
}

function extractHistoryMessageText(message) {
	if (!message || typeof message !== 'object') {
		return '';
	}
	for (const key of ['displayContent', 'content']) {
		const value = message[key];
		if (typeof value === 'string' && value.trim()) {
			return value.trim();
		}
	}
	return extractHistoryTextFromBlocks(message.contentBlocks);
}

function formatHistoryToolInput(input, maxLength = 200) {
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		return '';
	}
	const parts = [];
	for (const [key, value] of Object.entries(input)) {
		if (value === undefined || value === null) continue;
		let valueText = '';
		if (typeof value === 'string') {
			valueText = value.length > 100 ? `${value.slice(0, 100)}...` : value;
		}
		else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
			valueText = String(value);
		}
		else if (typeof value === 'object') {
			valueText = '[object]';
		}
		else {
			valueText = `[${typeof value}]`;
		}
		parts.push(`${key}=${valueText}`);
	}
	const result = parts.join(', ');
	return result.length > maxLength ? `${result.slice(0, maxLength)}...` : result;
}

function truncateHistoryToolResult(result, maxLength = 500) {
	const text = String(result || '');
	if (text.length <= maxLength) {
		return text;
	}
	return `${text.slice(0, maxLength)}... (truncated)`;
}

function formatHistoryToolCall(toolCall) {
	if (!toolCall || typeof toolCall !== 'object') {
		return '';
	}
	const name = String(toolCall.name || 'Tool').trim();
	const status = String(toolCall.status || 'completed');
	const inputText = formatHistoryToolInput(toolCall.input);
	const inputPart = inputText ? ` input: ${inputText}` : '';
	const base = `[Tool ${name}${inputPart} status=${status}]`;
	const failed = status === 'error' || status === 'blocked' || toolCall.isError === true;
	if (!failed || typeof toolCall.result !== 'string' || !toolCall.result.trim()) {
		return base;
	}
	return `${base} error: ${truncateHistoryToolResult(toolCall.result)}`;
}

function formatHistoryThinkingBlocks(blocks) {
	const thinkingBlocks = (Array.isArray(blocks) ? blocks : []).filter((block) => block?.type === 'thinking');
	if (thinkingBlocks.length === 0) {
		return [];
	}
	const totalDuration = thinkingBlocks.reduce((sum, block) => {
		const duration = Number(block?.durationSeconds || 0);
		return Number.isFinite(duration) ? sum + duration : sum;
	}, 0);
	const durationPart = totalDuration > 0 ? `, ${totalDuration.toFixed(1)}s total` : '';
	return [`[Thinking: ${thinkingBlocks.length} block(s)${durationPart}]`];
}

function formatHistoryAnnotations(blocks) {
	const annotations = formatHistoryThinkingBlocks(blocks);
	for (const block of Array.isArray(blocks) ? blocks : []) {
		if (!block || typeof block !== 'object') continue;
		if (block.type === 'context_compacted') {
			annotations.push('[Context compacted]');
		}
	}
	return annotations;
}

function formatHistoryCurrentNote(message) {
	const note = String(message?.currentNote || '').trim();
	return note ? `<linked_note>\n${note}\n</linked_note>` : '';
}

function buildHistoryContext(messages) {
	const parts = [];
	for (const message of Array.isArray(messages) ? messages : []) {
		if (!message || typeof message !== 'object') continue;
		if (message.role !== 'user' && message.role !== 'assistant') continue;
		if (message.isInterrupt) continue;

		const text = extractHistoryMessageText(message);
		const currentNoteLine = formatHistoryCurrentNote(message);
		const content = currentNoteLine
			? (text ? `${currentNoteLine}\n\n${text}` : currentNoteLine)
			: text;
		const toolLines = message.role === 'assistant'
			? (Array.isArray(message.toolCalls) ? message.toolCalls : []).map(formatHistoryToolCall).filter(Boolean)
			: [];
		const annotationLines = message.role === 'assistant' ? formatHistoryAnnotations(message.contentBlocks) : [];
		if (!content && toolLines.length === 0 && annotationLines.length === 0) {
			continue;
		}

		const role = message.role === 'user' ? 'User' : 'Assistant';
		const lines = [content ? `${role}: ${content}` : `${role}:`];
		if (annotationLines.length > 0) {
			lines.push(...annotationLines);
		}
		if (toolLines.length > 0) {
			lines.push(...toolLines);
		}
		parts.push(lines.join('\n'));
	}
	return parts.join('\n\n');
}

function buildClaudeHistoryContext(messages) {
	return buildHistoryContext(messages);
}

function stripClaudeNoteContext(prompt) {
	const text = String(prompt || '');
	const notePattern = '(linked_note|current_note)';
	const prefix = new RegExp(`^<${notePattern}>\\n[\\s\\S]*?<\\/\\1>\\n\\n`);
	const suffix = new RegExp(`\\n\\n<${notePattern}>\\n[\\s\\S]*?<\\/\\1>$`);
	const strippedPrefix = text.replace(prefix, '');
	return strippedPrefix !== text ? strippedPrefix : text.replace(suffix, '');
}

function extractClaudeUserQuery(prompt) {
	const text = String(prompt || '');
	const displayContent = claudeUserDisplayContent(text);
	if (displayContent !== undefined) {
		return displayContent;
	}
	return text
		.replace(/<(linked_note|current_note)>[\s\S]*?<\/\1>\s*/g, '')
		.replace(/<editor_selection[\s\S]*?<\/editor_selection>\s*/g, '')
		.replace(/<editor_cursor[\s\S]*?<\/editor_cursor>\s*/g, '')
		.replace(/<context_files>[\s\S]*?<\/context_files>\s*/g, '')
		.replace(/<canvas_selection[\s\S]*?<\/canvas_selection>\s*/g, '')
		.replace(/<browser_selection[\s\S]*?<\/browser_selection>\s*/g, '')
		.trim();
}

function getLastHistoryUserMessage(messages) {
	for (let index = (Array.isArray(messages) ? messages.length : 0) - 1; index >= 0; index -= 1) {
		if (messages[index]?.role === 'user') {
			return messages[index];
		}
	}
	return null;
}

function buildClaudePromptWithHistoryContext(historyContext, prompt, actualPrompt = prompt, conversationHistory = []) {
	const history = String(historyContext || '').trim();
	if (!history) {
		return prompt;
	}
	const lastUserMessage = getLastHistoryUserMessage(conversationHistory);
	const lastUserQuery = lastUserMessage
		? (String(lastUserMessage.displayContent || '').trim() || extractClaudeUserQuery(lastUserMessage.content || ''))
		: '';
	const currentUserQuery = extractClaudeUserQuery(actualPrompt);
	const shouldAppendPrompt = !lastUserMessage || lastUserQuery.trim() !== currentUserQuery.trim();
	return shouldAppendPrompt ? `${history}\n\nUser: ${prompt}` : history;
}

function getHistoryCheckpointIds(message) {
	if (!message || typeof message !== 'object') {
		return [];
	}
	return [message.assistantMessageId, message.runtimeTurnId, message.id]
		.map((value) => String(value || '').trim())
		.filter(Boolean);
}

function buildCodexForkReplayPrompt(prompt, conversationHistory, fork) {
	const checkpoint = String(fork?.resumeAt || '').trim();
	if (!checkpoint || isCompactCommand(prompt)) {
		return prompt;
	}
	const messages = Array.isArray(conversationHistory) ? conversationHistory : [];
	const checkpointIndex = messages.findIndex((message) => (
		message?.role === 'assistant' && getHistoryCheckpointIds(message).includes(checkpoint)
	));
	if (checkpointIndex < 0 || checkpointIndex >= messages.length - 1) {
		return prompt;
	}
	const replayContext = buildHistoryContext(messages.slice(checkpointIndex + 1));
	return replayContext.trim() ? `${replayContext}\n\nUser: ${prompt}` : prompt;
}

function makeDryRunThreadId(provider, sessionKey, fork) {
	const suffix = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
	return `dry-${provider}${fork ? '-fork' : ''}-${sessionKey}-${suffix}`;
}

function escapeXmlAttribute(value) {
	return String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function escapeBrowserSelectionBody(value) {
	return String(value || '').replace(/<\/browser_selection>/gi, '&lt;/browser_selection&gt;');
}

function normalizeEditorSelectionContext(value) {
	if (!isRecord(value)) {
		return null;
	}
	const notePath = String(value.notePath || value.path || '').trim();
	const selectedText = String(value.selectedText || value.text || '').trim();
	const cursorContext = isRecord(value.cursorContext) ? {
		beforeCursor: String(value.cursorContext.beforeCursor || ''),
		afterCursor: String(value.cursorContext.afterCursor || ''),
		isInbetween: value.cursorContext.isInbetween === true,
		line: Number.isFinite(Number(value.cursorContext.line)) ? Number(value.cursorContext.line) : 0,
		column: Number.isFinite(Number(value.cursorContext.column)) ? Number(value.cursorContext.column) : 0,
	} : null;
	const mode = value.mode === 'cursor' && cursorContext
		? 'cursor'
		: selectedText ? 'selection' : 'none';
	if (mode === 'none') {
		return null;
	}
	return {
		notePath: notePath || 'unknown',
		mode,
		selectedText,
		cursorContext,
		lineCount: Number.isFinite(Number(value.lineCount)) ? Number(value.lineCount) : selectedText.split(/\r?\n/).length,
		startLine: Number.isFinite(Number(value.startLine)) ? Number(value.startLine) : 0,
	};
}

function normalizeBrowserSelectionContext(value) {
	if (!isRecord(value)) {
		return null;
	}
	const selectedText = String(value.selectedText || value.text || '').trim();
	if (!selectedText) {
		return null;
	}
	const source = String(value.source || (value.url ? `browser:${value.url}` : 'browser:unknown')).trim();
	return {
		source: source || 'browser:unknown',
		selectedText,
		title: String(value.title || '').trim(),
		url: String(value.url || '').trim(),
	};
}

function normalizeCanvasSelectionContext(value) {
	if (!isRecord(value)) {
		return null;
	}
	const canvasPath = String(value.canvasPath || value.path || '').trim();
	const nodeIds = (Array.isArray(value.nodeIds) ? value.nodeIds : [])
		.map((id) => String(id || '').trim())
		.filter(Boolean);
	if (!canvasPath || nodeIds.length === 0) {
		return null;
	}
	return { canvasPath, nodeIds };
}

function normalizeTurnContext(payload = {}) {
	const source = isRecord(payload.context) ? { ...payload.context, ...payload } : payload;
	const currentNotePath = String(source.currentNotePath || source.linkedNotePath || '').trim();
	return {
		currentNotePath,
		editorSelection: normalizeEditorSelectionContext(source.editorSelection),
		browserSelection: normalizeBrowserSelectionContext(source.browserSelection),
		canvasSelection: normalizeCanvasSelectionContext(source.canvasSelection),
	};
}

function formatClaudeEditorContext(context) {
	if (!context) {
		return '';
	}
	if (context.mode === 'selection' && context.selectedText) {
		const lineAttr = context.startLine && context.lineCount
			? ` lines="${context.startLine}-${context.startLine + context.lineCount - 1}"`
			: '';
		return `<editor_selection path="${escapeXmlAttribute(context.notePath)}"${lineAttr}>\n${context.selectedText}\n</editor_selection>`;
	}
	if (context.mode === 'cursor' && context.cursorContext) {
		const ctx = context.cursorContext;
		const content = ctx.isInbetween
			? [ctx.beforeCursor, '| #inbetween', ctx.afterCursor].filter((part) => part !== '').join('\n')
			: `${ctx.beforeCursor}|${ctx.afterCursor} #inline`;
		return `<editor_cursor path="${escapeXmlAttribute(context.notePath)}">\n${content}\n</editor_cursor>`;
	}
	return '';
}

function formatClaudeBrowserContext(context) {
	if (!context) {
		return '';
	}
	const attrs = [`source="${escapeXmlAttribute(context.source || 'browser:unknown')}"`];
	if (context.title) {
		attrs.push(`title="${escapeXmlAttribute(context.title)}"`);
	}
	if (context.url) {
		attrs.push(`url="${escapeXmlAttribute(context.url)}"`);
	}
	return `<browser_selection ${attrs.join(' ')}>\n${escapeBrowserSelectionBody(context.selectedText)}\n</browser_selection>`;
}

function appendProviderTurnContext(provider, text, payload = {}) {
	const rawText = String(text || '');
	if (isCompactCommand(rawText)) {
		return rawText;
	}
	const context = normalizeTurnContext(payload);
	const sections = [];
	if (provider === 'claude') {
		if (context.currentNotePath) {
			sections.push(`<linked_note>\n${context.currentNotePath}\n</linked_note>`);
		}
		const editor = formatClaudeEditorContext(context.editorSelection);
		if (editor) {
			sections.push(editor);
		}
		const browser = formatClaudeBrowserContext(context.browserSelection);
		if (browser) {
			sections.push(browser);
		}
		if (context.canvasSelection) {
			sections.push(`<canvas_selection path="${escapeXmlAttribute(context.canvasSelection.canvasPath)}">\n${context.canvasSelection.nodeIds.join(', ')}\n</canvas_selection>`);
		}
		return sections.length ? `${rawText}\n\n${sections.join('\n\n')}` : rawText;
	}
	if (provider === 'codex') {
		if (context.currentNotePath) {
			sections.push(`\n[Current note: ${context.currentNotePath}]`);
		}
		if (context.editorSelection?.selectedText) {
			sections.push(`\n[Editor selection from ${context.editorSelection.notePath || 'current note'}:\n${context.editorSelection.selectedText}\n]`);
		}
		if (context.browserSelection?.selectedText) {
			sections.push(`\n[Browser selection from ${context.browserSelection.url || 'unknown page'}:\n${context.browserSelection.selectedText}\n]`);
		}
		if (context.canvasSelection?.nodeIds?.length) {
			sections.push(`\n[Canvas selection from ${context.canvasSelection.canvasPath}:\n${context.canvasSelection.nodeIds.join(', ')}\n]`);
		}
		return sections.length ? `${rawText}${sections.join('')}` : rawText;
	}
	return rawText;
}

const CODEX_SKILL_SCOPE_PRIORITY = {
	repo: 0,
	user: 1,
	system: 2,
	admin: 3,
};
const CODEX_RUNTIME_SKILL_LIST_TTL_MS = 5000;
const CLAUDE_RUNTIME_COMMAND_LIST_TTL_MS = 5000;

function extractExplicitCodexSkillNames(text) {
	const names = [];
	const seen = new Set();
	for (const match of String(text || '').matchAll(/(^|\s)\$([A-Za-z0-9_-]+)/g)) {
		const name = match[2];
		if (!name) {
			continue;
		}
		const normalized = name.toLowerCase();
		if (seen.has(normalized)) {
			continue;
		}
		seen.add(normalized);
		names.push(name);
	}
	return names;
}

function compareCodexSkillPriority(left, right) {
	const leftScope = CODEX_SKILL_SCOPE_PRIORITY[left?.runtimeScope || left?.scope] ?? 99;
	const rightScope = CODEX_SKILL_SCOPE_PRIORITY[right?.runtimeScope || right?.scope] ?? 99;
	if (leftScope !== rightScope) {
		return leftScope - rightScope;
	}
	const nameDelta = String(left?.name || '').localeCompare(String(right?.name || ''));
	if (nameDelta !== 0) {
		return nameDelta;
	}
	return String(left?.path || '').localeCompare(String(right?.path || ''));
}

function findPreferredCodexSkillByName(skills, name) {
	const normalized = String(name || '').toLowerCase();
	const candidates = (Array.isArray(skills) ? skills : [])
		.filter((skill) => skill?.enabled === true && String(skill?.name || '').toLowerCase() === normalized)
		.sort(compareCodexSkillPriority);
	return candidates[0] || null;
}

function toAttachmentFilename(image, index) {
	const name = String(image?.name || '').trim().replace(/[^A-Za-z0-9._-]/g, '_') || `image-${index + 1}`;
	if (name.includes('.')) {
		return name;
	}
	const subtype = String(image?.mediaType || 'image/png').split('/')[1] || 'png';
	return `${name}.${subtype === 'jpeg' ? 'jpg' : subtype}`;
}

function cleanupTempDir(tempDir) {
	if (!tempDir) {
		return;
	}
	const resolvedTempDir = path.resolve(String(tempDir));
	const systemTempDir = path.resolve(os.tmpdir());
	const baseName = path.basename(resolvedTempDir);
	if (
		!isPathInsideOrSamePath(resolvedTempDir, systemTempDir)
		|| !/^claudian-(claude-mcp|codex-images)-/u.test(baseName)
	) {
		return;
	}
	try {
		fs.rmSync(resolvedTempDir, { recursive: true, force: true });
	}
	catch {
		// Best-effort cleanup only.
	}
}

function mapCodexHostPathToTarget(settings, hostPath) {
	if (!hostPath) {
		return null;
	}
	const useWsl = settings?.codexInstallationMethod === 'wsl' && process.platform === 'win32';
	if (!useWsl) {
		return hostPath;
	}
	return mapHostPathToWsl(hostPath, settings.codexWslDistroOverride || '') || null;
}

function mapCodexTargetPathToHost(settings, targetPath) {
	if (!targetPath) {
		return null;
	}
	const useWsl = settings?.codexInstallationMethod === 'wsl' && process.platform === 'win32';
	if (!useWsl) {
		return targetPath;
	}
	return mapWslToWindowsDrive(targetPath)
		|| mapWslToUnc(targetPath, settings.codexWslDistroOverride || '')
		|| null;
}

function buildCodexInput(text, images, skills, options = {}) {
	const input = [];
	let tempDir = null;
	const mapPath = typeof options.mapPath === 'function' ? options.mapPath : (filePath) => filePath;
	try {
		const usableImages = Array.isArray(images) ? images : [];
		if (usableImages.length) {
			tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claudian-codex-images-'));
			usableImages.forEach((image, index) => {
				if (!String(image?.mediaType || '').startsWith('image/') || !image?.data) {
					return;
				}
				const filePath = path.join(tempDir, `${index + 1}-${toAttachmentFilename(image, index)}`);
				fs.writeFileSync(filePath, Buffer.from(String(image.data || ''), 'base64'));
				const targetFilePath = mapPath(filePath);
				if (!targetFilePath) {
					throw new Error(`Codex cannot access image attachment path from the selected target: ${filePath}`);
				}
				input.push({ type: 'localImage', path: targetFilePath });
			});
		}
		if (text) {
			input.push({ type: 'text', text, text_elements: [] });
		}
		if (Array.isArray(skills) && skills.length > 0) {
			input.push(...skills);
		}
		return { input, tempDir };
	}
	catch (error) {
		cleanupTempDir(tempDir);
		throw error;
	}
}

function normalizeClaudeImageMediaType(mediaType) {
	const value = String(mediaType || 'image/png').trim().toLowerCase();
	if (value === 'image/jpg') {
		return 'image/jpeg';
	}
	if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(value)) {
		return value;
	}
	return 'image/png';
}

function buildClaudeUserContentBlocks(prompt, images) {
	const content = [];
	for (const image of Array.isArray(images) ? images : []) {
		if (!String(image?.mediaType || '').startsWith('image/') || !image?.data) {
			continue;
		}
		content.push({
			type: 'image',
			source: {
				type: 'base64',
				media_type: normalizeClaudeImageMediaType(image.mediaType),
				data: String(image.data || ''),
			},
		});
	}
	const text = String(prompt || '');
	if (text.trim()) {
		content.push({ type: 'text', text });
	}
	return content;
}

function buildClaudeStreamJsonUserMessage(prompt, images) {
	const content = buildClaudeUserContentBlocks(prompt, images);
	const hasImage = content.some((block) => block.type === 'image');
	if (!hasImage) {
		return null;
	}
	return {
		type: 'user',
		message: {
			role: 'user',
			content,
		},
		parent_tool_use_id: null,
		uuid: randomUUID(),
	};
}

function buildClaudeSdkPromptInput(prompt, images, sessionId = '') {
	const content = buildClaudeUserContentBlocks(prompt, images);
	const hasImage = content.some((block) => block.type === 'image');
	if (!hasImage) {
		return String(prompt || '');
	}
	async function* messageGenerator() {
		yield {
			type: 'user',
			message: {
				role: 'user',
				content,
			},
			parent_tool_use_id: null,
			session_id: sessionId || '',
			uuid: randomUUID(),
		};
	}
	return messageGenerator();
}

function resolveClaudeSdkSettingSources(settings) {
	return resolveClaudeSettingSources(settings).split(',');
}

function buildClaudeSdkExtraArgs(settings) {
	const extraArgs = {};
	if (settings.claudeSafeMode === 'auto') {
		extraArgs['enable-auto-mode'] = null;
	}
	if (settings.claudeEnableChrome) {
		extraArgs.chrome = null;
	}
	if (settings.systemPrompt) {
		extraArgs['append-system-prompt'] = settings.systemPrompt;
	}
	return extraArgs;
}

function buildClaudeSdkQueryOptions(settings, launch, payload, canUseTool, abortController) {
	const activeMcp = launch.activeMcp || {};
	const mcpServers = isRecord(activeMcp.mcpServers) ? activeMcp.mcpServers : {};
	const effort = resolveClaudeEffort(payload.effort || settings.effort, {
		model: launch.model,
		settings,
	});
	const options = {
		cwd: launch.workspace,
		pathToClaudeCodeExecutable: launch.command,
		env: launch.env,
		model: launch.model,
		permissionMode: resolveClaudeSdkPermissionMode(settings),
		allowDangerouslySkipPermissions: settings.permissionMode === 'yolo',
		canUseTool,
		includePartialMessages: true,
		settingSources: resolveClaudeSdkSettingSources(settings),
		extraArgs: buildClaudeSdkExtraArgs(settings),
	};
	if (effort) options.effort = effort;
	if (abortController) {
		options.abortController = abortController;
	}
	if (Array.isArray(launch.disallowedTools) && launch.disallowedTools.length > 0) {
		options.disallowedTools = launch.disallowedTools;
	}
	if (Array.isArray(launch.allowedTools) && launch.allowedTools.length > 0) {
		options.allowedTools = launch.allowedTools;
	}
	if (Object.keys(mcpServers).length > 0) {
		options.mcpServers = mcpServers;
		options.strictMcpConfig = true;
	}
	const externalContextPaths = normalizePathList(payload.externalContextPaths);
	if (externalContextPaths.length > 0) {
		options.additionalDirectories = externalContextPaths;
	}
	if (launch.fork?.sourceThreadId) {
		options.resume = launch.fork.sourceThreadId;
		options.forkSession = true;
		if (launch.fork.resumeAt) {
			options.resumeSessionAt = launch.fork.resumeAt;
		}
	}
	else if (launch.existingThreadId) {
		options.resume = launch.existingThreadId;
		if (launch.resumeAt) {
			options.resumeSessionAt = launch.resumeAt;
		}
	}
	return options;
}

function getClaudeActionPattern(toolName, input) {
	const name = String(toolName || '');
	const data = isRecord(input) ? input : {};
	if (name === 'Bash') {
		return typeof data.command === 'string' ? data.command.trim() : '';
	}
	if (name === 'Read' || name === 'Write' || name === 'Edit' || name === 'MultiEdit') {
		return typeof data.file_path === 'string' && data.file_path ? data.file_path : null;
	}
	if (name === 'NotebookEdit') {
		if (typeof data.notebook_path === 'string' && data.notebook_path) {
			return data.notebook_path;
		}
		return typeof data.file_path === 'string' && data.file_path ? data.file_path : null;
	}
	if (name === 'Glob' || name === 'Grep') {
		return typeof data.pattern === 'string' && data.pattern ? data.pattern : null;
	}
	try {
		return JSON.stringify(data);
	}
	catch {
		return '';
	}
}

function getClaudeActionDescription(toolName, input) {
	const name = String(toolName || 'Tool');
	const pattern = getClaudeActionPattern(name, input) ?? '(unknown)';
	if (name === 'Bash') return `Run command: ${pattern}`;
	if (name === 'Read') return `Read file: ${pattern}`;
	if (name === 'Write') return `Write to file: ${pattern}`;
	if (name === 'Edit' || name === 'MultiEdit') return `Edit file: ${pattern}`;
	if (name === 'Glob') return `Search files matching: ${pattern}`;
	if (name === 'Grep') return `Search content matching: ${pattern}`;
	return `${name}: ${pattern}`;
}

function buildClaudePermissionUpdates(toolName, input, decision, suggestions) {
	const destination = decision === 'allow-always' ? 'projectSettings' : 'session';
	const processed = [];
	let hasRuleUpdate = false;
	for (const suggestion of Array.isArray(suggestions) ? suggestions : []) {
		if (!isRecord(suggestion)) {
			continue;
		}
		if (suggestion.type === 'addRules' || suggestion.type === 'replaceRules') {
			hasRuleUpdate = true;
			processed.push({ ...suggestion, behavior: 'allow', destination });
		}
		else {
			processed.push(suggestion);
		}
	}
	if (!hasRuleUpdate) {
		const pattern = getClaudeActionPattern(toolName, input);
		const ruleValue = { toolName };
		if (pattern && !String(pattern).startsWith('{')) {
			ruleValue.ruleContent = pattern;
		}
		processed.unshift({
			type: 'addRules',
			behavior: 'allow',
			rules: [ruleValue],
			destination,
		});
	}
	return processed;
}

function resolveClaudeSdkPermissionMode(settings) {
	if (settings?.permissionMode === 'yolo') {
		return 'bypassPermissions';
	}
	if (settings?.permissionMode === 'plan') {
		return 'plan';
	}
	return settings?.claudeSafeMode || 'acceptEdits';
}

function normalizeClaudeControlInput(value) {
	if (isRecord(value)) {
		return value;
	}
	const parsed = parseJsonish(value);
	return isRecord(parsed) ? parsed : {};
}

function getClaudeControlRequestId(message) {
	return String(message?.request_id || message?.requestId || message?.id || '').trim();
}

function normalizeClaudeQuestionOption(option) {
	if (isRecord(option)) {
		const value = option.value ?? option.label ?? option.text ?? option.id;
		return {
			label: String(option.label ?? option.text ?? value ?? 'Option'),
			value: String(value ?? option.label ?? option.text ?? 'option'),
			description: String(option.description || ''),
		};
	}
	return {
		label: String(option || 'Option'),
		value: String(option || 'option'),
		description: '',
	};
}

function normalizeClaudeElicitationQuestions(request) {
	const input = normalizeClaudeControlInput(request?.input);
	const sourceQuestions = Array.isArray(request?.questions)
		? request.questions
		: Array.isArray(input.questions)
			? input.questions
			: [];
	return sourceQuestions.map((question, index) => {
		const data = isRecord(question) ? question : {};
		const options = Array.isArray(data.options) && data.options.length > 0
			? data.options.map(normalizeClaudeQuestionOption)
			: [{ label: 'Continue', value: 'continue', description: '' }];
		return {
			id: String(data.id || data.key || `q${index + 1}`),
			header: String(data.header || data.label || `Q${index + 1}`),
			question: String(data.question || data.prompt || request?.prompt || request?.message || 'Claude needs more input.'),
			multiSelect: data.multiSelect === true || data.multiselect === true,
			isOther: data.isOther !== false,
			isSecret: data.isSecret === true,
			options,
		};
	});
}

function getClaudeToolIcon(toolName) {
	const name = String(toolName || '');
	if (name === 'Bash') return 'terminal';
	if (name === 'Read' || name === 'Write' || name === 'Edit' || name === 'MultiEdit' || name === 'NotebookEdit') return 'file';
	if (name === 'Glob' || name === 'Grep') return 'search';
	return 'terminal';
}

function getClaudeApprovalKind(toolName) {
	const name = String(toolName || '');
	if (name === 'Bash') return 'command';
	if (name === 'Write' || name === 'Edit' || name === 'MultiEdit' || name === 'NotebookEdit') return 'file_change';
	return 'permissions';
}

function readClaudePlanContent(input) {
	const data = isRecord(input) ? input : {};
	for (const key of ['plan', 'planContent', 'plan_content', 'content', 'text']) {
		if (typeof data[key] === 'string' && data[key].trim()) {
			return data[key].trim();
		}
	}
	const planFilePath = typeof data.planFilePath === 'string'
		? data.planFilePath
		: typeof data.plan_file_path === 'string'
			? data.plan_file_path
			: '';
	if (planFilePath && fs.existsSync(planFilePath)) {
		try {
			const content = String(readTextFileLimited(planFilePath, PROVIDER_ASSET_TEXT_MAX_BYTES) || '').trim();
			if (content) {
				return content;
			}
		}
		catch {
			return '';
		}
	}
	return '';
}

function getClaudePlanPermissions(input) {
	const data = isRecord(input) ? input : {};
	const allowedPrompts = Array.isArray(data.allowedPrompts)
		? data.allowedPrompts
		: Array.isArray(data.allowed_prompts)
			? data.allowed_prompts
			: [];
	return allowedPrompts
		.map((entry) => {
			if (isRecord(entry)) {
				return String(entry.prompt || entry.description || entry.tool || '').trim();
			}
			return String(entry || '').trim();
		})
		.filter(Boolean);
}

function getToolName(item) {
	if (!item || !item.type) {
		return 'tool';
	}
	if (item.type === 'commandExecution') {
		return 'Bash';
	}
	if (item.type === 'fileChange') {
		return 'apply_patch';
	}
	if (item.type === 'webSearch') {
		return 'WebSearch';
	}
	if (item.type === 'imageView') {
		return 'Read';
	}
	if (item.type === 'mcpToolCall') {
		return `mcp__${item.server || 'mcp'}__${item.tool || 'tool'}`;
	}
	if (item.type === 'collabAgentToolCall') {
		const map = {
			spawnAgent: 'spawn_agent',
			sendInput: 'send_input',
			wait: 'wait',
			waitAgent: 'wait_agent',
			resumeAgent: 'resume_agent',
			closeAgent: 'close_agent',
		};
		return map[item.tool] || item.tool || 'subagent';
	}
	return item.type;
}

function getToolInput(item) {
	if (!item || typeof item !== 'object') {
		return {};
	}
	if (item.type === 'commandExecution') {
		return {
			command: item.command || '',
			cwd: item.cwd || '',
			source: item.source || '',
		};
	}
	if (item.type === 'fileChange') {
		return {
			changes: item.changes || [],
			status: item.status || '',
		};
	}
	if (item.type === 'webSearch') {
		return normalizeCodexWebSearchInput(item);
	}
	if (item.type === 'imageView') {
		return {
			file_path: item.path || '',
		};
	}
	if (item.type === 'mcpToolCall') {
		return item.arguments || {};
	}
	if (item.type === 'collabAgentToolCall') {
		return item.arguments || {};
	}
	return { ...item };
}

function getToolResult(item) {
	if (!item || typeof item !== 'object') {
		return '';
	}
	if (item.type === 'commandExecution') {
		return item.aggregatedOutput || item.status || '';
	}
	if (item.type === 'fileChange') {
		return item.changes || [];
	}
	if (item.type === 'webSearch') {
		return 'Search complete';
	}
	if (item.type === 'imageView') {
		return item.path || '';
	}
	if (item.type === 'mcpToolCall') {
		if (item.error) {
			return item.error;
		}
		const content = Array.isArray(item.result?.content)
			? item.result.content.map((entry) => entry?.text || '').filter(Boolean).join('\n')
			: '';
		return content || (item.status === 'completed' ? 'Completed' : item.status || 'Failed');
	}
	if (item.type === 'collabAgentToolCall') {
		if (item.result && typeof item.result === 'object') {
			return JSON.stringify(item.result);
		}
		return item.status === 'completed' ? 'Completed' : item.status || 'Done';
	}
	return item;
}

function normalizeFileChangeKind(value) {
	if (typeof value === 'string' && value) {
		return { kind: value };
	}
	const record = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
	const kind = String(record.type || 'change');
	const movePath = String(record.move_path || record.movePath || '').trim();
	return { kind, ...(movePath ? { movePath } : {}) };
}

function normalizeFileChange(change) {
	if (!change || typeof change !== 'object' || Array.isArray(change) || !change.path) {
		return null;
	}
	const kind = normalizeFileChangeKind(change.kind ?? change.type);
	return {
		...change,
		path: String(change.path),
		kind: kind.kind,
		type: kind.kind,
		...(kind.movePath ? { movePath: kind.movePath } : {}),
		...(typeof change.diff === 'string' && change.diff.trim() ? { diff: change.diff } : {}),
	};
}

function normalizeFileChanges(changes) {
	return (Array.isArray(changes) ? changes : []).map(normalizeFileChange).filter(Boolean);
}

function fileChangeKey(change) {
	return `${String(change?.path || '')}\0${String(change?.movePath || '')}`;
}

function mergeFileChanges(previous, next) {
	const previousChanges = normalizeFileChanges(previous);
	const nextChanges = normalizeFileChanges(next);
	if (previousChanges.length === 0) return nextChanges;
	if (nextChanges.length === 0) return previousChanges;
	const merged = new Map(previousChanges.map((change) => [fileChangeKey(change), change]));
	for (const change of nextChanges) {
		const key = fileChangeKey(change);
		merged.set(key, { ...(merged.get(key) || {}), ...change });
	}
	return [...merged.values()];
}

function mergeApplyPatchInputs(previous, next) {
	if (!previous) {
		return next || {};
	}
	const patch = typeof next?.patch === 'string'
		? next.patch
		: typeof previous.patch === 'string'
			? previous.patch
			: '';
	const changes = mergeFileChanges(previous.changes, next?.changes);
	return {
		...previous,
		...(next || {}),
		...(patch ? { patch } : {}),
		...(changes.length ? { changes } : {}),
	};
}

function buildFileChangeInput(changes) {
	return { changes: normalizeFileChanges(changes) };
}

function fileChangeSummary(input) {
	const changes = normalizeFileChanges(input?.changes);
	return changes
		.map((change) => `${change.kind || change.type || 'change'}: ${change.path}`)
		.filter(Boolean)
		.join(', ');
}

function normalizeCodexPlanStatus(status) {
	const value = String(status || 'pending');
	if (value === 'inProgress' || value === 'in_progress') {
		return 'in_progress';
	}
	return value;
}

function buildCodexPlanTodos(plan) {
	return (Array.isArray(plan) ? plan : []).map((item) => {
		const step = String(item?.step || item?.content || item?.title || '');
		return {
			id: String(item?.id || ''),
			content: step,
			activeForm: step,
			status: normalizeCodexPlanStatus(item?.status),
		};
	});
}

function normalizeCodexStringArray(value) {
	const seen = new Set();
	for (const entry of Array.isArray(value) ? value : []) {
		if (typeof entry !== 'string') continue;
		const trimmed = entry.trim();
		if (trimmed) seen.add(trimmed);
	}
	return [...seen];
}

function firstNonEmptyString(...values) {
	for (const value of values) {
		if (typeof value === 'string' && value.trim()) {
			return value.trim();
		}
	}
	return '';
}

function normalizeCodexWebSearchInput(input = {}) {
	const action = input.action && typeof input.action === 'object' && !Array.isArray(input.action) ? input.action : {};
	const queries = normalizeCodexStringArray(action.queries ?? input.queries);
	const query = firstNonEmptyString(action.query, input.query, queries[0]);
	const url = firstNonEmptyString(action.url, input.url);
	const pattern = firstNonEmptyString(action.pattern, input.pattern);
	const explicitType = firstNonEmptyString(action.type, input.actionType, input.action_type);
	const actionType = explicitType || (url && pattern ? 'find_in_page' : url ? 'open_page' : (query || queries.length > 0) ? 'search' : '');
	const normalized = {};
	if (actionType) normalized.actionType = actionType;
	if (query) normalized.query = query;
	if (queries.length) normalized.queries = queries;
	if (url) normalized.url = url;
	if (pattern) normalized.pattern = pattern;
	return normalized;
}

function normalizeCodexTokenUsage(params = {}) {
	const tokenUsage = params?.tokenUsage && typeof params.tokenUsage === 'object' ? params.tokenUsage : {};
	const last = tokenUsage.last && typeof tokenUsage.last === 'object' ? tokenUsage.last : tokenUsage;
	const inputTokens = Number(last.inputTokens ?? last.input_tokens ?? 0) || 0;
	const cacheReadInputTokens = Number(last.cachedInputTokens ?? last.cacheReadInputTokens ?? last.cached_input_tokens ?? 0) || 0;
	const contextWindow = Number(tokenUsage.modelContextWindow ?? tokenUsage.model_context_window ?? last.contextWindow ?? 0) || 0;
	const contextTokens = inputTokens;
	return {
		inputTokens,
		cacheCreationInputTokens: 0,
		cacheReadInputTokens,
		contextWindow,
		contextWindowIsAuthoritative: contextWindow > 0,
		contextTokens,
		percentage: contextWindow > 0 ? Math.min(100, Math.max(0, Math.round((contextTokens / contextWindow) * 100))) : 0,
	};
}

function getContextWindowSize(model) {
	const value = String(model || '').trim().toLowerCase();
	return value.endsWith('[1m]') ? CONTEXT_WINDOW_1M : CONTEXT_WINDOW_STANDARD;
}

class CodexRpcTransport {
	constructor(proc) {
		this.proc = proc;
		this.nextId = 1;
		this.pending = new Map();
		this.notificationHandlers = new Map();
		this.requestHandlers = new Map();
		this.closed = false;
	}

	start() {
		this.lineReader = createDecodedLineReader(this.proc.stdout, (line) => this.handleLine(line));
		this.proc.once('error', (error) => {
			this.closed = true;
			this.lineReader?.close?.();
			this.rejectAll(error instanceof Error ? error : new Error(String(error)));
		});
		this.proc.once('exit', () => {
			this.closed = true;
			this.lineReader?.close?.();
			this.rejectAll(new Error('Codex app-server exited'));
		});
	}

	request(method, params, timeoutMs = 30000) {
		if (this.closed) {
			return Promise.reject(new Error('Codex transport is closed'));
		}
		const id = this.nextId++;
		const message = { jsonrpc: '2.0', id, method, params };
		return new Promise((resolve, reject) => {
			const timer = timeoutMs > 0
				? setTimeout(() => {
					this.pending.delete(id);
					reject(new Error(`Codex request timeout: ${method}`));
				}, timeoutMs)
				: null;
			this.pending.set(id, { resolve, reject, timer, method });
			this.sendRaw(message);
		});
	}

	notify(method, params) {
		const message = { jsonrpc: '2.0', method };
		if (params !== undefined) {
			message.params = params;
		}
		this.sendRaw(message);
	}

	onNotification(method, handler) {
		this.notificationHandlers.set(method, handler);
	}

	onRequest(method, handler) {
		this.requestHandlers.set(method, handler);
	}

	dispose() {
		this.closed = true;
		this.lineReader?.close?.();
		this.rejectAll(new Error('Codex transport disposed'));
	}

	sendRaw(message) {
		if (this.closed || !this.proc.stdin || this.proc.stdin.destroyed) {
			return;
		}
		try {
			this.proc.stdin.write(`${JSON.stringify(message)}\n`);
		}
		catch {
			// The timeout/exit paths will reject pending requests if the pipe is gone.
		}
	}

	handleLine(line) {
		let message;
		try {
			message = JSON.parse(line);
		}
		catch {
			return;
		}
		const id = message.id;
		const method = message.method;
		if (typeof id === 'number' && !method) {
			this.handleResponse(id, message);
			return;
		}
		if (method && id === undefined) {
			const handler = this.notificationHandlers.get(method);
			if (handler) {
				try {
					handler(message.params);
				}
				catch {
					// Ignore malformed runtime notifications; the transport must stay alive.
				}
			}
			return;
		}
		if (method && id !== undefined) {
			this.handleServerRequest(id, method, message.params);
		}
	}

	handleResponse(id, message) {
		const pending = this.pending.get(id);
		if (!pending) {
			return;
		}
		this.pending.delete(id);
		if (pending.timer) {
			clearTimeout(pending.timer);
		}
		if (message.error) {
			pending.reject(new Error(message.error.message || pending.method));
			return;
		}
		pending.resolve(message.result);
	}

	handleServerRequest(id, method, params) {
		const handler = this.requestHandlers.get(method);
		if (!handler) {
			this.sendRaw({
				jsonrpc: '2.0',
				id,
				error: { code: -32601, message: `Unhandled server request: ${method}` },
			});
			return;
		}
		Promise.resolve().then(() => handler(params, { id, method })).then(
			(result) => this.sendRaw({ jsonrpc: '2.0', id, result }),
			(error) => this.sendRaw({
				jsonrpc: '2.0',
				id,
				error: {
					code: -32603,
					message: error instanceof Error ? error.message : String(error),
				},
			}),
		);
	}

	rejectAll(error) {
		for (const pending of this.pending.values()) {
			if (pending.timer) {
				clearTimeout(pending.timer);
			}
			pending.reject(error);
		}
		this.pending.clear();
	}
}

function encodeCodexCommandApprovalDecision(decision) {
	return JSON.stringify(decision);
}

function decodeCodexCommandApprovalDecision(value) {
	try {
		const parsed = JSON.parse(String(value || ''));
		if (parsed === 'accept' || parsed === 'acceptForSession' || parsed === 'decline' || parsed === 'cancel') {
			return parsed;
		}
		if (isRecord(parsed?.acceptWithExecpolicyAmendment) || isRecord(parsed?.applyNetworkPolicyAmendment)) {
			return parsed;
		}
	}
	catch {
		// Non-JSON select options are treated as deny by the caller.
	}
	return null;
}

function normalizeCodexUserInputAnswerList(value) {
	if (isRecord(value) && Object.prototype.hasOwnProperty.call(value, 'answers')) {
		return normalizeCodexUserInputAnswerList(value.answers);
	}
	const rawItems = Array.isArray(value) ? value : [value];
	return rawItems
		.map((item) => (typeof item === 'string' ? item : item === undefined || item === null ? '' : String(item)))
		.map((item) => item.trim())
		.filter(Boolean);
}

function normalizeCodexUserInputAnswers(answers) {
	if (!isRecord(answers)) {
		return {};
	}
	const normalized = {};
	for (const [key, value] of Object.entries(answers)) {
		const questionKey = String(key || '').trim();
		if (!questionKey) {
			continue;
		}
		const answerList = normalizeCodexUserInputAnswerList(value);
		if (answerList.length > 0) {
			normalized[questionKey] = { answers: answerList };
		}
	}
	return normalized;
}

function buildCodexCommandApprovalDecisionOptions(params = {}) {
	const available = Array.isArray(params.availableDecisions) && params.availableDecisions.length > 0
		? params.availableDecisions
		: ['accept', 'acceptForSession', 'decline'];
	return available.map((decision) => mapCodexCommandApprovalDecisionOption(decision, params)).filter(Boolean);
}

function mapCodexCommandApprovalDecisionOption(decision, params = {}) {
	if (decision === 'accept') {
		return { label: 'Allow once', value: 'allow-once', decision: 'allow' };
	}
	if (decision === 'acceptForSession') {
		return { label: 'Always allow', value: 'allow-always', decision: 'allow-always' };
	}
	if (decision === 'decline') {
		return { label: 'Deny', value: 'deny', decision: 'deny' };
	}
	if (decision === 'cancel') {
		return { label: 'Cancel', value: 'cancel', decision: 'cancel' };
	}
	if (isRecord(decision?.acceptWithExecpolicyAmendment)) {
		return {
			label: 'Allow similar commands',
			description: 'Approve and store an exec policy amendment.',
			value: encodeCodexCommandApprovalDecision(decision),
		};
	}
	const networkAmendment = decision?.applyNetworkPolicyAmendment?.network_policy_amendment;
	if (isRecord(networkAmendment)) {
		const host = networkAmendment.host || params.networkApprovalContext?.host || 'host';
		const action = networkAmendment.action === 'deny' ? 'Deny' : 'Allow';
		return {
			label: `${action} ${host} for this session`,
			description: `Apply a ${networkAmendment.action === 'deny' ? 'deny' : 'allow'} rule for ${host}.`,
			value: encodeCodexCommandApprovalDecision(decision),
		};
	}
	return null;
}

class ClaudianSidebarRuntime {
	constructor({
		ipcMain,
		defaultWorkspace = process.cwd(),
		logger = console,
		dryRun = false,
		nativeHistoryHome = '',
		claudeAgentSdkLoader = loadClaudeAgentSdk,
		getMineruWorkspaceTrees = null,
		providerSkillRoot = '',
		getProviderSkillRoot = null,
		prepareMarkdownNoteAi = null,
		allowedEntryUrls = null,
	} = {}) {
		if (!ipcMain) {
			throw new Error('ipcMain is required');
		}
		this.ipcMain = ipcMain;
		this.allowedEntryUrls = allowedEntryUrls ? new Set(allowedEntryUrls.map(normalizeRuntimeIpcEntryUrl)) : RUNTIME_IPC_ENTRY_URLS;
		this.defaultWorkspace = defaultWorkspace;
		this.providerSkillRoot = String(providerSkillRoot || '').trim();
		this.getProviderSkillRoot = typeof getProviderSkillRoot === 'function' ? getProviderSkillRoot : null;
		this.logger = logger;
		this.settingsPath = getSettingsPath();
		this.settings = normalizeSettings(readJsonFile(this.settingsPath, {}), defaultWorkspace);
		const userDataDir = app?.getPath ? app.getPath('userData') : path.dirname(this.settingsPath);
		this.environmentManager = new EnvironmentManager(path.join(userDataDir, 'tools', 'environment'), fetch, {
			getSettings: () => this.settings,
			onInstalled: async ({ id, executable }) => {
				if (!['codex', 'claude'].includes(id)) return;
				if (this.currentTurnId || this.claudeSdkQuery) {
					throw new Error('CLI installed successfully. Stop the active AI turn and choose Download and use again to switch the runtime.');
				}
				await this.handleUpdateSettings({ sender: this.webContents }, { [`${id}Path`]: executable });
			},
		});
		this.nativeCliConfigurationFingerprint = getNativeCliConfigurationFingerprint();
		this.proc = null;
		this.claudeSdkQuery = null;
		this.claudeAbortController = null;
		this.transport = null;
		this.threadId = null;
		this.currentTurnId = null;
		this.activeSessionKey = null;
		this.spawnProcess = spawn;
		this.probeCodexCli = probeCodexCli;
		this.probeClaudeCli = probeClaudeCli;
		this.codexReasoningEffort = normalizeRuntimeEffort(this.settings.effort);
		this.claudeAgentSdkLoader = claudeAgentSdkLoader;
		this.getMineruWorkspaceTrees = typeof getMineruWorkspaceTrees === 'function' ? getMineruWorkspaceTrees : null;
		this.prepareMarkdownNoteAi = typeof prepareMarkdownNoteAi === 'function' ? prepareMarkdownNoteAi : null;
		this.webContents = null;
		this.pendingApprovals = new Map();
		this.pendingClaudeControlRequests = new Map();
		this.activeToolIds = new Set();
		this.registered = false;
		this.registeredIpcChannels = [];
		this.claudeStreamState = null;
		this.agentTextDeltaSeen = false;
		this.sawPlanDelta = false;
		this.currentPlanText = '';
		this.planUpdateCounter = 0;
		this.pendingClaudeFork = null;
		this.titleGenerations = new Map();
		this.instructionRefineSession = null;
		this.inlineEditSession = null;
		this.markdownNoteAiJobs = new Map();
		this.dryRun = !!dryRun;
		this.turnTempDirs = new Map();
		this.sessions = new Map();
		this.loadedThreadId = null;
		this.activeClaudeLaunch = null;
		this.nativeHistoryHome = nativeHistoryHome || '';
		this.pendingTurnNotifications = [];
		this.rawStartedCallIds = new Set();
		this.rawCompletedCallIds = new Set();
		this.rawToolNamesByCallId = new Map();
		this.rawToolInputsByCallId = new Map();
		this.runtimeModelAssets = {
			claudeRuntimeModels: [],
			codexRuntimeModels: [],
		};
		this.rawToolOutputsByCallId = new Map();
		this.suppressedRawCallIds = new Set();
		this.fileChangeInputsById = new Map();
		this.seenWebSearchIds = new Set();
		this.startedUserMessageIds = new Set();
		this.startedAgentMessageIds = new Set();
		this.agentMessageDeltaIds = new Set();
		this.streamedAssistantTurnText = '';
		this.currentAssistantSegmentText = '';
		this.codexRuntimeSkillCache = null;
		this.codexRuntimeSkillCacheExpiresAt = 0;
		this.codexRuntimeSkillPending = null;
		this.codexSkillForceReloadOnNextResolve = false;
		this.claudeRuntimeCommandCache = null;
		this.claudeRuntimeCommandCacheExpiresAt = 0;
		this.claudeRuntimeCommandPending = null;
		this.firstTurnCliPreflightKeys = new Set();
		this.cliInstallInProgress = null;
		this.codexVersionUpdateInProgress = null;
		this.stateSupplementTimers = new Set();
		this.stateSupplementGeneration = 0;
	}

	async refreshNativeCliConfiguration() {
		const fingerprint = getNativeCliConfigurationFingerprint();
		if (fingerprint === this.nativeCliConfigurationFingerprint) {
			return false;
		}
		if (this.currentTurnId || this.claudeSdkQuery || this.claudeAbortController) {
			return false;
		}
		this.nativeCliConfigurationFingerprint = fingerprint;
		const hasRuntime = Boolean(this.proc || this.transport || this.activeClaudeLaunch);
		if (hasRuntime) {
			await this.shutdown({ unregisterIpc: false });
		}
		this.clearProviderSessions('codex');
		this.clearProviderSessions('claude');
		this.runtimeModelAssets = {
			claudeRuntimeModels: [],
			codexRuntimeModels: [],
		};
		this.emit({ type: 'status', status: 'reloading', detail: 'Native CLI configuration changed' });
		return true;
	}

	register() {
		if (this.registered) {
			return this;
		}
		if (activeRuntimeIpcOwner && activeRuntimeIpcOwner !== this) {
			throw new Error('AI sidebar runtime IPC is already registered. Call shutdown() or unregister() before creating another runtime.');
		}
		const registrations = [
			[IPC.getState, (event) => this.handleGetState(event)],
			[IPC.getDiagnostics, (event) => this.handleGetDiagnostics(event)],
			[IPC.environment, (_event, payload) => this.handleEnvironment(payload)],
			[IPC.updateSettings, (event, payload) => this.handleUpdateSettings(event, payload)],
			[IPC.saveMcpServers, (event, payload) => this.handleSaveMcpServers(event, payload)],
			[IPC.testMcpServer, (event, payload) => this.handleTestMcpServer(event, payload)],
			[IPC.loadProviderAssets, (event, payload) => this.handleLoadProviderAssets(event, payload)],
			[IPC.saveProviderAssets, (event, payload) => this.handleSaveProviderAssets(event, payload)],
			[IPC.generateTitle, (event, payload) => this.handleGenerateTitle(event, payload)],
			[IPC.cancelTitleGeneration, (_event, payload) => this.handleCancelTitleGeneration(payload)],
			[IPC.startInstructionRefine, (event, payload) => this.handleStartInstructionRefine(event, payload)],
			[IPC.continueInstructionRefine, (event, payload) => this.handleContinueInstructionRefine(event, payload)],
			[IPC.cancelInstructionRefine, () => this.handleCancelInstructionRefine()],
			[IPC.startInlineEdit, (event, payload) => this.handleStartInlineEdit(event, payload)],
			[IPC.continueInlineEdit, (event, payload) => this.handleContinueInlineEdit(event, payload)],
			[IPC.cancelInlineEdit, () => this.handleCancelInlineEdit()],
			[IPC.rewindClaudeFiles, (event, payload) => this.handleRewindClaudeFiles(event, payload)],
			[IPC.runBangBash, (event, payload) => this.handleRunBangBash(event, payload)],
			[IPC.startTurn, (event, payload) => this.handleStartTurn(event, payload)],
			[IPC.steerTurn, (event, payload) => this.handleSteerTurn(event, payload)],
			[IPC.cancelTurn, () => this.handleCancelTurn()],
			[IPC.startMarkdownNoteAi, (event, payload) => this.handleStartMarkdownNoteAi(event, payload)],
			[IPC.cancelMarkdownNoteAi, (_event, payload) => this.handleCancelMarkdownNoteAi(payload)],
			[IPC.respondApproval, (_event, payload) => this.handleApprovalResponse(payload)],
			[IPC.pickWorkspace, (event) => this.handlePickWorkspace(event)],
			[IPC.openLogFolder, () => this.handleOpenLogFolder()],
			[IPC.openPath, (event, payload) => this.handleOpenPath(event, payload)],
			[IPC.getMineruWorkspaceTrees, (_event, payload) => this.handleGetMineruWorkspaceTrees(payload)],
			[IPC.log, (event, payload) => this.handleRendererLog(event, payload)],
		];
		const registeredChannels = [];
		try {
			for (const [channel, handler] of registrations) {
				this.ipcMain.handle(channel, async (event, ...args) => {
					assertAllowedRuntimeIpcEvent(event, channel, this.allowedEntryUrls);
					return handler(event, ...args);
				});
				registeredChannels.push(channel);
			}
		}
		catch (error) {
			if (typeof this.ipcMain.removeHandler === 'function') {
				for (const channel of registeredChannels) {
					try { this.ipcMain.removeHandler(channel); } catch { /* best effort */ }
				}
			}
			throw error;
		}
		this.registered = true;
		this.registeredIpcChannels = registeredChannels;
		activeRuntimeIpcOwner = this;
		return this;
	}

	unregister() {
		if (!this.registered) {
			return this;
		}
		if (activeRuntimeIpcOwner === this && typeof this.ipcMain.removeHandler === 'function') {
			for (const channel of this.registeredIpcChannels) {
				try { this.ipcMain.removeHandler(channel); } catch { /* best effort */ }
			}
		}
		if (activeRuntimeIpcOwner === this) {
			activeRuntimeIpcOwner = null;
		}
		this.registered = false;
		this.registeredIpcChannels = [];
		return this;
	}

	log(event, payload = {}) {
		if (this.logger && typeof this.logger.log === 'function') {
			this.logger.log(event, payload);
		}
	}

	logRuntimeEncodingIssue(envelope) {
		const chunk = envelope?.type === 'chunk' && isRecord(envelope.chunk) ? envelope.chunk : null;
		const text = chunk
			? String(chunk.result || chunk.content || '')
			: envelope?.type === 'stderr' || envelope?.type === 'error'
				? String(envelope.content || '')
				: '';
		if (!looksLikeMojibakeText(text)) {
			return;
		}
		this.log('runtime.encoding.mojibakeDetected', {
			envelopeType: envelope?.type || '',
			chunkType: chunk?.type || '',
			chunkName: chunk?.name || '',
			chunkId: chunk?.id || '',
			replacementCount: countReplacementCharacters(text),
			contentPreview: logPreview(text),
		});
	}

	handleRendererLog(event, payload = {}) {
		this.webContents = event.sender;
		this.log('renderer', payload && typeof payload === 'object' ? payload : { value: String(payload || '') });
		return { ok: true };
	}

	async handleOpenLogFolder() {
		const logPath = String(this.logger?.filePath || '').trim();
		if (!logPath) {
			return { ok: false, error: 'Runtime log path is not available yet.' };
		}
		const folder = path.dirname(logPath);
		this.log('runtime.logFolder.open', { folder });
		try {
			const message = await shell.openPath(folder);
			if (message) {
				this.log('runtime.logFolder.open.error', { folder, error: message });
				return { ok: false, error: message };
			}
			return { ok: true, path: folder };
		}
		catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.log('runtime.logFolder.open.error', { folder, error: message });
			return { ok: false, error: message };
		}
	}

	async handleOpenPath(event, payload = {}) {
		this.webContents = event?.sender || this.webContents;
		const target = payload?.path || payload?.filePath || payload?.href || payload?.target || '';
		const workspace = String(payload?.workspace || this.settings.workspace || this.defaultWorkspace || '').trim();
		try {
			const resolved = resolveOpenPathTarget(target, workspace, this.defaultWorkspace);
			this.log('runtime.path.open', {
				type: resolved.type,
				target: resolved.target,
				workspace,
			});
			if (resolved.type === 'external') {
				await shell.openExternal(resolved.target);
				return { ok: true, opened: true, path: resolved.target, external: true };
			}
			const stat = await fs.promises.stat(resolved.target);
			if (!stat.isFile() && !stat.isDirectory()) {
				throw new Error('Path must be a file or directory');
			}
			const errorMessage = await shell.openPath(resolved.target);
			if (errorMessage) {
				this.log('runtime.path.open.error', {
					target: resolved.target,
					error: errorMessage,
				});
				return { ok: false, opened: false, path: resolved.target, error: errorMessage };
			}
			return { ok: true, opened: true, path: resolved.target };
		}
		catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.log('runtime.path.open.error', {
				target: String(target || ''),
				workspace,
				error: message,
			});
			return { ok: false, opened: false, error: message };
		}
	}

	async handleGetMineruWorkspaceTrees(payload = {}) {
		if (!this.getMineruWorkspaceTrees) {
			return {
				workspaceId: '',
				workspaceName: '',
				workspaceRootDir: '',
				activeProjectID: String(payload?.activeProjectID || ''),
				papers: [],
			};
		}
		return this.getMineruWorkspaceTrees(payload || {});
	}

	claudeRuntimeCommandCacheKey(workspace) {
		return [
			normalizePathForComparison(workspace || this.settings.workspace || this.defaultWorkspace || ''),
			computeClaudeRuntimeCommandHash(this.settings),
		].join('|');
	}

	async loadClaudeRuntimeCommandsFromSdk(workspace) {
		const sdk = await this.claudeAgentSdkLoader();
		const launch = this.buildClaudeTurnLaunchSpec({ externalContextPaths: [] }, '', 'claude-command-probe');
		const generatedActiveMcp = launch.activeMcp;
		launch.workspace = workspace || launch.workspace;
		launch.activeMcp = { tempDir: null, mcpServers: {}, disallowedTools: [] };
		launch.allowedTools = [];
		launch.disallowedTools = [];
		launch.existingThreadId = '';
		launch.fork = null;
		launch.resumeAt = '';
		launch.promptText = '';
		const abortController = new AbortController();
		const timer = setTimeout(() => abortController.abort(), CLAUDE_RUNTIME_COMMAND_PROBE_TIMEOUT_MS);
		const options = {
			...buildClaudeSdkQueryOptions(this.settings, launch, {}, undefined, abortController),
			permissionMode: 'bypassPermissions',
			allowDangerouslySkipPermissions: true,
			persistSession: false,
		};
		delete options.canUseTool;
		let conversation = null;
		try {
			conversation = sdk.query({ prompt: '', options });
			const commands = [];
			for await (const message of conversation) {
				if (message?.type === 'system' && message?.subtype === 'init') {
					try {
						const supported = typeof conversation.supportedCommands === 'function'
							? await conversation.supportedCommands()
							: [];
						for (const entry of supported || []) {
							addUniqueClaudeRuntimeCommand(commands, claudeRuntimeCommandFromInitEntry(entry, 'command'));
						}
					}
					catch {
						// Best-effort command probing only.
					}
					for (const entry of extractClaudeRuntimeCommandsFromInitMessage(message)) {
						addUniqueClaudeRuntimeCommand(commands, entry);
					}
					abortController.abort();
					break;
				}
			}
			return commands;
		}
		catch (error) {
			if (!abortController.signal.aborted) {
				throw error;
			}
			return [];
		}
		finally {
			clearTimeout(timer);
			if (typeof conversation?.close === 'function') {
				try { conversation.close(); } catch { /* best effort */ }
			}
			cleanupTempDir(launch.activeMcp?.tempDir);
			cleanupTempDir(generatedActiveMcp?.tempDir);
		}
	}

	async probeClaudeRuntimeHandshake(workspace, options = {}) {
		const sdk = await this.claudeAgentSdkLoader();
		const launch = this.buildClaudeTurnLaunchSpec({ externalContextPaths: [] }, '', 'claude-handshake-probe');
		const generatedActiveMcp = launch.activeMcp;
		launch.workspace = workspace || launch.workspace;
		launch.activeMcp = { tempDir: null, mcpServers: {}, disallowedTools: [] };
		launch.allowedTools = [];
		launch.disallowedTools = [];
		launch.existingThreadId = '';
		launch.fork = null;
		launch.resumeAt = '';
		launch.promptText = '';
		const abortController = new AbortController();
		const timeoutMs = Number(options.timeoutMs || 15000);
		const timer = timeoutMs > 0
			? setTimeout(() => abortController.abort(), timeoutMs)
			: null;
		const queryOptions = {
			...buildClaudeSdkQueryOptions(this.settings, launch, {}, undefined, abortController),
			permissionMode: 'bypassPermissions',
			allowDangerouslySkipPermissions: true,
			persistSession: false,
		};
		delete queryOptions.canUseTool;
		let conversation = null;
		let result = null;
		try {
			conversation = sdk.query({ prompt: '', options: queryOptions });
			for await (const message of conversation) {
				if (message?.type === 'system' && message?.subtype === 'init') {
					const commands = [];
					try {
						const supported = typeof conversation.supportedCommands === 'function'
							? await conversation.supportedCommands()
							: [];
						for (const entry of supported || []) {
							addUniqueClaudeRuntimeCommand(commands, claudeRuntimeCommandFromInitEntry(entry, 'command'));
						}
					}
					catch {
						// Best-effort command probing only.
					}
					for (const entry of extractClaudeRuntimeCommandsFromInitMessage(message)) {
						addUniqueClaudeRuntimeCommand(commands, entry);
					}
					result = {
						ok: true,
						model: message.model || this.settings.model || '',
						sessionId: message.session_id || message.sessionId || '',
						commandCount: commands.length,
						commands: commands.slice(0, 20).map((entry) => ({
							name: entry.name,
							kind: entry.kind || 'command',
						})),
					};
					abortController.abort();
					break;
				}
			}
		}
		catch (error) {
			if (!result) {
				if (abortController.signal.aborted) {
					throw new Error(`Timed out waiting for Claude SDK initialize after ${timeoutMs}ms`);
				}
				throw error;
			}
		}
		finally {
			if (timer) {
				clearTimeout(timer);
			}
			if (typeof conversation?.close === 'function') {
				try { conversation.close(); } catch { /* best effort */ }
			}
			cleanupTempDir(launch.activeMcp?.tempDir);
			cleanupTempDir(generatedActiveMcp?.tempDir);
		}
		if (!result) {
			throw new Error('Claude SDK ended before initialize');
		}
		return result;
	}

	async loadClaudeRuntimeCommandAssets(workspace, options = {}) {
		const forceReload = options.forceReload === true;
		const cacheKey = this.claudeRuntimeCommandCacheKey(workspace);
		const now = Date.now();
		if (!forceReload && this.claudeRuntimeCommandCache?.key === cacheKey && now < this.claudeRuntimeCommandCacheExpiresAt) {
			return this.claudeRuntimeCommandCache.commands;
		}
		if (!forceReload && this.claudeRuntimeCommandPending?.key === cacheKey) {
			return this.claudeRuntimeCommandPending.promise;
		}
		const promise = this.loadClaudeRuntimeCommandsFromSdk(workspace)
			.then((commands) => {
				if (commands.length > 0) {
					this.claudeRuntimeCommandCache = { key: cacheKey, commands };
					this.claudeRuntimeCommandCacheExpiresAt = Date.now() + CLAUDE_RUNTIME_COMMAND_LIST_TTL_MS;
				}
				else if (this.claudeRuntimeCommandCache?.key === cacheKey) {
					this.claudeRuntimeCommandCache = null;
					this.claudeRuntimeCommandCacheExpiresAt = 0;
				}
				return commands;
			})
			.finally(() => {
				if (this.claudeRuntimeCommandPending?.key === cacheKey) {
					this.claudeRuntimeCommandPending = null;
				}
			});
		this.claudeRuntimeCommandPending = { key: cacheKey, promise };
		return promise;
	}

	codexRuntimeSkillCacheKey(workspace) {
		const launchSpec = resolveCodexLaunchSpec(this.settings);
		return [
			normalizePathForComparison(workspace || this.settings.workspace || this.defaultWorkspace || ''),
			launchSpec.method,
			launchSpec.displayCommand,
			launchSpec.targetWorkspace || '',
			computeCodexEnvironmentHash(this.settings),
		].join('|');
	}

	async listCodexRuntimeSkillsWithTransport(transport, launchSpec, options = {}) {
		const cwd = launchSpec.targetWorkspace || resolveCodexTargetWorkspace(this.settings) || this.defaultWorkspace || process.cwd();
		const result = await transport.request('skills/list', {
			cwds: [cwd],
			...(options.forceReload ? { forceReload: true } : {}),
		}, 60000);
		return loadCodexRuntimeSkillAssetsFromAppServerResult(result, {
			mapPath: (targetPath) => mapCodexTargetPathToHost(this.settings, targetPath),
		});
	}

	async fetchCodexRuntimeSkillsEphemeral(options = {}) {
		const launchSpec = resolveCodexLaunchSpec(this.settings);
		try {
			fs.mkdirSync(launchSpec.cwd, { recursive: true });
		}
		catch (error) {
			if (launchSpec.method !== 'wsl') {
				throw error;
			}
		}
		const proc = this.spawnProcess(launchSpec.command, launchSpec.args, {
			cwd: launchSpec.cwd,
			env: launchSpec.env,
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
			shell: launchSpec.shell,
		});
		let stderr = '';
		proc.stderr?.on?.('data', (chunk) => {
			const text = decodeProcessChunk(chunk).trim();
			if (text) stderr = appendLimitedText(stderr, `${text}\n`, PROCESS_STDERR_MAX_CHARS);
		});
		const transport = new CodexRpcTransport(proc);
		transport.start();
		let timedOut = false;
		let deadlineTimer = null;
		const deadline = new Promise((_, reject) => {
			deadlineTimer = setTimeout(() => {
				timedOut = true;
				transport.dispose();
				terminateProcess(proc);
				reject(new Error(`Codex runtime skill probe timed out after ${CODEX_EPHEMERAL_PROBE_TIMEOUT_MS}ms`));
			}, CODEX_EPHEMERAL_PROBE_TIMEOUT_MS);
		});
		const probe = (async () => {
			await transport.request('initialize', {
				clientInfo: { name: 'pdf-ai-claudian-skill-probe', version: '0.1.0' },
				capabilities: { experimentalApi: true },
			}, 60000);
			transport.notify('initialized');
			return this.listCodexRuntimeSkillsWithTransport(transport, launchSpec, options);
		})();
		try {
			return await Promise.race([probe, deadline]);
		}
		catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(!timedOut && stderr.trim() ? `${message}: ${stderr.trim()}` : message);
		}
		finally {
			if (deadlineTimer) {
				clearTimeout(deadlineTimer);
			}
			transport.dispose();
			terminateProcess(proc);
		}
	}

	async loadCodexRuntimeSkillAssets(workspace, options = {}) {
		const forceReload = options.forceReload === true;
		const cacheKey = this.codexRuntimeSkillCacheKey(workspace);
		const now = Date.now();
		if (!forceReload && this.codexRuntimeSkillCache?.key === cacheKey && now < this.codexRuntimeSkillCacheExpiresAt) {
			return this.codexRuntimeSkillCache.skills;
		}
		if (!forceReload && this.codexRuntimeSkillPending?.key === cacheKey) {
			return this.codexRuntimeSkillPending.promise;
		}
		const promise = (async () => {
			if (this.settings.provider === 'codex' && this.transport) {
				const launchSpec = resolveCodexLaunchSpec(this.settings);
				return this.listCodexRuntimeSkillsWithTransport(this.transport, launchSpec, { forceReload });
			}
			return this.fetchCodexRuntimeSkillsEphemeral({ forceReload });
		})().then((skills) => {
			this.codexRuntimeSkillCache = { key: cacheKey, skills };
			this.codexRuntimeSkillCacheExpiresAt = Date.now() + CODEX_RUNTIME_SKILL_LIST_TTL_MS;
			return skills;
		}).finally(() => {
			if (this.codexRuntimeSkillPending?.key === cacheKey) {
				this.codexRuntimeSkillPending = null;
			}
		});
		this.codexRuntimeSkillPending = { key: cacheKey, promise };
		return promise;
	}

	resolveProviderSkillRoot(workspace) {
		if (this.getProviderSkillRoot) {
			try {
				const resolved = String(this.getProviderSkillRoot({
					workspace,
					settings: this.settings,
					defaultWorkspace: this.defaultWorkspace,
				}) || '').trim();
				if (resolved) return path.resolve(resolved);
			}
			catch (error) {
				this.log('providerAssets.skillRoot.error', {
					workspace,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		return resolveProviderSkillRoot(workspace, { providerSkillRoot: this.providerSkillRoot });
	}

	async loadProviderAssetsForWorkspace(workspace, options = {}) {
		const candidateSettings = options.settings
			? normalizeSettings(mergeSettingsPatchPreservingSecrets(this.settings, options.settings), this.defaultWorkspace)
			: this.settings;
		const effectiveSettings = candidateSettings;
		const providerSkillRoot = this.resolveProviderSkillRoot(workspace);
		const assets = loadProviderAssets(workspace, { providerSkillRoot });
		const provider = String(options.provider || '').trim();
		if (options.includeRuntimeModels === true) {
			if (!provider || provider === 'claude') {
				try {
					const models = await fetchClaudeRuntimeModelAssets(effectiveSettings);
					if (models.length > 0) {
						this.runtimeModelAssets.claudeRuntimeModels = mergeRuntimeModelAssets(
							'claude',
							options.forceReload === true ? [] : this.runtimeModelAssets.claudeRuntimeModels,
							models,
						);
						assets.claudeRuntimeModelsLoaded = true;
					}
					else if (options.forceReload === true) {
						this.runtimeModelAssets.claudeRuntimeModels = [];
						assets.claudeRuntimeModelsUnavailable = true;
					}
				}
				catch (error) {
					assets.claudeRuntimeModelsError = error instanceof Error ? error.message : String(error);
					this.log('providerAssets.claudeRuntimeModels.error', {
						workspace,
						error: assets.claudeRuntimeModelsError,
					});
				}
			}
			if (!provider || provider === 'codex') {
				try {
					const models = await fetchCodexRuntimeModelAssets(effectiveSettings);
					if (models.length > 0) {
						this.runtimeModelAssets.codexRuntimeModels = mergeRuntimeModelAssets(
							'codex',
							options.forceReload === true ? [] : this.runtimeModelAssets.codexRuntimeModels,
							models,
						);
						assets.codexRuntimeModelsLoaded = true;
					}
					else if (options.forceReload === true) {
						this.runtimeModelAssets.codexRuntimeModels = [];
						assets.codexRuntimeModelsUnavailable = true;
					}
				}
				catch (error) {
					assets.codexRuntimeModelsError = error instanceof Error ? error.message : String(error);
					this.log('providerAssets.codexRuntimeModels.error', {
						workspace,
						error: assets.codexRuntimeModelsError,
					});
				}
			}
		}
		attachProviderModelAssets(assets, effectiveSettings, this.runtimeModelAssets);
		if (provider === 'claude' && options.includeClaudeRuntimeCommands) {
			try {
				const runtimeCommands = await this.loadClaudeRuntimeCommandAssets(workspace, options);
				if (runtimeCommands.length > 0) {
					for (const entry of runtimeCommands) {
						addUniqueClaudeRuntimeCommand(assets.claudeRuntimeCommands, entry);
					}
					assets.hasAny = true;
				}
			}
			catch (error) {
				this.log('providerAssets.claudeRuntimeCommands.error', {
					workspace,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		return assets;
	}

	async emitProviderAssetsForWorkspace(workspace, options = {}) {
		try {
			const assets = await this.loadProviderAssetsForWorkspace(workspace, options);
			this.emit({ type: 'provider-assets', assets });
			return assets;
		}
		catch (error) {
			this.log('providerAssets.emit.error', {
				workspace,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	emitNativeHistoriesForWorkspace(workspace) {
		try {
			const histories = discoverNativeHistories(12, this.nativeHistoryHome, workspace);
			this.emit({ type: 'native-histories', histories });
			return histories;
		}
		catch (error) {
			this.log('nativeHistories.emit.error', {
				workspace,
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	emitDiagnosticsSnapshot() {
		try {
			const diagnostics = this.buildDiagnostics();
			this.emit({ type: 'diagnostics', diagnostics });
			return diagnostics;
		}
		catch (error) {
			this.log('diagnostics.emit.error', {
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	clearStateSupplementTimers() {
		for (const timer of this.stateSupplementTimers) {
			clearTimeout(timer);
		}
		this.stateSupplementTimers.clear();
	}

	scheduleStateSupplementTask(delayMs, generation, task) {
		const timer = setTimeout(() => {
			this.stateSupplementTimers.delete(timer);
			if (generation !== this.stateSupplementGeneration) {
				return;
			}
			task();
		}, delayMs);
		this.stateSupplementTimers.add(timer);
	}

	scheduleStateSupplements(workspace) {
		this.clearStateSupplementTimers();
		const generation = this.stateSupplementGeneration + 1;
		this.stateSupplementGeneration = generation;
		const startedAt = Date.now();
		this.scheduleStateSupplementTask(0, generation, () => {
			this.log('runtime.stateSupplement.start', { workspace });
			void this.loadProviderAssetsForWorkspace(workspace)
				.then((assets) => {
					if (generation === this.stateSupplementGeneration) {
						this.emit({ type: 'provider-assets', assets });
					}
				})
				.catch((error) => {
					this.log('providerAssets.emit.error', {
						workspace,
						error: error instanceof Error ? error.message : String(error),
					});
				})
				.finally(() => {
					if (generation !== this.stateSupplementGeneration) {
						return;
					}
					this.log('runtime.stateSupplement.providerAssets.done', {
						workspace,
						elapsedMs: Date.now() - startedAt,
					});
				});
		});
		if (this.settings.runtimeMode !== 'mock') {
			this.scheduleStateSupplementTask(80, generation, () => {
				void this.loadProviderAssetsForWorkspace(workspace, {
					includeRuntimeModels: true,
					forceReload: true,
				})
					.then((assets) => {
						if (generation === this.stateSupplementGeneration) {
							this.emit({ type: 'provider-assets', assets });
						}
					})
					.catch((error) => {
						this.log('providerAssets.runtimeModels.emit.error', {
							workspace,
							error: error instanceof Error ? error.message : String(error),
						});
					})
					.finally(() => {
						if (generation !== this.stateSupplementGeneration) {
							return;
						}
						this.log('runtime.stateSupplement.runtimeModels.done', {
							workspace,
							elapsedMs: Date.now() - startedAt,
						});
					});
			});
		}
		this.scheduleStateSupplementTask(16, generation, () => {
			this.emitNativeHistoriesForWorkspace(workspace);
			this.log('runtime.stateSupplement.nativeHistories.done', {
				workspace,
				elapsedMs: Date.now() - startedAt,
			});
		});
		this.scheduleStateSupplementTask(32, generation, () => {
			this.emitDiagnosticsSnapshot();
			this.log('runtime.stateSupplement.diagnostics.done', {
				workspace,
				elapsedMs: Date.now() - startedAt,
			});
		});
	}

	async handleGetState(event) {
		this.webContents = event.sender;
		const workspace = this.settings.workspace || this.defaultWorkspace;
		const mcp = loadClaudeMcpServers(workspace);
		this.scheduleStateSupplements(workspace);
		if (this.registered && !this.dryRun) {
			void this.maybeUpdateManagedCodexCli();
		}
		if (process.env.PDF_AI_CODEX_DOWNLOAD_UI_TEST === '1') {
			const downloadInfo = getCodexDownloadInfo(this.settings);
			const source = downloadInfo.sources[0] || createNpmMirrorCodexDownloadSource();
			setTimeout(() => this.emitCodexDownloadProgress({
				stage: 'downloading',
				attempt: 2,
				...getCodexDownloadProgressInfo(source),
				downloadedBytes: 36700160,
				totalBytes: source.expectedBytes,
				percent: 36700160 / source.expectedBytes * 100,
				speedBytesPerSecond: 3145728,
				resumed: true,
			}), 800).unref?.();
		}
		return {
			ok: true,
			settings: this.publicSettings(),
			status: this.getStatus(),
			threadId: this.threadId,
			nativeHistories: [],
			mcpServersLoaded: mcp.exists,
			mcpServersPath: mcp.path,
			mcpServers: mcp.servers,
			providerAssetsLoaded: false,
			providerAssetsError: '',
			providerAssets: null,
			logPath: this.logger?.filePath || '',
			diagnostics: null,
		};
	}

	async handleEnvironment(payload = {}) {
		if (payload.action === 'install' && (this.currentTurnId || this.claudeSdkQuery)) {
			throw new Error('Stop the active AI turn before installing an environment component.');
		}
		const result = await this.environmentManager.request(payload, this.settings);
		return result;
	}

	handleGetDiagnostics(event) {
		this.webContents = event.sender;
		return this.buildDiagnostics();
	}

	buildDiagnostics() {
		const logPath = String(this.logger?.filePath || '').trim();
		const records = readRuntimeLogRecords(logPath, 500);
		const logDiagnostics = buildRuntimeLogDiagnostics(records);
		const inMemoryPending = [...this.pendingApprovals.entries()].map(([id, pending]) => ({
			id,
			kind: pending.kind || '',
			requestId: pending.requestId || '',
			threadId: pending.threadId || '',
			source: pending.source || '',
		}));
		const currentOpenTurn = this.currentTurnId ? {
			sessionKey: this.activeSessionKey || '',
			threadId: this.threadId || '',
			turnId: this.currentTurnId || '',
		} : null;
		const claudeRuntime = resolveClaudeRuntimeExecutable({
			settings: this.settings,
			cwd: this.settings.workspace || this.defaultWorkspace || process.cwd(),
		});
		const issues = [...logDiagnostics.issues];
		if (inMemoryPending.length > 0 && !issues.some((issue) => issue.kind === 'pending-approval')) {
			issues.unshift({
				kind: 'pending-approval',
				message: `${inMemoryPending.length} approval request(s) are pending in runtime memory.`,
				records: [],
			});
		}
		if (currentOpenTurn && !issues.some((issue) => issue.kind === 'open-turn')) {
			issues.unshift({
				kind: 'open-turn',
				message: 'A provider turn is currently active in runtime memory.',
				records: [],
			});
		}
		const pendingApprovalCount = Math.max(logDiagnostics.pendingApprovalCount, inMemoryPending.length);
		const openTurnCount = Math.max(logDiagnostics.openTurnCount, currentOpenTurn ? 1 : 0);
		return {
			ok: true,
			logPath,
			recordCount: records.length,
			status: this.getStatus(),
			claudeRuntime,
			pendingApprovalCount,
			openTurnCount,
			emptyResponseCount: logDiagnostics.emptyResponseCount,
			mojibakeCount: logDiagnostics.mojibakeCount,
			errorCount: logDiagnostics.errorCount,
			latestStatus: logDiagnostics.latestStatus,
			latestDone: logDiagnostics.latestDone,
			latestError: logDiagnostics.latestError,
			latestApproval: logDiagnostics.latestApproval,
			recentImportant: logDiagnostics.recentImportant,
			pendingApprovals: inMemoryPending,
			currentOpenTurn,
			issues,
			healthy: pendingApprovalCount === 0
				&& openTurnCount === 0
				&& logDiagnostics.emptyResponseCount === 0
				&& logDiagnostics.mojibakeCount === 0
				&& logDiagnostics.errorCount === 0,
		};
	}

	async handleUpdateSettings(event, payload) {
		this.webContents = event.sender;
		const nativeConfigRestarted = await this.refreshNativeCliConfiguration();
		const previousSettings = this.settings;
		const next = normalizeSettings(
			mergeSettingsPatchPreservingSecrets(previousSettings, payload || {}),
			this.defaultWorkspace,
		);
		const restartNeeded = this.requiresRestart(previousSettings, next);
		const codexSessionsInvalidated = didCodexEnvironmentHashChange(previousSettings, next);
		const codexModelCatalogChanged = previousSettings.codexHome !== next.codexHome;
		if (codexModelCatalogChanged) {
			// Pending requests can belong to the prior route. Drop its catalog before
			// the new source publishes its own model list.
			this.runtimeModelAssets.codexRuntimeModels = [];
		}
		this.settings = next;
		this.setCodexReasoningEffort(this.settings.effort);
		writeJsonFile(this.settingsPath, this.settings);
		if (restartNeeded && !nativeConfigRestarted) {
			await this.shutdown({ unregisterIpc: false });
		}
		if (codexSessionsInvalidated) {
			this.clearProviderSessions('codex');
			this.emit({
				type: 'sessions-invalidated',
				provider: 'codex',
				reason: 'codex-environment',
				detail: 'Codex environment changed; existing Codex sessions were invalidated',
			});
		}
		this.emit({ type: 'settings', settings: this.publicSettings(), status: this.getStatus() });
		void this.emitProviderAssetsForWorkspace(this.settings.workspace || this.defaultWorkspace, { forceReload: true });
		return {
			ok: true,
			settings: this.publicSettings(),
			restarted: restartNeeded || nativeConfigRestarted,
			invalidatedProviderSessions: codexSessionsInvalidated ? ['codex'] : [],
		};
	}

	handleSaveMcpServers(event, payload = {}) {
		this.webContents = event.sender;
		const workspace = String(payload.workspace || this.settings.workspace || this.defaultWorkspace || '').trim();
		try {
			const saved = saveClaudeMcpServers(workspace, payload.servers || []);
			this.emit({ type: 'mcp-servers', servers: saved.servers, path: saved.path });
			return { ok: true, servers: saved.servers, path: saved.path };
		}
		catch (error) {
			return { ok: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	async handleTestMcpServer(event, payload = {}) {
		this.webContents = event.sender;
		const server = payload.server && typeof payload.server === 'object' ? payload.server : payload;
		const result = await testManagedMcpServer(server);
		return { ok: result.success === true, ...result };
	}

	async handleLoadProviderAssets(event, payload = {}) {
		this.webContents = event.sender;
		const workspace = String(payload.workspace || this.settings.workspace || this.defaultWorkspace || '').trim();
		const settingsPatch = isRecord(payload.settings) ? payload.settings : isRecord(payload.settingsPatch) ? payload.settingsPatch : null;
		try {
			const assets = await this.loadProviderAssetsForWorkspace(workspace, {
				forceReload: payload.forceReload === true,
				provider: payload.provider || payload.providerId || '',
				includeClaudeRuntimeCommands: payload.includeClaudeRuntimeCommands === true,
				includeCodexRuntimeSkills: payload.includeCodexRuntimeSkills === true,
				includeRuntimeModels: payload.includeRuntimeModels === true,
				settings: settingsPatch,
			});
			this.log('providerAssets.load', {
				workspace,
				summary: summarizeProviderAssets(assets),
			});
			const provider = payload.provider || payload.providerId || '';
			if (payload.includeRuntimeModels === true && payload.forceReload === true) {
				const claudeRuntimeModelCount = Array.isArray(assets.claudeRuntimeModels) ? assets.claudeRuntimeModels.length : 0;
				const codexRuntimeModelCount = Array.isArray(assets.codexRuntimeModels) ? assets.codexRuntimeModels.length : 0;
				const runtimeModelError = provider === 'codex'
					? assets.codexRuntimeModelsError
					: provider === 'claude'
						? assets.claudeRuntimeModelsError
						: (claudeRuntimeModelCount + codexRuntimeModelCount > 0
							? ''
							: (assets.codexRuntimeModelsError || assets.claudeRuntimeModelsError));
				if (runtimeModelError) {
					return { ok: false, error: runtimeModelError, assets };
				}
			}
			return { ok: true, assets };
		}
		catch (error) {
			this.log('providerAssets.load.error', {
				workspace,
				error: error instanceof Error ? error.message : String(error),
			});
			return { ok: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	invalidateProviderAssetCachesAfterSave(assets = {}) {
		if (Array.isArray(assets.claudeCommands) || Array.isArray(assets.claudePlugins)) {
			this.claudeRuntimeCommandCache = null;
			this.claudeRuntimeCommandCacheExpiresAt = 0;
			this.claudeRuntimeCommandPending = null;
		}
		if (Array.isArray(assets.codexSkills)) {
			this.codexRuntimeSkillCache = null;
			this.codexRuntimeSkillCacheExpiresAt = 0;
			this.codexRuntimeSkillPending = null;
			this.codexSkillForceReloadOnNextResolve = true;
		}
	}

	async handleSaveProviderAssets(event, payload = {}) {
		this.webContents = event.sender;
		const workspace = String(payload.workspace || this.settings.workspace || this.defaultWorkspace || '').trim();
		try {
			const providerSkillRoot = this.resolveProviderSkillRoot(workspace);
			this.log('providerAssets.save.request', {
				workspace,
				providerSkillRoot,
				summary: summarizeProviderAssets(payload.assets || {}),
			});
			saveProviderAssets(workspace, payload.assets || {}, { providerSkillRoot });
			this.invalidateProviderAssetCachesAfterSave(payload.assets || {});
			const assets = await this.loadProviderAssetsForWorkspace(workspace, { forceReload: true });
			this.log('providerAssets.save.result', {
				workspace,
				summary: summarizeProviderAssets(assets),
			});
			this.emit({ type: 'provider-assets', assets });
			return { ok: true, assets };
		}
		catch (error) {
			this.log('providerAssets.save.error', {
				workspace,
				error: error instanceof Error ? error.message : String(error),
			});
			return { ok: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	async handleGenerateTitle(event, payload = {}) {
		this.webContents = event.sender;
		const conversationId = String(payload.conversationId || '').trim().slice(0, 160) || `title-${Date.now()}`;
		const userMessage = String(payload.userMessage || '').trim().slice(0, TITLE_GENERATION_USER_MESSAGE_MAX_CHARS);
		if (!userMessage) {
			return { ok: false, conversationId, error: 'Title generation user message is empty' };
		}
		this.cleanupTitleGeneration(conversationId);
		this.pruneTitleGenerations(TITLE_GENERATION_MAX_CONCURRENT - 1);
		const provider = String(payload.provider || this.settings.provider || 'claude');
		const model = String(payload.model || '').trim();
		const session = {
			provider,
			conversationId,
			userMessage,
			model,
			codex: null,
			abort: null,
		};
		this.titleGenerations.set(conversationId, session);
		try {
			this.emit({ type: 'status', status: 'running', detail: `Generating title via ${provider}` });
			let rawText = '';
			if (this.dryRun) {
				rawText = buildDryGeneratedTitle(userMessage);
			}
			else if (provider === 'claude') {
				rawText = await this.runClaudeTitleGenerationQuery(userMessage, model, session);
			}
			else if (provider === 'codex') {
				rawText = await this.runCodexTitleGenerationQuery(userMessage, model, session);
			}
			else {
				throw new Error(`Unsupported title provider: ${provider}`);
			}
			const title = parseTitleGenerationResponse(rawText);
			if (!title) {
				throw new Error('Failed to parse title from response');
			}
			this.emit({ type: 'status', status: 'ready', detail: 'Title generated' });
			this.emit({ type: 'title', conversationId, provider, title });
			return { ok: true, conversationId, provider, title, rawText };
		}
		catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.emit({ type: 'status', status: 'failed', detail: message });
			return { ok: false, conversationId, provider, error: message };
		}
		finally {
			this.cleanupTitleGeneration(conversationId);
		}
	}

	handleCancelTitleGeneration(payload = {}) {
		const conversationId = String(payload?.conversationId || '').trim();
		if (conversationId) {
			this.cleanupTitleGeneration(conversationId);
		}
		else {
			this.cleanupAllTitleGenerations();
		}
		return { ok: true };
	}

	pruneTitleGenerations(maxEntries = TITLE_GENERATION_MAX_CONCURRENT) {
		while (this.titleGenerations.size > Math.max(0, maxEntries)) {
			const oldest = this.titleGenerations.keys().next().value;
			if (!oldest) {
				break;
			}
			this.cleanupTitleGeneration(oldest);
		}
	}

	runClaudeTitleGenerationQuery(userMessage, modelOverride, session) {
		const workspace = this.settings.workspace || this.defaultWorkspace || process.cwd();
		fs.mkdirSync(workspace, { recursive: true });
		const command = resolveClaudeCommand(this.settings);
		const env = buildClaudeEnvironment(this.settings);
		const args = [
			'-p',
			'--verbose',
			'--output-format',
			'stream-json',
			'--include-partial-messages',
			'--model',
			modelOverride || this.resolveModel({}),
			'--append-system-prompt',
			TITLE_GENERATION_SYSTEM_PROMPT,
			...resolveClaudeAuxQueryArgs(this.settings, { persistSession: false }),
			buildTitleGenerationPrompt(userMessage),
		];

		return new Promise((resolve, reject) => {
			let output = '';
			let stderr = '';
			let textDeltaSeen = false;
			let settled = false;
			let timeoutTimer = null;
			const finish = (error, result) => {
				if (settled) return;
				settled = true;
				if (timeoutTimer) {
					clearTimeout(timeoutTimer);
					timeoutTimer = null;
				}
				if (error) reject(error);
				else resolve(result);
			};
			let proc = null;
			timeoutTimer = setTimeout(() => {
				terminateProcess(proc);
				finish(new Error(`Claude title generation timed out after ${TITLE_GENERATION_TIMEOUT_MS}ms`));
			}, TITLE_GENERATION_TIMEOUT_MS);
			try {
				proc = this.spawnProcess(command, args, {
					cwd: workspace,
					env,
					stdio: ['ignore', 'pipe', 'pipe'],
					windowsHide: true,
					shell: process.platform === 'win32' && !/[\\/]/.test(command),
				});
			}
			catch (error) {
				finish(error);
				return;
			}
			session.abort = () => {
				terminateProcess(proc);
			};
			createDecodedLineReader(proc.stdout, (line) => {
				let message = null;
				try {
					message = JSON.parse(line);
				}
				catch {
					output = appendLimitedText(output, line);
					return;
				}
				if (message?.type === 'stream_event') {
					const event = message.event || {};
					const delta = event.delta || {};
					if (event.type === 'content_block_delta' && delta.type === 'text_delta') {
						textDeltaSeen = true;
						output = appendLimitedText(output, delta.text || '');
					}
				}
				if (message?.type === 'assistant' && !textDeltaSeen) {
					output = appendLimitedText(output, extractClaudeTextFromMessage(message.message));
				}
				if (message?.type === 'result') {
					if (message.is_error || message.subtype === 'error') {
						stderr = appendLimitedText(stderr, message.result || message.error || 'Claude title generation error', PROCESS_STDERR_MAX_CHARS);
					}
					else if (!output && typeof message.result === 'string') {
						output = appendLimitedText('', message.result);
					}
				}
			});
			proc.stderr.on('data', (chunk) => {
				stderr = appendLimitedText(stderr, decodeProcessChunk(chunk), PROCESS_STDERR_MAX_CHARS);
			});
			proc.once('error', (error) => finish(error));
			proc.once('exit', (code, signal) => {
				if (code !== 0 && signal !== 'SIGTERM') {
					finish(new Error(stderr.trim() || `Claude title generation exited with ${code ?? signal ?? 'unknown status'}`));
					return;
				}
				finish(null, output);
			});
		});
	}

	async runCodexTitleGenerationQuery(userMessage, modelOverride, session) {
		const launchSpec = resolveCodexLaunchSpec(this.settings);
		try {
			fs.mkdirSync(launchSpec.cwd, { recursive: true });
		}
		catch (error) {
			if (launchSpec.method !== 'wsl') throw error;
		}
		const proc = this.spawnProcess(launchSpec.command, launchSpec.args, {
			cwd: launchSpec.cwd,
			env: launchSpec.env,
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
			shell: launchSpec.shell,
		});
		const transport = new CodexRpcTransport(proc);
		const codex = {
			proc,
			transport,
			threadId: '',
			pending: null,
		};
		session.codex = codex;
		proc.stderr.on('data', () => {});
		proc.once('exit', () => {
			if (codex.pending) {
				codex.pending.error = codex.pending.error || 'Codex title generation process exited unexpectedly';
				codex.pending.resolve();
			}
			transport.dispose();
		});
		transport.start();
		transport.onNotification('item/agentMessage/delta', (params) => {
			if (codex.pending) {
				codex.pending.text = appendLimitedText(codex.pending.text, params?.delta || '');
			}
		});
		transport.onNotification('turn/completed', (params) => {
			if (params?.turn?.status === 'failed' && params?.turn?.error?.message && codex.pending) {
				codex.pending.error = params.turn.error.message;
			}
			codex.pending?.resolve();
		});
		transport.onNotification('error', (params) => {
			if (codex.pending && !params?.willRetry) {
				codex.pending.error = params?.error?.message || 'Codex title generation error';
				codex.pending.resolve();
			}
		});
		await transport.request('initialize', {
			clientInfo: { name: 'pdf-ai-claudian-title-generation', version: '0.1.0' },
			capabilities: { experimentalApi: true },
		});
		transport.notify('initialized');
		const thread = await transport.request('thread/start', {
			model: modelOverride || this.resolveModel({}),
			cwd: launchSpec.targetWorkspace || this.settings.workspace,
			approvalPolicy: 'never',
			sandbox: 'read-only',
			baseInstructions: TITLE_GENERATION_SYSTEM_PROMPT,
			experimentalRawEvents: true,
			persistExtendedHistory: false,
		}, 60000);
		codex.threadId = thread?.thread?.id || '';
		if (!codex.threadId) {
			throw new Error('Codex did not return a title generation thread id');
		}
		const donePromise = new Promise((resolve) => {
			codex.pending = { text: '', error: '', resolve };
		});
		const turn = await transport.request('turn/start', {
			threadId: codex.threadId,
			input: [{ type: 'text', text: buildTitleGenerationPrompt(userMessage) }],
			model: modelOverride || this.resolveModel({}),
		}, 60000);
		session.abort = () => {
			transport.request('turn/interrupt', {
				threadId: codex.threadId,
				turnId: turn?.turn?.id || '',
			}).catch(() => {});
		};
		let timeoutTimer = null;
		try {
			await Promise.race([
				donePromise,
				new Promise((_, reject) => {
					timeoutTimer = setTimeout(() => {
						if (codex.pending) {
							codex.pending.error = `Codex title generation timed out after ${TITLE_GENERATION_TIMEOUT_MS}ms`;
						}
						session.abort?.();
						reject(new Error(`Codex title generation timed out after ${TITLE_GENERATION_TIMEOUT_MS}ms`));
					}, TITLE_GENERATION_TIMEOUT_MS);
				}),
			]);
		}
		finally {
			if (timeoutTimer) {
				clearTimeout(timeoutTimer);
			}
		}
		const pending = codex.pending || { text: '', error: 'Codex title generation did not complete' };
		codex.pending = null;
		if (pending.error) {
			throw new Error(pending.error);
		}
		return pending.text;
	}

	cleanupTitleGeneration(conversationId) {
		const id = String(conversationId || '').trim();
		if (!id) return;
		const session = this.titleGenerations.get(id);
		if (!session) return;
		this.titleGenerations.delete(id);
		try {
			if (typeof session.abort === 'function') {
				session.abort();
			}
		}
		catch {
			// Best-effort cancellation only.
		}
		try {
			session.codex?.transport?.dispose?.();
			if (session.codex?.proc && !session.codex.proc.killed) {
				terminateProcess(session.codex.proc);
			}
		}
		catch {
			// Best-effort cleanup only.
		}
	}

	cleanupAllTitleGenerations() {
		for (const id of Array.from(this.titleGenerations.keys())) {
			this.cleanupTitleGeneration(id);
		}
	}

	async handleStartInstructionRefine(event, payload = {}) {
		this.webContents = event.sender;
		const rawInstruction = String(payload.rawInstruction || '').replace(/^#\s*/, '').trim().slice(0, INSTRUCTION_REFINE_TEXT_MAX_CHARS);
		if (!rawInstruction) {
			return { ok: false, error: 'Instruction is required' };
		}
		const provider = String(payload.provider || this.settings.provider || 'claude');
		this.cleanupInstructionRefineSession();
		this.instructionRefineSession = {
			provider,
			modelOverride: String(payload.model || '').trim(),
			rawInstruction,
			existingInstructions: String(payload.existingInstructions || '').slice(0, INSTRUCTION_REFINE_TEXT_MAX_CHARS),
			hasConversation: false,
			claudeSessionId: null,
			codex: null,
		};
		return this.runInstructionRefinePrompt(`Please refine this instruction: "${rawInstruction}"`, null);
	}

	async handleContinueInstructionRefine(event, payload = {}) {
		this.webContents = event.sender;
		if (!this.instructionRefineSession?.hasConversation) {
			return { ok: false, error: 'No active instruction refinement conversation to continue' };
		}
		const message = String(payload.message || '').trim().slice(0, INSTRUCTION_REFINE_TEXT_MAX_CHARS);
		if (!message) {
			return { ok: false, error: 'Instruction refinement continuation is empty' };
		}
		const modelOverride = String(payload.model || '').trim();
		if (modelOverride) {
			this.instructionRefineSession.modelOverride = modelOverride;
		}
		return this.runInstructionRefinePrompt(message, message);
	}

	handleCancelInstructionRefine() {
		this.cleanupInstructionRefineSession();
		return { ok: true };
	}

	async runInstructionRefinePrompt(prompt, continuationMessage) {
		const session = this.instructionRefineSession || {
			provider: this.settings.provider,
			modelOverride: '',
			rawInstruction: '',
			existingInstructions: '',
			hasConversation: false,
			claudeSessionId: null,
			codex: null,
		};
		try {
			this.emit({ type: 'status', status: 'running', detail: `Instruction refine via ${session.provider}` });
			let rawText = '';
			if (this.dryRun) {
				rawText = buildDryInstructionRefineText(session.rawInstruction, session.existingInstructions, continuationMessage);
			}
			else if (session.provider === 'claude') {
				const result = await this.runClaudeInstructionRefineQuery(prompt, session.claudeSessionId, session.existingInstructions, session.modelOverride);
				rawText = result.text;
				session.claudeSessionId = result.sessionId || session.claudeSessionId;
			}
			else if (session.provider === 'codex') {
				rawText = await this.runCodexInstructionRefineQuery(prompt, session);
			}
			else {
				throw new Error(`Unsupported instruction refine provider: ${session.provider}`);
			}
			if (this.instructionRefineSession !== session) {
				return { ok: false, error: 'Cancelled' };
			}
			const parsed = parseInstructionRefineResponse(rawText);
			session.hasConversation = true;
			this.instructionRefineSession = session;
			this.emit({ type: 'status', status: 'ready', detail: 'Instruction refine ready' });
			return {
				ok: parsed.success !== false,
				provider: session.provider,
				rawText,
				result: parsed,
				session: {
					hasConversation: session.hasConversation,
					claudeSessionId: session.claudeSessionId || '',
					codexThreadId: session.codex?.threadId || '',
				},
				error: parsed.error,
			};
		}
		catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.emit({ type: 'status', status: 'failed', detail: message });
			return { ok: false, error: message };
		}
	}

	runClaudeInstructionRefineQuery(prompt, resumeSessionId, existingInstructions, modelOverride) {
		const workspace = this.settings.workspace || this.defaultWorkspace || process.cwd();
		fs.mkdirSync(workspace, { recursive: true });
		const command = resolveClaudeCommand(this.settings);
		const model = String(modelOverride || '').trim() || this.resolveModel({});
		const env = buildClaudeEnvironment(this.settings);
		const effort = resolveClaudeEffort(this.settings.effort, {
			model,
			settings: this.settings,
		});
		const args = [
			'-p',
			'--verbose',
			'--output-format',
			'stream-json',
			'--include-partial-messages',
			'--model',
			model,
			...(effort ? ['--effort', effort] : []),
			'--append-system-prompt',
			buildRefineSystemPrompt(existingInstructions),
			...resolveClaudeAuxQueryArgs(this.settings),
		];
		if (resumeSessionId) {
			args.push('--resume', resumeSessionId);
		}
		args.push(prompt);

		return new Promise((resolve, reject) => {
			let output = '';
			let sessionId = resumeSessionId || '';
			let stderr = '';
			let textDeltaSeen = false;
			let settled = false;
			let timeoutTimer = null;
			const finish = (error, result) => {
				if (settled) return;
				settled = true;
				if (timeoutTimer) {
					clearTimeout(timeoutTimer);
					timeoutTimer = null;
				}
				this.instructionRefineSession = this.instructionRefineSession && {
					...this.instructionRefineSession,
					abort: null,
				};
				if (error) reject(error);
				else resolve(result);
			};
			let proc = null;
			timeoutTimer = setTimeout(() => {
				terminateProcess(proc);
				finish(new Error(`Claude instruction refine timed out after ${AUXILIARY_INTERACTIVE_TASK_TIMEOUT_MS}ms`));
			}, AUXILIARY_INTERACTIVE_TASK_TIMEOUT_MS);
			try {
				proc = this.spawnProcess(command, args, {
					cwd: workspace,
					env,
					stdio: ['ignore', 'pipe', 'pipe'],
					windowsHide: true,
					shell: process.platform === 'win32' && !/[\\/]/.test(command),
				});
			}
			catch (error) {
				finish(error);
				return;
			}
			if (this.instructionRefineSession) {
				this.instructionRefineSession.abort = () => {
					terminateProcess(proc);
				};
			}
			createDecodedLineReader(proc.stdout, (line) => {
				let message = null;
				try {
					message = JSON.parse(line);
				}
				catch {
					output = appendLimitedText(output, line);
					return;
				}
				if (message?.session_id) {
					sessionId = message.session_id;
				}
				if (message?.type === 'stream_event') {
					const event = message.event || {};
					const delta = event.delta || {};
					if (event.type === 'content_block_delta' && delta.type === 'text_delta') {
						textDeltaSeen = true;
						output = appendLimitedText(output, delta.text || '');
					}
				}
				if (message?.type === 'assistant' && !textDeltaSeen) {
					output = appendLimitedText(output, extractClaudeTextFromMessage(message.message));
				}
				if (message?.type === 'result') {
					if (message.is_error || message.subtype === 'error') {
						stderr = appendLimitedText(stderr, message.result || message.error || 'Claude instruction refine error', PROCESS_STDERR_MAX_CHARS);
					}
					else if (!output && typeof message.result === 'string') {
						output = appendLimitedText('', message.result);
					}
				}
			});
			proc.stderr.on('data', (chunk) => {
				stderr = appendLimitedText(stderr, decodeProcessChunk(chunk), PROCESS_STDERR_MAX_CHARS);
			});
			proc.once('error', (error) => finish(error));
			proc.once('exit', (code, signal) => {
				if (code !== 0 && signal !== 'SIGTERM') {
					finish(new Error(stderr.trim() || `Claude instruction refine exited with ${code ?? signal ?? 'unknown status'}`));
					return;
				}
				finish(null, { text: output, sessionId });
			});
		});
	}

	async ensureCodexInstructionRefineSession(session) {
		if (session.codex?.transport && session.codex?.proc && !session.codex.proc.killed) {
			return session.codex;
		}
		const launchSpec = resolveCodexLaunchSpec(this.settings);
		try {
			fs.mkdirSync(launchSpec.cwd, { recursive: true });
		}
		catch (error) {
			if (launchSpec.method !== 'wsl') throw error;
		}
		const proc = this.spawnProcess(launchSpec.command, launchSpec.args, {
			cwd: launchSpec.cwd,
			env: launchSpec.env,
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
			shell: launchSpec.shell,
		});
		const transport = new CodexRpcTransport(proc);
		const codex = {
			proc,
			transport,
			threadId: '',
			pending: null,
		};
		session.codex = codex;
		proc.stderr.on('data', () => {});
		proc.once('exit', () => {
			if (codex.pending) {
				codex.pending.error = codex.pending.error || 'Codex instruction refine process exited unexpectedly';
				codex.pending.resolve();
			}
			transport.dispose();
		});
		transport.start();
		transport.onNotification('item/agentMessage/delta', (params) => {
			if (codex.pending) {
				codex.pending.text = appendLimitedText(codex.pending.text, params?.delta || '');
			}
		});
		transport.onNotification('turn/completed', (params) => {
			if (params?.turn?.status === 'failed' && params?.turn?.error?.message && codex.pending) {
				codex.pending.error = params.turn.error.message;
			}
			codex.pending?.resolve();
		});
		transport.onNotification('error', (params) => {
			if (codex.pending && !params?.willRetry) {
				codex.pending.error = params?.error?.message || 'Codex instruction refine error';
				codex.pending.resolve();
			}
		});
		await transport.request('initialize', {
			clientInfo: { name: 'pdf-ai-claudian-instruction-refine', version: '0.1.0' },
			capabilities: { experimentalApi: true },
		});
		transport.notify('initialized');
		const model = String(session.modelOverride || '').trim() || this.resolveModel({});
		const thread = await transport.request('thread/start', {
			model,
			cwd: launchSpec.targetWorkspace || this.settings.workspace,
			approvalPolicy: 'never',
			sandbox: 'read-only',
			baseInstructions: buildRefineSystemPrompt(session.existingInstructions),
			experimentalRawEvents: true,
			persistExtendedHistory: false,
		}, 60000);
		codex.threadId = thread?.thread?.id || '';
		if (!codex.threadId) {
			throw new Error('Codex did not return an instruction refine thread id');
		}
		return codex;
	}

	async runCodexInstructionRefineQuery(prompt, session) {
		const codex = await this.ensureCodexInstructionRefineSession(session);
		const donePromise = new Promise((resolve) => {
			codex.pending = { text: '', error: '', resolve };
		});
		const turn = await codex.transport.request('turn/start', {
			threadId: codex.threadId,
			input: [{ type: 'text', text: prompt }],
			model: String(session.modelOverride || '').trim() || this.resolveModel({}),
		}, 60000);
		if (this.instructionRefineSession) {
			this.instructionRefineSession.abort = () => {
				codex.transport.request('turn/interrupt', {
					threadId: codex.threadId,
					turnId: turn?.turn?.id || '',
				}).catch(() => {});
			};
		}
		let timeoutTimer = null;
		try {
			await Promise.race([
				donePromise,
				new Promise((_, reject) => {
					timeoutTimer = setTimeout(() => {
						if (codex.pending) {
							codex.pending.error = `Codex instruction refine timed out after ${AUXILIARY_INTERACTIVE_TASK_TIMEOUT_MS}ms`;
							codex.pending.resolve();
						}
						this.instructionRefineSession?.abort?.();
						reject(new Error(`Codex instruction refine timed out after ${AUXILIARY_INTERACTIVE_TASK_TIMEOUT_MS}ms`));
					}, AUXILIARY_INTERACTIVE_TASK_TIMEOUT_MS);
				}),
			]);
		}
		finally {
			if (timeoutTimer) {
				clearTimeout(timeoutTimer);
			}
		}
		const pending = codex.pending || { text: '', error: 'Codex instruction refine did not complete' };
		codex.pending = null;
		if (pending.error) {
			throw new Error(pending.error);
		}
		return pending.text;
	}

	cleanupInstructionRefineSession() {
		const session = this.instructionRefineSession;
		if (!session) return;
		try {
			if (typeof session.abort === 'function') {
				session.abort();
			}
		}
		catch {
			// Best-effort cancellation only.
		}
		try {
			session.codex?.transport?.dispose?.();
			if (session.codex?.proc && !session.codex.proc.killed) {
				terminateProcess(session.codex.proc);
			}
		}
		catch {
			// Best-effort cleanup only.
		}
		this.instructionRefineSession = null;
	}

	async handleStartInlineEdit(event, payload = {}) {
		this.webContents = event.sender;
		const request = payload.request && typeof payload.request === 'object' ? payload.request : {};
		const instruction = String(request.instruction || '').trim().slice(0, INLINE_EDIT_TEXT_MAX_CHARS);
		if (!instruction) {
			return { ok: false, error: 'Inline edit instruction is required' };
		}
		const provider = String(payload.provider || this.settings.provider || 'claude');
		this.cleanupInlineEditSession();
		this.inlineEditSession = {
			provider,
			request: {
				...request,
				instruction,
				contextFiles: Array.isArray(request.contextFiles)
					? request.contextFiles.map(String).filter(Boolean).slice(0, INLINE_EDIT_CONTEXT_FILES_MAX)
					: [],
			},
			hasConversation: false,
			claudeSessionId: null,
			codex: null,
		};
		return this.runInlineEditPrompt(buildInlineEditPrompt(this.inlineEditSession.request), this.inlineEditSession.request, null);
	}

	async handleContinueInlineEdit(event, payload = {}) {
		this.webContents = event.sender;
		if (!this.inlineEditSession?.hasConversation) {
			return { ok: false, error: 'No active inline edit conversation to continue' };
		}
		const message = String(payload.message || '').trim().slice(0, INLINE_EDIT_TEXT_MAX_CHARS);
		if (!message) {
			return { ok: false, error: 'Inline edit continuation is empty' };
		}
		const contextFiles = Array.isArray(payload.contextFiles)
			? payload.contextFiles.map(String).filter(Boolean).slice(0, INLINE_EDIT_CONTEXT_FILES_MAX)
			: [];
		if (contextFiles.length) {
			const existing = Array.isArray(this.inlineEditSession.request?.contextFiles)
				? this.inlineEditSession.request.contextFiles.map(String).filter(Boolean)
				: [];
			this.inlineEditSession.request = {
				...this.inlineEditSession.request,
				contextFiles: [...new Set([...existing, ...contextFiles])].slice(0, INLINE_EDIT_CONTEXT_FILES_MAX),
			};
		}
		return this.runInlineEditPrompt(appendContextFiles(message, contextFiles), this.inlineEditSession.request, message);
	}

	handleCancelInlineEdit() {
		this.cleanupInlineEditSession();
		return { ok: true };
	}

	async handleRewindClaudeFiles(event, payload = {}) {
		this.webContents = event.sender;
		const provider = String(payload.provider || this.settings.provider || '').trim() || 'claude';
		if (provider !== 'claude') {
			return { ok: false, error: 'Code rewind is only supported by Claude' };
		}
		const threadId = String(payload.threadId || '').trim().slice(0, CLAUDE_FILE_REWIND_ID_MAX_CHARS);
		const userMessageId = String(payload.userMessageId || '').trim().slice(0, CLAUDE_FILE_REWIND_ID_MAX_CHARS);
		if (!threadId) {
			return { ok: false, error: 'Claude session id is required for file rewind' };
		}
		if (!userMessageId) {
			return { ok: false, error: 'Claude user message id is required for file rewind' };
		}
		if (this.dryRun) {
			return {
				ok: true,
				dryRun: true,
				threadId,
				userMessageId,
				filesChanged: [],
				summary: `Dry-run Claude file rewind for ${userMessageId}`,
			};
		}
		return this.runClaudeFileRewind(threadId, userMessageId);
	}

	runClaudeFileRewind(threadId, userMessageId) {
		const workspace = this.settings.workspace || this.defaultWorkspace || process.cwd();
		fs.mkdirSync(workspace, { recursive: true });
		const command = resolveClaudeCommand(this.settings);
		const env = buildClaudeEnvironment(this.settings);
		const settingSources = resolveClaudeSettingSources(this.settings);
		const args = [
			'-p',
			'--resume',
			threadId,
			'--rewind-files',
			userMessageId,
			'--setting-sources',
			settingSources,
		];
		return new Promise((resolve) => {
			let stdout = '';
			let stderr = '';
			let settled = false;
			let timer = null;
			let proc = null;
			const finish = (result) => {
				if (settled) {
					return;
				}
				settled = true;
				if (timer) {
					clearTimeout(timer);
					timer = null;
				}
				resolve(result);
			};
			this.emit({ type: 'status', status: 'running', detail: 'Rewinding Claude file changes' });
			try {
				proc = this.spawnProcess(command, args, {
					cwd: workspace,
					env,
					stdio: ['ignore', 'pipe', 'pipe'],
					windowsHide: true,
					shell: process.platform === 'win32' && !/[\\/]/.test(command),
				});
			}
			catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				this.emit({ type: 'status', status: 'failed', detail: message });
				finish({ ok: false, error: message, threadId, userMessageId });
				return;
			}
			timer = setTimeout(() => {
				terminateProcess(proc);
				const message = `Claude file rewind timed out after ${CLAUDE_FILE_REWIND_TIMEOUT_MS}ms`;
				this.emit({ type: 'status', status: 'failed', detail: message });
				finish({ ok: false, error: message, threadId, userMessageId, stdout: stdout.trim() });
			}, CLAUDE_FILE_REWIND_TIMEOUT_MS);
			proc.stdout.on('data', (chunk) => {
				stdout = appendLimitedText(stdout, decodeProcessChunk(chunk));
			});
			proc.stderr.on('data', (chunk) => {
				stderr = appendLimitedText(stderr, decodeProcessChunk(chunk), PROCESS_STDERR_MAX_CHARS);
			});
			proc.once('error', (error) => {
				const message = error instanceof Error ? error.message : String(error);
				this.emit({ type: 'status', status: 'failed', detail: message });
				finish({ ok: false, error: message, threadId, userMessageId });
			});
			proc.once('exit', (code, signal) => {
				const summary = stdout.trim();
				const error = stderr.trim();
				if (code === 0) {
					this.emit({ type: 'status', status: 'ready', detail: summary || 'Claude files rewound' });
					finish({ ok: true, threadId, userMessageId, summary: summary || 'Claude files rewound' });
					return;
				}
				const message = error || summary || `Claude file rewind exited with ${code ?? signal ?? 'unknown status'}`;
				this.emit({ type: 'status', status: 'failed', detail: message });
				finish({ ok: false, error: message, threadId, userMessageId, stdout: summary });
			});
		});
	}

	async runInlineEditPrompt(prompt, request, continuationMessage) {
		const session = this.inlineEditSession || {
			provider: this.settings.provider,
			request,
			hasConversation: false,
			claudeSessionId: null,
			codex: null,
		};
		try {
			this.emit({ type: 'status', status: 'running', detail: `Inline edit via ${session.provider}` });
			let rawText = '';
			if (this.dryRun) {
				rawText = buildDryInlineEditText(request, continuationMessage);
			}
			else if (session.provider === 'claude') {
				const result = await this.runClaudeInlineEditQuery(prompt, session.claudeSessionId);
				rawText = result.text;
				session.claudeSessionId = result.sessionId || session.claudeSessionId;
			}
			else if (session.provider === 'codex') {
				rawText = await this.runCodexInlineEditQuery(prompt, session);
			}
			else {
				throw new Error(`Unsupported inline edit provider: ${session.provider}`);
			}
			const parsed = parseInlineEditResponse(rawText);
			session.hasConversation = true;
			this.inlineEditSession = session;
			this.emit({ type: 'status', status: 'ready', detail: 'Inline edit ready' });
			return {
				ok: parsed.success !== false,
				provider: session.provider,
				rawText,
				result: parsed,
				session: {
					hasConversation: session.hasConversation,
					claudeSessionId: session.claudeSessionId || '',
					codexThreadId: session.codex?.threadId || '',
				},
				error: parsed.error,
			};
		}
		catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.emit({ type: 'status', status: 'failed', detail: message });
			return { ok: false, error: message };
		}
	}

	runClaudeInlineEditQuery(prompt, resumeSessionId) {
		const workspace = this.settings.workspace || this.defaultWorkspace || process.cwd();
		fs.mkdirSync(workspace, { recursive: true });
		const command = resolveClaudeCommand(this.settings);
		const model = this.resolveModel({});
		const env = buildClaudeEnvironment(this.settings);
		const settingSources = resolveClaudeSettingSources(this.settings);
		const effort = resolveClaudeEffort(this.settings.effort, {
			model,
			settings: this.settings,
		});
		const args = [
			'-p',
			'--verbose',
			'--output-format',
			'stream-json',
			'--include-partial-messages',
			'--model',
			model,
			...(effort ? ['--effort', effort] : []),
			'--append-system-prompt',
			getInlineEditSystemPrompt(),
			'--setting-sources',
			settingSources,
			'--permission-mode',
			'bypassPermissions',
			'--dangerously-skip-permissions',
			'--allowedTools',
			INLINE_EDIT_READ_ONLY_TOOLS.join(','),
		];
		if (this.settings.claudeSafeMode === 'auto') {
			args.push('--enable-auto-mode');
		}
		if (resumeSessionId) {
			args.push('--resume', resumeSessionId);
		}
		args.push(prompt);

		return new Promise((resolve, reject) => {
			let output = '';
			let sessionId = resumeSessionId || '';
			let stderr = '';
			let textDeltaSeen = false;
			let settled = false;
			let timeoutTimer = null;
			const finish = (error, result) => {
				if (settled) return;
				settled = true;
				if (timeoutTimer) {
					clearTimeout(timeoutTimer);
					timeoutTimer = null;
				}
				this.inlineEditSession = this.inlineEditSession && {
					...this.inlineEditSession,
					abort: null,
				};
				if (error) reject(error);
				else resolve(result);
			};
			let proc = null;
			timeoutTimer = setTimeout(() => {
				terminateProcess(proc);
				finish(new Error(`Claude inline edit timed out after ${AUXILIARY_INTERACTIVE_TASK_TIMEOUT_MS}ms`));
			}, AUXILIARY_INTERACTIVE_TASK_TIMEOUT_MS);
			try {
				proc = this.spawnProcess(command, args, {
					cwd: workspace,
					env,
					stdio: ['ignore', 'pipe', 'pipe'],
					windowsHide: true,
					shell: process.platform === 'win32' && !/[\\/]/.test(command),
				});
			}
			catch (error) {
				finish(error);
				return;
			}
			if (this.inlineEditSession) {
				this.inlineEditSession.abort = () => {
					terminateProcess(proc);
				};
			}
			createDecodedLineReader(proc.stdout, (line) => {
				let message = null;
				try {
					message = JSON.parse(line);
				}
				catch {
					output = appendLimitedText(output, line);
					return;
				}
				if (message?.session_id) {
					sessionId = message.session_id;
				}
				if (message?.type === 'stream_event') {
					const event = message.event || {};
					const delta = event.delta || {};
					if (event.type === 'content_block_delta' && delta.type === 'text_delta') {
						textDeltaSeen = true;
						output = appendLimitedText(output, delta.text || '');
					}
				}
				if (message?.type === 'assistant' && !textDeltaSeen) {
					output = appendLimitedText(output, extractClaudeTextFromMessage(message.message));
				}
				if (message?.type === 'result') {
					if (message.is_error || message.subtype === 'error') {
						stderr = appendLimitedText(stderr, message.result || message.error || 'Claude inline edit error', PROCESS_STDERR_MAX_CHARS);
					}
					else if (!output && typeof message.result === 'string') {
						output = appendLimitedText('', message.result);
					}
				}
			});
			proc.stderr.on('data', (chunk) => {
				stderr = appendLimitedText(stderr, decodeProcessChunk(chunk), PROCESS_STDERR_MAX_CHARS);
			});
			proc.once('error', (error) => finish(error));
			proc.once('exit', (code, signal) => {
				if (code !== 0 && signal !== 'SIGTERM') {
					finish(new Error(stderr.trim() || `Claude inline edit exited with ${code ?? signal ?? 'unknown status'}`));
					return;
				}
				finish(null, { text: output, sessionId });
			});
		});
	}

	async ensureCodexInlineEditSession(session) {
		if (session.codex?.transport && session.codex?.proc && !session.codex.proc.killed) {
			return session.codex;
		}
		const launchSpec = resolveCodexLaunchSpec(this.settings);
		try {
			fs.mkdirSync(launchSpec.cwd, { recursive: true });
		}
		catch (error) {
			if (launchSpec.method !== 'wsl') throw error;
		}
		const proc = this.spawnProcess(launchSpec.command, launchSpec.args, {
			cwd: launchSpec.cwd,
			env: launchSpec.env,
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
			shell: launchSpec.shell,
		});
		const transport = new CodexRpcTransport(proc);
		const codex = {
			proc,
			transport,
			threadId: '',
			pending: null,
		};
		session.codex = codex;
		proc.stderr.on('data', () => {});
		proc.once('exit', () => {
			if (codex.pending) {
				codex.pending.error = codex.pending.error || 'Codex inline edit process exited unexpectedly';
				codex.pending.resolve();
			}
			transport.dispose();
		});
		transport.start();
		transport.onNotification('item/agentMessage/delta', (params) => {
			if (codex.pending) {
				codex.pending.text = appendLimitedText(codex.pending.text, params?.delta || '');
			}
		});
		transport.onNotification('turn/completed', (params) => {
			if (params?.turn?.status === 'failed' && params?.turn?.error?.message && codex.pending) {
				codex.pending.error = params.turn.error.message;
			}
			codex.pending?.resolve();
		});
		transport.onNotification('error', (params) => {
			if (codex.pending && !params?.willRetry) {
				codex.pending.error = params?.error?.message || 'Codex inline edit error';
				codex.pending.resolve();
			}
		});
		await transport.request('initialize', {
			clientInfo: { name: 'pdf-ai-claudian-inline-edit', version: '0.1.0' },
			capabilities: { experimentalApi: true },
		});
		transport.notify('initialized');
		const thread = await transport.request('thread/start', {
			model: this.resolveModel({}),
			cwd: launchSpec.targetWorkspace || this.settings.workspace,
			approvalPolicy: 'never',
			sandbox: 'read-only',
			baseInstructions: getInlineEditSystemPrompt(),
			experimentalRawEvents: true,
			persistExtendedHistory: false,
		}, 60000);
		codex.threadId = thread?.thread?.id || '';
		if (!codex.threadId) {
			throw new Error('Codex did not return an inline edit thread id');
		}
		return codex;
	}

	async runCodexInlineEditQuery(prompt, session) {
		const codex = await this.ensureCodexInlineEditSession(session);
		const donePromise = new Promise((resolve) => {
			codex.pending = { text: '', error: '', resolve };
		});
		const turn = await codex.transport.request('turn/start', {
			threadId: codex.threadId,
			input: [{ type: 'text', text: prompt }],
			model: this.resolveModel({}),
		}, 60000);
		if (this.inlineEditSession) {
			this.inlineEditSession.abort = () => {
				codex.transport.request('turn/interrupt', {
					threadId: codex.threadId,
					turnId: turn?.turn?.id || '',
				}).catch(() => {});
			};
		}
		let timeoutTimer = null;
		try {
			await Promise.race([
				donePromise,
				new Promise((_, reject) => {
					timeoutTimer = setTimeout(() => {
						if (codex.pending) {
							codex.pending.error = `Codex inline edit timed out after ${AUXILIARY_INTERACTIVE_TASK_TIMEOUT_MS}ms`;
							codex.pending.resolve();
						}
						this.inlineEditSession?.abort?.();
						reject(new Error(`Codex inline edit timed out after ${AUXILIARY_INTERACTIVE_TASK_TIMEOUT_MS}ms`));
					}, AUXILIARY_INTERACTIVE_TASK_TIMEOUT_MS);
				}),
			]);
		}
		finally {
			if (timeoutTimer) {
				clearTimeout(timeoutTimer);
			}
		}
		const pending = codex.pending || { text: '', error: 'Codex inline edit did not complete' };
		codex.pending = null;
		if (pending.error) {
			throw new Error(pending.error);
		}
		return pending.text;
	}

	cleanupInlineEditSession() {
		const session = this.inlineEditSession;
		if (!session) return;
		try {
			if (typeof session.abort === 'function') {
				session.abort();
			}
		}
		catch {
			// Best-effort cancellation only.
		}
		try {
			session.codex?.transport?.dispose?.();
			if (session.codex?.proc && !session.codex.proc.killed) {
				terminateProcess(session.codex.proc);
			}
		}
		catch {
			// Best-effort cleanup only.
		}
		this.inlineEditSession = null;
	}

	async handlePickWorkspace(event) {
		const browserWindow = event.sender.getOwnerBrowserWindow();
		const result = await dialog.showOpenDialog(browserWindow, {
			properties: ['openDirectory', 'createDirectory'],
			title: 'Choose AI sidebar workspace',
		});
		if (result.canceled || !result.filePaths?.[0]) {
			return { ok: false };
		}
		return { ok: true, path: result.filePaths[0] };
	}

	requiresRestart(previous, next) {
		return previous.provider !== next.provider
			|| previous.workspace !== next.workspace
			|| previous.locale !== next.locale
			|| previous.codexPath !== next.codexPath
			|| previous.codexInstallationMethod !== next.codexInstallationMethod
			|| previous.codexWslDistroOverride !== next.codexWslDistroOverride
			|| previous.codexHome !== next.codexHome
			|| previous.claudePath !== next.claudePath
			|| previous.openaiModel !== next.openaiModel
			|| previous.claudeSafeMode !== next.claudeSafeMode
			|| previous.claudeEnableChrome !== next.claudeEnableChrome
			|| previous.claudeEnableBangBash !== next.claudeEnableBangBash
			|| previous.envText !== next.envText
			|| previous.systemPrompt !== next.systemPrompt;
	}

	publicSettings() {
		return { ...this.settings };
	}

	getStatus() {
		return {
			provider: this.settings.provider,
			ready: this.settings.provider === 'claude'
				? true
				: !!this.transport && !!this.proc && !this.proc.killed,
			workspace: this.settings.workspace,
			threadId: this.threadId,
			currentTurnId: this.currentTurnId,
			activeSessionKey: this.activeSessionKey,
		};
	}

	recordRuntimeModel(providerId, model, meta = {}) {
		const provider = providerId === 'codex' ? 'codex' : 'claude';
		const value = String(model || '').trim();
		if (!value) return;
		this.emit({
			type: 'model',
			provider,
			model: value,
			label: provider === 'codex' ? formatCodexModelLabel(value) : formatClaudeModelLabel(value),
			configuredModel: this.settings.model || '',
			sessionKey: meta.sessionKey || this.activeSessionKey || '',
			threadId: meta.threadId || this.threadId || '',
		});
	}

	normalizeSessionKey(payload) {
		return String(payload?.sessionKey || 'default').trim() || 'default';
	}

	providerSessionKey(sessionKey) {
		return `${this.settings.provider}:${sessionKey}`;
	}

	clearProviderSessions(providerId) {
		const provider = String(providerId || '').trim();
		if (!provider) return 0;
		const prefix = `${provider}:`;
		let count = 0;
		for (const key of Array.from(this.sessions.keys())) {
			if (!key.startsWith(prefix)) continue;
			this.sessions.delete(key);
			count += 1;
		}
		return count;
	}

	getSessionState(sessionKey) {
		return this.sessions.get(this.providerSessionKey(sessionKey)) || {};
	}

	getSessionThreadId(sessionKey, payload) {
		const mapKey = this.providerSessionKey(sessionKey);
		const hinted = String(payload?.threadId || '').trim();
		if (hinted) {
			this.sessions.set(mapKey, { ...this.getSessionState(sessionKey), threadId: hinted });
			return hinted;
		}
		return this.getSessionState(sessionKey)?.threadId || null;
	}

	setSessionThreadId(sessionKey, threadId, options = {}) {
		const id = String(threadId || '').trim();
		if (!id) {
			return;
		}
		const next = { ...this.getSessionState(sessionKey), threadId: id };
		if (Object.prototype.hasOwnProperty.call(options, 'needsHistoryRebuild')) {
			next.needsHistoryRebuild = options.needsHistoryRebuild === true;
		}
		this.sessions.set(this.providerSessionKey(sessionKey), next);
		this.threadId = id;
	}

	clearSessionHistoryRebuild(sessionKey) {
		const state = this.getSessionState(sessionKey);
		if (!state.needsHistoryRebuild) {
			return;
		}
		this.sessions.set(this.providerSessionKey(sessionKey), { ...state, needsHistoryRebuild: false });
	}

	normalizeForkPayload(payload) {
		const fork = payload?.fork;
		if (!fork || typeof fork !== 'object') {
			return null;
		}
		const providerId = String(fork.providerId || this.settings.provider || '').trim();
		const sourceThreadId = String(fork.sourceThreadId || fork.threadId || '').trim();
		const resumeAt = String(fork.resumeAt || '').trim();
		if (!sourceThreadId || providerId !== this.settings.provider) {
			return null;
		}
		return {
			providerId,
			sourceThreadId,
			resumeAt,
			sourceSessionKey: String(fork.sourceSessionKey || '').trim(),
		};
	}

	normalizeResumeAtPayload(payload) {
		if (payload?.fork) {
			return '';
		}
		return String(payload?.resumeAt || payload?.resumeCheckpoint || '').trim();
	}

	buildCodexThreadOptions(payload) {
		const sandbox = resolveSandboxConfig(this.settings, {
			externalContextPaths: payload?.externalContextPaths,
		});
		const model = this.resolveModel(payload);
		return {
			model,
			approvalPolicy: sandbox.approvalPolicy,
			sandbox: sandbox.sandbox,
			serviceTier: resolveCodexServiceTier(this.settings, model),
			baseInstructions: this.settings.systemPrompt || undefined,
			experimentalRawEvents: true,
			persistExtendedHistory: true,
		};
	}

	async resumeCodexThread(threadId, payload) {
		const result = await this.transport.request('thread/resume', {
			threadId,
			...this.buildCodexThreadOptions(payload),
		}, 60000);
		this.loadedThreadId = threadId;
		return result;
	}

	async prepareCodexFork(sessionKey, payload, fork) {
		const forkResult = await this.transport.request('thread/fork', {
			threadId: fork.sourceThreadId,
		}, 60000);
		const threadId = forkResult?.thread?.id || '';
		if (!threadId) {
			throw new Error('Codex did not return a forked thread id');
		}
		this.setSessionThreadId(sessionKey, threadId);
		await this.resumeCodexThread(threadId, payload);

		let rollbackCount = 0;
		if (fork.resumeAt) {
			const turns = Array.isArray(forkResult?.thread?.turns) ? forkResult.thread.turns : [];
			const checkpointIndex = turns.findIndex((turn) => turn?.id === fork.resumeAt);
			if (checkpointIndex < 0) {
				throw new Error(`Fork checkpoint not found: ${fork.resumeAt}`);
			}
			rollbackCount = Math.max(0, turns.length - checkpointIndex - 1);
			if (rollbackCount > 0) {
				await this.transport.request('thread/rollback', {
					threadId,
					numTurns: rollbackCount,
				}, 60000);
			}
		}

		this.emit({
			type: 'thread',
			provider: this.settings.provider,
			sessionKey,
			threadId,
			fork: {
				sourceThreadId: fork.sourceThreadId,
				resumeAt: fork.resumeAt,
				rollbackCount,
			},
		});
		return threadId;
	}

	setCodexReasoningEffort(value) {
		const effort = normalizeRuntimeEffort(value);
		this.codexReasoningEffort = effort;
		return effort;
	}

	async buildCodexRuntimeLaunchSpec() {
		return resolveCodexLaunchSpec(this.settings);
	}

	async ensureCodex() {
		if (this.settings.provider !== 'codex') {
			throw new Error('Only Codex runtime is implemented in this migration slice.');
		}
		if (
			this.transport
			&& !this.transport.closed
			&& this.proc
			&& !this.proc.killed
			&& this.proc.exitCode === null
		) {
			return;
		}
		if (this.transport || this.proc) {
			this.transport?.dispose();
			if (this.proc && !this.proc.killed) {
				terminateProcess(this.proc);
			}
			this.transport = null;
			this.proc = null;
		}

		const launchSpec = await this.buildCodexRuntimeLaunchSpec();
		try {
			fs.mkdirSync(launchSpec.cwd, { recursive: true });
		}
		catch (error) {
			if (launchSpec.method !== 'wsl') {
				throw error;
			}
		}

		this.emit({ type: 'status', status: 'starting', detail: `Starting ${launchSpec.displayCommand}` });
		this.proc = this.spawnProcess(launchSpec.command, launchSpec.args, {
			cwd: launchSpec.cwd,
			env: launchSpec.env,
			stdio: ['pipe', 'pipe', 'pipe'],
			windowsHide: true,
			shell: launchSpec.shell,
		});
		const proc = this.proc;
		let transport = null;
		proc.stderr.on('data', (chunk) => {
			const text = decodeProcessChunk(chunk).trim();
			if (text) {
				this.emit({ type: 'stderr', content: text });
			}
		});
		proc.once('exit', (code, signal) => {
			transport?.dispose();
			if (this.proc !== proc) {
				return;
			}
			this.emit({
				type: 'status',
				status: 'stopped',
				detail: `Codex app-server exited (${code ?? signal ?? 'unknown'})`,
			});
			this.cleanupCodexProcessState(`Codex app-server exited (${code ?? signal ?? 'unknown'})`);
			this.transport = null;
			this.proc = null;
			this.threadId = null;
			this.currentTurnId = null;
			this.activeSessionKey = null;
			this.loadedThreadId = null;
		});
		proc.once('error', (error) => {
			this.emit({ type: 'error', content: error.message || String(error) });
		});

		transport = new CodexRpcTransport(proc);
		this.transport = transport;
		transport.start();
		for (const method of NOTIFICATION_METHODS) {
			this.transport.onNotification(method, (params) => this.handleNotification(method, params));
		}
		for (const method of SERVER_REQUEST_METHODS) {
			this.transport.onRequest(method, (params, meta) => this.handleServerRequest(method, params, meta));
		}

		const init = await this.transport.request('initialize', {
			clientInfo: { name: 'pdf-ai-claudian-sidebar', version: '0.1.0' },
			capabilities: { experimentalApi: true },
		});
		this.transport.notify('initialized');
		this.emit({ type: 'status', status: 'ready', detail: init?.userAgent || 'Codex ready' });
		this.emitProviderAssetsForWorkspace(this.settings.workspace || this.defaultWorkspace, {
			forceReload: true,
		}).catch(() => {});
	}

	cleanupCodexProcessState(reason = 'Codex app-server exited before the request was answered.') {
		if (this.currentTurnId) {
			this.cleanupTurnTempDir(this.currentTurnId);
		}
		this.resolvePendingCodexApprovals('cancel', reason, this.threadId);
		this.activeToolIds.clear();
		this.pendingTurnNotifications = [];
		this.resetCodexTurnState();
	}

	resolveCodexRepoHostRoot() {
		const workspace = this.settings.workspace || this.defaultWorkspace || process.cwd();
		try {
			const providerSkillRoot = this.resolveProviderSkillRoot(workspace);
			if (providerSkillRoot) {
				return providerSkillRoot;
			}
		}
		catch {
			// Fall through to the active workspace.
		}
		return workspace;
	}

	resolveCodexRepoTargetRoot() {
		const hostRoot = this.resolveCodexRepoHostRoot();
		return mapCodexHostPathToTarget(this.settings, hostRoot)
			|| resolveCodexTargetWorkspace(this.settings)
			|| this.defaultWorkspace
			|| process.cwd();
	}

	resolveCodexSkillListCwds() {
		const candidates = [
			this.resolveCodexRepoTargetRoot(),
			resolveCodexTargetWorkspace(this.settings),
			this.defaultWorkspace,
		].map((entry) => String(entry || '').trim()).filter(Boolean);
		const seen = new Set();
		return candidates.filter((entry) => {
			const key = normalizePathForComparison(entry);
			if (!key || seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}

	async ensureThread(sessionKey = 'default', payload = {}) {
		const existingThreadId = this.getSessionThreadId(sessionKey, payload);
		if (existingThreadId) {
			this.threadId = existingThreadId;
			if (this.transport && this.loadedThreadId !== existingThreadId) {
				await this.resumeCodexThread(existingThreadId, payload);
			}
			this.emit({ type: 'thread', provider: this.settings.provider, sessionKey, threadId: existingThreadId });
			return existingThreadId;
		}
		const result = await this.transport.request('thread/start', {
			cwd: this.resolveCodexRepoTargetRoot(),
			...this.buildCodexThreadOptions(payload),
		}, 60000);
		this.threadId = result?.thread?.id || null;
		if (!this.threadId) {
			throw new Error('Codex did not return a thread id');
		}
		this.setSessionThreadId(sessionKey, this.threadId);
		this.loadedThreadId = this.threadId;
		this.emit({ type: 'thread', provider: this.settings.provider, sessionKey, threadId: this.threadId, thread: result.thread });
		return this.threadId;
	}

	resolveModel(payload) {
		return resolveRuntimeModelForProvider(this.settings.provider, this.settings, payload);
	}

	async resolveCodexSkillInputs(text) {
		const skillNames = extractExplicitCodexSkillNames(text);
		if (skillNames.length === 0 || !this.transport) {
			return [];
		}
		try {
			const cwds = this.resolveCodexSkillListCwds();
			const forceReload = this.codexSkillForceReloadOnNextResolve === true;
			this.codexSkillForceReloadOnNextResolve = false;
			const result = await this.transport.request('skills/list', {
				cwds,
				...(forceReload ? { forceReload: true } : {}),
			}, 60000);
			const entries = Array.isArray(result?.data) ? result.data : [];
			const orderedSkills = [];
			for (const cwd of cwds) {
				const entry = entries.find((item) => normalizePathForComparison(item?.cwd) === normalizePathForComparison(cwd));
				if (entry && Array.isArray(entry.skills)) {
					orderedSkills.push(...entry.skills);
				}
			}
			for (const entry of entries) {
				if (Array.isArray(entry?.skills)) {
					orderedSkills.push(...entry.skills);
				}
			}
			return skillNames
				.map((name) => findPreferredCodexSkillByName(orderedSkills, name))
				.filter(Boolean)
				.map((skill) => ({
					type: 'skill',
					name: skill.name,
					path: skill.path,
				}));
		}
		catch {
			return [];
		}
	}

	handleDryRunTurn(payload, text) {
		const provider = this.settings.provider;
		const sessionKey = this.normalizeSessionKey(payload);
		const env = parseEnvText(this.settings.envText);
		const envKeys = Object.keys(env).sort();
		const envKeyText = envKeys.length ? envKeys.map((key) => `\`${key}\``).join(', ') : '(none)';
		const model = this.resolveModel(payload);
		const serviceTier = provider === 'codex' ? resolveCodexServiceTier(this.settings, model) : null;
		const sandbox = resolveSandboxConfig(this.settings);
		const prompt = String(this.settings.systemPrompt || '');
		const codexLaunch = provider === 'codex' ? resolveCodexLaunchSpec(this.settings) : null;
		const isCompact = isCompactCommand(text);
		const fork = this.normalizeForkPayload(payload);
		const resumeAt = provider === 'claude' ? this.normalizeResumeAtPayload(payload) : '';
		const isBangBash = provider === 'claude' && this.settings.claudeEnableBangBash !== false && text.trim().startsWith('!');
		const forkRoute = fork
			? provider === 'codex'
				? `thread/fork -> thread/resume${fork.resumeAt ? ' -> thread/rollback' : ''} -> turn/start`
				: provider === 'claude'
					? `claude-cli --resume --fork-session${fork.resumeAt ? ' --resume-session-at' : ''}`
					: ''
			: '';
		const resumeRoute = resumeAt ? 'claude-cli --resume --resume-session-at' : '';
		const route = isBangBash ? 'bang-bash/local-shell' : forkRoute || resumeRoute || (provider === 'codex' && isCompact ? 'thread/compact/start' : provider === 'claude' && isCompact ? 'claude-cli-compact' : 'turn/start');
		const shouldCompletePlan = provider === 'codex' && this.settings.permissionMode === 'plan' && /plan/i.test(text) && !isCompact;
		const threadId = fork
			? makeDryRunThreadId(provider, sessionKey, true)
			: this.getSessionThreadId(sessionKey, payload) || makeDryRunThreadId(provider, sessionKey, false);
		this.setSessionThreadId(sessionKey, threadId);
		this.activeSessionKey = sessionKey;
		this.currentTurnId = `dry-${provider}-turn-${Date.now()}`;
		if (provider === 'codex') {
			this.resetCodexTurnState();
		}
		this.emit({ type: 'status', status: 'ready', detail: `Dry-run ${provider} runtime ready` });
		this.emit({ type: 'thread', provider, sessionKey, threadId });
		this.emit({ type: 'turn-started', sessionKey, threadId, turnId: this.currentTurnId });
		this.emit({
			type: 'chunk',
			chunk: {
				type: 'text',
				content: [
					'Runtime dry run',
					`provider: ${provider}`,
					`session key: ${sessionKey}`,
					`thread id: ${threadId}`,
					`route: ${route}`,
					fork ? `fork source: ${fork.sourceThreadId}` : '',
					fork?.resumeAt ? `fork checkpoint: ${fork.resumeAt}` : '',
					resumeAt ? `resume checkpoint: ${resumeAt}` : '',
					`model: ${model}`,
					`permission mode: ${this.settings.permissionMode}`,
					`sandbox: ${this.settings.sandbox}`,
					`approval policy: ${sandbox.approvalPolicy}`,
					`reasoning effort: ${normalizeRuntimeEffort(payload.effort || this.settings.effort)}`,
					`reasoning summary: ${payload.reasoningSummary || this.settings.reasoningSummary}`,
					codexLaunch ? `codex installation method: ${codexLaunch.method}` : '',
					codexLaunch ? `codex service tier: ${serviceTier || '(default)'}` : '',
					codexLaunch?.method === 'wsl' ? `codex wsl distro: ${this.settings.codexWslDistroOverride || '(default)'}` : '',
					codexLaunch ? `codex target cwd: ${codexLaunch.targetWorkspace || '(empty)'}` : '',
					codexLaunch ? `codex launch: \`${codexLaunch.displayCommand}\`` : '',
					`claude safe mode: ${this.settings.claudeSafeMode}`,
					`claude setting sources: ${resolveClaudeSettingSources(this.settings)}`,
					`claude chrome: ${this.settings.claudeEnableChrome ? 'enabled' : 'disabled'}`,
					`claude bang-bash: ${this.settings.claudeEnableBangBash ? 'enabled' : 'disabled'}`,
					`env keys: ${envKeyText}`,
					`images: ${Array.isArray(payload.images) ? payload.images.length : 0}`,
					'',
					'system prompt:',
					prompt || '(empty)',
					'',
					`echo: ${text}`,
				].join('\n'),
			},
		});
		if (isBangBash) {
			const command = text.trim().slice(1).trim();
			const toolId = `dry-bang-${Date.now()}`;
			this.emit({ type: 'chunk', chunk: { type: 'tool_use', id: toolId, name: 'Bash', input: { command, cwd: this.settings.workspace } } });
			this.emit({ type: 'chunk', chunk: { type: 'tool_result', id: toolId, name: 'Bash', result: `Dry-run local shell command: ${command || '(empty)'}` } });
		}
		if (/runtime tool diff/i.test(text)) {
			const editId = `dry-edit-${Date.now()}`;
			this.emit({
				type: 'chunk',
				chunk: {
					type: 'tool_use',
					id: editId,
					name: 'Edit',
					input: {
						file_path: 'electron/runtime-live.ts',
						old_string: 'const live = "old";',
						new_string: 'const live = "new";',
					},
				},
			});
			this.emit({
				type: 'chunk',
				chunk: {
					type: 'tool_result',
					id: editId,
					name: 'Edit',
					input: {
						file_path: 'electron/runtime-live.ts',
						old_string: 'const live = "old";',
						new_string: 'const live = "new";',
					},
					result: 'Edited electron/runtime-live.ts',
				},
			});
			const patchId = `dry-file-change-${Date.now()}`;
			const changes = [{
				path: 'electron/runtime-patch.ts',
				kind: 'update',
				diff: [
					'--- a/electron/runtime-patch.ts',
					'+++ b/electron/runtime-patch.ts',
					'@@ -1,2 +1,2 @@',
					' keepRuntimePatch();',
					'-oldRuntimePatch();',
					'+newRuntimePatch();',
				].join('\n'),
			}];
			this.emit({ type: 'chunk', chunk: { type: 'tool_use', id: patchId, name: 'apply_patch', input: { changes } } });
			this.emit({ type: 'chunk', chunk: { type: 'tool_result', id: patchId, name: 'apply_patch', input: { changes }, content: 'update: electron/runtime-patch.ts', result: 'update: electron/runtime-patch.ts' } });
		}
		if (/runtime approval blocked/i.test(text)) {
			const approvalToolId = `dry-approval-blocked-${Date.now()}`;
			this.emit({
				type: 'chunk',
				chunk: {
					type: 'tool_use',
					id: approvalToolId,
					name: 'Bash',
					input: { command: 'npm install', cwd: this.settings.workspace },
				},
			});
			this.emit({
				type: 'chunk',
				chunk: {
					type: 'tool_result',
					id: approvalToolId,
					name: 'Bash',
					input: { command: 'npm install', cwd: this.settings.workspace },
					content: 'This command requires approval',
					result: 'This command requires approval',
				},
			});
		}
		if (provider === 'codex' && /stale approval response/i.test(text) && !isCompact) {
			const requestId = `dry-stale-approval-${Date.now()}`;
			void this.requestApproval({
				kind: 'command',
				title: 'Execute command?',
				description: 'Smoke test approval response failure',
				tool: 'Bash',
				icon: 'terminal',
				input: {
					command: 'npm test',
					cwd: this.settings.workspace,
				},
			}, { requestId, threadId });
		}
		if (isCompact) {
			this.emit({ type: 'chunk', chunk: { type: 'context_compacted' } });
		}
		if (shouldCompletePlan) {
			const plan = '1. Confirm the requested behavior.\n2. Apply the implementation.\n3. Run the focused smoke checks.';
			this.emit({ type: 'chunk', chunk: { type: 'plan_update', content: plan } });
			this.emit({ type: 'chunk', chunk: { type: 'plan_completed', plan } });
		}
		if (provider === 'codex' && /auto[- ]?resolve approval/i.test(text) && !isCompact) {
			const requestId = `dry-request-${Date.now()}`;
			void this.requestApproval({
				kind: 'question',
				title: 'Codex asks',
				description: 'Codex needs more input.',
				input: {},
				questions: [{
					id: 'confirm',
					header: 'Confirm',
					question: 'Should this pending request disappear when Codex resolves it?',
					options: [{ label: 'Yes', value: 'yes', description: 'The runtime resolved the request.' }],
				}],
			}, { requestId, threadId });
			setTimeout(() => this.handleServerRequestResolved({ requestId, threadId, status: 'dry-run' }), 600);
		}
		this.emit({ type: 'done', sessionKey });
		const turnId = this.currentTurnId;
		this.currentTurnId = null;
		this.activeSessionKey = null;
		return { ok: true, sessionKey, threadId, turnId, dryRun: true };
	}

	buildFirstTurnCliPreflightKey() {
		return [
			this.settings.provider,
			this.settings.codexPath || '',
			this.settings.codexInstallationMethod || '',
			this.settings.codexWslDistroOverride || '',
			this.settings.claudePath || '',
			this.settings.workspace || '',
		].join('|');
	}

	formatCliProbeLine(label, status) {
		const ok = status?.ok === true;
		const command = String(status?.command || '').trim() || '(empty)';
		const version = String(status?.version || '').trim();
		const suffix = ok ? (version ? `：${version}` : '：可用') : `：不可用${status?.error ? `（${status.error}）` : ''}`;
		return `${label} ${command}${suffix}`;
	}

	async applyInstalledCodexSettings(executable, options = {}) {
		const previous = this.settings;
		const activateCodex = options.activateCodex !== false;
		const next = normalizeSettings({
			...this.settings,
			provider: activateCodex ? 'codex' : this.settings.provider,
			codexInstallationMethod: 'native-windows',
			codexPath: executable,
		}, this.defaultWorkspace);
		const restartNeeded = this.requiresRestart(previous, next);
		const hasActiveRuntime = Boolean(
			this.proc
			|| this.transport
			|| this.claudeSdkQuery
			|| this.claudeAbortController,
		);
		this.settings = next;
		writeJsonFile(this.settingsPath, this.settings);
		if (restartNeeded && hasActiveRuntime) {
			await this.shutdown({ unregisterIpc: false });
		}
		this.clearProviderSessions('codex');
		this.emit({ type: 'settings', settings: this.publicSettings(), status: this.getStatus() });
		void this.emitProviderAssetsForWorkspace(this.settings.workspace || this.defaultWorkspace, { forceReload: true });
		return { ok: true, settings: this.publicSettings(), restarted: restartNeeded && hasActiveRuntime };
	}

	emitCodexDownloadProgress(progress = {}) {
		const defaultInfo = getCodexDownloadInfo(this.settings);
		const totalBytes = Number(progress.totalBytes || defaultInfo.expectedBytes) || defaultInfo.expectedBytes;
		const downloadedBytes = Number(progress.downloadedBytes || 0) || 0;
		const percent = Number.isFinite(Number(progress.percent))
			? Math.max(0, Math.min(100, Number(progress.percent)))
			: Math.max(0, Math.min(100, downloadedBytes / totalBytes * 100));
		this.emit({
			type: 'codex-download',
			version: CODEX_DOWNLOAD_VERSION,
			platform: CODEX_DOWNLOAD_PLATFORM,
			expectedSha256: defaultInfo.expectedSha256,
			expectedIntegrity: defaultInfo.expectedIntegrity,
			expectedHashAlgorithm: defaultInfo.expectedHashAlgorithm,
			installPath: getManagedCodexPaths().targetExecutable,
			...progress,
			totalBytes,
			downloadedBytes,
			percent,
		});
	}

	async installBundledCodexCli(options = {}) {
		if (!this.cliInstallInProgress) {
			this.cliInstallInProgress = Promise.resolve()
				.then(() => downloadAndInstallManagedCodex(
					this.settings,
					(progress) => this.emitCodexDownloadProgress(progress),
				))
				.catch((error) => {
					this.emitCodexDownloadProgress({
						stage: 'failed',
						error: error instanceof Error ? error.message : String(error),
						totalBytes: getCodexDownloadInfo(this.settings).expectedBytes,
					});
					throw error;
				})
				.finally(() => {
					this.cliInstallInProgress = null;
				});
		}
		const executable = await this.cliInstallInProgress;
		await this.applyInstalledCodexSettings(executable, options);
		return executable;
	}

	async installAndProbeBundledCodexCli(statuses = {}, options = {}) {
		const downloadInfo = getCodexDownloadInfo(this.settings);
		const upgrade = options.upgrade === true;
		const previousVersion = String(options.previousVersion || '').trim();
		this.emit({
			type: 'status',
			status: 'starting',
			detail: upgrade
				? `Updating Codex CLI ${previousVersion || 'older version'} -> ${downloadInfo.version} (${(downloadInfo.expectedBytes / 1024 / 1024).toFixed(2)} MiB from ${downloadInfo.sources[0]?.label || 'configured source'})...`
				: `Preparing Codex CLI ${downloadInfo.version} download (${(downloadInfo.expectedBytes / 1024 / 1024).toFixed(2)} MiB from ${downloadInfo.sources[0]?.label || 'configured source'})...`,
		});
		const executable = await this.installBundledCodexCli({
			activateCodex: options.activateCodex !== false,
		});
		const probe = this.probeCodexCli(this.settings);
		if (!probe.ok) {
			throw new Error(probe.error || 'Installed Codex CLI failed runtime check.');
		}
		this.log(upgrade ? 'runtime.cliPreflight.codexUpdated' : 'runtime.cliPreflight.codexInstalled', {
			executable,
			previousVersion,
			version: probe.version,
			downloaded: true,
		});
		return { ok: true, installed: true, upgraded: upgrade, executable, probe, statuses };
	}

	maybeUpdateManagedCodexCli() {
		if (this.codexVersionUpdateInProgress) {
			return this.codexVersionUpdateInProgress;
		}
		if (!this.registered || this.dryRun) {
			return Promise.resolve({ ok: true, skipped: true, reason: 'runtime-inactive' });
		}
		const hasActiveRuntime = () => Boolean(
			this.proc
			|| this.transport
			|| this.claudeSdkQuery
			|| this.claudeAbortController,
		);
		const pending = Promise.resolve()
			.then(async () => {
				if (!this.registered || this.dryRun) {
					return { ok: true, skipped: true, reason: 'runtime-inactive' };
				}
				if (hasActiveRuntime()) {
					this.log('runtime.cliBackgroundUpdate.deferred', { reason: 'runtime-active' });
					return { ok: true, skipped: true, reason: 'runtime-active' };
				}
				const statuses = {
					codex: this.probeCodexCli(this.settings),
				};
				const upgrade = getCodexUpgradePlan(this.settings, statuses.codex);
				if (!upgrade.automatic) {
					if (upgrade.available) {
						this.log('runtime.cliBackgroundUpdate.available', upgrade);
					}
					return { ok: true, skipped: true, upgrade };
				}
				if (hasActiveRuntime()) {
					this.log('runtime.cliBackgroundUpdate.deferred', { reason: 'runtime-active' });
					return { ok: true, skipped: true, reason: 'runtime-active', upgrade };
				}
				this.log('runtime.cliBackgroundUpdate.start', {
					installedVersion: upgrade.installedVersion,
					targetVersion: upgrade.targetVersion,
					command: statuses.codex.command,
				});
				const result = await this.installAndProbeBundledCodexCli(statuses, {
					upgrade: true,
					previousVersion: upgrade.installedVersion,
					// A background maintenance update must not switch a Claude session to Codex.
					activateCodex: false,
				});
				if (result.ok) {
					this.firstTurnCliPreflightKeys.clear();
					this.log('runtime.cliBackgroundUpdate.updated', {
						installedVersion: upgrade.installedVersion,
						targetVersion: upgrade.targetVersion,
					});
				}
				return { ...result, background: true, upgrade };
			})
			.catch((error) => {
				const message = error instanceof Error ? error.message : String(error);
				this.log('runtime.cliBackgroundUpdate.failed', { error: logPreview(message) });
				this.emit({
					type: 'status',
					status: 'ready',
					detail: `Codex CLI update failed; continuing with the currently installed version.`,
				});
				return { ok: false, background: true, error: message };
			})
			.finally(() => {
				this.codexVersionUpdateInProgress = null;
			});
		this.codexVersionUpdateInProgress = pending;
		return pending;
	}

	async promptInstallBundledCodex(event, statuses, options = {}) {
		const browserWindow = event?.sender?.getOwnerBrowserWindow?.() || null;
		const downloadInfo = getCodexDownloadInfo(this.settings);
		const detail = [
			'首次问答前检测到当前机器没有可用的 Codex CLI。',
			'软件将通过 HTTPS 下载官方 Codex CLI，校验 SHA256 后解压到用户目录，不需要 Node.js、npm、curl 或其他编程工具。',
			'',
			this.formatCliProbeLine('Codex', statuses.codex),
			this.formatCliProbeLine('Claude', statuses.claude),
			'',
			`版本：${downloadInfo.version}`,
			`下载大小：${(downloadInfo.expectedBytes / 1024 / 1024).toFixed(2)} MiB`,
			`下载源：${downloadInfo.sources.map((source) => source.label).join(' -> ')}`,
			`安装位置：${downloadInfo.targetExecutable}`,
		].join('\n');
		const choice = await dialog.showMessageBox(browserWindow, {
			type: 'warning',
			buttons: [options.switchProvider ? '下载 Codex 并切换' : '下载并安装 Codex CLI', '取消发送'],
			defaultId: 0,
			cancelId: 1,
			noLink: true,
			message: 'Codex CLI 未就绪',
			detail,
		});
		if (choice.response !== 0) {
			return { ok: false, error: 'Codex CLI installation was cancelled.' };
		}
		try {
			return await this.installAndProbeBundledCodexCli(statuses);
		}
		catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			await dialog.showMessageBox(browserWindow, {
				type: 'error',
				buttons: ['取消发送'],
				defaultId: 0,
				cancelId: 0,
				noLink: true,
				message: 'Codex CLI 下载或安装失败',
				detail: message,
			});
			return { ok: false, error: message };
		}
	}

	async promptMissingClaudeCli(event, statuses) {
		const browserWindow = event?.sender?.getOwnerBrowserWindow?.() || null;
		const canSwitchToBundledCodex = process.platform === 'win32' && process.arch === 'x64';
		const detail = [
			'当前选择的是 Claude，但没有检测到可用的 Claude Code CLI。',
			'此版本不再把 Claude Code CLI 作为内置运行时；可以安装官方 Claude Code 后在设置里填写路径，或下载 Codex 后切换。',
			'',
			this.formatCliProbeLine('Claude', statuses.claude),
			this.formatCliProbeLine('Codex', statuses.codex),
		].join('\n');
		const choice = await dialog.showMessageBox(browserWindow, {
			type: 'warning',
			buttons: canSwitchToBundledCodex ? ['下载 Codex 并切换', '取消发送'] : ['取消发送'],
			defaultId: 0,
			cancelId: canSwitchToBundledCodex ? 1 : 0,
			noLink: true,
			message: 'Claude Code CLI 未就绪',
			detail,
		});
		if (!canSwitchToBundledCodex || choice.response !== 0) {
			return { ok: false, error: 'Claude Code CLI is not available.' };
		}
		return this.promptInstallBundledCodex(event, statuses, { switchProvider: true });
	}

	async ensureCliReadyForFirstTurn(event) {
		const pendingCodexUpdate = this.codexVersionUpdateInProgress;
		if (pendingCodexUpdate) {
			try {
				await pendingCodexUpdate;
			}
			catch (error) {
				this.log('runtime.cliPreflight.codexBackgroundUpdateWaitFailed', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		const key = this.buildFirstTurnCliPreflightKey();
		if (this.firstTurnCliPreflightKeys.has(key)) {
			return { ok: true, cached: true };
		}
		const statuses = {
			codex: this.probeCodexCli(this.settings),
			claude: this.probeClaudeCli(this.settings),
		};
		const codexUpgrade = getCodexUpgradePlan(this.settings, statuses.codex);
		this.log('runtime.cliPreflight', {
			provider: this.settings.provider,
			codexOk: statuses.codex.ok,
			codexCommand: statuses.codex.command,
			codexVersion: statuses.codex.version,
			codexError: statuses.codex.error,
			codexUpgrade,
			claudeOk: statuses.claude.ok,
			claudeCommand: statuses.claude.command,
			claudeVersion: statuses.claude.version,
			claudeError: statuses.claude.error,
			codexBundle: statuses.codex.bundle,
			claudeBundle: statuses.claude.bundle,
		});
		const provider = this.settings.provider === 'claude' ? 'claude' : 'codex';
		if (statuses[provider]?.ok) {
			if (provider === 'codex' && codexUpgrade.automatic) {
				try {
					const upgradeResult = await this.installAndProbeBundledCodexCli(statuses, {
						upgrade: true,
						previousVersion: codexUpgrade.installedVersion,
					});
					if (upgradeResult.ok) {
						this.firstTurnCliPreflightKeys.add(this.buildFirstTurnCliPreflightKey());
						return { ...upgradeResult, upgrade: codexUpgrade };
					}
				}
				catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					this.log('runtime.cliPreflight.codexUpdateFailed', {
						installedVersion: codexUpgrade.installedVersion,
						targetVersion: codexUpgrade.targetVersion,
						message,
					});
					this.emit({
						type: 'status',
						status: 'ready',
						detail: `Codex CLI update to ${codexUpgrade.targetVersion} failed; continuing with ${codexUpgrade.installedVersion}.`,
					});
				}
			}
			if (provider === 'codex' && codexUpgrade.available && !codexUpgrade.automatic) {
				this.log('runtime.cliPreflight.codexUpdateAvailable', codexUpgrade);
			}
			this.firstTurnCliPreflightKeys.add(key);
			return { ok: true, statuses, upgrade: codexUpgrade };
		}
		if (provider === 'codex') {
			try {
				if (process.platform !== 'win32') {
					throw new Error('未找到可运行的本机 Codex CLI。请安装 codex 并在设置中指定完整路径；诊断面板可查看已检查的路径。');
				}
				const installResult = await this.installAndProbeBundledCodexCli(statuses);
				if (installResult.ok) {
					this.firstTurnCliPreflightKeys.add(this.buildFirstTurnCliPreflightKey());
				}
				return installResult;
			}
			catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				const browserWindow = event?.sender?.getOwnerBrowserWindow?.() || null;
				await dialog.showMessageBox(browserWindow, {
					type: 'error',
					buttons: ['取消发送'],
					defaultId: 0,
					cancelId: 0,
					noLink: true,
					message: process.platform === 'win32' ? 'Codex CLI 下载或安装失败' : 'Codex CLI 未就绪',
					detail: message,
				});
				return { ok: false, error: message };
			}
		}
		const claudeResult = await this.promptMissingClaudeCli(event, statuses);
		if (claudeResult.ok) {
			this.firstTurnCliPreflightKeys.add(this.buildFirstTurnCliPreflightKey());
		}
		return claudeResult;
	}

	sendMarkdownNoteAiEvent(job, payload = {}) {
		const sender = job?.sender;
		if (!sender || (typeof sender.isDestroyed === 'function' && sender.isDestroyed())) {
			return false;
		}
		const message = {
			requestId: job.requestId,
		};
		if (typeof payload.delta === 'string' && payload.delta) {
			message.delta = payload.delta.slice(0, 64 * 1024);
		}
		if (typeof payload.error === 'string' && payload.error) {
			message.error = payload.error.slice(0, 4000);
		}
		if (payload.done === true) {
			message.done = true;
		}
		if (payload.cancelled === true) {
			message.cancelled = true;
		}
		try {
			sender.send(IPC.markdownNoteAiEvent, message);
			return true;
		}
		catch (error) {
			this.logger.warn?.(`[markdown-note-ai] failed to send event: ${error?.message || String(error)}`);
			return false;
		}
	}

	finishMarkdownNoteAiJob(job, payload = {}) {
		if (!job || job.finished) {
			return;
		}
		job.finished = true;
		if (job.timeoutTimer) {
			clearTimeout(job.timeoutTimer);
			job.timeoutTimer = null;
		}
		if (this.markdownNoteAiJobs.get(job.requestId) === job) {
			this.markdownNoteAiJobs.delete(job.requestId);
		}
		if (job.transport) {
			job.transport.dispose();
			job.transport = null;
		}
		if (job.proc && !job.proc.killed && job.proc.exitCode === null) {
			terminateProcess(job.proc);
		}
		job.proc = null;
		this.sendMarkdownNoteAiEvent(job, {
			...payload,
			done: true,
		});
	}

	formatMarkdownNoteAiError(provider, value) {
		const message = String(value || '').trim().slice(0, 4000);
		if (provider === 'codex' && /(?:unknown|unrecognized).{0,80}--ephemeral|--ephemeral.{0,80}(?:unknown|unrecognized)/iu.test(message)) {
			return 'Codex CLI is too old for non-persistent Markdown AI. Update Codex CLI and try again.';
		}
		if (provider === 'claude' && /(?:unknown|unrecognized).{0,120}--no-session-persistence|--no-session-persistence.{0,120}(?:unknown|unrecognized)/iu.test(message)) {
			return 'Claude Code is too old for non-persistent Markdown AI. Update Claude Code and try again.';
		}
		return message || `${provider === 'claude' ? 'Claude Code' : 'Codex'} Markdown AI failed.`;
	}

	shouldFallbackMarkdownNoteCodexExec(error) {
		const message = String(error?.message || error || '');
		return /(?:unknown|unrecognized|invalid|unsupported|method.{0,40}not found).{0,120}(?:ephemeral|thread\/start)|(?:ephemeral|thread\/start).{0,120}(?:unknown|unrecognized|invalid|unsupported|method.{0,40}not found)|Codex app-server exited/iu.test(message);
	}

	appendMarkdownNoteAiDelta(job, value) {
		if (!job || job.finished || job.cancelled) {
			return false;
		}
		const text = String(value || '');
		if (!text) {
			return true;
		}
		const remaining = MARKDOWN_NOTE_AI_OUTPUT_MAX_CHARS - job.output.length;
		if (remaining <= 0) {
			terminateProcess(job.proc);
			this.finishMarkdownNoteAiJob(job, {
				error: 'Markdown AI output exceeded the safe size limit.',
			});
			return false;
		}
		const delta = text.slice(0, remaining);
		job.output += delta;
		this.sendMarkdownNoteAiEvent(job, { delta });
		if (delta.length < text.length) {
			terminateProcess(job.proc);
			this.finishMarkdownNoteAiJob(job, {
				error: 'Markdown AI output exceeded the safe size limit.',
			});
			return false;
		}
		return true;
	}

	handleMarkdownNoteCodexLine(job, line) {
		let message = null;
		try {
			message = JSON.parse(line);
		}
		catch {
			return;
		}
		const directDelta = typeof message?.delta === 'string'
			? message.delta
			: typeof message?.params?.delta === 'string'
				? message.params.delta
				: '';
		if (directDelta) {
			this.appendMarkdownNoteAiDelta(job, directDelta);
			return;
		}
		const nestedItem = message?.item && typeof message.item === 'object' ? message.item : null;
		const item = nestedItem?.type === 'agent_message'
			? nestedItem
			: message?.type === 'agent_message'
				? message
				: null;
		if (item) {
			const id = String(item.id || message?.id || 'agent-message');
			const text = String(item.text || item.message || item.content || '');
			const previous = job.codexAgentText.get(id) || '';
			job.codexAgentText.set(id, text);
			if (text.startsWith(previous)) {
				this.appendMarkdownNoteAiDelta(job, text.slice(previous.length));
			}
			else if (!previous) {
				this.appendMarkdownNoteAiDelta(job, text);
			}
			return;
		}
		if (message?.type === 'error' || message?.type === 'turn.failed') {
			job.processError = String(message?.error?.message || message?.error || message?.message || 'Codex Markdown AI failed.');
		}
	}

	handleMarkdownNoteClaudeLine(job, line) {
		let message = null;
		try {
			message = JSON.parse(line);
		}
		catch {
			return;
		}
		if (message?.type === 'stream_event') {
			const event = message.event || {};
			const delta = event.delta || {};
			if (event.type === 'content_block_delta' && delta.type === 'text_delta') {
				job.claudeTextDeltaSeen = true;
				this.appendMarkdownNoteAiDelta(job, delta.text || '');
			}
			return;
		}
		if (message?.type === 'assistant' && !job.claudeTextDeltaSeen) {
			this.appendMarkdownNoteAiDelta(job, extractClaudeTextFromMessage(message.message));
			return;
		}
		if (message?.type === 'result') {
			if (message.is_error || message.subtype === 'error') {
				job.processError = String(message.result || message.error || 'Claude Markdown AI failed.');
			}
			else if (!job.claudeTextDeltaSeen && typeof message.result === 'string') {
				this.appendMarkdownNoteAiDelta(job, message.result);
			}
		}
	}

	appendMarkdownNoteCodexCompletedItem(job, item) {
		if (!item || item.type !== 'agentMessage' || !item.text) {
			return;
		}
		const itemId = String(item.id || 'agent-message');
		if (job.codexAgentMessageDeltaIds.has(itemId)) {
			return;
		}
		const text = String(item.text || '');
		const previous = job.codexAgentText.get(itemId) || '';
		job.codexAgentText.set(itemId, text);
		if (text.startsWith(previous)) {
			this.appendMarkdownNoteAiDelta(job, text.slice(previous.length));
		}
		else if (!previous) {
			this.appendMarkdownNoteAiDelta(job, text);
		}
	}

	handleMarkdownNoteCodexNotification(job, method, params = {}) {
		if (!job || job.finished) {
			return;
		}
		if (method === 'item/agentMessage/delta') {
			const itemId = String(params?.itemId || '');
			if (itemId) {
				job.codexAgentMessageDeltaIds.add(itemId);
			}
			this.appendMarkdownNoteAiDelta(job, params?.delta || '');
			return;
		}
		if (method === 'item/completed') {
			this.appendMarkdownNoteCodexCompletedItem(job, params?.item);
			return;
		}
		if (method === 'error') {
			if (!params?.willRetry) {
				job.processError = String(params?.error?.message || params?.message || 'Codex Markdown AI failed.');
			}
			return;
		}
		if (method !== 'turn/completed') {
			return;
		}
		for (const item of Array.isArray(params?.turn?.items) ? params.turn.items : []) {
			this.appendMarkdownNoteCodexCompletedItem(job, item);
		}
		const status = String(params?.turn?.status || '').trim();
		if (status === 'failed') {
			this.finishMarkdownNoteAiJob(job, {
				error: this.formatMarkdownNoteAiError('codex', params?.turn?.error?.message || job.processError || 'Codex Markdown AI failed.'),
			});
			return;
		}
		if (status === 'interrupted' && !job.cancelled) {
			this.finishMarkdownNoteAiJob(job, { error: 'Codex Markdown AI was interrupted.' });
			return;
		}
		this.finishMarkdownNoteAiJob(job, job.cancelled ? { cancelled: true } : {});
	}

	async runMarkdownNoteCodexAppServerJob(job, prompt, payload = {}) {
		const launchSpec = buildMarkdownNoteCodexAppServerLaunchSpec(this.settings, payload);
		try {
			fs.mkdirSync(launchSpec.cwd, { recursive: true });
		}
		catch (error) {
			if (launchSpec.method !== 'wsl') {
				throw error;
			}
		}

		let proc = null;
		try {
			proc = this.spawnProcess(launchSpec.command, launchSpec.args, {
				cwd: launchSpec.cwd,
				env: launchSpec.env,
				stdio: ['pipe', 'pipe', 'pipe'],
				windowsHide: true,
				shell: launchSpec.shell,
			});
		}
		catch (error) {
			if (this.shouldFallbackMarkdownNoteCodexExec(error)) {
				return this.runMarkdownNoteCliJob(job, prompt, payload);
			}
			this.finishMarkdownNoteAiJob(job, {
				error: this.formatMarkdownNoteAiError('codex', error?.message || error),
			});
			return;
		}

		job.proc = proc;
		job.codexAppServerStarting = true;
		const transport = new CodexRpcTransport(proc);
		job.transport = transport;
		transport.start();
		transport.onNotification('item/agentMessage/delta', (params) => this.handleMarkdownNoteCodexNotification(job, 'item/agentMessage/delta', params));
		transport.onNotification('item/completed', (params) => this.handleMarkdownNoteCodexNotification(job, 'item/completed', params));
		transport.onNotification('error', (params) => this.handleMarkdownNoteCodexNotification(job, 'error', params));
		transport.onNotification('turn/completed', (params) => this.handleMarkdownNoteCodexNotification(job, 'turn/completed', params));
		job.timeoutTimer = setTimeout(() => {
			this.finishMarkdownNoteAiJob(job, {
				error: `Markdown AI timed out after ${Math.round(MARKDOWN_NOTE_AI_TIMEOUT_MS / 1000)} seconds.`,
			});
		}, MARKDOWN_NOTE_AI_TIMEOUT_MS);
		proc.stderr?.on('data', (chunk) => {
			job.stderr = appendLimitedText(job.stderr, decodeProcessChunk(chunk), PROCESS_STDERR_MAX_CHARS);
		});
		proc.once('close', (code, signal) => {
			if (job.finished || job.proc !== proc) {
				return;
			}
			const error = new Error(job.processError || job.stderr || `Codex app-server exited with ${code ?? signal ?? 'unknown status'}`);
			if (job.codexAppServerStarting) {
				job.codexAppServerLaunchError = error;
				return;
			}
			if (job.cancelled) {
				this.finishMarkdownNoteAiJob(job, { cancelled: true });
				return;
			}
			this.finishMarkdownNoteAiJob(job, {
				error: this.formatMarkdownNoteAiError('codex', error.message),
			});
		});

		try {
			await transport.request('initialize', {
				clientInfo: { name: 'pdf-ai-markdown-notes', version: '0.1.0' },
				capabilities: { experimentalApi: true },
			}, 30000);
			transport.notify('initialized');
			const thread = await transport.request('thread/start', {
				cwd: launchSpec.targetWorkspace || launchSpec.cwd,
				model: launchSpec.model,
				approvalPolicy: 'never',
				sandbox: 'read-only',
				serviceTier: resolveCodexServiceTier(this.settings, launchSpec.model),
				baseInstructions: this.settings.systemPrompt || undefined,
				experimentalRawEvents: true,
				ephemeral: true,
			}, 60000);
			job.threadId = String(thread?.thread?.id || '').trim();
			if (!job.threadId) {
				throw new Error('Codex did not return an ephemeral Markdown thread id');
			}
			job.codexAppServerStarting = false;
			const turn = await transport.request('turn/start', {
				threadId: job.threadId,
				input: toTextInput(prompt),
				cwd: launchSpec.targetWorkspace || launchSpec.cwd,
				approvalPolicy: 'never',
				model: launchSpec.model,
				serviceTier: resolveCodexServiceTier(this.settings, launchSpec.model),
				effort: launchSpec.effort,
				summary: this.settings.reasoningSummary || undefined,
			}, 60000);
			job.turnId = String(turn?.turn?.id || '').trim();
		}
		catch (error) {
			if (
				!job.finished
				&& !job.cancelled
				&& job.codexAppServerStarting
				&& this.shouldFallbackMarkdownNoteCodexExec(job.codexAppServerLaunchError || error)
			) {
				job.codexAppServerFallbackUsed = true;
				job.transport?.dispose();
				job.transport = null;
				if (job.proc === proc) {
					job.proc = null;
				}
				terminateProcess(proc);
				if (job.timeoutTimer) {
					clearTimeout(job.timeoutTimer);
					job.timeoutTimer = null;
				}
				job.stderr = '';
				job.processError = '';
				return this.runMarkdownNoteCliJob(job, prompt, payload);
			}
			if (!job.finished) {
				this.finishMarkdownNoteAiJob(job, {
					error: this.formatMarkdownNoteAiError('codex', error?.message || error),
				});
			}
		}
	}

	async runMarkdownNoteCliJob(job, prompt, payload = {}) {
		const provider = job.provider;
		const launchSpec = provider === 'claude'
			? buildMarkdownNoteClaudeExecLaunchSpec(this.settings, payload)
			: buildMarkdownNoteCodexExecLaunchSpec(this.settings, payload);
		try {
			fs.mkdirSync(launchSpec.cwd, { recursive: true });
		}
		catch (error) {
			if (launchSpec.method !== 'wsl') {
				throw error;
			}
		}

		let proc = null;
		try {
			proc = this.spawnProcess(launchSpec.command, launchSpec.args, {
				cwd: launchSpec.cwd,
				env: launchSpec.env,
				stdio: ['pipe', 'pipe', 'pipe'],
				windowsHide: true,
				shell: launchSpec.shell,
			});
		}
		catch (error) {
			this.finishMarkdownNoteAiJob(job, {
				error: this.formatMarkdownNoteAiError(provider, error?.message || error),
			});
			return;
		}

		job.proc = proc;
		job.timeoutTimer = setTimeout(() => {
			terminateProcess(proc);
			this.finishMarkdownNoteAiJob(job, {
				error: `Markdown AI timed out after ${Math.round(MARKDOWN_NOTE_AI_TIMEOUT_MS / 1000)} seconds.`,
			});
		}, MARKDOWN_NOTE_AI_TIMEOUT_MS);
		createDecodedLineReader(proc.stdout, (line) => {
			if (provider === 'claude') {
				this.handleMarkdownNoteClaudeLine(job, line);
			}
			else {
				this.handleMarkdownNoteCodexLine(job, line);
			}
		});
		proc.stderr?.on('data', (chunk) => {
			job.stderr = appendLimitedText(job.stderr, decodeProcessChunk(chunk), PROCESS_STDERR_MAX_CHARS);
		});
		proc.once('error', (error) => {
			this.finishMarkdownNoteAiJob(job, {
				error: this.formatMarkdownNoteAiError(provider, error?.message || error),
			});
		});
		proc.once('close', (code, signal) => {
			if (job.finished) {
				return;
			}
			if (job.cancelled) {
				this.finishMarkdownNoteAiJob(job, { cancelled: true });
				return;
			}
			if (job.processError || code !== 0 || signal) {
				this.finishMarkdownNoteAiJob(job, {
					error: this.formatMarkdownNoteAiError(provider, job.processError || job.stderr || `${provider} exited with ${code ?? signal ?? 'unknown status'}`),
				});
				return;
			}
			this.finishMarkdownNoteAiJob(job);
		});
		try {
			proc.stdin?.end(prompt);
		}
		catch (error) {
			terminateProcess(proc);
			this.finishMarkdownNoteAiJob(job, {
				error: this.formatMarkdownNoteAiError(provider, error?.message || error),
			});
		}
	}

	async runMarkdownNoteAiJob(job, prompt, payload = {}) {
		if (job.provider === 'codex') {
			return this.runMarkdownNoteCodexAppServerJob(job, prompt, payload);
		}
		return this.runMarkdownNoteCliJob(job, prompt, payload);
	}

	async handleStartMarkdownNoteAi(event, payload = {}) {
		const sender = event?.sender;
		if (!sender || (typeof sender.isDestroyed === 'function' && sender.isDestroyed())) {
			return { ok: false, error: 'Markdown AI host is unavailable.' };
		}
		const requestId = String(payload?.requestId || '').trim().slice(0, MARKDOWN_NOTE_AI_REQUEST_ID_MAX_CHARS);
		const prompt = String(payload?.text || '').trim().slice(0, MARKDOWN_NOTE_AI_PROMPT_MAX_CHARS);
		if (!requestId || !prompt) {
			return { ok: false, error: 'Markdown AI request is incomplete.' };
		}
		if (this.markdownNoteAiJobs.has(requestId)) {
			return { ok: false, error: 'This Markdown AI request is already running.' };
		}
		if (this.markdownNoteAiJobs.size > 0) {
			return { ok: false, error: 'Another Markdown AI request is already running.' };
		}
		if (this.prepareMarkdownNoteAi) {
			try {
				await this.prepareMarkdownNoteAi(event);
				await this.refreshNativeCliConfiguration();
				if (!this.dryRun) {
					const cliReady = await this.ensureCliReadyForFirstTurn(event);
					if (!cliReady?.ok) {
						return { ok: false, error: cliReady?.error || 'CLI runtime is not ready.' };
					}
				}
			}
			catch (error) {
				return { ok: false, error: error?.message || String(error) };
			}
		}
		const provider = this.settings.provider === 'claude' ? 'claude' : 'codex';
		const job = {
			requestId,
			sender,
			provider,
			proc: null,
			timeoutTimer: null,
			finished: false,
			cancelled: false,
			output: '',
			stderr: '',
			processError: '',
			codexAgentText: new Map(),
			codexAgentMessageDeltaIds: new Set(),
			claudeTextDeltaSeen: false,
			transport: null,
			threadId: '',
			turnId: '',
			codexAppServerStarting: false,
		};
		this.markdownNoteAiJobs.set(requestId, job);
		this.log('markdown-note-ai.start', {
			requestId,
			provider,
			model: this.resolveModel(payload),
			effort: normalizeRuntimeEffort(payload.effort || this.settings.effort),
			promptLength: prompt.length,
			ephemeral: true,
		});
		if (this.dryRun) {
			queueMicrotask(() => {
				if (job.finished || job.cancelled) return;
				this.appendMarkdownNoteAiDelta(job, 'Markdown AI dry-run output.');
				this.finishMarkdownNoteAiJob(job);
			});
			return { ok: true, requestId, provider, ephemeral: true };
		}
		void this.runMarkdownNoteAiJob(job, prompt, payload).catch((error) => {
			this.finishMarkdownNoteAiJob(job, {
				error: this.formatMarkdownNoteAiError(provider, error?.message || error),
			});
		});
		return { ok: true, requestId, provider, ephemeral: true };
	}

	async handleCancelMarkdownNoteAi(payload = {}) {
		const requestId = String(payload?.requestId || '').trim().slice(0, MARKDOWN_NOTE_AI_REQUEST_ID_MAX_CHARS);
		const job = this.markdownNoteAiJobs.get(requestId);
		if (!job) {
			return { ok: true, alreadyComplete: true };
		}
		job.cancelled = true;
		terminateProcess(job.proc);
		this.finishMarkdownNoteAiJob(job, { cancelled: true });
		return { ok: true, requestId };
	}

	async handleStartTurn(event, payload = {}) {
		this.webContents = event.sender;
		await this.refreshNativeCliConfiguration();
		payload = {
			...payload,
			effort: normalizeRuntimeEffort(payload.effort || this.settings.effort),
		};
		const text = String(payload.text || '').trim();
		if (!text) {
			return { ok: false, error: 'Message is empty' };
		}
		const sessionKey = this.normalizeSessionKey(payload);
		const effectiveModel = resolveRuntimeModelForProvider(this.settings.provider, this.settings, payload);
		const effectiveEffort = safeReasoningEffort(
			this.settings.provider,
			effectiveModel,
			payload.effort || this.settings.effort,
			{
				settings: this.settings,
				runtimeModelAssets: this.runtimeModelAssets,
			},
		);
		const effectiveCodexEffort = this.settings.provider === 'codex'
			? this.setCodexReasoningEffort(effectiveEffort)
			: effectiveEffort;
		this.activeSessionKey = sessionKey;
		this.log('runtime.startTurn', {
			provider: this.settings.provider,
			sessionKey,
			threadId: payload.threadId || this.threadId || '',
			model: payload.model || this.settings.model || '',
			effort: effectiveCodexEffort,
			textLength: text.length,
			textPreview: logPreview(text),
			imageCount: Array.isArray(payload.images) ? payload.images.length : 0,
			historyCount: Array.isArray(payload.conversationHistory) ? payload.conversationHistory.length : 0,
		});
		if (!this.dryRun) {
			const cliReady = await this.ensureCliReadyForFirstTurn(event);
			if (!cliReady.ok) {
				this.emit({ type: 'error', content: cliReady.error || 'CLI runtime is not ready.' });
				this.emit({ type: 'done', sessionKey });
				this.activeSessionKey = null;
				return { ok: false, error: cliReady.error || 'CLI runtime is not ready.' };
			}
		}
		let providerText = appendProviderTurnContext(this.settings.provider, text, payload);
		const codexFork = this.settings.provider === 'codex' ? this.normalizeForkPayload(payload) : null;
		if (this.settings.provider === 'codex' && !isCompactCommand(text)) {
			providerText = buildCodexForkReplayPrompt(providerText, payload.conversationHistory, codexFork);
		}
		if (this.dryRun) {
			return this.handleDryRunTurn({ ...payload, rawText: text }, providerText);
		}
		if (this.settings.provider === 'claude') {
			if (this.settings.claudeEnableBangBash !== false && text.startsWith('!')) {
				return this.handleBangBashTurn(payload, text, sessionKey);
			}
			return this.handleClaudeSdkTurn(payload, providerText, sessionKey);
		}
		let inputBundle = { input: [], tempDir: null };
		try {
			await this.ensureCodex();
			const threadId = codexFork
				? await this.prepareCodexFork(sessionKey, payload, codexFork)
				: await this.ensureThread(sessionKey, payload);
			this.resetCodexTurnState();
			if (isCompactCommand(text)) {
				if (text !== '/compact') {
					throw new Error('/compact does not accept arguments');
				}
				await this.transport.request('thread/compact/start', { threadId }, 60000);
				return { ok: true, threadId, turnId: this.currentTurnId, compact: true };
			}
			const skillInputs = await this.resolveCodexSkillInputs(providerText);
			inputBundle = buildCodexInput(providerText, payload.images, skillInputs, {
				mapPath: (filePath) => mapCodexHostPathToTarget(this.settings, filePath),
			});
			const codexRepoHostRoot = this.resolveCodexRepoHostRoot();
			const sandbox = resolveSandboxConfig(this.settings, {
				externalContextPaths: [...normalizePathList(payload.externalContextPaths), codexRepoHostRoot],
				tempDirs: [inputBundle.tempDir].filter(Boolean),
			});
			const model = this.resolveModel(payload);
			const serviceTier = resolveCodexServiceTier(this.settings, model);
			this.recordRuntimeModel('codex', model, { sessionKey, threadId });
			const result = await this.transport.request('turn/start', {
				threadId,
				input: inputBundle.input.length ? inputBundle.input : toTextInput(providerText),
				cwd: this.resolveCodexRepoTargetRoot(),
				approvalPolicy: sandbox.approvalPolicy,
				model,
				serviceTier,
				effort: effectiveCodexEffort,
				summary: payload.reasoningSummary || this.settings.reasoningSummary,
				sandboxPolicy: sandbox.sandboxPolicy,
				collaborationMode: {
					mode: this.settings.permissionMode === 'plan' ? 'plan' : 'default',
					settings: {
						model,
						reasoning_effort: effectiveCodexEffort,
						developer_instructions: null,
					},
				},
			}, 60000);
			this.currentTurnId = result?.turn?.id || null;
			if (this.currentTurnId && inputBundle.tempDir) {
				this.registerTurnTempDir(this.currentTurnId, inputBundle.tempDir);
			}
			else {
				cleanupTempDir(inputBundle.tempDir);
			}
			this.emit({ type: 'turn-started', sessionKey, threadId, turnId: this.currentTurnId });
			this.flushPendingTurnNotifications();
			return { ok: true, sessionKey, threadId, turnId: this.currentTurnId };
		}
		catch (error) {
			cleanupTempDir(inputBundle.tempDir);
			const message = error instanceof Error ? error.message : String(error);
			this.log('runtime.startTurn.error', { provider: this.settings.provider, sessionKey, message });
			this.emit({ type: 'error', content: message });
			this.emit({ type: 'done', sessionKey });
			this.activeSessionKey = null;
			return { ok: false, error: message };
		}
	}

	async handleSteerTurn(event, payload = {}) {
		this.webContents = event.sender;
		const text = String(payload.text || '').trim();
		const hasImages = Array.isArray(payload.images) && payload.images.length > 0;
		if (!text && !hasImages) {
			return { ok: false, error: 'Queued message is empty' };
		}
		if (this.settings.provider !== 'codex') {
			return { ok: false, error: 'Turn steer is only supported by Codex' };
		}
		const expectedTurnId = String(payload.turnId || this.currentTurnId || '').trim();
		const threadId = String(payload.threadId || this.threadId || '').trim();
		if (!threadId || !expectedTurnId) {
			return { ok: false, error: 'No active Codex turn to steer' };
		}
		if (this.currentTurnId && expectedTurnId !== this.currentTurnId) {
			return { ok: false, error: 'Active Codex turn changed before steer could be sent' };
		}
		const providerText = appendProviderTurnContext('codex', text, payload);
		if (this.dryRun) {
			this.emit({
				type: 'chunk',
				chunk: {
					type: 'text',
					content: `\n\nSteered queued Codex message into active dry-run turn: ${providerText || '[image]'}`,
				},
			});
			return { ok: true, threadId, turnId: expectedTurnId, dryRun: true, steered: true };
		}
		if (!this.transport) {
			return { ok: false, error: 'Codex runtime is not running' };
		}
		let inputBundle = { input: [], tempDir: null };
		try {
			const skillInputs = await this.resolveCodexSkillInputs(providerText);
			inputBundle = buildCodexInput(providerText, payload.images, skillInputs, {
				mapPath: (filePath) => mapCodexHostPathToTarget(this.settings, filePath),
			});
			const result = await this.transport.request('turn/steer', {
				threadId,
				input: inputBundle.input.length ? inputBundle.input : toTextInput(providerText),
				expectedTurnId,
			}, 60000);
			const resultTurnId = String(result?.turnId || '').trim();
			if (resultTurnId !== expectedTurnId) {
				cleanupTempDir(inputBundle.tempDir);
				return { ok: false, error: 'Codex rejected the queued message because the active turn changed' };
			}
			this.registerTurnTempDir(expectedTurnId, inputBundle.tempDir);
			return { ok: true, threadId, turnId: resultTurnId, steered: true };
		}
		catch (error) {
			cleanupTempDir(inputBundle.tempDir);
			const message = error instanceof Error ? error.message : String(error);
			return { ok: false, error: message };
		}
	}

	async handleCancelTurn() {
		if (this.settings.provider === 'claude' && this.claudeSdkQuery) {
			this.resolvePendingClaudeTurnApprovals('cancel', 'Claude turn cancelled.');
			try {
				this.claudeAbortController?.abort();
				if (typeof this.claudeSdkQuery.interrupt === 'function') {
					await this.claudeSdkQuery.interrupt();
				}
				else if (typeof this.claudeSdkQuery.close === 'function') {
					this.claudeSdkQuery.close();
				}
			}
			catch {
				if (typeof this.claudeSdkQuery.close === 'function') {
					this.claudeSdkQuery.close();
				}
			}
			this.emit({ type: 'status', status: 'cancelled', detail: 'Claude turn cancelled' });
			this.currentTurnId = null;
			this.activeSessionKey = null;
			return { ok: true };
		}
		if (this.settings.provider === 'claude' && this.proc && !this.proc.killed) {
			this.resolvePendingClaudeTurnApprovals('cancel', 'Claude turn cancelled.');
			terminateProcess(this.proc);
			this.emit({ type: 'status', status: 'cancelled', detail: 'Claude turn cancelled' });
			this.currentTurnId = null;
			this.activeSessionKey = null;
			return { ok: true };
		}
		if (!this.transport || !this.threadId || !this.currentTurnId) {
			return { ok: false, error: 'No active turn' };
		}
		try {
			await this.transport.request('turn/interrupt', {
				threadId: this.threadId,
				turnId: this.currentTurnId,
			}, 5000);
			this.cleanupTurnTempDir(this.currentTurnId);
			this.resolvePendingCodexApprovals('cancel', 'Codex turn cancelled.', this.threadId);
			this.activeSessionKey = null;
			return { ok: true };
		}
		catch (error) {
			return { ok: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	handleRunBangBash(event, payload = {}) {
		this.webContents = event.sender;
		const command = String(payload?.command || '').trim();
		if (!command) {
			return Promise.resolve({ ok: false, error: 'Command is empty' });
		}
		let workspace = '';
		try {
			workspace = resolveBangBashWorkspace(payload?.workspace, this.settings.workspace, this.defaultWorkspace);
		}
		catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.log('runtime.bangBash.rejectWorkspace', {
				workspacePreview: logPreview(payload?.workspace || ''),
				error: message,
			});
			return Promise.resolve({ ok: false, error: message });
		}
		try {
			fs.mkdirSync(workspace, { recursive: true });
		}
		catch {
			// Spawn will surface the cwd failure with the native message.
		}
		const envFromText = parseEnvText(payload?.envText || this.settings.envText);
		const env = withUtf8ProcessEnv({
			...process.env,
			...envFromText,
			PATH: envFromText.PATH || process.env.PATH,
		});
		const timeoutMs = Math.max(1000, Math.min(Number(payload?.timeoutMs || 30000) || 30000, 300000));
		const maxBuffer = Math.max(1024, Math.min(Number(payload?.maxBuffer || 1024 * 1024) || 1024 * 1024, 10 * 1024 * 1024));
		this.log('runtime.bangBash.start', {
			commandPreview: logPreview(command),
			workspace,
			timeoutMs,
		});
		return new Promise((resolve) => {
			let stdout = '';
			let stderr = '';
			let outputBytes = 0;
			let timedOut = false;
			let exceededBuffer = false;
			let settled = false;
			let proc = null;
			let timer = null;
			const stdoutDecoder = createProcessTextDecoder();
			const stderrDecoder = createProcessTextDecoder();
			const append = (decoder, chunk) => {
				if (exceededBuffer) {
					return;
				}
				const bytes = chunkToBuffer(chunk);
				outputBytes += bytes.length;
				if (outputBytes > maxBuffer) {
					exceededBuffer = true;
					terminateProcess(proc);
					return;
				}
				decoder.append(bytes);
			};
			const finish = (result = {}) => {
				if (settled) return;
				settled = true;
				if (timer) clearTimeout(timer);
				stdoutDecoder.flush();
				stderrDecoder.flush();
				stdout = stdoutDecoder.text();
				stderr = stderrDecoder.text();
				const error = result.error
					|| (timedOut ? `Command timed out after ${Math.round(timeoutMs / 1000)}s` : '')
					|| (exceededBuffer ? `Output exceeded maximum buffer size (${Math.round(maxBuffer / 1024)}KB)` : '');
				const exitCode = Number.isFinite(Number(result.exitCode))
					? Number(result.exitCode)
					: error ? 1 : 0;
				this.log('runtime.bangBash.finish', {
					commandPreview: logPreview(command),
					exitCode,
					stdoutLength: stdout.length,
					stderrLength: stderr.length,
					error: error || '',
				});
				resolve({
					ok: exitCode === 0 && !error,
					command,
					stdout,
					stderr,
					exitCode,
					error,
					output: [stdout, stderr, error].filter(Boolean).join('\n').trim(),
				});
			};
			try {
				proc = this.spawnProcess(buildUtf8ShellCommand(command), [], {
					cwd: workspace,
					env,
					shell: true,
					windowsHide: true,
				});
			}
			catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				finish({ exitCode: 1, error: message });
				return;
			}
			timer = setTimeout(() => {
				timedOut = true;
					terminateProcess(proc);
			}, timeoutMs);
			proc.stdout?.on('data', (chunk) => {
				append(stdoutDecoder, chunk);
			});
			proc.stderr?.on('data', (chunk) => {
				append(stderrDecoder, chunk);
			});
			proc.once('error', (error) => {
				finish({ exitCode: 1, error: error.message || String(error) });
			});
			proc.once('exit', (code, signal) => {
				if (timedOut || exceededBuffer) {
					finish({ exitCode: 124 });
					return;
				}
				const exitCode = typeof code === 'number' ? code : signal ? 1 : 0;
				finish({ exitCode });
			});
		});
	}

	handleBangBashTurn(payload, text, sessionKey = 'default') {
		const workspace = this.settings.workspace || this.defaultWorkspace || process.cwd();
		fs.mkdirSync(workspace, { recursive: true });
		const command = text.trim().slice(1).trim();
		if (!command) {
			this.emit({ type: 'error', content: 'Bang-bash command is empty' });
			this.emit({ type: 'done', sessionKey });
			return { ok: false, error: 'Bang-bash command is empty' };
		}

		const turnId = `bang-bash-turn-${Date.now()}`;
		const toolId = `bang-bash-${Date.now()}`;
		const envFromText = parseEnvText(this.settings.envText);
		const env = withUtf8ProcessEnv({
			...process.env,
			...envFromText,
			PATH: envFromText.PATH || process.env.PATH,
		});
		this.currentTurnId = turnId;
		this.activeSessionKey = sessionKey;
		this.emit({ type: 'status', status: 'running', detail: `Running local shell: ${command}` });
		this.emit({ type: 'turn-started', sessionKey, threadId: this.threadId, turnId });
		this.emit({
			type: 'chunk',
			chunk: {
				type: 'tool_use',
				id: toolId,
				name: 'Bash',
				input: { command, cwd: workspace },
			},
		});

		return new Promise((resolve) => {
			let output = '';
			let settled = false;
			let outputBytes = 0;
			let timedOut = false;
			let exceededBuffer = false;
			let timer = null;
			const timeoutMs = 30000;
			const maxBuffer = 1024 * 1024;
			const outputDecoder = createProcessTextDecoder();
			const finish = (result) => {
				if (settled) {
					return;
				}
				settled = true;
				if (timer) clearTimeout(timer);
				const tail = outputDecoder.flush();
				if (tail) {
					this.emit({ type: 'chunk', chunk: { type: 'tool_delta', id: toolId, content: tail } });
				}
				output = outputDecoder.text() || output;
				const summary = result.summary
					|| (timedOut ? `Command timed out after ${Math.round(timeoutMs / 1000)}s` : '')
					|| (exceededBuffer ? `Output exceeded maximum buffer size (${Math.round(maxBuffer / 1024)}KB)` : '')
					|| (result.ok ? 'Command completed' : 'Command failed');
				this.emit({
					type: 'chunk',
					chunk: {
						type: 'tool_result',
						id: toolId,
						name: 'Bash',
						result: output.trim() || summary,
					},
				});
				this.emit({ type: 'done', sessionKey });
				this.emit({ type: 'status', status: result.ok ? 'ready' : 'failed', detail: summary });
				this.currentTurnId = null;
				this.activeSessionKey = null;
				this.proc = null;
				resolve({ ...result, summary });
			};

			try {
				this.proc = this.spawnProcess(buildUtf8ShellCommand(command), [], {
					cwd: workspace,
					env,
					shell: true,
					windowsHide: true,
				});
			}
			catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				output = message;
				finish({ ok: false, error: message, summary: message });
				return;
			}
			timer = setTimeout(() => {
				timedOut = true;
				terminateProcess(this.proc);
			}, timeoutMs);

			const appendOutput = (chunk) => {
				if (exceededBuffer) {
					return;
				}
				const bytes = chunkToBuffer(chunk);
				outputBytes += bytes.length;
				if (outputBytes > maxBuffer) {
					exceededBuffer = true;
					const notice = `\nOutput exceeded maximum buffer size (${Math.round(maxBuffer / 1024)}KB); command stopped.`;
					outputDecoder.append(notice);
					output += notice;
					this.emit({ type: 'chunk', chunk: { type: 'tool_delta', id: toolId, content: notice } });
					terminateProcess(this.proc);
					return;
				}
				const value = outputDecoder.append(bytes);
				if (!value) {
					return;
				}
				output += value;
				this.emit({ type: 'chunk', chunk: { type: 'tool_delta', id: toolId, content: value } });
			};
			this.proc.stdout?.on('data', appendOutput);
			this.proc.stderr?.on('data', appendOutput);
			this.proc.once('error', (error) => {
				const message = error.message || String(error);
				outputDecoder.append(message);
				output += message;
				finish({ ok: false, error: message, summary: message });
			});
			this.proc.once('exit', (code, signal) => {
				if (timedOut || exceededBuffer) {
					const summary = timedOut
						? `Command timed out after ${Math.round(timeoutMs / 1000)}s`
						: `Output exceeded maximum buffer size (${Math.round(maxBuffer / 1024)}KB)`;
					finish({ ok: false, error: summary, summary });
					return;
				}
				const ok = code === 0;
				const summary = ok
					? `Command completed (${code})`
					: `Command exited with ${code ?? signal ?? 'unknown status'}`;
				finish(ok ? { ok: true, sessionKey, turnId, bangBash: true, summary } : { ok: false, error: summary, summary });
			});
		});
	}

	createClaudeSdkApprovalCallback() {
		return async (toolName, input, options = {}) => {
			const normalizedToolName = String(toolName || 'Tool');
			const normalizedInput = normalizeClaudeControlInput(input);
			const requestId = String(options.requestId || `claude-sdk-${Date.now()}-${Math.random().toString(36).slice(2)}`);
			const toolUseId = String(options.toolUseID || options.toolUseId || '').trim();
			const controlRequest = {
				subtype: 'can_use_tool',
				toolName: normalizedToolName,
				input: normalizedInput,
				toolUseId,
				suggestions: Array.isArray(options.suggestions) ? options.suggestions : [],
				decisionClassification: options.decisionClassification || '',
			};
			const commonMeta = {
				source: 'claude-sdk',
				requestId,
				threadId: this.threadId || '',
				controlRequest,
			};
			try {
				if (normalizedToolName === 'ExitPlanMode') {
					const answer = await this.requestApproval({
						kind: 'exit_plan',
						title: 'Plan complete',
						description: options.description || 'Claude is ready to leave plan mode.',
						input: normalizedInput,
						plan: readClaudePlanContent(normalizedInput),
						permissions: getClaudePlanPermissions(normalizedInput),
					}, commonMeta);
					return this.buildClaudeControlApprovalResponse(controlRequest, answer);
				}

				const questions = normalizedToolName === 'AskUserQuestion'
					? normalizeClaudeElicitationQuestions({ input: normalizedInput, ...normalizedInput })
					: [];
				if (questions.length > 0) {
					const answer = await this.requestApproval({
						kind: 'question',
						title: options.title || 'Claude asks',
						description: options.description || 'Claude needs more input.',
						input: normalizedInput,
						questions,
					}, commonMeta);
					return this.buildClaudeControlApprovalResponse(controlRequest, answer);
				}

				const blockedPath = String(options.blockedPath || '').trim();
				const decisionReason = String(options.decisionReason || '').trim();
				const answer = await this.requestApproval({
					kind: getClaudeApprovalKind(normalizedToolName),
					title: options.title || `Allow ${normalizedToolName}?`,
					description: options.description || decisionReason || getClaudeActionDescription(normalizedToolName, normalizedInput),
					tool: options.displayName || normalizedToolName,
					icon: getClaudeToolIcon(normalizedToolName),
					input: {
						...normalizedInput,
						...(blockedPath ? { path: blockedPath } : {}),
						...(decisionReason ? { reason: decisionReason } : {}),
					},
				}, {
					...commonMeta,
					controlRequest: {
						...controlRequest,
						blockedPath,
						decisionReason,
					},
				});
				return this.buildClaudeControlApprovalResponse(controlRequest, answer);
			}
			catch (error) {
				return {
					behavior: 'deny',
					message: `Approval request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
					interrupt: false,
					...(toolUseId ? { toolUseID: toolUseId } : {}),
				};
			}
		};
	}

	async handleClaudeSdkTurn(payload, text, sessionKey = 'default') {
		const launch = this.buildClaudeTurnLaunchSpec(payload, text, sessionKey);
		let sdk;
		try {
			sdk = await this.claudeAgentSdkLoader();
		}
		catch (error) {
			cleanupTempDir(launch.activeMcp?.tempDir);
			this.log('runtime.claudeSdk.fallback', {
				message: error instanceof Error ? error.message : String(error),
			});
			return this.handleClaudeTurn(payload, text, sessionKey);
		}

		const { model, fork, existingThreadId } = launch;
		if (launch.needsHistoryRebuild && launch.historyRebuilt) {
			this.clearSessionHistoryRebuild(sessionKey);
		}
		if (fork) {
			this.threadId = null;
			this.pendingClaudeFork = fork;
		}
		else if (existingThreadId) {
			this.threadId = existingThreadId;
		}

		this.currentTurnId = `claude-turn-${Date.now()}`;
		this.claudeStreamState = {
			textDeltaSeen: false,
			thinkingDeltaSeen: false,
			toolBlocks: new Map(),
			sawAnyChunk: false,
		};
		this.activeClaudeLaunch = {
			sessionKey,
			expectedSessionId: existingThreadId || '',
			fork,
		};
		this.claudeAbortController = new AbortController();
		const options = buildClaudeSdkQueryOptions(
			this.settings,
			launch,
			payload,
			this.createClaudeSdkApprovalCallback(),
			this.claudeAbortController,
		);
		const prompt = buildClaudeSdkPromptInput(launch.promptText, payload.images, existingThreadId || this.threadId || '');
		this.emit({ type: 'status', status: 'starting', detail: `Starting Claude ${model}` });
		this.emit({ type: 'turn-started', sessionKey, threadId: this.threadId, turnId: this.currentTurnId });

		let query;
		try {
			query = sdk.query({ prompt, options });
			this.claudeSdkQuery = query;
		}
		catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			cleanupTempDir(launch.activeMcp?.tempDir);
			this.currentTurnId = null;
			this.activeSessionKey = null;
			this.claudeStreamState = null;
			this.pendingClaudeFork = null;
			this.activeClaudeLaunch = null;
			this.claudeAbortController = null;
			this.emit({ type: 'error', content: message });
			this.emit({ type: 'done', sessionKey });
			return { ok: false, error: message };
		}

		(async () => {
			let failed = false;
			try {
				for await (const message of query) {
					this.handleClaudeSdkMessage(message);
				}
			}
			catch (error) {
				failed = true;
				const message = error instanceof Error ? error.message : String(error);
				if (!this.claudeAbortController?.signal.aborted) {
					this.emit({ type: 'error', content: message });
				}
			}
			finally {
				this.emit({ type: 'done', sessionKey });
				this.emit({
					type: 'status',
					status: failed ? 'failed' : 'ready',
					detail: failed ? 'Claude turn failed' : 'Claude ready',
				});
				this.resolvePendingClaudeTurnApprovals('deny', 'Claude turn ended before the request was answered.');
				cleanupTempDir(launch.activeMcp?.tempDir);
				this.currentTurnId = null;
				this.activeSessionKey = null;
				this.proc = null;
				this.claudeSdkQuery = null;
				this.claudeAbortController = null;
				this.claudeStreamState = null;
				this.pendingClaudeFork = null;
				this.activeClaudeLaunch = null;
			}
		})().catch((error) => {
			this.log('runtime.claudeSdk.loop.error', {
				message: error instanceof Error ? error.message : String(error),
			});
		});

		return { ok: true, sessionKey, threadId: this.threadId, turnId: this.currentTurnId };
	}

	buildClaudeTurnLaunchSpec(payload, text, sessionKey = 'default') {
		const workspace = this.settings.workspace || this.defaultWorkspace || process.cwd();
		fs.mkdirSync(workspace, { recursive: true });

		const command = resolveClaudeCommand(this.settings);
		const model = this.resolveModel(payload);
		const env = buildClaudeEnvironment(this.settings);
		const effort = resolveClaudeEffort(payload.effort || this.settings.effort, {
			model,
			settings: this.settings,
			runtimeModelAssets: this.runtimeModelAssets,
		});

		const externalContextPaths = normalizePathList(payload.externalContextPaths);
		const activeMcp = buildClaudeActiveMcpConfig(workspace, payload, text);
		const allowedTools = normalizeClaudeAllowedTools(payload.allowedTools);
		const disallowedTools = [...new Set([
			...activeMcp.disallowedTools,
			...CLAUDE_DISABLED_BUILTIN_SUBAGENTS,
		])];
		const args = [
			'-p',
			'--verbose',
			'--output-format',
			'stream-json',
			'--include-partial-messages',
			'--model',
			model,
			...(effort ? ['--effort', effort] : []),
			...resolveClaudePermissionArgs(this.settings),
		];
		if (externalContextPaths.length > 0) {
			args.push('--add-dir', ...externalContextPaths);
		}
		if (activeMcp.configPath) {
			args.push('--mcp-config', activeMcp.configPath, '--strict-mcp-config');
		}
		if (disallowedTools.length > 0) {
			args.push('--disallowedTools', disallowedTools.join(','));
		}
		if (allowedTools.length > 0) {
			args.push('--allowedTools', allowedTools.join(','));
		}
		if (this.settings.systemPrompt) {
			args.push('--append-system-prompt', this.settings.systemPrompt);
		}
		const fork = this.normalizeForkPayload(payload);
		const resumeAt = this.normalizeResumeAtPayload(payload);
		const existingThreadId = fork ? '' : this.getSessionThreadId(sessionKey, payload);
		const sessionState = this.getSessionState(sessionKey);
		const needsHistoryRebuild = sessionState.needsHistoryRebuild === true;
		const transformedPrompt = transformClaudeMcpMentions(text, activeMcp.servers);
		const shouldRebuildHistory = !fork && !isCompactCommand(text) && (needsHistoryRebuild || !existingThreadId);
		const historyContext = shouldRebuildHistory ? buildClaudeHistoryContext(payload.conversationHistory) : '';
		const promptText = historyContext
			? buildClaudePromptWithHistoryContext(
				historyContext,
				transformedPrompt,
				stripClaudeNoteContext(transformedPrompt),
				payload.conversationHistory,
			)
			: transformedPrompt;
		const stdinMessage = buildClaudeStreamJsonUserMessage(promptText, payload.images);
		const stdinText = stdinMessage ? `${JSON.stringify(stdinMessage)}\n` : '';
		if (stdinMessage) {
			args.push('--input-format', 'stream-json');
		}
		if (fork) {
			args.push('--resume', fork.sourceThreadId, '--fork-session');
			if (fork.resumeAt) {
				args.push('--resume-session-at', fork.resumeAt);
			}
		}
		else if (existingThreadId) {
			args.push('--resume', existingThreadId);
			if (resumeAt) {
				args.push('--resume-session-at', resumeAt);
			}
		}
		if (!stdinMessage) {
			args.push(promptText);
		}
		return {
			workspace,
			command,
			model,
			env,
			args,
			promptText,
			historyContext,
			historyRebuilt: !!historyContext,
			stdinMessage,
			stdinText,
			activeMcp,
			allowedTools,
			disallowedTools,
			fork,
			resumeAt,
			existingThreadId,
			needsHistoryRebuild,
		};
	}

	async handleClaudeTurn(payload, text, sessionKey = 'default') {
		const launch = this.buildClaudeTurnLaunchSpec(payload, text, sessionKey);
		const { workspace, command, model, env, args, stdinText, activeMcp, fork, existingThreadId } = launch;
		if (launch.needsHistoryRebuild && launch.historyRebuilt) {
			this.clearSessionHistoryRebuild(sessionKey);
		}
		if (fork) {
			this.threadId = null;
			this.pendingClaudeFork = fork;
		}
		else if (existingThreadId) {
			this.threadId = existingThreadId;
		}

		this.currentTurnId = `claude-turn-${Date.now()}`;
		this.claudeStreamState = {
			textDeltaSeen: false,
			thinkingDeltaSeen: false,
			toolBlocks: new Map(),
			sawAnyChunk: false,
		};
		this.activeClaudeLaunch = {
			sessionKey,
			expectedSessionId: existingThreadId || '',
			fork,
		};
		this.emit({ type: 'status', status: 'starting', detail: `Starting Claude ${model}` });
		this.emit({ type: 'turn-started', sessionKey, threadId: this.threadId, turnId: this.currentTurnId });

		return new Promise((resolve) => {
			let settled = false;
			let stderr = '';
			let recoveryAttempted = false;
			const finishStart = (result) => {
				if (settled) {
					return;
				}
				settled = true;
				resolve(result);
			};

			const resetClaudeStreamStateForRetry = () => {
				this.claudeStreamState = {
					textDeltaSeen: false,
					thinkingDeltaSeen: false,
					toolBlocks: new Map(),
					sawAnyChunk: false,
				};
				this.activeClaudeLaunch = {
					sessionKey,
					expectedSessionId: existingThreadId || '',
					fork,
				};
			};

			const cleanupFinalClaudeTurn = () => {
				cleanupTempDir(activeMcp.tempDir);
				this.currentTurnId = null;
				this.activeSessionKey = null;
				this.proc = null;
				this.claudeStreamState = null;
				this.pendingClaudeFork = null;
				this.activeClaudeLaunch = null;
			};

			const maybeRetryEarlyFailure = (reason) => {
				if (recoveryAttempted || this.claudeStreamState?.sawAnyChunk) {
					return false;
				}
				recoveryAttempted = true;
				stderr = '';
				resetClaudeStreamStateForRetry();
				this.emit({
					type: 'status',
					status: 'starting',
					detail: `Restarting Claude after early failure: ${reason}`,
				});
				startProcess();
				return true;
			};

			const startProcess = () => {
				let proc;
				try {
					proc = this.spawnProcess(command, args, {
						cwd: workspace,
						env,
						stdio: stdinText ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
						windowsHide: true,
						shell: process.platform === 'win32' && !/[\\/]/.test(command),
					});
					this.proc = proc;
				}
				catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					cleanupFinalClaudeTurn();
					this.emit({ type: 'error', content: message });
					this.emit({ type: 'done' });
					finishStart({ ok: false, error: message });
					return;
				}

				let processSettled = false;
				const settleProcess = () => {
					if (processSettled) {
						return false;
					}
					processSettled = true;
					return true;
				};

				createDecodedLineReader(proc.stdout, (line) => this.handleClaudeLine(line));
				if (stdinText && proc.stdin) {
					try {
						proc.stdin.write(stdinText);
					}
					catch (error) {
						const message = error instanceof Error ? error.message : String(error);
						stderr = appendLimitedText(stderr, message, PROCESS_STDERR_MAX_CHARS);
						this.emit({ type: 'stderr', content: message });
					}
				}
				proc.stderr.on('data', (chunk) => {
					const decoded = decodeProcessChunk(chunk);
					stderr = appendLimitedText(stderr, decoded, PROCESS_STDERR_MAX_CHARS);
					const textChunk = decoded.trim();
					if (textChunk) {
						this.emit({ type: 'stderr', content: textChunk });
					}
				});
				proc.once('error', (error) => {
					if (!settleProcess()) {
						return;
					}
					const message = error.message || String(error);
					if (maybeRetryEarlyFailure(message)) {
						return;
					}
					cleanupFinalClaudeTurn();
					this.emit({ type: 'error', content: message });
					this.emit({ type: 'done' });
					finishStart({ ok: false, error: message });
				});
				proc.once('exit', (code, signal) => {
					if (!settleProcess()) {
						return;
					}
					const failed = code !== 0 && signal !== 'SIGTERM';
					if (failed) {
						const detail = stderr.trim() || `Claude exited with ${code ?? signal ?? 'unknown status'}`;
						if (maybeRetryEarlyFailure(detail)) {
							return;
						}
						this.emit({ type: 'error', content: detail });
					}
					this.emit({ type: 'done' });
					this.emit({
						type: 'status',
						status: failed ? 'failed' : 'ready',
						detail: failed ? 'Claude turn failed' : 'Claude ready',
					});
					this.resolvePendingClaudeTurnApprovals('deny', 'Claude turn ended before the request was answered.');
					cleanupFinalClaudeTurn();
				});

				finishStart({ ok: true, sessionKey, threadId: this.threadId, turnId: this.currentTurnId });
			};

			startProcess();
		});
	}

	handleClaudeSdkMessage(message) {
		try {
			this.handleClaudeLine(JSON.stringify(message));
		}
		catch (error) {
			this.emit({
				type: 'error',
				content: `Failed to process Claude SDK message: ${error instanceof Error ? error.message : 'Unknown error'}`,
				raw: message,
			});
		}
	}

	handleClaudeLine(line) {
		let message;
		try {
			message = JSON.parse(line);
		}
		catch {
			const text = String(line || '').trim();
			if (text) {
				this.emit({ type: 'chunk', chunk: { type: 'text', content: text } });
			}
			return;
		}
		if (message.session_id) {
			const sessionKey = this.activeSessionKey || 'default';
			const fork = this.pendingClaudeFork;
			const launch = this.activeClaudeLaunch;
			const returnedSessionId = String(message.session_id || '').trim();
			const expectedSessionId = String(launch?.expectedSessionId || '').trim();
			const isForkSession = !!fork || !!launch?.fork;
			const needsHistoryRebuild = !!expectedSessionId && !!returnedSessionId && returnedSessionId !== expectedSessionId && !isForkSession;
			this.setSessionThreadId(sessionKey, returnedSessionId, {
				needsHistoryRebuild: needsHistoryRebuild ? true : undefined,
			});
			if (needsHistoryRebuild) {
				this.emit({
					type: 'status',
					status: 'ready',
					detail: 'Claude returned a new session; visible history will be rebuilt on the next turn',
				});
			}
			this.emit({
				type: 'thread',
				provider: this.settings.provider,
				sessionKey,
				threadId: this.threadId,
				fork: fork ? { sourceThreadId: fork.sourceThreadId, resumeAt: fork.resumeAt } : undefined,
			});
			this.pendingClaudeFork = null;
		}
		if (message.type === 'system' && message.subtype === 'init') {
			const runtimeCommands = extractClaudeRuntimeCommandsFromInitMessage(message);
			if (runtimeCommands.length > 0) {
				this.emit({
					type: 'provider-assets',
					assets: {
						claudeRuntimeCommands: runtimeCommands,
					},
				});
			}
			if (message.model) {
				this.recordRuntimeModel('claude', message.model, { sessionKey: this.activeSessionKey, threadId: this.threadId });
			}
			this.emit({
				type: 'status',
				status: 'ready',
				detail: `Claude ${message.model || this.settings.model} ready`,
			});
			return;
		}
		if (message.type === 'system' && message.subtype === 'compact_boundary') {
			this.emit({ type: 'chunk', chunk: { type: 'context_compacted' }, raw: message });
			return;
		}
		if (message.type === 'stream_event') {
			this.handleClaudeStreamEvent(message.event || {});
			return;
		}
		if (message.type === 'control_request') {
			this.handleClaudeControlRequest(message);
			return;
		}
		if (message.type === 'assistant') {
			if (message.error) {
				this.emit({ type: 'error', content: String(message.error || 'Claude assistant error'), raw: message });
			}
			const assistantMessageId = message.uuid || message.message?.uuid || message.message?.id || '';
			if (assistantMessageId) {
				this.currentTurnId = assistantMessageId;
				this.emit({
					type: 'turn-metadata',
					sessionKey: this.activeSessionKey,
					threadId: this.threadId,
					turnId: assistantMessageId,
					assistantMessageId,
				});
			}
			const text = extractClaudeTextFromMessage(message.message);
			if (text && !this.claudeStreamState?.textDeltaSeen) {
				this.emit({ type: 'chunk', chunk: { type: 'text', content: text }, raw: message });
			}
			this.handleClaudeAssistantBlocks(message);
			return;
		}
		if (message.type === 'user') {
			this.handleClaudeUserBlocks(message);
			return;
		}
		if (message.type === 'result') {
			const resultSubtype = String(message.subtype || '');
			if (message.is_error || (resultSubtype && resultSubtype !== 'success')) {
				const errors = Array.isArray(message.errors)
					? message.errors.map((entry) => String(entry || '').trim()).filter(Boolean).join('\n')
					: '';
				this.emit({ type: 'error', content: errors || message.result || message.error || `Claude result error: ${resultSubtype || 'error'}`, raw: message });
				return;
			}
			this.emitClaudeUsage(message.usage, message.modelUsage);
		}
	}

	handleClaudeControlRequest(message) {
		const requestId = getClaudeControlRequestId(message);
		const request = isRecord(message?.request) ? message.request : {};
		const subtype = String(request.subtype || message.subtype || '').trim();
		if (!requestId) {
			this.emit({ type: 'error', content: 'Claude control request is missing request_id', raw: message });
			return;
		}
		if (subtype === 'can_use_tool') {
			this.handleClaudeCanUseToolRequest(requestId, request, message);
			return;
		}
		if (subtype === 'elicitation') {
			this.handleClaudeElicitationRequest(requestId, request, message);
			return;
		}
		this.writeClaudeControlResponse(requestId, {
			acknowledged: true,
			subtype: subtype || 'unknown',
		});
	}

	handleClaudeCanUseToolRequest(requestId, request, rawMessage) {
		const toolName = String(request.tool_name || request.toolName || request.name || 'Tool');
		const input = normalizeClaudeControlInput(request.input);
		const toolUseId = String(request.tool_use_id || request.toolUseID || request.toolUseId || '').trim();
		const questions = toolName === 'AskUserQuestion' ? normalizeClaudeElicitationQuestions({ ...request, input }) : [];
		const commonMeta = {
			source: 'claude-control',
			requestId,
			threadId: this.threadId || '',
			controlRequest: {
				subtype: 'can_use_tool',
				toolName,
				input,
				toolUseId,
				suggestions: request.suggestions || request.permission_suggestions || request.permissionSuggestions || [],
				decisionClassification: request.decision_classification || request.decisionClassification || '',
				raw: rawMessage,
			},
		};
		if (toolName === 'ExitPlanMode') {
			this.requestApproval({
				kind: 'exit_plan',
				title: 'Plan complete',
				description: request.description || 'Claude is ready to leave plan mode.',
				input,
				plan: readClaudePlanContent(input),
				permissions: getClaudePlanPermissions(input),
			}, commonMeta);
			return;
		}
		if (questions.length > 0) {
			this.requestApproval({
				kind: 'question',
				title: request.title || 'Claude asks',
				description: request.description || 'Claude needs more input.',
				input,
				questions,
			}, commonMeta);
			return;
		}
		const blockedPath = String(request.blocked_path || request.blockedPath || '').trim();
		const decisionReason = String(request.decision_reason || request.decisionReason || '').trim();
		this.requestApproval({
			kind: getClaudeApprovalKind(toolName),
			title: request.title || `Allow ${toolName}?`,
			description: request.description || decisionReason || getClaudeActionDescription(toolName, input),
			tool: toolName,
			icon: getClaudeToolIcon(toolName),
			input: {
				...input,
				...(blockedPath ? { path: blockedPath } : {}),
				...(decisionReason ? { reason: decisionReason } : {}),
			},
		}, {
			...commonMeta,
			controlRequest: {
				...commonMeta.controlRequest,
				blockedPath,
				decisionReason,
			},
		});
	}

	handleClaudeElicitationRequest(requestId, request, rawMessage) {
		const questions = normalizeClaudeElicitationQuestions(request);
		this.requestApproval({
			kind: 'question',
			title: request.title || 'Claude asks',
			description: request.description || request.prompt || request.message || 'Claude needs more input.',
			input: normalizeClaudeControlInput(request.input),
			questions,
		}, {
			source: 'claude-control',
			requestId,
			threadId: this.threadId || '',
			controlRequest: {
				subtype: 'elicitation',
				raw: rawMessage,
			},
		});
	}

	buildClaudeControlApprovalResponse(controlRequest, payload) {
		const control = isRecord(controlRequest) ? controlRequest : {};
		const response = {};
		if (control.toolUseId) {
			response.toolUseID = control.toolUseId;
		}
		if (control.decisionClassification) {
			response.decisionClassification = control.decisionClassification;
		}
		if (control.toolName === 'AskUserQuestion') {
			if (payload?.cancelled) {
				return {
					...response,
					behavior: 'deny',
					message: 'User declined to answer.',
					interrupt: true,
				};
			}
			const answers = isRecord(payload?.answers) ? payload.answers : {};
			return {
				...response,
				behavior: 'allow',
				updatedInput: {
					...(control.input || {}),
					answers,
				},
			};
		}
		if (control.subtype === 'elicitation') {
			const answers = isRecord(payload?.answers) ? payload.answers : {};
			if (payload?.cancelled) {
				return { cancelled: true, answers };
			}
			return { answers };
		}
		if (control.toolName === 'ExitPlanMode') {
			const planDecision = isRecord(payload?.planDecision) ? payload.planDecision : null;
			if (!planDecision || planDecision.type === 'cancel') {
				return {
					...response,
					behavior: 'deny',
					message: 'User interrupted.',
					interrupt: true,
				};
			}
			if (planDecision.type === 'feedback') {
				return {
					...response,
					behavior: 'deny',
					message: planDecision.text || 'Continue planning.',
					interrupt: false,
				};
			}
			return {
				...response,
				behavior: 'allow',
				updatedInput: control.input || {},
				updatedPermissions: [{
					type: 'setMode',
					mode: resolveClaudeSdkPermissionMode(this.settings),
					destination: 'session',
				}],
			};
		}
		const decision = typeof payload === 'string' ? payload : String(payload?.decision || 'deny');
		if (decision === 'allow' || decision === 'allow-always') {
			return {
				...response,
				behavior: 'allow',
				updatedInput: control.input || {},
				updatedPermissions: buildClaudePermissionUpdates(
					control.toolName || 'Tool',
					control.input || {},
					decision,
					control.suggestions,
				),
			};
		}
		return {
			...response,
			behavior: 'deny',
			message: decision === 'cancel' ? 'User interrupted.' : 'User denied this action.',
			interrupt: decision === 'cancel',
		};
	}

	writeClaudeControlResponse(requestId, response) {
		const id = String(requestId || '').trim();
		if (!id) {
			return false;
		}
		const envelope = {
			type: 'control_response',
			response: {
				subtype: 'success',
				request_id: id,
				response: response || {},
			},
		};
		const line = `${JSON.stringify(envelope)}\n`;
		const stdin = this.proc?.stdin;
		if (!stdin || stdin.destroyed || stdin.writableEnded) {
			this.emit({ type: 'stderr', content: `Claude control response could not be written for ${id}: stdin is closed.` });
			return false;
		}
		try {
			stdin.write(line);
			return true;
		}
		catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.emit({ type: 'stderr', content: `Claude control response failed for ${id}: ${message}` });
			return false;
		}
	}

	resolvePendingClaudeControlRequests(decision = 'deny', reason = '') {
		for (const approvalId of this.pendingClaudeControlRequests.values()) {
			const pending = this.pendingApprovals.get(approvalId);
			if (!pending || pending.source !== 'claude-control') {
				continue;
			}
			this.pendingApprovals.delete(approvalId);
			clearTimeout(pending.timer);
			pending.resolve(pending.kind === 'question' ? { cancelled: true, answers: {} } : decision, reason);
		}
		this.pendingClaudeControlRequests.clear();
	}

	resolvePendingClaudeSdkApprovals(decision = 'deny', reason = 'claude-turn-ended') {
		for (const [approvalId, pending] of this.pendingApprovals.entries()) {
			if (!pending || pending.source !== 'claude-sdk') {
				continue;
			}
			this.pendingApprovals.delete(approvalId);
			clearTimeout(pending.timer);
			pending.resolve(pending.kind === 'question' ? { cancelled: true, answers: {} } : decision, reason);
		}
	}

	resolvePendingClaudeTurnApprovals(decision = 'deny', reason = 'Claude turn ended before the request was answered.') {
		this.resolvePendingClaudeControlRequests(decision, reason);
		this.resolvePendingClaudeSdkApprovals(decision, reason);
	}

	resolvePendingCodexApprovals(decision = 'cancel', reason = 'Codex turn ended before the request was answered.', threadId = '') {
		const targetThreadId = String(threadId || this.threadId || '').trim();
		for (const [approvalId, pending] of this.pendingApprovals.entries()) {
			if (!pending || pending.source === 'claude-control' || pending.source === 'claude-sdk') {
				continue;
			}
			if (targetThreadId && pending.threadId && pending.threadId !== targetThreadId) {
				continue;
			}
			this.pendingApprovals.delete(approvalId);
			clearTimeout(pending.timer);
			pending.resolve(pending.kind === 'question' ? { cancelled: true, answers: {} } : decision, reason);
		}
	}

	handleClaudeAssistantBlocks(message) {
		const blocks = Array.isArray(message?.message?.content) ? message.message.content : [];
		for (const block of blocks) {
			if (!block || typeof block !== 'object') {
				continue;
			}
			if (block.type === 'thinking' && block.thinking && !this.claudeStreamState?.thinkingDeltaSeen) {
				this.emit({ type: 'chunk', chunk: { type: 'thinking', content: block.thinking }, raw: message });
				continue;
			}
			if (block.type === 'tool_use') {
				const id = block.id || `claude-tool-${Date.now()}`;
				this.emit({
					type: 'chunk',
					chunk: {
						type: 'tool_use',
						id,
						name: block.name || 'Tool',
						input: getClaudeToolInput(block.input),
					},
					raw: message,
				});
			}
		}
	}

	handleClaudeUserBlocks(message) {
		const parentToolUseId = String(message?.parent_tool_use_id || '');
		const userMessageId = String(message?.uuid || message?.message?.uuid || message?.message?.id || '').trim();
		if (!parentToolUseId && userMessageId) {
			this.emit({
				type: 'user-metadata',
				sessionKey: this.activeSessionKey,
				threadId: this.threadId,
				userMessageId,
			});
		}
		if (message.tool_use_result !== undefined && parentToolUseId) {
			const content = extractClaudeToolResultContent(message.tool_use_result);
			this.emit({
				type: 'chunk',
				chunk: {
					type: 'tool_result',
					id: parentToolUseId,
					content,
					result: content,
					isError: false,
					toolUseResult: message.tool_use_result,
				},
				raw: message,
			});
		}
		const blocks = Array.isArray(message?.message?.content) ? message.message.content : [];
		for (const block of blocks) {
			if (!block || typeof block !== 'object' || block.type !== 'tool_result') {
				continue;
			}
			const id = String(block.tool_use_id || parentToolUseId || '');
			if (!id) {
				continue;
			}
			const content = extractClaudeToolResultContent(block.content);
			this.emit({
				type: 'chunk',
				chunk: {
					type: 'tool_result',
					id,
					content,
					result: content,
					isError: block.is_error === true,
				},
				raw: message,
			});
		}
	}

	handleClaudeStreamEvent(event) {
		if (!event || typeof event !== 'object') {
			return;
		}
		if (event.type === 'message_start') {
			const assistantMessageId = event.message?.id || event.message?.uuid || '';
			if (assistantMessageId) {
				this.currentTurnId = assistantMessageId;
				this.emit({
					type: 'turn-metadata',
					sessionKey: this.activeSessionKey,
					threadId: this.threadId,
					turnId: assistantMessageId,
					assistantMessageId,
				});
			}
			return;
		}
		if (event.type === 'content_block_start') {
			const block = event.content_block || {};
			if (block.type === 'tool_use') {
				const id = block.id || `claude-tool-${event.index || 0}`;
				this.claudeStreamState?.toolBlocks?.set(event.index, {
					id,
					name: block.name || 'Tool',
					input: getClaudeToolInput(block.input),
					inputJson: '',
				});
				this.emit({
					type: 'chunk',
					chunk: {
						type: 'tool_use',
						id,
						name: block.name || 'Tool',
						input: getClaudeToolInput(block.input),
					},
					raw: event,
				});
			}
			return;
		}
		if (event.type === 'content_block_delta') {
			const delta = event.delta || {};
			if (delta.type === 'text_delta') {
				this.claudeStreamState.textDeltaSeen = true;
				this.emit({ type: 'chunk', chunk: { type: 'text', content: delta.text || '' }, raw: event });
				return;
			}
			if (delta.type === 'thinking_delta') {
				if (this.claudeStreamState) {
					this.claudeStreamState.thinkingDeltaSeen = true;
				}
				this.emit({ type: 'chunk', chunk: { type: 'thinking', content: delta.thinking || delta.text || '' }, raw: event });
				return;
			}
			if (delta.type === 'input_json_delta') {
				const tool = this.claudeStreamState?.toolBlocks?.get(event.index);
				if (tool) {
					tool.inputJson += delta.partial_json || '';
				}
			}
			return;
		}
		if (event.type === 'content_block_stop') {
			const tool = this.claudeStreamState?.toolBlocks?.get(event.index);
			if (tool) {
				let input = tool.input;
				if (tool.inputJson) {
					try {
						input = JSON.parse(tool.inputJson);
					}
					catch {
						input = { input: tool.inputJson };
					}
				}
				this.emit({
					type: 'chunk',
					chunk: {
						type: 'tool_use',
						id: tool.id,
						name: tool.name,
						input,
					},
					raw: event,
				});
				this.claudeStreamState.toolBlocks.delete(event.index);
			}
			return;
		}
		if (event.type === 'message_delta') {
			this.emitClaudeUsage(event.usage);
		}
	}

	emitClaudeUsage(usage, modelUsage) {
		const primaryUsage = usage && typeof usage === 'object' ? usage : {};
		const modelEntries = modelUsage && typeof modelUsage === 'object' ? Object.entries(modelUsage) : [];
		const modelPair = modelEntries.find(([, entry]) => entry && typeof entry === 'object') || [];
		const modelKey = String(modelPair[0] || '');
		const modelEntry = modelPair[1] && typeof modelPair[1] === 'object' ? modelPair[1] : {};
		const model = String(modelEntry.model || modelEntry.modelId || modelKey || this.settings.model || '').trim();
		const inputTokens = Number(primaryUsage.input_tokens || modelEntry.inputTokens || 0);
		const outputTokens = Number(primaryUsage.output_tokens || modelEntry.outputTokens || 0);
		const cacheReadInputTokens = Number(primaryUsage.cache_read_input_tokens || modelEntry.cacheReadInputTokens || 0);
		const cacheCreationInputTokens = Number(primaryUsage.cache_creation_input_tokens || modelEntry.cacheCreationInputTokens || 0);
		const contextTokens = inputTokens + cacheReadInputTokens + cacheCreationInputTokens;
		const totalTokens = contextTokens + outputTokens;
		const authoritativeContextWindow = Number(modelEntry.contextWindow || 0) || 0;
		const contextWindow = authoritativeContextWindow || getContextWindowSize(model || this.settings.model);
		this.emit({
			type: 'chunk',
			chunk: {
				type: 'usage',
				usage: {
					model,
					inputTokens,
					outputTokens,
					cacheReadInputTokens,
					cacheCreationInputTokens,
					contextTokens,
					totalTokens,
					contextWindow,
					contextWindowIsAuthoritative: authoritativeContextWindow > 0,
					percentage: contextWindow > 0 ? Math.min(100, Math.max(0, Math.round((contextTokens / contextWindow) * 100))) : 0,
				},
			},
		});
	}

	registerTurnTempDir(turnId, tempDir) {
		const key = String(turnId || '');
		if (!key || !tempDir) {
			cleanupTempDir(tempDir);
			return;
		}
		const existing = this.turnTempDirs.get(key);
		if (!existing) {
			this.turnTempDirs.set(key, tempDir);
			return;
		}
		this.turnTempDirs.set(key, Array.isArray(existing) ? [...existing, tempDir] : [existing, tempDir]);
	}

	cleanupTurnTempDir(turnId) {
		const key = String(turnId || '');
		if (!key || !this.turnTempDirs.has(key)) {
			return;
		}
		const tempDir = this.turnTempDirs.get(key);
		this.turnTempDirs.delete(key);
		if (Array.isArray(tempDir)) {
			tempDir.forEach((entry) => cleanupTempDir(entry));
			return;
		}
		cleanupTempDir(tempDir);
	}

	resetCodexTurnState() {
		this.agentTextDeltaSeen = false;
		this.sawPlanDelta = false;
		this.currentPlanText = '';
		this.rawStartedCallIds.clear();
		this.rawCompletedCallIds.clear();
		this.rawToolNamesByCallId.clear();
		this.rawToolInputsByCallId.clear();
		this.rawToolOutputsByCallId.clear();
		this.suppressedRawCallIds.clear();
		this.fileChangeInputsById.clear();
		this.seenWebSearchIds.clear();
		this.startedUserMessageIds.clear();
		this.startedAgentMessageIds.clear();
		this.agentMessageDeltaIds.clear();
		this.streamedAssistantTurnText = '';
		this.currentAssistantSegmentText = '';
	}

	extractNotificationScope(method, params) {
		if (!params || typeof params !== 'object') {
			return null;
		}
		const threadId = typeof params.threadId === 'string' ? params.threadId : null;
		if (method === 'turn/completed') {
			const turnId = params.turn && typeof params.turn === 'object' && typeof params.turn.id === 'string'
				? params.turn.id
				: (typeof params.turnId === 'string' ? params.turnId : null);
			return threadId && turnId ? { threadId, turnId } : null;
		}
		const turnId = typeof params.turnId === 'string'
			? params.turnId
			: (typeof params.turn_id === 'string' ? params.turn_id : null);
		return threadId && turnId ? { threadId, turnId } : null;
	}

	handleTurnStartedNotification(params) {
		const threadId = String(params?.threadId || this.threadId || '').trim();
		const turnId = String(params?.turn?.id || params?.turnId || params?.turn_id || '').trim();
		if (!threadId || !turnId || (this.threadId && threadId !== this.threadId)) {
			return;
		}
		if (!this.currentTurnId) {
			this.currentTurnId = turnId;
			this.emit({ type: 'turn-started', sessionKey: this.activeSessionKey, threadId, turnId: this.currentTurnId });
			this.flushPendingTurnNotifications();
		}
	}

	shouldDispatchCodexNotification(method, params) {
		if (method === 'turn/started') {
			this.handleTurnStartedNotification(params);
			return false;
		}
		const scope = this.extractNotificationScope(method, params);
		if (!scope) {
			return true;
		}
		if (this.threadId && scope.threadId !== this.threadId) {
			return false;
		}
		if (!this.currentTurnId) {
			this.pendingTurnNotifications.push({ method, params });
			if (this.pendingTurnNotifications.length > CODEX_PENDING_TURN_NOTIFICATION_MAX) {
				this.pendingTurnNotifications.splice(0, this.pendingTurnNotifications.length - CODEX_PENDING_TURN_NOTIFICATION_MAX);
			}
			return false;
		}
		return scope.turnId === this.currentTurnId;
	}

	flushPendingTurnNotifications() {
		if (!this.currentTurnId) {
			this.pendingTurnNotifications = [];
			return;
		}
		const pending = this.pendingTurnNotifications;
		this.pendingTurnNotifications = [];
		for (const notification of pending) {
			const scope = this.extractNotificationScope(notification.method, notification.params);
			if (!scope || ((!this.threadId || scope.threadId === this.threadId) && scope.turnId === this.currentTurnId)) {
				this.dispatchNotification(notification.method, notification.params);
			}
		}
	}

	readRawCallId(item = {}) {
		return String(item.call_id || item.callId || item.id || '').trim();
	}

	parseRawArguments(item = {}) {
		return parseJsonish(item.arguments || item.input || {});
	}

	resetAssistantSegmentText() {
		this.currentAssistantSegmentText = '';
	}

	emitRawAssistantText(item = {}) {
		if (item.role && item.role !== 'assistant') {
			return;
		}
		const text = item.type === 'message'
			? textFromProviderContent(item.content)
			: String(item.text || item.message || '');
		if (!text) {
			return;
		}
		let missing = text;
		if (this.currentAssistantSegmentText && text.startsWith(this.currentAssistantSegmentText)) {
			missing = text.slice(this.currentAssistantSegmentText.length);
		}
		else if (this.agentTextDeltaSeen) {
			missing = '';
		}
		this.currentAssistantSegmentText = appendLimitedText('', text, CODEX_TURN_TEXT_MEMORY_MAX_CHARS);
		if (missing) {
			this.streamedAssistantTurnText = appendLimitedText(this.streamedAssistantTurnText, missing, CODEX_TURN_TEXT_MEMORY_MAX_CHARS);
			this.emit({ type: 'chunk', chunk: { type: 'text', content: missing }, raw: { method: 'rawResponseItem/completed', params: { item } } });
		}
	}

	emitRawToolUse(callId, item = {}) {
		const name = codexToolName(item);
		const input = codexToolInput(item);
		addBoundedSetEntry(this.rawStartedCallIds, callId);
		setBoundedMapEntry(this.rawToolNamesByCallId, callId, name);
		setBoundedMapEntry(this.rawToolInputsByCallId, callId, input);
		addBoundedSetEntry(this.activeToolIds, callId);
		this.resetAssistantSegmentText();
		this.emit({ type: 'chunk', chunk: { type: 'tool_use', id: callId, name, input }, raw: { method: 'rawResponseItem/completed', params: { item } } });
	}

	emitRawToolResult(callId, item = {}) {
		const name = this.rawToolNamesByCallId.get(callId);
		if (!name) {
			return;
		}
		const input = this.rawToolInputsByCallId.get(callId) || {};
		const rawResult = codexToolResult(item);
		const content = normalizeRawCodexToolOutput(name, rawResult, input);
		setBoundedMapEntry(this.rawToolOutputsByCallId, callId, {
			id: callId,
			name,
			input,
			content,
			result: content,
			isError: item.status === 'failed' || item.status === 'error' || !!item.error || isCodexRawToolOutputError(rawResult),
		});
	}

	emitStoredRawToolResult(callId, rawResult, raw = null) {
		if (!rawResult) {
			return false;
		}
		addBoundedSetEntry(this.rawCompletedCallIds, callId);
		this.emit({
			type: 'chunk',
			chunk: {
				type: 'tool_result',
				id: rawResult.id || callId,
				name: rawResult.name,
				input: rawResult.input || {},
				content: rawResult.content,
				result: rawResult.result ?? rawResult.content,
				isError: !!rawResult.isError,
			},
			raw: raw || { method: 'rawResponseItem/completed', params: {} },
		});
		return true;
	}

	consumeRawToolOutput(callId, raw = null) {
		const result = this.rawToolOutputsByCallId.get(callId);
		this.rawToolOutputsByCallId.delete(callId);
		return this.emitStoredRawToolResult(callId, result, raw);
	}

	flushPendingRawToolOutputs(method, params) {
		for (const [callId, result] of this.rawToolOutputsByCallId.entries()) {
			this.emitStoredRawToolResult(callId, result, { method, params });
		}
		this.rawToolOutputsByCallId.clear();
	}

	rememberFileChangeInput(itemId, input) {
		const previous = this.fileChangeInputsById.get(itemId);
		const merged = mergeApplyPatchInputs(previous, input || {});
		setBoundedMapEntry(this.fileChangeInputsById, itemId, merged);
		return merged;
	}

	emitFileChangeToolUse(itemId, changes) {
		const input = this.rememberFileChangeInput(itemId, buildFileChangeInput(changes));
		addBoundedSetEntry(this.activeToolIds, itemId);
		this.resetAssistantSegmentText();
		this.emit({
			type: 'chunk',
			chunk: {
				type: 'tool_use',
				id: itemId,
				name: 'apply_patch',
				input,
			},
			raw: { method: 'item/fileChange', params: { itemId, changes } },
		});
	}

	emitFileChangeToolResult(item) {
		const input = this.rememberFileChangeInput(item.id, buildFileChangeInput(item.changes || []));
		const content = fileChangeSummary(input) || 'File change completed';
		this.emit({
			type: 'chunk',
			chunk: {
				type: 'tool_result',
				id: item.id,
				name: 'apply_patch',
				input,
				content,
				result: content,
				isError: item.status === 'failed' || item.status === 'declined' || item.status === 'error',
			},
			raw: { method: 'item/completed', params: { item } },
		});
	}

	handleFileChangePatchUpdated(params = {}) {
		const itemId = String(params.itemId || '').trim();
		if (!itemId) {
			return;
		}
		this.emitFileChangeToolUse(itemId, params.changes || []);
	}

	handleEventMsg(params = {}) {
		const payload = params?.payload && typeof params.payload === 'object' ? params.payload : params;
		if (isCodexContextCompactionItem(payload)) {
			this.emit({ type: 'chunk', chunk: { type: 'context_compacted' }, raw: { method: 'event_msg', params } });
			return;
		}
		if (payload?.type !== 'agent_message') {
			return;
		}
		const text = String(payload.text || payload.message || '');
		if (!text) {
			return;
		}
		const missing = this.streamedAssistantTurnText && text.startsWith(this.streamedAssistantTurnText)
			? text.slice(this.streamedAssistantTurnText.length)
			: (this.streamedAssistantTurnText ? '' : text);
		if (missing) {
			this.streamedAssistantTurnText = appendLimitedText(this.streamedAssistantTurnText, missing, CODEX_TURN_TEXT_MEMORY_MAX_CHARS);
			this.currentAssistantSegmentText = appendLimitedText(this.currentAssistantSegmentText, missing, CODEX_TURN_TEXT_MEMORY_MAX_CHARS);
			this.emit({ type: 'chunk', chunk: { type: 'text', content: missing }, raw: { method: 'event_msg', params } });
		}
	}

	handleRawResponseItemCompleted(params = {}) {
		const item = params?.item && typeof params.item === 'object' ? params.item : {};
		if (!item.type) {
			return;
		}
		if (item.type === 'message' || item.type === 'agentMessage') {
			this.emitRawAssistantText(item);
			return;
		}
		if (item.type === 'reasoning') {
			const content = codexReasoningText(item);
			if (content.trim()) {
				this.emit({ type: 'chunk', chunk: { type: 'thinking', content }, raw: { method: 'rawResponseItem/completed', params } });
			}
			return;
		}
		if (item.type === 'function_call' || item.type === 'custom_tool_call' || item.type === 'web_search_call' || item.type === 'mcp_tool_call') {
			const callId = this.readRawCallId(item);
			if (!callId) {
				return;
			}
			const rawName = String(item.name || item.type || '');
			const rawInput = this.parseRawArguments(item);
			if (item.type === 'function_call' && rawName === 'write_stdin' && isSilentWriteStdinInput(rawInput)) {
				addBoundedSetEntry(this.suppressedRawCallIds, callId);
				return;
			}
			if (item.type === 'custom_tool_call' && rawName === 'apply_patch') {
				addBoundedSetEntry(this.suppressedRawCallIds, callId);
				const patch = typeof rawInput?.patch === 'string'
					? rawInput.patch
					: typeof rawInput?.input === 'string'
						? rawInput.input
						: '';
				this.rememberFileChangeInput(callId, patch ? { patch } : rawInput);
				this.resetAssistantSegmentText();
				return;
			}
			if (!this.rawStartedCallIds.has(callId)) {
				this.emitRawToolUse(callId, item);
			}
			if (item.type === 'web_search_call' || item.type === 'mcp_tool_call') {
				const result = codexToolResult(item);
				if (result) {
					this.emitRawToolResult(callId, item);
				}
			}
			return;
		}
		if (item.type === 'function_call_output' || item.type === 'custom_tool_call_output') {
			const callId = this.readRawCallId(item);
			if (this.suppressedRawCallIds.delete(callId)) {
				return;
			}
			if (callId) {
				this.emitRawToolResult(callId, item);
			}
		}
	}

	handleNotification(method, params) {
		this.log('runtime.codex.notification', summarizeCodexNotification(method, params));
		if (method === 'serverRequest/resolved' || method === 'server/requestResolved') {
			this.handleServerRequestResolved(params);
			return;
		}
		if (!this.shouldDispatchCodexNotification(method, params)) {
			return;
		}
		this.dispatchNotification(method, params);
	}

	dispatchNotification(method, params) {
		switch (method) {
			case 'item/agentMessage/delta':
				this.agentTextDeltaSeen = true;
				if (params?.itemId) {
					addBoundedSetEntry(this.agentMessageDeltaIds, params.itemId);
				}
				this.currentAssistantSegmentText = appendLimitedText(this.currentAssistantSegmentText, params?.delta || '', CODEX_TURN_TEXT_MEMORY_MAX_CHARS);
				this.streamedAssistantTurnText = appendLimitedText(this.streamedAssistantTurnText, params?.delta || '', CODEX_TURN_TEXT_MEMORY_MAX_CHARS);
				this.emit({ type: 'chunk', chunk: { type: 'text', content: params?.delta || '' }, raw: { method, params } });
				break;
			case 'item/reasoning/summaryTextDelta':
			case 'item/reasoning/textDelta':
				this.emit({ type: 'chunk', chunk: { type: 'thinking', content: params?.delta || '' }, raw: { method, params } });
				break;
			case 'item/plan/delta':
				this.sawPlanDelta = true;
				this.currentPlanText = appendLimitedText(this.currentPlanText, params?.delta || '', CODEX_PLAN_TEXT_MEMORY_MAX_CHARS);
				this.emit({ type: 'chunk', chunk: { type: 'text', content: params?.delta || '' }, raw: { method, params } });
				break;
			case 'turn/plan/updated':
				this.planUpdateCounter += 1;
				{
					const syntheticId = `plan-update-${params?.turnId || this.planUpdateCounter}`;
					const input = { todos: buildCodexPlanTodos(params?.plan || []) };
					this.resetAssistantSegmentText();
					this.emit({ type: 'chunk', chunk: { type: 'tool_use', id: syntheticId, name: 'TodoWrite', input }, raw: { method, params } });
					this.emit({ type: 'chunk', chunk: { type: 'tool_result', id: syntheticId, name: 'TodoWrite', input, content: 'Plan updated', result: 'Plan updated', isError: false }, raw: { method, params } });
				}
				break;
			case 'thread/tokenUsage/updated':
				this.emit({ type: 'chunk', chunk: { type: 'usage', usage: normalizeCodexTokenUsage(params), sessionId: params?.threadId || this.threadId || '' }, raw: { method, params } });
				break;
			case 'item/reasoning/summaryPartAdded':
			case 'thread/started':
			case 'thread/statusChanged':
			case 'thread/status/changed':
				break;
			case 'rawResponseItem/completed':
				this.handleRawResponseItemCompleted(params);
				break;
			case 'event_msg':
				this.handleEventMsg(params);
				break;
			case 'item/started':
				this.handleItemStarted(params);
				break;
			case 'item/completed':
				this.handleItemCompleted(params);
				break;
			case 'item/commandExecution/outputDelta':
			case 'item/fileChange/outputDelta':
				this.emit({
					type: 'chunk',
					chunk: {
						type: 'tool_output',
						id: params?.itemId || '',
						content: params?.delta || '',
					},
					raw: { method, params },
				});
				break;
			case 'item/fileChange/patchUpdated':
				this.handleFileChangePatchUpdated(params);
				break;
			case 'error':
				if (params?.willRetry) {
					break;
				}
				this.emit({
					type: 'error',
					content: params?.error?.message || params?.message || 'Codex error',
					raw: { method, params },
				});
				break;
			case 'turn/completed':
				this.cleanupTurnTempDir(params?.turn?.id || params?.turnId || this.currentTurnId);
				this.resolvePendingCodexApprovals('cancel', 'Codex turn completed before the request was answered.', params?.threadId || this.threadId);
				if (params?.turn?.status === 'failed' && params?.turn?.error) {
					this.emit({ type: 'error', content: params.turn.error.message || 'Codex error', raw: { method, params } });
				}
				if (params?.turn?.status === 'completed' && this.sawPlanDelta) {
					this.emit({ type: 'chunk', chunk: { type: 'plan_completed', plan: this.currentPlanText || 'Plan complete.' }, raw: { method, params } });
				}
				this.flushPendingRawToolOutputs(method, params);
				this.emit({
					type: 'done',
					sessionKey: this.activeSessionKey,
					status: String(params?.turn?.status || 'completed').trim() || 'completed',
					raw: { method, params },
				});
				this.currentTurnId = null;
				this.activeSessionKey = null;
				this.activeToolIds.clear();
				this.pendingTurnNotifications = [];
				this.resetCodexTurnState();
				break;
			default:
				this.emit({ type: 'raw', method, params });
				break;
		}
	}

	extractUserMessageText(content) {
		return (Array.isArray(content) ? content : [])
			.map((part) => part?.type === 'text' || part?.type === 'input_text' ? part.text || '' : '')
			.filter(Boolean)
			.join('\n\n');
	}

	emitUserMessageBoundary(item, params) {
		if (!item?.id || this.startedUserMessageIds.has(item.id)) {
			return;
		}
		addBoundedSetEntry(this.startedUserMessageIds, item.id);
		this.emit({
			type: 'chunk',
			chunk: {
				type: 'user_message_start',
				itemId: item.id,
				content: this.extractUserMessageText(item.content),
			},
			raw: { method: 'item/started', params },
		});
	}

	emitAgentMessageBoundary(item, params) {
		if (!item?.id || this.startedAgentMessageIds.has(item.id)) {
			return;
		}
		addBoundedSetEntry(this.startedAgentMessageIds, item.id);
		this.emit({
			type: 'chunk',
			chunk: {
				type: 'assistant_message_start',
				itemId: item.id,
			},
			raw: { method: 'item/started', params },
		});
	}

	emitMissingAssistantText(text, raw) {
		const value = String(text || '');
		if (!value) {
			return;
		}
		let missing = value;
		if (this.currentAssistantSegmentText && value.startsWith(this.currentAssistantSegmentText)) {
			missing = value.slice(this.currentAssistantSegmentText.length);
		}
		else if (this.currentAssistantSegmentText) {
			missing = value;
		}
		this.currentAssistantSegmentText = appendLimitedText('', value, CODEX_TURN_TEXT_MEMORY_MAX_CHARS);
		if (!missing) {
			return;
		}
		this.streamedAssistantTurnText = appendLimitedText(this.streamedAssistantTurnText, missing, CODEX_TURN_TEXT_MEMORY_MAX_CHARS);
		this.emit({ type: 'chunk', chunk: { type: 'text', content: missing }, raw });
	}

	handleItemStarted(params) {
		const item = params?.item;
		const id = getItemId(item);
		if (!id || !item || item.type === 'reasoning') {
			return;
		}
		if (item.type === 'userMessage') {
			this.emitUserMessageBoundary(item, params);
			return;
		}
		if (item.type === 'agentMessage') {
			this.emitAgentMessageBoundary(item, params);
			return;
		}
		if (this.rawStartedCallIds.has(id)) {
			return;
		}
		if (item.type === 'fileChange') {
			this.emitFileChangeToolUse(id, item.changes || []);
			return;
		}
		if (item.type === 'webSearch') {
			if (this.seenWebSearchIds.has(id)) {
				return;
			}
			addBoundedSetEntry(this.seenWebSearchIds, id);
		}
		addBoundedSetEntry(this.activeToolIds, id);
		this.resetAssistantSegmentText();
		this.emit({
			type: 'chunk',
			chunk: {
				type: 'tool_use',
				id,
				name: getToolName(item),
				input: getToolInput(item),
			},
			raw: { method: 'item/started', params },
		});
	}

	handleItemCompleted(params) {
		const item = params?.item;
		if (isCodexContextCompactionItem(item)) {
			this.emit({ type: 'chunk', chunk: { type: 'context_compacted' }, raw: { method: 'item/completed', params } });
			return;
		}
		const id = getItemId(item);
		if (!id || !item) {
			return;
		}
		if (this.rawCompletedCallIds.has(id)) {
			return;
		}
		if (item.type === 'userMessage') {
			this.emitUserMessageBoundary(item, params);
			return;
		}
		if (item.type === 'agentMessage') {
			this.emitAgentMessageBoundary(item, params);
			if (!this.agentMessageDeltaIds.has(id) && item.text) {
				this.emitMissingAssistantText(item.text, { method: 'item/completed', params });
			}
			return;
		}
		if (item.type === 'fileChange') {
			this.emitFileChangeToolUse(id, item.changes || []);
			this.emitFileChangeToolResult(item);
			return;
		}
		if (!this.activeToolIds.has(id)) {
			return;
		}
		if (this.consumeRawToolOutput(id, { method: 'item/completed', params })) {
			return;
		}
		const result = getToolResult(item);
		this.emit({
			type: 'chunk',
			chunk: {
				type: 'tool_result',
				id,
				name: getToolName(item),
				input: getToolInput(item),
				...(typeof result === 'string' ? { content: result } : {}),
				result,
				isError: item.status === 'failed' || item.status === 'error' || item.status === 'declined' || item.exitCode > 0 || item.exit_code > 0,
			},
			raw: { method: 'item/completed', params },
		});
	}

	handleServerRequestResolved(params = {}) {
		const requestId = params?.requestId !== undefined && params?.requestId !== null ? String(params.requestId) : '';
		const threadId = String(params?.threadId || '');
		const reason = params?.reason || params?.status || '';
		let resolvedId = '';
		let resolvedPending = null;
		for (const [approvalId, pending] of this.pendingApprovals.entries()) {
			const requestMatches = requestId && pending.requestId === requestId;
			const threadMatches = !threadId || !pending.threadId || pending.threadId === threadId;
			if (requestMatches && threadMatches) {
				resolvedId = approvalId;
				resolvedPending = pending;
				break;
			}
		}
		if (resolvedId && resolvedPending) {
			this.pendingApprovals.delete(resolvedId);
			clearTimeout(resolvedPending.timer);
			resolvedPending.resolve(resolvedPending.kind === 'question' ? { answers: {} } : 'cancel', reason || 'runtime-resolved');
			return;
		}
		this.emit({
			type: 'approval_resolved',
			id: '',
			requestId,
			threadId,
			reason,
		});
	}

	emitApprovalResolved(approvalId, requestId = '', threadId = '', reason = '') {
		this.emit({
			type: 'approval_resolved',
			id: approvalId,
			requestId,
			threadId,
			reason,
		});
	}

	getServerRequestMeta(params, meta) {
		const requestId = meta?.id !== undefined && meta?.id !== null ? String(meta.id) : '';
		const threadId = String(params?.threadId || this.threadId || '');
		return { requestId, threadId };
	}

	async handleServerRequest(method, params, meta) {
		const requestMeta = this.getServerRequestMeta(params, meta);
		if (method === 'item/commandExecution/requestApproval') {
			const decision = await this.requestApproval({
				kind: 'command',
				title: 'Execute command?',
				description: params?.command || params?.reason || 'Codex wants to execute a command.',
				input: {
					command: params?.command || '',
					cwd: params?.cwd || '',
					reason: params?.reason || '',
					commandActions: params?.commandActions || null,
					approvalId: params?.approvalId || null,
					networkApprovalContext: params?.networkApprovalContext || null,
					additionalPermissions: params?.additionalPermissions || null,
					skillMetadata: params?.skillMetadata || null,
					proposedExecpolicyAmendment: params?.proposedExecpolicyAmendment || null,
					proposedNetworkPolicyAmendments: params?.proposedNetworkPolicyAmendments || null,
				},
				decisionOptions: buildCodexCommandApprovalDecisionOptions(params || {}),
			}, requestMeta);
			return { decision: this.mapCommandDecision(decision) };
		}
		if (method === 'item/fileChange/requestApproval') {
			const decision = await this.requestApproval({
				kind: 'file_change',
				title: 'Apply file change?',
				description: params?.reason || 'Codex wants to change files.',
				input: params || {},
			}, requestMeta);
			return { decision: decision === 'allow-always' ? 'acceptForSession' : decision === 'allow' ? 'accept' : decision === 'cancel' ? 'cancel' : 'decline' };
		}
		if (method === 'item/permissions/requestApproval') {
			const decision = await this.requestApproval({
				kind: 'permissions',
				title: 'Grant permissions?',
				description: params?.reason || 'Codex requests extra permissions.',
				input: params?.permissions || {},
			}, requestMeta);
			if (decision === 'allow' || decision === 'allow-always') {
				return {
					permissions: params?.permissions || {},
					scope: decision === 'allow-always' ? 'session' : 'turn',
				};
			}
			return { permissions: {}, scope: 'turn' };
		}
		if (method === 'item/tool/requestUserInput') {
			const answer = await this.requestApproval({
				kind: 'question',
				title: 'Codex asks',
				description: 'Codex needs more input.',
				input: params || {},
				questions: params?.questions || [],
			}, requestMeta);
			return {
				answers: normalizeCodexUserInputAnswers(answer?.answers),
			};
		}
		throw new Error(`Unsupported Codex server request: ${method}#${meta?.id || ''}`);
	}

	mapCommandDecision(decision) {
		if (decision === 'allow') {
			return 'accept';
		}
		if (decision === 'allow-always') {
			return 'acceptForSession';
		}
		if (decision === 'cancel') {
			return 'cancel';
		}
		if (isRecord(decision) && decision.type === 'select-option') {
			const decoded = decodeCodexCommandApprovalDecision(decision.value);
			if (decoded) {
				return decoded;
			}
		}
		return 'decline';
	}

	requestApproval(payload, requestMeta = {}) {
		const approvalId = `approval-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const source = String(requestMeta.source || '');
		const requestId = requestMeta.requestId || '';
		const threadId = requestMeta.threadId || '';
		const controlRequest = isRecord(requestMeta.controlRequest) ? requestMeta.controlRequest : null;
		this.log('runtime.approval.request', {
			approvalId,
			...summarizeApprovalPayloadForLog(payload, { ...requestMeta, source, requestId, threadId }),
		});
		this.emit({
			type: 'approval',
			approval: {
				id: approvalId,
				runtimeRequestId: requestId,
				runtimeThreadId: threadId,
				...payload,
			},
		});
		return new Promise((resolve) => {
			const finish = (value, reason = 'answered') => {
				if (source === 'claude-control') {
					if (controlRequest) {
						this.writeClaudeControlResponse(
							requestId,
							this.buildClaudeControlApprovalResponse(controlRequest, value),
						);
					}
					if (requestId) {
						this.pendingClaudeControlRequests.delete(requestId);
					}
				}
				this.emitApprovalResolved(approvalId, requestId, threadId, reason);
				resolve(value);
			};
			const timer = setTimeout(() => {
				this.pendingApprovals.delete(approvalId);
				finish(payload?.kind === 'question' ? { answers: {} } : 'deny', 'timeout');
			}, 10 * 60 * 1000);
			this.pendingApprovals.set(approvalId, {
				resolve: finish,
				timer,
				kind: payload?.kind || '',
				requestId,
				threadId,
				source,
				controlRequest,
			});
			if (source === 'claude-control' && requestId) {
				this.pendingClaudeControlRequests.set(requestId, approvalId);
			}
		});
	}

	handleApprovalResponse(payload) {
		const id = String(payload?.id || '');
		const pending = this.pendingApprovals.get(id);
		if (!pending) {
			this.log('runtime.approval.response.missing', {
				approvalId: id,
				cancelled: payload?.cancelled === true,
				decision: payload?.decision || '',
				hasAnswers: !!(payload?.answers && typeof payload.answers === 'object'),
				hasPlanDecision: isRecord(payload?.planDecision),
			});
			return { ok: false, error: 'Approval request not found' };
		}
		this.pendingApprovals.delete(id);
		clearTimeout(pending.timer);
		this.log('runtime.approval.response', {
			approvalId: id,
			requestId: pending.requestId || '',
			threadId: pending.threadId || '',
			source: pending.source || '',
			cancelled: payload?.cancelled === true,
			decision: payload?.decision || '',
			hasAnswers: !!(payload?.answers && typeof payload.answers === 'object'),
			hasPlanDecision: isRecord(payload?.planDecision),
		});
		if (payload?.cancelled) {
			pending.resolve({ cancelled: true, answers: isRecord(payload.answers) ? payload.answers : {} });
		}
		else if (isRecord(payload?.planDecision)) {
			pending.resolve({ planDecision: payload.planDecision });
		}
		else if (payload?.answers && typeof payload.answers === 'object') {
			pending.resolve({ answers: payload.answers });
		}
		else {
			pending.resolve(payload?.decision || 'deny');
		}
		return { ok: true };
	}

	emit(envelope) {
		const sessionScopedEvent = ['chunk', 'error', 'done', 'turn-started', 'turn-metadata', 'user-metadata'].includes(envelope?.type);
		const routedEnvelope = sessionScopedEvent && !envelope?.sessionKey && this.activeSessionKey
			? { ...envelope, sessionKey: this.activeSessionKey }
			: envelope;
		if (this.activeClaudeLaunch && routedEnvelope?.type === 'chunk' && this.claudeStreamState) {
			this.claudeStreamState.sawAnyChunk = true;
		}
		this.logRuntimeEncodingIssue(routedEnvelope);
		this.log('runtime.emit', summarizeRuntimeEnvelope(routedEnvelope || {}));
		if (this.webContents && !this.webContents.isDestroyed()) {
			this.webContents.send(IPC.event, {
				...routedEnvelope,
				at: Date.now(),
			});
		}
	}

	async shutdown(options = {}) {
		this.stateSupplementGeneration += 1;
		this.clearStateSupplementTimers();
		this.cleanupAllTitleGenerations();
		this.cleanupInstructionRefineSession();
		this.cleanupInlineEditSession();
		for (const job of this.markdownNoteAiJobs.values()) {
			job.cancelled = true;
			job.finished = true;
			if (job.timeoutTimer) {
				clearTimeout(job.timeoutTimer);
				job.timeoutTimer = null;
			}
			job.transport?.dispose();
			job.transport = null;
			terminateProcess(job.proc);
		}
		this.markdownNoteAiJobs.clear();
		this.claudeAbortController?.abort();
		if (this.claudeSdkQuery && typeof this.claudeSdkQuery.close === 'function') {
			this.claudeSdkQuery.close();
		}
		this.claudeSdkQuery = null;
		this.claudeAbortController = null;
		for (const pending of this.pendingApprovals.values()) {
			clearTimeout(pending.timer);
			pending.resolve('deny');
		}
		this.pendingApprovals.clear();
		this.pendingClaudeControlRequests.clear();
		for (const tempDir of this.turnTempDirs.values()) {
			if (Array.isArray(tempDir)) {
				tempDir.forEach((entry) => cleanupTempDir(entry));
			}
			else {
				cleanupTempDir(tempDir);
			}
		}
		this.turnTempDirs.clear();
		this.transport?.dispose();
		this.transport = null;
		if (this.proc && !this.proc.killed) {
			terminateProcess(this.proc);
		}
		this.proc = null;
		this.threadId = null;
		this.currentTurnId = null;
		this.activeSessionKey = null;
		this.loadedThreadId = null;
		this.pendingTurnNotifications = [];
		this.resetCodexTurnState();
		this.sessions.clear();
		if (options.unregisterIpc !== false) {
			this.unregister();
		}
	}
}

function registerClaudianSidebarRuntime(ipcMain, options = {}) {
	const runtime = new ClaudianSidebarRuntime({ ...options, ipcMain });
	return runtime.register();
}

module.exports = {
	ClaudianSidebarRuntime,
	IPC,
	registerClaudianSidebarRuntime,
	resolveClaudeRuntimeExecutable,
	resolveNativeCliRoute,
	buildEphemeralCliTranslationLaunchSpec,
	createDecodedLineReader,
	terminateProcess,
	__testing: {
		appendContextFiles,
		buildRefineSystemPrompt,
		buildCodexForkReplayPrompt,
		buildCodexInput,
		buildCodexCommandApprovalDecisionOptions,
		decodeCodexCommandApprovalDecision,
		normalizeCodexUserInputAnswers,
		buildClaudePromptWithHistoryContext,
		buildHistoryContext,
		buildTitleGenerationPrompt,
		buildInlineEditPrompt,
		getInlineEditSystemPrompt,
		parseInlineEditResponse,
		parseInstructionRefineResponse,
		parseTitleGenerationResponse,
		normalizeNativeCodexToolName,
		nativeToolIcon,
		normalizeRawCodexToolInput,
		normalizeRawCodexToolOutput,
		isCodexRawToolOutputError,
		INLINE_EDIT_READ_ONLY_TOOLS,
		buildProviderModelAssets,
		normalizeRuntimeModelListUrl,
		normalizeClaudeRuntimeModelListUrl,
		normalizeRuntimeModelAssets,
		mergeRuntimeModelAssets,
		extractModelReasoningMetadata,
		normalizeReasoningEffortList,
		getReasoningEffortCapabilities,
		safeReasoningEffort,
		resolveClaudeEffort,
		fetchCodexRuntimeModelAssets,
		fetchClaudeRuntimeModelAssets,
		buildCodexEnvOverrides,
		buildPdfAiContextEnvironment,
		buildClaudeEnvironment,
		stripRoutingEnvironmentVariables,
		getCodexHomeDir,
		getClaudeConfigDir,
		readCodexCliConfig,
		readClaudeCliConfig,
		readNativeClaudeCliEnv,
		getNativeCliConfigurationFingerprint,
		resolveNativeCliRoute,
		normalizeLlmProviderMode,
		resolveRuntimeModelForProvider,
		computeClaudeRuntimeCommandHash,
		computeCodexEnvironmentHash,
		buildRuntimePreflight,
		resolveClaudeRuntimeExecutable,
		resolveCodexCommand,
		resolveManagedCodexExecutable,
		parseCodexVersion,
		compareCodexVersions,
		getCodexUpgradePlan,
		resolveInstalledCodexExecutable,
		resolveWindowsLaunchableCommand,
		probeExecutable,
		probeCodexCli,
		buildNativeHistory,
		discoverNativeHistories,
		isAllowedRuntimeIpcEvent,
		normalizeRuntimeIpcEntryUrl,
		resolveOpenPathTarget,
		resolveBangBashWorkspace,
		resolveCodexLaunchSpec,
		resolveCodexTargetWorkspace,
		resolveSandboxConfig,
		mapCodexHostPathToTarget,
		mapCodexTargetPathToHost,
		resolveClaudeAuxQueryArgs,
		withUtf8ProcessEnv,
		terminateProcess,
		appendLimitedText,
		createProcessTextDecoder,
		createDecodedLineReader,
		CodexRpcTransport,
		normalizeSettings,
		downloadAndInstallManagedCodex,
		getCodexDownloadInfo,
		getCodexDownloadSources,
		normalizeCodexDownloadSource,
		hashFileSha256,
	},
};
