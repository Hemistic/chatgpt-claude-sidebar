/*
 * Pure Claudian logic adapted from the original Obsidian plugin source.
 *
 * Sources: claudian-main provider/model, prompt, tool, and Codex
 * normalization helpers.
 *
 * Keep this file dependency-free so the Electron sidebar can reuse provider
 * behavior without carrying the Obsidian runtime.
 */

const TOOL_NAME_MAP = {
	command_execution: 'Bash',
	shell_command: 'Bash',
	shell: 'Bash',
	exec_command: 'Bash',
	update_plan: 'TodoWrite',
	request_user_input: 'AskUserQuestion',
	view_image: 'Read',
	web_search: 'WebSearch',
	web_search_call: 'WebSearch',
	file_change: 'apply_patch',
};

const NATIVE_TOOLS = new Set([
	'apply_patch',
	'write_stdin',
	'spawn_agent',
	'send_input',
	'wait',
	'wait_agent',
	'resume_agent',
	'close_agent',
]);

const AGENT_LIFECYCLE_TOOLS = [
	'spawn_agent',
	'send_input',
	'wait',
	'wait_agent',
	'resume_agent',
	'close_agent',
];

const SUBAGENT_HIDDEN_TOOLS = [
	'wait',
	'wait_agent',
	'close_agent',
];

const TOOLS_SKIP_BLOCKED_DETECTION = [
	'EnterPlanMode',
	'ExitPlanMode',
	'AskUserQuestion',
];

const EDIT_TOOLS = ['Write', 'Edit', 'NotebookEdit'];
const WRITE_EDIT_TOOLS = ['Write', 'Edit'];
const BASH_TOOLS = ['Bash', 'BashOutput', 'KillShell'];
const FILE_TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'LS', 'NotebookEdit', 'Bash'];
const MCP_TOOLS = ['ListMcpResources', 'ReadMcpResource', 'Mcp'];
const READ_ONLY_TOOLS = ['Read', 'Grep', 'Glob', 'LS', 'WebSearch', 'WebFetch'];

const TERMINAL_RESULT_TOOLS = new Set([
	'Bash',
	'write_stdin',
]);

const MCP_ICON_MARKER = '__mcp_icon__';
const MAX_CODEX_STRING_CHARS = 20000;
const MAX_CODEX_TOOL_RESULT_CHARS = 200000;
const MAX_CODEX_JSON_PARSE_CHARS = 400000;
const MAX_CODEX_ARRAY_ITEMS = 80;
const MAX_CODEX_OBJECT_KEYS = 120;
const MAX_CODEX_PLAN_ITEMS = 100;
const MAX_CODEX_QUESTIONS = 10;
const MAX_CODEX_QUESTION_OPTIONS = 12;
const MAX_CODEX_WEB_QUERIES = 20;
const MAX_CODEX_VALUE_DEPTH = 5;
const MAX_PROVIDER_MODEL_ID_CHARS = 500;
const MAX_REFINE_EXISTING_INSTRUCTIONS_CHARS = 64000;
const MAX_REFINE_RESPONSE_CHARS = 200000;

const PROVIDER_MODEL_SELECTION_PREFIXES = {
	claude: 'claude-code/',
	codex: 'openai-codex/',
	opencode: 'opencode/',
	pi: 'pi/',
};

const TOOL_ICONS = {
	Read: 'file-text',
	Write: 'file-plus',
	Edit: 'file-pen',
	MultiEdit: 'file-pen',
	NotebookEdit: 'file-pen',
	Bash: 'terminal',
	BashOutput: 'terminal',
	KillShell: 'terminal',
	Glob: 'folder-search',
	Grep: 'search',
	LS: 'list',
	TodoWrite: 'list-checks',
	Task: 'bot',
	Agent: 'bot',
	TaskOutput: 'bot',
	ListMcpResources: 'list',
	ReadMcpResource: 'file-text',
	Mcp: 'wrench',
	WebSearch: 'globe',
	WebFetch: 'download',
	AskUserQuestion: 'help-circle',
	Skill: 'zap',
	ToolSearch: 'search-check',
	EnterPlanMode: 'map',
	ExitPlanMode: 'check-circle',
	apply_patch: 'file-pen',
	write_stdin: 'terminal',
	spawn_agent: 'bot',
	send_input: 'bot',
	wait: 'clock',
	wait_agent: 'clock',
	resume_agent: 'bot',
	close_agent: 'bot',
};

