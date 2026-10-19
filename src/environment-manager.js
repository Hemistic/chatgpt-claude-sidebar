'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { spawn } = require('child_process');
const { createHash, randomUUID } = require('crypto');
const extractZip = require('extract-zip');
const tar = require('tar');
const { activatePlatformEnvironment, unixExecutableCandidates } = require('./platform-environment');

const IDS = ['powershell', 'node', 'codex', 'claude', 'python'];
const NAMES = { powershell: 'PowerShell', node: 'Node.js', codex: 'Codex CLI', claude: 'Claude Code CLI', python: 'Python' };
const VERSION_PATTERNS = {
	powershell: /^\d+\.\d+/u,
	node: /^v\d+\./u,
	python: /^Python\s+\d+\./iu,
	codex: /\d+\.\d+/u,
	claude: /\d+\.\d+/u,
};

function versionLine(id, output) {
	return String(output || '').split(/\r?\n/u).map((line) => line.trim())
		.find((line) => VERSION_PATTERNS[id]?.test(line)) || '';
}

function installableIds(platform = process.platform, arch = process.arch) {
	if (platform === 'win32' && arch === 'x64') return [...IDS];
	if (platform === 'darwin' && ['arm64', 'x64'].includes(arch)) return ['codex', 'claude'];
	return [];
}

function nativeCliPackageSpec(parent, id, platform = process.platform, arch = process.arch) {
	const target = `${platform}-${arch}`;
	const dependency = Object.entries(parent.metadata.optionalDependencies || {}).find(([name]) => name.endsWith(`-${target}`));
	let name, version;
	if (dependency) {
		const alias = dependency[1].match(/^npm:(@[^/]+\/[^@]+)@(.+)$/);
		[name, version] = alias ? [alias[1], alias[2]] : dependency;
	} else if (id === 'codex') {
		name = '@openai/codex'; version = `${parent.version}-${target}`;
	} else throw new Error(`Claude release does not publish a native ${target} package`);
	const triple = platform === 'darwin' ? `${arch === 'arm64' ? 'aarch64' : 'x86_64'}-apple-darwin` : 'x86_64-pc-windows-msvc';
	const executable = id === 'codex'
		? `package/vendor/${triple}/bin/codex${platform === 'win32' ? '.exe' : ''}`
		: `package/claude${platform === 'win32' ? '.exe' : ''}`;
	return { name, version, executable };
}

function discoverPythonInstallations(env = process.env) {
	if (process.platform !== 'win32') return unixExecutableCandidates('python3', env).map(command => ({ command, source: 'local-install' }));
	const candidates = [];
	const seen = new Set();
	const add = (executable, source) => {
		if (!executable || candidates.length >= 24 || !fs.existsSync(executable)) return;
		const normalized = path.normalize(executable);
		const key = normalized.toLowerCase();
		if (seen.has(key)) return;
		seen.add(key);
		candidates.push({ command: normalized, source });
	};
	const addInstallations = (directory, source) => {
		if (!directory) return;
		add(path.join(directory, 'python.exe'), source);
		let entries = [];
		try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { return; }
		for (const entry of entries.filter((item) => item.isDirectory()
			&& /^(?:Python\d+|\d+\.\d+(?:\.\d+)?|cpython-[\w.-]+)$/iu.test(item.name))
			.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }))) {
			add(path.join(directory, entry.name, 'python.exe'), source);
		}
	};
	const profile = env.USERPROFILE || '';
	const localAppData = env.LOCALAPPDATA || (profile ? path.join(profile, 'AppData', 'Local') : '');
	for (const [directory, source] of [
		[env.VIRTUAL_ENV ? path.join(env.VIRTUAL_ENV, 'Scripts') : '', 'virtual-env'],
		[env.CONDA_PREFIX, 'conda'],
	]) {
		if (directory) add(path.join(directory, 'python.exe'), source);
	}
	addInstallations(localAppData ? path.join(localAppData, 'Programs', 'Python') : '', 'local-install');
	for (const [directory, source] of [
		[profile ? path.join(profile, 'miniconda3') : '', 'conda'],
		[profile ? path.join(profile, 'anaconda3') : '', 'conda'],
		[profile ? path.join(profile, 'scoop', 'apps', 'python', 'current') : '', 'scoop'],
	]) {
		if (directory) add(path.join(directory, 'python.exe'), source);
	}
	addInstallations(env.ProgramFiles || '', 'program-files');
	addInstallations(env['ProgramFiles(x86)'] || '', 'program-files');
	addInstallations(profile ? path.join(profile, '.pyenv', 'pyenv-win', 'versions') : '', 'pyenv');
	addInstallations(env.UV_PYTHON_INSTALL_DIR || (localAppData ? path.join(localAppData, 'uv', 'python') : ''), 'uv');
	return candidates;
}

