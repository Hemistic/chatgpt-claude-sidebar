(function () {
	const MAX_RELAY_STRING_CHARS = 12 * 1024 * 1024;
	const MAX_RELAY_ARRAY_ITEMS = 80;
	const MAX_RELAY_OBJECT_KEYS = 80;
	const MAX_RELAY_DEPTH = 6;
	const MAX_RESPONSE_RELAY_ARRAY_ITEMS = 20000;
	const MAX_RESPONSE_RELAY_OBJECT_KEYS = 200;
	const MAX_RESPONSE_RELAY_DEPTH = 64;
	const MAX_RELAY_TYPE_CHARS = 120;
	const MAX_ALLOWED_ORIGINS = 16;
	const MAX_ORIGIN_CHARS = 512;
	const MAX_SHELL_TITLE_CHARS = 512;
	const MAX_SHELL_PATH_CHARS = 4096;
	const MAX_SHELL_SELECTED_TEXT_CHARS = 20000;
	const MAX_SHELL_LINE_COUNT = 10000;
	const MAX_SHELL_LABEL_CHARS = 512;
	const MAX_SHELL_KIND_CHARS = 120;
	const MAX_SHELL_ATTACHMENTS = 8;
	const MAX_SHELL_ATTACHMENT_DATA_URL_CHARS = 10 * 1024 * 1024;
	const MAX_SHELL_ATTACHMENT_TEXT_CHARS = 20000;
	const MAX_SHELL_CITATIONS = 48;

	const capString = (value, maxLength) => {
		const text = String(value ?? '');
		return text.length > maxLength ? text.slice(0, maxLength) : text;
	};
	const normalizeAllowedOrigins = (value) => {
		const raw = String(value || '').trim();
		if (!raw) {
			const origin = String(window.location.origin || '').trim();
			if (origin && origin !== 'null') {
				return new Set([origin]);
			}
			if (window.location.protocol === 'file:') {
				return new Set(['file://']);
			}
			return null;
		}
		if (raw === '*') {
			return null;
		}
		const origins = [];
		for (const item of raw.split(',')) {
			const origin = capString(item, MAX_ORIGIN_CHARS).trim();
			if (origin && !origins.includes(origin)) {
				origins.push(origin);
			}
			if (origins.length >= MAX_ALLOWED_ORIGINS) {
				break;
			}
		}
		return origins.length > 0 ? new Set(origins) : null;
	};
	const originAllowed = (allowedOrigins, origin) => {
		const normalized = String(origin || '');
		return !allowedOrigins || allowedOrigins.has(normalized) || (normalized === 'null' && allowedOrigins.has('file://'));
	};
	const sanitizeRelayValue = (value, depth = 0, options = {}) => {
		const maxDepth = Number.isFinite(options.maxDepth) ? options.maxDepth : MAX_RELAY_DEPTH;
		const maxArrayItems = Number.isFinite(options.maxArrayItems) ? options.maxArrayItems : MAX_RELAY_ARRAY_ITEMS;
		const maxObjectKeys = Number.isFinite(options.maxObjectKeys) ? options.maxObjectKeys : MAX_RELAY_OBJECT_KEYS;
		if (typeof value === 'string') {
			return capString(value, MAX_RELAY_STRING_CHARS);
		}
		if (typeof value !== 'object' || value === null) {
			return value;
		}
		if (depth >= maxDepth) {
			return '[Truncated]';
		}
		if (Array.isArray(value)) {
			return value.slice(0, maxArrayItems).map((item) => sanitizeRelayValue(item, depth + 1, options));
		}
		const next = {};
		let count = 0;
		for (const key of Object.keys(value)) {
			if (count >= maxObjectKeys) {
				break;
			}
			const normalizedKey = capString(key, MAX_RELAY_TYPE_CHARS).trim();
			if (!normalizedKey) {
				continue;
			}
			next[normalizedKey] = sanitizeRelayValue(value[key], depth + 1, options);
			count += 1;
		}
		return next;
	};
	const sanitizeRelayMessage = (message) => {
		const type = relayType(message);
		const options = type === 'claudian-sidebar:response'
			? {
				maxDepth: MAX_RESPONSE_RELAY_DEPTH,
				maxArrayItems: MAX_RESPONSE_RELAY_ARRAY_ITEMS,
				maxObjectKeys: MAX_RESPONSE_RELAY_OBJECT_KEYS,
			}
			: {};
		const sanitized = sanitizeRelayValue(message, 0, options);
		if (!sanitized || typeof sanitized.type !== 'string') {
			return null;
		}
		sanitized.type = capString(sanitized.type, MAX_RELAY_TYPE_CHARS);
		return sanitized;
	};
	const relayType = (message) => typeof message?.type === 'string'
		? capString(message.type, MAX_RELAY_TYPE_CHARS)
		: '';
	const isParentRelayType = (type) => (
		type === 'claudian-sidebar:response'
		|| type === 'claudian-sidebar:event'
		|| type.startsWith('pdf-ai-notes:')
		|| type.startsWith('pdf-ai-shell-')
		|| type.startsWith('pdf-ai-claude-header-')
	);
	const getSafeFrameTargetOrigin = () => {
		try {
			const url = new URL(window.__claudianEmbedHost?.url || frame?.src || '', window.location.href);
			if (url.protocol === 'file:' || url.origin === 'null') {
				return '*';
			}
			return url.origin;
		}
		catch {
			return '*';
		}
	};
	const params = new URLSearchParams(window.location.search || '');
	const frame = document.getElementById('claudian-sidebar-frame');
	window.__claudianEmbedHostMessages = [];
	const rawAllowedOrigins = params.has('allowedOrigins') ? params.get('allowedOrigins') : '';
	const allowedOrigins = normalizeAllowedOrigins(rawAllowedOrigins);
	let attachChildChannel = null;
	let lastParentOrigin = '';
	const getSafeParentTargetOrigin = () => {
		if (lastParentOrigin && lastParentOrigin !== 'null') {
			return lastParentOrigin;
		}
		if (allowedOrigins && allowedOrigins.size === 1) {
			const [origin] = Array.from(allowedOrigins);
			if (origin && origin !== 'file://') {
				return origin;
			}
		}
		return '*';
	};
	window.__claudianEmbedHost = window.ClaudianSidebarEmbed.create({
		frame,
		attachBridge: false,
		allowedOrigins: rawAllowedOrigins,
		messages: window.__claudianEmbedHostMessages,
		sourceParams: params,
		onLoad: () => {
			document.body.dataset.sidebarLoaded = '1';
			attachChildChannel?.();
		},
	});
	window.__claudianEmbedHostBridge = window.__claudianEmbedHost.bridge;
	window.__claudianEmbedHostBridgeAttached = window.__claudianEmbedHost.bridgeAttached;
	const outerParent = window.parent === window ? null : window.parent;
	const relayToChild = (message) => {
		if (!frame || !frame.contentWindow || !message) {
			return;
		}
		const sanitized = sanitizeRelayMessage(message);
		if (sanitized) {
			frame.contentWindow.postMessage(sanitized, getSafeFrameTargetOrigin());
		}
	};
	const relayToParent = (message) => {
		if (!outerParent || !message) {
			return;
		}
		const sanitized = sanitizeRelayMessage(message);
		if (sanitized) {
			outerParent.postMessage(sanitized, getSafeParentTargetOrigin());
		}
	};
	let childPort = null;
	const relayChildMessage = (data) => {
		const type = relayType(data);
		if (type === 'claudian-sidebar:ready'
			|| (type === 'claudian-sidebar:request' && !window.__claudianEmbedHostBridgeAttached)
			|| type === 'pdf-ai-sidebar-mode-request'
			|| type === 'pdf-ai-feature-guide:open'
			|| type === 'pdf-ai-feature-guide:activate'
			|| type === 'pdf-ai-sidebar-theme-change'
			|| type === 'pdf-ai-notes:append'
			|| type === 'pdf-ai-notes:close-document'
			|| type === 'pdf-ai-claude-header-button-rects'
			|| type === 'pdf-ai-shell-task-status') {
			relayToParent(data);
		}
	};
	attachChildChannel = () => {
		childPort?.close();
		childPort = null;
		if (!frame?.contentWindow || typeof MessageChannel !== 'function') {
			return;
		}
		const channel = new MessageChannel();
		channel.port1.onmessage = (event) => relayChildMessage(event.data);
		try {
			frame.contentWindow.postMessage(
				{ type: 'claudian-sidebar:channel' },
				getSafeFrameTargetOrigin(),
				[channel.port2],
			);
			childPort = channel.port1;
		}
		catch {
			channel.port1.close();
			channel.port2.close();
		}
	};
	// The adapter can call onLoad synchronously in its embedders.
	if (document.body.dataset.sidebarLoaded === '1') {
		attachChildChannel();
	}
	const normalizeBoundedInteger = (value, min, max) => {
		const number = Number(value);
		if (!Number.isInteger(number)) {
			return undefined;
		}
		return Math.max(min, Math.min(max, number));
	};
	const normalizeStringArray = (value, limit, maxChars) => (
		Array.isArray(value)
			? value.slice(0, limit).map((item) => capString(item, maxChars).trim()).filter(Boolean)
			: []
	);
	const sanitizeImageDataUrl = (value) => {
		if (typeof value !== 'string' || value.length > MAX_SHELL_ATTACHMENT_DATA_URL_CHARS) {
			return '';
		}
		const text = value.trim();
		if (!/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/u.test(text)) {
			return '';
		}
		return text.replace(/[\r\n]/gu, '');
	};
	const normalizeShellAttachment = (attachment) => {
		if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) {
			return null;
		}
		const dataUrl = sanitizeImageDataUrl(attachment.dataUrl || attachment.dataURL);
		const mediaType = capString(
			attachment.mediaType
			|| attachment.mimeType
			|| (dataUrl.match(/^data:([^;]+)/u)?.[1] || ''),
			MAX_SHELL_KIND_CHARS,
		).trim();
		const nextAttachment = {};
		for (const [key, maxChars] of [
			['id', MAX_SHELL_LABEL_CHARS],
			['name', MAX_SHELL_LABEL_CHARS],
			['label', MAX_SHELL_LABEL_CHARS],
			['title', MAX_SHELL_LABEL_CHARS],
			['path', MAX_SHELL_PATH_CHARS],
			['type', MAX_SHELL_KIND_CHARS],
			['annotationId', MAX_SHELL_LABEL_CHARS],
			['annotationID', MAX_SHELL_LABEL_CHARS],
		]) {
			if (attachment[key] !== undefined && attachment[key] !== null) {
				const text = capString(attachment[key], maxChars).trim();
				if (text) {
					nextAttachment[key] = text;
				}
			}
		}
		const text = capString(attachment.text || '', MAX_SHELL_ATTACHMENT_TEXT_CHARS);
		if (text) {
			nextAttachment.text = text;
		}
		if (dataUrl) {
			nextAttachment.dataUrl = dataUrl;
		}
		if (mediaType) {
			nextAttachment.mediaType = mediaType;
			nextAttachment.mimeType = mediaType;
		}
		for (const key of ['size', 'originalSize']) {
			const number = Number(attachment[key]);
			if (Number.isFinite(number) && number > 0) {
				nextAttachment[key] = Math.floor(number);
			}
		}
		return Object.keys(nextAttachment).length ? nextAttachment : null;
	};
	const normalizeShellContext = (message) => {
		const payload = message?.payload && typeof message.payload === 'object' ? message.payload : {};
		const documentPayload = payload.document && typeof payload.document === 'object' ? payload.document : {};
		const selectionPayload = payload.selection && typeof payload.selection === 'object' ? payload.selection : {};
		const nextPayload = {};
		for (const [key, maxChars] of [
			['source', MAX_SHELL_KIND_CHARS],
			['activeTabId', MAX_SHELL_LABEL_CHARS],
			['contextTabId', MAX_SHELL_LABEL_CHARS],
			['workspaceId', MAX_SHELL_LABEL_CHARS],
			['workspaceName', MAX_SHELL_LABEL_CHARS],
			['workspaceRootDir', MAX_SHELL_PATH_CHARS],
			['timestamp', MAX_SHELL_LABEL_CHARS],
		]) {
			if (payload[key] !== undefined && payload[key] !== null) {
				const text = capString(payload[key], maxChars).trim();
				if (text) {
					nextPayload[key] = text;
				}
			}
		}
		const title = capString(documentPayload.title || '', MAX_SHELL_TITLE_CHARS).trim();
		const filePath = capString(documentPayload.filePath || '', MAX_SHELL_PATH_CHARS).trim();
		const documentId = capString(documentPayload.id || '', MAX_SHELL_LABEL_CHARS).trim();
		const documentProjectID = capString(documentPayload.projectID || '', MAX_SHELL_LABEL_CHARS).trim();
		const documentType = capString(documentPayload.type || '', MAX_SHELL_KIND_CHARS).trim();
		const documentPageIndex = normalizeBoundedInteger(documentPayload.pageIndex, 0, MAX_SHELL_LINE_COUNT);
		if (title || filePath || documentId || documentProjectID || documentType || documentPageIndex !== undefined) {
			nextPayload.document = {};
			if (documentId) {
				nextPayload.document.id = documentId;
			}
			if (documentProjectID) {
				nextPayload.document.projectID = documentProjectID;
			}
			if (title) {
				nextPayload.document.title = title;
			}
			if (documentType) {
				nextPayload.document.type = documentType;
			}
			if (filePath) {
				nextPayload.document.filePath = filePath;
			}
			if (documentPageIndex !== undefined) {
				nextPayload.document.pageIndex = documentPageIndex;
			}
		}
		const selectedText = capString(selectionPayload.selectedText || selectionPayload.text || '', MAX_SHELL_SELECTED_TEXT_CHARS);
		const originalSelectedText = capString(selectionPayload.originalSelectedText || '', MAX_SHELL_SELECTED_TEXT_CHARS);
		const startLine = normalizeBoundedInteger(selectionPayload.startLine, 0, MAX_SHELL_LINE_COUNT);
		const endLine = normalizeBoundedInteger(selectionPayload.endLine, 0, MAX_SHELL_LINE_COUNT);
		const startColumn = normalizeBoundedInteger(selectionPayload.startColumn, 0, MAX_SHELL_SELECTED_TEXT_CHARS);
		const endColumn = normalizeBoundedInteger(selectionPayload.endColumn, 0, MAX_SHELL_SELECTED_TEXT_CHARS);
		const lineCount = normalizeBoundedInteger(selectionPayload.lineCount, 0, MAX_SHELL_LINE_COUNT);
		const pageIndex = normalizeBoundedInteger(selectionPayload.pageIndex, 0, MAX_SHELL_LINE_COUNT);
		const attachments = Array.isArray(selectionPayload.attachments)
			? selectionPayload.attachments.slice(0, MAX_SHELL_ATTACHMENTS).map((attachment) => normalizeShellAttachment(attachment)).filter(Boolean)
			: [];
		const citationTexts = normalizeStringArray(selectionPayload.citationTexts, MAX_SHELL_CITATIONS, MAX_SHELL_SELECTED_TEXT_CHARS);
		const citationNumbers = normalizeStringArray(selectionPayload.citationNumbers, MAX_SHELL_CITATIONS, MAX_SHELL_KIND_CHARS);
		const missingCitationNumbers = normalizeStringArray(selectionPayload.missingCitationNumbers, MAX_SHELL_CITATIONS, MAX_SHELL_KIND_CHARS);
		const selectedAnnotationIDs = normalizeStringArray(selectionPayload.selectedAnnotationIDs, MAX_SHELL_ATTACHMENTS, MAX_SHELL_LABEL_CHARS);
		if (
			selectedText
			|| originalSelectedText
			|| startLine !== undefined
			|| endLine !== undefined
			|| startColumn !== undefined
			|| endColumn !== undefined
			|| lineCount !== undefined
			|| pageIndex !== undefined
			|| attachments.length
			|| citationTexts.length
			|| citationNumbers.length
			|| missingCitationNumbers.length
			|| selectedAnnotationIDs.length
			|| selectionPayload.displayLabel
			|| selectionPayload.kind
		) {
			nextPayload.selection = {};
			if (selectedText) {
				nextPayload.selection.selectedText = selectedText;
				nextPayload.selection.text = selectedText;
			}
			if (originalSelectedText) {
				nextPayload.selection.originalSelectedText = originalSelectedText;
			}
			if (startLine !== undefined) {
				nextPayload.selection.startLine = startLine;
			}
			if (endLine !== undefined) {
				nextPayload.selection.endLine = endLine;
			}
			if (startColumn !== undefined) {
				nextPayload.selection.startColumn = startColumn;
			}
			if (endColumn !== undefined) {
				nextPayload.selection.endColumn = endColumn;
			}
			if (lineCount !== undefined) {
				nextPayload.selection.lineCount = lineCount;
			}
			if (pageIndex !== undefined) {
				nextPayload.selection.pageIndex = pageIndex;
			}
			for (const [key, maxChars] of [
				['filePath', MAX_SHELL_PATH_CHARS],
				['label', MAX_SHELL_LABEL_CHARS],
				['displayLabel', MAX_SHELL_LABEL_CHARS],
				['displayTitle', MAX_SHELL_LABEL_CHARS],
				['kind', MAX_SHELL_KIND_CHARS],
				['pageLabel', MAX_SHELL_LABEL_CHARS],
				['annotationID', MAX_SHELL_LABEL_CHARS],
				['projectID', MAX_SHELL_LABEL_CHARS],
			]) {
				if (selectionPayload[key] !== undefined && selectionPayload[key] !== null) {
					const text = capString(selectionPayload[key], maxChars).trim();
					if (text) {
						nextPayload.selection[key] = text;
					}
				}
			}
			if (attachments.length) {
				nextPayload.selection.attachments = attachments;
			}
			if (citationTexts.length) {
				nextPayload.selection.citationTexts = citationTexts;
			}
			if (citationNumbers.length) {
				nextPayload.selection.citationNumbers = citationNumbers;
			}
			if (missingCitationNumbers.length) {
				nextPayload.selection.missingCitationNumbers = missingCitationNumbers;
			}
			if (selectedAnnotationIDs.length) {
				nextPayload.selection.selectedAnnotationIDs = selectedAnnotationIDs;
			}
		}
		if (payload.includeAttachmentContext !== undefined) {
			nextPayload.includeAttachmentContext = payload.includeAttachmentContext === true;
		}
		return { ...message, payload: nextPayload };
	};
	const normalizeParentMessageForChild = (message) => {
		if (!message || typeof message.type !== 'string') {
			return message;
		}
		if (message.type === 'pdf-ai-shell-context') {
			return normalizeShellContext(message);
		}
		return message;
	};
	window.addEventListener('message', (event) => {
		const data = event.data || {};
		if (event.isTrusted === false || !data || typeof data.type !== 'string') {
			return;
		}
		// The child uses a transferred port when Electron cannot preserve its
		// WindowProxy identity across the file:// iframe boundary. Global messages
		// are accepted only from the exact child frame.
		if (event.source === frame?.contentWindow) {
			if (!originAllowed(allowedOrigins, event.origin)) {
				return;
			}
			relayChildMessage(data);
			return;
		}
		if (outerParent && event.source === outerParent) {
			if (!originAllowed(allowedOrigins, event.origin)) {
				return;
			}
			lastParentOrigin = String(event.origin || '');
			if (isParentRelayType(relayType(data))) {
				relayToChild(normalizeParentMessageForChild(data));
			}
		}
	});
})();