function getToolIcon(toolName) {
	const name = String(toolName || '');
	if (name.startsWith('mcp__')) {
		return MCP_ICON_MARKER;
	}
	return TOOL_ICONS[name] || 'wrench';
}

function getProviderModelSelectionPrefix(providerId) {
	return PROVIDER_MODEL_SELECTION_PREFIXES[String(providerId || '')] || null;
}

function encodeProviderModelSelectionId(providerId, modelId) {
	const normalized = sliceCodexString(modelId, MAX_PROVIDER_MODEL_ID_CHARS).trim();
	const prefix = getProviderModelSelectionPrefix(providerId);
	if (!prefix || !normalized || normalized.startsWith(prefix)) {
		return normalized;
	}
	return `${prefix}${normalized}`;
}

function decodeProviderModelSelectionId(value) {
	const normalized = sliceCodexString(value, MAX_PROVIDER_MODEL_ID_CHARS + 32).trim();
	if (!normalized) {
		return null;
	}
	for (const [providerId, prefix] of Object.entries(PROVIDER_MODEL_SELECTION_PREFIXES)) {
		if (!prefix || !normalized.startsWith(prefix)) {
			continue;
		}
		const modelId = normalized.slice(prefix.length).trim();
		if (!modelId) {
			return null;
		}
		return { providerId, modelId };
	}
	return null;
}

function isProviderModelSelectionId(providerId, value) {
	return decodeProviderModelSelectionId(value)?.providerId === String(providerId || '');
}

function toProviderRuntimeModelId(providerId, value) {
	const decoded = decodeProviderModelSelectionId(value);
	return decoded?.providerId === String(providerId || '')
		? decoded.modelId
		: sliceCodexString(value, MAX_PROVIDER_MODEL_ID_CHARS);
}

function isAgentLifecycleTool(name) {
	return AGENT_LIFECYCLE_TOOLS.includes(String(name || ''));
}

function isSubagentSpawnTool(name) {
	return String(name || '') === 'spawn_agent';
}

function isSubagentHiddenTool(name) {
	return SUBAGENT_HIDDEN_TOOLS.includes(String(name || ''));
}

function skipsBlockedDetection(name) {
	return TOOLS_SKIP_BLOCKED_DETECTION.includes(String(name || ''));
}

function isSubagentToolName(name) {
	const value = String(name || '');
	return value === 'Agent' || value === 'Task';
}

function isEditTool(name) {
	return EDIT_TOOLS.includes(String(name || ''));
}

function isWriteEditTool(name) {
	return WRITE_EDIT_TOOLS.includes(String(name || ''));
}

function isFileTool(name) {
	return FILE_TOOLS.includes(String(name || ''));
}

function isBashTool(name) {
	return BASH_TOOLS.includes(String(name || ''));
}

function isMcpTool(name) {
	return MCP_TOOLS.includes(String(name || ''));
}

function isReadOnlyTool(name) {
	return READ_ONLY_TOOLS.includes(String(name || ''));
}

