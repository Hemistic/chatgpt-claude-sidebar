(function (root, factory) {
	if (typeof module === 'object' && module.exports) {
		module.exports = factory(typeof globalThis !== 'undefined' ? globalThis : root);
		return;
	}
	root.ClaudianSidebarEmbed = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
	'use strict';

	const DEFAULT_FRAME_ID = 'claudian-sidebar-frame';
	const DEFAULT_CHILD_PATH = './claudian-sidebar.html';
	const DEFAULT_HOST_STATE_KEY = 'claudian-sidebar-host-state-v1';
	const DEFAULT_HOST_WIDTH = 420;
	const MIN_HOST_WIDTH = 320;
	const MAX_HOST_WIDTH = 720;
	const MAX_URL_STRING_CHARS = 8192;
	const MAX_SEARCH_STRING_CHARS = 16384;
	const MAX_SEARCH_PARAM_ENTRIES = 64;
	const MAX_SEARCH_PARAM_KEY_CHARS = 80;
	const MAX_SEARCH_PARAM_VALUE_CHARS = 4096;
	const MAX_PASSTHROUGH_KEYS = 32;
	const MAX_ALLOWED_ORIGINS = 16;
	const MAX_ORIGIN_CHARS = 512;
	const MAX_MESSAGE_RECORDS = 200;
	const MAX_MESSAGE_TYPE_CHARS = 120;
	const MAX_MESSAGE_METHOD_CHARS = 80;
	const MAX_MESSAGE_ID_CHARS = 120;
	const MAX_HOST_STATE_RAW_CHARS = 16384;
	const DEFAULT_PASSTHROUGH_PARAMS = Object.freeze([
		'runtimeMode',
		'provider',
		'model',
		'workspace',
		'resetState',
		'contextPercent',
		'contextWindow',
		'mockScenario',
	]);

	function capString(value, maxLength) {
		const text = String(value ?? '');
		return text.length > maxLength ? text.slice(0, maxLength) : text;
	}

	function normalizeParamKey(value) {
		const key = capString(value, MAX_SEARCH_PARAM_KEY_CHARS).trim();
		return key || '';
	}

	function appendBoundedParam(target, key, value, mode = 'set') {
		const normalizedKey = normalizeParamKey(key);
		if (!normalizedKey || target.size >= MAX_SEARCH_PARAM_ENTRIES) {
			return false;
		}
		const normalizedValue = capString(value, MAX_SEARCH_PARAM_VALUE_CHARS);
		if (mode === 'append') {
			target.append(normalizedKey, normalizedValue);
		}
		else {
			target.set(normalizedKey, normalizedValue);
		}
		return true;
	}

	function normalizePassthroughKeys(value) {
		const source = Array.isArray(value) ? value : DEFAULT_PASSTHROUGH_PARAMS;
		const keys = [];
		for (const item of source) {
			const key = normalizeParamKey(item);
			if (!key || keys.includes(key)) {
				continue;
			}
			keys.push(key);
			if (keys.length >= MAX_PASSTHROUGH_KEYS) {
				break;
			}
		}
		return keys;
	}

	function toSearchParams(value) {
		const params = new URLSearchParams();
		if (!value) {
			return params;
		}
		if (typeof value === 'string') {
			return toSearchParams(new URLSearchParams(capString(value.startsWith('?') ? value.slice(1) : value, MAX_SEARCH_STRING_CHARS)));
		}
		if (value instanceof URLSearchParams) {
			let count = 0;
			for (const [key, raw] of value.entries()) {
				if (!appendBoundedParam(params, key, raw, 'append')) {
					break;
				}
				count += 1;
				if (count >= MAX_SEARCH_PARAM_ENTRIES) {
					break;
				}
			}
			return params;
		}
		if (typeof URL !== 'undefined' && value instanceof URL) {
			return toSearchParams(value.search || '');
		}
		if (typeof value === 'object') {
			let count = 0;
			for (const key in value) {
				if (!Object.prototype.hasOwnProperty.call(value, key)) {
					continue;
				}
				const raw = value[key];
				if (raw === undefined || raw === null) {
					continue;
				}
				if (Array.isArray(raw)) {
					for (const item of raw) {
						if (item !== undefined && item !== null) {
							if (!appendBoundedParam(params, key, item, 'append')) {
								return params;
							}
							count += 1;
							if (count >= MAX_SEARCH_PARAM_ENTRIES) {
								return params;
							}
						}
					}
					continue;
				}
				if (!appendBoundedParam(params, key, raw)) {
					break;
				}
				count += 1;
				if (count >= MAX_SEARCH_PARAM_ENTRIES) {
					break;
				}
			}
		}
		return params;
	}

	function getDefaultBaseUrl() {
		return root?.location?.href || 'http://localhost/';
	}

	function getLocationSearch() {
		return root?.location?.search || '';
	}

	function getDefaultStorage() {
		try {
			return root?.localStorage || null;
		}
		catch {
			return null;
		}
	}

	function copyParams(source, target, keys) {
		for (const key of keys) {
			const value = source.get(key);
			if (value !== null) {
				appendBoundedParam(target, key, value);
			}
		}
	}

	function applyParams(target, source) {
		for (const [key, value] of source.entries()) {
			appendBoundedParam(target, key, value);
		}
	}

	function collectOptionParams(options, keys) {
		const params = new URLSearchParams();
		for (const key of keys) {
			const value = options[key];
			if (value !== undefined && value !== null) {
				appendBoundedParam(params, key, value);
			}
		}
		return params;
	}

	function buildUrl(options = {}) {
		const baseUrl = capString(options.baseUrl || getDefaultBaseUrl(), MAX_URL_STRING_CHARS);
		const childUrl = new URL(capString(options.childUrl || options.childPath || DEFAULT_CHILD_PATH, MAX_URL_STRING_CHARS), baseUrl);
		const childUrlParams = toSearchParams(childUrl.searchParams);
		childUrl.search = '';
		applyParams(childUrl.searchParams, childUrlParams);
		const passthroughKeys = normalizePassthroughKeys(options.passthroughParams);
		const sourceParams = options.sourceParams !== undefined
			? toSearchParams(options.sourceParams)
			: options.passthroughFromLocation === false
				? new URLSearchParams()
				: toSearchParams(getLocationSearch());
		copyParams(sourceParams, childUrl.searchParams, passthroughKeys);
		applyParams(childUrl.searchParams, collectOptionParams(options, passthroughKeys));
		applyParams(childUrl.searchParams, toSearchParams(options.params));
		if (options.parentBridge !== false) {
			childUrl.searchParams.set('parentBridge', '1');
		}
		return childUrl.toString();
	}

	function normalizeAllowedOrigins(value) {
		if (value === undefined || value === null || value === '') {
			const origin = String(root?.location?.origin || '').trim();
			if (origin && origin !== 'null') {
				return new Set([origin]);
			}
			if (root?.location?.protocol === 'file:') {
				return new Set(['file://']);
			}
			return null;
		}
		if (value === '*') {
			return null;
		}
		const items = Array.isArray(value) ? value : [value];
		const origins = [];
		for (const item of items) {
			const origin = capString(item, MAX_ORIGIN_CHARS).trim();
			if (origin && !origins.includes(origin)) {
				origins.push(origin);
			}
			if (origins.length >= MAX_ALLOWED_ORIGINS) {
				break;
			}
		}
		return origins.length > 0 ? new Set(origins) : null;
	}

	function originAllowed(allowedOrigins, origin) {
		const normalized = String(origin || '');
		return !allowedOrigins || allowedOrigins.has(normalized) || (normalized === 'null' && allowedOrigins.has('file://'));
	}

	function pushMessageRecord(messages, record) {
		if (!Array.isArray(messages)) {
			return;
		}
		if (messages.length >= MAX_MESSAGE_RECORDS) {
			messages.splice(0, messages.length - MAX_MESSAGE_RECORDS + 1);
		}
		messages.push(record);
	}

	function sanitizeHostState(state) {
		if (!state || typeof state !== 'object') {
			return {};
		}
		const next = {};
		if (state.open !== undefined) {
			next.open = state.open !== false;
		}
		if (Number.isFinite(Number(state.width))) {
			next.width = clampWidth(state.width);
		}
		return next;
	}

	function resolveElement(documentRef, value, fallbackId) {
		if (value && typeof value === 'string') {
			return documentRef.querySelector(value);
		}
		if (value && value.nodeType === 1) {
			return value;
		}
		return fallbackId ? documentRef.getElementById(fallbackId) : null;
	}

	function createFrame(documentRef, options = {}) {
		const frame = documentRef.createElement('iframe');
		frame.id = options.frameId || DEFAULT_FRAME_ID;
		frame.title = options.title || 'AI Sidebar';
		frame.setAttribute('allow', options.allow || 'clipboard-read; clipboard-write');
		frame.style.width = '100%';
		frame.style.height = '100%';
		frame.style.border = '0';
		frame.style.display = 'block';
		return frame;
	}

	function create(options = {}) {
		const rootRef = options.window || root;
		const documentRef = options.document || root?.document;
		if (!documentRef) {
			throw new Error('AI sidebar embed requires a document');
		}
		const container = resolveElement(documentRef, options.container, '')
			|| documentRef.body;
		if (!container) {
			throw new Error('AI sidebar embed requires a container');
		}
		let ownsFrame = false;
		const frame = resolveElement(documentRef, options.frame, options.frameId || DEFAULT_FRAME_ID)
			|| createFrame(documentRef, options);
		if (!frame.parentNode) {
			container.appendChild(frame);
			ownsFrame = true;
		}
		const messages = Array.isArray(options.messages) ? options.messages : [];
		const allowedOrigins = normalizeAllowedOrigins(options.allowedOrigins);
		const hostBridge = options.hostBridge || rootRef?.claudianSidebarHostBridge || null;
		const bridge = options.attachBridge === false || !hostBridge || typeof hostBridge.attach !== 'function'
			? null
			: hostBridge.attach({ allowedOrigins: options.allowedOrigins });
		let disposed = false;
		const state = {
			url: buildUrl(options),
		};
		const handleMessage = (event) => {
			if (disposed || !originAllowed(allowedOrigins, event.origin)) {
				return;
			}
			const data = event.data || {};
			if (!data || typeof data.type !== 'string' || !data.type.startsWith('claudian-sidebar:')) {
				return;
			}
			const record = {
				type: capString(data.type, MAX_MESSAGE_TYPE_CHARS),
				method: data.payload && data.payload.method ? capString(data.payload.method, MAX_MESSAGE_METHOD_CHARS) : '',
				id: data.payload && data.payload.id ? capString(data.payload.id, MAX_MESSAGE_ID_CHARS) : '',
				origin: capString(event.origin || '', MAX_ORIGIN_CHARS),
			};
			pushMessageRecord(messages, record);
			if (typeof options.onMessage === 'function') {
				options.onMessage(record, event);
			}
		};
		const handleLoad = (event) => {
			if (typeof options.onLoad === 'function') {
				options.onLoad(event, frame);
			}
		};
		rootRef?.addEventListener?.('message', handleMessage);
		frame.addEventListener('load', handleLoad);
		frame.src = state.url;

		return {
			frame,
			messages,
			bridge,
			bridgeAttached: !!bridge,
			get url() {
				return state.url;
			},
			reload(nextOptions = {}) {
				state.url = buildUrl({ ...options, ...nextOptions });
				frame.src = state.url;
				return state.url;
			},
			dispose() {
				if (disposed) {
					return;
				}
				disposed = true;
				rootRef?.removeEventListener?.('message', handleMessage);
				frame.removeEventListener('load', handleLoad);
				bridge?.dispose?.();
				if (ownsFrame && options.removeFrameOnDispose !== false && frame.parentNode) {
					frame.parentNode.removeChild(frame);
				}
			},
		};
	}

	function readHostState(options = {}) {
		const storage = options.storage || getDefaultStorage();
		const key = options.stateKey || DEFAULT_HOST_STATE_KEY;
		if (!storage || !key) {
			return {};
		}
		try {
			const raw = storage.getItem(key) || '{}';
			if (raw.length > MAX_HOST_STATE_RAW_CHARS) {
				storage.removeItem?.(key);
				return {};
			}
			return sanitizeHostState(JSON.parse(raw));
		}
		catch {
			return {};
		}
	}

	function writeHostState(state, options = {}) {
		const storage = options.storage || getDefaultStorage();
		const key = options.stateKey || DEFAULT_HOST_STATE_KEY;
		if (!storage || !key) {
			return;
		}
		try {
			const serialized = JSON.stringify(sanitizeHostState(state));
			if (serialized.length <= MAX_HOST_STATE_RAW_CHARS) {
				storage.setItem(key, serialized);
			}
		}
		catch {
			// Host storage can be disabled in restricted browser contexts.
		}
	}

	function clampWidth(width, options = {}) {
		const min = Number.isFinite(Number(options.minWidth)) ? Number(options.minWidth) : MIN_HOST_WIDTH;
		const max = Number.isFinite(Number(options.maxWidth)) ? Number(options.maxWidth) : MAX_HOST_WIDTH;
		const value = Number.isFinite(Number(width)) ? Number(width) : DEFAULT_HOST_WIDTH;
		return Math.max(min, Math.min(max, Math.round(value)));
	}

	function setClassFlag(element, className, enabled) {
		if (!element?.classList || !className) {
			return;
		}
		if (enabled) {
			element.classList.add(className);
		}
		else {
			element.classList.remove(className);
		}
	}

	function applyHostState(container, state, options = {}) {
		if (!container) {
			return;
		}
		const open = state.open !== false;
		const width = clampWidth(state.width, options);
		container.dataset = container.dataset || {};
		container.dataset.claudianSidebarOpen = open ? 'true' : 'false';
		container.dataset.claudianSidebarWidth = String(width);
		setClassFlag(container, options.hostClassName || 'claudian-sidebar-embed-container', true);
		setClassFlag(container, 'is-open', open);
		setClassFlag(container, 'is-closed', !open);
		if (options.manageLayout === false || !container.style) {
			return;
		}
		if (typeof container.style.setProperty === 'function') {
			container.style.setProperty('--claudian-sidebar-width', `${width}px`);
		}
		container.style.width = open ? `${width}px` : '0px';
		container.style.minWidth = open ? `${width}px` : '0px';
		container.style.maxWidth = open ? `${width}px` : '0px';
		container.style.overflow = 'hidden';
	}

	function createHostController(options = {}) {
		const documentRef = options.document || root?.document;
		if (!documentRef) {
			throw new Error('AI sidebar host requires a document');
		}
		const container = resolveElement(documentRef, options.container, '') || documentRef.body;
		if (!container) {
			throw new Error('AI sidebar host requires a container');
		}
		const stored = readHostState(options);
		let hostOptions = { ...options, container };
		const state = {
			open: options.open !== undefined ? options.open !== false : stored.open !== false,
			width: clampWidth(options.width !== undefined ? options.width : stored.width, options),
		};
		const persist = () => writeHostState({ open: state.open, width: state.width }, hostOptions);
		const notify = () => {
			if (typeof hostOptions.onStateChange === 'function') {
				hostOptions.onStateChange({ ...state });
			}
		};
		const apply = () => {
			applyHostState(container, state, hostOptions);
			persist();
			notify();
		};
		applyHostState(container, state, hostOptions);
		const embed = create(hostOptions);
		apply();
		return {
			container,
			embed,
			frame: embed.frame,
			messages: embed.messages,
			getState() {
				return { ...state };
			},
			open() {
				state.open = true;
				apply();
				return this.getState();
			},
			close() {
				state.open = false;
				apply();
				return this.getState();
			},
			toggle(force) {
				state.open = force === undefined ? !state.open : force !== false;
				apply();
				return this.getState();
			},
			setWidth(width) {
				state.width = clampWidth(width, hostOptions);
				apply();
				return this.getState();
			},
			reload(nextOptions = {}) {
				hostOptions = { ...hostOptions, ...nextOptions, container };
				if (nextOptions.open !== undefined) {
					state.open = nextOptions.open !== false;
				}
				if (nextOptions.width !== undefined) {
					state.width = clampWidth(nextOptions.width, hostOptions);
				}
				apply();
				return embed.reload(hostOptions);
			},
			update(nextOptions = {}) {
				return this.reload(nextOptions);
			},
			dispose() {
				embed.dispose();
				if (hostOptions.cleanupLayout === false || !container.style) {
					return;
				}
				container.style.width = '';
				container.style.minWidth = '';
				container.style.maxWidth = '';
				container.style.overflow = '';
			},
		};
	}

	function createReactBindings(React, defaults = {}) {
		if (!React || typeof React.createElement !== 'function') {
			throw new Error('React bindings require a React instance');
		}
		function useClaudianSidebarHost(options = {}) {
			const containerRef = React.useRef(null);
			const controllerRef = React.useRef(null);
			const [state, setState] = React.useState(() => {
				const stored = readHostState({ ...defaults, ...options });
				return {
					open: options.open !== undefined ? options.open !== false : stored.open !== false,
					width: clampWidth(options.width !== undefined ? options.width : stored.width, { ...defaults, ...options }),
				};
			});
			React.useEffect(() => {
				if (!containerRef.current) {
					return undefined;
				}
				const controller = createHostController({
					...defaults,
					...options,
					container: containerRef.current,
					onStateChange(nextState) {
						setState(nextState);
						options.onStateChange?.(nextState);
					},
				});
				controllerRef.current = controller;
				setState(controller.getState());
				return () => {
					controller.dispose();
					controllerRef.current = null;
				};
			}, []);
			React.useEffect(() => {
				if (controllerRef.current) {
					controllerRef.current.update({ ...defaults, ...options });
				}
			}, [
				options.runtimeMode,
				options.provider,
				options.model,
				options.workspace,
				options.resetState,
				options.contextPercent,
				options.contextWindow,
			]);
			return {
				containerRef,
				controllerRef,
				state,
				open: () => controllerRef.current?.open(),
				close: () => controllerRef.current?.close(),
				toggle: (force) => controllerRef.current?.toggle(force),
				setWidth: (width) => controllerRef.current?.setWidth(width),
				reload: (nextOptions) => controllerRef.current?.reload(nextOptions),
			};
		}
		function ClaudianSidebarHost(props = {}) {
			const { className = '', children = null, ...options } = props;
			const host = useClaudianSidebarHost(options);
			const mergedClassName = ['claudian-sidebar-react-host', className].filter(Boolean).join(' ');
			return React.createElement('div', {
				ref: host.containerRef,
				className: mergedClassName,
				'data-claudian-sidebar-host': 'true',
			}, children);
		}
		return {
			useClaudianSidebarHost,
			ClaudianSidebarHost,
		};
	}

	return {
		DEFAULT_FRAME_ID,
		DEFAULT_CHILD_PATH,
		DEFAULT_HOST_STATE_KEY,
		DEFAULT_PASSTHROUGH_PARAMS,
		buildUrl,
		create,
		createHostController,
		createReactBindings,
		readHostState,
	};
});
