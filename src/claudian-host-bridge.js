const DEFAULT_MAX_CHILDREN = 16;
const MAX_REQUEST_ID_LENGTH = 120;
const MAX_METHOD_LENGTH = 80;
const MAX_ARG_STRING_LENGTH = 64000;
const MAX_ARG_ARRAY_ITEMS = 80;
const MAX_ARG_OBJECT_KEYS = 80;
const MAX_ARG_DEPTH = 6;

function getDefaultAllowedOrigins(hostWindow) {
	const origins = new Set();
	const location = hostWindow?.location || globalThis.window?.location || null;
	const origin = String(location?.origin || '').trim();
	if (origin && origin !== 'null') {
		origins.add(origin);
	}
	if (location?.protocol === 'file:') {
		origins.add('file://');
	}
	return origins.size > 0 ? origins : null;
}

function normalizeAllowedOrigins(value, hostWindow) {
	if (value === undefined || value === null || value === '') {
		return getDefaultAllowedOrigins(hostWindow);
	}
	if (value === '*') {
		return null;
	}
	const items = Array.isArray(value) ? value : [value];
	const origins = items.map((item) => String(item || '').trim()).filter(Boolean);
	return origins.length > 0 ? new Set(origins) : null;
}

function originAllowed(allowedOrigins, origin) {
	const normalized = String(origin || '');
	return !allowedOrigins || allowedOrigins.has(normalized) || (normalized === 'null' && allowedOrigins.has('file://'));
}

function clampText(value, maxLength) {
	const text = String(value || '');
	return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function sanitizeArgs(value, depth = 0) {
	if (value === null || value === undefined) return value;
	if (typeof value === 'string') return clampText(value, MAX_ARG_STRING_LENGTH);
	if (typeof value === 'number' || typeof value === 'boolean') return value;
	if (Array.isArray(value)) {
		if (depth >= MAX_ARG_DEPTH) return value.length ? ['...[truncated]...'] : [];
		const items = value
			.slice(0, MAX_ARG_ARRAY_ITEMS)
			.map((item) => sanitizeArgs(item, depth + 1));
		if (value.length > MAX_ARG_ARRAY_ITEMS) {
			items.push(`... ${value.length - MAX_ARG_ARRAY_ITEMS} item(s) omitted ...`);
		}
		return items;
	}
	if (typeof value === 'object') {
		if (depth >= MAX_ARG_DEPTH) return { truncated: true };
		const entries = Object.entries(value).slice(0, MAX_ARG_OBJECT_KEYS);
		const output = {};
		for (const [key, item] of entries) {
			output[clampText(key, MAX_METHOD_LENGTH)] = sanitizeArgs(item, depth + 1);
		}
		const omitted = Object.keys(value).length - entries.length;
		if (omitted > 0) output.__truncatedKeys = omitted;
		return output;
	}
	return String(value);
}

function createHostBridge(options = {}) {
	const {
		api,
		hostWindow = globalThis.window,
		allowedOrigins: rawAllowedOrigins,
		maxChildren = DEFAULT_MAX_CHILDREN,
		sourceSelector = '',
	} = options;
	if (!api || typeof api !== 'object') {
		throw new Error('AI sidebar host bridge requires an API object');
	}
	if (!hostWindow || typeof hostWindow.addEventListener !== 'function') {
		throw new Error('AI sidebar host bridge requires a browser window');
	}
	const allowedOrigins = normalizeAllowedOrigins(rawAllowedOrigins, hostWindow);
	const children = new Map();
	let disposed = false;
	let childSequence = 0;

	const isOriginAllowed = (origin) => originAllowed(allowedOrigins, origin);
	const rememberChild = (source, origin) => {
		if (!source || !isOriginAllowed(origin)) {
			return null;
		}
		for (const [key, child] of children.entries()) {
			if (child.source === source) {
				child.origin = origin || '*';
				return key;
			}
		}
		const key = `${origin || '*'}::${childSequence++}:${source ? 'source' : 'unknown'}`;
		if (children.size >= maxChildren) {
			const oldestKey = children.keys().next().value;
			if (oldestKey) children.delete(oldestKey);
		}
		children.set(key, { source, origin: origin || '*' });
		return key;
	};
	const postToChild = (child, message) => {
		try {
			child.source.postMessage(message, child.origin === 'null' ? '*' : (child.origin || '*'));
			return true;
		}
		catch {
			return false;
		}
	};
	const respond = (source, origin, id, payload) => {
		if (!source || !id) {
			return;
		}
		postToChild({ source, origin: origin || '*' }, {
			type: 'claudian-sidebar:response',
			payload: { id, ...payload },
		});
	};
	const handleMessage = (event) => {
		if (disposed || !isOriginAllowed(event.origin)) {
			return;
		}
		if (sourceSelector && hostWindow.document?.querySelector(sourceSelector)?.contentWindow !== event.source) return;
		const data = event.data || {};
		if (!data || typeof data.type !== 'string') {
			return;
		}
		if (data.type === 'claudian-sidebar:ready') {
			rememberChild(event.source, event.origin);
			return;
		}
		if (data.type !== 'claudian-sidebar:request') {
			return;
		}
		const payload = data.payload || {};
		const id = clampText(payload.id || '', MAX_REQUEST_ID_LENGTH);
		const method = clampText(payload.method || '', MAX_METHOD_LENGTH);
		const handler = api[method];
		rememberChild(event.source, event.origin);
		if (!id) {
			return;
		}
		if (method === 'onEvent' || typeof handler !== 'function') {
			respond(event.source, event.origin, id, { error: `Unsupported AI sidebar bridge method: ${method || 'unknown'}` });
			return;
		}
		Promise.resolve()
			.then(() => handler(sanitizeArgs(payload.args || {})))
			.then((result) => respond(event.source, event.origin, id, { result }))
			.catch((error) => respond(event.source, event.origin, id, {
				error: error instanceof Error ? error.message : String(error),
			}));
	};
	const removeRuntimeEvent = typeof api.onEvent === 'function'
		? api.onEvent((envelope) => {
			if (disposed) {
				return;
			}
			for (const [key, child] of children.entries()) {
				if (!postToChild(child, { type: 'claudian-sidebar:event', payload: envelope || {} })) {
					children.delete(key);
				}
			}
		})
		: () => {};
	hostWindow.addEventListener('message', handleMessage);
	return {
		dispose() {
			if (disposed) {
				return;
			}
			disposed = true;
			hostWindow.removeEventListener('message', handleMessage);
			removeRuntimeEvent();
			children.clear();
		},
	};
}

module.exports = {
	createHostBridge,
	normalizeAllowedOrigins,
	originAllowed,
	sanitizeArgs,
};