function buildRefineSystemPrompt(existingInstructions) {
	const existing = clampCodexString(existingInstructions, MAX_REFINE_EXISTING_INSTRUCTIONS_CHARS).trim();
	const existingSection = existing
		? `\n\nEXISTING INSTRUCTIONS (already in the user's system prompt):
\`\`\`
${existing}
\`\`\`

When refining the new instruction:
- Consider how it fits with existing instructions
- Avoid duplicating existing instructions
- If the new instruction conflicts with an existing one, refine it to be complementary or note the conflict
- Match the format of existing instructions (section, heading, bullet points, style, etc.)`
		: '';

	return `You are an expert Prompt Engineer. You help users craft precise, effective system instructions for their AI assistant.

**Your Goal**: Transform vague or simple user requests into **high-quality, actionable, and non-conflicting** system prompt instructions.

**Process**:
1.  **Analyze Intent**: What behavior does the user want to enforce or change?
2.  **Check Context**: Does this conflict with existing instructions?
    - *No Conflict*: Add as new.
    - *Conflict*: Propose a **merged instruction** that resolves the contradiction (or ask if unsure).
3.  **Refine**: Draft a clear, positive instruction (e.g., "Do X" instead of "Don't do Y").
4.  **Format**: Return *only* the Markdown snippet wrapped in \`<instruction>\` tags.

**Guidelines**:
- **Clarity**: Use precise language. Avoid ambiguity.
- **Scope**: Keep it focused. Don't add unrelated rules.
- **Format**: Valid Markdown (bullets \`-\` or sections \`##\`).
- **No Header**: Do NOT include a top-level header like \`# Custom Instructions\`.
- **Conflict Handling**: If the new rule directly contradicts an existing one, rewrite the *new* one to override specific cases or ask for clarification.

**Output Format**:
- **Success**: \`<instruction>...markdown content...</instruction>\`
- **Ambiguity**: Plain text question.

${existingSection}

**Examples**:

Input: "typescript for code"
Output: <instruction>- **Code Language**: Always use TypeScript for code examples. Include proper type annotations and interfaces.</instruction>

Input: "be concise"
Output: <instruction>- **Conciseness**: Provide brief, direct responses. Omit conversational filler and unnecessary explanations.</instruction>

Input: "organize coding style rules"
Output: <instruction>## Coding Standards\n\n- **Language**: Use TypeScript.\n- **Style**: Prefer functional patterns.\n- **Review**: Keep diffs small.</instruction>

Input: "use that thing from before"
Output: I'm not sure what you're referring to. Could you please clarify?`;
}

function parseInstructionRefineResponse(responseText) {
	const text = clampCodexString(responseText, MAX_REFINE_RESPONSE_CHARS);
	const instructionMatch = text.match(/<instruction>([\s\S]*?)<\/instruction>/);
	if (instructionMatch) {
		return { success: true, refinedInstruction: instructionMatch[1].trim() };
	}

	const trimmed = text.trim();
	if (trimmed) {
		return { success: true, clarification: trimmed };
	}

	return { success: false, error: 'Empty response' };
}

function normalizeCodexToolName(rawName) {
	const name = sliceCodexString(rawName, 200).trim();
	if (!name) return 'tool';
	if (NATIVE_TOOLS.has(name)) return name;
	return TOOL_NAME_MAP[name] || name;
}

function normalizeCodexToolInput(rawName, input) {
	const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
	switch (rawName) {
		case 'command_execution':
		case 'shell_command':
		case 'shell':
		case 'exec_command':
			return { command: normalizeCommandValue(source.command ?? source.cmd ?? '') };

		case 'update_plan':
			return { todos: normalizeUpdatePlanTodos(source) };

		case 'request_user_input':
			return { questions: normalizeQuestions(source) };

		case 'view_image':
			return {
				...sanitizeCodexValueForDisplay(source),
				file_path: stringifyCodexValue(source.path ?? source.file_path),
			};

		case 'web_search':
		case 'web_search_call':
			return normalizeWebSearchInput(source);

		case 'apply_patch':
			return normalizeApplyPatchInput(source);

		default:
			return sanitizeCodexValueForDisplay(source);
	}
}

function normalizeUpdatePlanTodos(input) {
	const plan = input.plan;
	if (!Array.isArray(plan)) return [];

	return plan.slice(0, MAX_CODEX_PLAN_ITEMS).map((entry) => {
		if (!entry || typeof entry !== 'object') return { id: '', title: '', status: 'pending' };
		const text = stringifyCodexValue(entry.step ?? entry.title ?? entry.content);
		return {
			id: stringifyCodexValue(entry.id),
			content: text,
			activeForm: text,
			status: stringifyCodexValue(entry.status, 120) || 'pending',
		};
	});
}