function run(file, args, env = process.env) {
	return new Promise((resolve) => {
		const isWindowsBatch = process.platform === 'win32' && /\.(?:cmd|bat)$/iu.test(file);
		if (isWindowsBatch && (/[&|<>^%!"\r\n()]/u.test(file)
			|| !args.every((arg) => /^[-A-Za-z0-9_]+$/u.test(arg)))) {
			resolve({ ok: false, output: 'Unsafe Windows batch command path' });
			return;
		}
		let output = '';
		let child;
		try {
			// A batch file needs cmd.exe on Windows. Only fixed, shell-safe probe
			// arguments are allowed, and they are included in one command string.
			child = spawn(isWindowsBatch ? `"${file}" ${args.join(' ')}` : file,
				isWindowsBatch ? [] : args, { env, windowsHide: true, shell: isWindowsBatch });
		}
		catch (error) {
			resolve({ ok: false, output: error.message });
			return;
		}
		const timer = setTimeout(() => { child.kill(); resolve({ ok: false, output: 'Probe timed out' }); }, 10000);
		const collect = (data) => { output = (output + data).slice(-16000); };
		child.stdout?.on('data', collect);
		child.stderr?.on('data', collect);
		child.on('error', (error) => { clearTimeout(timer); resolve({ ok: false, output: error.message }); });
		child.on('close', (code) => { clearTimeout(timer); resolve({ ok: code === 0, output: output.trim() }); });
	});
}

class EnvironmentManager {
	constructor(root, fetcher = fetch, options = {}) {
		this.root = path.resolve(root);
		this.fetcher = fetcher;
		this.onInstalled = options.onInstalled;
		this.getSettings = options.getSettings;
		this.items = [];
		this.job = null;
		this.checking = null;
		try { this.config = JSON.parse(fs.readFileSync(path.join(root, 'environment.json'), 'utf8')); } catch { this.config = {}; }
		this.region = this.config.region === 'global' ? 'global' : 'china';
		this.activate();
	}
	activate() {
		activatePlatformEnvironment();
		const dirs = Object.values(this.config.paths || {}).filter(p => typeof p === 'string' && fs.existsSync(p)).map(p => path.dirname(p));
		const key = Object.keys(process.env).find(k => k.toLowerCase() === 'path') || 'PATH';
		process.env[key] = [...new Set([...dirs, ...(process.env[key] || '').split(path.delimiter)])].join(path.delimiter);
	}
	async persist() {
		await fsp.mkdir(this.root, { recursive: true });
		const temp = path.join(this.root, `environment-${randomUUID()}.tmp`);
		await fsp.writeFile(temp, JSON.stringify({ ...this.config, region: this.region }));
		await fsp.rename(temp, path.join(this.root, 'environment.json'));
	}
	async check(settings = {}) {
		if (this.checking) return this.checking;
		this.checking = (async () => {
			const items = [];
			for (const id of IDS.filter(id => process.platform === 'win32' || id !== 'powershell')) {
				const defaults = process.platform !== 'win32'
					? (id === 'python' ? ['python3', 'python'] : [id])
					: id === 'powershell'
					? ['pwsh.exe', path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')]
					: id === 'python' ? ['python.exe', 'python3.exe']
						: id === 'codex' || id === 'claude' ? [`${id}.exe`, `${id}.cmd`]
							: [`${id}.exe`];
				const candidates = [
					{ command: settings[`${id}Path`], source: 'settings' },
					{ command: this.config.paths?.[id], source: 'saved' },
					...defaults.map((command) => ({ command, source: 'PATH' })),
					...(process.platform !== 'win32' ? unixExecutableCandidates(id === 'python' ? 'python3' : id).map(command => ({ command, source: 'local-install' })) : []),
					...(id === 'python' ? discoverPythonInstallations() : []),
					...(id === 'python' && process.platform === 'win32' ? [{ command: 'py.exe', source: 'launcher' }] : []),
				];
				const seen = new Set();
				let item = { id, name: NAMES[id], canInstall: installableIds().includes(id), ok: false, version: '', path: '', source: '', error: '', attempts: [] };
				for (const candidate of candidates) {
					const command = typeof candidate.command === 'string' ? candidate.command.trim() : '';
					const key = process.platform === 'win32' ? command.toLowerCase() : command;
					if (!command || seen.has(key)) continue;
					seen.add(key);
					const args = id === 'powershell' ? ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()'] : ['--version'];
					const result = await run(command, args);
					const version = result.ok ? versionLine(id, result.output) : '';
					const valid = !!version;
					const output = String(result.output || '').trim().slice(0, 300);
					item.attempts.push({ command, source: candidate.source, ok: valid, output: output || (valid ? version : 'No version output') });
					if (valid) {
						item = { ...item, ok: true, path: command, source: candidate.source, version, error: '' };
						break;
					}
					item.error = output || 'Version check failed';
				}
				if (!item.ok) item.error = item.attempts.length
					? `No runnable ${item.name} found after checking ${item.attempts.length} candidate${item.attempts.length === 1 ? '' : 's'}`
					: 'No executable candidates';
				items.push(item);
			}
			this.items = items;
			return { ...this.snapshot(), checking: false };
		})().finally(() => { this.checking = null; });
		return this.checking;
	}
	snapshot() { return { region: this.region, items: this.items, job: this.job, checking: !!this.checking, supported: installableIds().length > 0, installableIds: installableIds() }; }
	async request(payload = {}, settings = {}) {
		if (payload.action === 'region') {
			if (this.job?.status === 'running') throw new Error('An installation is running');
			if (!['china', 'global'].includes(payload.region)) throw new Error('Invalid region');
			this.region = payload.region; await this.persist();
		} else if (payload.action === 'use-path') {
			if (payload.id !== 'python') throw new Error('Only a Python executable can be selected here');
			const executable = String(payload.path || '').trim().replace(/^"(.*)"$/u, '$1');
			if (!path.isAbsolute(executable) || (process.platform === 'win32' && path.basename(executable).toLowerCase() !== 'python.exe')) {
				throw new Error(process.platform === 'win32' ? 'Choose the full path to python.exe' : 'Choose the full path to the Python executable');
			}
			let stat;
			try { stat = await fsp.stat(executable); } catch { throw new Error('Python executable does not exist'); }
			if (!stat.isFile()) throw new Error('Python path is not a file');
			const probe = await run(executable, ['--version']);
			if (!probe.ok || !versionLine('python', probe.output)) {
				throw new Error(`Python version check failed: ${String(probe.output || '').slice(0, 300)}`);
			}
			this.config.paths = { ...this.config.paths, python: executable };
			await this.persist(); this.activate();
			return this.check(settings);
		} else if (payload.action === 'install') {
			if (!IDS.includes(payload.id)) throw new Error('Unknown component');
			if (!installableIds().includes(payload.id)) throw new Error(`Automatic ${payload.id} installation is unavailable on ${process.platform}-${process.arch}`);
			if (this.job?.status === 'running') throw new Error('An installation is already running');
			this.job = { id: payload.id, status: 'running', stage: 'metadata', percent: 0 };
			void this.install(payload.id).then(async () => {
				this.job = { ...this.job, stage: 'checking', percent: 99 };
				if (this.checking) await this.checking;
				await this.check(this.getSettings?.() || settings);
				this.job = { ...this.job, status: 'completed', stage: 'ready', percent: 100 };
			}).catch(error => { this.job = { ...this.job, status: 'failed', error: error.message }; });
		} else if (payload.action === 'check' || !this.items.length) return this.check(settings);
		return this.snapshot();
	}
	async bytes(url, limit = 4 * 1024 * 1024) {
		if (new URL(url).protocol !== 'https:') throw new Error('HTTPS required');
		const response = await this.fetcher(url, { signal: AbortSignal.timeout(180000), redirect: 'follow' });
		if (!response.ok) throw new Error(`Download HTTP ${response.status}: ${new URL(url).hostname}`);
		if (response.url && new URL(response.url).protocol !== 'https:') throw new Error('Insecure redirect');
		const totalBytes = Number(response.headers?.get('content-length')) || 0;
		let size = 0; const chunks = [];
		for await (const value of response.body) {
			size += value.length; if (size > limit) throw new Error('Download exceeds size limit');
			chunks.push(Buffer.from(value));
			if (limit > 4 * 1024 * 1024 && this.job) this.job = { ...this.job, stage: 'downloading', downloadedBytes: size, totalBytes, percent: totalBytes ? Math.min(85, 5 + size / totalBytes * 80) : 5 };
		}
		return Buffer.concat(chunks);
	}
	async json(url) { return JSON.parse((await this.bytes(url)).toString('utf8')); }
	async npmArtifact(name, version = 'latest') {
		const registry = this.region === 'china' ? 'https://registry.npmmirror.com' : 'https://registry.npmjs.org';
		const metadata = await this.json(`${registry}/${name}/${version}`);
		const integrity = metadata.dist?.integrity;
		if (!/^sha512-[A-Za-z0-9+/]+=*$/.test(integrity || '')) throw new Error('Missing package SHA512 integrity');
		return { url: metadata.dist.tarball, algorithm: 'sha512', hash: integrity.slice(7), encoding: 'base64', version: metadata.version, format: 'tgz', metadata };
	}
	async artifact(id) {
		if (id === 'node') {
			const base = this.region === 'china' ? 'https://npmmirror.com/mirrors/node' : 'https://nodejs.org/dist';
			const releases = await this.json(`${base}/index.json`);
			const release = releases.find(r => r.lts && r.files.includes('win-x64-zip'));
			if (!release || !/^v\d+\.\d+\.\d+$/.test(release.version)) throw new Error('No Node LTS release found');
			const file = `node-${release.version}-win-x64.zip`;
			const sums = (await this.bytes(`${base}/${release.version}/SHASUMS256.txt`)).toString();
			const hash = sums.split('\n').map(l=>l.trim().split(/\s+/)).find(parts=>parts[1]===file)?.[0];
			return { url: `${base}/${release.version}/${file}`, algorithm:'sha256', hash, encoding:'hex', version:release.version, format:'zip', executable:`node-${release.version}-win-x64/node.exe` };
		}
		if (id === 'codex' || id === 'claude') {
			const parent = await this.npmArtifact(id === 'codex' ? '@openai/codex' : '@anthropic-ai/claude-code');
			const spec = nativeCliPackageSpec(parent, id);
			const artifact = await this.npmArtifact(spec.name, spec.version);
			return { ...artifact, executable: spec.executable };
		}
		if (id === 'python') {
			// The embeddable distribution stays self-contained and never changes the
			// system Python installation. Python.org publishes an authenticated SHA256
			// digest in its Sigstore bundle for this exact artifact.
			const version = '3.12.10';
			const file = `python-${version}-embed-amd64.zip`;
			const url = `https://www.python.org/ftp/python/${version}/${file}`;
			const bundle = await this.json(`${url}.sigstore`);
			const hash = bundle?.messageSignature?.messageDigest?.digest;
			if (bundle?.messageSignature?.messageDigest?.algorithm !== 'SHA2_256' || !/^[A-Za-z0-9+/]+={0,2}$/.test(hash || '')) {
				throw new Error('Python release signature bundle does not contain SHA256');
			}
			return { url,algorithm:'sha256',hash,encoding:'base64',version,format:'zip',executable:'python.exe' };
		}
		const release = await this.json('https://api.github.com/repos/PowerShell/PowerShell/releases/latest');
		const asset = release.assets?.find(a=>/win-x64.zip$/.test(a.name));
		if (!asset?.digest?.startsWith('sha256:')) throw new Error('PowerShell release has no SHA256 digest');
		return { url:asset.browser_download_url,algorithm:'sha256',hash:asset.digest.slice(7),encoding:'hex',version:release.tag_name,format:'zip',executable:'pwsh.exe' };
	}
	async install(id) {
		if (!installableIds().includes(id)) throw new Error(`Unsupported installation: ${id} on ${process.platform}-${process.arch}`);
		const artifact = await this.artifact(id);
		if (!artifact.hash || !/^[A-Za-z0-9+/=]+$/.test(artifact.hash)) throw new Error('Missing checksum');
		const buffer = await this.bytes(artifact.url, 300 * 1024 * 1024);
		if (createHash(artifact.algorithm).update(buffer).digest(artifact.encoding) !== artifact.hash) throw new Error('Checksum mismatch; installation aborted');
		const dir = path.join(this.root, `${id}-${randomUUID()}`);
		await fsp.mkdir(dir, { recursive:true });
		try {
			this.job = { ...this.job, stage:'extracting', percent: 90 };
			const archive = path.join(dir, 'archive'); await fsp.writeFile(archive, buffer);
			if (artifact.format === 'zip') await extractZip(archive, { dir });
			else await tar.x({file:archive,cwd:dir,strict:true,filter:(_p,e)=>['File','Directory'].includes(e.type)});
			await fsp.unlink(archive);
			const executable = path.join(dir, artifact.executable);
			if (process.platform !== 'win32') await fsp.chmod(executable, 0o755);
			this.job = { ...this.job, stage:'validating', percent: 95 };
			const probe = await run(executable, id === 'powershell' ? ['-NoProfile','-Command','$PSVersionTable.PSVersion.ToString()'] : ['--version']);
			if (!probe.ok || !versionLine(id, probe.output)) throw new Error(`Installed component failed validation: ${probe.output}`);
			this.config.paths = { ...this.config.paths, [id]:executable };
			await this.persist(); this.activate();
		} catch (error) { await fsp.rm(dir,{recursive:true,force:true}); throw error; }
		// The executable is valid and persisted before runtime settings are updated.
		// Keep it available if a running AI turn prevents switching right now.
		await this.onInstalled?.({ id, executable: this.config.paths[id], version: artifact.version });
	}
}
module.exports = { EnvironmentManager, IDS, run, discoverPythonInstallations, installableIds, nativeCliPackageSpec };