function normalizeQuestions(input) {
	const questions = input.questions;
	if (!Array.isArray(questions)) return [];

	return questions.slice(0, MAX_CODEX_QUESTIONS).map((entry, index) => {
		if (!entry || typeof entry !== 'object') {
			return {
				question: `Question ${index + 1}`,
				header: `Q${index + 1}`,
				options: [],
				multiSelect: false,
			};
		}
		const options = Array.isArray(entry.options)
			? entry.options
				.slice(0, MAX_CODEX_QUESTION_OPTIONS)
				.map((option) => {
					if (typeof option === 'string') {
						return { label: clampCodexString(option, 2000), description: '' };
					}
					if (!option || typeof option !== 'object') {
						return null;
					}
					const label = typeof option.label === 'string' ? clampCodexString(option.label, 2000) : '';
					const description = typeof option.description === 'string'
						? clampCodexString(option.description, 4000)
						: '';
					if (!label) return null;
					return { label, description };
				})
				.filter((option) => option !== null)
			: [];

		return {
			question: stringifyCodexValue(entry.question) || `Question ${index + 1}`,
			...(entry.id ? { id: stringifyCodexValue(entry.id, 200) } : {}),
			header: typeof entry.header === 'string' && entry.header.trim()
				? clampCodexString(entry.header, 120)
				: `Q${index + 1}`,
			options,
			multiSelect: Boolean(entry.multiSelect ?? entry.multi_select),
		};
	});
}

function normalizeCommandValue(value) {
	if (typeof value === 'string') return clampCodexString(value);
	if (Array.isArray(value)) {
		return clampCodexString(value
			.slice(0, MAX_CODEX_ARRAY_ITEMS)
			.map(stringifyCodexValue)
			.filter(Boolean)
			.join(' ')
			.trim());
	}
	return stringifyCodexValue(value);
}

function stringifyCodexValue(value, maxLength = MAX_CODEX_STRING_CHARS) {
	if (typeof value === 'string') return clampCodexString(value, maxLength);
	if (typeof value === 'number' || typeof value === 'boolean') return clampCodexString(String(value), maxLength);
	if (value === null || value === undefined) return '';

	try {
		return clampCodexString(JSON.stringify(sanitizeCodexValueForDisplay(value)), maxLength);
	}
	catch {
		return '';
	}
}

function clampCodexString(value, maxLength = MAX_CODEX_STRING_CHARS) {
	const text = String(value || '');
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength)}\n[truncated ${text.length - maxLength} chars]`;
}

function sliceCodexString(value, maxLength = MAX_CODEX_STRING_CHARS) {
	const text = String(value || '');
	return text.length <= maxLength ? text : text.slice(0, maxLength);
}

function sanitizeCodexValueForDisplay(value, depth = 0) {
	if (typeof value === 'string') return clampCodexString(value);
	if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) {
		return value;
	}
	if (depth >= MAX_CODEX_VALUE_DEPTH) {
		return clampCodexString(stringifyShallowCodexValue(value), 2000);
	}
	if (Array.isArray(value)) {
		const items = value.slice(0, MAX_CODEX_ARRAY_ITEMS).map((entry) => sanitizeCodexValueForDisplay(entry, depth + 1));
		if (value.length > MAX_CODEX_ARRAY_ITEMS) {
			items.push(`[truncated ${value.length - MAX_CODEX_ARRAY_ITEMS} items]`);
		}
		return items;
	}
	if (typeof value === 'object') {
		const normalized = {};
		let count = 0;
		for (const key in value) {
			if (!Object.prototype.hasOwnProperty.call(value, key)) {
				continue;
			}
			if (count >= MAX_CODEX_OBJECT_KEYS) {
				normalized.__truncatedKeys = true;
				break;
			}
			normalized[sliceCodexString(key, 200)] = sanitizeCodexValueForDisplay(value[key], depth + 1);
			count += 1;
		}
		return normalized;
	}
	return clampCodexString(String(value));
}

function stringifyShallowCodexValue(value) {
	try {
		if (Array.isArray(value)) return `[array:${value.length}]`;
		if (value && typeof value === 'object') return '{object}';
		return String(value);
	}
	catch {
		return '[unserializable]';
	}
}

function normalizeWebSearchInput(input) {
	const action = input.action && typeof input.action === 'object'
		? input.action
		: {};

	const queries = normalizeStringArray(action.queries ?? input.queries, MAX_CODEX_WEB_QUERIES);
	const query = firstNonEmptyString(action.query, input.query, queries[0]);
	const url = firstNonEmptyString(action.url, input.url);
	const pattern = firstNonEmptyString(action.pattern, input.pattern);
	const explicitType = firstNonEmptyString(action.type, input.actionType, input.action_type);

	const actionType = explicitType
		|| (url && pattern ? 'find_in_page' : url ? 'open_page' : (query || queries.length > 0) ? 'search' : '');

	const normalized = {};
	if (actionType) normalized.actionType = actionType;
	if (query) normalized.query = query;
	if (queries.length > 0) normalized.queries = queries;
	if (url) normalized.url = url;
	if (pattern) normalized.pattern = pattern;
	return normalized;
}

function normalizeApplyPatchInput(input) {
	const patch = firstNonEmptyString(input.patch, input.raw, input.value, MAX_CODEX_TOOL_RESULT_CHARS);
	if (!patch) return sanitizeCodexValueForDisplay(input);

	const normalized = { ...sanitizeCodexValueForDisplay(input), patch };
	delete normalized.raw;
	delete normalized.value;
	return normalized;
}

function firstNonEmptyString(...valuesAndMaybeMaxLength) {
	const lastValue = valuesAndMaybeMaxLength[valuesAndMaybeMaxLength.length - 1];
	const maxLength = typeof lastValue === 'number' ? lastValue : MAX_CODEX_STRING_CHARS;
	const values = typeof lastValue === 'number' ? valuesAndMaybeMaxLength.slice(0, -1) : valuesAndMaybeMaxLength;
	for (const value of values) {
		if (typeof value === 'string' && value.trim()) {
			return clampCodexString(value, maxLength);
		}
	}
	return '';
}

function normalizeStringArray(value, maxItems = MAX_CODEX_ARRAY_ITEMS) {
	if (!Array.isArray(value)) return [];

	const uniqueValues = new Set();
	for (const entry of value) {
		if (typeof entry !== 'string') continue;
		const trimmed = entry.trim();
		if (!trimmed) continue;
		uniqueValues.add(clampCodexString(trimmed));
		if (uniqueValues.size >= maxItems) break;
	}

	return [...uniqueValues];
}

function normalizeCodexMcpToolName(server, tool) {
	const serverName = typeof server === 'string' ? clampCodexString(server, 200) : '';
	const toolName = typeof tool === 'string' ? clampCodexString(tool, 200) : '';
	if (!serverName && !toolName) return 'tool';
	return `mcp__${serverName}__${toolName}`;
}

function normalizeCodexMcpToolInput(rawArguments) {
	if (typeof rawArguments === 'string') {
		return parseCodexArguments(rawArguments);
	}

	if (rawArguments && typeof rawArguments === 'object' && !Array.isArray(rawArguments)) {
		return sanitizeCodexValueForDisplay(rawArguments);
	}

	return {};
}

function normalizeCodexMcpToolState(rawStatus, resultPayload, rawError) {
	const status = typeof rawStatus === 'string' ? rawStatus : '';
	const error = typeof rawError === 'string' ? rawError : '';
	const resultText = extractCodexMcpResultText(resultPayload);
	const isTerminalStatus = status === 'completed'
		|| status === 'failed'
		|| status === 'error'
		|| status === 'cancelled';
	const isTerminal = isTerminalStatus || Boolean(error) || Boolean(resultText);
	const isError = Boolean(error) || status === 'failed' || status === 'error' || status === 'cancelled';

	let result = error || resultText;
	if (!result && isTerminalStatus) {
		result = status === 'completed' ? 'Completed' : 'Failed';
	}

	return {
		isTerminal,
		isError,
		status: isTerminal ? (isError ? 'error' : 'completed') : 'running',
		...(result ? { result } : {}),
	};
}

function extractCodexMcpResultText(resultPayload) {
	if (!resultPayload || typeof resultPayload !== 'object') return '';

	const content = resultPayload.content;
	if (!Array.isArray(content)) return '';

	return clampCodexString(content
		.slice(0, MAX_CODEX_ARRAY_ITEMS)
		.map((item) => (typeof item?.text === 'string' ? clampCodexString(item.text, MAX_CODEX_TOOL_RESULT_CHARS) : ''))
		.filter(Boolean)
		.join('\n'), MAX_CODEX_TOOL_RESULT_CHARS);
}

function normalizeCodexToolResult(normalizedName, rawResult) {
	if (!rawResult) return rawResult;
	if (!TERMINAL_RESULT_TOOLS.has(normalizedName)) {
		return typeof rawResult === 'string'
			? clampCodexString(rawResult, MAX_CODEX_TOOL_RESULT_CHARS)
			: sanitizeCodexValueForDisplay(rawResult);
	}
	return clampCodexString(unwrapTerminalResult(String(rawResult || '')), MAX_CODEX_TOOL_RESULT_CHARS);
}

function unwrapTerminalResult(raw) {
	let result = raw;
	const trimmed = result.trim();
	if (trimmed.startsWith('{') && trimmed.length <= MAX_CODEX_JSON_PARSE_CHARS) {
		try {
			const parsed = JSON.parse(trimmed);
			if (typeof parsed.output === 'string') {
				result = parsed.output;
			}
		}
		catch {
			// not JSON, keep as-is
		}
	}

	const outputMarker = 'Output:\n';
	const markerIndex = result.indexOf(outputMarker);
	if (markerIndex >= 0) {
		result = result.slice(markerIndex + outputMarker.length);
	}

	return result;
}

function isCodexToolOutputError(output) {
	const text = clampCodexString(output, MAX_CODEX_TOOL_RESULT_CHARS);
	const exitCodeMatch = text.match(/(?:Exit code:|Process exited with code)\s*(\d+)/i);
	if (exitCodeMatch) {
		return Number(exitCodeMatch[1]) !== 0;
	}

	const trimmed = text.trim();
	if (/^[Ee]rror:/.test(trimmed)) return true;

	if (trimmed.startsWith('{')) {
		try {
			const parsed = trimmed.length <= MAX_CODEX_JSON_PARSE_CHARS ? JSON.parse(trimmed) : null;
			if (parsed && typeof parsed === 'object' && 'error' in parsed) return true;
		}
		catch {
			// not JSON
		}
	}

	return false;
}

function parseCodexArguments(raw) {
	if (!raw) return {};
	if (String(raw).length > MAX_CODEX_JSON_PARSE_CHARS) {
		return { raw: clampCodexString(raw), truncated: true };
	}

	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return sanitizeCodexValueForDisplay(parsed);
		}
		return { value: sanitizeCodexValueForDisplay(parsed) };
	}
	catch {
		return { raw: clampCodexString(raw) };
	}
}

module.exports = {
	MCP_ICON_MARKER,
	AGENT_LIFECYCLE_TOOLS,
	SUBAGENT_HIDDEN_TOOLS,
	TOOLS_SKIP_BLOCKED_DETECTION,
	EDIT_TOOLS,
	WRITE_EDIT_TOOLS,
	BASH_TOOLS,
	FILE_TOOLS,
	MCP_TOOLS,
	READ_ONLY_TOOLS,
	getProviderModelSelectionPrefix,
	encodeProviderModelSelectionId,
	decodeProviderModelSelectionId,
	isProviderModelSelectionId,
	toProviderRuntimeModelId,
	getToolIcon,
	isAgentLifecycleTool,
	isSubagentSpawnTool,
	isSubagentHiddenTool,
	skipsBlockedDetection,
	isSubagentToolName,
	isEditTool,
	isWriteEditTool,
	isFileTool,
	isBashTool,
	isMcpTool,
	isReadOnlyTool,
	buildRefineSystemPrompt,
	parseInstructionRefineResponse,
	normalizeCodexToolName,
	normalizeCodexToolInput,
	normalizeCodexMcpToolName,
	normalizeCodexMcpToolInput,
	normalizeCodexMcpToolState,
	normalizeCodexToolResult,
	isCodexToolOutputError,
	parseCodexArguments,
};
