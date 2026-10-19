(function () {
	'use strict';

	const h = React.createElement;
	const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } = React;
	const chatOnly = new URLSearchParams(window.location.search).get('surface') === 'chat';
	const hostTheme = chatOnly ? new URLSearchParams(window.location.search).get('theme') : null;
	document.documentElement.dataset.sidebarSurface = chatOnly ? 'chat' : 'workspace';

	const UI_TEXT = {
		en: {
			'composer.placeholder': 'How can i help you today?',
			'composer.instructionPlaceholder': '# Save in custom system prompt',
			'composer.bangBashPlaceholder': '> Run a bash command...',
			'composer.instructionMode': 'Instruction mode',
			'composer.bangBashMode': 'Bang-bash mode',
			'activity.running': 'AI is working',
			'activity.starting': 'Starting runtime',
			'activity.waiting': 'Waiting for the next update',
			'activity.elapsed': 'elapsed',
			'settings.title': 'Runtime settings',
			'settings.tab.general': 'General',
			'settings.tab.claude': 'Claude',
			'settings.tab.codex': 'Codex',
			'settings.runtimeIdle': 'Runtime idle',
			'settings.setup': 'Setup',
			'settings.setupDesc': 'Shared sidebar settings used by both Claude and Codex.',
			'settings.language': 'Language',
			'settings.theme': 'Theme',
			'settings.themeLight': 'Light',
			'settings.themeDark': 'Dark',
			'settings.runtimeMode': 'Runtime mode',
			'settings.workspace': 'Workspace',
			'settings.model': 'Model',
			'settings.permissionMode': 'Permission mode',
			'settings.display': 'Display',
			'settings.displayDesc': 'Sidebar layout and rendering preferences.',
			'settings.maximumTabs': 'Maximum tabs',
			'settings.sidebarFontSize': 'Sidebar text size',
			'settings.largeTabsWarning': 'Large tab counts can make the compact sidebar crowded.',
			'settings.chatViewPlacement': 'Chat view placement',
			'settings.autoScroll': 'Auto-scroll',
			'settings.deferMath': 'Defer math while streaming',
			'settings.expandFileEdits': 'Expand file edits by default',
			'settings.conversations': 'Conversations',
			'settings.conversationsDesc': 'Conversation title and history behavior.',
			'settings.autoTitle': 'Auto title generation',
			'settings.titleModel': 'Title model',
			'settings.content': 'Content',
			'settings.contentDesc': 'Prompt and context defaults shared across providers.',
			'settings.userName': 'User name',
			'settings.sharedEnvironment': 'Shared environment',
			'settings.systemPrompt': 'System prompt',
			'settings.excludedTags': 'Excluded tags',
			'settings.mediaFolder': 'Media folder',
			'settings.input': 'Input',
			'settings.inputDesc': 'Composer shortcuts and keyboard navigation.',
			'settings.sendShortcut': 'Send shortcut',
			'settings.navigationMappings': 'Navigation mappings',
			'settings.hotkeys': 'Hotkeys',
			'settings.hotkeysDesc': 'Obsidian hotkeys are configured by the host app; standalone mode shows the command surfaces.',
			'settings.mockRuntime': 'Mock runtime',
			'settings.mockRuntimeDesc': 'Controls used only by the standalone parity tester.',
			'settings.mockTranscriptSpeed': 'Mock transcript speed',
			'settings.diagnostics': 'Diagnostics',
			'settings.diagnosticsDesc': 'Runtime log file used for troubleshooting provider events and renderer state.',
			'settings.runtimeLog': 'Runtime log',
			'settings.copyPath': 'Copy path',
			'settings.openFolder': 'Open folder',
			'settings.resetMock': 'Reset mock state',
			'settings.resetLocal': 'Reset local state',
			'settings.enabled': 'Enabled',
			'settings.disabled': 'Disabled',
			'settings.commandCtrlEnter': 'Command/Ctrl+Enter to send',
			'settings.enterToSend': 'Enter to send',
			'settings.auto': 'Auto',
			'settings.rightSidebar': 'Right sidebar',
			'settings.leftSidebar': 'Left sidebar',
			'settings.mainTab': 'Main tab',
			'settings.inlineEdit': 'Inline edit',
			'settings.openChat': 'Open chat',
			'settings.newSession': 'New session',
			'settings.newTab': 'New tab',
			'settings.closeCurrentTab': 'Close current tab',
			'settings.claudeSetupDesc': 'Claude Code CLI launch settings for this machine.',
			'settings.claudeCliPath': 'Claude CLI path',
			'settings.safety': 'Safety',
			'settings.claudeSafetyDesc': 'Claude Code permission and local settings behavior.',
			'settings.claudeSafeMode': 'Claude safe mode',
			'settings.loadUserSettings': 'Load user settings',
			'settings.models': 'Models',
			'settings.claudeModelsDesc': 'Claude model variants and custom model IDs.',
			'settings.enableOpus1m': 'Enable Opus 1M',
			'settings.enableSonnet1m': 'Enable Sonnet 1M',
			'settings.customModels': 'Custom models',
			'settings.availableModels': 'Available models',
			'settings.refreshModels': 'Refresh available models',
			'settings.runtimeModelCount': 'runtime model(s)',
			'settings.slashCommands': 'Slash commands',
			'settings.slashCommandsDesc': 'Manage vault slash commands and Claude skills used by / autocomplete.',
			'settings.hiddenSlashCommands': 'Hidden slash commands',
			'settings.subagents': 'Subagents',
			'settings.claudeSubagentsDesc': 'Manage Claude subagents available through @Agents mentions.',
			'settings.mcpServers': 'MCP servers',
			'settings.claudeMcpDesc': 'Manage Claude MCP servers and per-tool enablement.',
			'settings.plugins': 'Plugins',
			'settings.pluginsDesc': 'Manage Claude Code plugins discovered for this workspace.',
			'settings.pluginsNote': 'Toggle project and user plugins. Enabled state is saved to .claude/settings.json so Claude Code respects it.',
			'settings.experimental': 'Experimental',
			'settings.experimentalDesc': 'Optional Claude surfaces available in the original plugin.',
			'settings.chromeIntegration': 'Chrome integration',
			'settings.bangBashMode': 'Bang-bash mode',
			'settings.codexSetupDesc': 'Codex app-server launch settings for this machine.',
			'settings.enableCodexProvider': 'Enable Codex provider',
			'settings.installationMethod': 'Installation method',
			'settings.codexCliPath': 'Codex CLI path',
			'settings.codexDownloadSource': 'Codex download source',
			'settings.codexDownloadSourceAuto': 'Automatic (npm mirror first, official fallback)',
			'settings.codexDownloadSourceOfficial': 'Official npm / GitHub',
			'settings.codexDownloadSourceNpmMirror': 'npm mirror (recommended in China)',
			'settings.codexDownloadSourceCustom': 'Custom HTTPS mirror',
			'settings.codexCustomDownloadUrl': 'Codex custom mirror',
			'settings.wslDistroOverride': 'WSL distro override',
			'settings.openaiModelOverride': 'OpenAI model override',
			'settings.codexSafetyDesc': 'Sandbox and reasoning settings forwarded to Codex turns.',
			'settings.codexSafeMode': 'Codex safe mode',
			'settings.sandbox': 'Sandbox',
			'settings.reasoningSummary': 'Reasoning summary',
			'settings.codexModelsDesc': 'Codex model IDs and model selector visibility.',
			'settings.codexSkills': 'Codex skills',
			'settings.codexSkillsDesc': 'Manage project-level Codex skills discovered from .codex/skills.',
			'settings.hiddenSkills': 'Hidden skills',
			'settings.codexSubagents': 'Codex subagents',
			'settings.codexSubagentsDesc': 'Manage Codex subagents stored as .codex/agents TOML definitions.',
			'settings.codexMcpDesc': 'Codex MCP servers are managed by the Codex CLI.',
			'settings.codexMcpNotePrefix': 'Configure Codex MCP with ',
			'settings.codexMcpNoteSuffix': ' and the standalone runtime will inherit the CLI configuration.',
			'header.featureGuide': 'ArtInFact guide',
			'guide.title': 'ArtInFact guide',
			'guide.subtitle': 'Select a feature to locate its tool. Nothing starts automatically.',
			'guide.translation.title': 'Model-aware PDF translation',
			'guide.translation.desc': 'The model selected in the AI sidebar can drive full-document, word, and sentence translation; Bing remains available for quick translation.',
			'guide.analysis.title': 'AI outline and insights',
			'guide.analysis.desc': 'Generate an expandable paper outline and evidence-grounded insight cards for the current document.',
			'guide.graph.title': 'Literature graph',
			'guide.graph.desc': 'Organize papers, concepts, and relationships as a graph, then reuse selected nodes as AI context.',
			'guide.menu.title': '! menu and cross-paper questions',
			'guide.menu.desc': 'Choose sections, citations, figures, tables, and parsed content from one or many papers before asking.',
			'guide.notes.title': 'AI tools for Markdown',
			'guide.notes.desc': 'Polish, translate, and revise notes in place, then review each proposed change before accepting it.',
			'guide.figures.title': 'Scientific figures',
			'guide.figures.desc': 'Start from a curated gallery style and generate reusable research visuals from prompts.',
			'guide.activate': 'Locate',
			'guide.tip': 'Select a row to jump to its tool. Translation, graph builds, and AI generation remain manual.',
			'guide.close': 'Close guide',
		},
		'zh-CN': {
			'composer.placeholder': '今天想让我帮你做什么？',
			'composer.instructionPlaceholder': '# 保存到自定义系统提示词',
			'composer.bangBashPlaceholder': '> 运行 Bash 命令...',
			'composer.instructionMode': '指令模式',
			'composer.bangBashMode': 'Bang-bash 模式',
			'activity.running': 'AI 正在运行',
			'activity.starting': '正在启动运行时',
			'activity.waiting': '等待下一次更新',
			'activity.elapsed': '已运行',
			'settings.title': '运行时设置',
			'settings.tab.general': '通用',
			'settings.tab.claude': 'Claude',
			'settings.tab.codex': 'Codex',
			'settings.runtimeIdle': '运行时空闲',
			'settings.setup': '设置',
			'settings.setupDesc': 'Claude 和 Codex 共用的侧栏设置。',
			'settings.language': '语言',
			'settings.theme': '主题',
			'settings.themeLight': '浅色',
			'settings.themeDark': '深色',
			'settings.runtimeMode': '运行时模式',
			'settings.workspace': '工作区',
			'settings.model': '模型',
			'settings.permissionMode': '权限模式',
			'settings.display': '显示',
			'settings.displayDesc': '侧栏布局和渲染偏好。',
			'settings.maximumTabs': '最大标签数',
			'settings.sidebarFontSize': '侧栏字体大小',
			'settings.largeTabsWarning': '标签数量过多会让紧凑侧栏变拥挤。',
			'settings.chatViewPlacement': '聊天视图位置',
			'settings.autoScroll': '自动滚动',
			'settings.deferMath': '流式输出时延迟渲染数学公式',
			'settings.expandFileEdits': '默认展开文件编辑',
			'settings.conversations': '对话',
			'settings.conversationsDesc': '对话标题和历史记录行为。',
			'settings.autoTitle': '自动生成标题',
			'settings.titleModel': '标题模型',
			'settings.content': '内容',
			'settings.contentDesc': '两个提供方共用的提示词和上下文默认值。',
			'settings.userName': '用户名',
			'settings.sharedEnvironment': '共享环境变量',
			'settings.systemPrompt': '系统提示词',
			'settings.excludedTags': '排除标签',
			'settings.mediaFolder': '媒体文件夹',
			'settings.input': '输入',
			'settings.inputDesc': '输入框快捷键和键盘导航。',
			'settings.sendShortcut': '发送快捷键',
			'settings.navigationMappings': '导航映射',
			'settings.hotkeys': '快捷键',
			'settings.hotkeysDesc': 'Obsidian 快捷键由宿主应用配置；独立模式只展示命令入口。',
			'settings.mockRuntime': '模拟运行时',
			'settings.mockRuntimeDesc': '仅用于独立版一致性测试。',
			'settings.mockTranscriptSpeed': '模拟输出速度',
			'settings.diagnostics': '诊断',
			'settings.diagnosticsDesc': '用于排查提供方事件和渲染器状态的运行时日志。',
			'settings.runtimeLog': '运行时日志',
			'settings.copyPath': '复制路径',
			'settings.openFolder': '打开文件夹',
			'settings.resetMock': '重置模拟状态',
			'settings.resetLocal': '重置本地状态',
			'settings.enabled': '已启用',
			'settings.disabled': '已禁用',
			'settings.commandCtrlEnter': 'Command/Ctrl+Enter 发送',
			'settings.enterToSend': 'Enter 发送',
			'settings.auto': '自动',
			'settings.rightSidebar': '右侧栏',
			'settings.leftSidebar': '左侧栏',
			'settings.mainTab': '主标签页',
			'settings.inlineEdit': '行内编辑',
			'settings.openChat': '打开聊天',
			'settings.newSession': '新会话',
			'settings.newTab': '新标签',
			'settings.closeCurrentTab': '关闭当前标签',
			'settings.claudeSetupDesc': '本机 Claude Code CLI 启动设置。',
			'settings.claudeCliPath': 'Claude CLI 路径',
			'settings.safety': '安全',
			'settings.claudeSafetyDesc': 'Claude Code 权限和本地设置行为。',
			'settings.claudeSafeMode': 'Claude 安全模式',
			'settings.loadUserSettings': '加载用户设置',
			'settings.models': '模型',
			'settings.claudeModelsDesc': 'Claude 模型变体和自定义模型 ID。',
			'settings.enableOpus1m': '启用 Opus 1M',
			'settings.enableSonnet1m': '启用 Sonnet 1M',
			'settings.customModels': '自定义模型',
			'settings.availableModels': '可用模型',
			'settings.refreshModels': '刷新可用模型',
			'settings.runtimeModelCount': '个运行时模型',
			'settings.slashCommands': '斜杠命令',
			'settings.slashCommandsDesc': '管理用于 / 自动补全的仓库斜杠命令和 Claude skills。',
			'settings.hiddenSlashCommands': '隐藏斜杠命令',
			'settings.subagents': '子代理',
			'settings.claudeSubagentsDesc': '管理可通过 @Agents 提及的 Claude 子代理。',
			'settings.mcpServers': 'MCP 服务器',
			'settings.claudeMcpDesc': '管理 Claude MCP 服务器和每个工具的启用状态。',
			'settings.plugins': '插件',
			'settings.pluginsDesc': '管理当前工作区发现的 Claude Code 插件。',
			'settings.pluginsNote': '切换项目和用户插件。启用状态会保存到 .claude/settings.json，Claude Code 会读取它。',
			'settings.experimental': '实验功能',
			'settings.experimentalDesc': '原插件中提供的可选 Claude 功能。',
			'settings.chromeIntegration': 'Chrome 集成',
			'settings.bangBashMode': 'Bang-bash 模式',
			'settings.codexSetupDesc': '本机 Codex app-server 启动设置。',
			'settings.enableCodexProvider': '启用 Codex 提供方',
			'settings.installationMethod': '安装方式',
			'settings.codexCliPath': 'Codex CLI 路径',
			'settings.codexDownloadSource': 'Codex 下载线路',
			'settings.codexDownloadSourceAuto': '自动（npm 镜像优先，官方兜底）',
			'settings.codexDownloadSourceOfficial': '官方 npm / GitHub',
			'settings.codexDownloadSourceNpmMirror': 'npm 镜像（中国大陆推荐）',
			'settings.codexDownloadSourceCustom': '自定义 HTTPS 镜像',
			'settings.codexCustomDownloadUrl': 'Codex 自定义镜像',
			'settings.wslDistroOverride': 'WSL 发行版覆盖',
			'settings.openaiModelOverride': 'OpenAI 模型覆盖',
			'settings.codexSafetyDesc': '转发给 Codex 回合的沙箱和推理设置。',
			'settings.codexSafeMode': 'Codex 安全模式',
			'settings.sandbox': '沙箱',
			'settings.reasoningSummary': '推理摘要',
			'settings.codexModelsDesc': 'Codex 模型 ID 和模型选择器可见性。',
			'settings.codexSkills': 'Codex Skills',
			'settings.codexSkillsDesc': '管理项目级 .codex/skills 中的 Codex skills。',
			'settings.hiddenSkills': '隐藏 Skills',
			'settings.codexSubagents': 'Codex 子代理',
			'settings.codexSubagentsDesc': '管理保存为 .codex/agents TOML 定义的 Codex 子代理。',
			'settings.codexMcpDesc': 'Codex MCP 服务器由 Codex CLI 管理。',
			'settings.codexMcpNotePrefix': '使用 ',
			'settings.codexMcpNoteSuffix': ' 配置 Codex MCP，独立运行时会继承 CLI 配置。',
			'header.featureGuide': 'ArtInFact 功能导览',
			'guide.title': 'ArtInFact 功能导览',
			'guide.subtitle': '点击功能可定位到对应工具；不会自动启动翻译、生成等耗时任务。',
			'guide.translation.title': '模型驱动的 PDF 翻译',
			'guide.translation.desc': '侧栏选择模型后，可用于全文、划词与划句 LLM 翻译；也可切换 Bing 快速翻译。',
			'guide.analysis.title': 'AI 大纲与 AI 洞察',
			'guide.analysis.desc': '为当前论文生成可展开的大纲，以及带证据定位的洞察卡片。',
			'guide.graph.title': '文献图谱',
			'guide.graph.desc': '把论文、概念和关系组织成图谱，选中节点可作为 AI 上下文继续追问。',
			'guide.menu.title': '! 菜单与跨文献问答',
			'guide.menu.desc': '按章节、引用、图表和解析内容选择当前或多篇论文，再在同一对话中提问。',
			'guide.notes.title': 'Markdown 的 AI 工具',
			'guide.notes.desc': '在笔记中直接润色、翻译和改写，并在接受前逐项审阅 AI 提出的修改。',
			'guide.figures.title': '科研绘图',
			'guide.figures.desc': '从画廊风格和提示词出发生成科研图像，集中保存和复用。',
			'guide.activate': '定位',
			'guide.tip': '点击条目即可跳转到相应工具；翻译、图谱构建和 AI 生成仍需手动启动。',
			'guide.close': '关闭导览',
		},
	};
	const SIDEBAR_FONT_SIZE_MIN = 12;
	const SIDEBAR_FONT_SIZE_MAX = 20;
	const SIDEBAR_FONT_SIZE_DEFAULT = 14;
	const REASONING_EFFORT_ORDER = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
	const REASONING_EFFORT_SET = new Set(REASONING_EFFORT_ORDER);

	function normalizeLocale(locale) {
		return String(locale || '').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
	}

	function normalizeSidebarFontSize(value) {
		const numeric = Number(value);
		if (!Number.isFinite(numeric)) return SIDEBAR_FONT_SIZE_DEFAULT;
		return Math.min(SIDEBAR_FONT_SIZE_MAX, Math.max(SIDEBAR_FONT_SIZE_MIN, Math.round(numeric)));
	}

	function normalizeSidebarEffort(value) {
		const lower = String(value || '').trim().toLowerCase();
		if (lower === 'minimal') return 'low';
		return REASONING_EFFORT_SET.has(lower) ? lower : 'high';
	}

	function normalizeSidebarSettings(input) {
		const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
		const normalized = { ...source };
		if (hostTheme) normalized.theme = normalizeTheme(hostTheme);
		delete normalized.goRelayActive;
		normalized.effort = normalizeSidebarEffort(source.effortLevel || source.effort);
		const codexDownloadSource = String(source.codexDownloadSource || '').trim().toLowerCase();
		normalized.codexDownloadSource = ['auto', 'official', 'npm-mirror', 'custom'].includes(codexDownloadSource)
			? codexDownloadSource
			: codexDownloadSource === 'china-accelerated'
				? 'npm-mirror'
			: String(source.codexDownloadUrl || '').trim()
				? 'custom'
				: 'npm-mirror';
		delete normalized.effortLevel;
		return normalized;
	}

	function normalizeTheme(theme) {
		return String(theme || '').toLowerCase() === 'dark' ? 'dark' : 'light';
	}

	function parseExplicitTheme(theme) {
		const normalized = String(theme || '').trim().toLowerCase();
		return normalized === 'dark' || normalized === 'light' ? normalized : '';
	}

	function parseExplicitLocale(locale) {
		const normalized = String(locale || '').trim().toLowerCase();
		if (normalized === 'zh' || normalized === 'zh-cn') return 'zh-CN';
		if (normalized === 'en' || normalized === 'en-us') return 'en';
		return '';
	}

	function t(settingsOrLocale, key, fallback) {
		const rawLocale = typeof settingsOrLocale === 'string'
			? settingsOrLocale
			: settingsOrLocale?.locale;
		const locale = normalizeLocale(rawLocale);
		return UI_TEXT[locale]?.[key] || UI_TEXT.en[key] || fallback || key;
	}
	const embeddedHostMode = shouldForceParentBridgeApi();
	let hostPort = null;
	const pendingHostMessages = [];
	function postMessageToHost(message) {
		if (!embeddedHostMode) {
			window.parent.postMessage(message, '*');
			return;
		}
		if (hostPort) {
			hostPort.postMessage(message);
		}
		else {
			pendingHostMessages.push(message);
		}
	}
	window.addEventListener('message', (event) => {
		if (!embeddedHostMode || !isTrustedHostMessageEvent(event)
			|| event.data?.type !== 'claudian-sidebar:channel' || !event.ports?.[0]) {
			return;
		}
		hostPort?.close();
		hostPort = event.ports[0];
		hostPort.start?.();
		for (const message of pendingHostMessages.splice(0)) {
			hostPort.postMessage(message);
		}
	});

	function createParentBridgeApi() {
		if (window.parent === window) {
			return null;
		}
		const pending = new Map();
		const listeners = new Set();
		let disposed = false;
		const clearPendingTimer = (entry) => {
			if (entry?.timer) {
				window.clearTimeout(entry.timer);
				entry.timer = null;
			}
		};
		const takePending = (id) => {
			const entry = pending.get(id);
			if (!entry) {
				return null;
			}
			pending.delete(id);
			clearPendingTimer(entry);
			return entry;
		};
		const handleMessage = (event) => {
			if (!isTrustedHostMessageEvent(event)) {
				return;
			}
			if (disposed) {
				return;
			}
			const data = event.data || {};
			if (!data || typeof data.type !== 'string') {
				return;
			}
			if (data.type === 'claudian-sidebar:response') {
				const payload = data.payload || {};
				const entry = takePending(payload.id);
				if (!entry) {
					return;
				}
				if (payload.error) {
					entry.reject(new Error(payload.error));
				}
				else {
					entry.resolve(payload.result);
				}
				return;
			}
			if (data.type === 'claudian-sidebar:event') {
				listeners.forEach((listener) => listener(data.payload || {}));
			}
		};
		window.addEventListener('message', handleMessage);
		const invoke = (method, args) => new Promise((resolve, reject) => {
			if (disposed) {
				reject(new Error(`AI sidebar bridge disposed: ${method}`));
				return;
			}
			const id = `bridge-${Date.now()}-${Math.random().toString(36).slice(2)}`;
			const entry = { resolve, reject, timer: null };
			const timeoutMs = method === 'startTurn' ? 30 * 60 * 1000 : 60 * 1000;
			entry.timer = window.setTimeout(() => {
				const current = pending.get(id);
				if (!current) {
					return;
				}
				pending.delete(id);
				clearPendingTimer(current);
				reject(new Error(`AI sidebar bridge timeout: ${method}`));
			}, timeoutMs);
			pending.set(id, entry);
			try {
				postMessageToHost({
					type: 'claudian-sidebar:request',
					payload: { id, method, args: args || {} },
				});
			}
			catch (error) {
				if (takePending(id)) {
					reject(error instanceof Error ? error : new Error(String(error)));
				}
			}
		});
		postMessageToHost({ type: 'claudian-sidebar:ready' });
		const dispose = () => {
			if (disposed) {
				return;
			}
			disposed = true;
			if (typeof window.removeEventListener === 'function') {
				window.removeEventListener('message', handleMessage);
			}
			for (const entry of pending.values()) {
				clearPendingTimer(entry);
				entry.reject(new Error('AI sidebar bridge disposed'));
			}
			pending.clear();
			listeners.clear();
		};
		const bridge = {
			getState: () => invoke('getState'),
			getDiagnostics: () => invoke('getDiagnostics'),
			environment: (payload) => invoke('environment', payload),
			updateSettings: (payload) => invoke('updateSettings', payload),
			saveMcpServers: (payload) => invoke('saveMcpServers', payload),
			testMcpServer: (payload) => invoke('testMcpServer', payload),
			loadProviderAssets: (payload) => invoke('loadProviderAssets', payload),
			saveProviderAssets: (payload) => invoke('saveProviderAssets', payload),
			generateTitle: (payload) => invoke('generateTitle', payload),
			cancelTitleGeneration: (payload) => invoke('cancelTitleGeneration', payload),
			startInstructionRefine: (payload) => invoke('startInstructionRefine', payload),
			continueInstructionRefine: (payload) => invoke('continueInstructionRefine', payload),
			cancelInstructionRefine: () => invoke('cancelInstructionRefine'),
			startInlineEdit: (payload) => invoke('startInlineEdit', payload),
			continueInlineEdit: (payload) => invoke('continueInlineEdit', payload),
			cancelInlineEdit: () => invoke('cancelInlineEdit'),
			rewindClaudeFiles: (payload) => invoke('rewindClaudeFiles', payload),
			runBangBash: (payload) => invoke('runBangBash', payload),
			startTurn: (payload) => invoke('startTurn', payload),
			steerTurn: (payload) => invoke('steerTurn', payload),
			cancelTurn: () => invoke('cancelTurn'),
			respondApproval: (payload) => invoke('respondApproval', payload),
			pickWorkspace: () => invoke('pickWorkspace'),
			openLogFolder: () => invoke('openLogFolder'),
			openPath: (payload) => invoke('openPath', payload),
			getMineruWorkspaceTrees: (payload) => invoke('getMineruWorkspaceTrees', payload),
			log: (payload) => invoke('log', payload),
			onEvent(listener) {
				if (disposed) {
					return () => {};
				}
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
		};
		Object.defineProperty(bridge, 'dispose', {
			value: dispose,
		});
		return bridge;
	}

	function shouldForceParentBridgeApi() {
		try {
			return new URLSearchParams(window.location.search || '').get('parentBridge') === '1';
		}
		catch {
			return false;
		}
	}

	function isTrustedHostMessageEvent(event) {
		if (event?.isTrusted === false) {
			return false;
		}
		const source = event?.source;
		const parentWindow = window.parent || window;
		if (!source) {
			return parentWindow === window;
		}
		if (parentWindow !== window) {
			return source === parentWindow;
		}
		return source === window || source === parentWindow;
	}

	const api = embeddedHostMode ? createParentBridgeApi() : (window.claudianSidebar || createParentBridgeApi());

	function logPreview(value, limit = 220) {
		const text = typeof value === 'string' ? value : value == null ? '' : String(value);
		return text.length > limit ? `${text.slice(0, limit)}...` : text;
	}

	function summarizeApprovalForLog(approval = {}) {
		const input = approval?.input && typeof approval.input === 'object' ? approval.input : {};
		return {
			id: approval.id || '',
			kind: approval.kind || '',
			title: approval.title || '',
			tool: approval.tool || (approval.kind === 'command' ? 'Bash' : approval.kind === 'file_change' ? 'Edit' : ''),
			requestId: approval.runtimeRequestId || '',
			threadId: approval.runtimeThreadId || '',
			commandPreview: logPreview(input.command || ''),
			pathPreview: logPreview(input.cwd || input.path || ''),
			descriptionPreview: logPreview(approval.description || input.reason || ''),
			questionCount: Array.isArray(approval.questions) ? approval.questions.length : 0,
		};
	}

	function logRendererEvent(event, payload = {}) {
		try {
			Promise.resolve(api?.log?.({ event, ...payload })).catch(() => {});
		}
		catch {
			// Logging must never affect chat rendering.
		}
	}

	function summarizeRendererRuntimeEvent(event = {}) {
		const chunk = event.chunk && typeof event.chunk === 'object' ? event.chunk : null;
		const usage = chunk?.usage && typeof chunk.usage === 'object' ? chunk.usage : null;
		return {
			type: event.type || '',
			status: event.status || '',
			provider: event.provider || event.providerId || '',
			sessionKey: event.sessionKey || '',
			threadId: event.threadId || event.runtimeThreadId || event.raw?.params?.threadId || '',
			turnId: event.turnId || event.assistantMessageId || event.raw?.params?.turnId || event.raw?.params?.turn?.id || '',
			detail: logPreview(event.detail || event.content || ''),
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
			approval: event.type === 'approval' ? summarizeApprovalForLog(event.approval || {}) : undefined,
			approvalId: event.id || event.approval?.id || '',
			approvalRequestId: event.requestId || event.approval?.runtimeRequestId || '',
			rawMethod: event.raw?.method || '',
			rawSubtype: event.raw?.subtype || event.subtype || '',
		};
	}

	const TAB_SCOPED_RUNTIME_EVENT_TYPES = new Set([
		'thread',
		'turn-started',
		'turn-metadata',
		'user-metadata',
		'chunk',
		'context_compacted',
		'approval',
		'approval_resolved',
		'error',
		'done',
	]);

	const STREAMING_RUNTIME_EVENT_TYPES = new Set([
		'chunk',
		'context_compacted',
		'approval',
		'error',
		'done',
	]);

	function runtimeEventSessionKey(event = {}) {
		return String(event.sessionKey || event.raw?.sessionKey || event.raw?.params?.sessionKey || event.chunk?.sessionKey || '').trim();
	}

	function runtimeEventThreadId(event = {}) {
		return String(
			event.threadId
			|| event.runtimeThreadId
			|| event.approval?.runtimeThreadId
			|| event.approval?.threadId
			|| event.raw?.params?.threadId
			|| event.chunk?.threadId
			|| '',
		).trim();
	}

	function runtimeEventTurnId(event = {}) {
		return String(
			event.turnId
			|| event.assistantMessageId
			|| event.userMessageId
			|| event.raw?.params?.turnId
			|| event.raw?.params?.turn?.id
			|| event.chunk?.turnId
			|| '',
		).trim();
	}

	function runtimeEventApprovalRequestId(event = {}) {
		return String(event.requestId || event.approval?.runtimeRequestId || event.approval?.requestId || '').trim();
	}

	function tabRuntimeSessionKeys(tab = {}) {
		return [tab.runtimeSessionKey, tab.historyId, tab.id].map((value) => String(value || '').trim()).filter(Boolean);
	}

	function tabHasRuntimeTurnId(tab = {}, turnId = '') {
		const needle = String(turnId || '').trim();
		if (!needle) return false;
		return (tab.messages || []).some((message) => (
			message?.runtimeTurnId === needle
			|| message?.assistantMessageId === needle
			|| message?.runtimeUserMessageId === needle
			|| message?.userMessageId === needle
		));
	}

	function tabHasRuntimeApprovalId(tab = {}, approvalId = '', requestId = '') {
		const approvalNeedle = String(approvalId || '').trim();
		const requestNeedle = String(requestId || '').trim();
		if (!approvalNeedle && !requestNeedle) return false;
		return (tab.messages || []).some((message) => (message.contentBlocks || []).some((block) => (
			(approvalNeedle && block.runtimeApprovalId === approvalNeedle)
			|| (requestNeedle && block.runtimeRequestId === requestNeedle)
		)));
	}

	function isTabScopedRuntimeEvent(event = {}) {
		return TAB_SCOPED_RUNTIME_EVENT_TYPES.has(event.type);
	}

	function resolveRuntimeEventTabIdFromTabs(event = {}, tabs = [], options = {}) {
		const candidates = Array.isArray(tabs) ? tabs : [];
		const sessionKey = runtimeEventSessionKey(event);
		if (sessionKey) {
			const match = candidates.find((tab) => tabRuntimeSessionKeys(tab).includes(sessionKey));
			if (match?.id) return match.id;
		}
		const threadId = runtimeEventThreadId(event);
		if (threadId) {
			const match = candidates.find((tab) => String(tab.runtimeThreadId || '').trim() === threadId);
			if (match?.id) return match.id;
		}
		const turnId = runtimeEventTurnId(event);
		if (turnId) {
			const match = candidates.find((tab) => tabHasRuntimeTurnId(tab, turnId));
			if (match?.id) return match.id;
		}
		const approvalId = String(event.id || event.approval?.id || '').trim();
		const requestId = runtimeEventApprovalRequestId(event);
		if (approvalId || requestId) {
			const match = candidates.find((tab) => tabHasRuntimeApprovalId(tab, approvalId, requestId));
			if (match?.id) return match.id;
		}
		const runtimeTabId = String(options.runtimeTabId || '').trim();
		if (runtimeTabId && candidates.some((tab) => tab.id === runtimeTabId)) {
			return runtimeTabId;
		}
		const streamingTabs = candidates.filter((tab) => tab?.isStreaming);
		if (streamingTabs.length === 1 && streamingTabs[0]?.id) {
			return streamingTabs[0].id;
		}
		const activeTabId = String(options.activeTabId || '').trim();
		if (activeTabId && candidates.some((tab) => tab.id === activeTabId)) {
			return activeTabId;
		}
		return '';
	}

	function shouldDropRuntimeEventForTab(event = {}, tab = null, options = {}) {
		if (!isTabScopedRuntimeEvent(event)) return false;
		if (!tab) return true;
		if (event.type === 'approval_resolved') return false;
		if (!STREAMING_RUNTIME_EVENT_TYPES.has(event.type)) return false;
		if (tab.isStreaming === true) return false;
		return String(options.runtimeTabId || '').trim() !== tab.id;
	}

	const PROVIDERS = {
		claude: { id: 'claude', label: 'Claude', icon: 'claude' },
		codex: { id: 'codex', label: 'Codex', icon: 'openai' },
	};

	const MODELS = [
		{ value: 'haiku', label: 'Haiku', group: 'Claude', providerId: 'claude' },
		{ value: 'sonnet', label: 'Sonnet', group: 'Claude', providerId: 'claude' },
		{ value: 'sonnet[1m]', label: 'Sonnet 1M', group: 'Claude', providerId: 'claude' },
		{ value: 'opus', label: 'Opus', group: 'Claude', providerId: 'claude' },
		{ value: 'opus[1m]', label: 'Opus 1M', group: 'Claude', providerId: 'claude' },
		{ value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini', group: 'Codex', providerId: 'codex' },
		{ value: 'gpt-5.5', label: 'GPT-5.5', group: 'Codex', providerId: 'codex' },
	];
	const CONTEXT_WINDOW_STANDARD = 200000;
	const CONTEXT_WINDOW_1M = 1000000;

	const COMMANDS = [
		{ name: 'clear', desc: 'Start a new conversation', originalBuiltIn: true, displayPrefix: '/', insertPrefix: '/' },
		{ name: 'new', desc: 'Alias for /clear', aliasOnly: true, displayPrefix: '/', insertPrefix: '/' },
		{ name: 'add-dir', desc: 'Add external context directory', argumentHint: '[path/to/directory]', originalBuiltIn: true, displayPrefix: '/', insertPrefix: '/' },
		{ name: 'resume', desc: 'Resume a previous conversation', originalBuiltIn: true, displayPrefix: '/', insertPrefix: '/' },
		{ name: 'fork', desc: 'Fork entire conversation to new session', originalBuiltIn: true, displayPrefix: '/', insertPrefix: '/' },
		{ name: 'compact', desc: 'Compact conversation history', providerCommand: true, providerIds: ['codex'], topLevelOnly: true, displayPrefix: '/', insertPrefix: '/' },
		{ name: '/model', desc: 'Open model and runtime settings', standaloneOnly: true },
		{ name: '/help', desc: 'Show a standalone feature guide', standaloneOnly: true },
	];

	const CLAUDE_SDK_HIDDEN_COMMANDS = new Set([
		'context', 'cost', 'debug', 'extra-usage', 'heapdump', 'init',
		'insights', 'loop', 'schedule', 'security-review', 'simplify', 'update-config',
	]);

	const VAULT_MENTION_ITEMS = [];
	const STATIC_CONTEXT_FILES = [];

	const CODEX_SKILL_ROOT_OPTIONS = [
		{ id: 'vault-codex', label: '.codex/skills' },
	];

	function defaultClaudeCommands() {
		return [
			{
				id: 'cmd-review-code',
				providerId: 'claude',
				kind: 'command',
				name: 'review-code',
				description: 'Review code changes for risks and missing tests',
				argumentHint: '[file] [focus]',
				content: 'Review this code for correctness, regressions, and missing tests:\n\n$ARGUMENTS',
				scope: 'vault',
				source: 'user',
				isEditable: true,
				isDeletable: true,
				displayPrefix: '/',
				insertPrefix: '/',
			},
			{
				id: 'skill-note-polish',
				providerId: 'claude',
				kind: 'skill',
				name: 'note-polish',
				description: 'Polish a draft note while preserving the author voice',
				argumentHint: '[note]',
				content: 'Polish the following note while keeping its structure and voice:\n\n$ARGUMENTS',
				scope: 'vault',
				source: 'user',
				isEditable: true,
				isDeletable: true,
				displayPrefix: '/',
				insertPrefix: '/',
			},
		];
	}

	function defaultClaudeAgents() {
		return [
			{
				id: 'reviewer',
				name: 'reviewer',
				description: 'Review code changes and missing tests',
				prompt: 'You are a careful code reviewer. Focus on bugs, regressions, edge cases, and test gaps.',
				model: 'inherit',
				source: 'vault',
			},
			{
				id: 'frontend',
				name: 'frontend',
				description: 'Polish sidebar UI states and interaction details',
				prompt: 'You are a frontend specialist. Preserve the existing design language and check responsive interaction states.',
				model: 'sonnet',
				source: 'vault',
				tools: ['Read', 'Edit', 'Grep'],
				skills: ['note-polish'],
			},
		];
	}

	function defaultCodexSkills() {
		return [
			{
				id: 'codex-skill-analyze',
				providerId: 'codex',
				kind: 'skill',
				name: 'analyze',
				description: 'Analyze selected project context',
				content: 'Analyze the selected project context and identify the highest-risk implementation points.',
				scope: 'vault',
				source: 'user',
				rootId: 'vault-codex',
				persistenceKey: 'codex-skill:vault-codex:analyze',
				isEditable: true,
				isDeletable: true,
				displayPrefix: '$',
				insertPrefix: '$',
			},
			{
				id: 'codex-skill-review',
				providerId: 'codex',
				kind: 'skill',
				name: 'review',
				description: 'Review implementation risks and missing tests',
				content: 'Review the implementation for bugs, regressions, and missing tests.',
				scope: 'vault',
				source: 'user',
				rootId: 'vault-codex',
				persistenceKey: 'codex-skill:vault-codex:review',
				isEditable: true,
				isDeletable: true,
				displayPrefix: '$',
				insertPrefix: '$',
			},
			{
				id: 'codex-skill-summarize',
				providerId: 'codex',
				kind: 'skill',
				name: 'summarize',
				description: 'Summarize long files or transcripts',
				content: 'Summarize the relevant files or transcript, preserving decisions and open questions.',
				scope: 'vault',
				source: 'user',
				rootId: 'vault-codex',
				persistenceKey: 'codex-skill:vault-codex:summarize',
				isEditable: true,
				isDeletable: true,
				displayPrefix: '$',
				insertPrefix: '$',
			},
		];
	}

	function defaultCodexSubagents() {
		return [
			{
				name: 'code_reviewer',
				description: 'Reviews code for correctness, security, and missing coverage',
				developerInstructions: 'Review code like an owner. Prioritize correctness, security, and missing test coverage.',
				nicknameCandidates: ['atlas', 'delta'],
				model: 'gpt-5.5',
				modelReasoningEffort: 'high',
				sandboxMode: 'workspace-write',
				persistenceKey: 'codex-subagent:code_reviewer.toml',
			},
			{
				name: 'ui_polisher',
				description: 'Checks frontend interaction details and visual parity',
				developerInstructions: 'Inspect UI states for visual parity, responsive behavior, and interaction polish.',
				nicknameCandidates: ['echo'],
				modelReasoningEffort: 'medium',
				sandboxMode: 'workspace-write',
				persistenceKey: 'codex-subagent:ui_polisher.toml',
			},
		];
	}

	function normalizeCommandName(value) {
		return String(value || '').trim().replace(/^\//, '');
	}

	const YAML_RESERVED_WORDS = new Set(['true', 'false', 'null', 'yes', 'no', 'on', 'off']);

	function isSkillEntry(entry) {
		return entry?.kind === 'skill';
	}

	function validateCommandName(value) {
		const name = normalizeCommandName(value);
		if (!name) return 'Command name is required';
		if (name.length > 64) {
			return 'Command name must be 64 characters or fewer';
		}
		if (!/^[a-z0-9-]+$/.test(name)) {
			return 'Command name can only contain lowercase letters, numbers, and hyphens';
		}
		if (YAML_RESERVED_WORDS.has(name)) {
			return 'Command name cannot be a YAML reserved word (true, false, null, yes, no, on, off)';
		}
		return '';
	}

	function commandNameToClaudeSkillName(value) {
		return String(value || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64);
	}

	function validateAgentName(value) {
		const name = String(value || '').trim();
		if (!name) return 'Agent name is required';
		if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(name)) {
			return 'Use letters, numbers, hyphen, or underscore; start with a letter or number.';
		}
		return '';
	}

	function validateCodexSubagentName(value) {
		const name = String(value || '').trim();
		if (!name) return 'Subagent name is required';
		if (name.length > 64) return 'Subagent name must be 64 characters or fewer';
		if (!/^[a-z0-9_-]+$/.test(name)) {
			return 'Subagent name can only contain lowercase letters, numbers, hyphens, and underscores';
		}
		return '';
	}

	function validateCodexNicknames(value) {
		const candidates = parseCommaList(value) || [];
		const seen = new Set();
		for (const candidate of candidates) {
			if (!/^[A-Za-z0-9 _-]+$/.test(candidate)) {
				return 'Nickname candidates can only contain ASCII letters, numbers, spaces, hyphens, and underscores';
			}
			const lower = candidate.toLowerCase();
			if (seen.has(lower)) return 'Nickname candidates must be unique';
			seen.add(lower);
		}
		return '';
	}

	function parseCommaList(value) {
		const trimmed = String(value || '').trim();
		if (!trimmed) return undefined;
		const items = trimmed.split(',').map((item) => item.trim()).filter(Boolean);
		return items.length ? items : undefined;
	}

	function firstParagraph(value) {
		return String(value || '').split(/\n\s*\n/).map((line) => line.trim()).find(Boolean) || '';
	}

	const SLASH_FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;

	function parseSlashScalar(value) {
		const text = String(value || '').trim();
		if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
			return text.slice(1, -1).replace(/\\"/g, '"');
		}
		if (text === 'true') return true;
		if (text === 'false') return false;
		if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
			try {
				return JSON.parse(text);
			}
			catch {
				return text;
			}
		}
		return text;
	}

	function parseSlashFrontmatterBlock(block) {
		const result = {};
		let pendingListKey = '';
		const flushListKey = () => {
			pendingListKey = '';
		};
		for (const rawLine of String(block || '').split(/\r?\n/)) {
			const line = rawLine.replace(/\t/g, '  ');
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			if (pendingListKey && /^-\s+/.test(trimmed)) {
				if (!Array.isArray(result[pendingListKey])) result[pendingListKey] = [];
				result[pendingListKey].push(parseSlashScalar(trimmed.replace(/^-\s+/, '')));
				continue;
			}
			flushListKey();
			const colonIndex = trimmed.indexOf(':');
			if (colonIndex === -1) continue;
			const key = trimmed.slice(0, colonIndex).trim();
			if (!/^[A-Za-z0-9_-]+$/.test(key)) continue;
			const rest = trimmed.slice(colonIndex + 1).trim();
			if (!rest) {
				result[key] = [];
				pendingListKey = key;
				continue;
			}
			result[key] = parseSlashScalar(rest);
		}
		return result;
	}

	function slashExtractString(frontmatter, key) {
		const value = frontmatter?.[key];
		if (typeof value === 'string' && value.length > 0) return value;
		if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
			return value.map((item) => `[${item}]`).join(' ');
		}
		return undefined;
	}

	function slashExtractStringArray(frontmatter, key) {
		const value = frontmatter?.[key];
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

	function slashExtractBoolean(frontmatter, key) {
		return typeof frontmatter?.[key] === 'boolean' ? frontmatter[key] : undefined;
	}

	function normalizeArgumentHint(value) {
		const hint = String(value || '').trim();
		if (!hint || hint.includes('[') || hint.includes('<')) return hint;
		return `[${hint}]`;
	}

	function parseSlashCommandContent(content) {
		const match = String(content || '').match(SLASH_FRONTMATTER_PATTERN);
		if (!match) return { promptContent: String(content || '') };
		const fm = parseSlashFrontmatterBlock(match[1]);
		return {
			description: slashExtractString(fm, 'description'),
			argumentHint: slashExtractString(fm, 'argument-hint') || slashExtractString(fm, 'argumentHint'),
			allowedTools: slashExtractStringArray(fm, 'allowed-tools') || slashExtractStringArray(fm, 'allowedTools'),
			model: slashExtractString(fm, 'model'),
			promptContent: match[2] || '',
			disableModelInvocation: slashExtractBoolean(fm, 'disable-model-invocation') ?? slashExtractBoolean(fm, 'disableModelInvocation'),
			userInvocable: slashExtractBoolean(fm, 'user-invocable') ?? slashExtractBoolean(fm, 'userInvocable'),
			context: slashExtractString(fm, 'context') === 'fork' ? 'fork' : undefined,
			agent: slashExtractString(fm, 'agent'),
			hooks: fm.hooks && typeof fm.hooks === 'object' && !Array.isArray(fm.hooks) ? fm.hooks : undefined,
		};
	}

	function normalizeClaudeCommands(value) {
		const source = Array.isArray(value) ? value : [];
		return source.map((entry) => {
			const name = normalizeCommandName(entry.name || entry.id || 'command');
			const kind = entry.kind === 'skill' ? 'skill' : 'command';
			return {
				id: String(entry.id || `${kind}-${name}`),
				providerId: 'claude',
				kind,
				name,
				description: entry.description ? String(entry.description) : '',
				argumentHint: entry.argumentHint ? String(entry.argumentHint) : '',
				allowedTools: Array.isArray(entry.allowedTools) ? entry.allowedTools.map(String).filter(Boolean) : undefined,
				model: entry.model ? String(entry.model) : '',
				content: String(entry.content || ''),
				disableModelInvocation: entry.disableModelInvocation === true,
				userInvocable: entry.userInvocable === false ? false : undefined,
				context: entry.context === 'fork' ? 'fork' : undefined,
				agent: entry.agent ? String(entry.agent) : '',
				scope: entry.scope || 'vault',
				source: entry.source || 'user',
				isEditable: entry.isEditable !== false,
				isDeletable: entry.isDeletable !== false,
				displayPrefix: '/',
				insertPrefix: '/',
				persistenceKey: entry.persistenceKey,
				filePath: entry.filePath,
				pluginName: entry.pluginName,
				hooks: entry.hooks,
				deleted: entry.deleted === true,
			};
		});
	}

	function normalizeClaudeAgents(value) {
		const source = Array.isArray(value) ? value : [];
		return source.map((agent) => {
			const name = String(agent.name || agent.id || 'agent').trim() || 'agent';
			return {
				id: String(agent.id || name),
				name,
				description: String(agent.description || ''),
				prompt: String(agent.prompt || ''),
				model: String(agent.model || 'inherit'),
				tools: Array.isArray(agent.tools) ? agent.tools.map(String).filter(Boolean) : undefined,
				disallowedTools: Array.isArray(agent.disallowedTools) ? agent.disallowedTools.map(String).filter(Boolean) : undefined,
				skills: Array.isArray(agent.skills) ? agent.skills.map(String).filter(Boolean) : undefined,
				source: agent.source || 'vault',
				filePath: agent.filePath,
				pluginName: agent.pluginName,
				permissionMode: agent.permissionMode,
				hooks: agent.hooks,
				extraFrontmatter: agent.extraFrontmatter,
			};
		});
	}

	function parseCodexSkillRootId(persistenceKey) {
		const text = String(persistenceKey || '');
		if (text === '.codex/skills') return 'vault-codex';
		return 'vault-codex';
	}

	function createCodexSkillPersistenceKey(rootId, currentName) {
		return ['codex-skill', rootId || 'vault-codex', currentName ? encodeURIComponent(currentName) : '']
			.filter(Boolean)
			.join(':');
	}

	function codexSkillDescription(entry) {
		const interfaceData = entry && typeof entry.interface === 'object' ? entry.interface : null;
		return String(
			interfaceData?.shortDescription
			|| entry?.shortDescription
			|| entry?.description
			|| '',
		);
	}

	function normalizeCodexSkills(value) {
		const source = Array.isArray(value) ? value : [];
		return source.map((entry) => {
			const name = normalizeCommandName(entry.name || entry.id || 'skill');
			const rootId = entry.rootId || parseCodexSkillRootId(entry.persistenceKey);
			return {
				id: String(entry.id || `codex-skill-${name}`),
				providerId: 'codex',
				kind: 'skill',
				name,
				description: codexSkillDescription(entry),
				content: String(entry.content || ''),
				scope: entry.scope || 'vault',
				source: entry.source || 'user',
				rootId,
				persistenceKey: entry.persistenceKey || createCodexSkillPersistenceKey(rootId, name),
				isEditable: entry.isEditable !== false,
				isDeletable: entry.isDeletable !== false,
				displayPrefix: '$',
				insertPrefix: '$',
				deleted: entry.deleted === true,
			};
		});
	}

	function normalizeCodexRuntimeSkills(value) {
		const source = Array.isArray(value) ? value : [];
		return source.map((entry) => {
			const name = normalizeCommandName(entry.name || entry.id || 'skill');
			return {
				id: String(entry.id || `codex-runtime-skill-${entry.runtimeScope || entry.scope || 'user'}-${name}`),
				providerId: 'codex',
				kind: 'skill',
				name,
				description: codexSkillDescription(entry),
				content: String(entry.content || ''),
				scope: entry.scope || (entry.runtimeScope === 'repo' ? 'vault' : 'user'),
				runtimeScope: entry.runtimeScope || entry.scope || 'user',
				source: entry.source || 'runtime',
				path: entry.path || entry.filePath || '',
				rootId: entry.rootId || parseCodexSkillRootId(entry.persistenceKey),
				persistenceKey: entry.persistenceKey,
				isEditable: false,
				isDeletable: false,
				displayPrefix: '$',
				insertPrefix: '$',
				enabled: entry.enabled !== false,
				deleted: entry.deleted === true,
			};
		}).filter((entry) => entry.name && entry.enabled !== false);
	}

	function normalizeCodexSubagents(value) {
		const source = Array.isArray(value) ? value : [];
		return source.map((agent) => {
			const name = String(agent.name || 'agent').trim() || 'agent';
			return {
				name,
				description: String(agent.description || ''),
				developerInstructions: String(agent.developerInstructions || ''),
				nicknameCandidates: Array.isArray(agent.nicknameCandidates) ? agent.nicknameCandidates.map(String).filter(Boolean) : undefined,
				model: agent.model ? String(agent.model) : '',
				modelReasoningEffort: agent.modelReasoningEffort ? String(agent.modelReasoningEffort) : '',
				sandboxMode: agent.sandboxMode ? String(agent.sandboxMode) : '',
				persistenceKey: agent.persistenceKey || `codex-subagent:${encodeURIComponent(name)}.toml`,
				extraFields: agent.extraFields,
			};
		});
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

	function modelOptionLabel(value, providerId, aliases) {
		const decoded = decodeProviderPrefixedModel(value);
		const modelValue = decoded?.modelId || String(value || '').trim();
		return aliases?.[value] || aliases?.[modelValue] || (providerId === 'codex' ? formatCodexModelLabel(modelValue) : formatClaudeModelLabel(modelValue));
	}

	function decodeProviderPrefixedModel(value) {
		const normalized = String(value || '').trim();
		const prefixes = [
			{ providerId: 'claude', prefix: 'claude-code/' },
			{ providerId: 'codex', prefix: 'openai-codex/' },
		];
		for (const entry of prefixes) {
			if (normalized.toLowerCase().startsWith(entry.prefix)) {
				const modelId = normalized.slice(entry.prefix.length).trim();
				return modelId ? { providerId: entry.providerId, modelId } : null;
			}
		}
		return null;
	}

	function encodeProviderPrefixedModel(providerId, value) {
		const model = String(value || '').trim();
		if (!model) return '';
		const decoded = decodeProviderPrefixedModel(model);
		if (decoded) return decoded.providerId === providerId ? model : '';
		const prefix = providerId === 'codex' ? 'openai-codex/' : providerId === 'claude' ? 'claude-code/' : '';
		return prefix ? `${prefix}${model}` : model;
	}

	function providerRuntimeModelId(providerId, value) {
		const decoded = decodeProviderPrefixedModel(value);
		if (decoded?.providerId === providerId) return decoded.modelId;
		return String(value || '').trim();
	}

	function isFastTierCodexModel(value) {
		return providerRuntimeModelId('codex', value).toLowerCase() === 'gpt-5.5';
	}

	function modelOptionSelectionValue(option) {
		return option?.selectionValue || encodeProviderPrefixedModel(option?.providerId, option?.value);
	}

	function modelOptionKey(option) {
		return `${option?.providerId || ''}:${option?.value || ''}`;
	}

	function modelOptionMatches(option, value) {
		const model = String(value || '').trim();
		if (!model) return false;
		if (option?.value === model || option?.selectionValue === model) return true;
		const decoded = decodeProviderPrefixedModel(model);
		return !!decoded && decoded.providerId === option?.providerId && decoded.modelId === option?.value;
	}

	function normalizeReasoningEffortValue(value) {
		const raw = typeof value === 'object' && value !== null
			? (value.reasoningEffort || value.reasoning_effort || value.value || value.id || value.name)
			: value;
		const normalized = String(raw || '').trim().toLowerCase().replace(/[_\s-]+/gu, '');
		if (normalized === 'minimal' || normalized === 'xlow') return 'low';
		if (normalized === 'extrahigh') return 'xhigh';
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
		const supported = [
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
		].flatMap((entry) => normalizeReasoningEffortList(entry));
		const supportedReasoningEfforts = [...new Set(supported)]
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
		].find((entry) => typeof entry === 'boolean');
		return {
			...(supportedReasoningEfforts.length ? { supportedReasoningEfforts } : {}),
			...(defaultReasoningEffort ? { defaultReasoningEffort } : {}),
			...(typeof supportsEffort === 'boolean' ? { supportsReasoningEffort: supportsEffort } : {}),
		};
	}

	function normalizeModelOptions(value, providerId, group, source, aliases = {}) {
		const entries = Array.isArray(value)
			? value
			: String(value || '').split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
		return entries
			.map((entry) => {
				const entrySource = typeof entry === 'object' && String(entry?.source || '').trim()
					? String(entry.source).trim()
					: source;
				const rawValue = typeof entry === 'string'
					? entry
					: (entry?.value || entry?.model || entry?.id || '');
				const modelValue = String(rawValue || '').trim();
				if (!modelValue) return null;
				const label = typeof entry === 'object' && entry?.label
					? String(entry.label)
					: modelOptionLabel(modelValue, providerId, aliases);
				const reasoningMetadata = extractModelReasoningMetadata(entry);
				return {
					value: modelValue,
					selectionValue: encodeProviderPrefixedModel(providerId, modelValue),
					label,
					group,
					providerId,
					custom: entrySource === 'custom',
					source: entrySource,
					description: typeof entry === 'object' ? String(entry.description || '') : '',
					...reasoningMetadata,
				};
			})
			.filter((entry) => !['Current runtime model', 'Configured model'].includes(entry?.description))
			.filter(Boolean);
	}

	function getProviderScopedConfig(settings, providerId) {
		const id = String(providerId || '').trim();
		if (!id || !settings || typeof settings !== 'object') return {};
		const candidates = [
			settings.providerConfigs?.[id],
			settings.providers?.[id],
			settings[`${id}Provider`],
			settings[`${id}Settings`],
		];
		const found = candidates.find((candidate) => candidate && typeof candidate === 'object' && !Array.isArray(candidate));
		return found || {};
	}

	function collectProviderCustomModels(settings, providerId) {
		const scoped = getProviderScopedConfig(settings, providerId);
		const directKey = providerId === 'codex' ? 'codexCustomModels' : 'claudeCustomModels';
		return uniqueModelValues([
			...String(settings?.[directKey] || '').split(/\r?\n/),
			...String(scoped.customModels || '').split(/\r?\n/),
		]);
	}

	function markCustomModelOptions(options, customModels) {
		const customValues = new Set((Array.isArray(customModels) ? customModels : [])
			.map((model) => String(model || '').trim().toLowerCase())
			.filter(Boolean));
		if (customValues.size === 0) return options;
		return (Array.isArray(options) ? options : []).map((option) => (
			customValues.has(String(option?.value || '').trim().toLowerCase())
				? { ...option, custom: true, source: 'custom' }
				: option
		));
	}

	function parseEnvironmentText(rawText) {
		const env = {};
		for (const rawLine of String(rawText || '').split(/\r?\n/)) {
			const line = rawLine.trim();
			if (!line || line.startsWith('#')) continue;
			const index = line.indexOf('=');
			if (index <= 0) continue;
			const key = line.slice(0, index).trim();
			const value = line.slice(index + 1).trim();
			if (key && value) env[key] = value;
		}
		return env;
	}

	function uniqueModelValues(values) {
		const seen = new Set();
		return values.filter((value) => {
			const model = String(value || '').trim();
			const key = model.toLowerCase();
			if (!model || seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}

	const CLAUDE_ENV_MODEL_KEYS = [
		'ANTHROPIC_MODEL',
		'ANTHROPIC_DEFAULT_HAIKU_MODEL',
		'ANTHROPIC_DEFAULT_SONNET_MODEL',
		'ANTHROPIC_DEFAULT_OPUS_MODEL',
	];
	const CLAUDE_ENV_MODEL_TYPE_PRIORITY = {
		model: 4,
		haiku: 3,
		sonnet: 2,
		opus: 1,
	};

	function claudeModelTypeFromEnvKey(key) {
		if (key === 'ANTHROPIC_MODEL') return 'model';
		const match = String(key || '').match(/ANTHROPIC_DEFAULT_(\w+)_MODEL/);
		return match ? match[1].toLowerCase() : key;
	}

	function collectClaudeEnvironmentModelOptions(settings, aliases = {}) {
		const env = {};
		const byModel = new Map();
		for (const key of CLAUDE_ENV_MODEL_KEYS) {
			const model = String(env[key] || '').trim();
			if (!model) continue;
			const type = claudeModelTypeFromEnvKey(key);
			const entry = byModel.get(model) || {
				value: model,
				label: modelOptionLabel(model, 'claude', aliases),
				types: [],
			};
			entry.types.push(type);
			byModel.set(model, entry);
		}
		return Array.from(byModel.values())
			.sort((a, b) => {
				const aPriority = Math.max(...a.types.map((type) => CLAUDE_ENV_MODEL_TYPE_PRIORITY[type] || 0));
				const bPriority = Math.max(...b.types.map((type) => CLAUDE_ENV_MODEL_TYPE_PRIORITY[type] || 0));
				return bPriority - aPriority;
			})
			.map((entry) => {
				const types = [...entry.types].sort((a, b) => (CLAUDE_ENV_MODEL_TYPE_PRIORITY[b] || 0) - (CLAUDE_ENV_MODEL_TYPE_PRIORITY[a] || 0));
				return {
					value: entry.value,
					label: entry.label,
					group: 'Claude',
					providerId: 'claude',
					source: 'env',
					description: `Custom model (${types.join(', ')})`,
				};
			});
	}

	function collectCodexEnvironmentModels(settings) {
		return [];
	}

	function getProviderBaseModels(settings, providerId) {
		const assetKey = providerId === 'codex' ? 'codexModels' : 'claudeModels';
		const source = Array.isArray(settings?.[assetKey]) ? settings[assetKey] : [];
		const aliases = settings?.customModelAliases || {};
		return normalizeModelOptions(source, providerId, providerId === 'codex' ? 'Codex' : 'Claude', 'default', aliases)
			.filter((model) => {
				if (providerId === 'codex') return settings?.codexEnabled !== false;
				if (model.value === 'sonnet') return settings?.claudeEnableSonnet1M !== true;
				if (model.value === 'sonnet[1m]') return settings?.claudeEnableSonnet1M === true;
				if (model.value === 'opus') return settings?.claudeEnableOpus1M !== true;
				if (model.value === 'opus[1m]') return settings?.claudeEnableOpus1M === true;
				return true;
			});
	}

	function getClaudeModelOptions(settings) {
		const aliases = settings?.customModelAliases || {};
		const customModelValues = collectProviderCustomModels(settings, 'claude');
		const envModels = markCustomModelOptions(collectClaudeEnvironmentModelOptions(settings, aliases), customModelValues);
		const runtimeModels = markCustomModelOptions(
			normalizeModelOptions(settings?.claudeRuntimeModels, 'claude', 'Claude', 'runtime', aliases),
			customModelValues,
		);
		const customModels = normalizeModelOptions(customModelValues, 'claude', 'Claude', 'custom', aliases);
		if (envModels.length > 0) {
			return [...envModels, ...runtimeModels, ...customModels];
		}
		const baseModels = runtimeModels.length > 0
			? []
			: markCustomModelOptions(getProviderBaseModels(settings, 'claude'), customModelValues);
		return [
			...baseModels,
			...runtimeModels,
			...customModels,
		];
	}

	function getCodexModelOptions(settings) {
		if (settings?.codexEnabled === false) return [];
		const aliases = settings?.customModelAliases || {};
		const group = 'Codex';
		const customModelValues = collectProviderCustomModels(settings, 'codex');
		const rawEnvModels = normalizeModelOptions(
			collectCodexEnvironmentModels(settings),
			'codex',
			group,
			'env',
			aliases,
		).filter((model) => model.value);
		const rawRuntimeModels = normalizeModelOptions(
			settings?.codexRuntimeModels,
			'codex',
			group,
			'runtime',
			aliases,
		);
		const envModels = markCustomModelOptions(rawEnvModels, customModelValues);
		const runtimeModels = markCustomModelOptions(rawRuntimeModels, customModelValues);
		const customModels = normalizeModelOptions(customModelValues, 'codex', group, 'custom', aliases);
		const baseModels = runtimeModels.length > 0 || envModels.length > 0
			? []
			: markCustomModelOptions(getProviderBaseModels(settings, 'codex'), customModelValues);
		return [
			...envModels,
			...baseModels,
			...runtimeModels,
			...customModels,
		];
	}

	function getModelOptions(settings) {
		const seen = new Set();
		return [...getClaudeModelOptions(settings), ...getCodexModelOptions(settings)].filter((model) => {
			const key = modelOptionKey(model);
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}

	function getTitleModelOptions(settings) {
		return getModelOptions(settings);
	}

	function normalizeModelIdForContext(model) {
		const decoded = decodeProviderPrefixedModel(model);
		return String(decoded?.modelId || model || '').trim().toLowerCase();
	}

	function isValidContextWindow(value) {
		const number = Number(value);
		return Number.isFinite(number) && number > 0;
	}

	function getConfiguredContextWindow(model, settings) {
		const limits = settings?.customContextLimits;
		if (limits && typeof limits === 'object' && !Array.isArray(limits)) {
			const exact = Number(limits[model]);
			if (isValidContextWindow(exact)) return exact;
			const normalized = normalizeModelIdForContext(model);
			const matches = Object.entries(limits)
				.filter(([key, value]) => key !== model && normalizeModelIdForContext(key) === normalized && isValidContextWindow(value))
				.map(([, value]) => Number(value));
			if (matches.length === 1) return matches[0];
		}
		return normalizeModelIdForContext(model).endsWith('[1m]') ? CONTEXT_WINDOW_1M : CONTEXT_WINDOW_STANDARD;
	}

	function calculateUsagePercentage(contextTokens, contextWindow) {
		return contextWindow > 0
			? Math.min(100, Math.max(0, Math.round((contextTokens / contextWindow) * 100)))
			: 0;
	}

	function normalizeUsageInfo(usage, model, settings) {
		const source = usage && typeof usage === 'object' ? usage : {};
		const inputTokens = Number(source.inputTokens ?? source.input_tokens ?? 0) || 0;
		const outputTokens = Number(source.outputTokens ?? source.output_tokens ?? 0) || 0;
		const cacheCreationInputTokens = Number(source.cacheCreationInputTokens ?? source.cache_creation_input_tokens ?? 0) || 0;
		const cacheReadInputTokens = Number(source.cacheReadInputTokens ?? source.cache_read_input_tokens ?? 0) || 0;
		const contextTokens = Number(source.contextTokens ?? (inputTokens + cacheCreationInputTokens + cacheReadInputTokens)) || 0;
		const usageModel = String(source.model || model || '').trim();
		const fallbackContextWindow = getConfiguredContextWindow(usageModel || model, settings);
		const providedContextWindow = Number(source.contextWindow ?? source.context_window ?? 0) || 0;
		const hasAuthoritativeWindow = source.contextWindowIsAuthoritative === true && providedContextWindow > 0;
		const contextWindow = hasAuthoritativeWindow
			? providedContextWindow
			: (providedContextWindow > 0 ? providedContextWindow : fallbackContextWindow);
		return {
			...source,
			model: usageModel,
			inputTokens,
			outputTokens,
			cacheCreationInputTokens,
			cacheReadInputTokens,
			contextTokens,
			contextWindow,
			contextWindowIsAuthoritative: hasAuthoritativeWindow,
			percentage: calculateUsagePercentage(contextTokens, contextWindow),
		};
	}

	function recalculateUsageForModel(usage, model, settings) {
		if (!usage || typeof usage !== 'object') return usage;
		const nextModel = String(model || usage.model || '').trim();
		const preserveAuthoritativeWindow = usage.contextWindowIsAuthoritative === true
			&& Number(usage.contextWindow || 0) > 0
			&& String(usage.model || '') === nextModel;
		const contextWindow = preserveAuthoritativeWindow
			? Number(usage.contextWindow)
			: getConfiguredContextWindow(nextModel, settings);
		const contextTokens = Number(usage.contextTokens || 0) || 0;
		return {
			...usage,
			model: nextModel,
			contextWindow,
			contextWindowIsAuthoritative: preserveAuthoritativeWindow,
			percentage: calculateUsagePercentage(contextTokens, contextWindow),
		};
	}

	function normalizeHiddenList(value) {
		if (Array.isArray(value)) {
			return value
				.map((entry) => String(entry || '').trim().replace(/^[$/]+/, '').toLowerCase())
				.filter(Boolean);
		}
		return String(value || '')
			.split(/\r?\n|,/)
			.map((entry) => entry.trim().replace(/^[$/]+/, '').toLowerCase())
			.filter(Boolean);
	}

	function normalizeExcludedTags(value) {
		return String(value || '')
			.split(/\r?\n|,/)
			.map((entry) => entry.trim().replace(/^#/, '').toLowerCase())
			.filter(Boolean);
	}

	function isExcludedByTags(item, settings) {
		const excluded = new Set(normalizeExcludedTags(settings?.excludedTagsText));
		if (!excluded.size || !Array.isArray(item?.tags)) return false;
		return item.tags.map((tag) => String(tag || '').replace(/^#/, '').toLowerCase()).some((tag) => excluded.has(tag));
	}

	function isHiddenProviderEntry(settings, providerId, name) {
		const key = `${providerId}HiddenCommands`;
		const hidden = new Set([
			...normalizeHiddenList(settings?.[key]),
			...normalizeHiddenList(settings?.hiddenProviderCommands?.[providerId]),
			...(providerId === 'claude' ? normalizeHiddenList(settings?.hiddenSlashCommands) : []),
		]);
		return hidden.has(String(name || '').replace(/^[$/]+/, '').toLowerCase());
	}

	function dropdownBareName(item) {
		return String(item?.rawName || item?.entry?.name || item?.name || '')
			.replace(/^[!$/]+/, '')
			.toLowerCase();
	}

	function codexSkillDropdownPriority(skill) {
		const runtimeScope = String(skill?.runtimeScope || '').toLowerCase();
		if (skill?.scope === 'vault' || runtimeScope === 'repo') return 0;
		if (runtimeScope === 'user' || skill?.scope === 'user') return 1;
		if (runtimeScope === 'system') return 2;
		if (runtimeScope === 'admin') return 3;
		return 9;
	}

	function codexSkillScopeLabel(skill) {
		const runtimeScope = String(skill?.runtimeScope || '').toLowerCase();
		if (runtimeScope === 'repo') return 'repo';
		if (runtimeScope === 'user') return 'user';
		if (runtimeScope === 'system') return 'system';
		if (runtimeScope === 'admin') return 'admin';
		if (skill?.rootId === 'vault-codex') return '.codex';
		return skill?.scope === 'vault' ? 'repo' : 'user';
	}

	function getCodexSkillItems(settings) {
		const seen = new Set();
		return [
			...normalizeCodexSkills(settings?.codexSkills),
			...normalizeCodexRuntimeSkills(settings?.codexRuntimeSkills),
		]
			.filter((skill) => skill.deleted !== true && !isHiddenProviderEntry(settings, 'codex', skill.name))
			.sort((left, right) => {
				const priorityDelta = codexSkillDropdownPriority(left) - codexSkillDropdownPriority(right);
				if (priorityDelta !== 0) return priorityDelta;
				const nameDelta = left.name.localeCompare(right.name);
				if (nameDelta !== 0) return nameDelta;
				return String(left.path || '').localeCompare(String(right.path || ''));
			})
			.filter((skill) => {
				const key = String(skill.name || '').toLowerCase();
				if (!key || seen.has(key)) return false;
				seen.add(key);
				return true;
			})
			.filter((skill) => !isHiddenProviderEntry(settings, 'codex', skill.name))
			.map((skill) => ({
				name: skill.name,
				rawName: skill.name,
				desc: skill.description || firstParagraph(skill.content) || 'Codex skill',
				scope: codexSkillScopeLabel(skill),
				entry: skill,
				kind: 'skill',
				displayPrefix: '$',
				insertPrefix: '$',
				isBuiltIn: false,
				isProviderCommand: true,
			}));
	}

	function getSlashCommandItems(settings, providerId) {
		const builtIns = COMMANDS
			.filter((command) => command.originalBuiltIn)
			.map((command) => ({ ...command, isBuiltIn: true }));
		const providerCommands = COMMANDS
			.filter((command) => command.providerCommand && (providerId === 'claude' || providerId === 'codex'))
			.filter((command) => !Array.isArray(command.providerIds) || command.providerIds.includes(providerId))
			.filter((command) => !isHiddenProviderEntry(settings, providerId, command.name))
			.map((command) => ({ ...command, isBuiltIn: false, isProviderCommand: true }));
		const baseItems = [...builtIns, ...providerCommands];
		if (providerId === 'codex') {
			const seen = new Set(baseItems.map(dropdownBareName));
			const skillItems = [];
			for (const skill of getCodexSkillItems(settings)) {
				const key = dropdownBareName(skill);
				if (seen.has(key)) continue;
				seen.add(key);
				skillItems.push(skill);
			}
			return [...baseItems, ...skillItems];
		}
		const seen = new Set(baseItems.map(dropdownBareName));
		const runtimeCommands = normalizeClaudeCommands(Array.isArray(settings?.claudeRuntimeCommands) ? settings.claudeRuntimeCommands : [])
			.filter((entry) => entry.userInvocable !== false && entry.deleted !== true);
		const runtimeItems = [];
		for (const entry of runtimeCommands) {
			if (isHiddenProviderEntry(settings, 'claude', entry.name)) continue;
			if (entry.source === 'sdk' && CLAUDE_SDK_HIDDEN_COMMANDS.has(String(entry.name || '').toLowerCase())) continue;
			const displayName = `/${entry.name}`;
			const key = dropdownBareName({ rawName: entry.name });
			if (seen.has(key)) continue;
			seen.add(key);
			runtimeItems.push({
				name: displayName,
				desc: entry.description || firstParagraph(entry.content) || (isSkillEntry(entry) ? 'Claude skill' : 'Runtime command'),
				argumentHint: entry.argumentHint || '',
				kind: entry.kind,
				entry,
				isBuiltIn: false,
				isProviderCommand: true,
			});
		}
		const configured = normalizeClaudeCommands(settings?.claudeCommands).filter((entry) => entry.userInvocable !== false && entry.deleted !== true);
		const custom = [];
		for (const entry of configured) {
			if (isHiddenProviderEntry(settings, 'claude', entry.name)) continue;
			const displayName = `/${entry.name}`;
			const key = dropdownBareName({ rawName: entry.name });
			if (seen.has(key)) continue;
			seen.add(key);
			custom.push({
				name: displayName,
				desc: entry.description || firstParagraph(entry.content) || (isSkillEntry(entry) ? 'Claude skill' : 'Vault command'),
				argumentHint: entry.argumentHint || '',
				kind: entry.kind,
				entry,
				isBuiltIn: false,
			});
		}
		return [...baseItems, ...runtimeItems, ...custom];
	}

	function dropdownItemMatches(item, query) {
		const search = String(query || '').toLowerCase();
		if (!search) return true;
		return [
			item?.name,
			item?.rawName,
			item?.label,
			item?.desc,
			item?.content,
			item?.paperTitle,
			item?.author,
			item?.entry?.name,
			item?.entry?.description,
		].some((value) => String(value || '').toLowerCase().includes(search));
	}

	function normalizeSlashArgumentHint(value) {
		const text = String(value || '').trim();
		if (!text) return '';
		if (/^\[.*\]$/.test(text) || /^<.*>$/.test(text)) return text;
		return `[${text}]`;
	}

	function sortDropdownItems(items, query) {
		const search = String(query || '').toLowerCase();
		const score = (item) => {
			if (!search) return 0;
			const name = dropdownBareName(item);
			if (name === search) return 0;
			if (name.startsWith(search)) return 1;
			return 2;
		};
		return [...items].sort((left, right) => {
			const scoreDelta = score(left) - score(right);
			if (scoreDelta !== 0) return scoreDelta;
			const nameDelta = dropdownBareName(left).localeCompare(dropdownBareName(right));
			if (nameDelta !== 0) return nameDelta;
			return String(left.name || '').localeCompare(String(right.name || ''));
		});
	}

	function getConfiguredAgentMentions(settings, providerId) {
		const claudeAgents = normalizeClaudeAgents(settings?.claudeAgents)
			.map((agent) => ({
				type: 'agent',
				id: agent.id,
				name: agent.name,
				description: agent.description,
				providerId: 'claude',
				source: agent.source,
				pluginName: agent.pluginName,
			}));
		const codexSource = Array.isArray(settings?.codexSubagents) ? settings.codexSubagents : [];
		const codexAgents = normalizeCodexSubagents(codexSource)
			.map((agent) => ({
				type: 'agent',
				id: agent.name,
				name: agent.name,
				description: agent.description,
				providerId: 'codex',
			}));
		const source = providerId === 'codex' ? codexAgents : claudeAgents;
		const seen = new Set();
		return source.filter((agent) => {
			const key = agent.id.toLowerCase();
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}

	function expandCommandTemplate(content, argsText) {
		const args = String(argsText || '').trim();
		const parts = args ? args.split(/\s+/) : [];
		return String(content || '')
			.replace(/\$ARGUMENTS/g, args)
			.replace(/\$(\d+)/g, (_match, indexText) => parts[Number(indexText) - 1] || '');
	}

	function renderVaultCommandMock(entry, argsText) {
		const expanded = expandCommandTemplate(entry.content, argsText).trim() || entry.content || '(empty prompt)';
		const meta = [];
		meta.push(`kind: ${isSkillEntry(entry) ? 'skill' : 'slash command'}`);
		if (entry.model) meta.push(`model: ${entry.model}`);
		if (entry.allowedTools?.length) meta.push(`allowed tools: ${entry.allowedTools.join(', ')}`);
		if (entry.disableModelInvocation) meta.push('model invocation: disabled');
		if (entry.userInvocable === false) meta.push('user invocation: disabled');
		if (entry.context === 'fork') meta.push(`context: fork${entry.agent ? ` (${entry.agent})` : ''}`);
		return [
			`Mock executed /${entry.name}`,
			'',
			meta.map((line) => `- ${line}`).join('\n'),
			'',
			'Expanded prompt template:',
			'',
			expanded,
		].join('\n');
	}

	const MOCK_IMAGE_DATA = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z8BQDwAFgwJ/lp3u7wAAAABJRU5ErkJggg==';
	const MAX_TURN_IMAGES = 8;
	const MAX_IMAGE_ATTACHMENT_BYTES = 10 * 1024 * 1024;
	const MAX_MESSAGE_CONTEXT_CHIPS = 32;
	const MAX_MESSAGE_CONTEXT_PATH_LENGTH = 512;
	const MAX_COMPOSER_VISIBLE_PDF_SNIPPET_CHIPS = 6;
	const PDF_TREE_COMPACT_SELECTION_THRESHOLD = 8;
	const MAX_SHELL_PAYLOAD_TEXT_LENGTH = 64000;
	const MAX_PDF_SELECTION_TEXT_LENGTH = 64000;
	const MAX_PDF_CITATION_TEXTS = 48;
	const MAX_PDF_CITATION_TEXT_LENGTH = 4096;
	const MAX_PDF_CITATION_MARKERS = 80;
	const MAX_RUNTIME_ASSISTANT_TEXT_LENGTH = 160000;
	const MAX_RUNTIME_THINKING_TEXT_LENGTH = 64000;
	const MAX_RUNTIME_TOOL_RESULT_LENGTH = 64000;
	const MAX_RUNTIME_TOOL_INPUT_STRING_LENGTH = 12000;
	const MAX_RUNTIME_TOOL_INPUT_ARRAY_ITEMS = 80;
	const MAX_RUNTIME_TOOL_INPUT_OBJECT_KEYS = 80;
	const MAX_RUNTIME_TOOL_INPUT_DEPTH = 4;
	const MAX_RUNTIME_DIFF_LINES = 800;
	const MAX_RUNTIME_DIFF_LINE_LENGTH = 2000;
	const MAX_RUNTIME_GENERATED_FILES = 64;
	const MAX_MARKDOWN_SOURCE_LENGTH = 160000;
	const MAX_MARKDOWN_LINES = 4000;
	const MAX_MARKDOWN_BLOCKS = 600;
	const MAX_MARKDOWN_CODE_LENGTH = 64000;
	const MAX_MARKDOWN_TABLE_ROWS = 200;
	const MAX_MARKDOWN_LIST_ITEMS = 400;
	const MAX_MARKDOWN_LIST_ITEM_LENGTH = 2000;
	const MAX_APPROVAL_TEXT_LENGTH = 4000;
	const MAX_APPROVAL_TITLE_LENGTH = 160;
	const MAX_APPROVAL_QUESTIONS = 3;
	const MAX_APPROVAL_OPTIONS = 8;
	const IMAGE_EXTENSIONS = {
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.gif': 'image/gif',
		'.webp': 'image/webp',
	};

	function normalizePathText(value) {
		return String(value || '').replace(/\\/g, '/');
	}

	function readUrlParamValue(name) {
		try {
			return new URLSearchParams(window.location.search || '').get(name) || '';
		}
		catch {
			return '';
		}
	}

	function getDefaultWorkspacePath() {
		return String(
			readUrlParamValue('workspace')
			|| readUrlParamValue('workspacePath')
			|| window.__PDF_AI_WORKSPACE_ROOT
			|| '',
		).trim();
	}

	function pathBaseName(value) {
		const normalized = normalizePathText(value).replace(/\/+$/g, '');
		const parts = normalized.split('/');
		return parts[parts.length - 1] || normalized || 'context';
	}

	function imageMediaTypeFromName(value) {
		const normalized = String(value || '').toLowerCase();
		const match = normalized.match(/(\.[^./\\]+)$/);
		return match ? (IMAGE_EXTENSIONS[match[1]] || '') : '';
	}

	function isSupportedImageFile(file) {
		return String(file?.type || '').startsWith('image/') && !!imageMediaTypeFromName(file?.name || '');
	}

	function attachmentMediaType(file) {
		return imageMediaTypeFromName(file?.name || '') || (String(file?.type || '').startsWith('image/') ? file.type : 'image/png');
	}

	function truncateMiddleText(value, maxLength, marker = '\n...[truncated]...\n') {
		const text = String(value || '');
		if (!Number.isFinite(maxLength) || maxLength <= 0 || text.length <= maxLength) return text;
		const markerText = String(marker || '...');
		if (maxLength <= markerText.length + 8) return text.slice(0, maxLength);
		const remaining = maxLength - markerText.length;
		const headLength = Math.ceil(remaining * 0.55);
		const tailLength = Math.max(0, remaining - headLength);
		return `${text.slice(0, headLength)}${markerText}${text.slice(text.length - tailLength)}`;
	}

	function truncateEndText(value, maxLength, suffix = '...') {
		const text = String(value || '');
		if (!Number.isFinite(maxLength) || maxLength <= 0 || text.length <= maxLength) return text;
		const suffixText = String(suffix || '');
		if (maxLength <= suffixText.length + 1) return text.slice(0, maxLength);
		return `${text.slice(0, maxLength - suffixText.length)}${suffixText}`;
	}

	function estimateBase64Bytes(value) {
		const text = String(value || '').replace(/\s+/g, '');
		if (!text) return 0;
		const padding = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0;
		return Math.max(0, Math.floor((text.length * 3) / 4) - padding);
	}

	function estimateDataUrlBytes(value) {
		const text = String(value || '');
		const commaIndex = text.indexOf(',');
		if (commaIndex < 0) return text.length;
		const header = text.slice(0, commaIndex).toLowerCase();
		const body = text.slice(commaIndex + 1);
		return header.includes(';base64') ? estimateBase64Bytes(body) : body.length;
	}

	function pdfAttachmentSize(attachment) {
		if (!attachment || typeof attachment !== 'object') return 0;
		const explicitSize = Number(attachment.size || attachment.file?.size || 0) || 0;
		if (explicitSize > 0) return explicitSize;
		const dataUrl = attachment.dataUrl || attachment.dataURL;
		if (typeof dataUrl === 'string') return estimateDataUrlBytes(dataUrl);
		if (typeof attachment.source?.data === 'string') return estimateBase64Bytes(attachment.source.data);
		return 0;
	}

	function normalizePdfSnippetText(value) {
		return String(value || '').trim().toLowerCase();
	}

	function normalizePdfLabel(value, fallback) {
		const normalized = String(value || '').replace(/\s+/g, ' ').trim();
		if (!normalized) return fallback;
		return normalized.length > 96 ? `${normalized.slice(0, 93)}...` : normalized;
	}

	function makePdfTokenPart(value, fallback) {
		const normalized = String(value || '')
			.normalize('NFKD')
			.replace(/[^\w.-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 48);
		return normalized || fallback;
	}

	function makePdfDisplayTokenPart(value, fallback) {
		const normalized = String(value || '')
			.replace(/（当前打开）/g, '')
			.replace(/\s+/g, '-')
			.replace(/[^\p{L}\p{N}._-]+/gu, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 42);
		return normalized || fallback;
	}

	function normalizePdfSelection(rawSelection, documentContext = {}) {
		const selection = rawSelection && typeof rawSelection === 'object' && !Array.isArray(rawSelection)
			? rawSelection
			: null;
		if (!selection) return null;
		const selectedText = truncateMiddleText(
			String(selection.selectedText || selection.text || selection.selection?.text || '').trim(),
			MAX_PDF_SELECTION_TEXT_LENGTH,
		);
		const rawAttachments = Array.isArray(selection.attachments) ? selection.attachments : [];
		const rawAttachmentSizes = rawAttachments.map((attachment) => pdfAttachmentSize(attachment));
		const attachments = rawAttachments
			.filter((attachment) => attachment && pdfAttachmentSize(attachment) <= MAX_IMAGE_ATTACHMENT_BYTES)
			.slice(0, MAX_TURN_IMAGES);
		const displayLabel = String(selection.displayLabel || selection.displayTitle || '').trim();
		const filePath = truncateEndText(String(selection.filePath || documentContext.filePath || selection.label || documentContext.title || '').trim(), MAX_MESSAGE_CONTEXT_PATH_LENGTH);
		if (!selectedText && attachments.length === 0 && !displayLabel) return null;
		const startLine = Math.max(1, Number(selection.startLine) || 1);
		const endLine = Math.max(startLine, Number(selection.endLine) || startLine);
		return {
			...selection,
			filePath,
			label: truncateEndText(String(selection.label || documentContext.title || pathBaseName(filePath) || 'PDF selection').trim(), 256),
			selectedText,
			text: selectedText,
			originalSelectedText: truncateMiddleText(String(selection.originalSelectedText || '').trim(), MAX_PDF_SELECTION_TEXT_LENGTH),
			displayLabel: truncateEndText(displayLabel, 256),
			displayTitle: truncateEndText(String(selection.displayTitle || '').trim(), 256),
			attachments,
			rawAttachmentCount: rawAttachments.length,
			acceptedAttachmentCount: attachments.length,
			droppedAttachmentCount: Math.max(0, rawAttachments.length - attachments.length),
			rawAttachmentSizes,
			citationTexts: Array.isArray(selection.citationTexts)
				? selection.citationTexts.map((item) => truncateMiddleText(String(item || '').trim(), MAX_PDF_CITATION_TEXT_LENGTH)).filter(Boolean).slice(0, MAX_PDF_CITATION_TEXTS)
				: [],
			citationNumbers: Array.isArray(selection.citationNumbers)
				? selection.citationNumbers.map((item) => truncateEndText(String(item || '').trim(), 32)).filter(Boolean).slice(0, MAX_PDF_CITATION_MARKERS)
				: [],
			missingCitationNumbers: Array.isArray(selection.missingCitationNumbers)
				? selection.missingCitationNumbers.map((item) => truncateEndText(String(item || '').trim(), 32)).filter(Boolean).slice(0, MAX_PDF_CITATION_MARKERS)
				: [],
			citationCount: Number.isFinite(Number(selection.citationCount)) ? Number(selection.citationCount) : undefined,
			kind: String(selection.kind || '').trim(),
			startLine,
			endLine,
			startColumn: Math.max(1, Number(selection.startColumn) || 1),
			endColumn: Math.max(1, Number(selection.endColumn) || Number(selection.startColumn) || 1),
			projectID: String(selection.projectID || documentContext.projectID || '').trim(),
		};
	}

	function countPdfSelectionWords(text) {
		const value = String(text || '').trim();
		if (!value) return 0;
		const latinWords = value.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || [];
		const cjkChars = value.match(/[\u3400-\u9fff]/g) || [];
		return latinWords.length + cjkChars.length;
	}

	function pdfSelectionLabel(selection, locale = 'en') {
		if (!selection) return '';
		if (selection.kind === 'figure-annotation') {
			return selection.displayLabel || (normalizeLocale(locale) === 'zh-CN' ? '选择图表' : 'Figure selected');
		}
		if (
			selection.displayLabel
			&& ((Array.isArray(selection.attachments) && selection.attachments.length > 0)
				|| selection.kind === 'annotation'
				|| selection.kind === 'figure-annotation')
		) {
			return selection.displayLabel;
		}
		if (selection.selectedText) {
			const wordCount = Number.isFinite(Number(selection.selectedWordCount))
				? Number(selection.selectedWordCount)
				: countPdfSelectionWords(selection.originalSelectedText || selection.selectedText);
			const citationCount = Array.isArray(selection.citationTexts)
				? selection.citationTexts.length
				: Number(selection.citationCount) || 0;
			if (normalizeLocale(locale) === 'zh-CN') {
				return citationCount > 0 ? `已选 ${wordCount} 字，${citationCount} 引文` : `已选 ${wordCount} 字`;
			}
			const wordLabel = wordCount === 1 ? 'word' : 'words';
			const citationLabel = citationCount === 1 ? 'ref' : 'refs';
			return citationCount > 0 ? `${wordCount} ${wordLabel} selected · ${citationCount} ${citationLabel}` : `${wordCount} ${wordLabel} selected`;
		}
		return selection.displayLabel || pathBaseName(selection.filePath || selection.label || 'PDF selection');
	}

	function pdfSelectionIconName(selection) {
		if (!selection) return 'file-text';
		if (Array.isArray(selection.attachments) && selection.attachments.length > 0) return 'image';
		if (selection.kind === 'annotation' || selection.kind === 'figure-annotation') return 'image';
		return 'quote';
	}

	function normalizePdfAttachmentToImage(attachment, index = 0) {
		if (!attachment || typeof attachment !== 'object') return null;
		const size = Number(attachment.size || attachment.file?.size || 0) || 0;
		if (size > MAX_IMAGE_ATTACHMENT_BYTES) return null;
		let dataUrl = '';
		if (typeof attachment.dataUrl === 'string' && attachment.dataUrl.trim()) {
			dataUrl = attachment.dataUrl.trim();
		}
		else if (typeof attachment.dataURL === 'string' && attachment.dataURL.trim()) {
			dataUrl = attachment.dataURL.trim();
		}
		else if (typeof attachment.source?.data === 'string' && attachment.source.data.trim()) {
			const mediaType = String(attachment.mediaType || attachment.mimeType || attachment.source?.media_type || attachment.source?.mediaType || 'image/png').trim();
			dataUrl = `data:${mediaType};base64,${attachment.source.data.trim()}`;
		}
		if (!dataUrl) return null;
		const parts = dataUrl.split(',');
		if (parts.length < 2) return null;
		const header = parts[0] || '';
		const data = parts.slice(1).join(',').trim();
		const mediaType = String(
			attachment.mediaType
			|| attachment.mimeType
			|| attachment.source?.media_type
			|| attachment.source?.mediaType
			|| (header.match(/data:([^;]+)/)?.[1])
			|| 'image/png',
		).trim().toLowerCase();
		if (!mediaType.startsWith('image/') || !data) return null;
		const name = [
			attachment.file_name,
			attachment.fileName,
			attachment.name,
			attachment.label,
			attachment.title,
			attachment.file?.name,
			attachment.source?.file_name,
			attachment.source?.filename,
		].find((item) => typeof item === 'string' && item.trim())?.trim() || `pdf-attachment-${index + 1}.${mediaType.split('/')[1] || 'png'}`;
		return {
			id: `pdf-img-${stableTextHash([
				attachment.id,
				attachment.annotationId,
				attachment.annotationID,
				name,
				mediaType,
				data.length,
				data.slice(0, 96),
				data.slice(-96),
			].filter(Boolean).join('|'))}`,
			name,
			mediaType,
			data,
			size,
			source: 'pdf-selection',
		};
	}

	function normalizePdfSelectionImages(selection) {
		const attachments = Array.isArray(selection?.attachments) ? selection.attachments : [];
		const images = [];
		const seen = new Set();
		attachments.forEach((attachment, index) => {
			const image = normalizePdfAttachmentToImage(attachment, index);
			if (!image) return;
			if (image.source === 'pdf-selection' && selection?.displayLabel) {
				image.displayName = selection.displayLabel;
			}
			const key = `${image.name}|${image.mediaType}|${image.data}`;
			if (seen.has(key)) return;
			seen.add(key);
			images.push(image);
		});
		return images.slice(0, MAX_TURN_IMAGES);
	}

	function extractPdfCitationNumbers(text) {
		const numbers = new Set();
		const source = String(text || '');
		const regex = /\[((?:\d+\s*(?:[-–—]\s*\d+)?)(?:\s*[,，;；]\s*\d+\s*(?:[-–—]\s*\d+)?)*)\]/g;
		for (const match of source.matchAll(regex)) {
			const segment = match[1] || '';
			for (const part of segment.split(/[,，;；]/)) {
				const normalized = part.trim();
				if (!normalized) continue;
				const range = normalized.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
				if (range) {
					const start = Number(range[1]);
					const end = Number(range[2]);
					if (Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start <= 100) {
						for (let value = start; value <= end; value += 1) numbers.add(String(value));
					}
					continue;
				}
				numbers.add(normalized);
			}
			if (numbers.size >= MAX_PDF_CITATION_MARKERS) break;
		}
		return [...numbers].slice(0, MAX_PDF_CITATION_MARKERS);
	}

	function buildPdfSelectionPromptContent(selection) {
		if (!selection) return '';
		const text = truncateMiddleText(String(selection.originalSelectedText || selection.selectedText || '').trim(), MAX_PDF_SELECTION_TEXT_LENGTH);
		const citations = Array.isArray(selection.citationTexts)
			? selection.citationTexts.map((item) => truncateMiddleText(String(item || '').trim(), MAX_PDF_CITATION_TEXT_LENGTH)).filter(Boolean).slice(0, MAX_PDF_CITATION_TEXTS)
			: [];
		const citationNumbers = Array.isArray(selection.citationNumbers) && selection.citationNumbers.length
			? selection.citationNumbers.map((item) => truncateEndText(String(item || '').trim(), 32)).filter(Boolean).slice(0, MAX_PDF_CITATION_MARKERS)
			: extractPdfCitationNumbers(text);
		const missingCitationNumbers = Array.isArray(selection.missingCitationNumbers) && selection.missingCitationNumbers.length
			? selection.missingCitationNumbers.map((item) => truncateEndText(String(item || '').trim(), 32)).filter(Boolean).slice(0, MAX_PDF_CITATION_MARKERS)
			: (citations.length ? [] : citationNumbers);
		const imageNames = normalizePdfSelectionImages(selection).map((image) => image.name).filter(Boolean);
		const lines = [
			'PDF context from current selection:',
			`Source: ${selection.filePath || selection.label || 'current document'}`,
			selection.displayLabel ? `Summary: ${selection.displayLabel}` : '',
			selection.kind ? `Kind: ${selection.kind}` : '',
			text ? '' : '',
			text,
			citations.length ? '' : '',
			citations.length ? `Resolved references:\n${citations.join('\n')}` : '',
			missingCitationNumbers.length ? '' : '',
			missingCitationNumbers.length ? `Citation markers found but full reference text was not resolved: ${missingCitationNumbers.map((number) => `[${number}]`).join(', ')}` : '',
			imageNames.length ? '' : '',
			imageNames.length ? `Attached images:\n${imageNames.join('\n')}` : '',
		].filter(Boolean);
		return lines.join('\n');
	}

	function buildPdfCitationSnippetContent(selection) {
		const citations = Array.isArray(selection?.citationTexts)
			? selection.citationTexts.map((item) => truncateMiddleText(String(item || '').trim(), MAX_PDF_CITATION_TEXT_LENGTH)).filter(Boolean).slice(0, MAX_PDF_CITATION_TEXTS)
			: [];
		if (citations.length === 0) {
			return [
				'当前选区没有解析到参考文献。',
				'请先在左侧 PDF 阅读器中选择带有 [1] / [2] 这类引用编号的句子。',
			].join('\n');
		}
		return [
			`当前选区共解析到 ${citations.length} 条参考文献：`,
			'',
			...citations.map((citation, index) => `[${index + 1}] ${citation}`),
		].join('\n');
	}

	function isPdfInjectableTextNode(node) {
		return node?.type && !['image', 'table'].includes(String(node.type));
	}

	function collectPdfNodeText(node, { explicitMedia = false } = {}) {
		if (!node || typeof node !== 'object') return '';
		const type = String(node.type || '');
		if ((type === 'image' || type === 'table') && !explicitMedia) return '';
		const parts = [];
		if (type === 'image' || type === 'table') {
			if (node.title) parts.push(node.title);
			if (node.text) parts.push(node.text);
			if (node.meta?.caption && node.meta.caption !== node.text) parts.push(node.meta.caption);
			if (node.meta?.footnote) parts.push(node.meta.footnote);
			const imagePaths = Array.isArray(node.meta?.imagePaths) ? node.meta.imagePaths : [node.meta?.imagePath].filter(Boolean);
			if (imagePaths.length > 0) {
				parts.push(`Image paths:\n${imagePaths.join('\n')}`);
			}
			if (node.meta?.html && type === 'table') {
				parts.push(String(node.meta.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
			}
			return parts.filter(Boolean).join('\n').trim();
		}
		if (node.text && isPdfInjectableTextNode(node)) {
			parts.push(node.text);
		}
		for (const child of Array.isArray(node.children) ? node.children : []) {
			const childText = collectPdfNodeText(child, { explicitMedia: false });
			if (childText) parts.push(childText);
		}
		return parts.filter(Boolean).join('\n\n').trim();
	}

	function summarizePdfNodePreview(node) {
		const type = String(node?.type || '');
		const text = collectPdfNodeText(node, { explicitMedia: false });
		const citationNumbers = Array.isArray(node?.citationNumbers) ? node.citationNumbers.filter(Boolean) : [];
		const citationCount = citationNumbers.length;
		const childCount = Array.isArray(node?.children) ? node.children.length : 0;
		const blockIndex = Number.isFinite(node?.meta?.blockIndex)
			? `#${node.meta.blockIndex}`
			: Array.isArray(node?.meta?.blockIndices) && node.meta.blockIndices.length
				? `#${node.meta.blockIndices.join(',')}`
				: '';
		const pageLabel = Number.isFinite(node?.meta?.pageIndex) ? `p${Number(node.meta.pageIndex) + 1}` : '';
		const typeLabel = {
			document: '全文',
			section: '章节',
			text: '段落',
			paragraph: '段落',
			equation: '公式',
			references: '参考文献组',
			reference: '参考文献',
			image: '图',
			table: '表',
		}[type] || type || '节点';
		if (type === 'image' || type === 'table') {
			const imagePaths = Array.isArray(node?.meta?.imagePaths)
				? node.meta.imagePaths.filter(Boolean)
				: [node?.meta?.imagePath].filter(Boolean);
			const imagePath = imagePaths.length === 1 ? pathBaseName(imagePaths[0]) : '';
			const imageCount = imagePaths.length > 1 ? `${imagePaths.length} 张图` : '';
			return [
				typeLabel,
				pageLabel,
				blockIndex,
				imageCount,
				imagePath,
			].filter(Boolean).join(' · ');
		}
		const citationSummary = citationCount
			? `引用 ${citationNumbers.slice(0, 4).join(', ')}${citationCount > 4 ? ` +${citationCount - 4}` : ''}`
			: '';
		const parts = [
			typeLabel,
			pageLabel,
			blockIndex,
			text ? `${text.length} 字` : '',
			citationSummary,
			childCount ? `子项 ${childCount}` : '',
		].filter(Boolean);
		return parts.join(' · ') || typeLabel;
	}

	function shouldShowPdfTreeNode(node) {
		return ['document', 'section', 'text', 'paragraph', 'equation', 'references', 'reference', 'image', 'table'].includes(String(node?.type || ''));
	}

	function pdfNodeKindLabel(nodeType) {
		if (nodeType === 'image') return '图';
		if (nodeType === 'table') return '表';
		if (nodeType === 'text' || nodeType === 'paragraph') return '段落';
		if (nodeType === 'equation') return '公式';
		if (nodeType === 'reference') return '参考文献';
		if (nodeType === 'references') return '参考文献';
		if (nodeType === 'document') return '全文';
		return '章节';
	}

	function extractPdfMediaNumber(node, nodeType, title) {
		const sourceParts = [
			node?.meta?.label,
			title,
			node?.title,
			node?.meta?.caption,
			node?.text,
		].map((value) => String(value || '')).filter(Boolean);
		const pattern = nodeType === 'table'
			? /(?:^|\b|[\s:：])(?:table|表)\s*[-.]?\s*([A-Za-z]*\d[A-Za-z0-9]*(?:[.-]\d+)*|[IVXLCDM]+)(?=[\s.:：,，)]|$)/i
			: /(?:^|\b|[\s:：])(?:fig(?:ure)?\.?|图)\s*[-.]?\s*([A-Za-z]*\d[A-Za-z0-9]*(?:[.-]\d+)*)(?=[\s.:：,，)]|$)/i;
		for (const source of sourceParts) {
			const match = source.match(pattern);
			if (match?.[1]) {
				return match[1].trim();
			}
		}
		const ordinal = Number(node?.meta?.ordinal);
		return Number.isFinite(ordinal) && ordinal > 0 ? String(ordinal) : '';
	}

	function compactPdfTreeText(value, maxLength = 48) {
		const text = String(value || '').replace(/\s+/g, ' ').trim();
		if (!text) return '';
		return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 3))}...` : text;
	}

	function pdfNodeTextLength(node) {
		const ownText = String(node?.text || '').replace(/\s+/g, ' ').trim();
		if (ownText) return ownText.length;
		const text = collectPdfNodeText(node, { explicitMedia: false }).replace(/\s+/g, ' ').trim();
		return text.length;
	}

	function countPdfNodeDescendantsByType(node, types) {
		const wanted = new Set(Array.isArray(types) ? types.map(String) : [String(types || '')]);
		let count = 0;
		const visit = (item) => {
			if (!item || typeof item !== 'object') return;
			if (wanted.has(String(item.type || ''))) count += 1;
			for (const child of Array.isArray(item.children) ? item.children : []) {
				visit(child);
			}
		};
		for (const child of Array.isArray(node?.children) ? node.children : []) {
			visit(child);
		}
		return count;
	}

	function pdfMediaCaptionText(node, title) {
		const caption = [
			node?.meta?.caption,
			node?.text,
			node?.title,
			title,
		].map((value) => String(value || '').replace(/\s+/g, ' ').trim()).find(Boolean) || '';
		return caption
			.replace(/^(?:fig(?:ure)?\.?|table|图|表)\s*[-.]?\s*[A-Za-z0-9]+(?:[.-]\d+)*\s*[.:：\-]?\s*/i, '')
			.trim();
	}

	function pdfTreeDisplayLabel(node, nodeType, title) {
		if (nodeType === 'image' || nodeType === 'table') {
			const number = extractPdfMediaNumber(node, nodeType, title);
			const prefix = number ? `${pdfNodeKindLabel(nodeType)} ${number}` : pdfNodeKindLabel(nodeType);
			const caption = compactPdfTreeText(pdfMediaCaptionText(node, title), 46);
			return caption ? `${prefix} · ${caption}` : prefix;
		}
		if (nodeType === 'section') {
			const count = pdfNodeTextLength(node);
			const imageCount = countPdfNodeDescendantsByType(node, 'image');
			const tableCount = countPdfNodeDescendantsByType(node, 'table');
			const mediaText = [
				imageCount ? `图${imageCount}` : '',
				tableCount ? `表${tableCount}` : '',
			].filter(Boolean).join(' ');
			const label = compactPdfTreeText(title, 58) || pdfNodeKindLabel(nodeType);
			return [label, count ? `${count}字` : '', mediaText].filter(Boolean).join(' · ');
		}
		if (nodeType === 'text' || nodeType === 'paragraph') {
			const count = pdfNodeTextLength(node);
			const label = compactPdfTreeText(title, 58) || pdfNodeKindLabel(nodeType);
			return count ? `${label} · ${count}字` : label;
		}
		return title;
	}

	function pdfTreeDisplayDesc(node, nodeType) {
		if (nodeType === 'image' || nodeType === 'table' || nodeType === 'section' || nodeType === 'text' || nodeType === 'paragraph') {
			return '';
		}
		return summarizePdfNodePreview(node);
	}

	function pdfNodeDisplayKind(nodeType) {
		if (nodeType === 'image') return 'Figure';
		if (nodeType === 'table') return 'Table';
		if (nodeType === 'text' || nodeType === 'paragraph') return 'Text';
		if (nodeType === 'equation') return 'Equation';
		if (nodeType === 'reference' || nodeType === 'references') return 'Reference';
		if (nodeType === 'document') return 'Paper';
		return 'Section';
	}

	function summarizePdfPaperStats(paper, author) {
		const stats = paper?.stats && typeof paper.stats === 'object' ? paper.stats : {};
		const parts = [
			author || '',
			Number.isFinite(stats.sectionCount) && stats.sectionCount > 0 ? `章节 ${stats.sectionCount}` : '',
			Number.isFinite(stats.textCount) && stats.textCount > 0 ? `段落 ${stats.textCount}` : '',
			Number.isFinite(stats.imageCount) && stats.imageCount > 0 ? `图 ${stats.imageCount}` : '',
			Number.isFinite(stats.tableCount) && stats.tableCount > 0 ? `表 ${stats.tableCount}` : '',
			Number.isFinite(stats.referenceCount) && stats.referenceCount > 0 ? `参考文献 ${stats.referenceCount}` : '',
		].filter(Boolean);
		return parts.join(' · ') || '已解析论文';
	}

	function isPdfOutlineNode(node) {
		return ['document', 'section', 'text', 'paragraph', 'equation'].includes(String(node?.type || ''));
	}

	function collectPdfOutlineText(node) {
		if (!node || typeof node !== 'object' || !isPdfOutlineNode(node)) return '';
		const parts = [];
		const ownText = String(node.text || '').trim();
		if (ownText) parts.push(ownText);
		for (const child of Array.isArray(node.children) ? node.children : []) {
			const childText = collectPdfOutlineText(child);
			if (childText) parts.push(childText);
		}
		return parts.join('\n\n').trim();
	}

	function collectPdfNodesByType(node, type, nodes = []) {
		if (!node || typeof node !== 'object') return nodes;
		if (String(node.type || '') === type) nodes.push(node);
		for (const child of Array.isArray(node.children) ? node.children : []) {
			collectPdfNodesByType(child, type, nodes);
		}
		return nodes;
	}

	function parsePdfOutlineOrdinal(title) {
		const normalized = String(title || '')
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
		const prefix = normalized.match(/^([A-Z]|\d+|[IVXLCDM]+)(?=\s*[.)、:：-]|\s+)/iu);
		if (!prefix) return null;
		const raw = prefix[1].toUpperCase();
		if (/^\d+$/u.test(raw)) {
			return { kind: 'number', value: Number(raw) };
		}
		if (/^[A-Z]$/u.test(raw)) {
			return { kind: 'letter', value: raw.charCodeAt(0) - 64 };
		}
		const romanValues = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
		let value = 0;
		let previous = 0;
		for (const character of raw.split('').reverse()) {
			const current = romanValues[character] || 0;
			value += current < previous ? -current : current;
			previous = current;
		}
		return value > 0 ? { kind: 'roman', value } : null;
	}

	function sortPdfOutlineChildren(children) {
		const items = (Array.isArray(children) ? children : []).map((node, index) => ({ node, index }));
		if (items.length < 2) return items.map((item) => item.node);
		const nativeOrderItems = items.map((item) => ({
			...item,
			order: Number(item.node?.meta?.nativeOutlineOrder),
		}));
		if (nativeOrderItems.every((item) => Number.isInteger(item.order))) {
			return nativeOrderItems
				.sort((left, right) => left.order - right.order || left.index - right.index)
				.map((item) => item.node);
		}
		const ordinalItems = items.map((item) => ({
			...item,
			ordinal: parsePdfOutlineOrdinal(item.node?.title),
		}));
		const ordinalKinds = new Set(ordinalItems.map((item) => item.ordinal?.kind).filter(Boolean));
		if (ordinalItems.some((item) => !item.ordinal) || ordinalKinds.size !== 1) {
			return items.map((item) => item.node);
		}
		return ordinalItems
			.sort((left, right) => left.ordinal.value - right.ordinal.value || left.index - right.index)
			.map((item) => item.node);
	}

	function buildPdfOutlineNodeSnippet(node, paper, ancestors = []) {
		if (!node || typeof node !== 'object' || !isPdfOutlineNode(node)) return null;
		const nodeType = String(node.type || '');
		const projectToken = makePdfTokenPart(paper.projectID, 'paper');
		const nodeToken = nodeType === 'document' || node.id === 'root'
			? 'outline-all'
			: makePdfTokenPart(node.id || node.title || nodeType, nodeType);
		const title = normalizePdfLabel(node.title, pdfNodeKindLabel(nodeType));
		const content = collectPdfOutlineText(node);
		const sectionChildren = sortPdfOutlineChildren(
			(Array.isArray(node.children) ? node.children : [])
				.filter((child) => String(child?.type || '') === 'section'),
		);
		const children = sectionChildren
			.map((child) => buildPdfOutlineNodeSnippet(child, paper, [...ancestors, title]))
			.filter(Boolean);
		if (!content && children.length === 0) return null;
		return {
			id: `pdf-${projectToken}-${nodeToken}`,
			token: `paper-${projectToken}-${nodeToken}`,
			displayToken: makePdfDisplayTokenPart(title, pdfNodeDisplayKind(nodeType)),
			name: `!${makePdfDisplayTokenPart(title, pdfNodeDisplayKind(nodeType))}`,
			label: title,
			desc: summarizePdfNodePreview(node),
			treeLabel: pdfTreeDisplayLabel(node, nodeType, title),
			treeDesc: '',
			content,
			type: nodeType,
			depth: ancestors.length,
			children,
			paperTitle: paper.title || '',
			projectID: paper.projectID || '',
		};
	}

	function buildPdfDedicatedNodeSnippet(node, paper) {
		if (!node || typeof node !== 'object' || !shouldShowPdfTreeNode(node)) return null;
		const nodeType = String(node.type || '');
		const projectToken = makePdfTokenPart(paper.projectID, 'paper');
		const nodeToken = makePdfTokenPart(node.id || node.title || nodeType, nodeType);
		const title = normalizePdfLabel(node.title, pdfNodeKindLabel(nodeType));
		const explicitMedia = nodeType === 'image' || nodeType === 'table';
		const content = collectPdfNodeText(node, { explicitMedia });
		if (!content) return null;
		return {
			id: `pdf-${projectToken}-${nodeToken}`,
			token: `paper-${projectToken}-${nodeToken}`,
			displayToken: makePdfDisplayTokenPart(title, pdfNodeDisplayKind(nodeType)),
			name: `!${makePdfDisplayTokenPart(title, pdfNodeDisplayKind(nodeType))}`,
			label: explicitMedia ? `${pdfNodeKindLabel(nodeType)} · ${title}` : title,
			desc: summarizePdfNodePreview(node),
			treeLabel: pdfTreeDisplayLabel(node, nodeType, title),
			treeDesc: '',
			content,
			type: nodeType,
			depth: 0,
			children: [],
			paperTitle: paper.title || '',
			projectID: paper.projectID || '',
		};
	}

	function buildPdfGroupSnippet({ paper, id, token, label, type, children, content = '' }) {
		const projectToken = makePdfTokenPart(paper.projectID, 'paper');
		const items = Array.isArray(children) ? children.filter(Boolean) : [];
		return {
			id: `pdf-${projectToken}-${id}`,
			token: `paper-${projectToken}-${token}`,
			displayToken: makePdfDisplayTokenPart(label, type),
			name: `!${makePdfDisplayTokenPart(label, type)}`,
			label,
			desc: items.length ? `${items.length} 项` : '',
			treeLabel: items.length ? `${label} · ${items.length}` : label,
			treeDesc: '',
			content,
			type,
			depth: 1,
			children: items,
			paperTitle: paper.title || '',
			projectID: paper.projectID || '',
		};
	}

	function buildPdfPaperSnippet(paper) {
		const root = paper?.tree && typeof paper.tree === 'object' ? paper.tree : null;
		if (!root) return null;
		const title = normalizePdfLabel(paper.title || root.title, '未命名论文');
		const author = normalizePdfLabel(paper.author, '');
		const projectToken = makePdfTokenPart(paper.projectID, 'paper');
		const stats = paper?.stats && typeof paper.stats === 'object' ? paper.stats : {};
		const outlineChildren = sortPdfOutlineChildren(
			(Array.isArray(root.children) ? root.children : [])
				.filter((child) => String(child?.type || '') === 'section'),
		)
			.map((child) => buildPdfOutlineNodeSnippet(child, paper, [title]))
			.filter(Boolean);
		const outlineContent = collectPdfOutlineText(root);
		const referenceChildren = collectPdfNodesByType(root, 'reference')
			.map((node) => buildPdfDedicatedNodeSnippet(node, paper))
			.filter(Boolean);
		const imageChildren = collectPdfNodesByType(root, 'image')
			.map((node) => buildPdfDedicatedNodeSnippet(node, paper))
			.filter(Boolean);
		const tableChildren = collectPdfNodesByType(root, 'table')
			.map((node) => buildPdfDedicatedNodeSnippet(node, paper))
			.filter(Boolean);
		const groups = [...outlineChildren];
		if (referenceChildren.length) {
			groups.push(buildPdfGroupSnippet({
				paper,
				id: 'references',
				token: 'references',
				label: '参考文献',
				type: 'references',
				children: referenceChildren,
			}));
		}
		if (imageChildren.length) {
			groups.push(buildPdfGroupSnippet({
				paper,
				id: 'figures',
				token: 'figures',
				label: '图片',
				type: 'figures',
				children: imageChildren,
			}));
		}
		if (tableChildren.length) {
			groups.push(buildPdfGroupSnippet({
				paper,
				id: 'tables',
				token: 'tables',
				label: '表格',
				type: 'tables',
				children: tableChildren,
			}));
		}
		if (!groups.length) return null;
		const label = paper.isActive ? `${title}（当前打开）` : title;
		const paperStats = summarizePdfPaperStats(paper, author);
		return {
			id: `pdf-${projectToken}-paper`,
			token: `paper-${projectToken}-all`,
			displayToken: makePdfDisplayTokenPart(title, 'Paper'),
			name: `!${makePdfDisplayTokenPart(title, 'Paper')}`,
			label,
			desc: paperStats,
			treeLabel: paperStats ? `${label} · ${paperStats}` : label,
			treeDesc: '',
			content: outlineContent,
			type: 'paper',
			depth: 0,
			children: groups,
			paperTitle: title,
			author,
			projectID: paper.projectID || '',
			stats,
		};
	}

	function flattenPdfSnippetEntries(entries) {
		const flat = [];
		for (const entry of entries || []) {
			if (!entry) continue;
			flat.push(entry);
			flat.push(...flattenPdfSnippetEntries(entry.children || []));
		}
		return flat;
	}

	function buildPdfWorkspaceSummary(workspaceTree, settings) {
		const lines = [];
		if (workspaceTree?.workspaceName) lines.push(`工作区：${workspaceTree.workspaceName}`);
		if (workspaceTree?.workspaceRootDir) lines.push(`工作区路径：${workspaceTree.workspaceRootDir}`);
		if (!lines.length && settings?.workspace) lines.push(`工作区路径：${settings.workspace}`);
		const papers = Array.isArray(workspaceTree?.papers) ? workspaceTree.papers : [];
		if (papers.length) {
			lines.push(`已解析论文：${papers.length} 篇`);
			papers.slice(0, 20).forEach((paper, index) => {
				lines.push(`${index + 1}. ${paper.title || paper.projectID || '未命名论文'}`);
			});
		}
		return lines.join('\n').trim() || '当前没有可用的工作区信息。';
	}

	function buildPdfSnippetItems({ selection, workspaceTree, settings }) {
		const papers = Array.isArray(workspaceTree?.papers) ? workspaceTree.papers : [];
		const paperSnippets = papers.map(buildPdfPaperSnippet).filter(Boolean);
		const selectionText = String(selection?.originalSelectedText || selection?.selectedText || '').trim();
		const selectionImageCount = normalizePdfSelectionImages(selection).length;
		const hasSelectionContent = !!(selectionText || selectionImageCount || selection?.displayLabel);
		const selectionContent = selection?.selectedText || selection?.attachments?.length || selection?.displayLabel
			? buildPdfSelectionPromptContent(selection)
			: [
				'当前没有可用的 PDF 选区。',
				'请先在左侧 PDF 阅读器中划词、选中一段文本，或点击图表注释。',
			].join('\n');
		const citationCount = Array.isArray(selection?.citationTexts) ? selection.citationTexts.length : 0;
		const citationMarkers = extractPdfCitationNumbers(selectionText);
		const selectionDesc = [
			selection?.displayLabel || '当前 PDF 选区',
			selectionText ? `${selectionText.length} 字` : '',
			selectionImageCount ? `图片 ${selectionImageCount}` : '',
			citationCount ? `参考文献 ${citationCount}` : citationMarkers.length ? `引用标记 ${citationMarkers.length}` : '',
		].filter(Boolean).join(' · ');
		const workspaceDesc = [
			papers.length ? `论文 ${papers.length}` : '',
			workspaceTree?.workspaceName || pathBaseName(workspaceTree?.workspaceRootDir || settings?.workspace || ''),
		].filter(Boolean).join(' · ') || '当前工作区';
		const builtIns = [];
		if (hasSelectionContent) {
			builtIns.push({
				id: 'pdf-selection',
				token: 'selection',
				name: '!selection',
				label: '!selection',
				desc: selectionDesc,
				content: selectionContent,
				type: 'selection',
				depth: 0,
			});
		}
		if (citationCount > 0 || citationMarkers.length > 0) {
			builtIns.push({
				id: 'pdf-citation',
				token: 'citation',
				name: '!citation',
				label: '!citation',
				desc: citationCount > 0 ? `已解析参考文献 ${citationCount}` : citationMarkers.length ? `找到引用标记 ${citationMarkers.length}，待解析全文` : '当前选区没有引用标记',
				content: buildPdfCitationSnippetContent(selection),
				type: 'citation',
				depth: 0,
			});
		}
		builtIns.push({
			id: 'pdf-workspace',
			token: 'workspace',
			name: '!workspace',
			label: '!workspace',
			desc: workspaceDesc,
			content: buildPdfWorkspaceSummary(workspaceTree, settings),
			type: 'workspace',
			depth: 0,
		});
		return [...paperSnippets, ...builtIns];
	}

	function pdfSnippetMatchesQuery(entry, normalizedQuery) {
		if (!normalizedQuery) return true;
		return [
			entry.token,
			entry.name,
			entry.label,
			entry.desc,
			entry.content,
			entry.paperTitle,
			entry.author,
		].some((value) => normalizePdfSnippetText(value).includes(normalizedQuery));
	}

	function filterPdfSnippetEntries(entries, query) {
		const normalizedQuery = normalizePdfSnippetText(query);
		const flat = flattenPdfSnippetEntries(entries);
		return flat.filter((entry) => pdfSnippetMatchesQuery(entry, normalizedQuery));
	}

	function pdfSnippetSelectionKey(item) {
		return String(item?.id || item?.token || item?.name || item?.label || '').trim().toLowerCase();
	}

	function clonePdfTreeEntry(entry, depth = 0, ancestorKeys = []) {
		if (!entry) return null;
		const key = pdfSnippetSelectionKey(entry) || `pdf-tree-${depth}-${String(entry.label || entry.name || entry.type || '').toLowerCase()}`;
		const children = (Array.isArray(entry.children) ? entry.children : [])
			.map((child) => clonePdfTreeEntry(child, depth + 1, [...ancestorKeys, key]))
			.filter(Boolean);
		return {
			key,
			entry,
			label: entry.treeLabel || entry.label || entry.name || entry.token || 'PDF context',
			desc: Object.prototype.hasOwnProperty.call(entry, 'treeDesc')
				? entry.treeDesc
				: (Object.prototype.hasOwnProperty.call(entry, 'desc') ? entry.desc : (entry.paperTitle || '')),
			type: entry.type || 'snippet',
			depth,
			ancestorKeys,
			children,
		};
	}

	function buildPdfSnippetTree(entries, settings) {
		const source = Array.isArray(entries) ? entries.filter(Boolean) : [];
		void settings;
		const papers = source.filter((entry) => entry.type === 'paper').map((entry) => clonePdfTreeEntry(entry, 0)).filter(Boolean);
		const builtIns = source.filter((entry) => entry.type !== 'paper');
		const currentContextChildren = builtIns
			.filter((entry) => entry.type === 'selection' || entry.type === 'citation')
			.map((entry) => clonePdfTreeEntry(entry, 1))
			.filter(Boolean);
		const children = [];
		if (currentContextChildren.length) {
			children.push({
				key: 'pdf-tree-current-context',
				entry: null,
				label: '当前上下文',
				desc: 'PDF 选区与引用',
				type: 'context-group',
				depth: 0,
				children: currentContextChildren,
			});
		}
		children.push(...papers);
		return children;
	}

	function pdfTreeNodeMatchesQuery(node, normalizedQuery) {
		if (!normalizedQuery) return true;
		if (node?.entry && pdfSnippetMatchesQuery(node.entry, normalizedQuery)) return true;
		return [
			node?.label,
			node?.desc,
			node?.type,
		].some((value) => normalizePdfSnippetText(value).includes(normalizedQuery));
	}

	function filterPdfSnippetTree(nodes, query) {
		const normalizedQuery = normalizePdfSnippetText(query);
		if (!normalizedQuery) return Array.isArray(nodes) ? nodes : [];
		const filterNode = (node) => {
			if (!node) return null;
			const children = (node.children || []).map(filterNode).filter(Boolean);
			if (pdfTreeNodeMatchesQuery(node, normalizedQuery) || children.length) {
				return { ...node, children };
			}
			return null;
		};
		return (Array.isArray(nodes) ? nodes : []).map(filterNode).filter(Boolean);
	}

	const PDF_TREE_TYPE_FILTERS = [
		{ id: 'all', label: '全部', types: null },
		{ id: 'media', label: '图表', types: ['image', 'table'] },
		{ id: 'text', label: '段落', types: ['text', 'paragraph'] },
		{ id: 'equation', label: '公式', types: ['equation'] },
		{ id: 'reference', label: '参考文献', types: ['reference', 'references'] },
	];

	function normalizePdfTreeTypeFilter(value) {
		const normalized = String(value || '').trim();
		return PDF_TREE_TYPE_FILTERS.some((filter) => filter.id === normalized) ? normalized : 'all';
	}

	function pdfTreeTypeFilterMatches(node, filterId) {
		const normalizedFilter = normalizePdfTreeTypeFilter(filterId);
		if (normalizedFilter === 'all') return true;
		const config = PDF_TREE_TYPE_FILTERS.find((filter) => filter.id === normalizedFilter);
		return Array.isArray(config?.types) && config.types.includes(String(node?.type || ''));
	}

	function filterPdfSnippetTreeByType(nodes, filterId) {
		const normalizedFilter = normalizePdfTreeTypeFilter(filterId);
		if (normalizedFilter === 'all') return Array.isArray(nodes) ? nodes : [];
		const filterNode = (node) => {
			if (!node) return null;
			const children = (node.children || []).map(filterNode).filter(Boolean);
			if (pdfTreeTypeFilterMatches(node, normalizedFilter) || children.length) {
				return { ...node, children };
			}
			return null;
		};
		return (Array.isArray(nodes) ? nodes : []).map(filterNode).filter(Boolean);
	}

	function collectPdfTreeSelectableLeaves(node) {
		if (!node) return [];
		const childLeaves = (node.children || []).flatMap(collectPdfTreeSelectableLeaves);
		if (childLeaves.length) return childLeaves;
		return node.entry?.content ? [node.entry] : [];
	}

	function collectPdfTreeSelectionTargets(node) {
		const leaves = collectPdfTreeSelectableLeaves(node);
		const entry = node?.entry?.content ? node.entry : null;
		const hasBranchChildren = Array.isArray(node?.children) && node.children.length > 0;
		const shouldUseSingleChip = entry && (
			node?.type === 'paper'
			|| node?.type === 'document'
			|| node?.type === 'outline'
			|| node?.type === 'section'
			|| (hasBranchChildren && leaves.length >= PDF_TREE_COMPACT_SELECTION_THRESHOLD)
		);
		return shouldUseSingleChip ? [entry] : leaves;
	}

	function collectPdfTreeCoveredSelectionKeys(node) {
		const keys = new Set();
		for (const ancestorKey of Array.isArray(node?.ancestorKeys) ? node.ancestorKeys : []) {
			if (ancestorKey) keys.add(ancestorKey);
		}
		if (node?.entry?.content) {
			const entryKey = pdfSnippetSelectionKey(node.entry);
			if (entryKey) keys.add(entryKey);
		}
		for (const leaf of collectPdfTreeSelectableLeaves(node)) {
			const key = pdfSnippetSelectionKey(leaf);
			if (key) keys.add(key);
		}
		return [...keys];
	}

	function countPdfTreeFilterLeaves(nodes, filterId) {
		const normalizedFilter = normalizePdfTreeTypeFilter(filterId);
		const leaves = (Array.isArray(nodes) ? nodes : []).flatMap(collectPdfTreeSelectableLeaves);
		if (normalizedFilter === 'all') return leaves.length;
		return leaves.filter((entry) => pdfTreeTypeFilterMatches(entry, normalizedFilter)).length;
	}

	function collectPdfTreeVisibleNodes(nodes, expandedIds, depth = 0) {
		const result = [];
		for (const node of Array.isArray(nodes) ? nodes : []) {
			if (!node) continue;
			const nextNode = { ...node, depth };
			result.push(nextNode);
			const expanded = expandedIds?.has?.(node.key);
			if (expanded && node.children?.length) {
				result.push(...collectPdfTreeVisibleNodes(node.children, expandedIds, depth + 1));
			}
		}
		return result;
	}

	function pdfTreeSelectionState(node, selectedKeys) {
		const leaves = collectPdfTreeSelectableLeaves(node);
		if (!leaves.length) return { checked: false, indeterminate: false, selectableCount: 0 };
		const ancestorSelected = (Array.isArray(node?.ancestorKeys) ? node.ancestorKeys : [])
			.some((key) => key && selectedKeys?.has?.(key));
		if (ancestorSelected) {
			return {
				checked: true,
				indeterminate: false,
				selectableCount: leaves.length,
			};
		}
		const entryKey = node?.entry?.content ? pdfSnippetSelectionKey(node.entry) : '';
		if (entryKey && selectedKeys?.has?.(entryKey)) {
			return {
				checked: true,
				indeterminate: false,
				selectableCount: leaves.length,
			};
		}
		const selectedCount = leaves.filter((entry) => selectedKeys?.has?.(pdfSnippetSelectionKey(entry))).length;
		return {
			checked: selectedCount === leaves.length,
			indeterminate: selectedCount > 0 && selectedCount < leaves.length,
			selectableCount: leaves.length,
		};
	}

	function collectDefaultPdfTreeExpandedIds(nodes) {
		const ids = new Set(['pdf-tree-current-context']);
		let expandedPaper = false;
		const visit = (node) => {
			if (!node) return;
			if (node.type === 'paper' && /当前打开/.test(String(node.label || ''))) {
				ids.add(node.key);
				expandedPaper = true;
			}
			for (const child of node.children || []) visit(child);
		};
		for (const node of Array.isArray(nodes) ? nodes : []) visit(node);
		if (!expandedPaper) {
			let firstPaper = null;
			const findFirstPaper = (node) => {
				if (!node || firstPaper) return;
				if (node.type === 'paper') {
					firstPaper = node;
					return;
				}
				for (const child of node.children || []) findFirstPaper(child);
			};
			for (const node of Array.isArray(nodes) ? nodes : []) findFirstPaper(node);
			if (firstPaper) {
				ids.add(firstPaper.key);
			}
		}
		return ids;
	}

	function collectPdfTreeBranchIds(nodes) {
		const ids = new Set();
		const visit = (node) => {
			if (!node) return;
			if (Array.isArray(node.children) && node.children.length > 0 && node.key) {
				ids.add(node.key);
				for (const child of node.children) visit(child);
			}
		};
		for (const node of Array.isArray(nodes) ? nodes : []) visit(node);
		return ids;
	}

	function mergePdfTreeExpandedIds(baseExpandedIds, forcedExpandedIds) {
		const next = new Set(baseExpandedIds || []);
		for (const id of forcedExpandedIds || []) {
			if (id) next.add(id);
		}
		return next;
	}

	function getPdfSnippetTrigger(value, cursorIndex) {
		const text = String(value || '');
		const cursor = Math.max(0, Math.min(text.length, Number.isFinite(cursorIndex) ? cursorIndex : text.length));
		const beforeCursor = text.slice(0, cursor);
		const match = beforeCursor.match(/(^|\s)!([^\s]*)$/);
		if (!match) return null;
		return {
			query: match[2] || '',
			start: cursor - (match[2] || '').length - 1,
			end: cursor,
		};
	}

	function buildPdfSnippetPromptContent(snippets) {
		const items = Array.isArray(snippets) ? snippets.filter((item) => item?.content) : [];
		if (!items.length) return '';
		const blocks = items.map((item, index) => [
			`[${index + 1}] ${item.paperTitle ? `${item.paperTitle} / ` : ''}${item.label || item.name || item.token || 'PDF context'}`,
			item.content,
		].filter(Boolean).join('\n'));
		return ['PDF workspace context:', ...blocks].join('\n\n');
	}

	function clipPdfContextLabel(value, maxLength = 52) {
		const text = String(value || '').replace(/\s+/g, ' ').trim();
		if (!text) return '';
		return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 3))}...` : text;
	}

	function pdfSnippetTypeSummaryLabel(type) {
		const normalized = String(type || '').trim();
		if (normalized === 'outline') return '大纲';
		if (normalized === 'image') return '图';
		if (normalized === 'table') return '表';
		if (normalized === 'text' || normalized === 'paragraph') return '段落';
		if (normalized === 'equation') return '公式';
		if (normalized === 'reference' || normalized === 'references') return '参考文献';
		if (normalized === 'paper' || normalized === 'document') return '全文';
		if (normalized === 'selection') return '选区';
		if (normalized === 'citation') return '引用';
		return '片段';
	}

	function summarizePdfSnippetSelection(snippets) {
		const items = (Array.isArray(snippets) ? snippets : []).filter(Boolean);
		const counts = new Map();
		const paperTitles = new Set();
		for (const item of items) {
			const typeLabel = pdfSnippetTypeSummaryLabel(item.type);
			counts.set(typeLabel, (counts.get(typeLabel) || 0) + 1);
			const title = String(item.paperTitle || (item.type === 'paper' ? item.label : '') || '').replace(/\s+/g, ' ').trim();
			if (title) paperTitles.add(title);
		}
		const countText = [...counts.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([label, count]) => `${label}${count}`)
			.join(' · ');
		const paperText = paperTitles.size
			? `${paperTitles.size} 篇论文`
			: '';
		const label = items.length === 1
			? clipPdfContextLabel(items[0].label || items[0].name || items[0].token || 'PDF 上下文', 64)
			: `PDF 上下文 ${items.length} 项`;
		const detail = [paperText, countText].filter(Boolean).join(' · ');
		const preview = items
			.slice(0, 12)
			.map((item, index) => `${index + 1}. ${item.paperTitle ? `${item.paperTitle} / ` : ''}${item.label || item.name || item.token || 'PDF context'}`)
			.join('\n');
		const more = items.length > 12 ? `\n...另有 ${items.length - 12} 项` : '';
		return {
			label,
			detail,
			title: [label, detail, preview ? `${preview}${more}` : ''].filter(Boolean).join('\n'),
		};
	}

	function pdfContextChipKey(chip) {
		return [
			chip?.type || '',
			chip?.label || '',
			chip?.detail || '',
		].join('|').toLowerCase();
	}

	function buildPdfMessageContextChips(selection, snippets) {
		const chips = [];
		const addChip = (chip) => {
			if (!chip?.label) return;
			const normalized = {
				type: String(chip.type || 'pdf').trim() || 'pdf',
				label: clipPdfContextLabel(chip.label),
				detail: clipPdfContextLabel(chip.detail || '', 72),
			};
			const key = pdfContextChipKey(normalized);
			if (chips.some((entry) => pdfContextChipKey(entry) === key)) return;
			chips.push(normalized);
		};
		if (selection) {
			const isMedia = Array.isArray(selection.attachments) && selection.attachments.length > 0
				|| selection.kind === 'annotation'
				|| selection.kind === 'figure-annotation';
			addChip({
				type: isMedia ? 'image' : 'selection',
				label: selection.displayLabel || pdfSelectionLabel(selection, 'zh-CN') || 'PDF 选区',
				detail: selection.filePath || selection.label || '',
			});
			const citationNumbers = Array.isArray(selection.citationNumbers) && selection.citationNumbers.length
				? selection.citationNumbers
				: extractPdfCitationNumbers(selection.originalSelectedText || selection.selectedText || '');
			const citationCount = Array.isArray(selection.citationTexts) && selection.citationTexts.length
				? selection.citationTexts.length
				: citationNumbers.length;
			if (citationCount > 0) {
				const markerPreview = citationNumbers.slice(0, 6).map((number) => `[${number}]`).join(', ');
				addChip({
					type: 'citation',
					label: `参考文献 ${citationCount}`,
					detail: markerPreview,
				});
			}
		}
		const snippetItems = (Array.isArray(snippets) ? snippets : []).filter(Boolean);
		if (snippetItems.length > MAX_COMPOSER_VISIBLE_PDF_SNIPPET_CHIPS) {
			const summary = summarizePdfSnippetSelection(snippetItems);
			addChip({
				type: 'snippet',
				label: summary.label,
				detail: summary.detail,
			});
		}
		else {
			for (const snippet of snippetItems) {
				addChip({
					type: snippet.type === 'image' || snippet.type === 'table' ? snippet.type : 'snippet',
					label: snippet.label || snippet.name || snippet.token || 'PDF context',
					detail: snippet.paperTitle || snippet.desc || '',
				});
			}
		}
		return chips;
	}

	function normalizeMessageContextChip(chip) {
		if (!chip || typeof chip !== 'object') return null;
		const type = String(chip.type || chip.kind || 'pdf').trim() || 'pdf';
		const label = clipPdfContextLabel(chip.label || chip.name || chip.title || '');
		if (!label) return null;
		const path = String(chip.path || chip.relativePath || '').trim();
		return {
			id: String(chip.id || '').trim(),
			type,
			kind: String(chip.kind || chip.type || '').trim(),
			label,
			detail: clipPdfContextLabel(chip.detail || chip.path || chip.desc || '', 72),
			path: path.length > MAX_MESSAGE_CONTEXT_PATH_LENGTH ? `${path.slice(0, MAX_MESSAGE_CONTEXT_PATH_LENGTH - 3)}...` : path,
		};
	}

	function normalizeMessageContextChips(chips) {
		const result = [];
		const seen = new Set();
		for (const chip of Array.isArray(chips) ? chips : []) {
			const normalized = normalizeMessageContextChip(chip);
			if (!normalized) continue;
			const key = pdfContextChipKey(normalized);
			if (seen.has(key)) continue;
			seen.add(key);
			result.push(normalized);
			if (result.length >= MAX_MESSAGE_CONTEXT_CHIPS) break;
		}
		return result;
	}

	function buildGraphMessageContextChips(selection) {
		const normalized = normalizeGraphSelectionContext(selection);
		if (!normalized?.node) return [];
		return normalizeMessageContextChips([{
			id: `graph-node-${normalized.node.id || normalized.node.label}`,
			type: 'graph-node',
			kind: normalized.node.type || 'node',
			label: graphSelectionTitle(normalized) || '图谱节点',
			detail: graphSelectionDetail(normalized),
			path: normalized.node.relativePath || '',
		}]);
	}

	function mergeMessageContextChips(...groups) {
		return normalizeMessageContextChips(groups.flatMap((group) => Array.isArray(group) ? group : []));
	}

	function mergePromptWithPdfContext(text, parts) {
		const base = String(text || '').trim();
		const context = (parts || []).map((part) => String(part || '').trim()).filter(Boolean).join('\n\n');
		if (!context) return base;
		return [base, context].filter(Boolean).join('\n\n');
	}

	function mergePromptWithGraphContext(text, graphContext, parts) {
		const base = String(text || '').trim();
		const graph = String(graphContext || '').trim();
		if (!graph) return mergePromptWithPdfContext(base, parts);
		const extraContext = (parts || []).map((part) => String(part || '').trim()).filter(Boolean).join('\n\n');
		return [
			graph,
			base ? `用户问题：\n${base}` : '',
			extraContext,
		].filter(Boolean).join('\n\n');
	}

	function mergeTurnImages(baseImages, extraImages) {
		const result = [];
		const seen = new Set();
		for (const image of [...(Array.isArray(baseImages) ? baseImages : []), ...(Array.isArray(extraImages) ? extraImages : [])]) {
			if (!image) continue;
			if ((Number(image.size || 0) || 0) > MAX_IMAGE_ATTACHMENT_BYTES) continue;
			const key = `${image.name || ''}|${image.mediaType || ''}|${image.data || ''}`;
			if (seen.has(key)) continue;
			seen.add(key);
			result.push(image);
			if (result.length >= MAX_TURN_IMAGES) break;
		}
		return result;
	}

	function normalizeExternalContextPath(value) {
		let text = String(value || '').trim();
		if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
			text = text.slice(1, -1).trim();
		}
		const normalized = text.replace(/[\\/]+$/g, '');
		if (/^[a-z]:[\\/]/i.test(normalized)) {
			return `${normalized[0].toUpperCase()}${normalized.slice(1)}`;
		}
		return normalized;
	}

	function isAbsoluteExternalContextPath(value) {
		const normalized = normalizeExternalContextPath(value);
		return /^[A-Za-z]:[\\/]/.test(normalized) || normalized.startsWith('/') || normalized.startsWith('\\\\') || normalized.startsWith('//');
	}

	function externalPathCompareKey(value) {
		return normalizePathText(normalizeExternalContextPath(value)).toLowerCase();
	}

	function findExternalContextConflict(pathText, paths) {
		const next = externalPathCompareKey(pathText);
		for (const item of paths || []) {
			const existing = externalPathCompareKey(item.path || item);
			if (!existing) continue;
			if (existing === next) return { type: 'duplicate', path: item.path || item };
			if (next.startsWith(`${existing}/`)) return { type: 'parent', path: item.path || item };
			if (existing.startsWith(`${next}/`)) return { type: 'child', path: item.path || item };
		}
		return null;
	}

	function formatExternalContextConflict(pathText, conflict) {
		if (!conflict) return '';
		if (conflict.type === 'duplicate') return 'This folder is already added as an external context.';
		const currentName = pathBaseName(pathText);
		const existingName = pathBaseName(conflict.path);
		if (conflict.type === 'parent') {
			return `Cannot add "${currentName}" - it's inside existing path "${existingName}"`;
		}
		return `Cannot add "${currentName}" - it contains existing path "${existingName}"`;
	}

	function normalizeEditorSelectionContext(value) {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
		const selectedText = String(value.selectedText || value.text || '').trim();
		const rawCursor = value.cursorContext && typeof value.cursorContext === 'object' ? value.cursorContext : null;
		const cursorContext = rawCursor ? {
			beforeCursor: String(rawCursor.beforeCursor || ''),
			afterCursor: String(rawCursor.afterCursor || ''),
			isInbetween: rawCursor.isInbetween === true,
			line: Number.isFinite(Number(rawCursor.line)) ? Number(rawCursor.line) : 0,
			column: Number.isFinite(Number(rawCursor.column)) ? Number(rawCursor.column) : 0,
		} : null;
		const mode = value.mode === 'cursor' && cursorContext ? 'cursor' : selectedText ? 'selection' : 'none';
		if (mode === 'none') return null;
		return {
			notePath: String(value.notePath || value.path || 'unknown').trim() || 'unknown',
			mode,
			selectedText,
			cursorContext,
			lineCount: Number.isFinite(Number(value.lineCount)) ? Number(value.lineCount) : selectedText.split(/\r?\n/).length,
			startLine: Number.isFinite(Number(value.startLine)) ? Number(value.startLine) : 0,
		};
	}

	function normalizeBrowserSelectionContext(value) {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
		const selectedText = String(value.selectedText || value.text || '').trim();
		if (!selectedText) return null;
		const url = String(value.url || '').trim();
		return {
			source: String(value.source || (url ? `browser:${url}` : 'browser:unknown')).trim() || 'browser:unknown',
			selectedText,
			title: String(value.title || '').trim(),
			url,
		};
	}

	function normalizeCanvasSelectionContext(value) {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
		const canvasPath = String(value.canvasPath || value.path || '').trim();
		const nodeIds = (Array.isArray(value.nodeIds) ? value.nodeIds : [])
			.map((id) => String(id || '').trim())
			.filter(Boolean);
		return canvasPath && nodeIds.length ? { canvasPath, nodeIds } : null;
	}

	function normalizeGraphContextNode(value) {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
		const id = String(value.id || '').trim();
		const label = String(value.label || value.title || value.name || id).trim();
		const title = String(value.title || value.label || value.name || id).trim();
		const relativePath = String(value.relativePath || value.path || '').trim();
		if (!id && !label && !relativePath) return null;
		return {
			id,
			label: label || title || relativePath,
			title: title || label || relativePath,
			type: String(value.type || value.kind || 'node').trim() || 'node',
			relativePath,
			status: String(value.status || '').trim(),
			degree: Number(value.degree) || 0,
			lineCount: Number(value.lineCount) || 0,
			tags: (Array.isArray(value.tags) ? value.tags : [])
				.map((tag) => String(tag || '').trim())
				.filter(Boolean)
				.slice(0, 12),
		};
	}

	function normalizeGraphNodeList(value) {
		const seen = new Set();
		const result = [];
		for (const item of Array.isArray(value) ? value : []) {
			const node = normalizeGraphContextNode(item);
			if (!node) continue;
			const key = String(node.id || node.relativePath || node.label || '').toLowerCase();
			if (!key || seen.has(key)) continue;
			seen.add(key);
			result.push(node);
		}
		return result;
	}

	function normalizeGraphSelectionContext(value) {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
		const node = normalizeGraphContextNode(value.node || value.concept || value.selectedNode || value);
		if (!node) return null;
		const relatedNodes = normalizeGraphNodeList(value.relatedNodes);
		const sourceNodes = normalizeGraphNodeList(value.sourceNodes);
		const prompt = String(value.prompt || value.contextText || value.text || '').trim();
		return {
			source: String(value.source || 'notebookmr-graph-node').trim() || 'notebookmr-graph-node',
			workspaceId: String(value.workspaceId || '').trim(),
			workspaceName: String(value.workspaceName || '').trim(),
			workspaceRootDir: String(value.workspaceRootDir || value.workspace || '').trim(),
			vaultDir: String(value.vaultDir || '').trim(),
			outDir: String(value.outDir || '').trim(),
			skill: String(value.skill || 'wiki-query').trim() || 'wiki-query',
			node,
			relatedNodes,
			sourceNodes,
			prompt,
		};
	}

	function graphSelectionTitle(selection) {
		const node = selection?.node;
		return String(node?.label || node?.title || node?.id || '').trim();
	}

	function graphSelectionDetail(selection) {
		if (!selection?.node) return '';
		const relatedCount = Array.isArray(selection.relatedNodes) ? selection.relatedNodes.length : 0;
		const sourceCount = Array.isArray(selection.sourceNodes) ? selection.sourceNodes.length : 0;
		const parts = [
			selection.node.type || 'node',
			relatedCount ? `关联 ${relatedCount}` : '',
			sourceCount ? `来源 ${sourceCount}` : '',
		].filter(Boolean);
		return parts.join(' · ');
	}

	function stripTrailingGraphQuestionMarker(value) {
		return String(value || '').trim().replace(/\n*\s*(?:我的问题|User question)\s*[：:]\s*$/i, '').trim();
	}

	function buildGraphSelectionPromptContent(context) {
		const selection = normalizeTurnContext(context).graphSelection;
		if (!selection?.node) return '';
		const prompt = stripTrailingGraphQuestionMarker(selection.prompt);
		if (prompt) return prompt;
		const formatNode = (node, index) => {
			const meta = [
				node.type ? `type=${node.type}` : '',
				node.relativePath ? `path=${node.relativePath}` : '',
				node.tags?.length ? `tags=${node.tags.join(', ')}` : '',
			].filter(Boolean).join('; ');
			return `${index + 1}. ${node.label || node.title || node.id}${meta ? ` (${meta})` : ''}`;
		};
		const relatedLines = selection.relatedNodes.length
			? selection.relatedNodes.slice(0, 40).map(formatNode).join('\n')
			: '- No directly linked nodes were provided by the graph.';
		const sourceLines = selection.sourceNodes.length
			? selection.sourceNodes.slice(0, 24).map(formatNode).join('\n')
			: '- No directly linked source nodes were provided by the graph.';
		return [
			'请使用 `wiki-query` skill 回答这次知识图谱节点问题。',
			'- 如果当前 provider 是 Codex，请触发/参考 `$wiki-query` skill。',
			'- 如果当前 provider 是 Claude，请使用 `wiki-query` skill。',
			'- 不要使用 `notebookmr-rag` 或旧 profile graph/RAG 流程。',
			'',
			`Workspace: ${selection.workspaceName || selection.workspaceId || 'workspace'}`,
			selection.workspaceRootDir ? `Workspace root: ${selection.workspaceRootDir}` : '',
			selection.vaultDir ? `Vault: ${selection.vaultDir}` : '',
			selection.outDir ? `Graph output: ${selection.outDir}` : '',
			'',
			'Selected graph node:',
			formatNode(selection.node, 0),
			'',
			'Directly linked nodes:',
			relatedLines,
			'',
			'Directly linked sources:',
			sourceLines,
		].filter(Boolean).join('\n');
	}

	function removeGraphSelectionFromContext(context) {
		const normalized = normalizeTurnContext(context);
		return {
			currentNotePath: normalized.currentNotePath,
			editorSelection: normalized.editorSelection,
			browserSelection: normalized.browserSelection,
			canvasSelection: normalized.canvasSelection,
		};
	}

	function isNotebookGraphPromptText(value) {
		const text = String(value || '').trim();
		return /wiki-query/i.test(text) && /Selected (?:graph node|concept):/i.test(text);
	}

	function normalizeTurnContext(value) {
		const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
		return {
			currentNotePath: String(source.currentNotePath || source.linkedNotePath || '').trim(),
			editorSelection: normalizeEditorSelectionContext(source.editorSelection),
			browserSelection: normalizeBrowserSelectionContext(source.browserSelection),
			canvasSelection: normalizeCanvasSelectionContext(source.canvasSelection),
			graphSelection: normalizeGraphSelectionContext(source.graphSelection || (
				String(source.source || '').startsWith('notebookmr-graph') || source.node || source.concept
					? source
					: null
			)),
		};
	}

	function normalizePdfAiShellContext(payload) {
		const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
		const documentContext = source.document && typeof source.document === 'object' && !Array.isArray(source.document)
			? source.document
			: {};
		const selection = normalizePdfSelection(source.selection, documentContext);
		if (!selection) return normalizeTurnContext(null);

		const selectedText = String(selection.selectedText || selection.text || '').trim();
		if (!selectedText) return normalizeTurnContext(null);
		const notePath = String(selection.filePath || documentContext.filePath || selection.label || documentContext.title || 'PDF selection').trim();
		const startLine = Number.isFinite(Number(selection.startLine)) ? Math.max(1, Number(selection.startLine)) : 1;
		const endLine = Number.isFinite(Number(selection.endLine)) ? Math.max(startLine, Number(selection.endLine)) : startLine;
		const lineCount = Number.isFinite(Number(selection.lineCount))
			? Math.max(1, Number(selection.lineCount))
			: Math.max(1, endLine - startLine + 1, selectedText.split(/\r?\n/).length);

		return normalizeTurnContext({
			editorSelection: {
				notePath,
				mode: 'selection',
				selectedText,
				lineCount,
				startLine,
			},
		});
	}

	function normalizePdfAiShellPayload(payload) {
		const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
		const documentContext = source.document && typeof source.document === 'object' && !Array.isArray(source.document)
			? {
				...source.document,
				id: String(source.document.id || ''),
				projectID: String(source.document.projectID || ''),
				title: String(source.document.title || ''),
				filePath: String(source.document.filePath || ''),
			}
			: {};
		return {
			source: String(source.source || 'pdf-ai-shell'),
			includeAttachmentContext: source.includeAttachmentContext === true,
			activeTabId: String(source.activeTabId || ''),
			contextTabId: String(source.contextTabId || ''),
			workspaceId: String(source.workspaceId || source.workspace?.id || ''),
			workspaceName: String(source.workspaceName || source.workspace?.name || ''),
			workspaceRootDir: String(source.workspaceRootDir || source.workspacePath || source.workspace?.rootDir || source.workspace?.path || ''),
			document: documentContext,
			selection: normalizePdfSelection(source.selection, documentContext),
			timestamp: source.timestamp || new Date().toISOString(),
		};
	}

	function hasTurnContext(context) {
		return !!(
			context?.currentNotePath
			|| context?.editorSelection
			|| context?.browserSelection
			|| context?.canvasSelection
			|| context?.graphSelection
		);
	}

	function turnContextPayload(context) {
		const normalized = normalizeTurnContext(context);
		const payload = {
			currentNotePath: normalized.currentNotePath,
			editorSelection: normalized.editorSelection,
			browserSelection: normalized.browserSelection,
			canvasSelection: normalized.canvasSelection,
		};
		return hasTurnContext(payload) ? payload : {};
	}

	function editorSelectionLabel(selection) {
		if (!selection) return '';
		if (selection.mode === 'cursor') return 'Cursor context';
		const lineCount = Number(selection.lineCount) || 1;
		return `${lineCount} ${lineCount === 1 ? 'line' : 'lines'} selected`;
	}

	function browserSelectionLabel(selection) {
		if (!selection) return '';
		const lineCount = String(selection.selectedText || '').split(/\r?\n/).length || 1;
		return `${lineCount} ${lineCount === 1 ? 'line' : 'lines'} selected`;
	}

	function canvasSelectionLabel(selection) {
		const nodeIds = Array.isArray(selection?.nodeIds) ? selection.nodeIds : [];
		if (nodeIds.length === 0) return '';
		return nodeIds.length === 1 ? `node "${nodeIds[0]}" selected` : `${nodeIds.length} nodes selected`;
	}

	function getMentionTrigger(value, cursorIndex) {
		const text = String(value || '');
		const cursor = Math.max(0, Math.min(text.length, Number.isFinite(cursorIndex) ? cursorIndex : text.length));
		const beforeCursor = text.slice(0, cursor);
		const match = beforeCursor.match(/(^|\s)@([^\s]*)$/);
		if (!match) return null;
		const query = match[2] || '';
		return {
			query,
			start: cursor - query.length - 1,
			end: cursor,
		};
	}

	function getSkillTrigger(value, cursorIndex) {
		const text = String(value || '');
		const cursor = Math.max(0, Math.min(text.length, Number.isFinite(cursorIndex) ? cursorIndex : text.length));
		const beforeCursor = text.slice(0, cursor);
		const match = beforeCursor.match(/(^|\s)\$([^\s]*)$/);
		if (!match) return null;
		const query = match[2] || '';
		return {
			query,
			start: cursor - query.length - 1,
			end: cursor,
		};
	}

	function getSlashTrigger(value, cursorIndex) {
		const text = String(value || '');
		const cursor = Math.max(0, Math.min(text.length, Number.isFinite(cursorIndex) ? cursorIndex : text.length));
		const beforeCursor = text.slice(0, cursor);
		for (let index = cursor - 1; index >= 0; index -= 1) {
			const character = beforeCursor.charAt(index);
			if (/\s/.test(character)) break;
			if (character === '/') {
				if (index === 0 || /\s/.test(beforeCursor.charAt(index - 1))) {
					return {
						query: beforeCursor.slice(index + 1),
						start: index,
						end: cursor,
						atStart: index === 0,
					};
				}
				break;
			}
		}
		return null;
	}

	function extractSkillNames(text) {
		const names = [];
		const seen = new Set();
		for (const match of String(text || '').matchAll(/(^|\s)\$([A-Za-z0-9_-]+)/g)) {
			const name = match[2];
			const lower = String(name || '').toLowerCase();
			if (!name || seen.has(lower)) continue;
			seen.add(lower);
			names.push(name);
		}
		return names;
	}

	function textMatchesMention(item, searchLower) {
		if (!searchLower) return true;
		return [
			item.name,
			item.path,
			item.id,
			item.description,
			item.absolutePath,
			item.folderName,
		].some((value) => String(value || '').toLowerCase().includes(searchLower));
	}

	function buildContextFolders(externalPaths) {
		const seen = new Set();
		return (externalPaths || []).map((entry) => {
			const contextRoot = typeof entry === 'string' ? entry : entry?.path;
			if (!contextRoot) return null;
			const name = pathBaseName(contextRoot);
			const key = name.toLowerCase();
			if (seen.has(key)) return null;
			seen.add(key);
			return { type: 'context-folder', name, contextRoot, folderName: name };
		}).filter(Boolean);
	}

	function buildMentionItems(query, externalPaths, mcpServers, settings, providerId) {
		const searchText = String(query || '');
		const searchLower = searchText.toLowerCase();
		const items = [];
		const agentMentions = getConfiguredAgentMentions(settings, providerId);
		const vaultMentionItems = VAULT_MENTION_ITEMS.filter((item) => !isExcludedByTags(item, settings));
		const contextMentionFiles = STATIC_CONTEXT_FILES.filter((item) => !isExcludedByTags(item, settings));

		if (searchLower.startsWith('agents/')) {
			const agentSearch = searchLower.slice('agents/'.length);
			return agentMentions.filter((item) => textMatchesMention(item, agentSearch));
		}

		const contextFolders = buildContextFolders(externalPaths);
		const matchingContext = searchText.includes('/')
			? contextFolders
				.filter((item) => searchLower.startsWith(`${item.name.toLowerCase()}/`))
				.sort((a, b) => b.name.length - a.name.length)[0]
			: null;

		if (matchingContext) {
			const fileSearch = searchLower.slice(matchingContext.name.length + 1);
			const contextFiles = contextMentionFiles
				.filter((item) => item.contextRoot === matchingContext.contextRoot)
				.filter((item) => textMatchesMention(item, fileSearch))
				.sort((a, b) => {
					const aStarts = a.name.toLowerCase().startsWith(fileSearch);
					const bStarts = b.name.toLowerCase().startsWith(fileSearch);
					if (aStarts !== bStarts) return aStarts ? -1 : 1;
					return a.name.localeCompare(b.name);
				});
			return [...contextFiles, ...vaultMentionItems.filter((item) => textMatchesMention(item, searchLower))];
		}

		if (supportsMcpToolsForProvider(providerId)) {
			for (const server of mcpServers || []) {
				if (server.contextSaving && textMatchesMention({ type: 'mcp-server', name: server.name }, searchLower)) {
					items.push({ type: 'mcp-server', name: server.name });
				}
			}
		}

		if ('agents'.includes(searchLower)) {
			items.push({ type: 'agent-folder', name: 'Agents' });
		}

		for (const folder of contextFolders) {
			if (textMatchesMention(folder, searchLower)) {
				items.push(folder);
			}
		}

		return [
			...items,
			...vaultMentionItems.filter((item) => textMatchesMention(item, searchLower)),
		];
	}

	function mentionReplacement(item) {
		if (item.type === 'mcp-server') return `@${item.name} `;
		if (item.type === 'agent-folder') return '@Agents/';
		if (item.type === 'agent') return `@${item.id} (agent) `;
		if (item.type === 'context-folder') return `@${item.name}/`;
		if (item.type === 'context-file') return `@${item.folderName}/${item.name} `;
		if (item.type === 'folder') return `@${item.path}/ `;
		return `@${item.path || item.name} `;
	}

	function inlineMentionContextPath(item) {
		if (item?.type === 'context-file') return item.absolutePath || item.name || '';
		if (item?.type === 'file') return item.path || item.name || '';
		return '';
	}

	function resolveInlineContextFilesFromText(text, externalPaths, settings) {
		const sourceText = String(text || '');
		if (!sourceText.includes('@')) return [];
		const tokens = [...sourceText.matchAll(/(^|\s)@([^\s]+)/g)]
			.map((match) => normalizePathText(match[2] || '').replace(/\/+$/g, ''))
			.filter(Boolean);
		if (!tokens.length) return [];
		const tokenSet = new Set(tokens.map((token) => token.toLowerCase()));
		const contextFolders = buildContextFolders(externalPaths);
		const candidates = [
			...VAULT_MENTION_ITEMS.filter((item) => !isExcludedByTags(item, settings)),
			...STATIC_CONTEXT_FILES.filter((item) => !isExcludedByTags(item, settings)),
		];
		const resolved = [];
		const seen = new Set();
		for (const item of candidates) {
			const contextPath = inlineMentionContextPath(item);
			if (!contextPath) continue;
			const mentionText = normalizePathText(mentionReplacement(item).trim().replace(/^@/, '')).replace(/\/+$/g, '');
			const keys = [
				mentionText,
				normalizePathText(item.path || '').replace(/\/+$/g, ''),
				normalizePathText(item.name || '').replace(/\/+$/g, ''),
			].filter(Boolean).map((key) => key.toLowerCase());
			if (!keys.some((key) => tokenSet.has(key))) continue;
			const dedupeKey = String(contextPath).toLowerCase();
			if (seen.has(dedupeKey)) continue;
			seen.add(dedupeKey);
			resolved.push(contextPath);
		}
		for (const folder of contextFolders) {
			const folderKey = folder.name.toLowerCase();
			for (const token of tokens) {
				if (!token.toLowerCase().startsWith(`${folderKey}/`)) continue;
				const relative = token.slice(folder.name.length + 1);
				const match = STATIC_CONTEXT_FILES.find((item) => (
					item.contextRoot === folder.contextRoot
					&& normalizePathText(item.name).toLowerCase() === relative.toLowerCase()
				));
				const contextPath = match?.absolutePath || match?.name || '';
				if (!contextPath) continue;
				const dedupeKey = contextPath.toLowerCase();
				if (seen.has(dedupeKey)) continue;
				seen.add(dedupeKey);
				resolved.push(contextPath);
			}
		}
		return resolved;
	}

	const CLAUDE_PATH = 'm7.75 26.27 7.77-4.36.13-.38-.13-.21h-.38l-1.3-.08-4.44-.12-3.85-.16-3.73-.2-.94-.2-.88-1.16.09-.58.79-.53 1.13.1 2.5.17 3.75.26 2.72.16 4.03.42h.64l.09-.26-.22-.16-.17-.16-3.88-2.63-4.2-2.78-2.2-1.6-1.19-.81-.6-.76-.26-1.66 1.08-1.19 1.45.1.37.1 1.47 1.13 3.14 2.43 4.1 3.02.6.5.24-.17.03-.12-.27-.45-2.23-4.03-2.38-4.1-1.06-1.7-.28-1.02c-.1-.42-.17-.77-.17-1.2l1.23-1.67.68-.22 1.64.22.69.6 1.02 2.33 1.65 3.67 2.56 4.99.75 1.48.4 1.37.15.42h.26v-.24l.21-2.81.39-3.45.38-4.44.13-1.25.62-1.5 1.23-.81.96.46.79 1.13-.11.73-.47 3.05-.92 4.78-.6 3.2h.35l.4-.4 1.62-2.15 2.72-3.4 1.2-1.35 1.4-1.49.9-.71h1.7l1.25 1.86-.56 1.92-1.75 2.22-1.45 1.88-2.08 2.8-1.3 2.24.12.18.31-.03 4.7-1 2.54-.46 3.03-.52 1.37.64.15.65-.54 1.33-3.24.8-3.8.76-5.66 1.34-.07.05.08.1 2.55.24 1.09.06h2.67l4.97.37 1.3.86.78 1.05-.13.8-2 1.02-2.7-.64-6.3-1.5-2.16-.54h-.3v.18l1.8 1.76 3.3 2.98 4.13 3.84.21.95-.53.75-.56-.08-3.63-2.73-1.4-1.23-3.17-2.67h-.21v.28l.73 1.07 3.86 5.8.2 1.78-.28.58-1 .35-1.1-.2-2.26-3.17-2.33-3.57-1.88-3.2-.23.13-1.11 11.95-.52.61-1.2.46-1-.76-.53-1.23.53-2.43.64-3.17.52-2.52.47-3.13.28-1.04-.02-.07-.23.03-2.36 3.24-3.59 4.85-2.84 3.04-.68.27-1.18-.61.11-1.09.66-.97 3.93-5 2.37-3.1 1.53-1.79-.01-.26h-.09l-10.44 6.78-1.86.24-.8-.75.1-1.23.38-.4 3.14-2.16z';
	const OPENAI_PATH = 'm925.8 456.3c10.4 23.2 17 48 19.7 73.3 2.6 25.3 1.3 50.9-4.1 75.8-5.3 24.9-14.5 48.8-27.3 70.8-8.4 14.7-18.3 28.5-29.7 41.2-11.3 12.6-23.9 24-37.6 34-13.8 10-28.5 18.4-44.1 25.3-15.5 6.8-31.7 12-48.3 15.4-7.8 24.2-19.4 47.1-34.4 67.7-14.9 20.6-33 38.7-53.6 53.6-20.6 15-43.4 26.6-67.6 34.4-24.2 7.9-49.5 11.8-75 11.8-16.9.1-33.9-1.7-50.5-5.1-16.5-3.5-32.7-8.8-48.2-15.7s-30.2-15.5-43.9-25.5c-13.6-10-26.2-21.5-37.4-34.2-25 5.4-50.6 6.7-75.9 4.1-25.3-2.7-50.1-9.3-73.4-19.7-23.2-10.3-44.7-24.3-63.6-41.4s-35-37.1-47.7-59.1c-8.5-14.7-15.5-30.2-20.8-46.3s-8.8-32.7-10.6-49.6c-1.8-16.8-1.7-33.8.1-50.7 1.8-16.8 5.5-33.4 10.8-49.5-17-18.9-31-40.4-41.4-63.6-10.3-23.3-17-48-19.6-73.3-2.7-25.3-1.3-50.9 4-75.8s14.5-48.8 27.3-70.8c8.4-14.7 18.3-28.6 29.6-41.2s24-24 37.7-34 28.5-18.5 44-25.3c15.6-6.9 31.8-12 48.4-15.4 7.8-24.3 19.4-47.1 34.3-67.7 15-20.6 33.1-38.7 53.7-53.7 20.6-14.9 43.4-26.5 67.6-34.4 24.2-7.8 49.5-11.8 75-11.7 16.9-.1 33.9 1.6 50.5 5.1s32.8 8.7 48.3 15.6c15.5 7 30.2 15.5 43.9 25.5 13.7 10.1 26.3 21.5 37.5 34.2 24.9-5.3 50.5-6.6 75.8-4s50 9.3 73.3 19.6c23.2 10.4 44.7 24.3 63.6 41.4 18.9 17 35 36.9 47.7 59 8.5 14.6 15.5 30.1 20.8 46.3 5.3 16.1 8.9 32.7 10.6 49.6 1.8 16.9 1.8 33.9-.1 50.8-1.8 16.9-5.5 33.5-10.8 49.6 17.1 18.9 31 40.3 41.4 63.6zm-333.2 426.9c21.8-9 41.6-22.3 58.3-39s30-36.5 39-58.4c9-21.8 13.7-45.2 13.7-68.8v-223q-.1-.3-.2-.7-.1-.3-.3-.6-.2-.3-.5-.5-.3-.3-.6-.4l-80.7-46.6v269.4c0 2.7-.4 5.5-1.1 8.1-.7 2.7-1.7 5.2-3.1 7.6s-3 4.6-5 6.5a32.1 32.1 0 0 1-6.5 5l-191.1 110.3c-1.6 1-4.3 2.4-5.7 3.2 7.9 6.7 16.5 12.6 25.5 17.8 9.1 5.2 18.5 9.6 28.3 13.2 9.8 3.5 19.9 6.2 30.1 8 10.3 1.8 20.7 2.7 31.1 2.7 23.6 0 47-4.7 68.8-13.8zm-455.1-151.4c11.9 20.5 27.6 38.3 46.3 52.7 18.8 14.4 40.1 24.9 62.9 31s46.6 7.7 70 4.6 45.9-10.7 66.4-22.5l193.2-111.5.5-.5q.2-.2.3-.6.2-.3.3-.6v-94l-233.2 134.9c-2.4 1.4-4.9 2.4-7.5 3.2-2.7.7-5.4 1-8.2 1-2.7 0-5.4-.3-8.1-1-2.6-.8-5.2-1.8-7.6-3.2l-191.1-110.4c-1.7-1-4.2-2.5-5.6-3.4-1.8 10.3-2.7 20.7-2.7 31.1s1 20.8 2.8 31.1c1.8 10.2 4.6 20.3 8.1 30.1 3.6 9.8 8 19.2 13.2 28.2zm-50.2-417c-11.8 20.5-19.4 43.1-22.5 66.5s-1.5 47.1 4.6 70c6.1 22.8 16.6 44.1 31 62.9 14.4 18.7 32.3 34.4 52.7 46.2l193.1 111.6q.3.1.7.2h.7q.4 0 .7-.2.3-.1.6-.3l81-46.8-233.2-134.6c-2.3-1.4-4.5-3.1-6.5-5a32.1 32.1 0 0 1-5-6.5c-1.3-2.4-2.4-4.9-3.1-7.6-.7-2.6-1.1-5.3-1-8.1v-227.1c-9.8 3.6-19.3 8-28.3 13.2-9 5.3-17.5 11.3-25.5 18-7.9 6.7-15.3 14.1-22 22.1-6.7 7.9-12.6 16.5-17.8 25.5zm663.3 154.4c2.4 1.4 4.6 3 6.6 5 1.9 1.9 3.6 4.1 5 6.5 1.3 2.4 2.4 5 3.1 7.6.6 2.7 1 5.4.9 8.2v227.1c32.1-11.8 60.1-32.5 80.8-59.7 20.8-27.2 33.3-59.7 36.2-93.7s-3.9-68.2-19.7-98.5-39.9-55.5-69.5-72.5l-193.1-111.6q-.3-.1-.7-.2h-.7q-.3.1-.7.2-.3.1-.6.3l-80.6 46.6 233.2 134.7zm80.5-121h-.1v.1zm-.1-.1c5.8-33.6 1.9-68.2-11.3-99.7-13.1-31.5-35-58.6-63-78.2-28-19.5-61-30.7-95.1-32.2-34.2-1.4-68 6.9-97.6 23.9l-193.1 111.5q-.3.2-.5.5l-.4.6q-.1.3-.2.7-.1.3-.1.7v93.2l233.2-134.7c2.4-1.4 5-2.4 7.6-3.2 2.7-.7 5.4-1 8.1-1 2.8 0 5.5.3 8.2 1 2.6.8 5.1 1.8 7.5 3.2l191.1 110.4c1.7 1 4.2 2.4 5.6 3.3zm-505.3-103.2c0-2.7.4-5.4 1.1-8.1.7-2.6 1.7-5.2 3.1-7.6 1.4-2.3 3-4.5 5-6.5 1.9-1.9 4.1-3.6 6.5-4.9l191.1-110.3c1.8-1.1 4.3-2.5 5.7-3.2-26.2-21.9-58.2-35.9-92.1-40.2-33.9-4.4-68.3 1-99.2 15.5-31 14.5-57.2 37.6-75.5 66.4-18.3 28.9-28 62.3-28 96.5v223q.1.4.2.7.1.3.3.6.2.3.5.6.2.2.6.4l80.7 46.6zm43.8 294.7 103.9 60 103.9-60v-119.9l-103.8-60-103.9 60z';

	function makeId(prefix) {
		return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	}

	function stableTextHash(value) {
		const text = String(value || '');
		let hash = 2166136261;
		for (let index = 0; index < text.length; index += 1) {
			hash ^= text.charCodeAt(index);
			hash = Math.imul(hash, 16777619);
		}
		return (hash >>> 0).toString(36);
	}

	function formatDuration(seconds) {
		const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const secs = totalSeconds % 60;
		if (hours > 0) return `${hours}h${minutes}m${secs}s`;
		if (minutes > 0) return `${minutes}m${secs}s`;
		return `${secs}s`;
	}

	function formatConversationDirectoryTitle(text) {
		const firstLine = String(text || '')
			.split(/\r?\n/)
			.map((line) => line.trim())
			.find(Boolean);
		if (!firstLine) return '';
		return firstLine.length <= 80 ? firstLine : `${firstLine.slice(0, 77)}...`;
	}

	function getElementScrollTop(container, element) {
		if (!container || !element) return 0;
		const containerRect = container.getBoundingClientRect();
		const elementRect = element.getBoundingClientRect();
		return Math.max(0, container.scrollTop + elementRect.top - containerRect.top - 10);
	}

	function getUserMessageElements(container) {
		if (!container) return [];
		return Array.from(container.querySelectorAll('.claudian-message-user, [data-role="user"]'));
	}

	function getMcpServerType(config) {
		if (config?.type === 'sse') return 'sse';
		if (config?.type === 'http' || config?.url) return 'http';
		return 'stdio';
	}

	function isRecord(value) {
		return !!value && typeof value === 'object' && !Array.isArray(value);
	}

	function isValidMcpServerConfig(config) {
		return isRecord(config)
			&& ((typeof config.command === 'string' && config.command.trim())
				|| (typeof config.url === 'string' && config.url.trim()));
	}

	function parseMcpClipboardConfig(text) {
		const parsed = JSON.parse(text);
		if (!isRecord(parsed)) {
			throw new Error('Invalid JSON object');
		}
		if (isRecord(parsed.mcpServers)) {
			const servers = Object.entries(parsed.mcpServers)
				.filter(([, config]) => isValidMcpServerConfig(config))
				.map(([name, config]) => ({ name, config }));
			if (servers.length === 0) {
				throw new Error('No valid server configs found in mcpServers');
			}
			return { servers, needsName: false };
		}
		if (isValidMcpServerConfig(parsed)) {
			return { servers: [{ name: '', config: parsed }], needsName: true };
		}
		const entries = Object.entries(parsed);
		if (entries.length === 1) {
			const [name, config] = entries[0];
			if (isValidMcpServerConfig(config)) {
				return { servers: [{ name, config }], needsName: false };
			}
		}
		const servers = entries
			.filter(([, config]) => isValidMcpServerConfig(config))
			.map(([name, config]) => ({ name, config }));
		if (servers.length > 0) {
			return { servers, needsName: false };
		}
		throw new Error('Invalid MCP configuration format');
	}

	function tryParseMcpClipboardConfig(text) {
		const trimmed = String(text || '').trim();
		if (!trimmed.startsWith('{')) return null;
		try {
			return parseMcpClipboardConfig(trimmed);
		}
		catch {
			return null;
		}
	}

	function parseCommandLine(value) {
		const tokens = [];
		let current = '';
		let quote = '';
		for (const char of String(value || '').trim()) {
			if ((char === '"' || char === "'") && !quote) {
				quote = char;
				continue;
			}
			if (quote && char === quote) {
				quote = '';
				continue;
			}
			if (/\s/.test(char) && !quote) {
				if (current) {
					tokens.push(current);
					current = '';
				}
				continue;
			}
			current += char;
		}
		if (current) tokens.push(current);
		return { command: tokens[0] || '', args: tokens.slice(1) };
	}

	function parseKeyValueLines(value) {
		const result = {};
		for (const line of String(value || '').split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const eqIndex = trimmed.indexOf('=');
			if (eqIndex < 0) continue;
			const key = trimmed.slice(0, eqIndex).trim();
			const val = trimmed.slice(eqIndex + 1).trim();
			if (key) result[key] = val;
		}
		return result;
	}

	function keyValueRecordToText(value) {
		return Object.entries(value || {}).map(([key, val]) => `${key}=${val}`).join('\n');
	}

	function detectEnvModelIds(envText) {
		const env = parseKeyValueLines(envText);
		const ids = new Set();
		Object.entries(env).forEach(([key, value]) => {
			const normalizedKey = String(key || '').toUpperCase();
			const modelId = String(value || '').trim();
			if (!modelId) return;
			if (normalizedKey === 'OPENAI_MODEL' || normalizedKey === 'ANTHROPIC_MODEL' || normalizedKey === 'CODEX_MODEL' || normalizedKey.endsWith('_MODEL')) {
				ids.add(modelId);
			}
		});
		return Array.from(ids);
	}

	function parseContextLimitText(value) {
		const text = String(value || '').trim().toLowerCase();
		if (!text) return null;
		const match = text.match(/^(\d+(?:\.\d+)?)\s*([kmb])?$/);
		if (!match) return null;
		const numeric = Number(match[1]);
		if (!Number.isFinite(numeric) || numeric <= 0) return null;
		const multiplier = match[2] === 'm' ? 1000000 : match[2] === 'b' ? 1000000000 : match[2] === 'k' ? 1000 : 1;
		return Math.round(numeric * multiplier);
	}

	function formatContextLimitText(value) {
		const numeric = Number(value || 0);
		if (!Number.isFinite(numeric) || numeric <= 0) return '';
		if (numeric % 1000000 === 0) return `${numeric / 1000000}m`;
		if (numeric % 1000 === 0) return `${numeric / 1000}k`;
		return String(numeric);
	}

	function mcpPreview(server) {
		if (server.description) return server.description;
		const type = getMcpServerType(server.config);
		if (type === 'stdio') {
			const command = server.config?.command || server.name || 'command';
			const args = Array.isArray(server.config?.args) ? server.config.args.join(' ') : '';
			return args ? `${command} ${args}` : command;
		}
		return server.config?.url || 'Remote endpoint';
	}

	function defaultFilesystemMcpConfig() {
		const workspace = getDefaultWorkspacePath();
		const args = ['-y', '@modelcontextprotocol/server-filesystem'];
		if (workspace) args.push(workspace);
		return { command: 'npx', args };
	}

	function defaultProjectPluginPath() {
		const workspace = getDefaultWorkspacePath();
		return workspace ? joinDisplayPath(workspace, '.claude\\plugins\\project-tools') : '.claude\\plugins\\project-tools';
	}

	function normalizeMcpServer(server) {
		const name = String(server?.name || 'server').trim() || 'server';
		const config = server?.config || (
			name === 'filesystem'
				? defaultFilesystemMcpConfig()
				: name === 'browser'
					? { type: 'http', url: 'http://localhost:3001/mcp' }
					: { command: name }
		);
		return {
			name,
			config,
			description: server?.description || '',
			enabled: server?.enabled !== false,
			contextSaving: server?.contextSaving !== false,
			disabledTools: Array.isArray(server?.disabledTools) ? server.disabledTools : [],
		};
	}

	function formatMcpSaveError(error, fallback = 'Failed to update MCP server setting') {
		const message = error instanceof Error ? error.message : String(error || '');
		const lower = message.toLowerCase();
		if (lower.includes('permission') || lower.includes('eacces')) {
			return 'Permission denied. Check .claude/ folder permissions.';
		}
		if (lower.includes('enospc') || lower.includes('disk full') || lower.includes('no space')) {
			return 'Disk full. Free up space and try again.';
		}
		if (lower.includes('json') || lower.includes('syntax')) {
			return 'Config file corrupted. Check .claude/mcp.json';
		}
		return message || fallback;
	}

	function defaultMcpServers() {
		return [
			normalizeMcpServer({
				name: 'filesystem',
				description: 'Local workspace filesystem tools',
				enabled: true,
				contextSaving: true,
				config: defaultFilesystemMcpConfig(),
			}),
			normalizeMcpServer({
				name: 'browser',
				description: 'Browser automation tools',
				enabled: false,
				contextSaving: false,
				config: { type: 'http', url: 'http://localhost:3001/mcp' },
			}),
		];
	}

	function defaultClaudePlugins() {
		return [
			{
				id: 'pdf-ai/project-tools',
				name: 'project-tools',
				enabled: true,
				scope: 'project',
				installPath: defaultProjectPluginPath(),
				version: '0.1.0',
				description: 'Project-local commands, agents, and hooks',
			},
			{
				id: 'claude-code/documentation',
				name: 'documentation',
				enabled: false,
				scope: 'user',
				installPath: '~\\.claude\\plugins\\documentation',
				version: '1.2.0',
				description: 'User-level documentation helpers',
			},
			{
				id: 'claude-code/lab-tools',
				name: 'lab-tools',
				enabled: true,
				scope: 'user',
				installPath: '~\\.claude\\plugins\\lab-tools',
				error: 'mock load warning',
				description: 'Experimental tools with a mocked warning state',
			},
		];
	}

	function normalizeClaudePlugins(value) {
		const source = Array.isArray(value) ? value : [];
		return source.map((plugin) => ({
			id: String(plugin.id || plugin.name || makeId('plugin')),
			name: String(plugin.name || plugin.id || 'plugin'),
			enabled: plugin.enabled !== false,
			scope: plugin.scope === 'user' ? 'user' : 'project',
			installPath: String(plugin.installPath || ''),
			version: plugin.version ? String(plugin.version) : '',
			description: plugin.description ? String(plugin.description) : '',
			error: plugin.error ? String(plugin.error) : '',
		}));
	}

	function buildMockMcpTools(server) {
		if (server.name === 'filesystem') {
			return [
				{ name: 'read_file', description: 'Read a file from the configured workspace.' },
				{ name: 'list_directory', description: 'List files and folders under a workspace path.' },
				{ name: 'search_files', description: 'Search for files matching a pattern.' },
			];
		}
		if (server.name === 'browser') {
			return [
				{ name: 'browser_navigate', description: 'Navigate a browser tab to a URL.' },
				{ name: 'browser_snapshot', description: 'Capture structured page content.' },
				{ name: 'browser_click', description: 'Click an element in the active page.' },
			];
		}
		return [
			{ name: `${server.name}_status`, description: 'Mock status tool for this MCP server.' },
			{ name: `${server.name}_query`, description: 'Mock query tool exposed by this server.' },
		];
	}

	function resolveMcpTestTools(testResult, fallbackTools, hasRuntimeTestApi) {
		const reportedTools = Array.isArray(testResult?.tools) ? testResult.tools : [];
		if (reportedTools.length > 0) return reportedTools;
		if (hasRuntimeTestApi) return [];
		return testResult?.source === 'mock' || !testResult ? fallbackTools : [];
	}

	function appendMarkdownSnippet(current, snippet) {
		const existing = String(current || '').trim();
		const next = String(snippet || '').trim();
		if (!next) return existing;
		return existing ? `${existing}\n\n${next}` : next;
	}

	function normalizeInstructionInput(text) {
		return String(text || '').replace(/^#\s*/, '').trim();
	}

	function resolveComposerModeKeyAction(options = {}) {
		const value = String(options.value || '');
		const key = String(options.key || '');
		const instructionMode = options.instructionMode === true;
		const bangBashEnabled = options.bangBashEnabled === true;
		const bangBashMode = bangBashEnabled && (options.bangBashMode === true || value.startsWith('!'));
		const shiftKey = options.shiftKey === true;
		const isComposing = options.isComposing === true;

		if (bangBashMode && key === 'Escape' && !isComposing) {
			return { type: 'cancel-bang-bash', preventDefault: true };
		}
		if (bangBashMode && key === 'Enter' && !shiftKey && !isComposing) {
			const command = (value.startsWith('!') ? value.slice(1) : value).trim();
			return command
				? { type: 'submit-bang-bash', command, preventDefault: true }
				: { type: 'empty-bang-bash-enter', preventDefault: true };
		}
		if (!instructionMode && value === '' && key === '#' && !isComposing) {
			return { type: 'enter-instruction', preventDefault: true };
		}
		if (!instructionMode && bangBashEnabled && value === '' && key === '!' && !isComposing) {
			return { type: 'enter-bang-bash', preventDefault: true };
		}
		if (instructionMode && key === 'Escape' && !isComposing) {
			return { type: 'cancel-instruction', preventDefault: true };
		}
		if (instructionMode && key === 'Enter' && !shiftKey && !isComposing) {
			const instruction = normalizeInstructionInput(value);
			return instruction
				? { type: 'submit-instruction', instruction, preventDefault: true }
				: { type: 'empty-instruction-enter', preventDefault: false };
		}
		return null;
	}

	function isInstructionRefineCancelled(message) {
		return /^(cancelled|canceled)$/i.test(String(message || '').trim());
	}

	function buildMockRefinedInstruction(rawInstruction, clarificationResponse) {
		const raw = normalizeInstructionInput(rawInstruction);
		const response = String(clarificationResponse || '').trim();
		const lines = [
			'When assisting in this workspace:',
			`- ${raw || 'Follow the user instruction precisely.'}`,
		];
		if (response) {
			lines.push(`- Additional detail: ${response}`);
		}
		return lines.join('\n');
	}

	const MOCK_INLINE_NOTE = [
		'# AI Sidebar Mock Note',
		'',
		'The standalone AI sidebar restores the original plugin flows before a real provider is connected.',
		'',
		'The current focus is one-to-one UI parity for chat, commands, mentions, tools, queues, and inline edit.',
	].join('\n');

	const MOCK_INLINE_SELECTION = 'The standalone AI sidebar restores the original plugin flows before a real provider is connected.';
	const MOCK_INLINE_PATH = 'mock-note.md';

	const PROVIDER_INLINE_NOTE = [
		'# Workspace Draft',
		'',
		'Use inline edit to revise selected Markdown text or insert new content at the cursor.',
		'',
		'Provider requests include the selected text, surrounding context, workspace path, and any @mentioned files.',
	].join('\n');

	const PROVIDER_INLINE_SELECTION = 'Use inline edit to revise selected Markdown text or insert new content at the cursor.';
	const PROVIDER_INLINE_PATH = 'workspace-draft.md';

	function getInlineEditSeed(providerEnabled) {
		return providerEnabled
			? { note: PROVIDER_INLINE_NOTE, selection: PROVIDER_INLINE_SELECTION, path: PROVIDER_INLINE_PATH }
			: { note: MOCK_INLINE_NOTE, selection: MOCK_INLINE_SELECTION, path: MOCK_INLINE_PATH };
	}

	function getDefaultInlineSelectionRange(text, selectionText = MOCK_INLINE_SELECTION) {
		const source = String(text || '');
		const start = source.indexOf(selectionText);
		if (start >= 0) {
			return { start, end: start + selectionText.length };
		}
		const fallbackStart = Math.max(0, source.indexOf('\n\n') + 2);
		const fallbackEnd = source.indexOf('\n\n', fallbackStart);
		return {
			start: fallbackStart,
			end: fallbackEnd > fallbackStart ? fallbackEnd : source.length,
		};
	}

	function normalizeInsertionText(text) {
		return String(text || '').replace(/^(?:\r?\n)+|(?:\r?\n)+$/g, '');
	}

	function buildMockInlineEditResult(selectedText, instruction, response) {
		const base = String(selectedText || '').trim();
		const request = [instruction, response].filter(Boolean).join(' ').toLowerCase();
		const clarification = String(response || '').trim();
		if (request.includes('bullet')) {
			const lines = [
				'- Restores the original AI sidebar flows.',
				'- Keeps provider calls mocked until UI parity is verified.',
			];
			if (clarification) lines.push(`- Clarification: ${clarification}`);
			return lines.join('\n');
		}
		if (request.includes('professional')) {
			return [
				'The standalone AI sidebar restores the original plugin workflows while keeping provider execution safely mocked for parity testing.',
				clarification ? `Clarification applied: ${clarification}` : '',
			].filter(Boolean).join('\n');
		}
		if (request.includes('short') || request.includes('concise') || request.includes('简洁')) {
			return [
				'The standalone AI sidebar restores original workflows with provider-safe mock behavior.',
				clarification ? `Clarification applied: ${clarification}` : '',
			].filter(Boolean).join('\n');
		}
		return base ? `${base}\n\nMock edit note: ${String(instruction || 'Refine this selection').trim()}.${clarification ? ` ${clarification}` : ''}` : 'Mock edit result.';
	}

	function buildMockInlineInsertion(instruction) {
		const value = String(instruction || '').trim();
		if (value.toLowerCase().includes('next')) {
			return '\nNext step: connect this verified inline edit surface to the provider-owned edit service.';
		}
		return `\nInserted note: ${value || 'Continue the document with a concise provider-safe update.'}`;
	}

	function renderPlainText(text) {
		const parts = String(text || '').split('\n');
		return parts.map((line, index) => [
			index > 0 ? h('br', { key: `br-${index}` }) : null,
			h('span', { key: `line-${index}` }, line),
		]);
	}

	const GENERATED_FILE_EXTENSIONS = 'pptx|docx|xlsx|pdf|png|jpg|jpeg|webp|gif|svg|md|txt|csv|zip|json|html';

	function cleanGeneratedFilePath(value) {
		return String(value || '')
			.trim()
			.replace(/^file:\/\//i, '')
			.replace(/^(?![A-Za-z]:[\\/]).*[:：]\s*/g, '')
			.replace(/^[^A-Za-z0-9._~\\/]+[:：]\s*/g, '')
			.replace(/^[`"']+|[`"',.;:，。；、\])）]+$/g, '');
	}

	function isWindowsDrivePath(value) {
		return /^[A-Za-z]:[\\/]/.test(String(value || ''));
	}

	function isAbsoluteGeneratedPath(value) {
		const text = String(value || '');
		return isWindowsDrivePath(text) || text.startsWith('/') || text.startsWith('~');
	}

	function joinDisplayPath(basePath, childPath) {
		const base = cleanGeneratedFilePath(basePath).replace(/[\\/]+$/g, '');
		const child = cleanGeneratedFilePath(childPath).replace(/^[\\/]+/g, '');
		if (!base || !child) return child || base;
		const separator = base.includes('\\') || isWindowsDrivePath(base) ? '\\' : '/';
		return `${base}${separator}${child.replace(/[\\/]/g, separator)}`;
	}

	function toWindowsDisplayPath(value) {
		const cleaned = cleanGeneratedFilePath(value);
		const msysMatch = cleaned.match(/^\/([A-Za-z])\/(.+)$/);
		if (msysMatch) {
			return `${msysMatch[1].toUpperCase()}:\\${msysMatch[2].replace(/\//g, '\\')}`;
		}
		const wslMatch = cleaned.match(/^\/mnt\/([A-Za-z])\/(.+)$/);
		if (wslMatch) {
			return `${wslMatch[1].toUpperCase()}:\\${wslMatch[2].replace(/\//g, '\\')}`;
		}
		return cleaned;
	}

	function lineSuggestsGeneratedFile(line) {
		return /(generated|created|saved|written|wrote|output|exported|已生成|生成|已保存|保存|写入|创建|输出|导出|工作区根目录|workspace root)/i.test(String(line || ''));
	}

	function lineLooksLikeStandaloneGeneratedPath(line) {
		const trimmed = cleanGeneratedFilePath(line);
		if (!trimmed) return false;
		const extension = `\\.(${GENERATED_FILE_EXTENSIONS})(?:$|[\\s\`"'<>\\]}),.;:，。；、（(])`;
		return new RegExp(`^(?:[A-Za-z]:[\\\\/]|/mnt/[A-Za-z]/|/[A-Za-z]/|~/)[^\\r\\n]*?${extension}`, 'i').test(trimmed);
	}

	function relativeGeneratedSegments(line) {
		const source = String(line || '');
		const segments = [];
		const markerPattern = /(?:generated|created|saved|written|wrote|output|exported|已生成|已保存|保存|写入|创建|输出|导出)[^:\n：]{0,48}(?:[:：]|\b(?:to|as|at|in)\b\s*)/gi;
		let match = markerPattern.exec(source);
		while (match) {
			segments.push(source.slice(markerPattern.lastIndex));
			match = markerPattern.exec(source);
		}
		return segments;
	}

	function extractGeneratedFilePaths(text, basePath = '') {
		const result = [];
		const seen = new Set();
		const add = (candidate, options = {}) => {
			let cleaned = cleanGeneratedFilePath(candidate);
			if (!cleaned) return;
			if (options.relative === true && !isAbsoluteGeneratedPath(cleaned)) {
				cleaned = joinDisplayPath(basePath, cleaned);
			}
			const normalized = toWindowsDisplayPath(cleaned);
			if (!normalized || seen.has(normalized)) return;
			seen.add(normalized);
			result.push(normalized);
		};
		const source = String(text || '');
		const pathEnd = `\\.(?:${GENERATED_FILE_EXTENSIONS})(?=$|[\\s\`"'<>\\]}),.;:，。；、（(])`;
		const patterns = [
			new RegExp(`[A-Za-z]:[\\\\/].*?${pathEnd}`, 'gi'),
			new RegExp(`(?:^|[\\s(:：])(/mnt/[A-Za-z]/.*?${pathEnd})`, 'gi'),
			new RegExp(`(?:^|[\\s(:：])(/[A-Za-z]/.*?${pathEnd})`, 'gi'),
			new RegExp(`(?:^|[\\s(:：])(~\\/[^\\r\\n\`"']*?${pathEnd})`, 'gi'),
		];
		for (const line of source.split(/\r?\n/)) {
			if (lineSuggestsGeneratedFile(line) || lineLooksLikeStandaloneGeneratedPath(line)) {
				for (const pattern of patterns) {
					pattern.lastIndex = 0;
					let match = pattern.exec(line);
					while (match) {
						add(match[1] || match[0]);
						match = pattern.exec(line);
					}
				}
			}
			if (basePath) {
				const relativePattern = new RegExp(`(?:^|[:：\\s])([^\\r\\n\`"'<>|]*?${pathEnd})`, 'gi');
				for (const segment of relativeGeneratedSegments(line)) {
					relativePattern.lastIndex = 0;
					let match = relativePattern.exec(segment);
					while (match) {
						const candidate = cleanGeneratedFilePath(match[1] || match[0]);
						if (candidate && !isAbsoluteGeneratedPath(candidate) && /[^\s]/.test(candidate)) {
							add(candidate, { relative: true });
						}
						match = relativePattern.exec(segment);
					}
				}
			}
		}
		return result;
	}

	function mergeGeneratedFilePaths(...groups) {
		const seen = new Set();
		const result = [];
		for (const group of groups) {
			for (const item of Array.isArray(group) ? group : []) {
				const value = truncateEndText(toWindowsDisplayPath(item), MAX_MESSAGE_CONTEXT_PATH_LENGTH);
				if (!value || seen.has(value)) continue;
				seen.add(value);
				result.push(value);
				if (result.length >= MAX_RUNTIME_GENERATED_FILES) return result;
			}
		}
		return result;
	}

	function createEmptyTab(index, settings) {
		const model = settings.model || 'sonnet';
		const providerId = modelToProvider(model, settings);
		return {
			id: makeId('tab'),
			index,
			title: 'New Chat',
			providerId,
			model,
			messages: [],
			isStreaming: false,
			needsAttention: false,
			queuedText: '',
			queuedDisplayText: '',
			queuedContextChips: [],
			queuedImages: [],
			queuedContext: null,
			turnContextChips: [],
			turnContext: null,
			bashOutputs: [],
			usage: null,
			fileChips: [],
			agentChips: [],
			mcpMentions: [],
			imageChips: [],
			pdfSnippetChips: [],
			historyId: null,
			runtimeSessionKey: null,
			runtimeThreadId: null,
			runtimeProviderId: null,
			runtimeFork: null,
			runtimeResumeAt: null,
			workspace: settings.workspace || '',
			prePlanPermissionMode: null,
			pendingNewSessionPlan: null,
		};
	}

	function modelToProvider(model, settings) {
		const decoded = decodeProviderPrefixedModel(model);
		if (decoded?.providerId) return decoded.providerId;
		const configured = settings ? getModelOptions(settings).find((item) => modelOptionMatches(item, model))?.providerId : null;
		if (configured) return configured;
		const builtIn = MODELS.find((item) => item.value === model)?.providerId;
		if (builtIn) return builtIn;
		const lower = String(model || '').toLowerCase();
		if (lower.startsWith('gpt-') || lower.includes('codex')) return 'codex';
		return 'claude';
	}

	function isBangBashEnabledForProvider(providerId, settings) {
		return providerId === 'claude' && settings?.claudeEnableBangBash !== false;
	}

	function supportsMcpToolsForProvider(providerId) {
		return providerId === 'claude';
	}

	function supportsTurnSteerForProvider(providerId) {
		return providerId === 'codex';
	}

	function getProviderCapabilities(providerId) {
		return {
			supportsNativeHistory: providerId === 'claude' || providerId === 'codex',
			supportsFork: providerId === 'claude' || providerId === 'codex',
		};
	}

	function clearInvalidatedProviderRuntimeState(item, providerId) {
		const provider = String(providerId || '').trim();
		if (!provider || !item || typeof item !== 'object') return item;
		const isProviderItem = item.providerId === provider
			|| item.runtimeProviderId === provider
			|| item.runtimeFork?.providerId === provider;
		if (!isProviderItem) return item;
		const nextProviderState = item.providerState && typeof item.providerState === 'object' && !Array.isArray(item.providerState)
			? {
				...item.providerState,
				threadId: null,
				forkSource: null,
			}
			: item.providerState;
		return {
			...item,
			runtimeThreadId: null,
			runtimeFork: null,
			runtimeResumeAt: null,
			runtimeProviderId: item.runtimeProviderId === provider || item.providerId === provider ? provider : item.runtimeProviderId,
			...(nextProviderState !== item.providerState ? { providerState: nextProviderState } : {}),
		};
	}

	function resolveStandaloneSlashCommandAction(text, providerId, settings = {}) {
		const match = String(text || '').trim().match(/^\/([a-zA-Z0-9_-]+)(?:\s+(.*))?$/);
		if (!match) return null;
		const command = match[1].toLowerCase();
		const args = match[2] || '';
		const providerRuntimeActive = isProviderRuntimeMode(settings.runtimeMode);
		const capabilities = getProviderCapabilities(providerId);
		if (command === 'clear' || command === 'new') {
			return { action: 'clear', command, args };
		}
		if (command === 'resume') {
			return capabilities.supportsNativeHistory ? { action: 'resume', command, args } : null;
		}
		if (command === 'add-dir') {
			return { action: 'add-dir', command, args };
		}
		if (command === 'fork') {
			return capabilities.supportsFork ? { action: 'fork', command, args } : null;
		}
		if (!providerRuntimeActive && command === 'model') {
			return { action: 'model', command, args };
		}
		if (!providerRuntimeActive && command === 'help') {
			return { action: 'help', command, args };
		}
		if (providerId === 'claude' && !providerRuntimeActive) {
			const configured = normalizeClaudeCommands(settings.claudeCommands)
				.find((entry) => entry.name.toLowerCase() === command && entry.userInvocable !== false);
			if (configured) {
				return { action: 'mock-claude-command', command, args, configured };
			}
		}
		return null;
	}

	function shouldEchoStandaloneCommandInChat(action, settings = {}) {
		if (isProviderRuntimeMode(settings?.runtimeMode)) return false;
		return ['add-dir', 'help', 'mock-claude-command'].includes(String(action || ''));
	}

	function getModelLabel(model, settings) {
		const decoded = decodeProviderPrefixedModel(model);
		const matched = getModelOptions(settings).find((item) => modelOptionMatches(item, model));
		return matched?.label || decoded?.modelId || model || 'Unknown';
	}

	function providerProductLabel(providerId) {
		return normalizeRuntimeProviderId(providerId) === 'claude' ? 'Claude Code' : 'Codex';
	}

	function getGreeting(providerId, settings) {
		const name = String(settings?.userName || '').trim();
		if (normalizeLocale(settings?.locale) === 'zh-CN') {
			if (providerId === 'codex') return name ? `Codex 今天要处理什么，${name}？` : 'Codex 今天要处理什么？';
			return name ? `今天想让我帮你做什么，${name}？` : '今天想让我帮你做什么？';
		}
		if (providerId === 'codex') return name ? `What should Codex work on, ${name}?` : 'What should Codex work on?';
		return name ? `How can i help you today, ${name}?` : 'How can i help you today?';
	}

	function buildConversationTitle(settings, text, images) {
		if (settings?.enableAutoTitleGeneration === false) {
			return 'New Chat';
		}
		if (isProviderRuntimeMode(settings?.runtimeMode)) {
			return 'New Chat';
		}
		const title = formatConversationDirectoryTitle(text);
		if (title) return title;
		return Array.isArray(images) && images.length ? 'Images' : 'New Chat';
	}

	function userMessage(text, images, options = {}) {
		const displayContent = typeof options.displayContent === 'string' ? options.displayContent.trim() : '';
		const visibleText = displayContent || text;
		const contextChips = normalizeMessageContextChips(options.contextChips);
		return {
			id: makeId('msg'),
			role: 'user',
			content: text,
			displayContent,
			contentBlocks: [{ type: 'text', id: makeId('block'), content: visibleText }],
			contextChips,
			images: Array.isArray(images) && images.length ? images : undefined,
			userMessageId: makeId('user'),
			timestamp: Date.now(),
		};
	}

	function assistantMessage() {
		const now = Date.now();
		return {
			id: makeId('msg'),
			role: 'assistant',
			content: '',
			contentBlocks: [],
			toolCalls: [],
			timestamp: now,
			runtimeStartedAt: now,
			durationSeconds: 0,
		};
	}

	const workingSpinnerGlyphFramesBase = ['·', '✢', '*', '✶', '✻', '✽'];
	const workingSpinnerGlyphFrames = [
		...workingSpinnerGlyphFramesBase,
		...[...workingSpinnerGlyphFramesBase].reverse(),
	];
	function AnimatedWorkingGlyph({ size = 16, className = 'claudian-working-spinner-icon' }) {
		const [glyphIndex, setGlyphIndex] = useState(0);

		useEffect(() => {
			const intervalHandle = window.setInterval(() => {
				setGlyphIndex((currentIndex) => (currentIndex + 1) % workingSpinnerGlyphFrames.length);
			}, 120);
			return () => window.clearInterval(intervalHandle);
		}, []);

		return h('span', {
			className,
			style: { fontSize: `${size}px` },
			'aria-hidden': 'true',
		}, workingSpinnerGlyphFrames[glyphIndex]);
	}

	function WorkingSpinner({ size = 16, status, elapsedSeconds = 0 }) {
		const action = status === 'compacting' ? 'Compacting' : 'Working';
		const duration = formatDuration(Math.max(0, Math.floor(Number(elapsedSeconds) || 0)));
		const displayText = `${action} for ${duration}`;

		return h('span', { className: 'claudian-working-spinner' },
			h(AnimatedWorkingGlyph, { size }),
			h('span', { className: 'claudian-working-spinner-text' }, displayText),
		);
	}

	function runtimeWaitingBlock(providerId, startTime = Date.now()) {
		return {
			type: 'thinking',
			id: makeId('runtime-waiting'),
			label: 'Working',
			providerId: providerId || '',
			content: '',
			durationSeconds: 0,
			runtimeStreaming: true,
			runtimeWaiting: true,
			startTime,
		};
	}

	function runtimeWaitingHint() {
		return '（esc to interrupt）';
	}

	function runtimeWaitingDisplay(block) {
		return {
			className: 'claudian-thinking claudian-thinking-runtime',
			label: block?.label || 'Thinking',
			hint: runtimeWaitingHint(),
		};
	}

	function assistantMessageWithRuntimeWaiting(providerId) {
		const startedAt = Date.now();
		const msg = assistantMessage();
		msg.runtimeStartedAt = startedAt;
		msg.contentBlocks = [runtimeWaitingBlock(providerId, startedAt)];
		msg.runtimeProviderId = providerId || null;
		return msg;
	}

	function normalizeRuntimeProviderId(value) {
		const providerId = String(value || '').trim().toLowerCase();
		return providerId === 'claude' || providerId === 'codex' ? providerId : '';
	}

	function resolveMessageRuntimeProvider(message, fallbackProviderId = '') {
		return normalizeRuntimeProviderId(message?.runtimeProviderId)
			|| normalizeRuntimeProviderId(fallbackProviderId)
			|| normalizeRuntimeProviderId(message?.providerId);
	}

	function assistantCheckpointId(message, providerId = '') {
		if (!message || message.role !== 'assistant') return '';
		const provider = resolveMessageRuntimeProvider(message, providerId);
		const assistantMessageId = String(message.assistantMessageId || '').trim();
		const runtimeTurnId = String(message.runtimeTurnId || '').trim();
		const localId = String(message.id || '').trim();
		if (provider === 'claude') {
			return assistantMessageId || runtimeTurnId || localId;
		}
		if (provider === 'codex') {
			return runtimeTurnId || assistantMessageId || localId;
		}
		return assistantMessageId || runtimeTurnId || localId;
	}

	function applyRuntimeTurnMetadataToAssistant(message, event, fallbackProviderId = '') {
		const providerId = resolveMessageRuntimeProvider(message, event?.provider || event?.providerId || fallbackProviderId);
		const eventTurnId = String(event?.turnId || '').trim();
		const eventAssistantId = String(event?.assistantMessageId || '').trim();
		const assistantMessageId = eventAssistantId
			|| (providerId === 'claude' ? eventTurnId : '')
			|| message.assistantMessageId
			|| null;
		const runtimeTurnId = eventTurnId
			|| (providerId === 'codex' ? eventAssistantId : '')
			|| message.runtimeTurnId
			|| null;
		return {
			...message,
			assistantMessageId,
			runtimeTurnId,
			runtimeThreadId: event?.threadId || message.runtimeThreadId || null,
			runtimeProviderId: providerId || message.runtimeProviderId || fallbackProviderId || null,
		};
	}

	function resolveRuntimeProviderForTab(tab, sourceSettings = {}) {
		const tabProvider = normalizeRuntimeProviderId(tab?.providerId);
		if (tabProvider) return tabProvider;
		const tabModel = String(tab?.model || '').trim();
		if (tabModel) {
			const tabModelProvider = normalizeRuntimeProviderId(modelToProvider(tabModel, sourceSettings));
			if (tabModelProvider) return tabModelProvider;
		}
		const modeProvider = normalizeRuntimeProviderId(sourceSettings?.runtimeMode);
		if (modeProvider) return modeProvider;
		const settingsModel = String(sourceSettings?.model || '').trim();
		return normalizeRuntimeProviderId(sourceSettings?.provider)
			|| (settingsModel ? normalizeRuntimeProviderId(modelToProvider(settingsModel, sourceSettings)) : '')
			|| 'claude';
	}

	function isRuntimeWaitingBlock(block) {
		return block?.runtimeWaiting === true || String(block?.id || '').startsWith('runtime-waiting');
	}

	function removeRuntimeWaitingBlocksFromLastAssistant(tab) {
		const messages = [...(tab.messages || [])];
		for (let index = messages.length - 1; index >= 0; index -= 1) {
			const message = messages[index];
			if (message?.role !== 'assistant') continue;
			const blocks = message.contentBlocks || [];
			const nextBlocks = blocks.filter((block) => !isRuntimeWaitingBlock(block));
			if (nextBlocks.length === blocks.length) return tab;
			messages[index] = { ...message, contentBlocks: nextBlocks };
			return { ...tab, messages };
		}
		return tab;
	}

	function finiteNonNegativeNumber(value) {
		const number = Number(value);
		return Number.isFinite(number) && number >= 0 ? number : null;
	}

	function elapsedWholeSeconds(startTime, endTime = Date.now()) {
		const start = Number(startTime);
		const end = Number(endTime);
		if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
		return Math.max(0, Math.floor((end - start) / 1000));
	}

	function elapsedRoundedSeconds(startTime, endTime = Date.now()) {
		const start = Number(startTime);
		const end = Number(endTime);
		if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
		return Math.max(0, Math.round((end - start) / 1000));
	}

	function parseTimestampMs(value) {
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		if (typeof value !== 'string' || !value.trim()) return null;
		const parsed = Date.parse(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	function runtimeDoneDurationSeconds(event = {}) {
		const directSeconds = finiteNonNegativeNumber(
			event.durationSeconds
			?? event.duration_seconds
			?? event.raw?.durationSeconds
			?? event.raw?.params?.durationSeconds
			?? event.raw?.params?.duration_seconds
			?? event.raw?.params?.turn?.durationSeconds
			?? event.raw?.params?.turn?.duration_seconds,
		);
		if (directSeconds !== null) return directSeconds;
		const directMs = finiteNonNegativeNumber(
			event.durationMs
			?? event.duration_ms
			?? event.raw?.durationMs
			?? event.raw?.params?.durationMs
			?? event.raw?.params?.duration_ms
			?? event.raw?.params?.turn?.durationMs
			?? event.raw?.params?.turn?.duration_ms,
		);
		if (directMs !== null) return directMs / 1000;
		const turn = event.turn || event.raw?.params?.turn || {};
		const startedAt = parseTimestampMs(turn.createdAt || turn.created_at || turn.startedAt || turn.started_at);
		const completedAt = parseTimestampMs(turn.completedAt || turn.completed_at || turn.updatedAt || turn.updated_at);
		if (startedAt !== null && completedAt !== null && completedAt >= startedAt) {
			return (completedAt - startedAt) / 1000;
		}
		return null;
	}

	function finalizeStreamingThinkingBlock(block, endedAt = Date.now()) {
		if (!block || block.type !== 'thinking' || block.runtimeStreaming !== true) return block;
		const explicitDuration = finiteNonNegativeNumber(block.durationSeconds);
		const durationSeconds = block.startTime
			? elapsedWholeSeconds(block.startTime, endedAt)
			: explicitDuration ?? 0;
		return {
			...block,
			durationSeconds,
			runtimeStreaming: false,
			endTime: endedAt,
		};
	}

	function finalizeStreamingContentBlock(block, endedAt = Date.now()) {
		if (!block || block.runtimeStreaming !== true) return block;
		if (block.type === 'thinking') return finalizeStreamingThinkingBlock(block, endedAt);
		return { ...block, runtimeStreaming: false, endTime: endedAt };
	}

	function finalizeStreamingThinkingInMessage(message, endedAt = Date.now()) {
		return {
			...message,
			contentBlocks: (message.contentBlocks || []).map((block) => finalizeStreamingThinkingBlock(block, endedAt)),
		};
	}

	function finalizeStreamingThinkingInLastAssistant(tab, endedAt = Date.now()) {
		return updateLastAssistant(tab, (message) => finalizeStreamingThinkingInMessage(message, endedAt));
	}

	function completeRuntimeAssistantMessage(message, event = {}) {
		const endedAt = Date.now();
		const contentBlocks = (message.contentBlocks || []).map((block) => finalizeStreamingContentBlock(block, endedAt));
		const hasCompactBoundary = contentBlocks.some((block) => block.type === 'context_compacted');
		const explicitDuration = runtimeDoneDurationSeconds(event);
		const elapsedDuration = elapsedRoundedSeconds(message.runtimeStartedAt || message.timestamp, endedAt);
		return {
			...message,
			durationSeconds: hasCompactBoundary ? 0 : explicitDuration ?? elapsedDuration,
			runtimeCompletedAt: endedAt,
			contentBlocks,
		};
	}

	function hasQueuedTurn(tab) {
		return Boolean(String(tab?.queuedText || '').trim() || (Array.isArray(tab?.queuedImages) && tab.queuedImages.length > 0));
	}

	function restoreCancelledQueueInput(tab, currentInput = '') {
		return appendMarkdownSnippet(currentInput, tab?.queuedDisplayText || tab?.queuedText || '');
	}

	function createCancelledTabState(tab) {
		const withoutWaiting = removeRuntimeWaitingBlocksFromLastAssistant(tab);
		const interrupted = updateLastAssistant(withoutWaiting, (message) => ({
			...completeRuntimeAssistantMessage(message),
			isInterrupt: true,
		}));
		return {
			...interrupted,
			isStreaming: false,
			queuedText: '',
			queuedDisplayText: '',
			queuedContextChips: [],
			queuedImages: [],
			queuedContext: null,
			imageChips: [
				...(Array.isArray(tab?.queuedImages) ? tab.queuedImages : []),
				...(Array.isArray(tab?.imageChips) ? tab.imageChips : []),
			],
		};
	}

	function planImplementationPrompt(plan) {
		const content = String(plan || '').trim();
		return content ? `Implement this plan:\n\n${content}` : 'Implement the approved plan.';
	}

	function normalizePlanDecisionForRuntime(block, decision) {
		const rawType = String(decision?.type || 'cancel').trim();
		if (rawType === 'approve-new-session') {
			return {
				type: 'approve-new-session',
				planContent: String(decision?.planContent || '').trim() || planImplementationPrompt(block?.plan),
			};
		}
		if (rawType === 'approve' || rawType === 'implement') {
			return { type: 'approve' };
		}
		if (rawType === 'feedback' || rawType === 'revise') {
			return {
				type: 'feedback',
				text: String(decision?.text || '').trim() || 'Continue planning.',
			};
		}
		return { type: 'cancel' };
	}

	function createPlanNewSessionTab(tab, planContent, settings) {
		const model = tab?.model || settings?.model || 'sonnet';
		const next = createEmptyTab(tab?.index || 1, { ...(settings || {}), model });
		return {
			...next,
			id: tab?.id || next.id,
			index: tab?.index || next.index,
			providerId: tab?.providerId || next.providerId,
			model,
			workspace: tab?.workspace || settings?.workspace || next.workspace || '',
			queuedText: String(planContent || '').trim() || planImplementationPrompt(''),
			queuedDisplayText: String(planContent || '').trim() || planImplementationPrompt(''),
			queuedContextChips: [],
		};
	}

	function messageHasRenderableRuntimeContent(message) {
		return (message?.contentBlocks || []).some((block) => {
			if (!block || isRuntimeWaitingBlock(block)) return false;
			if (block.type === 'text' || block.type === 'thinking') {
				return String(block.content || '').trim().length > 0;
			}
			return ['tool_use', 'subagent', 'context_compacted', 'ask_user', 'permission', 'plan_approval'].includes(block.type);
		});
	}

	const INLINE_INTERACTION_BLOCK_TYPES = new Set(['ask_user', 'permission', 'plan_approval']);

	function isInlineInteractionBlock(block) {
		return !!block && INLINE_INTERACTION_BLOCK_TYPES.has(block.type);
	}

	function findActiveInlineInteractionBlock(tab) {
		const messages = Array.isArray(tab?.messages) ? tab.messages : [];
		for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
			const message = messages[messageIndex];
			const blocks = Array.isArray(message?.contentBlocks) ? message.contentBlocks : [];
			for (let blockIndex = blocks.length - 1; blockIndex >= 0; blockIndex -= 1) {
				const block = blocks[blockIndex];
				if (isInlineInteractionBlock(block)) {
					return {
						block,
						blockId: block.id || '',
						messageId: message.id || '',
					};
				}
			}
		}
		return null;
	}

	function filterInlineInteractionBlocks(blocks, hiddenBlockId) {
		const hidden = String(hiddenBlockId || '');
		if (!hidden) return Array.isArray(blocks) ? blocks : [];
		return (Array.isArray(blocks) ? blocks : []).filter((block) => block?.id !== hidden);
	}

	function lastAssistantHasRenderableRuntimeContent(tab) {
		for (let index = (tab.messages || []).length - 1; index >= 0; index -= 1) {
			const message = tab.messages[index];
			if (message?.role !== 'assistant') continue;
			return messageHasRenderableRuntimeContent(message);
		}
		return false;
	}

	function lastAssistantWasInterrupted(tab) {
		for (let index = (tab?.messages || []).length - 1; index >= 0; index -= 1) {
			const message = tab.messages[index];
			if (message?.role !== 'assistant') continue;
			return message.isInterrupt === true;
		}
		return false;
	}

	function appendRuntimeEmptyResponseDiagnostic(tab) {
		return appendBlockToLastAssistant(tab, {
			type: 'text',
			id: makeId('runtime-empty-response'),
			content: 'Runtime finished without any visible response content. Check the sidebar log for the missing event boundary.',
		});
	}

	function systemAssistantMessage(text) {
		const msg = assistantMessage();
		msg.content = text;
		msg.contentBlocks = [{ type: 'text', id: makeId('block'), content: text }];
		msg.durationSeconds = 1;
		return msg;
	}

	function createRuntimeTestTab(options = {}) {
		const providerId = options.providerId || 'codex';
		return {
			id: options.id || 'runtime-test-tab',
			title: options.title || 'Runtime Test',
			providerId,
			runtimeProviderId: providerId,
			workspace: options.workspace || '',
			model: options.model || '',
			messages: [
				userMessage(options.userText || 'Test question'),
				assistantMessageWithRuntimeWaiting(providerId),
			],
			isStreaming: true,
		};
	}

	const RUNTIME_CHUNK_FLUSH_MAX_DELAY_MS = 48;
	const RUNTIME_CHUNK_FLUSH_HIGH_WATERMARK = 96;

	function runtimeChunkMergeKind(chunk) {
		if (!chunk || typeof chunk !== 'object') return '';
		if (chunk.type === 'thinking') return 'thinking';
		if (chunk.type === 'text' || chunk.type === 'text_final') return 'text';
		return '';
	}

	function runtimeChunkMetaKeys(chunk) {
		return Object.keys(chunk || {})
			.filter((key) => key !== 'type' && key !== 'content')
			.sort();
	}

	function runtimeChunkMetaValueEquals(left, right, key) {
		const leftValue = left?.[key];
		const rightValue = right?.[key];
		if (leftValue === rightValue) return true;
		if (!leftValue || !rightValue) return false;
		if (typeof leftValue === 'object' || typeof rightValue === 'object') {
			try {
				return JSON.stringify(leftValue) === JSON.stringify(rightValue);
			}
			catch {
				return false;
			}
		}
		return false;
	}

	function canMergeRuntimeChunks(left, right) {
		const kind = runtimeChunkMergeKind(left);
		if (!kind || kind !== runtimeChunkMergeKind(right)) return false;
		const leftKeys = runtimeChunkMetaKeys(left);
		const rightKeys = runtimeChunkMetaKeys(right);
		if (leftKeys.length !== rightKeys.length) return false;
		for (let index = 0; index < leftKeys.length; index += 1) {
			if (leftKeys[index] !== rightKeys[index]) return false;
			if (!runtimeChunkMetaValueEquals(left, right, leftKeys[index])) return false;
		}
		return true;
	}

	function mergeRuntimeChunks(left, right) {
		return {
			...left,
			...right,
			type: right.type || left.type,
			content: `${left.content || ''}${right.content || ''}`,
		};
	}

	function coalesceRuntimeChunks(chunks) {
		const coalesced = [];
		for (const chunk of chunks || []) {
			if (!chunk || typeof chunk !== 'object') continue;
			const lastIndex = coalesced.length - 1;
			const last = coalesced[lastIndex];
			if (last && canMergeRuntimeChunks(last, chunk)) {
				coalesced[lastIndex] = mergeRuntimeChunks(last, chunk);
			}
			else {
				coalesced.push(chunk);
			}
		}
		return coalesced;
	}

	function summarizeRuntimeChunkTypes(chunks, limit = 24) {
		const typeCounts = {};
		const types = [];
		for (const chunk of chunks || []) {
			const type = chunk?.type || '';
			if (!type) continue;
			typeCounts[type] = (typeCounts[type] || 0) + 1;
			if (types.length < limit) types.push(type);
		}
		return {
			types,
			typeCounts,
			truncatedTypes: Math.max(0, Object.values(typeCounts).reduce((sum, count) => sum + count, 0) - types.length),
		};
	}

	function groupRuntimeChunkItemsByTab(items) {
		const orderedTabIds = [];
		const grouped = new Map();
		for (const item of items || []) {
			if (!item?.tabId || !item.chunk) continue;
			if (!grouped.has(item.tabId)) {
				grouped.set(item.tabId, []);
				orderedTabIds.push(item.tabId);
			}
			grouped.get(item.tabId).push(item.chunk);
		}
		return orderedTabIds.map((tabId) => ({
			tabId,
			chunks: coalesceRuntimeChunks(grouped.get(tabId)),
		}));
	}

	function applyRuntimeChunksForTesting(tab, chunks, settings = {}) {
		return coalesceRuntimeChunks(chunks).reduce((nextTab, chunk) => applyRuntimeChunk(nextTab, chunk, settings), tab);
	}

	function applyRuntimeEventsForTesting(tab, events, settings = {}) {
		let nextTab = tab;
		let queuedChunks = [];
		const flushQueuedChunks = () => {
			if (!queuedChunks.length) return;
			nextTab = applyRuntimeChunksForTesting(nextTab, queuedChunks, settings);
			queuedChunks = [];
		};
		for (const event of events || []) {
			if (!event || typeof event !== 'object') continue;
			if (event.type === 'thread') {
				nextTab = {
					...nextTab,
					runtimeSessionKey: event.sessionKey || nextTab.runtimeSessionKey || nextTab.historyId || nextTab.id,
					runtimeThreadId: event.threadId || nextTab.runtimeThreadId || null,
					runtimeProviderId: event.provider || nextTab.providerId || null,
					runtimeFork: event.threadId ? null : nextTab.runtimeFork,
				};
				continue;
			}
			if (event.type === 'turn-started') {
				const updated = updateLastAssistant(nextTab, (message) => ({
					...message,
					runtimeTurnId: event.turnId || message.runtimeTurnId || null,
					runtimeThreadId: event.threadId || nextTab.runtimeThreadId || message.runtimeThreadId || null,
					runtimeProviderId: nextTab.runtimeProviderId || nextTab.providerId || null,
				}));
				nextTab = { ...updated, isStreaming: true };
				continue;
			}
			if (event.type === 'turn-metadata') {
				nextTab = updateLastAssistant(nextTab, (message) => applyRuntimeTurnMetadataToAssistant(message, {
					...event,
					threadId: event.threadId || nextTab.runtimeThreadId || message.runtimeThreadId || null,
				}, nextTab.runtimeProviderId || nextTab.providerId || ''));
				continue;
			}
			if (event.type === 'chunk') {
				queuedChunks.push(event.chunk);
				continue;
			}
			if (event.type === 'context_compacted') {
				queuedChunks.push({ type: 'context_compacted' });
				continue;
			}
			if (event.type === 'approval') {
				flushQueuedChunks();
				nextTab = appendBlockToLastAssistant(
					removeRuntimeWaitingBlocksFromLastAssistant(nextTab),
					approvalToBlock(event.approval),
				);
				continue;
			}
			if (event.type === 'approval_resolved') {
				flushQueuedChunks();
				nextTab = removeResolvedRuntimeApproval(nextTab, event);
				continue;
			}
			if (event.type === 'error') {
				flushQueuedChunks();
				nextTab = appendBlockToLastAssistant(removeRuntimeWaitingBlocksFromLastAssistant(nextTab), {
					type: 'text',
					id: makeId('runtime-error'),
					content: `Runtime error: ${event.content || 'Unknown error'}`,
				});
				nextTab = { ...nextTab, isStreaming: false };
				continue;
			}
			if (event.type === 'done') {
				flushQueuedChunks();
				const withoutWaiting = removeRuntimeWaitingBlocksFromLastAssistant(nextTab);
				const completed = updateLastAssistant(withoutWaiting, (message) => completeRuntimeAssistantMessage(message, event));
				nextTab = { ...completed, isStreaming: false };
				if (!lastAssistantHasRenderableRuntimeContent(nextTab) && !lastAssistantWasInterrupted(nextTab)) {
					nextTab = appendRuntimeEmptyResponseDiagnostic(nextTab);
				}
			}
		}
		return nextTab;
	}

	function updateTab(tabs, tabId, updater) {
		return tabs.map((tab) => (tab.id === tabId ? updater(tab) : tab));
	}

	function appendBlockToLastAssistant(tab, block) {
		const messages = [...tab.messages];
		let index = messages.length - 1;
		if (!messages[index] || messages[index].role !== 'assistant') {
			messages.push(assistantMessage());
			index = messages.length - 1;
		}
		const target = { ...messages[index] };
		target.contentBlocks = [...(target.contentBlocks || []), block];
		if (block.type === 'text') target.content = `${target.content || ''}${block.content || ''}`;
		messages[index] = target;
		return { ...tab, messages };
	}

	function updateLastAssistant(tab, updater) {
		const messages = [...tab.messages];
		let index = messages.length - 1;
		if (!messages[index] || messages[index].role !== 'assistant') {
			messages.push(assistantMessage());
			index = messages.length - 1;
		}
		messages[index] = updater(messages[index]);
		return { ...tab, messages };
	}

	function updateLastUser(tab, updater) {
		const messages = [...tab.messages];
		for (let index = messages.length - 1; index >= 0; index -= 1) {
			if (messages[index]?.role !== 'user') continue;
			messages[index] = updater(messages[index]);
			return { ...tab, messages };
		}
		return tab;
	}

	function capRuntimeText(value, maxLength) {
		return truncateMiddleText(String(value || ''), maxLength);
	}

	function sanitizeRuntimePayloadValue(value, maxStringLength = MAX_RUNTIME_TOOL_INPUT_STRING_LENGTH, depth = 0) {
		if (value === null || value === undefined) return value;
		if (typeof value === 'string') return capRuntimeText(value, maxStringLength);
		if (typeof value === 'number' || typeof value === 'boolean') return value;
		if (Array.isArray(value)) {
			if (depth >= MAX_RUNTIME_TOOL_INPUT_DEPTH) return value.length ? ['...[truncated]...'] : [];
			const items = value.slice(0, MAX_RUNTIME_TOOL_INPUT_ARRAY_ITEMS)
				.map((item) => sanitizeRuntimePayloadValue(item, maxStringLength, depth + 1));
			if (value.length > MAX_RUNTIME_TOOL_INPUT_ARRAY_ITEMS) {
				items.push(`... ${value.length - MAX_RUNTIME_TOOL_INPUT_ARRAY_ITEMS} more item(s) omitted ...`);
			}
			return items;
		}
		if (typeof value === 'object') {
			if (depth >= MAX_RUNTIME_TOOL_INPUT_DEPTH) return { truncated: true };
			const output = {};
			const entries = Object.entries(value).slice(0, MAX_RUNTIME_TOOL_INPUT_OBJECT_KEYS);
			for (const [key, item] of entries) {
				output[key] = sanitizeRuntimePayloadValue(item, maxStringLength, depth + 1);
			}
			const omitted = Object.keys(value).length - entries.length;
			if (omitted > 0) output.__truncatedKeys = omitted;
			return output;
		}
		return String(value);
	}

	function sanitizeRuntimeToolInput(input) {
		const normalized = normalizedToolInput(input);
		return sanitizeRuntimePayloadValue(normalized, MAX_RUNTIME_TOOL_INPUT_STRING_LENGTH);
	}

	function stringifyRuntimeResultForState(value) {
		if (typeof value === 'string') return capRuntimeText(value, MAX_RUNTIME_TOOL_RESULT_LENGTH);
		try {
			return capRuntimeText(JSON.stringify(sanitizeRuntimePayloadValue(value, MAX_RUNTIME_TOOL_RESULT_LENGTH), null, 2), MAX_RUNTIME_TOOL_RESULT_LENGTH);
		}
		catch {
			return capRuntimeText(String(value || ''), MAX_RUNTIME_TOOL_RESULT_LENGTH);
		}
	}

	function normalizeRuntimeDiffLine(line) {
		const type = ['insert', 'delete', 'equal'].includes(line?.type) ? line.type : 'equal';
		return {
			...line,
			type,
			text: truncateEndText(String(line?.text || ''), MAX_RUNTIME_DIFF_LINE_LENGTH),
		};
	}

	function capRuntimeDiffLines(lines) {
		const source = Array.isArray(lines) ? lines : [];
		const output = source.slice(0, MAX_RUNTIME_DIFF_LINES).map(normalizeRuntimeDiffLine);
		const omitted = source.length - output.length;
		if (omitted > 0 && output.length < MAX_RUNTIME_DIFF_LINES + 1) {
			output.push({ type: 'equal', text: `... ${omitted} diff line(s) omitted ...` });
		}
		return output;
	}

	function splitRuntimeDiffSourceLines(value) {
		return String(value || '').split(/\r?\n/).slice(0, MAX_RUNTIME_DIFF_LINES);
	}

	function appendTextDeltaToLastAssistant(tab, content) {
		if (!content) return tab;
		return updateLastAssistant(tab, (message) => {
			const blocks = [...(message.contentBlocks || [])];
			const last = blocks[blocks.length - 1];
			const nextContent = capRuntimeText(`${message.content || ''}${content}`, MAX_RUNTIME_ASSISTANT_TEXT_LENGTH);
			if (last?.type === 'text' && last.runtimeStreaming === true) {
				blocks[blocks.length - 1] = {
					...last,
					content: capRuntimeText(`${last.content || ''}${content}`, MAX_RUNTIME_ASSISTANT_TEXT_LENGTH),
				};
			}
			else {
				blocks.push({ type: 'text', id: makeId('runtime-text'), content: capRuntimeText(content, MAX_RUNTIME_ASSISTANT_TEXT_LENGTH), runtimeStreaming: true });
			}
			return {
				...message,
				content: nextContent,
				contentBlocks: blocks,
			};
		});
	}

	function appendThinkingDeltaToLastAssistant(tab, content) {
		if (!content) return tab;
		return updateLastAssistant(tab, (message) => {
			const blocks = [...(message.contentBlocks || [])];
			const last = blocks[blocks.length - 1];
			if (last?.type === 'thinking' && last.runtimeStreaming === true) {
				blocks[blocks.length - 1] = {
					...last,
					startTime: last.startTime || Date.now(),
					content: capRuntimeText(`${last.content || ''}${content}`, MAX_RUNTIME_THINKING_TEXT_LENGTH),
				};
			}
			else {
				blocks.push({
					type: 'thinking',
					id: makeId('runtime-thinking'),
					label: 'Thinking',
					content: capRuntimeText(content, MAX_RUNTIME_THINKING_TEXT_LENGTH),
					durationSeconds: 0,
					runtimeStreaming: true,
					startTime: Date.now(),
				});
			}
			return { ...message, contentBlocks: blocks };
		});
	}

	const AGENT_LIFECYCLE_TOOLS = new Set(['spawn_agent', 'send_input', 'wait', 'wait_agent', 'resume_agent', 'close_agent']);

	function isAgentLifecycleToolName(name) {
		return AGENT_LIFECYCLE_TOOLS.has(String(name || ''));
	}

	function normalizeToolName(name) {
		const value = String(name || 'Tool');
		if (value === 'bash' || value === 'commandExecution') return 'Bash';
		if (value === 'file_change' || value === 'fileChange') return 'apply_patch';
		if (value === 'web_search' || value === 'webSearch') return 'WebSearch';
		if (value === 'tool_search' || value === 'toolSearch') return 'ToolSearch';
		return value;
	}

	function toolIconForName(name) {
		const value = String(name || '');
		if (value.startsWith('mcp__')) return 'wrench';
		const explicit = {
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
		if (explicit[value]) return explicit[value];
		return 'wrench';
	}

	function parseToolSearchQuery(query) {
		const value = String(query || '');
		const body = value.startsWith('select:') ? value.slice('select:'.length) : value;
		return body.split(',').map((item) => item.trim()).filter(Boolean).join(', ');
	}

	function summarizeWriteStdinInput(input) {
		const sessionId = input.session_id ?? input.sessionId;
		const chars = typeof input.chars === 'string' ? input.chars.replace(/\n/g, '\\n') : '';
		if (chars) {
			const preview = chars.length > 24 ? `${chars.slice(0, 24)}...` : chars;
			return sessionId ? `#${sessionId} ${preview}` : preview;
		}
		return sessionId ? `#${sessionId}` : '';
	}

	function truncateToolSummary(text, maxLength) {
		const value = String(text || '');
		return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
	}

	function summarizeAgentLifecycleInput(name, input) {
		if (name === 'spawn_agent') {
			return truncateToolSummary(input?.message || input?.prompt || input?.description || '', 50);
		}
		if (name === 'send_input') {
			return truncateToolSummary(input?.message || input?.input || '', 40);
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

	function summarizeApplyPatchInput(input) {
		const patchText = typeof input.patch === 'string' ? input.patch : '';
		const patchFiles = [...patchText.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)]
			.map((match) => match[1]?.trim())
			.filter(Boolean);
		const changeFiles = Array.isArray(input.changes)
			? input.changes.map((change) => change?.path).filter(Boolean)
			: [];
		const files = [...new Set([...patchFiles, ...changeFiles])];
		if (files.length === 0) return patchText ? 'patch' : '';
		if (files.length === 1) return pathBaseName(files[0]);
		return `${files.length} files`;
	}

	function summarizeToolInput(name, input) {
		const normalizedName = normalizeToolName(name);
		if (normalizedName === 'apply_patch') return summarizeApplyPatchInput(input || {}) || 'apply_patch';
		if (isAgentLifecycleToolName(normalizedName)) return summarizeAgentLifecycleInput(normalizedName, input || {});
		if (normalizedName === 'Read') return pathBaseName(input?.file_path || input?.path || '') || 'file';
		if (normalizedName === 'Glob' || normalizedName === 'Grep') return input?.pattern || normalizedName;
		if (normalizedName === 'LS') return pathBaseName(input?.path || '.') || '.';
		if (normalizedName === 'Skill') return input?.skill || '';
		if (normalizedName === 'ToolSearch') return parseToolSearchQuery(input?.query) || 'tools';
		if (normalizedName === 'write_stdin') return summarizeWriteStdinInput(input || {}) || 'write_stdin';
		if (input?.command) return input.command;
		if (input?.cwd) return input.cwd;
		if (input?.query) return input.query;
		if (input?.url) return input.url;
		if (input?.server || input?.tool) return [input.server, input.tool].filter(Boolean).join(':');
		return normalizedName;
	}

	function formatToolLines(input) {
		if (!input || typeof input !== 'object') return [];
		const lines = [];
		if (input.command) lines.push({ text: input.command, wrap: true });
		if (input.cwd) lines.push({ text: `cwd: ${input.cwd}`, wrap: true });
		if (input.query) lines.push({ text: `query: ${input.query}`, wrap: true });
		if (input.url) lines.push({ text: `url: ${input.url}`, wrap: true });
		if (Array.isArray(input.changes)) lines.push({ text: `${input.changes.length} file change(s)`, wrap: true });
		return lines;
	}

	function normalizedToolInput(input) {
		return input && typeof input === 'object' && !Array.isArray(input) ? input : {};
	}

	const RUNTIME_TOOLS_SKIP_BLOCKED_DETECTION = new Set(['EnterPlanMode', 'ExitPlanMode', 'AskUserQuestion']);

	function isBlockedRuntimeToolResult(content, isError, toolName) {
		const name = normalizeToolName(toolName || '');
		if (RUNTIME_TOOLS_SKIP_BLOCKED_DETECTION.has(name)) return false;
		const text = stringifyRuntimeResultForState(content);
		const lower = text.toLowerCase();
		if (lower.includes('outside the vault')) return true;
		if (lower.includes('access denied')) return true;
		if (lower.includes('user denied')) return true;
		if (lower.includes('approval')) return true;
		if (isError && lower.includes('deny')) return true;
		return false;
	}

	function runtimeToolFilePath(input) {
		return typeof input.file_path === 'string' && input.file_path.trim()
			? input.file_path
			: typeof input.path === 'string' && input.path.trim()
				? input.path
				: 'file';
	}

	function runtimeStructuredPatchToDiffLines(hunks) {
		const diffLines = [];
		for (const hunk of Array.isArray(hunks) ? hunks : []) {
			let oldLineNum = Number(hunk?.oldStart || 1);
			let newLineNum = Number(hunk?.newStart || 1);
			for (const rawLine of Array.isArray(hunk?.lines) ? hunk.lines : []) {
				const line = String(rawLine || '');
				const prefix = line[0];
				const text = line.slice(1);
				if (prefix === '+') diffLines.push({ type: 'insert', text, newLineNum: newLineNum++ });
				else if (prefix === '-') diffLines.push({ type: 'delete', text, oldLineNum: oldLineNum++ });
				else diffLines.push({ type: 'equal', text, oldLineNum: oldLineNum++, newLineNum: newLineNum++ });
			}
			if (diffLines.length >= MAX_RUNTIME_DIFF_LINES) break;
		}
		return capRuntimeDiffLines(diffLines);
	}

	function runtimeReplacementPair(value) {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
		const oldText = value.oldText ?? value.old_text ?? value.old_string;
		const newText = value.newText ?? value.new_text ?? value.new_string;
		return typeof oldText === 'string' && typeof newText === 'string' ? { oldText, newText } : null;
	}

	function runtimeEditPairs(input) {
		const topLevelPair = runtimeReplacementPair(input);
		if (topLevelPair) return [topLevelPair];
		if (!Array.isArray(input.edits)) return [];
		return input.edits.map(runtimeReplacementPair).filter(Boolean);
	}

	function runtimeReplacementDiffLines(pairs) {
		const diffLines = [];
		let oldLineNum = 1;
		let newLineNum = 1;
		for (const pair of pairs || []) {
			for (const line of splitRuntimeDiffSourceLines(pair.oldText)) {
				diffLines.push({ type: 'delete', text: line, oldLineNum: oldLineNum++ });
				if (diffLines.length >= MAX_RUNTIME_DIFF_LINES) break;
			}
			if (diffLines.length >= MAX_RUNTIME_DIFF_LINES) break;
			for (const line of splitRuntimeDiffSourceLines(pair.newText)) {
				diffLines.push({ type: 'insert', text: line, newLineNum: newLineNum++ });
				if (diffLines.length >= MAX_RUNTIME_DIFF_LINES) break;
			}
			if (diffLines.length >= MAX_RUNTIME_DIFF_LINES) break;
		}
		return capRuntimeDiffLines(diffLines);
	}

	function runtimeUnifiedDiffText(result) {
		if (!result || typeof result !== 'object' || Array.isArray(result)) return '';
		if (typeof result.diff === 'string' && result.diff.trim()) return result.diff;
		if (result.details && typeof result.details === 'object' && typeof result.details.diff === 'string' && result.details.diff.trim()) {
			return result.details.diff;
		}
		return '';
	}

	function runtimeDiffDataFromInput(name, input, filePath) {
		if (name === 'Edit' || name === 'MultiEdit' || name === 'NotebookEdit') {
			const pairs = runtimeEditPairs(input);
			if (pairs.length > 0) {
				const diffLines = runtimeReplacementDiffLines(pairs);
				return { filePath, diffLines, stats: computeDiffStats(diffLines) };
			}
		}
		if (name === 'Write' && typeof input.content === 'string') {
			const diffLines = splitRuntimeDiffSourceLines(input.content).map((text, index) => ({ type: 'insert', text, newLineNum: index + 1 }));
			return { filePath, diffLines, stats: { added: diffLines.length, removed: 0 } };
		}
		return null;
	}

	function extractRuntimeDiffData(name, input, result) {
		const filePath = runtimeToolFilePath(input);
		if (result && typeof result === 'object' && !Array.isArray(result)) {
			if (Array.isArray(result.structuredPatch) && result.structuredPatch.length > 0) {
				const diffLines = capRuntimeDiffLines(runtimeStructuredPatchToDiffLines(result.structuredPatch));
				return { filePath: typeof result.filePath === 'string' && result.filePath.trim() ? result.filePath : filePath, diffLines, stats: computeDiffStats(diffLines) };
			}
			const unifiedDiff = runtimeUnifiedDiffText(result);
			if (unifiedDiff) {
				const diffLines = capRuntimeDiffLines(parsePatchUnifiedDiffLines(unifiedDiff));
				if (diffLines.length > 0) {
					const resultPath = typeof result.filePath === 'string' && result.filePath.trim()
						? result.filePath
						: typeof result.path === 'string' && result.path.trim()
							? result.path
							: filePath;
					return { filePath: resultPath, diffLines, stats: computeDiffStats(diffLines) };
				}
			}
		}
		return runtimeDiffDataFromInput(name, input, filePath);
	}

	function inferRuntimeInputFromResult(name, result) {
		if (name === 'apply_patch' && Array.isArray(result)) {
			return { changes: result };
		}
		if (result && typeof result === 'object' && !Array.isArray(result)) {
			if (name === 'apply_patch' && (Array.isArray(result.changes) || typeof result.patch === 'string')) return result;
			if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(name)
				&& (typeof result.file_path === 'string'
					|| typeof result.path === 'string'
					|| typeof result.content === 'string'
					|| typeof result.old_string === 'string'
					|| Array.isArray(result.edits))) {
				return result;
			}
		}
		return {};
	}

	function applyRuntimeToolDecorations(block, result) {
		const next = { ...block };
		const input = normalizedToolInput(next.input);
		if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(next.name)) {
			delete next.diffData;
			delete next.diffLines;
			delete next.diffStats;
			const diffData = extractRuntimeDiffData(next.name, input, result);
			if (diffData) {
				next.diffData = diffData;
				next.diffLines = diffData.diffLines;
				next.diffStats = diffData.stats;
				next.filePath = diffData.filePath;
			}
		}
		if (next.name === 'apply_patch') {
			delete next.patchFileDiffs;
			delete next.patchStats;
			const patchFileDiffs = getApplyPatchFileDiffs(next);
			if (patchFileDiffs.length > 0) {
				next.patchFileDiffs = patchFileDiffs;
				next.patchStats = patchFileDiffs.reduce((stats, fileDiff) => ({
					added: stats.added + (fileDiff.stats?.added || 0),
					removed: stats.removed + (fileDiff.stats?.removed || 0),
				}), { added: 0, removed: 0 });
			}
		}
		return next;
	}

	function upsertRuntimeTool(tab, chunk) {
		return updateLastAssistant(tab, (message) => {
			const blocks = [...(message.contentBlocks || [])];
			const index = blocks.findIndex((block) => block.type === 'tool_use' && block.id === chunk.id);
			const previous = index >= 0 ? blocks[index] : {};
			const name = normalizeToolName(chunk.name || previous.name);
			const input = sanitizeRuntimeToolInput({
				...normalizedToolInput(previous.input),
				...normalizedToolInput(chunk.input),
			});
			const nextBlock = applyRuntimeToolDecorations({
				...previous,
				type: 'tool_use',
				id: chunk.id || makeId('runtime-tool'),
				name,
				icon: toolIconForName(name),
				summary: summarizeToolInput(name, input),
				status: 'running',
				input,
				command: input.command || '',
				workspace: input.cwd || chunk.workspace || previous.workspace || tab.workspace || '',
				lines: formatToolLines(input),
			}, chunk.toolUseResult);
			if (index >= 0) {
				blocks[index] = nextBlock;
			}
			else {
				blocks.push(nextBlock);
			}
			return { ...message, contentBlocks: blocks };
		});
	}

	function updateRuntimeTool(tab, chunk, updates) {
		return updateLastAssistant(tab, (message) => ({
			...message,
			contentBlocks: (message.contentBlocks || []).map((block) => {
				if (block.type !== 'tool_use' || block.id !== chunk.id) return block;
				return { ...block, ...updates(block) };
			}),
		}));
	}

	function runtimeChunkReplacesWaiting(chunk) {
		if (!chunk || typeof chunk !== 'object') return false;
		if (chunk.type === 'usage') return false;
		if ((chunk.type === 'text' || chunk.type === 'text_final' || chunk.type === 'thinking') && !chunk.content) return false;
		return [
			'text',
			'text_final',
			'thinking',
			'plan',
			'plan_update',
			'plan_completed',
			'context_compacted',
			'tool_use',
			'tool_delta',
			'tool_output',
			'tool_result',
		].includes(chunk.type);
	}

	function runtimeChunkFinalizesThinking(chunk) {
		if (!chunk || typeof chunk !== 'object') return false;
		if (chunk.type === 'thinking' || chunk.type === 'usage') return false;
		return runtimeChunkReplacesWaiting(chunk);
	}

	function applyRuntimeChunk(tab, chunk, settings = {}) {
		if (!chunk || typeof chunk !== 'object') return tab;
		let targetTab = runtimeChunkReplacesWaiting(chunk) ? removeRuntimeWaitingBlocksFromLastAssistant(tab) : tab;
		if (runtimeChunkFinalizesThinking(chunk)) {
			targetTab = finalizeStreamingThinkingInLastAssistant(targetTab);
		}
		if (chunk.type === 'text' || chunk.type === 'text_final') {
			return appendTextDeltaToLastAssistant(targetTab, chunk.content || '');
		}
		if (chunk.type === 'thinking') {
			return appendThinkingDeltaToLastAssistant(targetTab, chunk.content || '');
		}
		if (chunk.type === 'plan' || chunk.type === 'plan_update') {
			const content = chunk.explanation || chunk.content || (chunk.plan ? chunk.plan.map((item) => `${item.status || '-'} ${item.step || ''}`).join('\n') : '');
			return appendBlockToLastAssistant(targetTab, { type: 'thinking', id: makeId('runtime-plan'), label: 'Plan', content, durationSeconds: 0 });
		}
		if (chunk.type === 'plan_completed') {
			return appendBlockToLastAssistant(targetTab, {
				type: 'plan_approval',
				id: makeId('runtime-plan-approval'),
				variant: 'post-plan',
				plan: chunk.plan || 'Plan complete.',
				permissions: [],
			});
		}
		if (chunk.type === 'context_compacted') {
			return {
				...appendBlockToLastAssistant(targetTab, { type: 'context_compacted', id: makeId('runtime-compact') }),
				usage: null,
			};
		}
		if (chunk.type === 'tool_use') {
			return upsertRuntimeTool(targetTab, chunk);
		}
		if (chunk.type === 'tool_delta' || chunk.type === 'tool_output') {
			return updateRuntimeTool(targetTab, chunk, (block) => ({
				result: capRuntimeText(`${block.result || ''}${chunk.content || ''}`, MAX_RUNTIME_TOOL_RESULT_LENGTH),
			}));
		}
		if (chunk.type === 'tool_result') {
			const rawResult = chunk.result ?? chunk.content;
			const result = stringifyRuntimeResultForState(rawResult);
			return updateRuntimeTool(targetTab, chunk, (block) => {
				const name = normalizeToolName(chunk.name || block.name);
				const input = sanitizeRuntimeToolInput({
					...normalizedToolInput(block.input),
					...inferRuntimeInputFromResult(name, rawResult),
					...normalizedToolInput(chunk.input),
				});
				const workspace = input.cwd || chunk.workspace || block.workspace || tab.workspace || '';
				const generatedFiles = mergeGeneratedFilePaths(
					block.generatedFiles,
					extractGeneratedFilePaths(result, workspace),
				);
				const isBlocked = !chunk.isError && isBlockedRuntimeToolResult(rawResult, chunk.isError, name);
				return applyRuntimeToolDecorations({
					...block,
					status: chunk.isError ? 'error' : isBlocked ? 'blocked' : 'completed',
					name,
					icon: toolIconForName(name),
					summary: summarizeToolInput(name, input),
					input,
					command: input.command || block.command || '',
					workspace,
					lines: formatToolLines(input),
					result,
					generatedFiles,
				}, chunk.toolUseResult || rawResult);
			});
		}
		if (chunk.type === 'usage') {
			const usage = normalizeUsageInfo(chunk.usage || {}, chunk.usage?.model || targetTab.model || settings.model, settings);
			return {
				...targetTab,
				usage,
			};
		}
		return targetTab;
	}

	function approvalToBlock(approval) {
		const id = makeId('approval');
		if (approval?.kind === 'exit_plan') {
			return {
				type: 'plan_approval',
				id,
				runtimeApprovalId: approval.id,
				runtimeRequestId: approval.runtimeRequestId || '',
				runtimeThreadId: approval.runtimeThreadId || '',
				variant: 'exit-plan',
				plan: capRuntimeText(approval.plan || '', MAX_APPROVAL_TEXT_LENGTH),
				permissions: Array.isArray(approval.permissions)
					? approval.permissions.map((item) => truncateEndText(String(item || ''), 160)).filter(Boolean).slice(0, MAX_APPROVAL_OPTIONS)
					: [],
			};
		}
		if (approval?.kind === 'question') {
			const questions = (Array.isArray(approval.questions) ? approval.questions : []).slice(0, MAX_APPROVAL_QUESTIONS);
			return {
				type: 'ask_user',
				id,
				runtimeApprovalId: approval.id,
				runtimeRequestId: approval.runtimeRequestId || '',
				runtimeThreadId: approval.runtimeThreadId || '',
				title: truncateEndText(approval.title || 'Question', MAX_APPROVAL_TITLE_LENGTH),
				questions: questions.map((question, index) => ({
					id: truncateEndText(question.id || `q${index + 1}`, 80),
					header: truncateEndText(question.header || `Q${index + 1}`, 40),
					question: capRuntimeText(question.question || approval.description || 'Codex needs more input.', MAX_APPROVAL_TEXT_LENGTH),
					multiSelect: question.multiSelect === true,
					isOther: question.isOther === true,
					isSecret: question.isSecret === true,
					options: Array.isArray(question.options) && question.options.length > 0
						? question.options.slice(0, MAX_APPROVAL_OPTIONS).map((option) => ({
							label: truncateEndText(option.label || option.value || String(option), 120),
							value: truncateEndText(option.value || option.label || String(option), 120),
							description: capRuntimeText(option.description || '', 512),
						}))
						: [{ label: 'Continue', value: 'continue', description: '' }],
				})),
			};
		}
		return {
			type: 'permission',
			id,
			runtimeApprovalId: approval?.id,
			runtimeRequestId: approval?.runtimeRequestId || '',
			runtimeThreadId: approval?.runtimeThreadId || '',
			approvalKind: approval?.kind || '',
			title: truncateEndText(approval?.title || 'Permission required', MAX_APPROVAL_TITLE_LENGTH),
			tool: truncateEndText(approval?.tool || (approval?.kind === 'command' ? 'Bash' : approval?.kind === 'file_change' ? 'Edit' : 'Permission'), 80),
			icon: approval?.icon || (approval?.kind === 'file_change' ? 'file' : 'terminal'),
			reason: capRuntimeText(approval?.description || '', MAX_APPROVAL_TEXT_LENGTH),
			path: truncateEndText(approval?.input?.cwd || approval?.input?.path || '', MAX_MESSAGE_CONTEXT_PATH_LENGTH),
			description: capRuntimeText(approval?.input?.command || approval?.input?.reason || '', MAX_APPROVAL_TEXT_LENGTH),
			decisionOptions: Array.isArray(approval?.decisionOptions) ? approval.decisionOptions.slice(0, MAX_APPROVAL_OPTIONS) : [],
		};
	}

	const DEFAULT_PERMISSION_DECISION_OPTIONS = [
		{ value: 'allow', label: 'Allow once', decision: 'allow' },
		{ value: 'allow-always', label: 'Always allow', decision: 'allow-always' },
		{ value: 'deny', label: 'Deny', decision: 'deny' },
		{ value: 'cancel', label: 'Cancel', decision: 'cancel' },
	];

	function normalizePermissionDecisionOptions(block = {}) {
		const source = Array.isArray(block.decisionOptions) && block.decisionOptions.length > 0
			? block.decisionOptions
			: DEFAULT_PERMISSION_DECISION_OPTIONS;
		return source.map((option, index) => {
			if (Array.isArray(option)) {
				const value = truncateEndText(String(option[0] || `permission-option-${index}`), 120);
				const label = truncateEndText(String(option[1] || value), 120);
				return {
					value,
					label,
					description: '',
					decision: ['allow', 'allow-always', 'deny', 'cancel'].includes(value) ? value : { type: 'select-option', value },
				};
			}
			const value = truncateEndText(String(option?.value || option?.decision || option?.label || `permission-option-${index}`), 120);
			const label = truncateEndText(String(option?.label || value), 120);
			const decision = option?.decision
				|| (['allow', 'allow-always', 'deny', 'cancel'].includes(value) ? value : { type: 'select-option', value });
			return {
				value,
				label,
				description: capRuntimeText(option?.description || '', 512),
				decision,
			};
		}).filter((option) => option.value && option.label);
	}

	function removeResolvedRuntimeApproval(tab, event) {
		const approvalId = String(event?.id || '');
		const requestId = String(event?.requestId || '');
		if (!approvalId && !requestId) return tab;
		let changed = false;
		const messages = (tab.messages || []).map((message) => {
			const blocks = message.contentBlocks || [];
			const nextBlocks = blocks.filter((block) => {
				const matchesApproval = approvalId && block.runtimeApprovalId === approvalId;
				const matchesRequest = requestId && block.runtimeRequestId === requestId;
				return !(matchesApproval || matchesRequest);
			});
			if (nextBlocks.length === blocks.length) return message;
			changed = true;
			return { ...message, contentBlocks: nextBlocks };
		});
		return changed ? { ...tab, messages } : tab;
	}

	function updateContentBlockById(tab, blockId, updater) {
		const id = String(blockId || '').trim();
		if (!id || typeof updater !== 'function') return tab;
		let changed = false;
		const messages = (tab.messages || []).map((message) => {
			const blocks = Array.isArray(message.contentBlocks) ? message.contentBlocks : [];
			let messageChanged = false;
			const nextBlocks = [];
			for (const block of blocks) {
				if (block?.id !== id) {
					nextBlocks.push(block);
					continue;
				}
				messageChanged = true;
				changed = true;
				const nextBlock = updater(block, message);
				if (nextBlock) {
					nextBlocks.push(nextBlock);
				}
			}
			return messageChanged ? { ...message, contentBlocks: nextBlocks } : message;
		});
		return changed ? { ...tab, messages } : tab;
	}

	function removeContentBlockById(tab, blockId) {
		return updateContentBlockById(tab, blockId, () => null);
	}

	function ProviderIcon({ providerId, className, size }) {
		const width = size || 18;
		const height = size || 18;
		if (providerId === 'claude') {
			return h('svg', {
				className: `claudian-provider-icon ${className || ''}`,
				viewBox: '0 -.01 39.5 39.53',
				width,
				height,
				fill: 'none',
				'aria-hidden': 'true',
				'data-provider': 'claude',
			}, h('path', { d: CLAUDE_PATH, fill: 'currentColor' }));
		}
		if (providerId === 'codex') {
			return h('svg', {
				className: `claudian-provider-icon ${className || ''}`,
				viewBox: '-1 -.1 949.1 959.8',
				width,
				height,
				fill: 'none',
				'aria-hidden': 'true',
				'data-provider': 'codex',
			}, h('path', { d: OPENAI_PATH, fill: 'currentColor' }));
		}
		return Icon({ name: 'box', size, className });
	}

	function Icon({ name, size, className }) {
		const common = {
			width: size || 16,
			height: size || 16,
			viewBox: '0 0 24 24',
			fill: 'none',
			stroke: 'currentColor',
			strokeWidth: 2,
			strokeLinecap: 'round',
			strokeLinejoin: 'round',
			className,
			'aria-hidden': 'true',
		};
		const paths = {
			'square-plus': [h('rect', { key: 'r', x: 3, y: 3, width: 18, height: 18, rx: 2 }), h('path', { key: 'p1', d: 'M12 8v8' }), h('path', { key: 'p2', d: 'M8 12h8' })],
			'square-pen': [h('path', { key: 'p1', d: 'M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }), h('path', { key: 'p2', d: 'M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z' })],
			'message-square': [h('path', { key: 'p1', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z' })],
			'message-square-dot': [h('path', { key: 'p1', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z' }), h('circle', { key: 'c1', cx: 12, cy: 10, r: 1 })],
			history: [h('path', { key: 'p1', d: 'M3 12a9 9 0 1 0 3-6.7' }), h('path', { key: 'p2', d: 'M3 3v6h6' }), h('path', { key: 'p3', d: 'M12 7v5l4 2' })],
			settings: [h('path', { key: 'p1', d: 'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z' }), h('path', { key: 'p2', d: 'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 .9-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6.9Z' })],
			copy: [h('rect', { key: 'r1', x: 9, y: 9, width: 13, height: 13, rx: 2 }), h('path', { key: 'p1', d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' })],
			folder: [h('path', { key: 'p1', d: 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z' })],
			file: [h('path', { key: 'p1', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z' }), h('path', { key: 'p2', d: 'M14 2v6h6' })],
			'file-text': [h('path', { key: 'p1', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z' }), h('path', { key: 'p2', d: 'M14 2v6h6' }), h('path', { key: 'p3', d: 'M16 13H8' }), h('path', { key: 'p4', d: 'M16 17H8' }), h('path', { key: 'p5', d: 'M10 9H8' })],
			'file-plus': [h('path', { key: 'p1', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z' }), h('path', { key: 'p2', d: 'M14 2v6h6' }), h('path', { key: 'p3', d: 'M12 18v-6' }), h('path', { key: 'p4', d: 'M9 15h6' })],
			'file-check': [h('path', { key: 'p1', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z' }), h('path', { key: 'p2', d: 'M14 2v6h6' }), h('path', { key: 'p3', d: 'm9 15 2 2 4-5' })],
			'file-pen': [h('path', { key: 'p1', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z' }), h('path', { key: 'p2', d: 'M14 2v6h6' }), h('path', { key: 'p3', d: 'M16.5 13.5 13 17l-2 1 .7-2.1 3.5-3.5a1 1 0 0 1 1.3 1.1Z' })],
			'folder-search': [h('path', { key: 'p1', d: 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v3' }), h('path', { key: 'p2', d: 'M3 7v10a2 2 0 0 0 2 2h6' }), h('circle', { key: 'c1', cx: 16, cy: 16, r: 3 }), h('path', { key: 'p3', d: 'm21 21-2.2-2.2' })],
			image: [h('rect', { key: 'r', x: 3, y: 3, width: 18, height: 18, rx: 2 }), h('circle', { key: 'c', cx: 8.5, cy: 8.5, r: 1.5 }), h('path', { key: 'p', d: 'm21 15-5-5L5 21' })],
			languages: [h('path', { key: 'p1', d: 'm5 8 6 6' }), h('path', { key: 'p2', d: 'm4 14 6-6 2-3' }), h('path', { key: 'p3', d: 'M2 5h12' }), h('path', { key: 'p4', d: 'M7 2h1' }), h('path', { key: 'p5', d: 'm22 22-5-10-5 10' }), h('path', { key: 'p6', d: 'M14 18h6' })],
			upload: [h('path', { key: 'p1', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }), h('path', { key: 'p2', d: 'M17 8 12 3 7 8' }), h('path', { key: 'p3', d: 'M12 3v12' })],
			x: [h('path', { key: 'p1', d: 'M18 6 6 18' }), h('path', { key: 'p2', d: 'm6 6 12 12' })],
			zap: [h('path', { key: 'p1', d: 'M13 2 3 14h8l-1 8 10-12h-8Z' })],
			check: [h('path', { key: 'p1', d: 'M20 6 9 17l-5-5' })],
			terminal: [h('path', { key: 'p1', d: 'm4 17 6-6-6-6' }), h('path', { key: 'p2', d: 'M12 19h8' })],
			'loader-2': [h('path', { key: 'p1', d: 'M21 12a9 9 0 1 1-6.2-8.6' })],
			lock: [h('rect', { key: 'r1', x: 3, y: 11, width: 18, height: 11, rx: 2 }), h('path', { key: 'p1', d: 'M7 11V7a5 5 0 0 1 10 0v4' })],
			unlock: [h('rect', { key: 'r1', x: 3, y: 11, width: 18, height: 11, rx: 2 }), h('path', { key: 'p1', d: 'M7 11V7a5 5 0 0 1 9.9-1' })],
			clock: [h('circle', { key: 'c1', cx: 12, cy: 12, r: 10 }), h('path', { key: 'p1', d: 'M12 6v6l4 2' })],
			bot: [h('path', { key: 'p1', d: 'M12 8V4H8' }), h('rect', { key: 'r1', x: 4, y: 8, width: 16, height: 12, rx: 2 }), h('path', { key: 'p2', d: 'M2 14h2' }), h('path', { key: 'p3', d: 'M20 14h2' }), h('path', { key: 'p4', d: 'M9 13v2' }), h('path', { key: 'p5', d: 'M15 13v2' })],
			list: [h('path', { key: 'p1', d: 'M8 6h13' }), h('path', { key: 'p2', d: 'M8 12h13' }), h('path', { key: 'p3', d: 'M8 18h13' }), h('path', { key: 'p4', d: 'M3 6h.01' }), h('path', { key: 'p5', d: 'M3 12h.01' }), h('path', { key: 'p6', d: 'M3 18h.01' })],
			'list-checks': [h('path', { key: 'p1', d: 'm3 7 2 2 4-4' }), h('path', { key: 'p2', d: 'm3 17 2 2 4-4' }), h('path', { key: 'p3', d: 'M13 6h8' }), h('path', { key: 'p4', d: 'M13 12h8' }), h('path', { key: 'p5', d: 'M13 18h8' })],
			download: [h('path', { key: 'p1', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }), h('path', { key: 'p2', d: 'M7 10l5 5 5-5' }), h('path', { key: 'p3', d: 'M12 15V3' })],
			'help-circle': [h('circle', { key: 'c1', cx: 12, cy: 12, r: 10 }), h('path', { key: 'p1', d: 'M9.1 9a3 3 0 1 1 5.8 1c-.5 1-1.4 1.5-2.1 2.1-.6.5-.8 1-.8 1.9' }), h('path', { key: 'p2', d: 'M12 17h.01' })],
			map: [h('path', { key: 'p1', d: 'M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z' }), h('path', { key: 'p2', d: 'M9 3v15' }), h('path', { key: 'p3', d: 'M15 6v15' })],
			'shield-off': [h('path', { key: 'p1', d: 'M19.7 14A8.2 8.2 0 0 1 12 22s-8-4-8-10V5l4-1.5' }), h('path', { key: 'p2', d: 'M10.4 2.4 12 2l8 3v7a8.7 8.7 0 0 1-.4 2.7' }), h('path', { key: 'p3', d: 'M2 2l20 20' })],
			search: [h('circle', { key: 'c', cx: 11, cy: 11, r: 8 }), h('path', { key: 'p1', d: 'm21 21-4.3-4.3' })],
			'search-check': [h('circle', { key: 'c', cx: 11, cy: 11, r: 8 }), h('path', { key: 'p1', d: 'm21 21-4.3-4.3' }), h('path', { key: 'p2', d: 'm8.5 11 1.7 1.7 3.8-4.2' })],
			pencil: [h('path', { key: 'p1', d: 'M18.4 2.6a2.1 2.1 0 0 1 3 3L8 19l-4 1 1-4Z' })],
			'trash-2': [h('path', { key: 'p1', d: 'M3 6h18' }), h('path', { key: 'p2', d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }), h('path', { key: 'p3', d: 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' }), h('path', { key: 'p4', d: 'M10 11v6' }), h('path', { key: 'p5', d: 'M14 11v6' })],
			plus: [h('path', { key: 'p1', d: 'M5 12h14' }), h('path', { key: 'p2', d: 'M12 5v14' })],
			globe: [h('circle', { key: 'c1', cx: 12, cy: 12, r: 10 }), h('path', { key: 'p1', d: 'M2 12h20' }), h('path', { key: 'p2', d: 'M12 2a15.3 15.3 0 0 1 0 20' }), h('path', { key: 'p3', d: 'M12 2a15.3 15.3 0 0 0 0 20' })],
			'clipboard-paste': [h('path', { key: 'p1', d: 'M15 2H9a2 2 0 0 0-2 2v2h10V4a2 2 0 0 0-2-2Z' }), h('path', { key: 'p2', d: 'M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7' }), h('path', { key: 'p3', d: 'M16 11h6' }), h('path', { key: 'p4', d: 'M19 8v6' })],
			'toggle-left': [h('rect', { key: 'r1', x: 2, y: 7, width: 20, height: 10, rx: 5 }), h('circle', { key: 'c1', cx: 7, cy: 12, r: 3 })],
			'toggle-right': [h('rect', { key: 'r1', x: 2, y: 7, width: 20, height: 10, rx: 5 }), h('circle', { key: 'c1', cx: 17, cy: 12, r: 3 })],
			wrench: [h('path', { key: 'p1', d: 'M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-3-3Z' })],
			'check-circle': [h('path', { key: 'p1', d: 'M22 11.1V12a10 10 0 1 1-5.9-9.1' }), h('path', { key: 'p2', d: 'M22 4 12 14.01l-3-3' })],
			'x-circle': [h('circle', { key: 'c1', cx: 12, cy: 12, r: 10 }), h('path', { key: 'p1', d: 'm15 9-6 6' }), h('path', { key: 'p2', d: 'm9 9 6 6' })],
			'dollar-sign': [h('path', { key: 'p1', d: 'M12 2v20' }), h('path', { key: 'p2', d: 'M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6' })],
			'chevrons-up': [h('path', { key: 'p1', d: 'm17 11-5-5-5 5' }), h('path', { key: 'p2', d: 'm17 18-5-5-5 5' })],
			'chevron-up': [h('path', { key: 'p1', d: 'm18 15-6-6-6 6' })],
			'chevron-right': [h('path', { key: 'p1', d: 'm9 18 6-6-6-6' })],
			'list-tree': [h('path', { key: 'p1', d: 'M21 12H9' }), h('path', { key: 'p2', d: 'M21 6H9' }), h('path', { key: 'p3', d: 'M21 18H9' }), h('path', { key: 'p4', d: 'M3 6h.01' }), h('path', { key: 'p5', d: 'M3 12h.01' }), h('path', { key: 'p6', d: 'M3 18h.01' })],
			'chevron-down': [h('path', { key: 'p1', d: 'm6 9 6 6 6-6' })],
			'chevrons-down': [h('path', { key: 'p1', d: 'm7 6 5 5 5-5' }), h('path', { key: 'p2', d: 'm7 13 5 5 5-5' })],
			'git-fork': [h('circle', { key: 'c1', cx: 6, cy: 3, r: 2 }), h('circle', { key: 'c2', cx: 18, cy: 3, r: 2 }), h('circle', { key: 'c3', cx: 12, cy: 21, r: 2 }), h('path', { key: 'p1', d: 'M6 5v3a6 6 0 0 0 6 6v5' }), h('path', { key: 'p2', d: 'M18 5v3a6 6 0 0 1-6 6' })],
			'rotate-ccw': [h('path', { key: 'p1', d: 'M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.7 2.7L3 8' }), h('path', { key: 'p2', d: 'M3 3v5h5' })],
			'refresh-cw': [h('path', { key: 'p1', d: 'M3 12a9 9 0 0 1 15.5-6.3L21 8' }), h('path', { key: 'p2', d: 'M21 3v5h-5' }), h('path', { key: 'p3', d: 'M21 12a9 9 0 0 1-15.5 6.3L3 16' }), h('path', { key: 'p4', d: 'M3 21v-5h5' })],
			box: [h('path', { key: 'p1', d: 'M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7Z' }), h('path', { key: 'p2', d: 'M3.3 7 12 12l8.7-5' }), h('path', { key: 'p3', d: 'M12 22V12' })],
			openai: [h('circle', { key: 'c1', cx: 12, cy: 12, r: 3 }), h('path', { key: 'p1', d: 'M12 2a5 5 0 0 1 4.6 7' }), h('path', { key: 'p2', d: 'M20.7 7a5 5 0 0 1-2.3 8.4' }), h('path', { key: 'p3', d: 'M17.8 21a5 5 0 0 1-8-3.5' }), h('path', { key: 'p4', d: 'M6.2 20a5 5 0 0 1-1.7-8.5' }), h('path', { key: 'p5', d: 'M2.7 10a5 5 0 0 1 6.8-6.4' })],
		};
		return h('svg', common, paths[name] || paths.box);
	}

	function requestSidebarMode(mode) {
		if (window.parent === window || (mode !== 'ai' && mode !== 'notes' && mode !== 'figures')) {
			return;
		}
		postMessageToHost({
			type: 'pdf-ai-sidebar-mode-request',
			payload: { mode },
		});
	}

	function requestFeatureGuideActivation(featureId) {
		if (chatOnly) return;
		const normalizedFeatureId = String(featureId || '').trim();
		if (window.parent === window || !['translation', 'analysis', 'graph', 'menu', 'notes', 'figures'].includes(normalizedFeatureId)) {
			return;
		}
		postMessageToHost({
			type: 'pdf-ai-feature-guide:activate',
			payload: { featureId: normalizedFeatureId },
		});
	}

	function requestFeatureGuideOpen() {
		if (window.parent === window) {
			return;
		}
		postMessageToHost({ type: 'pdf-ai-feature-guide:open' });
	}

	const FEATURE_GUIDE_OPEN_EVENT = 'pdf-ai-feature-guide:open-local';

	function requestShellThemeChange(theme) {
		const normalizedTheme = parseExplicitTheme(theme);
		if (window.parent === window || !normalizedTheme) {
			return;
		}
		postMessageToHost({
			type: 'pdf-ai-sidebar-theme-change',
			payload: { theme: normalizedTheme },
		});
	}

	function requestAppendToMarkdownNote(markdown) {
		if (window.parent === window || typeof markdown !== 'string' || !markdown.trim()) {
			return;
		}
		postMessageToHost({
			type: 'pdf-ai-notes:append',
			payload: { markdown: markdown.slice(0, 2 * 1024 * 1024) },
		});
	}

	function requestMarkdownNoteClose(markdownNote) {
		if (window.parent === window || !markdownNote?.open) {
			return;
		}
		postMessageToHost({
			type: 'pdf-ai-notes:close-document',
			payload: {
				filePath: String(markdownNote.filePath || ''),
			},
		});
	}

	function sanitizeCodeLanguage(value) {
		return String(value || '').trim().split(/\s+/)[0].replace(/[^\w-]/g, '');
	}

	function isFenceLine(line) {
		return /^```/.test(String(line || '').trim());
	}

	function isHeadingLine(line) {
		return /^#{1,6}\s+\S/.test(String(line || ''));
	}

	function isHorizontalRuleLine(line) {
		return /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(String(line || ''));
	}

	function getListMatch(line) {
		const match = String(line || '').match(/^(\s*)((?:[-*+])|(?:\d+[.)]))\s+(.+)$/);
		if (!match) return null;
		const marker = match[2];
		return {
			indent: match[1].replace(/\t/g, '    ').length,
			ordered: /^\d/.test(marker),
			value: /^\d/.test(marker) ? Number.parseInt(marker, 10) : undefined,
			text: match[3],
		};
	}

	function parseTableRow(line) {
		const trimmed = String(line || '').trim().replace(/^\|/, '').replace(/\|$/, '');
		return trimmed.split('|').map((cell) => cell.trim());
	}

	function isTableSeparator(line) {
		const cells = parseTableRow(line);
		return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')));
	}

	function isTableStart(lines, index) {
		return String(lines[index] || '').includes('|') && isTableSeparator(lines[index + 1] || '');
	}

	function isBlockStart(lines, index) {
		const line = lines[index] || '';
		return isFenceLine(line)
			|| isHorizontalRuleLine(line)
			|| isHeadingLine(line)
			|| /^ {0,3}>\s?/.test(line)
			|| !!getListMatch(line)
			|| isTableStart(lines, index);
	}

	function isEscapedAt(text, index) {
		let slashCount = 0;
		for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) {
			slashCount += 1;
		}
		return slashCount % 2 === 1;
	}

	function findUnescapedDelimiter(text, delimiter, start) {
		let index = Math.max(0, start || 0);
		while (index < text.length) {
			const found = text.indexOf(delimiter, index);
			if (found < 0) return -1;
			if (!isEscapedAt(text, found)) return found;
			index = found + delimiter.length;
		}
		return -1;
	}

	function trimDisplayMathFenceContent(value, opener, closer) {
		const text = String(value || '');
		const trimmed = text.trim();
		if (trimmed.startsWith(opener) && trimmed.endsWith(closer) && trimmed.length >= opener.length + closer.length) {
			return trimmed.slice(opener.length, trimmed.length - closer.length).trim();
		}
		return text.trim();
	}

	function readDisplayMathBlock(lines, startIndex) {
		const firstLine = lines[startIndex] || '';
		const trimmed = firstLine.trim();
		const delimiter = trimmed.startsWith('$$')
			? { opener: '$$', closer: '$$' }
			: trimmed.startsWith('\\[')
				? { opener: '\\[', closer: '\\]' }
				: null;
		if (!delimiter) return null;

		const afterOpener = trimmed.slice(delimiter.opener.length);
		const sameLineClose = findUnescapedDelimiter(afterOpener, delimiter.closer, 0);
		if (sameLineClose >= 0) {
			return {
				block: {
					type: 'math',
					display: true,
					latex: afterOpener.slice(0, sameLineClose).trim(),
				},
				nextIndex: startIndex + 1,
			};
		}

		const contentLines = [afterOpener];
		let index = startIndex + 1;
		while (index < lines.length) {
			const line = lines[index] || '';
			const closeIndex = findUnescapedDelimiter(line, delimiter.closer, 0);
			if (closeIndex >= 0) {
				contentLines.push(line.slice(0, closeIndex));
				return {
					block: {
						type: 'math',
						display: true,
						latex: trimDisplayMathFenceContent(contentLines.join('\n'), delimiter.opener, delimiter.closer),
					},
					nextIndex: index + 1,
				};
			}
			contentLines.push(line);
			index += 1;
		}

		return null;
	}

	function parseMarkdownList(lines, startIndex, baseIndent = null) {
		const first = getListMatch(lines[startIndex]);
		if (!first) return null;
		const indent = Number.isFinite(Number(baseIndent)) ? Number(baseIndent) : first.indent;
		const ordered = first.ordered;
		const items = [];
		let index = startIndex;
		while (index < lines.length && items.length < MAX_MARKDOWN_LIST_ITEMS) {
			const match = getListMatch(lines[index]);
			if (!match || match.indent < indent || match.ordered !== ordered) break;
			if (match.indent > indent) {
				if (!items.length) break;
				const nested = parseMarkdownList(lines, index, match.indent);
				if (!nested) break;
				items[items.length - 1].children.push(nested.block);
				index = nested.nextIndex;
				continue;
			}
			const item = {
				text: truncateMiddleText(match.text, MAX_MARKDOWN_LIST_ITEM_LENGTH),
				value: match.value,
				children: [],
			};
			index += 1;
			while (index < lines.length) {
				const nextLine = lines[index] || '';
				if (!nextLine.trim()) {
					index += 1;
					break;
				}
				const nextMatch = getListMatch(nextLine);
				if (nextMatch) {
					if (nextMatch.indent > indent) {
						const nested = parseMarkdownList(lines, index, nextMatch.indent);
						if (!nested) break;
						item.children.push(nested.block);
						index = nested.nextIndex;
						continue;
					}
					if (nextMatch.indent <= indent) break;
				}
				if (isFenceLine(nextLine) || isHeadingLine(nextLine) || isHorizontalRuleLine(nextLine) || /^ {0,3}>\s?/.test(nextLine) || isTableStart(lines, index)) {
					break;
				}
				item.text = truncateMiddleText(
					`${item.text}\n${nextLine.slice(Math.min(nextLine.length, indent + 2)).trim()}`.trim(),
					MAX_MARKDOWN_LIST_ITEM_LENGTH,
				);
				index += 1;
			}
			items.push(item);
		}
		while (index < lines.length) {
			const match = getListMatch(lines[index]);
			if (!match || match.indent < indent || match.ordered !== ordered) break;
			index += 1;
		}
		return {
			block: { type: 'list', ordered, items },
			nextIndex: index,
		};
	}

	function parseMarkdownBlocks(markdown) {
		const source = truncateMiddleText(String(markdown || ''), MAX_MARKDOWN_SOURCE_LENGTH).replace(/\r\n?/g, '\n');
		const lines = source.split('\n').slice(0, MAX_MARKDOWN_LINES);
		const blocks = [];
		let index = 0;
		while (index < lines.length && blocks.length < MAX_MARKDOWN_BLOCKS) {
			const line = lines[index] || '';
			if (!line.trim()) {
				index += 1;
				continue;
			}

			const displayMath = readDisplayMathBlock(lines, index);
			if (displayMath) {
				blocks.push(displayMath.block);
				index = displayMath.nextIndex;
				continue;
			}

			if (isHorizontalRuleLine(line)) {
				blocks.push({ type: 'hr' });
				index += 1;
				continue;
			}

			if (isFenceLine(line)) {
				const language = sanitizeCodeLanguage(line.trim().slice(3));
				index += 1;
				const codeLines = [];
				let codeLength = 0;
				while (index < lines.length && !isFenceLine(lines[index]) && codeLength < MAX_MARKDOWN_CODE_LENGTH) {
					codeLines.push(lines[index]);
					codeLength += String(lines[index] || '').length + 1;
					index += 1;
				}
				while (index < lines.length && !isFenceLine(lines[index])) index += 1;
				if (index < lines.length) index += 1;
				blocks.push({ type: 'code', language, code: truncateMiddleText(codeLines.join('\n'), MAX_MARKDOWN_CODE_LENGTH) });
				continue;
			}

			const heading = line.match(/^(#{1,6})\s+(.+)$/);
			if (heading) {
				blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
				index += 1;
				continue;
			}

			if (/^ {0,3}>\s?/.test(line)) {
				const quoteLines = [];
				while (index < lines.length && /^ {0,3}>\s?/.test(lines[index] || '')) {
					quoteLines.push((lines[index] || '').replace(/^ {0,3}>\s?/, ''));
					index += 1;
				}
				blocks.push({ type: 'blockquote', text: quoteLines.join('\n') });
				continue;
			}

			if (isTableStart(lines, index)) {
				const headers = parseTableRow(lines[index]);
				index += 2;
				const rows = [];
				while (index < lines.length && rows.length < MAX_MARKDOWN_TABLE_ROWS && String(lines[index] || '').includes('|') && lines[index].trim()) {
					rows.push(parseTableRow(lines[index]));
					index += 1;
				}
				while (index < lines.length && String(lines[index] || '').includes('|') && lines[index].trim()) index += 1;
				blocks.push({ type: 'table', headers, rows });
				continue;
			}

			const listMatch = getListMatch(line);
			if (listMatch) {
				const parsedList = parseMarkdownList(lines, index, listMatch.indent);
				blocks.push(parsedList.block);
				index = parsedList.nextIndex;
				continue;
			}

			const paraLines = [];
			while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
				paraLines.push(lines[index]);
				index += 1;
			}
			if (paraLines.length) {
				blocks.push({ type: 'paragraph', text: paraLines.join('\n') });
			}
			else {
				blocks.push({ type: 'paragraph', text: line });
				index += 1;
			}
		}
		return blocks;
	}

	function parseWikilink(inner) {
		const pipeIndex = String(inner || '').lastIndexOf('|');
		const target = pipeIndex >= 0 ? inner.slice(0, pipeIndex) : inner;
		const display = pipeIndex >= 0 ? inner.slice(pipeIndex + 1) : target.replace(/[#^].*$/, '');
		return { target, display };
	}

	const IMAGE_EMBED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']);

	function isImageEmbedPath(target) {
		const clean = String(target || '').split(/[?#]/)[0].trim();
		const dotIndex = clean.lastIndexOf('.');
		if (dotIndex < 0) return false;
		return IMAGE_EMBED_EXTENSIONS.has(clean.slice(dotIndex + 1).toLowerCase());
	}

	function resolveDisplayImagePath(target, settings) {
		const imagePath = normalizePathText(target).replace(/^\/+/, '');
		const folder = normalizePathText(settings?.mediaFolder || '').replace(/^\/+|\/+$/g, '');
		if (!folder || imagePath.toLowerCase().startsWith(`${folder.toLowerCase()}/`)) {
			return imagePath;
		}
		return `${folder}/${imagePath}`;
	}

	function isExternalLinkTarget(target) {
		return /^(?:https?|mailto):/i.test(String(target || '').trim());
	}

	function openSidebarLinkTarget(event, target, settings) {
		event?.preventDefault?.();
		event?.stopPropagation?.();
		const href = String(target || '').trim();
		if (!href) return;
		if (api?.openPath) {
			api.openPath({
				path: href,
				href,
				workspace: settings?.workspace || '',
			}).then((result) => {
				if (result?.ok || result?.opened) return;
				logRendererEvent('path.open.failed', {
					href,
					workspace: settings?.workspace || '',
					error: result?.error || 'Unknown openPath failure',
				});
			}).catch((error) => {
				logRendererEvent('path.open.failed', {
					href,
					workspace: settings?.workspace || '',
					error: error instanceof Error ? error.message : String(error),
				});
			});
			return;
		}
		if (isExternalLinkTarget(href)) {
			window.open(href, '_blank', 'noopener,noreferrer');
		}
	}

	function FileLink({ target, display, settings }) {
		return h('a', {
			className: 'claudian-file-link internal-link',
			href: target,
			'data-href': target,
			title: target,
			onClick: (event) => openSidebarLinkTarget(event, target, settings),
		}, display || target);
	}

	function ObsidianImageEmbed({ target, alt, original, settings }) {
		if (!isImageEmbedPath(target)) {
			return original;
		}
		const resolvedPath = resolveDisplayImagePath(target, settings);
		return h('span', {
			className: 'claudian-embedded-image-fallback',
			title: resolvedPath,
			'data-resolved-path': resolvedPath,
		}, original);
	}

	function renderWikilinksOnly(text, keyPrefix, settings) {
		const value = String(text || '');
		const nodes = [];
		const regex = /(?<!!)\[\[([^\]]+)\]\]/g;
		let current = 0;
		let match;
		let itemIndex = 0;
		while ((match = regex.exec(value)) !== null) {
			if (match.index > current) nodes.push(value.slice(current, match.index));
			const parsed = parseWikilink(match[1]);
			nodes.push(h(FileLink, {
				key: `${keyPrefix}-wiki-${itemIndex}`,
				target: parsed.target,
				display: parsed.display,
				settings,
			}));
			current = match.index + match[0].length;
			itemIndex += 1;
		}
		if (current < value.length) nodes.push(value.slice(current));
		return nodes;
	}

	function isLikelyDollarMathContent(value) {
		const content = String(value || '').trim();
		if (!content || content.includes('\n')) return false;
		if (/^\d+(?:[.,]\d+)?$/.test(content)) return false;
		if (/^\d[\w\s.,-]*$/.test(content) && !/[\\^_{}=+\-*/<>]/.test(content)) return false;
		if (/\s/.test(content) && !/[\\^_{}=+\-*/<>]/.test(content)) return false;
		return true;
	}

	function findInlineDollarMathToken(text, start) {
		let openIndex = Math.max(0, start || 0);
		while (openIndex < text.length) {
			openIndex = text.indexOf('$', openIndex);
			if (openIndex < 0) return null;
			if (isEscapedAt(text, openIndex) || text[openIndex + 1] === '$' || /\s/.test(text[openIndex + 1] || '')) {
				openIndex += 1;
				continue;
			}

			let closeIndex = openIndex + 1;
			while (closeIndex < text.length) {
				closeIndex = text.indexOf('$', closeIndex);
				if (closeIndex < 0) break;
				if (
					!isEscapedAt(text, closeIndex)
					&& text[closeIndex - 1] !== '$'
					&& !/\s/.test(text[closeIndex - 1] || '')
					&& !/\d/.test(text[closeIndex + 1] || '')
				) {
					const latex = text.slice(openIndex + 1, closeIndex);
					if (isLikelyDollarMathContent(latex)) {
						const raw = text.slice(openIndex, closeIndex + 1);
						return {
							type: 'math',
							index: openIndex,
							order: 1,
							match: [raw, latex],
							display: false,
						};
					}
				}
				closeIndex += 1;
			}
			openIndex += 1;
		}
		return null;
	}

	function findDelimitedMathToken(text, start, opener, closer, display) {
		let openIndex = Math.max(0, start || 0);
		while (openIndex < text.length) {
			openIndex = text.indexOf(opener, openIndex);
			if (openIndex < 0) return null;
			if (isEscapedAt(text, openIndex)) {
				openIndex += opener.length;
				continue;
			}
			const closeIndex = findUnescapedDelimiter(text, closer, openIndex + opener.length);
			if (closeIndex < 0) return null;
			const latex = text.slice(openIndex + opener.length, closeIndex).trim();
			if (latex) {
				const raw = text.slice(openIndex, closeIndex + closer.length);
				return {
					type: 'math',
					index: openIndex,
					order: display ? 1 : 2,
					match: [raw, latex],
					display,
				};
			}
			openIndex += opener.length;
		}
		return null;
	}

	function findNextMathToken(text, start) {
		const candidates = [
			findDelimitedMathToken(text, start, '$$', '$$', true),
			findDelimitedMathToken(text, start, '\\[', '\\]', true),
			findDelimitedMathToken(text, start, '\\(', '\\)', false),
			findInlineDollarMathToken(text, start),
		].filter(Boolean);
		if (!candidates.length) return null;
		return candidates.sort((left, right) => left.index - right.index || left.order - right.order)[0];
	}

	function renderLatexToHtml(latex, displayMode) {
		const renderer = window.katex;
		if (!renderer?.renderToString) return '';
		try {
			return renderer.renderToString(String(latex || ''), {
				displayMode: displayMode === true,
				throwOnError: false,
				strict: 'ignore',
				trust: false,
				output: 'html',
			});
		}
		catch {
			return '';
		}
	}

	function prepareLatexClipboardText(latex) {
		return String(latex || '')
			.trim()
			.replace(/[ \t]*[\r\n]+[ \t]*/g, ' ');
	}

	function MathSpan({ latex, display }) {
		const [copied, setCopied] = useState(false);
		const source = String(latex || '').trim();
		const html = useMemo(() => renderLatexToHtml(source, display), [source, display]);
		const copyLatex = async (event) => {
			event.preventDefault();
			event.stopPropagation();
			const ok = await writeClipboardText(prepareLatexClipboardText(source));
			if (!ok) return;
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1200);
		};
		const className = [
			'claudian-math',
			display ? 'claudian-math-display' : 'claudian-math-inline',
			copied ? 'copied' : '',
		].filter(Boolean).join(' ');
		const isZh = normalizeLocale(document.documentElement.lang) === 'zh-CN';
		const title = copied
			? (isZh ? '已复制 LaTeX' : 'Copied LaTeX')
			: (isZh ? '双击复制 LaTeX' : 'Double-click to copy LaTeX');
		const props = {
			className,
			title,
			'data-latex': source,
			onDoubleClick: copyLatex,
		};
		if (html) {
			return h(display ? 'div' : 'span', {
				...props,
				dangerouslySetInnerHTML: { __html: html },
			});
		}
		return h(display ? 'div' : 'span', props,
			h('code', { className: 'claudian-math-fallback' }, display ? `$$${source}$$` : `$${source}$`),
		);
	}

	function findNextInlineToken(text, start) {
		const patterns = [
			{ type: 'code', regex: /(`+)([\s\S]*?)\1/g },
			{ type: 'imageEmbed', regex: /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g },
			{ type: 'wikilink', regex: /(?<!!)\[\[([^\]]+)\]\]/g },
			{ type: 'link', regex: /(!?)\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g },
			{ type: 'strong', regex: /(\*\*|__)(?=\S)([\s\S]*?\S)\1/g },
			{ type: 'em', regex: /(\*|_)(?=\S)([\s\S]*?\S)\1/g },
		];
		let best = findNextMathToken(text, start);
		for (let order = 0; order < patterns.length; order += 1) {
			const pattern = patterns[order];
			pattern.regex.lastIndex = start;
			const match = pattern.regex.exec(text);
			if (!match) continue;
			if (!best || match.index < best.index || (match.index === best.index && order < best.order)) {
				best = { ...pattern, match, index: match.index, order };
			}
		}
		return best;
	}

	function renderInline(text, keyPrefix, depth, settings) {
		const value = String(text || '');
		if (!value || depth > 6) return value ? [value] : [];
		const nodes = [];
		let current = 0;
		let tokenIndex = 0;
		while (current < value.length) {
			const token = findNextInlineToken(value, current);
			if (!token) {
				nodes.push(...renderWikilinksOnly(value.slice(current), `${keyPrefix}-tail`, settings));
				break;
			}
			if (token.index > current) {
				nodes.push(...renderWikilinksOnly(value.slice(current, token.index), `${keyPrefix}-text-${tokenIndex}`, settings));
			}
			const match = token.match;
			const key = `${keyPrefix}-${token.type}-${tokenIndex}`;
			if (token.type === 'code') {
				nodes.push(h('code', { key }, renderWikilinksOnly(match[2], `${key}-code`, settings)));
			}
			else if (token.type === 'imageEmbed') {
				nodes.push(h(ObsidianImageEmbed, {
					key,
					target: match[1],
					alt: match[2],
					original: match[0],
					settings,
				}));
			}
			else if (token.type === 'wikilink') {
				const parsed = parseWikilink(match[1]);
				nodes.push(h(FileLink, { key, target: parsed.target, display: parsed.display, settings }));
			}
			else if (token.type === 'link') {
				if (match[1]) {
					nodes.push(h('img', { key, className: 'claudian-embedded-image', src: match[3], alt: match[2] }));
				}
				else {
					nodes.push(h('a', {
						key,
						href: match[3],
						title: match[3],
						onClick: (event) => openSidebarLinkTarget(event, match[3], settings),
					}, renderInline(match[2], `${key}-label`, depth + 1, settings)));
				}
			}
			else if (token.type === 'strong') {
				nodes.push(h('strong', { key }, renderInline(match[2], `${key}-strong`, depth + 1, settings)));
			}
			else if (token.type === 'em') {
				nodes.push(h('em', { key }, renderInline(match[2], `${key}-em`, depth + 1, settings)));
			}
			else if (token.type === 'math') {
				nodes.push(h(MathSpan, { key, latex: match[1], display: token.display }));
			}
			current = token.index + match[0].length;
			tokenIndex += 1;
		}
		return nodes;
	}

	function renderInlineWithBreaks(text, keyPrefix, settings) {
		const lines = String(text || '').split('\n');
		const nodes = [];
		lines.forEach((line, index) => {
			if (index > 0) nodes.push(h('br', { key: `${keyPrefix}-br-${index}` }));
			nodes.push(...renderInline(line, `${keyPrefix}-line-${index}`, 0, settings));
		});
		return nodes;
	}

	async function writeClipboardText(text) {
		const value = String(text || '');
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(value);
				return true;
			}
		}
		catch {
			// Fall through to the legacy copy path for file:// Electron windows.
		}
		try {
			const textarea = document.createElement('textarea');
			textarea.value = value;
			textarea.setAttribute('readonly', 'true');
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			return true;
		}
		catch {
			return false;
		}
	}

	function MarkdownCodeBlock({ code, language }) {
		const [copied, setCopied] = useState(false);
		const label = language || '';
		const copyCode = async (event) => {
			event.stopPropagation();
			const ok = await writeClipboardText(code);
			if (!ok) return;
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		};
		const handleKeyDown = (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			void copyCode(event);
		};
		return h('div', { className: `claudian-code-wrapper ${label ? 'has-language' : ''}` },
			h('pre', null,
				h('code', { className: label ? `language-${label}` : undefined }, code),
			),
			label ? h('span', {
				className: 'claudian-code-lang-label',
				role: 'button',
				tabIndex: 0,
				title: 'Copy code',
				onClick: copyCode,
				onKeyDown: handleKeyDown,
			}, copied ? 'Copied!' : label) : h('button', {
				type: 'button',
				className: 'copy-code-button',
				'aria-label': 'Copy code',
				onClick: copyCode,
			}, copied ? 'Copied!' : h(Icon, { name: 'copy', size: 14 })),
		);
	}

	function renderMarkdownBlock(block, key, settings) {
		if (block.type === 'heading') {
			const Tag = `h${Math.min(6, Math.max(1, block.level || 1))}`;
			return h(Tag, { key, className: `el-h${block.level}` }, renderInlineWithBreaks(block.text, key, settings));
		}
		if (block.type === 'code') {
			return h(MarkdownCodeBlock, { key, code: block.code, language: block.language });
		}
		if (block.type === 'math') {
			return h(MathSpan, { key, latex: block.latex, display: true });
		}
		if (block.type === 'blockquote') {
			return h('blockquote', { key, className: 'el-blockquote' }, renderInlineWithBreaks(block.text, key, settings));
		}
		if (block.type === 'hr') {
			return h('hr', { key, className: 'el-hr' });
		}
		if (block.type === 'list') {
			const Tag = block.ordered ? 'ol' : 'ul';
			return h(Tag, { key, className: block.ordered ? 'el-ol' : 'el-ul' },
				block.items.map((item, index) => {
					const itemText = typeof item === 'string' ? item : item?.text || '';
					const props = { key: `${key}-li-${index}` };
					if (block.ordered && Number.isFinite(Number(item?.value))) {
						props.value = Number(item.value);
					}
					return h('li', props,
						renderInlineWithBreaks(itemText, `${key}-li-${index}`, settings),
						...(Array.isArray(item?.children) ? item.children.map((child, childIndex) => renderMarkdownBlock(child, `${key}-li-${index}-child-${childIndex}`, settings)) : []),
					);
				}),
			);
		}
		if (block.type === 'table') {
			return h('table', { key, className: 'el-table' },
				h('thead', null,
					h('tr', null, block.headers.map((cell, index) => h('th', { key: `${key}-h-${index}` }, renderInlineWithBreaks(cell, `${key}-h-${index}`, settings)))),
				),
				h('tbody', null,
					block.rows.map((row, rowIndex) => h('tr', { key: `${key}-r-${rowIndex}` },
						block.headers.map((_header, cellIndex) => h('td', { key: `${key}-r-${rowIndex}-c-${cellIndex}` }, renderInlineWithBreaks(row[cellIndex] || '', `${key}-r-${rowIndex}-c-${cellIndex}`, settings))),
					)),
				),
			);
		}
		return h('p', { key, className: 'el-p' }, renderInlineWithBreaks(block.text, key, settings));
	}

	function MarkdownContent({ content, settings }) {
		const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);
		return h('div', { className: 'markdown-rendered' },
			blocks.map((block, index) => renderMarkdownBlock(block, `md-${index}`, settings)),
		);
	}

	function GeneratedFileList({ files, className, settings }) {
		const generatedFiles = (Array.isArray(files) ? files : []).filter(Boolean);
		if (!generatedFiles.length) return null;
		const handleKeyDown = (event, filePath) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			openSidebarLinkTarget(event, filePath, settings);
		};
		return h('div', { className: `claudian-tool-generated-files ${className || ''}` },
			h('div', { className: 'claudian-tool-generated-files-title' }, 'Generated files'),
			generatedFiles.map((filePath) => h('div', {
				key: filePath,
				className: 'claudian-tool-generated-file',
				title: filePath,
				role: 'button',
				tabIndex: 0,
				onClick: (event) => openSidebarLinkTarget(event, filePath, settings),
				onKeyDown: (event) => handleKeyDown(event, filePath),
			},
				h('span', { className: 'claudian-tool-generated-file-icon' }, h(Icon, { name: 'file-check', size: 13 })),
				h('span', { className: 'claudian-tool-generated-file-path' }, filePath),
			)),
		);
	}

	function TextBlock({ content, copyable, settings, onAddToNote }) {
		const [copied, setCopied] = useState(false);
		const [added, setAdded] = useState(false);
		const generatedFiles = useMemo(() => extractGeneratedFilePaths(content, settings?.workspace || ''), [content, settings?.workspace]);
		const addToNote = (event) => {
			event.stopPropagation();
			if (typeof onAddToNote !== 'function') return;
			onAddToNote(content);
			setAdded(true);
			window.setTimeout(() => setAdded(false), 1200);
		};
		return h('div', { className: 'claudian-text-block' },
			h(MarkdownContent, { content, settings }),
			h(GeneratedFileList, { files: generatedFiles, className: 'claudian-text-generated-files', settings }),
			copyable ? h('span', { className: 'claudian-text-actions' },
				h('span', {
					className: `claudian-text-copy-btn ${copied ? 'copied' : ''}`,
					title: copied ? 'Copied' : 'Copy response',
					onClick: async (event) => {
						event.stopPropagation();
						const ok = await writeClipboardText(content);
						if (!ok) return;
						setCopied(true);
						window.setTimeout(() => setCopied(false), 1200);
					},
				}, copied ? 'Copied!' : h(Icon, { name: 'copy' })),
				typeof onAddToNote === 'function' ? h('span', {
					className: `claudian-text-add-note-btn ${added ? 'added' : ''}`,
					title: added ? 'Added to note' : 'Add to note',
					'aria-label': added ? 'Added to note' : 'Add to note',
					onClick: addToNote,
				}, added ? 'Added!' : h(Icon, { name: 'file-plus' })) : null,
			) : null,
		);
	}

	function RuntimeWaitingBlock({ block }) {
		const startedAt = Number(block?.startTime || 0) || Date.now();
		const [elapsedSeconds, setElapsedSeconds] = useState(() => Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
		useEffect(() => {
			const timer = window.setInterval(() => {
				setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
			}, 1000);
			return () => window.clearInterval(timer);
		}, [startedAt]);
		const display = runtimeWaitingDisplay(block, elapsedSeconds);
		return h('div', { className: display.className, role: 'status', 'aria-live': 'polite' },
			h(WorkingSpinner, { size: 16, status: block?.status, elapsedSeconds }),
			h('span', { className: 'claudian-thinking-hint' }, display.hint),
		);
	}

	function ThinkingBlock({ block }) {
		if (block?.runtimeWaiting) {
			return h(RuntimeWaitingBlock, { block });
		}
		const [expanded, setExpanded] = useState(block.expanded === true);
		const startedAt = Number(block?.startTime || 0) || Date.now();
		const [streamElapsedSeconds, setStreamElapsedSeconds] = useState(() => elapsedWholeSeconds(startedAt));
		useEffect(() => {
			if (!block.runtimeStreaming) return undefined;
			setStreamElapsedSeconds(elapsedWholeSeconds(startedAt));
			const timer = window.setInterval(() => {
				setStreamElapsedSeconds(elapsedWholeSeconds(startedAt));
			}, 1000);
			return () => window.clearInterval(timer);
		}, [block.runtimeStreaming, startedAt]);
		const durationSeconds = block.runtimeStreaming
			? streamElapsedSeconds
			: finiteNonNegativeNumber(block.durationSeconds);
		const durationLabel = durationSeconds !== null ? formatDuration(Math.max(0, Math.round(durationSeconds))) : '';
		const label = block.runtimeStreaming
			? `${block.label || 'Thinking'} for ${durationLabel || '0s'}`
			: block.label && block.label !== 'Thinking'
				? (durationLabel ? `${block.label} for ${durationLabel}` : block.label)
				: (durationLabel ? `Thought for ${durationLabel}` : 'Thought');
		const toggle = () => setExpanded((value) => !value);
		const handleKeyDown = (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			toggle();
		};
		return h('div', { className: `claudian-thinking-block ${expanded ? 'expanded' : ''} ${block.runtimeStreaming ? 'streaming' : ''}` },
			h('div', {
				className: 'claudian-thinking-header',
				tabIndex: 0,
				role: 'button',
				'aria-expanded': String(expanded),
				'aria-label': `Extended thinking - click to ${expanded ? 'collapse' : 'expand'}`,
				onClick: toggle,
				onKeyDown: handleKeyDown,
			},
				h('span', { className: 'claudian-thinking-label' },
					block.runtimeStreaming ? h(React.Fragment, null,
						h(AnimatedWorkingGlyph, { size: 14, className: 'claudian-thinking-label-glyph' }),
						h('span', null, label),
					) : label,
				),
			),
			h('div', { className: `claudian-thinking-content ${expanded ? '' : 'claudian-hidden'}` },
				h(TextBlock, { content: block.content }),
			),
		);
	}

	function fileNameOnly(value) {
		return pathBaseName(value || 'file');
	}

	function computeDiffStats(lines) {
		return (lines || []).reduce((stats, line) => {
			if (line.type === 'insert') stats.added += 1;
			if (line.type === 'delete') stats.removed += 1;
			return stats;
		}, { added: 0, removed: 0 });
	}

	function DiffStats({ stats }) {
		if (!stats || (!stats.added && !stats.removed)) return null;
		return h(React.Fragment, null,
			stats.added ? h('span', { className: 'added' }, `+${stats.added}`) : null,
			stats.added && stats.removed ? ' ' : null,
			stats.removed ? h('span', { className: 'removed' }, `-${stats.removed}`) : null,
		);
	}

	function DiffContent({ lines }) {
		const displayLines = lines || [];
		if (displayLines.length === 0) {
			return h('div', { className: 'claudian-diff-no-changes' }, 'No changes');
		}
		return h('div', { className: 'claudian-diff-hunk' },
			displayLines.map((line, index) => {
				const type = line.type || 'equal';
				const prefix = type === 'insert' ? '+' : type === 'delete' ? '-' : ' ';
				return h('div', { key: index, className: `claudian-diff-line claudian-diff-${type}` },
					h('span', { className: 'claudian-diff-prefix' }, prefix),
					h('span', { className: 'claudian-diff-text' }, line.text || ' '),
				);
			}),
		);
	}

	function isPlainRecord(value) {
		return !!value && typeof value === 'object' && !Array.isArray(value);
	}

	function parsePatchUnifiedDiffLines(diffText) {
		const diffLines = [];
		let oldLineNum = 1;
		let newLineNum = 1;
		for (const line of String(diffText || '').split(/\r?\n/)) {
			if (!line || line.startsWith('--- ') || line.startsWith('+++ ')) continue;
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
			if (prefix === '+') diffLines.push({ type: 'insert', text, newLineNum: newLineNum++ });
			else if (prefix === '-') diffLines.push({ type: 'delete', text, oldLineNum: oldLineNum++ });
			else if (prefix === ' ') diffLines.push({ type: 'equal', text, oldLineNum: oldLineNum++, newLineNum: newLineNum++ });
			if (diffLines.length >= MAX_RUNTIME_DIFF_LINES) break;
		}
		return capRuntimeDiffLines(diffLines);
	}

	function buildPatchFileDiff(current) {
		const diffLines = [];
		let oldLineNum = 1;
		let newLineNum = 1;
		for (const line of current.rawLines || []) {
			const prefix = line[0];
			const text = line.slice(1);
			if (prefix === '+') diffLines.push({ type: 'insert', text, newLineNum: newLineNum++ });
			else if (prefix === '-') diffLines.push({ type: 'delete', text, oldLineNum: oldLineNum++ });
			else diffLines.push({ type: 'equal', text, oldLineNum: oldLineNum++, newLineNum: newLineNum++ });
			if (diffLines.length >= MAX_RUNTIME_DIFF_LINES) break;
		}
		const diffLinesForDisplay = capRuntimeDiffLines(diffLines);
		return {
			filePath: current.filePath,
			operation: current.operation,
			...(current.movedTo ? { movedTo: current.movedTo } : {}),
			diffLines: diffLinesForDisplay,
			stats: computeDiffStats(diffLinesForDisplay),
		};
	}

	function parseApplyPatchDiffs(patchText) {
		if (!String(patchText || '').trim()) return [];
		const fileDiffs = [];
		const lines = String(patchText || '').split(/\r?\n/);
		let current = null;
		const flushCurrent = () => {
			if (!current) return;
			fileDiffs.push(buildPatchFileDiff(current));
			current = null;
		};
		for (const line of lines) {
			if (line.startsWith('*** Begin Patch') || line.startsWith('*** End Patch')) continue;
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
			if (!current) continue;
			if (line.startsWith('*** Move to: ')) {
				current.movedTo = line.slice('*** Move to: '.length).trim();
				continue;
			}
			if (line === '*** End of File' || line.startsWith('@@') || line.startsWith('--- ') || line.startsWith('+++ ')) continue;
			if (line[0] === '+' || line[0] === '-' || line[0] === ' ') {
				current.rawLines.push(line);
			}
		}
		flushCurrent();
		return fileDiffs;
	}

	function normalizePatchOperation(value) {
		return value === 'add' || value === 'delete' || value === 'update' ? value : 'update';
	}

	function parsePatchKind(value) {
		if (typeof value === 'string') return { operation: normalizePatchOperation(value) };
		if (isPlainRecord(value)) {
			return {
				operation: normalizePatchOperation(typeof value.type === 'string' ? value.type : ''),
				...(typeof value.move_path === 'string' ? { movedTo: value.move_path } : {}),
			};
		}
		return { operation: 'update' };
	}

	function parseFileChangeDiffs(changes) {
		if (!Array.isArray(changes)) return [];
		return changes.map((change) => {
			if (!isPlainRecord(change)) return null;
			const filePath = typeof change.path === 'string' ? change.path : '';
			const diff = typeof change.diff === 'string' ? change.diff : '';
			if (!filePath || !diff.trim()) return null;
			const kindInfo = parsePatchKind(change.kind ?? change.type);
			const diffLines = capRuntimeDiffLines(parsePatchUnifiedDiffLines(diff));
			return {
				filePath,
				operation: kindInfo.operation,
				...(kindInfo.movedTo ? { movedTo: kindInfo.movedTo } : {}),
				diffLines,
				stats: computeDiffStats(diffLines),
			};
		}).filter(Boolean);
	}

	function getApplyPatchFileDiffs(block) {
		if (Array.isArray(block.patchFileDiffs)) return block.patchFileDiffs;
		const input = block.input || {};
		const patchText = typeof input.patch === 'string' ? input.patch : '';
		const parsedDiffs = patchText ? parseApplyPatchDiffs(patchText) : [];
		return parsedDiffs.length > 0 ? parsedDiffs : parseFileChangeDiffs(input.changes);
	}

	function getApplyPatchStats(block) {
		const fileDiffs = getApplyPatchFileDiffs(block);
		if (fileDiffs.length === 0) return null;
		return fileDiffs.reduce((stats, fileDiff) => ({
			added: stats.added + (fileDiff.stats?.added || 0),
			removed: stats.removed + (fileDiff.stats?.removed || 0),
		}), { added: 0, removed: 0 });
	}

	function TextLines({ text, maxLines = 20, hoverable = false, stripLineMarker = false }) {
		const lines = String(text || '').split(/\r?\n/);
		const displayLines = lines.length > maxLines ? lines.slice(0, maxLines) : lines;
		return h('div', { className: 'claudian-tool-lines' },
			displayLines.map((line, index) => h('div', {
				key: index,
				className: `claudian-tool-line claudian-tool-line-wrap ${hoverable ? 'hoverable' : ''}`,
			}, (stripLineMarker ? String(line || '').replace(/^\s*\d+→/, '') : line) || ' ')),
			lines.length > maxLines ? h('div', { className: 'claudian-tool-truncated' }, `... ${lines.length - maxLines} more lines`) : null,
		);
	}

	function ApplyPatchSection({ fileDiff, index }) {
		if (fileDiff.operation === 'delete' && (!fileDiff.diffLines || fileDiff.diffLines.length === 0)) {
			return h('div', { key: index, className: 'claudian-tool-patch-section' },
				h('div', { className: 'claudian-tool-empty' }, 'File deleted'),
			);
		}
		if (!fileDiff.diffLines || fileDiff.diffLines.length === 0) {
			return h('div', { key: index, className: 'claudian-tool-patch-section' },
				h('div', { className: 'claudian-tool-empty' }, 'No textual diff available'),
			);
		}
		return h('div', { key: index, className: 'claudian-tool-patch-section' },
			h('div', { className: 'claudian-write-edit-diff-row' },
				h('div', { className: 'claudian-write-edit-diff' }, h(DiffContent, { lines: fileDiff.diffLines })),
			),
		);
	}

	function moveTarget(kind) {
		return isPlainRecord(kind) && typeof kind.move_path === 'string' ? kind.move_path : '';
	}

	function ApplyPatchContent({ block }) {
		const input = block.input || {};
		const result = block.result ? String(block.result) : '';
		const patchText = typeof input.patch === 'string' ? input.patch : '';
		const fileDiffs = getApplyPatchFileDiffs(block);
		const children = [];
		if (result && /verification failed|^[Ee]rror:/.test(result.trim())) {
			children.push(h(TextLines, { key: 'error', text: result, maxLines: 20 }));
		}
		if (fileDiffs.length > 0) {
			children.push(...fileDiffs.map((fileDiff, index) => h(ApplyPatchSection, { key: `patch-${index}`, fileDiff, index })));
			return h(React.Fragment, null, children);
		}
		const changes = Array.isArray(input.changes) ? input.changes : [];
		if (changes.length > 0) {
			return h('div', { className: 'claudian-tool-lines' },
				changes.map((change, index) => {
					const filePath = isPlainRecord(change) && typeof change.path === 'string' ? change.path : '';
					const movedTo = isPlainRecord(change) ? moveTarget(change.kind) : '';
					return filePath ? h('div', { key: index, className: 'claudian-tool-line claudian-tool-line-wrap' }, movedTo ? `${filePath} -> ${movedTo}` : filePath) : null;
				}),
			);
		}
		if (patchText) return h(TextLines, { text: patchText, maxLines: 80 });
		if (result) {
			const matches = [...result.matchAll(/(?:update|add|delete|create|modify|Applied:\s*)(?:\w+:\s*)?([^\n,]+)/gi)]
				.map((match) => match[1]?.trim())
				.filter(Boolean);
			if (matches.length > 0) {
				return h('div', { className: 'claudian-tool-lines' },
					matches.map((filePath, index) => h('div', { key: index, className: 'claudian-tool-line claudian-tool-line-wrap' }, filePath)),
				);
			}
			return h(TextLines, { text: result, maxLines: 20 });
		}
		return h('div', { className: 'claudian-tool-empty' }, 'No result');
	}

	function WriteEditBlock({ block }) {
		const [expanded, setExpanded] = useState(block.expanded !== false);
		const status = block.status || 'running';
		const isError = status === 'error' || status === 'blocked';
		const diffLines = block.diffLines || block.diffData?.diffLines || [];
		const stats = block.diffStats || block.diffData?.stats || computeDiffStats(diffLines);
		const filePath = block.filePath || block.input?.file_path || block.summary || 'file';
		const name = block.name || 'Edit';
		return h('div', { className: `claudian-write-edit-block ${status === 'completed' ? 'done' : ''} ${isError ? 'error' : ''}` },
			h('div', {
				className: 'claudian-write-edit-header',
				tabIndex: 0,
				role: 'button',
				onClick: () => setExpanded((value) => !value),
			},
				h('div', { className: 'claudian-write-edit-icon' }, h(Icon, { name: 'file' })),
				h('div', { className: 'claudian-write-edit-name' }, name),
				h('div', { className: 'claudian-write-edit-summary' }, fileNameOnly(filePath)),
				h('div', { className: 'claudian-write-edit-stats' }, h(DiffStats, { stats })),
				h('div', { className: `claudian-write-edit-status status-${status}` }, isError ? h(Icon, { name: 'x', size: 14 }) : status === 'running' ? h(Icon, { name: 'terminal', size: 14 }) : null),
			),
			expanded ? h('div', { className: 'claudian-write-edit-content' },
				h('div', { className: 'claudian-write-edit-diff-row' },
					diffLines.length
						? h('div', { className: 'claudian-write-edit-diff' }, h(DiffContent, { lines: diffLines }))
						: h('div', { className: isError ? 'claudian-write-edit-error' : status === 'running' ? 'claudian-write-edit-loading' : 'claudian-write-edit-done-text' }, isError ? (block.result || 'ERROR') : status === 'running' ? 'Writing...' : 'DONE'),
				),
			) : null,
		);
	}

	function TodoContent({ todos }) {
		const items = Array.isArray(todos) ? todos : [];
		if (items.length === 0) {
			return h('span', { className: 'claudian-tool-result-item' }, 'Tasks updated');
		}
		return items.map((todo, index) => {
			const status = todo.status || 'pending';
			const text = status === 'in_progress' ? (todo.activeForm || todo.content) : todo.content;
			return h('div', { key: todo.id || index, className: `claudian-todo-item claudian-todo-${status}` },
				h('span', { className: 'claudian-todo-status-icon', 'aria-hidden': 'true' }, status === 'completed' ? h(Icon, { name: 'check', size: 12 }) : '•'),
				h('span', { className: 'claudian-todo-text' }, text || 'Task'),
			);
		});
	}

	function WebSearchContent({ block }) {
		const input = block.input || {};
		const links = block.links || input.links || [];
		const queries = input.queries || (input.query ? [input.query] : []);
		if (Array.isArray(links) && links.length > 0) {
			return [
				h('div', { key: 'links', className: 'claudian-tool-lines' },
					links.map((link, index) => h('a', {
						key: index,
						className: 'claudian-tool-link',
						href: link.url,
						title: link.url,
						onClick: (event) => event.preventDefault(),
					},
						h('span', { className: 'claudian-tool-link-icon' }, h(Icon, { name: 'search', size: 12 })),
						h('span', { className: 'claudian-tool-link-title' }, link.title || link.url),
					)),
				),
				block.result || input.summary ? h('div', { key: 'summary', className: 'claudian-tool-web-summary' }, block.result || input.summary) : null,
			];
		}
		return h('div', { className: 'claudian-tool-lines' },
			queries.length
				? queries.map((query, index) => h('div', { key: index, className: 'claudian-tool-line' }, `${index === 0 ? 'Query' : 'Alt query'}: ${query}`))
				: h('div', { className: 'claudian-tool-line' }, input.url ? `Open page: ${input.url}` : 'Search web'),
		);
	}

	function WebFetchContent({ block }) {
		const value = String(block.result || block.content || 'No result');
		const clipped = value.length > 500;
		return h('div', { className: 'claudian-tool-lines' },
			h('div', { className: 'claudian-tool-line claudian-tool-line-wrap' }, clipped ? value.slice(0, 500) : value),
			clipped ? h('div', { className: 'claudian-tool-truncated' }, `... ${value.length - 500} more characters`) : null,
		);
	}

	function FileSearchContent({ block, maxLines = 15, hoverable = false }) {
		const value = String(block.result || block.content || '');
		const nonEmpty = value.split(/\r?\n/).some((line) => line.trim());
		if (!nonEmpty) {
			return h('div', { className: 'claudian-tool-empty' }, 'No matches found');
		}
		return h(TextLines, { text: value, maxLines, hoverable, stripLineMarker: hoverable });
	}

	function ToolSearchContent({ block }) {
		const value = String(block.result || block.content || '');
		let toolNames = [];
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) {
				toolNames = parsed
					.filter((item) => item?.type === 'tool_reference' && item.tool_name)
					.map((item) => String(item.tool_name));
			}
		}
		catch {
			toolNames = [];
		}
		if (toolNames.length === 0) {
			return h(TextLines, { text: value, maxLines: 20 });
		}
		return h(React.Fragment, null,
			toolNames.map((toolName) => h('div', { key: toolName, className: 'claudian-tool-search-item' },
				h('span', { className: 'claudian-tool-search-icon' }, h(Icon, { name: toolIconForName(toolName), size: 14 })),
				h('span', null, toolName),
			)),
		);
	}

	function formatToolDisplayValue(value) {
		if (typeof value === 'string') return value;
		if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
		if (value === null || value === undefined) return '';
		try {
			return JSON.stringify(value);
		}
		catch {
			return String(value);
		}
	}

	function parseJsonRecord(value) {
		const text = String(value || '').trim();
		if (!text) return null;
		try {
			const parsed = JSON.parse(text);
			return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
		}
		catch {
			return null;
		}
	}

	function extractCodexSpawnResult(value) {
		const parsed = parseJsonRecord(value);
		return {
			agentId: typeof parsed?.agent_id === 'string' ? parsed.agent_id : '',
			nickname: typeof parsed?.nickname === 'string' ? parsed.nickname : '',
		};
	}

	function extractCodexWaitResult(value) {
		const parsed = parseJsonRecord(value);
		const statuses = {};
		const rawStatuses = parsed?.status;
		if (rawStatuses && typeof rawStatuses === 'object' && !Array.isArray(rawStatuses)) {
			for (const [agentId, rawStatus] of Object.entries(rawStatuses)) {
				if (!rawStatus || typeof rawStatus !== 'object' || Array.isArray(rawStatus)) continue;
				statuses[agentId] = {
					completed: typeof rawStatus.completed === 'string' ? rawStatus.completed : '',
					error: typeof rawStatus.error === 'string' ? rawStatus.error : '',
					failed: typeof rawStatus.failed === 'string' ? rawStatus.failed : '',
				};
			}
		}
		return {
			statuses,
			timedOut: parsed?.timed_out === true,
		};
	}

	function codexLifecycleDescription(spawnResult, model) {
		if (spawnResult.nickname && model) return `${spawnResult.nickname} (${model})`;
		if (spawnResult.nickname) return spawnResult.nickname;
		if (model) return `Codex subagent (${model})`;
		return 'Codex subagent';
	}

	function resolveCodexLifecycleCompletion(spawnResult, siblingToolBlocks) {
		for (const tool of siblingToolBlocks) {
			if (tool.name !== 'wait' && tool.name !== 'wait_agent') continue;
			const waitResult = extractCodexWaitResult(tool.result || tool.content);
			const entries = Object.entries(waitResult.statuses);
			if (entries.length === 0 && !waitResult.timedOut) continue;

			let agentStatus = null;
			if (spawnResult.agentId) {
				agentStatus = waitResult.statuses[spawnResult.agentId];
			}
			else if (entries.length === 1) {
				agentStatus = entries[0][1];
			}
			if (agentStatus?.completed) return { status: 'completed', result: agentStatus.completed };
			const failure = agentStatus?.error || agentStatus?.failed;
			if (failure) return { status: 'error', result: failure };
			if (waitResult.timedOut) return { status: 'error', result: 'Timed out' };
		}
		return { status: 'running', result: '' };
	}

	function buildCodexLifecycleSubagentBlock(spawnBlock, siblingToolBlocks) {
		const input = spawnBlock.input || {};
		const model = typeof input.model === 'string' ? input.model : '';
		const spawnResult = extractCodexSpawnResult(spawnBlock.result || spawnBlock.content);
		const description = codexLifecycleDescription(spawnResult, model);
		const prompt = typeof input.message === 'string' ? input.message : '';
		const isSpawnError = spawnBlock.status === 'error' || spawnBlock.status === 'blocked';
		const completion = isSpawnError
			? { status: 'error', result: String(spawnBlock.result || spawnBlock.content || 'Error') }
			: resolveCodexLifecycleCompletion(spawnResult, siblingToolBlocks);
		return {
			type: 'subagent',
			id: `${spawnBlock.id || 'spawn-agent'}-subagent`,
			description,
			prompt,
			status: completion.status,
			result: completion.result,
			mode: 'sync',
			agentId: spawnResult.agentId || undefined,
			tools: [],
		};
	}

	function shouldRenderCodexLifecycleAsSubagent(providerId, block) {
		return providerId === 'codex' && block?.type === 'tool_use' && block.name === 'spawn_agent';
	}

	function isHiddenCodexLifecycleTool(providerId, block) {
		return providerId === 'codex'
			&& block?.type === 'tool_use'
			&& (block.name === 'wait' || block.name === 'wait_agent' || block.name === 'close_agent');
	}

	function AgentLifecycleContent({ block }) {
		const value = String(block.result || block.content || '');
		const trimmed = value.trim();
		if (!trimmed) {
			return h('div', { className: 'claudian-tool-empty' }, 'No result');
		}
		if (trimmed.startsWith('{')) {
			try {
				const parsed = JSON.parse(trimmed);
				if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
					return h('div', { className: 'claudian-tool-lines' },
						Object.entries(parsed).map(([key, entry]) => h('div', {
							key,
							className: 'claudian-tool-line claudian-tool-line-wrap',
						}, `${key}: ${formatToolDisplayValue(entry)}`)),
					);
				}
			}
			catch {
				// Fall back to the same text-line rendering as the original renderer.
			}
		}
		return h(TextLines, { text: value, maxLines: 20 });
	}

	function SubagentToolItem({ tool }) {
		const [expanded, setExpanded] = useState(tool.expanded === true);
		const status = tool.status || 'running';
		const statusIcon = status === 'completed' ? 'check' : status === 'error' ? 'x' : 'terminal';
		return h('div', { className: `claudian-subagent-tool-item claudian-subagent-tool-${status} ${expanded ? 'expanded' : ''}` },
			h('div', {
				className: 'claudian-subagent-tool-header',
				tabIndex: 0,
				role: 'button',
				'aria-expanded': expanded ? 'true' : 'false',
				onClick: () => setExpanded((value) => !value),
				onKeyDown: (event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						setExpanded((value) => !value);
					}
				},
			},
				h('span', { className: 'claudian-subagent-tool-icon' }, h(Icon, { name: tool.icon || 'terminal', size: 13 })),
				h('span', { className: 'claudian-subagent-tool-name' }, tool.name || 'Tool'),
				h('span', { className: 'claudian-subagent-tool-summary' }, tool.summary || ''),
				h('span', { className: `claudian-subagent-tool-status status-${status}` }, h(Icon, { name: statusIcon, size: 12 })),
			),
			h('div', { className: `claudian-subagent-tool-content ${expanded ? '' : 'claudian-hidden'}` },
				tool.result ? h('div', { className: 'claudian-tool-result-row' }, h('span', { className: 'claudian-tool-result-text' }, tool.result)) : h('div', { className: 'claudian-subagent-tool-empty' }, 'No result'),
			),
		);
	}

	function SubagentBlock({ block }) {
		const [expanded, setExpanded] = useState(block.expanded !== false);
		const status = block.status || block.asyncStatus || 'running';
		const isAsync = Boolean(block.asyncStatus);
		const statusIcon = status === 'completed' ? 'check' : status === 'error' ? 'x' : 'terminal';
		const tools = block.tools || block.toolCalls || [];
		return h('div', { className: `claudian-subagent-list ${isAsync ? `async ${status}` : ''} ${status === 'completed' ? 'done' : ''} ${status === 'error' ? 'error' : ''}` },
			h('div', { className: 'claudian-subagent-header', tabIndex: 0, role: 'button', onClick: () => setExpanded((value) => !value) },
				h('div', { className: 'claudian-subagent-icon' }, h(Icon, { name: 'box' })),
				h('div', { className: 'claudian-subagent-label' }, block.description || block.summary || 'Subagent task'),
				isAsync ? h('span', { className: 'claudian-subagent-status-text' }, status === 'completed' ? '' : status === 'error' ? 'Error' : 'Running in background') : null,
				h('div', { className: `claudian-subagent-status status-${status}` }, h(Icon, { name: statusIcon, size: 14 })),
			),
			expanded ? h('div', { className: 'claudian-subagent-content' },
				h('div', { className: 'claudian-subagent-section claudian-subagent-section-prompt' },
					h('div', { className: 'claudian-subagent-section-header' }, h('span', { className: 'claudian-subagent-section-title' }, 'Prompt')),
					h('div', { className: 'claudian-subagent-section-body claudian-subagent-prompt-body' },
						h('div', { className: 'claudian-subagent-prompt-text' }, block.prompt || block.input?.prompt || 'Review the current sidebar implementation.'),
					),
				),
				tools.length ? h('div', { className: 'claudian-subagent-tools' }, tools.map((tool, index) => h(SubagentToolItem, { key: tool.id || index, tool }))) : null,
				status !== 'running' || block.result ? h('div', { className: 'claudian-subagent-section claudian-subagent-section-result' },
					h('div', { className: 'claudian-subagent-section-header' }, h('span', { className: 'claudian-subagent-section-title' }, 'Result')),
					h('div', { className: 'claudian-subagent-section-body claudian-subagent-result-body' },
						h('div', { className: 'claudian-subagent-result-output' }, block.result || (status === 'error' ? 'ERROR' : 'DONE')),
					),
				) : null,
			) : null,
		);
	}

	function formatAskAnswer(raw) {
		if (Array.isArray(raw)) return raw.join(', ');
		if (typeof raw === 'string') return raw;
		if (raw === undefined || raw === null) return '';
		return String(raw);
	}

	function coerceAskOption(option) {
		if (typeof option === 'string') {
			return { label: option, value: option, description: '' };
		}
		if (!option || typeof option !== 'object') {
			return { label: String(option || ''), value: String(option || ''), description: '' };
		}
		const label = String(option.label || option.value || option.text || '');
		return {
			label,
			value: String(option.value || label),
			description: option.description ? String(option.description) : '',
		};
	}

	function AskToolContent({ block }) {
		const questions = Array.isArray(block.input?.questions) ? block.input.questions : [];
		const answers = block.resolvedAnswers || {};
		const hasAnswers = Object.keys(answers).length > 0;
		if (questions.length === 0) {
			return block.result ? h('div', { className: 'claudian-tool-result-row' },
				h('span', { className: 'claudian-tool-result-text' }, block.result),
			) : h('div', { className: 'claudian-tool-empty' }, 'Waiting for answer');
		}
		if (hasAnswers) {
			return h('div', { className: 'claudian-ask-review' },
				questions.map((question, index) => {
					const id = question?.id ? String(question.id) : '';
					const text = String(question?.question || `Question ${index + 1}`);
					const answer = formatAskAnswer((id ? answers[id] : undefined) ?? answers[text]);
					return h('div', { key: id || text || index, className: 'claudian-ask-review-pair' },
						h('div', { className: 'claudian-ask-review-num' }, `${index + 1}.`),
						h('div', { className: 'claudian-ask-review-body' },
							h('div', { className: 'claudian-ask-review-q-text' }, text),
							h('div', { className: answer ? 'claudian-ask-review-a-text' : 'claudian-ask-review-empty' }, answer || 'Not answered'),
						),
					);
				}),
			);
		}
		return h(React.Fragment, null,
			block.result ? h('div', { className: 'claudian-ask-review-prompt' }, block.result) : null,
			questions.map((question, questionIndex) => {
				const text = String(question?.question || `Question ${questionIndex + 1}`);
				const options = Array.isArray(question?.options) ? question.options.map(coerceAskOption) : [];
				return h('div', { key: question?.id || text || questionIndex, className: 'claudian-ask-review' },
					h('div', { className: 'claudian-ask-review-pair' },
						h('div', { className: 'claudian-ask-review-num' }, `${questionIndex + 1}.`),
						h('div', { className: 'claudian-ask-review-body' },
							h('div', { className: 'claudian-ask-review-q-text' }, text),
							options.length === 0
								? h('div', { className: 'claudian-ask-review-empty' }, 'No options recorded')
								: h('div', { className: 'claudian-ask-list' },
									options.map((option, optionIndex) => h('div', {
										key: option.value || option.label || optionIndex,
										className: 'claudian-ask-item is-disabled',
									},
										question?.multiSelect ? h('span', { className: 'claudian-ask-check' }, '[ ] ') : h('span', { className: 'claudian-ask-item-num' }, `${optionIndex + 1}. `),
										h('span', { className: 'claudian-ask-item-content' },
											h('span', { className: 'claudian-ask-label-row' },
												h('span', { className: 'claudian-ask-item-label' }, option.label),
											),
											option.description ? h('span', { className: 'claudian-ask-item-desc' }, option.description) : null,
										),
									)),
								),
						),
					),
				);
			}),
		);
	}

	function ToolBlock({ block, settings }) {
		const name = String(block.name || '');
		if (['Write', 'Edit', 'MultiEdit'].includes(name)) {
			return h(WriteEditBlock, { block });
		}
		if (name === 'Task' || name === 'Agent' || block.subagent) {
			return h(SubagentBlock, { block: block.subagent || block });
		}
		const [expanded, setExpanded] = useState(block.expanded === true);
		const status = block.status || 'running';
		const statusIcon = status === 'completed' ? 'check' : status === 'error' ? 'x' : status === 'blocked' ? 'shield-off' : 'terminal';
		const isTodo = name === 'TodoWrite';
		const isWebSearch = name === 'WebSearch' || name === 'web_search';
		const isWebFetch = name === 'WebFetch';
		const isApplyPatch = name === 'apply_patch';
		const isRead = name === 'Read';
		const isFileSearch = name === 'Glob' || name === 'Grep' || name === 'LS';
		const isToolSearch = name === 'ToolSearch';
		const isWriteStdin = name === 'write_stdin';
		const isAgentLifecycle = isAgentLifecycleToolName(name);
		const isSpecialContent = isTodo || isWebSearch || isWebFetch || isApplyPatch || isRead || isFileSearch || isToolSearch || isWriteStdin || isAgentLifecycle || name === 'AskUserQuestion';
		const toolLines = Array.isArray(block.lines) ? block.lines : [];
		const patchStats = isApplyPatch ? (block.patchStats || getApplyPatchStats(block)) : null;
		const generatedFiles = Array.isArray(block.generatedFiles) ? block.generatedFiles.filter(Boolean) : [];
		return h('div', { className: `claudian-tool-call ${block.name === 'Bash' ? 'claudian-tool-call-bash' : ''} ${expanded ? 'expanded' : ''}` },
			h('div', {
				className: 'claudian-tool-header',
				tabIndex: 0,
				onClick: () => setExpanded((value) => !value),
			},
				h('span', { className: 'claudian-tool-icon' }, h(Icon, { name: block.icon || 'terminal' })),
				h('span', { className: 'claudian-tool-name' }, block.name || 'Tool'),
				h('span', { className: 'claudian-tool-summary' }, block.summary || ''),
				isTodo ? h('span', { className: `claudian-tool-current ${expanded ? 'claudian-hidden' : ''}` }, (block.input?.todos || []).find((todo) => todo.status === 'in_progress')?.activeForm || '') : null,
				isApplyPatch && patchStats ? h('span', { className: 'claudian-write-edit-stats' }, h(DiffStats, { stats: patchStats })) : null,
				h('span', { className: `claudian-tool-status status-${status}` }, h(Icon, { name: statusIcon, size: 14 })),
			),
			expanded ? h('div', { className: `claudian-tool-content ${block.contentClass || ''}` },
				isTodo ? h('div', { className: 'claudian-todo-panel-content claudian-todo-list-container claudian-tool-content-todo' }, h(TodoContent, { todos: block.input?.todos })) : null,
				isWebSearch ? h(WebSearchContent, { block }) : null,
				isWebFetch ? h(WebFetchContent, { block }) : null,
				isApplyPatch ? h(ApplyPatchContent, { block }) : null,
				isRead ? (block.result || block.content ? h(TextLines, { text: block.result || block.content, maxLines: 15 }) : h('div', { className: 'claudian-tool-empty' }, 'No result')) : null,
				isFileSearch ? h(FileSearchContent, { block, maxLines: 15, hoverable: true }) : null,
				isToolSearch ? h(ToolSearchContent, { block }) : null,
				isWriteStdin ? h(TextLines, { text: block.result || block.content || '', maxLines: 20 }) : null,
				isAgentLifecycle ? h(AgentLifecycleContent, { block }) : null,
				name === 'AskUserQuestion' ? h(AskToolContent, { block }) : null,
				block.command ? h('div', { className: 'claudian-tool-bash-command' }, block.command) : null,
				!isSpecialContent && toolLines.length > 0 ? h('div', { className: 'claudian-tool-lines' },
					toolLines.map((line, index) => h('div', {
						key: index,
						className: `claudian-tool-line ${line.wrap ? 'claudian-tool-line-wrap' : ''}`,
					}, line.text || line)),
				) : null,
				!isSpecialContent && block.result ? h('div', { className: 'claudian-tool-result-row' },
					h('span', { className: 'claudian-tool-result-text' }, block.result),
				) : null,
				h(GeneratedFileList, { files: generatedFiles, settings }),
				!isSpecialContent && !block.command && toolLines.length === 0 && !block.result ? h('div', { className: 'claudian-tool-empty' }, status === 'running' ? 'Running...' : 'No result') : null,
			) : null,
		);
	}

	function CompactBoundary() {
		return h('div', { className: 'claudian-compact-boundary' },
			h('span', { className: 'claudian-compact-boundary-label' }, 'Conversation compacted'),
		);
	}

	function imageSrc(image) {
		return `data:${image.mediaType || 'image/png'};base64,${image.data || MOCK_IMAGE_DATA}`;
	}

	function formatImageSize(size) {
		const value = Number(size || 0);
		if (!value) return 'image';
		if (value < 1024) return `${value} B`;
		if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
		return `${(value / (1024 * 1024)).toFixed(1)} MB`;
	}

	function imageDisplayPath(image, settings) {
		const name = String(image?.name || '').trim();
		if (!name) return 'image.png';
		return resolveDisplayImagePath(name, settings);
	}

	function ImageModal({ image, onClose }) {
		if (!image) return null;
		return h('div', {
			className: 'claudian-image-modal-overlay',
			onClick: (event) => {
				if (event.currentTarget === event.target) onClose();
			},
		},
			h('div', { className: 'claudian-image-modal' },
				h('img', { src: imageSrc(image), alt: image.name || 'Attached image' }),
				h('div', { className: 'claudian-image-modal-close', onClick: onClose }, 'x'),
			),
		);
	}

	function InstructionModal({ rawInstruction, providerEnabled, onProviderInstructionRefine, onAccept, onReject, onError }) {
		const [stage, setStage] = useState('loading');
		const [loadingText, setLoadingText] = useState('Processing your instruction...');
		const [clarification, setClarification] = useState('');
		const [response, setResponse] = useState('');
		const [refined, setRefined] = useState('');
		const [isEditing, setIsEditing] = useState(false);
		const responseRef = useRef(null);
		const editRef = useRef(null);
		const acceptRef = useRef(null);
		const providerActionRef = useRef(onProviderInstructionRefine);
		const clarificationSubmittingRef = useRef(false);

		useEffect(() => {
			providerActionRef.current = onProviderInstructionRefine;
		}, [onProviderInstructionRefine]);

		useEffect(() => {
			let cancelled = false;
			let timer = null;
			setStage('loading');
			setLoadingText('Processing your instruction...');
			setClarification('');
			setResponse('');
			setRefined('');
			setIsEditing(false);
			clarificationSubmittingRef.current = false;

			if (providerEnabled) {
				(async () => {
					try {
						const action = providerActionRef.current;
						if (!action) {
							throw new Error('Instruction refine runtime is unavailable');
						}
						const result = await action({ type: 'start', rawInstruction });
						if (!cancelled) {
							showProviderResult(result, 'Failed to refine instruction');
						}
					}
					catch (providerError) {
						if (!cancelled) {
							showProviderFailure(providerError instanceof Error ? providerError.message : String(providerError), 'Failed to refine instruction');
						}
					}
				})();
				return () => {
					cancelled = true;
				};
			}

			timer = window.setTimeout(() => {
				if (cancelled) return;
				const text = String(rawInstruction || '').toLowerCase();
				if (text.includes('clarify') || text.includes('detail') || text.includes('?') || text.includes('具体')) {
					setClarification('What scope, tone, or constraint should this custom instruction apply to?');
					setStage('clarification');
					return;
				}
				setRefined(buildMockRefinedInstruction(rawInstruction));
				setStage('confirmation');
			}, 320);
			return () => {
				cancelled = true;
				window.clearTimeout(timer);
			};
		}, [rawInstruction, providerEnabled]);

		useEffect(() => {
			if (stage === 'clarification') {
				window.setTimeout(() => responseRef.current?.focus(), 0);
			}
			if (stage === 'confirmation' && isEditing) {
				window.setTimeout(() => editRef.current?.focus(), 0);
			}
			if (stage === 'confirmation' && !isEditing) {
				window.setTimeout(() => acceptRef.current?.focus(), 0);
			}
		}, [stage, isEditing]);

		useEffect(() => {
			const handler = (event) => {
				if (event.key === 'Escape' && !event.isComposing) {
					event.preventDefault();
					onReject();
				}
			};
			window.addEventListener('keydown', handler);
			return () => window.removeEventListener('keydown', handler);
		}, [onReject]);

		function showError(message) {
			onError?.(message || 'Failed to refine instruction');
		}

		function showProviderFailure(message, fallbackError) {
			const resolvedMessage = message || fallbackError || 'Failed to refine instruction';
			clarificationSubmittingRef.current = false;
			if (isInstructionRefineCancelled(resolvedMessage)) {
				onReject();
				return;
			}
			showError(resolvedMessage);
		}

		function showProviderResult(responseValue, fallbackError) {
			const hasOk = responseValue && Object.prototype.hasOwnProperty.call(responseValue, 'ok');
			const result = responseValue?.result && typeof responseValue.result === 'object'
				? responseValue.result
				: responseValue;
			if ((hasOk && responseValue.ok === false) || result?.success === false) {
				showProviderFailure(responseValue?.error || result?.error, fallbackError);
				return;
			}
			if (result?.clarification) {
				setClarification(result.clarification);
				setResponse('');
				clarificationSubmittingRef.current = false;
				setStage('clarification');
				return;
			}
			if (result?.refinedInstruction) {
				clarificationSubmittingRef.current = false;
				setRefined(result.refinedInstruction);
				setStage('confirmation');
				return;
			}
			showError(fallbackError || 'No instruction received');
		}

		async function submitClarification() {
			const value = response.trim();
			if (!value || clarificationSubmittingRef.current) return;
			clarificationSubmittingRef.current = true;
			setStage('loading');
			setLoadingText('Processing...');
			if (providerEnabled) {
				try {
					const action = providerActionRef.current;
					if (!action) {
						throw new Error('Instruction refine runtime is unavailable');
					}
					showProviderResult(await action({ type: 'continue', message: value }), 'Failed to continue instruction refinement');
				}
				catch {
					clarificationSubmittingRef.current = false;
					setStage('clarification');
				}
				return;
			}
			window.setTimeout(() => {
				clarificationSubmittingRef.current = false;
				setRefined(buildMockRefinedInstruction(rawInstruction, value));
				setStage('confirmation');
			}, 320);
		}

		function toggleEdit() {
			if (isEditing) {
				setIsEditing(false);
				return;
			}
			setIsEditing(true);
		}

		const hidden = (name) => `${name} ${stageMatches(name, stage) ? '' : 'claudian-hidden'}`;
		function stageMatches(className, value) {
			if (className.includes('loading')) return value === 'loading';
			if (className.includes('clarification')) return value === 'clarification';
			if (className.includes('confirmation')) return value === 'confirmation';
			return true;
		}

		return h('div', {
			className: 'claudian-modal-overlay claudian-instruction-modal-overlay',
			onMouseDown: (event) => {
				if (event.currentTarget === event.target) onReject();
			},
		},
			h('div', {
				className: 'claudian-modal-card claudian-instruction-modal',
				role: 'dialog',
				'aria-modal': 'true',
				'aria-label': 'Add custom instruction',
				onMouseDown: (event) => event.stopPropagation(),
			},
				h('div', { className: 'modal-title' }, 'Add custom instruction'),
				h('div', { className: 'claudian-instruction-section' },
					h('div', { className: 'claudian-instruction-label' }, 'Your input:'),
					h('div', { className: 'claudian-instruction-original' }, normalizeInstructionInput(rawInstruction)),
				),
				h('div', { className: 'claudian-instruction-content-section' },
					h('div', { className: hidden('claudian-instruction-loading') },
						h('div', { className: 'claudian-instruction-spinner' }),
						h('span', null, loadingText),
					),
					h('div', { className: hidden('claudian-instruction-clarification-section') },
						h('div', { className: 'claudian-instruction-clarification' }, clarification),
						h('div', { className: 'claudian-instruction-section' },
							h('div', { className: 'claudian-instruction-label' }, 'Your response:'),
							h('textarea', {
								ref: responseRef,
								className: 'claudian-instruction-response-textarea',
								rows: 3,
								placeholder: 'Provide more details...',
								value: response,
								onChange: (event) => setResponse(event.target.value),
								onKeyDown: (event) => {
									if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
										event.preventDefault();
										submitClarification();
									}
								},
							}),
						),
					),
					h('div', { className: hidden('claudian-instruction-confirmation-section') },
						h('div', { className: 'claudian-instruction-section' },
							h('div', { className: 'claudian-instruction-label' }, 'Refined snippet:'),
							h('div', { className: `claudian-instruction-refined ${isEditing ? 'claudian-hidden' : ''}` }, refined),
							h('div', { className: `claudian-instruction-edit-container ${isEditing ? '' : 'claudian-hidden'}` },
								h('textarea', {
									ref: editRef,
									className: 'claudian-instruction-edit-textarea',
									rows: 4,
									value: refined,
									onChange: (event) => setRefined(event.target.value),
								}),
							),
						),
					),
				),
				h('div', { className: 'claudian-instruction-buttons' },
					h('button', {
						type: 'button',
						className: 'claudian-instruction-btn claudian-instruction-reject-btn',
						'aria-label': 'Cancel',
						onClick: onReject,
					}, 'Cancel'),
					stage === 'clarification' ? h('button', {
						type: 'button',
						className: 'claudian-instruction-btn claudian-instruction-accept-btn',
						'aria-label': 'Submit response',
						onClick: submitClarification,
					}, 'Submit') : null,
					stage === 'confirmation' ? h('button', {
						type: 'button',
						className: 'claudian-instruction-btn claudian-instruction-edit-btn',
						'aria-label': 'Edit instruction',
						onClick: toggleEdit,
					}, isEditing ? 'Preview' : 'Edit') : null,
					stage === 'confirmation' ? h('button', {
						ref: acceptRef,
						type: 'button',
						className: 'claudian-instruction-btn claudian-instruction-accept-btn',
						'aria-label': 'Accept instruction',
						onClick: () => onAccept(refined),
					}, 'Accept') : null,
				),
			),
		);
	}

	function InlineDiffPreview({ mode, originalText, nextText, onAccept, onReject }) {
		const isCursor = mode === 'cursor';
		return h('div', { className: 'claudian-inline-diff-preview' },
			h('div', { className: 'claudian-inline-diff-preview-body markdown-rendered' },
				!isCursor ? h('div', { className: 'claudian-diff-block claudian-diff-del' },
					h('div', { className: 'claudian-inline-markdown-fallback' }, originalText || ''),
				) : null,
				h('div', { className: 'claudian-diff-block claudian-diff-ins' },
					h('div', { className: 'claudian-inline-markdown-fallback' }, nextText || ''),
				),
			),
			h('div', { className: 'claudian-inline-preview-actions' },
				h('button', {
					type: 'button',
					className: 'claudian-inline-preview-action reject',
					title: 'Reject (esc)',
					onClick: onReject,
				}, 'Reject'),
				h('button', {
					type: 'button',
					className: 'claudian-inline-preview-action accept',
					title: 'Accept (enter)',
					onClick: onAccept,
				}, 'Accept'),
			),
		);
	}

	function InlineEditPanel({ open, onClose, providerEnabled, onProviderInlineEdit, settings, externalPaths, providerId }) {
		const inlineSeed = getInlineEditSeed(providerEnabled);
		const [noteText, setNoteText] = useState(inlineSeed.note);
		const [selectionRange, setSelectionRange] = useState(() => getDefaultInlineSelectionRange(inlineSeed.note, inlineSeed.selection));
		const [cursorIndex, setCursorIndex] = useState(inlineSeed.note.length);
		const [mode, setMode] = useState('selection');
		const [active, setActive] = useState(true);
		const [stage, setStage] = useState('input');
		const [input, setInput] = useState('');
		const [inputCursorIndex, setInputCursorIndex] = useState(0);
		const [mentionIndex, setMentionIndex] = useState(0);
		const [mentionDismissedInput, setMentionDismissedInput] = useState('');
		const [agentReply, setAgentReply] = useState('');
		const [previewText, setPreviewText] = useState('');
		const [previewOriginal, setPreviewOriginal] = useState('');
		const [status, setStatus] = useState('Inline edit ready');
		const [highlightVisible, setHighlightVisible] = useState(true);
		const inputRef = useRef(null);
		const timersRef = useRef([]);
		const selectedText = noteText.slice(selectionRange.start, selectionRange.end);
		const activeInputCursor = Math.max(0, Math.min(input.length, Number.isFinite(inputCursorIndex) ? inputCursorIndex : input.length));
		const mentionTrigger = getMentionTrigger(input, activeInputCursor);
		const mentionQuery = mentionTrigger?.query || '';
		const mentionItems = useMemo(
			() => buildMentionItems(mentionQuery, externalPaths || [], [], settings || DEFAULT_SETTINGS, providerId || 'claude')
				.filter((item) => item.type === 'file' || item.type === 'context-file' || item.type === 'folder' || item.type === 'context-folder'),
			[mentionQuery, externalPaths, settings, providerId],
		);
		const showMention = !!mentionTrigger && mentionDismissedInput !== input;

		function clearTimers() {
			timersRef.current.forEach((timer) => window.clearTimeout(timer));
			timersRef.current = [];
		}

		function scheduleLocal(fn, delay) {
			const timer = window.setTimeout(() => {
				timersRef.current = timersRef.current.filter((item) => item !== timer);
				fn();
			}, delay);
			timersRef.current.push(timer);
		}

		useEffect(() => () => clearTimers(), []);

		useEffect(() => {
			setMentionIndex(0);
			if (mentionDismissedInput && mentionDismissedInput !== input) {
				setMentionDismissedInput('');
			}
		}, [mentionQuery, input, mentionDismissedInput]);

		useEffect(() => {
			if (!open) return;
			clearTimers();
			if (api?.cancelInlineEdit) {
				api.cancelInlineEdit().catch(() => {});
			}
			setNoteText(inlineSeed.note);
			setSelectionRange(getDefaultInlineSelectionRange(inlineSeed.note, inlineSeed.selection));
			setCursorIndex(inlineSeed.note.length);
			setMode('selection');
			setActive(true);
			setStage('input');
			setInput('');
			setInputCursorIndex(0);
			setAgentReply('');
			setPreviewText('');
			setPreviewOriginal('');
			setHighlightVisible(true);
			setStatus('Selection edit ready');
		}, [open, inlineSeed.note, inlineSeed.selection]);

		useEffect(() => {
			if (open && active && stage !== 'preview') {
				window.setTimeout(() => inputRef.current?.focus(), 0);
			}
		}, [open, active, stage, mode, agentReply]);

		useEffect(() => {
			if (!open || stage !== 'preview') return undefined;
			const handler = (event) => {
				if (event.key === 'Enter' && !event.isComposing) {
					event.preventDefault();
					acceptPreview();
				}
				if (event.key === 'Escape' && !event.isComposing) {
					event.preventDefault();
					rejectPreview();
				}
			};
			window.addEventListener('keydown', handler);
			return () => window.removeEventListener('keydown', handler);
		}, [open, stage, mode, previewText, selectionRange, cursorIndex, noteText]);

		function startInlineEdit(nextMode) {
			clearTimers();
			if (api?.cancelInlineEdit) {
				api.cancelInlineEdit().catch(() => {});
			}
			setMode(nextMode);
			setActive(true);
			setStage('input');
			setInput('');
			setInputCursorIndex(0);
			setAgentReply('');
			setPreviewText('');
			setPreviewOriginal('');
			setHighlightVisible(nextMode === 'selection');
			setStatus(nextMode === 'cursor' ? 'Cursor insertion ready' : 'Selection edit ready');
			if (nextMode === 'cursor') {
				setCursorIndex(noteText.length);
				setSelectionRange({ start: noteText.length, end: noteText.length });
			}
			else if (selectionRange.start === selectionRange.end) {
				setSelectionRange(getDefaultInlineSelectionRange(noteText, inlineSeed.selection));
			}
		}

		function pickMention(item, triggerOverride) {
			let nextCursor = null;
			setInput((current) => {
				const trigger = triggerOverride || getMentionTrigger(current, activeInputCursor);
				if (!trigger) return current;
				const replacement = mentionReplacement(item);
				nextCursor = trigger.start + replacement.length;
				return `${current.slice(0, trigger.start)}${replacement}${current.slice(trigger.end)}`;
			});
			if (nextCursor !== null) {
				setInputCursorIndex(nextCursor);
				window.setTimeout(() => {
					if (!inputRef.current) return;
					inputRef.current.setSelectionRange(nextCursor, nextCursor);
					inputRef.current.focus();
				}, 0);
			}
			setMentionDismissedInput('');
		}

		function buildProviderRequest(instruction, contextFiles) {
			if (mode === 'cursor') {
				const beforeCursor = noteText.slice(Math.max(0, cursorIndex - 320), cursorIndex);
				const afterCursor = noteText.slice(cursorIndex, Math.min(noteText.length, cursorIndex + 320));
				const line = noteText.slice(0, cursorIndex).split('\n').length - 1;
				return {
					mode: 'cursor',
					instruction,
					notePath: inlineSeed.path,
					contextFiles,
					cursorContext: {
						beforeCursor,
						afterCursor,
						line,
						isInbetween: /\n\s*$/.test(beforeCursor) || /^\s*\n/.test(afterCursor),
					},
				};
			}
			const beforeSelection = noteText.slice(0, selectionRange.start);
			const startLine = beforeSelection.split('\n').length;
			const lineCount = Math.max(1, selectedText.split('\n').length);
			return {
				mode: 'selection',
				instruction,
				notePath: inlineSeed.path,
				selectedText,
				startLine,
				lineCount,
				contextFiles,
			};
		}

		async function generate() {
			const instruction = input.trim();
			if (!instruction || stage === 'loading') return;
			setStage('loading');
			setStatus(providerEnabled ? 'Inline edit provider is working' : 'Inline edit provider mock is working');
			const contextFiles = resolveInlineContextFilesFromText(instruction, externalPaths || [], settings || DEFAULT_SETTINGS);
			if (providerEnabled && onProviderInlineEdit) {
				const original = mode === 'selection' ? selectedText : '';
				try {
					const response = stage === 'clarification'
						? await onProviderInlineEdit({ type: 'continue', message: instruction, contextFiles })
						: await onProviderInlineEdit({ type: 'edit', request: buildProviderRequest(instruction, contextFiles) });
					if (!response?.ok) {
						throw new Error(response?.error || response?.result?.error || 'Inline edit failed');
					}
					const result = response.result || {};
					if (result.clarification) {
						setAgentReply(result.clarification);
						setInput('');
						setStage('clarification');
						setStatus('Clarification requested');
						return;
					}
					const nextText = mode === 'cursor'
						? normalizeInsertionText(result.insertedText || response.rawText || '')
						: (result.editedText || response.rawText || '');
					setPreviewOriginal(original);
					setPreviewText(nextText);
					setInput('');
					setStage('preview');
					setStatus(`Review ${response.provider || 'provider'} inline edit preview`);
				}
				catch (error) {
					setAgentReply(error instanceof Error ? error.message : String(error));
					setInput('');
					setStage('clarification');
					setStatus('Inline edit failed');
				}
				return;
			}
			if (stage === 'input' && instruction.toLowerCase().includes('clarify')) {
				scheduleLocal(() => {
					setAgentReply('What tone, audience, or constraint should I apply to this inline edit?');
					setInput('');
					setStage('clarification');
					setStatus('Clarification requested');
				}, 420);
				return;
			}
			const response = stage === 'clarification' ? instruction : '';
			const original = mode === 'selection' ? selectedText : '';
			scheduleLocal(() => {
				setPreviewOriginal(original);
				setPreviewText(mode === 'cursor'
					? normalizeInsertionText(buildMockInlineInsertion(instruction))
					: buildMockInlineEditResult(original, stage === 'clarification' ? 'clarify inline edit' : instruction, response));
				setInput('');
				setStage('preview');
				setStatus('Review inline edit preview');
			}, 520);
		}

		function acceptPreview() {
			if (stage !== 'preview') return;
			if (mode === 'cursor') {
				const before = noteText.slice(0, cursorIndex);
				const after = noteText.slice(cursorIndex);
				const insertion = previewText || '';
				const separator = before && !before.endsWith('\n') ? '\n\n' : '';
				setNoteText(`${before}${separator}${insertion}${after}`);
				setCursorIndex(cursorIndex + separator.length + insertion.length);
				setStatus('Inserted');
			}
			else {
				const before = noteText.slice(0, selectionRange.start);
				const after = noteText.slice(selectionRange.end);
				const replacement = previewText || '';
				setNoteText(`${before}${replacement}${after}`);
				setSelectionRange({ start: selectionRange.start, end: selectionRange.start + replacement.length });
				setStatus('Edit applied');
			}
			setActive(false);
			setStage('idle');
			setAgentReply('');
			setPreviewText('');
			setPreviewOriginal('');
			setHighlightVisible(false);
		}

		function rejectPreview() {
			if (stage !== 'preview') return;
			setActive(false);
			setStage('idle');
			setAgentReply('');
			setPreviewText('');
			setPreviewOriginal('');
			setHighlightVisible(mode === 'selection');
			setStatus('Edit rejected');
		}

		function renderInlineInput() {
			const showReply = Boolean(agentReply) && stage === 'clarification';
			return h('div', { className: `claudian-inline-input-container ${showReply ? 'has-agent-reply' : ''}` },
				showReply ? h('div', { className: 'claudian-inline-agent-reply' }, agentReply) : h('div', { className: 'claudian-inline-agent-reply claudian-hidden' }),
				h(MentionDropdown, {
					visible: showMention,
					items: mentionItems,
					selectedIndex: mentionIndex,
					onHover: setMentionIndex,
					onPick: pickMention,
				}),
				h('div', { className: 'claudian-inline-input-wrap' },
					h('input', {
						ref: inputRef,
						type: 'text',
						className: 'claudian-inline-input',
						placeholder: stage === 'clarification'
							? 'Reply to continue...'
							: mode === 'cursor'
								? 'Insert instructions...'
								: 'Edit instructions...',
						spellCheck: false,
						disabled: stage === 'loading',
						value: input,
						onChange: (event) => {
							setInput(event.target.value);
							setInputCursorIndex(typeof event.target.selectionStart === 'number' ? event.target.selectionStart : event.target.value.length);
						},
						onClick: (event) => setInputCursorIndex(typeof event.currentTarget.selectionStart === 'number' ? event.currentTarget.selectionStart : input.length),
						onKeyUp: (event) => setInputCursorIndex(typeof event.currentTarget.selectionStart === 'number' ? event.currentTarget.selectionStart : input.length),
						onKeyDown: (event) => {
							const liveValue = event.currentTarget.value;
							const liveCursor = typeof event.currentTarget.selectionStart === 'number' ? event.currentTarget.selectionStart : liveValue.length;
							const liveMentionTrigger = getMentionTrigger(liveValue, liveCursor);
							const liveMentionQuery = liveMentionTrigger?.query || '';
							const liveMentionItems = liveMentionTrigger
								? buildMentionItems(liveMentionQuery, externalPaths || [], [], settings || DEFAULT_SETTINGS, providerId || 'claude')
									.filter((item) => item.type === 'file' || item.type === 'context-file' || item.type === 'folder' || item.type === 'context-folder')
								: [];
							const liveShowMention = !!liveMentionTrigger && mentionDismissedInput !== liveValue;
							if (liveShowMention) {
								if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
									event.preventDefault();
									const direction = event.key === 'ArrowDown' ? 1 : -1;
									setMentionIndex((current) => {
										const max = Math.max(0, liveMentionItems.length - 1);
										return Math.max(0, Math.min(max, current + direction));
									});
									return;
								}
								if ((event.key === 'Enter' || event.key === 'Tab') && liveMentionItems.length > 0 && !event.isComposing) {
									event.preventDefault();
									pickMention(liveMentionItems[mentionIndex] || liveMentionItems[0], liveMentionTrigger);
									return;
								}
								if (event.key === 'Escape' && !event.isComposing) {
									event.preventDefault();
									setMentionDismissedInput(liveValue);
									return;
								}
							}
							if (event.key === 'Enter' && !event.isComposing) {
								event.preventDefault();
								generate();
							}
							if (event.key === 'Escape' && !event.isComposing) {
								event.preventDefault();
								setActive(false);
								setStage('idle');
								setStatus('Inline edit cancelled');
							}
						},
					}),
					h('div', { className: `claudian-inline-spinner ${stage === 'loading' ? '' : 'claudian-hidden'}` }),
				),
			);
		}

		function renderDocument() {
			const isSelection = mode === 'selection';
			const start = isSelection ? selectionRange.start : cursorIndex;
			const end = isSelection ? selectionRange.end : cursorIndex;
			const before = noteText.slice(0, start);
			const selected = noteText.slice(start, end);
			const after = noteText.slice(end);
			const showPreview = active && stage === 'preview';
			const showInput = active && stage !== 'preview';

			return h('div', { className: 'claudian-inline-editor-document markdown-source-view mod-cm6' },
				h('div', { className: 'claudian-inline-editor-path' }, inlineSeed.path),
				h('div', { className: `claudian-inline-editor-text cm-line ${showInput ? 'claudian-inline-input-line' : ''}` },
					renderPlainText(before),
					showInput ? renderInlineInput() : null,
					showPreview ? h(InlineDiffPreview, {
						mode,
						originalText: previewOriginal,
						nextText: previewText,
						onAccept: acceptPreview,
						onReject: rejectPreview,
					}) : null,
					isSelection && !showPreview
						? h('span', { className: highlightVisible ? 'claudian-selection-highlight' : '' }, renderPlainText(selected))
						: null,
					!isSelection && showPreview ? null : renderPlainText(after),
					isSelection && showPreview ? renderPlainText(after) : null,
				),
			);
		}

		if (!open) return null;

		return h('div', { className: 'claudian-inline-editor-panel' },
			h('div', { className: 'claudian-inline-editor-header' },
				h('div', { className: 'claudian-inline-editor-title' },
					h('span', null, 'Inline Edit'),
					h('span', { className: 'claudian-inline-editor-status' }, status),
				),
				h('button', { type: 'button', className: 'claudian-icon-button', onClick: onClose, 'aria-label': 'Close inline edit' }, h(Icon, { name: 'x' })),
			),
			h('div', { className: 'claudian-inline-mode-selector' },
				h('button', {
					type: 'button',
					className: `claudian-inline-mode-button claudian-inline-start-selection ${mode === 'selection' && active ? 'active' : ''}`,
					onClick: () => startInlineEdit('selection'),
				}, 'Selection'),
				h('button', {
					type: 'button',
					className: `claudian-inline-mode-button claudian-inline-start-cursor ${mode === 'cursor' && active ? 'active' : ''}`,
					onClick: () => startInlineEdit('cursor'),
				}, 'Cursor'),
			),
			renderDocument(),
		);
	}

	function ImagePreview({ images, settings, onRemove, onOpen }) {
		const items = images || [];
		return h('div', { className: `claudian-image-preview ${items.length ? 'claudian-visible-flex' : 'claudian-hidden'}` },
			items.map((image, index) => {
				const vaultPath = imageDisplayPath(image, settings);
				const isPdfSelectionImage = image.source === 'pdf-selection';
				const displayName = image.displayName || (isPdfSelectionImage ? `选择图表 ${index + 1}` : image.name) || 'image.png';
				return h('div', { key: image.id, className: `claudian-image-chip ${isPdfSelectionImage ? 'pdf-selection-image' : ''}`, title: isPdfSelectionImage ? displayName : vaultPath, 'data-vault-path': vaultPath },
					h('div', { className: 'claudian-image-thumb', onMouseDown: (event) => { event.preventDefault(); onOpen(image); } },
						h('img', { src: imageSrc(image), alt: image.name || 'Attached image' }),
					),
					h('div', { className: 'claudian-image-info' },
						h('span', { className: 'claudian-image-name', title: isPdfSelectionImage ? displayName : vaultPath }, displayName),
						h('span', { className: 'claudian-image-size' }, formatImageSize(image.size)),
					),
					h('span', {
						className: 'claudian-image-remove',
						role: 'button',
						'aria-label': 'Remove image',
						onMouseDown: (event) => {
							event.preventDefault();
							onRemove(image.id);
						},
					}, 'x'),
				);
			}),
		);
	}

	function queuedPreview(text, images) {
		const preview = String(text || '').trim();
		const clipped = preview.length > 40 ? `${preview.slice(0, 40)}...` : preview;
		const hasImages = Array.isArray(images) && images.length > 0;
		if (hasImages) return clipped ? `${clipped} [images]` : '[images]';
		return clipped;
	}

	function mergeQueuedText(existing, incoming) {
		const merged = [existing, incoming]
			.map((part) => String(part || '').trim())
			.filter(Boolean)
			.join('\n\n');
		return merged.length > MAX_SHELL_PAYLOAD_TEXT_LENGTH
			? `${merged.slice(0, Math.max(0, MAX_SHELL_PAYLOAD_TEXT_LENGTH - 3))}...`
			: merged;
	}

	function mergeQueuedImages(existing, incoming) {
		return mergeTurnImages(existing, incoming);
	}

	function mergeQueuedContext(existing, incoming) {
		const previous = normalizeTurnContext(existing);
		const next = normalizeTurnContext(incoming);
		const merged = {
			currentNotePath: next.currentNotePath || previous.currentNotePath,
			editorSelection: next.editorSelection || previous.editorSelection,
			browserSelection: next.browserSelection || previous.browserSelection,
			canvasSelection: next.canvasSelection || previous.canvasSelection,
			graphSelection: next.graphSelection || previous.graphSelection,
		};
		return hasTurnContext(merged) ? merged : null;
	}

	function mergeQueuedState(tab, incomingText, incomingImages, incomingContext, incomingDisplayText, incomingContextChips) {
		const displayText = incomingDisplayText === undefined ? incomingText : incomingDisplayText;
		return {
			queuedText: mergeQueuedText(tab?.queuedText, incomingText),
			queuedDisplayText: mergeQueuedText(tab?.queuedDisplayText, displayText),
			queuedContextChips: normalizeMessageContextChips([
				...(Array.isArray(tab?.queuedContextChips) ? tab.queuedContextChips : []),
				...(Array.isArray(incomingContextChips) ? incomingContextChips : []),
			]),
			queuedImages: mergeQueuedImages(tab?.queuedImages, incomingImages),
			queuedContext: mergeQueuedContext(tab?.queuedContext, incomingContext),
		};
	}

	const MAX_STATUS_PANEL_BASH_OUTPUTS = 50;

	function truncateStatusPanelDescription(description, maxLength = 50) {
		const value = String(description || '');
		if (value.length <= maxLength) return value;
		return `${value.slice(0, maxLength)}...`;
	}

	function collectStatusPanelData(tab) {
		const todos = [];
		const bashBlocks = Array.isArray(tab?.bashOutputs)
			? tab.bashOutputs.slice(-MAX_STATUS_PANEL_BASH_OUTPUTS)
			: [];
		for (const message of tab?.messages || []) {
			for (const block of message.contentBlocks || []) {
				if (block.type !== 'tool_use') continue;
				if (block.name === 'TodoWrite' && Array.isArray(block.input?.todos)) {
					todos.push(block.input.todos);
				}
			}
		}
		return {
			todos: todos[todos.length - 1] || [],
			bashBlocks,
		};
	}

	function isStatusPanelBashRunning(block) {
		return !block?.status || block.status === 'running';
	}

	function shouldAutoExpandStatusPanelBash(bashBlocks) {
		return (Array.isArray(bashBlocks) ? bashBlocks : []).some(isStatusPanelBashRunning);
	}

	function hasStatusPanelContent(tab) {
		const { todos, bashBlocks } = collectStatusPanelData(tab);
		return todos.length > 0 || bashBlocks.length > 0;
	}

	function StatusPanel({ tab }) {
		const [todoExpanded, setTodoExpanded] = useState(false);
		const [bashExpanded, setBashExpanded] = useState(false);
		const [manualBashExpanded, setManualBashExpanded] = useState(null);
		const [clearedBashCount, setClearedBashCount] = useState(0);
		const [bashEntryExpanded, setBashEntryExpanded] = useState({});
		const { todos, bashBlocks } = useMemo(() => collectStatusPanelData(tab), [tab]);
		useEffect(() => {
			setClearedBashCount(0);
			setBashEntryExpanded({});
			setManualBashExpanded(null);
			setBashExpanded(false);
		}, [tab?.id]);
		useEffect(() => {
			if (clearedBashCount > bashBlocks.length) {
				setClearedBashCount(bashBlocks.length);
			}
		}, [clearedBashCount, bashBlocks.length]);
		const hasTodos = todos.length > 0;
		const visibleBash = bashBlocks.slice(Math.min(clearedBashCount, bashBlocks.length));
		const latestBash = visibleBash[visibleBash.length - 1];
		const latestBashId = latestBash?.id || '';
		const autoExpandBash = shouldAutoExpandStatusPanelBash(visibleBash);
		useEffect(() => {
			setManualBashExpanded(null);
		}, [latestBashId]);
		useEffect(() => {
			if (visibleBash.length === 0) {
				setManualBashExpanded(null);
				setBashExpanded(false);
				return;
			}
			if (manualBashExpanded !== null) return;
			setBashExpanded(autoExpandBash);
		}, [visibleBash.length, latestBashId, latestBash?.status, autoExpandBash, manualBashExpanded]);
		const completed = todos.filter((todo) => todo.status === 'completed').length;
		const currentTask = todos.find((todo) => todo.status === 'in_progress');
		const todoAriaLabel = `${todoExpanded ? 'Collapse' : 'Expand'} task list - ${completed} of ${todos.length} completed`;
		const outputForBash = (block) => block?.result || block?.output || (block?.status === 'running' ? 'Running...' : '');
		const handleButtonKey = (event, action) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			event.stopPropagation();
			action();
		};
		const toggleEntry = (id) => {
			setBashEntryExpanded((current) => ({
				...current,
				[id]: current[id] === false,
			}));
		};
		const toggleBash = () => {
			setBashExpanded((value) => {
				const next = !value;
				setManualBashExpanded(next);
				return next;
			});
		};
		if (!hasTodos && visibleBash.length === 0) {
			return null;
		}
		return h('div', { className: 'claudian-status-panel' },
			visibleBash.length ? h('div', { className: 'claudian-status-panel-bash' },
				h('div', {
					className: 'claudian-tool-header claudian-status-panel-bash-header',
					tabIndex: 0,
					role: 'button',
					'aria-expanded': String(bashExpanded),
					onClick: toggleBash,
					onKeyDown: (event) => handleButtonKey(event, toggleBash),
				},
					h('span', { className: 'claudian-tool-icon' }, h(Icon, { name: 'terminal' })),
					h('span', { className: 'claudian-tool-label' }, bashExpanded ? 'Command output' : (latestBash ? truncateStatusPanelDescription(latestBash.command, 60) : 'Command output')),
					h('span', { className: `claudian-tool-current ${bashExpanded ? '' : 'claudian-hidden'}` }, latestBash?.command || ''),
					h('span', { className: `claudian-tool-status status-${latestBash?.status || 'running'} ${bashExpanded ? 'claudian-hidden' : ''}` }, latestBash?.status === 'completed' ? h(Icon, { name: 'check', size: 14 }) : latestBash?.status === 'error' ? h(Icon, { name: 'x', size: 14 }) : null),
					h('span', { className: 'claudian-status-panel-bash-actions' },
						h('span', {
							className: 'claudian-status-panel-bash-action claudian-status-panel-bash-action-copy',
							role: 'button',
							tabIndex: 0,
							title: 'Copy latest command output',
							'aria-label': 'Copy latest command output',
							onClick: (event) => {
								event.stopPropagation();
								const output = latestBash ? `$ ${latestBash.command}\n${outputForBash(latestBash)}` : '';
								navigator.clipboard?.writeText(output).catch(() => {});
							},
							onKeyDown: (event) => handleButtonKey(event, () => {
								const output = latestBash ? `$ ${latestBash.command}\n${outputForBash(latestBash)}` : '';
								navigator.clipboard?.writeText(output).catch(() => {});
							}),
						}, h(Icon, { name: 'copy', size: 14 })),
						h('span', {
							className: 'claudian-status-panel-bash-action claudian-status-panel-bash-action-clear',
							role: 'button',
							tabIndex: 0,
							title: 'Clear command output',
							'aria-label': 'Clear command output',
							onClick: (event) => {
								event.stopPropagation();
								setClearedBashCount(bashBlocks.length);
								setBashEntryExpanded({});
								setManualBashExpanded(null);
								setBashExpanded(false);
							},
							onKeyDown: (event) => handleButtonKey(event, () => {
								setClearedBashCount(bashBlocks.length);
								setBashEntryExpanded({});
								setManualBashExpanded(null);
								setBashExpanded(false);
							}),
						}, h(Icon, { name: 'trash-2', size: 14 })),
					),
				),
				bashExpanded ? h('div', { className: 'claudian-status-panel-bash-content' },
					visibleBash.map((block, index) => {
						const entryId = block.id || `bash-${index}`;
						const entryExpanded = bashEntryExpanded[entryId] !== false;
						return h('div', { key: entryId, className: 'claudian-tool-call claudian-status-panel-bash-entry' },
							h('div', {
								className: 'claudian-tool-header',
								tabIndex: 0,
								role: 'button',
								'aria-expanded': String(entryExpanded),
								onClick: () => toggleEntry(entryId),
								onKeyDown: (event) => handleButtonKey(event, () => toggleEntry(entryId)),
							},
								h('span', { className: 'claudian-tool-icon' }, h(Icon, { name: 'dollar-sign', size: 14 })),
								h('span', { className: 'claudian-tool-label' }, `$ ${truncateStatusPanelDescription(block.command, 60)}`),
								h('span', { className: `claudian-tool-status status-${block.status || 'running'}` }, block.status === 'completed' ? h(Icon, { name: 'check', size: 14 }) : block.status === 'error' ? h(Icon, { name: 'x', size: 14 }) : null),
							),
							h('div', { className: `claudian-tool-content ${entryExpanded ? '' : 'claudian-hidden'}` },
								h('div', { className: 'claudian-tool-result-row' },
									h('span', { className: 'claudian-tool-result-text' }, outputForBash(block) || 'Running...'),
								),
							),
						);
					}),
				) : null,
			) : null,
			hasTodos ? h('div', { className: 'claudian-status-panel-todos' },
				h('div', {
					className: 'claudian-status-panel-header',
					tabIndex: 0,
					role: 'button',
					'aria-expanded': String(todoExpanded),
					'aria-label': todoAriaLabel,
					onClick: () => setTodoExpanded((value) => !value),
					onKeyDown: (event) => handleButtonKey(event, () => setTodoExpanded((value) => !value)),
				},
					h('span', { className: 'claudian-status-panel-icon' }, h(Icon, { name: 'check', size: 16 })),
					h('span', { className: 'claudian-status-panel-label' }, `Tasks (${completed}/${todos.length})`),
					!todoExpanded && currentTask ? h('span', { className: 'claudian-status-panel-current' }, currentTask.activeForm || currentTask.content) : null,
					!todoExpanded && completed === todos.length ? h('span', { className: 'claudian-status-panel-status status-completed' }, h(Icon, { name: 'check', size: 14 })) : null,
				),
				h('div', { className: `claudian-status-panel-content claudian-todo-list-container ${todoExpanded ? '' : 'claudian-hidden'}` },
					h(TodoContent, { todos }),
				),
			) : null,
		);
	}

	function MessageImages({ images, settings }) {
		const [modalImage, setModalImage] = useState(null);
		const items = images || [];
		if (items.length === 0) return null;
		return h(React.Fragment, null,
			h('div', { className: 'claudian-message-images' },
				items.map((image) => {
					const vaultPath = imageDisplayPath(image, settings);
					return h('div', { key: image.id, className: 'claudian-message-image', title: vaultPath, 'data-vault-path': vaultPath, onClick: () => setModalImage(image) },
						h('img', { src: imageSrc(image), alt: image.name || 'Attached image' }),
					);
				}),
			),
			h(ImageModal, { image: modalImage, onClose: () => setModalImage(null) }),
		);
	}

	function messageContextChipIcon(type) {
		if (type === 'graph-node') return 'map';
		if (type === 'image') return 'image';
		if (type === 'table') return 'file-text';
		if (type === 'citation') return 'quote';
		if (type === 'snippet') return 'file-text';
		return 'file-text';
	}

	function MessageContextChips({ chips }) {
		const list = normalizeMessageContextChips(chips);
		if (list.length === 0) return null;
		return h('div', { className: 'claudian-message-context-chips' },
			list.map((chip, index) => h('span', {
				key: `${chip.type || 'pdf'}-${chip.label}-${index}`,
				className: `claudian-message-context-chip ${chip.type || 'pdf'}`,
				title: [chip.label, chip.detail].filter(Boolean).join('\n'),
			},
				h('span', { className: 'claudian-message-context-chip-icon' }, h(Icon, { name: messageContextChipIcon(chip.type), size: 12 })),
				h('span', { className: 'claudian-message-context-chip-label' }, chip.label),
				chip.detail ? h('span', { className: 'claudian-message-context-chip-detail' }, chip.detail) : null,
			)),
		);
	}

	function InlineInteractionResponseStatus({ block }) {
		if (!block?.responsePending && !block?.responseError) return null;
		return h('div', {
			className: `claudian-inline-response-status ${block.responseError ? 'is-error' : 'is-pending'}`,
			role: block.responseError ? 'alert' : 'status',
		}, block.responseError ? `Response failed: ${block.responseError}` : 'Sending response to runtime...');
	}

	function AskQuestionBlock({ block, onAnswer }) {
		const questions = block.questions || [];
		const rootRef = useRef(null);
		const [active, setActive] = useState(0);
		const [focusIndex, setFocusIndex] = useState(0);
		const [answers, setAnswers] = useState({});
		const [customAnswers, setCustomAnswers] = useState({});
		const [customInputFocused, setCustomInputFocused] = useState(false);
		const isSubmit = active >= questions.length;
		const current = questions[active];
		const allAnswered = questions.every(isAnswered);

		useEffect(() => {
			window.requestAnimationFrame(() => rootRef.current?.focus());
		}, []);

		useEffect(() => {
			setFocusIndex(0);
		}, [active]);

		function select(question, option) {
			setAnswers((draft) => {
				const next = { ...draft };
				if (question.multiSelect) {
					const values = new Set(next[question.id] || []);
					if (values.has(option.value)) values.delete(option.value);
					else values.add(option.value);
					next[question.id] = Array.from(values);
				}
				else {
					next[question.id] = option.value;
				}
				return next;
			});
			if (!question.multiSelect) {
				setCustomAnswers((draft) => ({ ...draft, [question.id]: '' }));
			}
			if (!question.multiSelect) setActive((value) => Math.min(value + 1, questions.length));
		}

		function isAnswered(question) {
			const value = answers[question.id];
			const custom = String(customAnswers[question.id] || '').trim();
			return custom.length > 0 || (Array.isArray(value) ? value.length > 0 : Boolean(value));
		}

		function mergedAnswers() {
			const result = {};
			for (const question of questions) {
				const selected = answers[question.id];
				const custom = String(customAnswers[question.id] || '').trim();
				if (question.multiSelect) {
					const values = Array.isArray(selected) ? [...selected] : (selected ? [selected] : []);
					if (custom) values.push(custom);
					result[question.id] = values;
				}
				else {
					result[question.id] = custom || selected || '';
				}
			}
			return result;
		}

		function updateCustom(question, value) {
			setCustomAnswers((draft) => ({ ...draft, [question.id]: value }));
			if (!question.multiSelect && value.trim()) {
				setAnswers((draft) => ({ ...draft, [question.id]: '' }));
			}
		}

		function displayAnswer(question) {
			const merged = mergedAnswers()[question.id];
			if (Array.isArray(merged)) return merged.join(', ');
			return merged || 'Not answered';
		}

		function moveTab(delta) {
			setActive((value) => Math.max(0, Math.min(questions.length, value + delta)));
		}

		function handleKeyDown(event) {
			if (event.isComposing) return;
			if (block.responsePending && (event.key === 'Enter' || event.key === 'Escape')) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}
			if (customInputFocused) {
				if (event.key === 'Escape') {
					event.preventDefault();
					event.stopPropagation();
					setCustomInputFocused(false);
					rootRef.current?.focus();
					return;
				}
				if (event.key === 'Enter' && current && String(customAnswers[current.id] || '').trim()) {
					event.preventDefault();
					event.stopPropagation();
					setCustomInputFocused(false);
					setActive((value) => Math.min(value + 1, questions.length));
				}
				return;
			}
			const currentOptionsLength = current?.options?.length || 0;
			const hasCustom = !isSubmit && current?.isOther === true;
			const maxIndex = isSubmit ? 1 : Math.max(0, currentOptionsLength + (hasCustom ? 1 : 0) - 1);
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				event.stopPropagation();
				setFocusIndex((value) => Math.min(maxIndex, value + 1));
				return;
			}
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				event.stopPropagation();
				setFocusIndex((value) => Math.max(0, value - 1));
				return;
			}
			if (event.key === 'ArrowRight' || (event.key === 'Tab' && !event.shiftKey)) {
				event.preventDefault();
				event.stopPropagation();
				moveTab(1);
				return;
			}
			if (event.key === 'ArrowLeft' || (event.key === 'Tab' && event.shiftKey)) {
				event.preventDefault();
				event.stopPropagation();
				moveTab(-1);
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				onAnswer(block.id, null);
				return;
			}
			if (event.key !== 'Enter') return;
			event.preventDefault();
			event.stopPropagation();
			if (isSubmit) {
				if (focusIndex === 0 && allAnswered && !block.responsePending) onAnswer(block.id, mergedAnswers());
				if (focusIndex === 1 && !block.responsePending) onAnswer(block.id, null);
				return;
			}
			const option = current?.options?.[focusIndex];
			if (option) select(current, option);
			else if (current?.isOther === true && focusIndex === (current.options || []).length) {
				setCustomInputFocused(true);
				window.requestAnimationFrame(() => {
					const input = rootRef.current?.querySelector('.claudian-ask-custom-item.is-focused .claudian-ask-custom-text');
					input?.focus();
				});
			}
		}

		return h('div', { ref: rootRef, className: `claudian-ask-question-inline claudian-permission-card claudian-permission-card-${block.approvalKind || 'generic'} ${block.responsePending ? 'is-responding' : ''} ${block.responseError ? 'has-response-error' : ''}`, tabIndex: 0, onKeyDown: handleKeyDown },
			h('div', { className: 'claudian-ask-inline-title' }, block.title || 'Question'),
			h('div', { className: 'claudian-ask-tab-bar' },
				questions.map((question, index) => h('span', {
					key: question.id,
					className: `claudian-ask-tab ${active === index ? 'is-active' : ''} ${isAnswered(question) ? 'is-answered' : ''}`,
					onClick: () => setActive(index),
					title: question.question,
				},
					h('span', { className: 'claudian-ask-tab-label' }, question.header || `Q${index + 1}`),
					h('span', { className: 'claudian-ask-tab-tick' }, isAnswered(question) ? ' ✓' : ''),
				)),
				h('span', {
					className: `claudian-ask-tab ${isSubmit ? 'is-active' : ''}`,
					onClick: () => setActive(questions.length),
				},
					h('span', { className: 'claudian-ask-tab-submit-check' }, allAnswered ? '✓ ' : ''),
					h('span', { className: 'claudian-ask-tab-label' }, 'Submit'),
				),
			),
			h('div', { className: 'claudian-ask-content' },
				!isSubmit && current ? [
					h('div', { key: 'q', className: 'claudian-ask-question-text' }, current.question),
					h('div', { key: 'list', className: 'claudian-ask-list' },
						[
						...current.options.map((option, index) => {
							const value = answers[current.id];
							const selected = Array.isArray(value) ? value.includes(option.value) : value === option.value;
							return h('div', {
								key: option.value,
								className: `claudian-ask-item ${selected ? 'is-selected' : ''} ${index === focusIndex ? 'is-focused' : ''}`,
								onClick: () => {
									setFocusIndex(index);
									select(current, option);
								},
							},
								h('span', { className: 'claudian-ask-cursor' }, index === focusIndex ? '›' : ' '),
								h('span', { className: 'claudian-ask-item-num' }, `${index + 1}. `),
								current.multiSelect ? h('span', { className: `claudian-ask-check ${selected ? 'is-checked' : ''}` }, selected ? '[✓] ' : '[ ] ') : null,
								h('span', { className: 'claudian-ask-item-content' },
									h('span', { className: 'claudian-ask-label-row' },
										h('span', { className: 'claudian-ask-item-label' }, option.label),
										!current.multiSelect && selected ? h('span', { className: 'claudian-ask-check-mark' }, ' ✓') : null,
									),
									option.description ? h('span', { className: 'claudian-ask-item-desc' }, option.description) : null,
								),
							);
						}),
						current.isOther === true ? h('div', {
							key: 'custom',
							className: `claudian-ask-item claudian-ask-custom-item ${focusIndex === current.options.length ? 'is-focused' : ''}`,
							onClick: () => {
								setFocusIndex(current.options.length);
								setCustomInputFocused(true);
								window.requestAnimationFrame(() => {
									const input = rootRef.current?.querySelector('.claudian-ask-custom-item.is-focused .claudian-ask-custom-text');
									input?.focus();
								});
							},
						},
							h('span', { className: 'claudian-ask-cursor' }, focusIndex === current.options.length ? '›' : ' '),
							h('span', { className: 'claudian-ask-item-num' }, `${current.options.length + 1}. `),
							current.multiSelect ? h('span', {
								className: `claudian-ask-check ${String(customAnswers[current.id] || '').trim() ? 'is-checked' : ''}`,
							}, String(customAnswers[current.id] || '').trim() ? '[✓] ' : '[ ] ') : null,
							h('input', {
								className: 'claudian-ask-custom-text',
								type: current.isSecret ? 'password' : 'text',
								value: customAnswers[current.id] || '',
								placeholder: current.isSecret ? 'Enter secret.' : 'Type something.',
								onChange: (event) => updateCustom(current, event.target.value),
								onFocus: () => {
									setFocusIndex(current.options.length);
									setCustomInputFocused(true);
								},
								onBlur: () => setCustomInputFocused(false),
								onKeyDown: (event) => {
									if (event.key === 'Enter' && String(customAnswers[current.id] || '').trim()) {
										event.preventDefault();
										event.stopPropagation();
										setCustomInputFocused(false);
										setActive((value) => Math.min(value + 1, questions.length));
									}
									if (event.key === 'Escape') {
										event.preventDefault();
										event.stopPropagation();
										setCustomInputFocused(false);
										rootRef.current?.focus();
									}
								},
							}),
						) : null,
						],
					),
					h('div', { key: 'hint', className: 'claudian-ask-hints' }, 'Enter to select · Tab/Arrow keys to navigate · Esc to cancel'),
				] : [
					h('div', { key: 'title', className: 'claudian-ask-review-title' }, 'Review your answers'),
					h('div', { key: 'review', className: 'claudian-ask-review' },
						questions.map((question, index) => h('div', {
							key: question.id,
							className: 'claudian-ask-review-pair',
							onClick: () => setActive(index),
						},
							h('div', { className: 'claudian-ask-review-num' }, `${index + 1}.`),
							h('div', { className: 'claudian-ask-review-body' },
								h('div', { className: 'claudian-ask-review-q-text' }, question.question),
								h('div', {
									className: isAnswered(question) ? 'claudian-ask-review-a-text' : 'claudian-ask-review-empty',
								}, displayAnswer(question)),
							),
						)),
					),
					h('div', { key: 'prompt', className: 'claudian-ask-review-prompt' }, 'Ready to submit your answers?'),
					h('div', { key: 'actions', className: 'claudian-ask-list' },
						h('div', {
							className: `claudian-ask-item ${focusIndex === 0 ? 'is-focused' : ''} ${allAnswered ? '' : 'is-disabled'}`,
							onClick: () => {
								setFocusIndex(0);
								if (allAnswered && !block.responsePending) onAnswer(block.id, mergedAnswers());
							},
						},
							h('span', { className: 'claudian-ask-cursor' }, focusIndex === 0 ? '›' : ' '),
							h('span', { className: 'claudian-ask-item-num' }, '1. '),
							h('span', { className: 'claudian-ask-item-label' }, 'Submit answers'),
						),
						h('div', {
							className: `claudian-ask-item ${focusIndex === 1 ? 'is-focused' : ''}`,
							onClick: () => {
								setFocusIndex(1);
								if (!block.responsePending) onAnswer(block.id, null);
							},
						},
							h('span', { className: 'claudian-ask-cursor' }, focusIndex === 1 ? '›' : ' '),
							h('span', { className: 'claudian-ask-item-num' }, '2. '),
							h('span', { className: 'claudian-ask-item-label' }, 'Cancel'),
						),
					),
				],
			),
			h(InlineInteractionResponseStatus, { block }),
		);
	}

	function PermissionBlock({ block, onDecision }) {
		const rootRef = useRef(null);
		const [focusIndex, setFocusIndex] = useState(0);
		const options = normalizePermissionDecisionOptions(block);

		useEffect(() => {
			window.requestAnimationFrame(() => rootRef.current?.focus());
		}, []);

		function choose(index) {
			if (block.responsePending) return;
			const item = options[index] || options[0];
			onDecision(block.id, item?.decision || 'deny');
		}

		function handleKeyDown(event) {
			if (event.isComposing) return;
			if (block.responsePending && (event.key === 'Enter' || event.key === 'Escape')) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				event.stopPropagation();
				setFocusIndex((value) => Math.min(options.length - 1, value + 1));
				return;
			}
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				event.stopPropagation();
				setFocusIndex((value) => Math.max(0, value - 1));
				return;
			}
			if (event.key === 'Enter') {
				event.preventDefault();
				event.stopPropagation();
				choose(focusIndex);
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				onDecision(block.id, 'cancel');
			}
		}

		const kindLabel = block.approvalKind === 'command'
			? 'Command'
			: block.approvalKind === 'file_change'
				? 'File change'
				: 'Permission';
		return h('div', {
			ref: rootRef,
			className: `claudian-ask-question-inline claudian-permission-card claudian-permission-card-runtime claudian-permission-card-${block.approvalKind || 'generic'} ${block.responsePending ? 'is-responding' : ''} ${block.responseError ? 'has-response-error' : ''}`,
			'data-approval-kind': block.approvalKind || 'generic',
			tabIndex: 0,
			onKeyDown: handleKeyDown,
		},
			h('div', { className: 'claudian-permission-card-header' },
				h('div', { className: 'claudian-ask-inline-title' }, block.title || 'Permission required'),
				h('div', { className: 'claudian-permission-kind-badge' }, kindLabel),
			),
			h('div', { className: 'claudian-ask-approval-info' },
				h('div', { className: 'claudian-ask-approval-tool' },
					h('span', { className: 'claudian-ask-approval-icon' }, h(Icon, { name: block.icon || 'terminal' })),
					h('span', { className: 'claudian-ask-approval-tool-name' }, block.tool || 'Tool call'),
				),
				block.reason ? h('div', { className: 'claudian-ask-approval-reason' }, block.reason) : null,
				block.path ? h('div', { className: 'claudian-ask-approval-blocked-path' }, block.path) : null,
				block.description ? h('div', { className: 'claudian-ask-approval-desc' }, block.description) : null,
			),
			h('div', { className: 'claudian-ask-content' },
				h('div', { className: 'claudian-ask-list claudian-permission-actions' },
					options.map((item, index) => h('div', {
						key: item.value,
						className: `claudian-ask-item ${index === focusIndex ? 'is-focused' : ''}`,
						onClick: () => {
							setFocusIndex(index);
							if (!block.responsePending) onDecision(block.id, item.decision || 'deny');
						},
					},
						h('span', { className: 'claudian-ask-cursor' }, index === focusIndex ? '›' : ' '),
						h('span', { className: 'claudian-ask-item-num' }, `${index + 1}. `),
						h('span', { className: 'claudian-ask-item-content' },
							h('span', { className: 'claudian-ask-item-label' }, item.label),
							item.description ? h('span', { className: 'claudian-ask-item-desc' }, item.description) : null,
						),
					)),
				),
				h('div', { className: 'claudian-ask-hints' }, 'Arrow keys to navigate · Enter to select · Esc to cancel'),
				h(InlineInteractionResponseStatus, { block }),
			),
		);
	}

	function PlanApprovalBlock({ block, onDecision }) {
		const rootRef = useRef(null);
		const inputRef = useRef(null);
		const [feedback, setFeedback] = useState('');
		const [focusIndex, setFocusIndex] = useState(0);
		const [inputFocused, setInputFocused] = useState(false);
		const isPostPlan = block.variant === 'post-plan';
		const customIndex = isPostPlan ? 1 : 2;
		const maxIndex = isPostPlan ? 2 : 2;
		const customDecisionType = isPostPlan ? 'revise' : 'feedback';
		const customPlaceholder = isPostPlan ? 'Enter feedback to revise plan...' : 'Enter feedback to continue planning...';

		useEffect(() => {
			window.requestAnimationFrame(() => rootRef.current?.focus());
		}, []);

		function choose(index) {
			if (block.responsePending) return;
			if (isPostPlan && index === 0) {
				onDecision(block.id, { type: 'implement' });
				return;
			}
			if (isPostPlan && index === 2) {
				onDecision(block.id, { type: 'cancel' });
				return;
			}
			if (!isPostPlan && index === 0) {
				onDecision(block.id, { type: 'approve-new-session' });
				return;
			}
			if (!isPostPlan && index === 1) {
				onDecision(block.id, { type: 'approve' });
				return;
			}
			inputRef.current?.focus();
			setInputFocused(true);
		}

		function handleKeyDown(event) {
			if (event.isComposing) return;
			if (block.responsePending && (event.key === 'Enter' || event.key === 'Escape')) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}
			if (inputFocused) {
				if (event.key === 'Escape') {
					event.preventDefault();
					event.stopPropagation();
					setInputFocused(false);
					inputRef.current?.blur();
					rootRef.current?.focus();
					return;
				}
				if (event.key === 'Enter' && feedback.trim()) {
					event.preventDefault();
					event.stopPropagation();
					if (!block.responsePending) onDecision(block.id, { type: customDecisionType, text: feedback.trim() });
				}
				return;
			}
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				event.stopPropagation();
				setFocusIndex((value) => Math.min(maxIndex, value + 1));
				return;
			}
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				event.stopPropagation();
				setFocusIndex((value) => Math.max(0, value - 1));
				return;
			}
			if (event.key === 'Enter') {
				event.preventDefault();
				event.stopPropagation();
				choose(focusIndex);
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				onDecision(block.id, { type: 'cancel' });
			}
		}

		return h('div', { ref: rootRef, className: `claudian-plan-approval-inline ${block.responsePending ? 'is-responding' : ''} ${block.responseError ? 'has-response-error' : ''}`, tabIndex: 0, onKeyDown: handleKeyDown },
			h('div', { className: 'claudian-plan-inline-title' }, 'Plan complete'),
			block.plan ? h('div', { className: 'claudian-plan-content-preview' },
				h('div', { className: 'claudian-plan-content-text' }, block.plan),
			) : null,
			isPostPlan ? null : h('div', { className: 'claudian-plan-permissions' },
				h('div', { className: 'claudian-plan-permissions-label' }, 'Requested permissions:'),
				h('ul', { className: 'claudian-plan-permissions-list' },
					(block.permissions || ['Edit files in the workspace', 'Run test commands']).map((item) => h('li', { key: item }, item)),
				),
			),
			h('div', { className: 'claudian-ask-list' },
				h('div', {
					className: `claudian-ask-item ${focusIndex === 0 ? 'is-focused' : ''}`,
					onClick: () => {
						setFocusIndex(0);
						choose(0);
					},
				},
					h('span', { className: 'claudian-ask-cursor' }, focusIndex === 0 ? '›' : ' '),
					h('span', { className: 'claudian-ask-item-num' }, '1. '),
					h('span', { className: 'claudian-ask-item-label' }, isPostPlan ? 'Implement' : 'Approve (new session)'),
				),
				h('div', {
					className: `claudian-ask-item ${isPostPlan ? 'claudian-ask-custom-item' : ''} ${focusIndex === 1 ? 'is-focused' : ''}`,
					onClick: () => {
						setFocusIndex(1);
						choose(1);
					},
				},
					h('span', { className: 'claudian-ask-cursor' }, focusIndex === 1 ? '›' : ' '),
					h('span', { className: 'claudian-ask-item-num' }, '2. '),
					isPostPlan ? h('input', {
						ref: inputRef,
						className: 'claudian-ask-custom-text',
						value: feedback,
						placeholder: customPlaceholder,
						onChange: (event) => setFeedback(event.target.value),
						onFocus: () => setInputFocused(true),
						onBlur: () => setInputFocused(false),
						onKeyDown: (event) => {
							if (event.key === 'Enter' && feedback.trim()) {
								event.preventDefault();
								event.stopPropagation();
								if (!block.responsePending) onDecision(block.id, { type: customDecisionType, text: feedback.trim() });
							}
							if (event.key === 'Escape') {
								event.preventDefault();
								event.stopPropagation();
								setInputFocused(false);
								inputRef.current?.blur();
								rootRef.current?.focus();
							}
						},
					}) : h('span', { className: 'claudian-ask-item-label' }, 'Approve (current session)'),
				),
				h('div', {
					className: `claudian-ask-item ${isPostPlan ? '' : 'claudian-ask-custom-item'} ${focusIndex === 2 ? 'is-focused' : ''}`,
					onClick: () => {
						setFocusIndex(2);
						choose(2);
					},
				},
					h('span', { className: 'claudian-ask-cursor' }, focusIndex === 2 ? '›' : ' '),
					h('span', { className: 'claudian-ask-item-num' }, '3. '),
					isPostPlan ? h('span', { className: 'claudian-ask-item-label' }, 'Cancel') : h('input', {
						ref: inputRef,
						className: 'claudian-ask-custom-text',
						value: feedback,
						placeholder: customPlaceholder,
						onChange: (event) => setFeedback(event.target.value),
						onFocus: () => setInputFocused(true),
						onBlur: () => setInputFocused(false),
						onKeyDown: (event) => {
							if (event.key === 'Enter' && feedback.trim()) {
								event.preventDefault();
								event.stopPropagation();
								if (!block.responsePending) onDecision(block.id, { type: customDecisionType, text: feedback.trim() });
							}
							if (event.key === 'Escape') {
								event.preventDefault();
								event.stopPropagation();
								setInputFocused(false);
								inputRef.current?.blur();
								rootRef.current?.focus();
							}
						},
					}),
				),
			),
			h('div', { className: 'claudian-ask-hints' }, 'Arrow keys to navigate · Enter to select · Esc to cancel'),
			h(InlineInteractionResponseStatus, { block }),
		);
	}

	function InlineInteractionSurface({ pending, onAskAnswer, onPermission, onPlan }) {
		const block = pending?.block;
		if (!block) return null;
		return h('div', {
			className: 'claudian-inline-interaction-slot',
			'data-inline-interaction-type': block.type,
		},
			block.type === 'ask_user' ? h(AskQuestionBlock, { key: block.id, block, onAnswer: onAskAnswer }) : null,
			block.type === 'permission' ? h(PermissionBlock, { key: block.id, block, onDecision: onPermission }) : null,
			block.type === 'plan_approval' ? h(PlanApprovalBlock, { key: block.id, block, onDecision: onPlan }) : null,
		);
	}

	function NavigationSidebar({ messagesRef, messages, onReachedBottom }) {
		const [visible, setVisible] = useState(false);
		const [tocOpen, setTocOpen] = useState(false);
		const navRef = useRef(null);
		const popoverRef = useRef(null);
		const directoryEntries = useMemo(() => (messages || [])
			.filter((message) => message.role === 'user')
			.map((message) => ({
				id: message.id,
				title: formatConversationDirectoryTitle(message.content || message.contentBlocks?.map((block) => block.content || '').join('\n') || ''),
			}))
			.filter((entry) => entry.title.length > 0), [messages]);

		useEffect(() => {
			const messagesEl = messagesRef.current;
			if (!messagesEl) return undefined;
			let frame = 0;
			const applyVisibility = () => {
				frame = 0;
				setVisible(messagesEl.scrollHeight > messagesEl.clientHeight + 50);
			};
			const requestVisibility = () => {
				if (frame) return;
				frame = window.requestAnimationFrame(applyVisibility);
			};
			requestVisibility();
			messagesEl.addEventListener('scroll', requestVisibility, { passive: true });
			window.addEventListener('resize', requestVisibility);
			const observer = typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(requestVisibility)
				: null;
			observer?.observe(messagesEl);
			return () => {
				if (frame) window.cancelAnimationFrame(frame);
				observer?.disconnect();
				messagesEl.removeEventListener('scroll', requestVisibility);
				window.removeEventListener('resize', requestVisibility);
			};
		}, [messagesRef, messages]);

		useEffect(() => {
			if (!tocOpen) return undefined;
			const closeOnOutsideClick = (event) => {
				const target = event.target;
				if (navRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
				setTocOpen(false);
			};
			document.addEventListener('mousedown', closeOnOutsideClick);
			return () => document.removeEventListener('mousedown', closeOnOutsideClick);
		}, [tocOpen]);

		function scrollToTop() {
			const messagesEl = messagesRef.current;
			if (!messagesEl) return;
			messagesEl.scrollTo({ top: 0, behavior: 'smooth' });
		}

		function scrollToBottom() {
			const messagesEl = messagesRef.current;
			if (!messagesEl) return;
			onReachedBottom?.();
			messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
		}

		function scrollToElement(element) {
			const messagesEl = messagesRef.current;
			if (!messagesEl || !element) return;
			messagesEl.scrollTo({ top: getElementScrollTop(messagesEl, element), behavior: 'smooth' });
		}

		function scrollToMessageById(messageId) {
			const target = getUserMessageElements(messagesRef.current)
				.find((element) => element.getAttribute('data-message-id') === messageId);
			if (target) scrollToElement(target);
			setTocOpen(false);
		}

		function scrollToAdjacentMessage(direction) {
			const messagesEl = messagesRef.current;
			const userMessages = getUserMessageElements(messagesEl);
			if (!messagesEl || userMessages.length === 0) return;
			const scrollTop = messagesEl.scrollTop;
			const threshold = 30;
			if (direction === 'prev') {
				for (let index = userMessages.length - 1; index >= 0; index -= 1) {
					if (getElementScrollTop(messagesEl, userMessages[index]) < scrollTop - threshold) {
						scrollToElement(userMessages[index]);
						return;
					}
				}
				scrollToTop();
				return;
			}
			for (let index = 0; index < userMessages.length; index += 1) {
				if (getElementScrollTop(messagesEl, userMessages[index]) > scrollTop + threshold) {
					scrollToElement(userMessages[index]);
					return;
				}
			}
			scrollToBottom();
		}

		const navButton = (className, icon, label, onClick) => h('div', {
			className: `claudian-nav-btn ${className}`,
			role: 'button',
			tabIndex: 0,
			title: label,
			'aria-label': label,
			onClick,
			onKeyDown: (event) => {
				if (event.key !== 'Enter' && event.key !== ' ') return;
				event.preventDefault();
				onClick(event);
			},
		}, h(Icon, { name: icon, size: 18 }));

		return h(React.Fragment, null,
			h('div', { ref: navRef, className: `claudian-nav-sidebar ${visible ? 'visible' : ''}` },
				navButton('claudian-nav-btn-top', 'chevrons-up', 'Scroll to top', scrollToTop),
				navButton('claudian-nav-btn-prev', 'chevron-up', 'Previous message', () => scrollToAdjacentMessage('prev')),
				navButton('claudian-nav-btn-toc', 'list-tree', 'Conversation directory', (event) => {
					event?.stopPropagation?.();
					setTocOpen((value) => !value);
				}),
				navButton('claudian-nav-btn-next', 'chevron-down', 'Next message', () => scrollToAdjacentMessage('next')),
				navButton('claudian-nav-btn-bottom', 'chevrons-down', 'Scroll to bottom', scrollToBottom),
			),
			tocOpen ? h('div', { ref: popoverRef, className: 'claudian-nav-toc-popover' },
				h('div', { className: 'claudian-nav-toc-title' }, 'Conversation directory'),
				h('div', { className: 'claudian-nav-toc-list' },
					directoryEntries.length === 0 ? h('div', { className: 'claudian-nav-toc-empty' }, 'No user prompts in this conversation') :
						directoryEntries.map((entry, index) => h('div', {
							key: entry.id,
							className: 'claudian-nav-toc-item',
							role: 'button',
							tabIndex: 0,
							title: entry.title,
							onClick: () => scrollToMessageById(entry.id),
							onKeyDown: (event) => {
								if (event.key !== 'Enter' && event.key !== ' ') return;
								event.preventDefault();
								scrollToMessageById(entry.id);
							},
						}, `${index + 1}. ${entry.title}`)),
				),
			) : null,
		);
	}

	function ForkTargetModal({ onChoose, onClose }) {
		return h('div', { className: 'claudian-modal-overlay', onMouseDown: onClose },
			h('div', {
				className: 'claudian-modal-card claudian-fork-target-modal',
				role: 'dialog',
				'aria-modal': 'true',
				onMouseDown: (event) => event.stopPropagation(),
			},
				h('div', { className: 'modal-title' }, 'Fork conversation'),
				h('div', { className: 'claudian-fork-target-list' },
					h('div', { className: 'claudian-fork-target-option', onClick: () => onChoose('current-tab') }, 'Current tab'),
					h('div', { className: 'claudian-fork-target-option', onClick: () => onChoose('new-tab') }, 'New tab'),
				),
			),
		);
	}

		function Message({ message, providerId, settings, canRewind, canFork, onRewind, onFork, onAskAnswer, onPermission, onPlan, onAddToNote, hiddenInlineInteractionBlockId }) {
			const [userCopied, setUserCopied] = useState(false);
			const [rewindMenuOpen, setRewindMenuOpen] = useState(false);
			const visibleBlocks = filterInlineInteractionBlocks(message.contentBlocks, hiddenInlineInteractionBlockId);
			const hasCompactBoundary = visibleBlocks.some((block) => block.type === 'context_compacted');
			const copyUserMessage = async (event) => {
				event.stopPropagation();
				const ok = await writeClipboardText(message.displayContent || message.content);
			if (!ok) return;
			setUserCopied(true);
			window.setTimeout(() => setUserCopied(false), 1500);
		};
		const toggleRewindMenu = (event) => {
			event.stopPropagation();
			setRewindMenuOpen((value) => !value);
		};
		const chooseRewindMode = (mode, event) => {
			event.stopPropagation();
			setRewindMenuOpen(false);
			onRewind(message.id, mode);
		};
		const forkFromMessage = (event) => {
			event.stopPropagation();
			if (canFork) onFork(message.id);
		};
		if (message.isInterrupt && !visibleBlocks.length) {
			return h('div', { className: 'claudian-message claudian-message-assistant' },
				h('div', { className: 'claudian-message-content', dir: 'auto' },
					h('div', { className: 'claudian-text-block' },
						h('span', { className: 'claudian-interrupted' }, 'Interrupted'),
						' ',
						h('span', { className: 'claudian-interrupted-hint' }, '· What should the assistant do instead?'),
					),
				),
			);
		}
		if (message.role === 'assistant' && (message.contentBlocks || []).length > 0 && visibleBlocks.length === 0 && !message.isInterrupt && !message.durationSeconds) {
			return null;
		}
		return h('div', {
			className: `claudian-message claudian-message-${message.role}`,
			'data-message-id': message.id,
			'data-role': message.role,
		},
			message.role === 'user' ? h(MessageImages, { images: message.images, settings }) : null,
			message.role === 'user' ? h(MessageContextChips, { chips: message.contextChips }) : null,
			h('div', { className: 'claudian-message-content', dir: 'auto' },
				visibleBlocks.map((block) => {
					if (block.type === 'text') return h(TextBlock, {
						key: block.id,
						content: block.content,
						copyable: message.role === 'assistant',
						settings,
						onAddToNote: message.role === 'assistant' ? onAddToNote : null,
					});
					if (block.type === 'thinking') return h(ThinkingBlock, { key: block.id, block });
					if (block.type === 'tool_use') {
						if (isHiddenCodexLifecycleTool(providerId, block)) return null;
						if (shouldRenderCodexLifecycleAsSubagent(providerId, block)) {
							const siblingToolBlocks = visibleBlocks.filter((candidate) => candidate.type === 'tool_use');
							return h(SubagentBlock, { key: block.id, block: buildCodexLifecycleSubagentBlock(block, siblingToolBlocks) });
						}
						return h(ToolBlock, { key: block.id, block, settings });
					}
					if (block.type === 'subagent') return h(SubagentBlock, { key: block.id, block });
					if (block.type === 'context_compacted') return h(CompactBoundary, { key: block.id });
					if (block.type === 'ask_user') return h(AskQuestionBlock, { key: block.id, block, onAnswer: onAskAnswer });
					if (block.type === 'permission') return h(PermissionBlock, { key: block.id, block, onDecision: onPermission });
					if (block.type === 'plan_approval') return h(PlanApprovalBlock, { key: block.id, block, onDecision: onPlan });
					return null;
				}),
				message.isInterrupt ? h('div', { className: 'claudian-text-block' },
					h('span', { className: 'claudian-interrupted' }, 'Interrupted'),
					' ',
					h('span', { className: 'claudian-interrupted-hint' }, '· What should the assistant do instead?'),
				) : null,
				message.durationSeconds && !hasCompactBoundary ? h('div', { className: 'claudian-response-footer' },
					h('span', { className: 'claudian-response-duration' },
						h(Icon, { name: 'clock', size: 12 }),
						h('span', null, formatDuration(message.durationSeconds)),
					),
				) : null,
			),
			message.role === 'user' ? h('div', { className: 'claudian-user-msg-actions' },
				canRewind ? h('span', { className: `claudian-message-rewind-btn ${rewindMenuOpen ? 'active' : ''}`, onClick: toggleRewindMenu, 'aria-label': 'Rewind' }, h(Icon, { name: 'rotate-ccw' })) : null,
				canFork ? h('span', { className: 'claudian-message-fork-btn', onClick: forkFromMessage, 'aria-label': 'Fork' }, h(Icon, { name: 'git-fork' })) : null,
				h('span', { className: `claudian-user-msg-copy-btn ${userCopied ? 'copied' : ''}`, onClick: copyUserMessage, 'aria-label': 'Copy message' }, userCopied ? 'Copied!' : h(Icon, { name: 'copy' })),
				canRewind && rewindMenuOpen ? h('div', {
					className: 'claudian-rewind-menu',
					role: 'menu',
					onMouseDown: (event) => event.stopPropagation(),
				},
					h('button', { type: 'button', className: 'claudian-rewind-menu-item', role: 'menuitem', onClick: (event) => chooseRewindMode('conversation', event) },
						h(Icon, { name: 'message-square', size: 14 }),
						h('span', null, 'Rewind conversation only'),
					),
					h('button', { type: 'button', className: 'claudian-rewind-menu-item', role: 'menuitem', onClick: (event) => chooseRewindMode('code-and-conversation', event) },
						h(Icon, { name: 'rotate-ccw', size: 14 }),
						h('span', null, 'Rewind code and conversation'),
					),
				) : null,
			) : null,
		);
	}

	function FeatureGuideModal({ settings, onClose, onActivate }) {
		useEffect(() => {
			const handleKeyDown = (event) => {
				if (event.key === 'Escape' && !event.isComposing) {
					event.preventDefault();
					onClose();
				}
			};
			window.addEventListener('keydown', handleKeyDown);
			return () => window.removeEventListener('keydown', handleKeyDown);
		}, [onClose]);

		const closeLabel = t(settings, 'guide.close');
		const features = [
			{ id: 'translation', icon: 'languages' },
			{ id: 'analysis', icon: 'list-tree' },
			{ id: 'graph', icon: 'map' },
			{ id: 'menu', icon: 'folder-search' },
			{ id: 'notes', icon: 'file-pen' },
			{ id: 'figures', icon: 'image' },
		];
		const activateFeature = (featureId) => {
			onActivate?.(featureId);
			onClose();
		};

		return h('div', {
			className: 'claudian-modal-overlay claudian-feature-guide-overlay',
			onMouseDown: (event) => {
				if (event.currentTarget === event.target) onClose();
			},
		},
			h('section', {
				className: 'claudian-modal-card claudian-feature-guide',
				role: 'dialog',
				'aria-modal': 'true',
				'aria-label': t(settings, 'guide.title'),
				onMouseDown: (event) => event.stopPropagation(),
			},
				h('div', { className: 'claudian-feature-guide-heading' },
					h('div', { className: 'claudian-feature-guide-heading-copy' },
						h('span', { className: 'claudian-feature-guide-eyebrow' }, 'ArtInFact'),
						h('h2', { className: 'claudian-feature-guide-title' }, t(settings, 'guide.title')),
					),
					h('button', {
						type: 'button',
						className: 'claudian-feature-guide-close',
						title: closeLabel,
						'aria-label': closeLabel,
						onClick: onClose,
					}, h(Icon, { name: 'x', size: 16 })),
				),
				h('p', { className: 'claudian-feature-guide-subtitle' }, t(settings, 'guide.subtitle')),
				h('div', { className: 'claudian-feature-guide-list' },
					features.map((feature) => h('button', {
						key: feature.id,
						type: 'button',
						className: 'claudian-feature-guide-item',
						'data-feature-guide-id': feature.id,
						'aria-label': `${t(settings, `guide.${feature.id}.title`)}: ${t(settings, 'guide.activate')}`,
						onClick: () => activateFeature(feature.id),
					},
						h('span', { className: 'claudian-feature-guide-icon' }, h(Icon, { name: feature.icon, size: 16 })),
						h('div', { className: 'claudian-feature-guide-copy' },
							h('h3', null, t(settings, `guide.${feature.id}.title`)),
							h('p', null, t(settings, `guide.${feature.id}.desc`)),
						),
						h('span', { className: 'claudian-feature-guide-action', 'aria-hidden': 'true' },
							h('span', { className: 'claudian-feature-guide-action-label' }, t(settings, 'guide.activate')),
							h(Icon, { name: 'chevron-right', size: 14 }),
						),
					)),
				),
				h('p', { className: 'claudian-feature-guide-tip' }, t(settings, 'guide.tip')),
			),
		);
	}

	function Header({ providerId, sidebarMode, markdownNote, settings }) {
		const [guideOpen, setGuideOpen] = useState(false);
		const guideTitle = t(settings, 'header.featureGuide');
		const title = providerProductLabel(providerId);
		const notesMode = sidebarMode === 'notes';
		const figuresMode = sidebarMode === 'figures';
		const aiMode = !notesMode && !figuresMode;
		const chineseLocale = normalizeLocale(settings?.locale) === 'zh-CN';
		const figuresTitle = chineseLocale ? '科研绘图' : 'Scientific figures';
		const figuresLabel = chineseLocale ? '绘图' : 'Figures';
		const markdownFileName = String(markdownNote?.fileName || '').trim() || 'Markdown';
		const markdownTabTitle = String(markdownNote?.filePath || '').trim() || markdownFileName;
		const markdownDirty = markdownNote?.dirty === true;
		const markdownOpen = markdownNote?.open === true;
		const activateNotes = () => requestSidebarMode('notes');
		const activateFigures = () => requestSidebarMode('figures');
		const closeFeatureGuide = () => {
			setGuideOpen(false);
		};
		const openFeatureGuide = () => {
			if (aiMode) {
				setGuideOpen(true);
				return;
			}
			setGuideOpen(true);
			requestFeatureGuideOpen();
		};
		useEffect(() => {
			const handleOpen = () => openFeatureGuide();
			window.addEventListener(FEATURE_GUIDE_OPEN_EVENT, handleOpen);
			return () => window.removeEventListener(FEATURE_GUIDE_OPEN_EVENT, handleOpen);
		}, [aiMode]);
		const activateNotesOnKeyDown = (event) => {
			if (notesMode || (event.key !== 'Enter' && event.key !== ' ')) return;
			event.preventDefault();
			activateNotes();
		};
		return h('div', { className: 'claudian-header' },
			h('div', { className: 'claudian-sidebar-mode-tabs', role: 'tablist', 'aria-label': 'Sidebar views' },
				h('button', {
					type: 'button',
					className: `claudian-sidebar-mode-tab${aiMode ? ' is-active' : ''}`,
					role: 'tab',
					'aria-selected': aiMode ? 'true' : 'false',
					title,
					onClick: aiMode ? undefined : () => requestSidebarMode('ai'),
				},
					h('span', { className: 'claudian-sidebar-mode-tab-icon' }, h(ProviderIcon, { providerId, size: 16 })),
					h('span', { className: 'claudian-sidebar-mode-tab-label' }, title),
				),
				h('div', {
					className: `claudian-sidebar-mode-tab claudian-sidebar-mode-tab-notes${notesMode ? ' is-active' : ''}`,
					role: 'tab',
					tabIndex: 0,
					'aria-selected': notesMode ? 'true' : 'false',
					title: markdownTabTitle,
					onClick: notesMode ? undefined : activateNotes,
					onKeyDown: activateNotesOnKeyDown,
				},
					h('span', { className: 'claudian-sidebar-mode-tab-icon' }, h(Icon, { name: 'file-text', size: 16 })),
					h('span', { className: 'claudian-sidebar-mode-tab-label' }, markdownFileName),
					markdownDirty ? h('span', {
						className: 'claudian-sidebar-mode-tab-dirty',
						title: 'Unsaved changes',
						'aria-label': 'Unsaved changes',
					}) : null,
					markdownOpen ? h('button', {
						type: 'button',
						className: 'claudian-sidebar-mode-tab-close',
						title: 'Close note',
						'aria-label': 'Close note',
						onClick: (event) => {
							event.preventDefault();
							event.stopPropagation();
							requestMarkdownNoteClose(markdownNote);
						},
					}, h(Icon, { name: 'x', size: 13 })) : null,
				),
				h('button', {
					type: 'button',
					className: `claudian-sidebar-mode-tab claudian-sidebar-mode-tab-figures${figuresMode ? ' is-active' : ''}`,
					role: 'tab',
					'aria-selected': figuresMode ? 'true' : 'false',
					title: figuresTitle,
					onClick: figuresMode ? undefined : activateFigures,
				},
					h('span', { className: 'claudian-sidebar-mode-tab-icon' }, h(Icon, { name: 'image', size: 16 })),
					h('span', { className: 'claudian-sidebar-mode-tab-label' }, figuresLabel),
				),
			),
			h('div', { className: 'claudian-header-actions' },
				h('button', {
					type: 'button',
					className: 'claudian-header-icon-button',
					title: guideTitle,
					'aria-label': guideTitle,
					onClick: openFeatureGuide,
				}, h(Icon, { name: 'help-circle', size: 16 })),
			),
			guideOpen ? h(FeatureGuideModal, {
				settings,
				onClose: closeFeatureGuide,
				onActivate: requestFeatureGuideActivation,
			}) : null,
		);
	}

	function isRuntimeActivityVisible(tab, runtimeStatus) {
		return !!tab?.isStreaming;
	}

	function RuntimeCornerLoader({ tab, runtimeStatus, settings }) {
		const active = isRuntimeActivityVisible(tab, runtimeStatus);
		if (!active) {
			return null;
		}
		const status = String(runtimeStatus?.status || (tab?.isStreaming ? 'running' : '')).toLowerCase();
		const detail = String(runtimeStatus?.detail || '').trim() || t(settings, 'activity.waiting');
		const label = status === 'starting' ? t(settings, 'activity.starting') : t(settings, 'activity.running');
		return h('div', {
			className: `claudian-runtime-corner-loader status-${status || 'running'}`,
			role: 'status',
			title: `${label}${detail ? ` · ${detail}` : ''}`,
			'aria-label': `${label}${detail ? ` · ${detail}` : ''}`,
			'aria-live': 'polite',
		},
			h('span', { className: 'claudian-runtime-corner-ring', 'aria-hidden': 'true' }),
		);
	}

	function formatCodexDownloadBytes(value) {
		const bytes = Math.max(0, Number(value) || 0);
		if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
		if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
		return `${Math.round(bytes)} B`;
	}

	function CodexDownloadPanel({ download }) {
		if (!download || !download.stage) return null;
		const stageLabels = {
			connecting: '正在连接下载源',
			downloading: '正在下载 Codex CLI',
			retrying: '下载失败，准备重试',
			verifying: '正在校验下载完整性',
			decompressing: '正在解包 Codex CLI',
			validating: '正在验证 Codex 版本',
			ready: 'Codex CLI 已就绪',
			failed: 'Codex CLI 安装失败',
		};
		const totalBytes = Number(download.totalBytes) || 0;
		const downloadedBytes = Number(download.downloadedBytes) || 0;
		const percent = Math.max(0, Math.min(100, Number(download.percent) || 0));
		const sourceHost = (() => {
			try { return new URL(download.sourceUrl || '').hostname; } catch { return ''; }
		})();
		return h('section', {
			className: `claudian-codex-download status-${download.stage}`,
			'aria-live': 'polite',
		},
			h('div', { className: 'claudian-codex-download-head' },
				h('strong', null, stageLabels[download.stage] || download.stage),
				h('span', null, `v${download.version || ''} · ${download.platform || ''}`),
			),
			h('div', { className: 'claudian-codex-download-progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(percent) },
				h('span', { style: { width: `${percent}%` } }),
			),
			h('div', { className: 'claudian-codex-download-grid' },
				h('span', null, '进度'),
				h('span', null, `${formatCodexDownloadBytes(downloadedBytes)} / ${formatCodexDownloadBytes(totalBytes)} (${percent.toFixed(1)}%)`),
				h('span', null, '速度'),
				h('span', null, download.speedBytesPerSecond ? `${formatCodexDownloadBytes(download.speedBytesPerSecond)}/s` : '-'),
				h('span', null, '下载源'),
				h('span', { title: download.sourceUrl || '' }, [download.sourceLabel, sourceHost].filter(Boolean).join(' · ') || '-'),
				h('span', null, '重试'),
				h('span', null, `${Number(download.attempt) || 1} / 3${download.resumed ? ' · 已续传' : ''}`),
				h('span', null, '安装位置'),
				h('span', { className: 'claudian-codex-download-path', title: download.installPath || '' }, download.installPath || '-'),
		),
			download.stage === 'verifying' || download.stage === 'ready'
				? h('div', {
					className: 'claudian-codex-download-hash',
					title: download.expectedIntegrity || download.expectedSha256 || '',
				}, download.expectedIntegrity || (download.expectedSha256 ? `sha256-${download.expectedSha256}` : ''))
				: null,
			download.error ? h('div', { className: 'claudian-codex-download-error' }, download.error) : null,
		);
	}

	function TabBadges({ tabs, activeTabId, maxTabs, onSwitch, onClose }) {
		const [expandedIds, setExpandedIds] = useState(() => new Set());
		const show = tabs.length >= 2;
		useEffect(() => {
			setExpandedIds((current) => {
				const visibleIds = new Set(tabs.map((tab) => tab.id));
				const next = new Set([...current].filter((id) => visibleIds.has(id)));
				return next.size === current.size ? current : next;
			});
		}, [tabs]);
		function expandedLabel(tab, index) {
			if (!expandedIds.has(tab.id)) return String(index + 1);
			const chars = Array.from(tab.title || 'New Chat');
			return chars.length <= 32 ? chars.join('') : `${chars.slice(0, 29).join('')}...`;
		}
		return h('div', { className: `claudian-tab-bar-container ${show ? '' : 'claudian-hidden'}` },
			h('div', { className: 'claudian-tab-badges' },
				tabs.map((tab, index) => {
					const expanded = expandedIds.has(tab.id);
					return h('div', {
						key: tab.id,
						className: [
							'claudian-tab-badge',
							tab.id === activeTabId ? 'claudian-tab-badge-active' : tab.needsAttention ? 'claudian-tab-badge-attention' : tab.isStreaming ? 'claudian-tab-badge-streaming' : 'claudian-tab-badge-idle',
							expanded ? 'claudian-tab-badge-expanded' : '',
						].filter(Boolean).join(' '),
						'aria-label': tab.title,
						'data-provider': tab.providerId,
						'data-title-expanded': expanded ? 'true' : 'false',
						onClick: () => onSwitch(tab.id),
						onDoubleClick: (event) => {
							event.preventDefault();
							event.stopPropagation();
							setExpandedIds((current) => {
								const next = new Set(current);
								if (next.has(tab.id)) next.delete(tab.id);
								else next.add(tab.id);
								return next;
							});
						},
						onContextMenu: (event) => {
							event.preventDefault();
							if (tabs.length > 1) onClose(tab.id);
						},
					}, expandedLabel(tab, index));
				}),
			),
		);
	}

	function isHistoryNewTabModifierClick(event) {
		return !event.altKey && !event.shiftKey && (event.metaKey || event.ctrlKey);
	}

	function formatHistoryTimestamp(item) {
		if (item?.date) return item.date;
		const timestamp = Number(item?.lastResponseAt ?? item?.createdAt);
		if (!Number.isFinite(timestamp) || timestamp <= 0) return '';
		return new Date(timestamp).toLocaleString([], {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	function getHistoryTabLabel(status) {
		if (typeof status.tabIndex === 'number') return `tab ${status.tabIndex}`;
		if (status.openState === 'current') return 'current tab';
		return 'tab';
	}

	function getHistoryStatus(item, tabs, activeTabId, activeHistoryId) {
		const matches = (tabs || [])
			.map((tab, index) => ({ tab, tabIndex: index + 1 }))
			.filter((entry) => entry.tab.historyId === item.id);
		const current = matches.find((entry) => entry.tab.id === activeTabId);
		if (current || item.id === activeHistoryId) {
			return {
				openState: 'current',
				isRunning: Boolean((current?.tab || item).isStreaming || item.running),
				location: 'current-view',
				tabIndex: current?.tabIndex,
			};
		}
		const open = matches[0];
		if (open) {
			return {
				openState: 'open',
				isRunning: Boolean(open.tab.isStreaming || item.running),
				location: 'current-view',
				tabIndex: open.tabIndex,
			};
		}
		return {
			openState: 'closed',
			isRunning: item.running === true,
			location: 'current-view',
		};
	}

	function getHistoryItemStatusText(status, item) {
		if (status.openState !== 'closed' && status.location === 'other-view') {
			return status.isRunning ? 'Running in another pane' : 'Open in another pane';
		}
		if (status.isRunning) {
			if (status.openState === 'closed') return 'Running';
			return `Running in ${getHistoryTabLabel(status)}`;
		}
		if (status.openState === 'current') {
			return typeof status.tabIndex === 'number' ? `Current tab ${status.tabIndex}` : 'Current session';
		}
		if (status.openState === 'open') return `Open in ${getHistoryTabLabel(status)}`;
		return formatHistoryTimestamp(item);
	}

	function getHistoryItemIcon(status) {
		if (status.isRunning) return 'loader-2';
		if (status.openState === 'current') return 'message-square-dot';
		return 'message-square';
	}

	function HistoryContextMenu({ state, item, status, onOpen, onOpenNew, onRename, onDelete, onClose }) {
		if (!state || !item) return null;
		const button = (key, label, handler) => h('button', {
			key,
			type: 'button',
			className: 'claudian-history-context-item',
			onClick: (event) => {
				event.preventDefault();
				event.stopPropagation();
				onClose();
				handler();
			},
		}, label);
		const items = [];
		if (status.openState !== 'current') {
			if (status.openState === 'closed') {
				items.push(button('open-new', 'Open in new tab', () => onOpenNew(item.id)));
			}
			else {
				items.push(button('switch-open', 'Switch to open session', () => onOpen(item.id)));
			}
		}
		items.push(button('rename', 'Rename', () => onRename(item)));
		items.push(button('delete', 'Delete', () => onDelete(item.id)));
		return h('div', {
			className: 'claudian-history-context-menu',
			style: { left: state.x, top: state.y },
			onClick: (event) => event.stopPropagation(),
			onMouseDown: (event) => event.stopPropagation(),
		}, items);
	}

	function HistoryMenu({ visible, histories, tabs, activeTabId, activeHistoryId, onOpen, onOpenNew, onRename, onDelete }) {
		const [editingId, setEditingId] = useState(null);
		const [contextMenu, setContextMenu] = useState(null);
		const sortedHistories = useMemo(() => [...(histories || [])]
			.map((item, index) => ({ item, index }))
			.sort((left, right) => {
				const leftTime = historySortTime(left.item, left.index);
				const rightTime = historySortTime(right.item, right.index);
				if (rightTime !== leftTime) return rightTime - leftTime;
				return left.index - right.index;
			})
			.map((entry) => entry.item), [histories]);

		useEffect(() => {
			if (!visible) {
				setEditingId(null);
				setContextMenu(null);
			}
		}, [visible]);

		useEffect(() => {
			if (editingId && !sortedHistories.some((item) => item.id === editingId)) {
				setEditingId(null);
			}
		}, [editingId, sortedHistories]);

		function startRename(item) {
			setContextMenu(null);
			setEditingId(item.id);
		}

		function finishRename(item, value) {
			const nextTitle = String(value || '').trim() || item.title || 'New Chat';
			setEditingId(null);
			if (nextTitle !== item.title) onRename(item.id, nextTitle);
		}

		function openFromContent(event, item, status) {
			event.stopPropagation();
			if (status.openState === 'current') return;
			if (isHistoryNewTabModifierClick(event)) {
				event.preventDefault();
				onOpenNew(item.id);
				return;
			}
			onOpen(item.id);
		}

		function openFromMiddleClick(event, item, status) {
			if (event.button !== 1 || status.openState === 'current') return;
			event.preventDefault();
			event.stopPropagation();
			onOpenNew(item.id);
		}

		function renderItem(item) {
			const status = getHistoryStatus(item, tabs, activeTabId, activeHistoryId);
			const isCurrent = status.openState === 'current';
			const isOpen = status.openState === 'open';
			const isEditing = editingId === item.id;
			const className = [
				'claudian-history-item',
				isCurrent ? 'active' : '',
				isOpen ? 'open' : '',
				status.isRunning ? 'running' : '',
			].filter(Boolean).join(' ');
			return h('div', {
				key: item.id,
				className,
				'data-open-state': status.openState,
				'data-running': status.isRunning ? 'true' : 'false',
				'data-tab-location': status.location || 'current-view',
				...(typeof status.tabIndex === 'number' ? { 'data-tab-index': String(status.tabIndex) } : {}),
				onContextMenu: (event) => {
					event.preventDefault();
					event.stopPropagation();
					setContextMenu({ id: item.id, x: event.clientX, y: event.clientY });
				},
			},
				h('div', { className: 'claudian-history-item-icon' }, h(Icon, { name: getHistoryItemIcon(status) })),
				h('div', {
					className: 'claudian-history-item-content',
					onClick: (event) => openFromContent(event, item, status),
					onAuxClick: (event) => openFromMiddleClick(event, item, status),
				},
					isEditing
						? h('input', {
							className: 'claudian-rename-input',
							defaultValue: item.title || '',
							autoFocus: true,
							onClick: (event) => event.stopPropagation(),
							onFocus: (event) => event.currentTarget.select(),
							onBlur: (event) => finishRename(item, event.currentTarget.value),
							onKeyDown: (event) => {
								if (event.key === 'Enter' && !event.isComposing) {
									event.preventDefault();
									event.currentTarget.blur();
								}
								else if (event.key === 'Escape' && !event.isComposing) {
									event.preventDefault();
									event.currentTarget.value = item.title || '';
									setEditingId(null);
								}
							},
						})
						: h('div', { className: 'claudian-history-item-title', title: item.title }, item.title),
					h('div', { className: 'claudian-history-item-date' }, getHistoryItemStatusText(status, item)),
				),
				h('div', { className: 'claudian-history-item-actions' },
					item.titleGenerationStatus === 'pending'
						? h('span', { className: 'claudian-action-btn claudian-action-loading', 'aria-label': 'Generating title...' }, h(Icon, { name: 'loader-2', size: 14 }))
						: null,
					item.titleGenerationStatus === 'failed'
						? h('button', { type: 'button', className: 'claudian-action-btn', 'aria-label': 'Regenerate title', onClick: (event) => event.stopPropagation() }, h(Icon, { name: 'refresh-cw', size: 14 }))
						: null,
					status.openState === 'closed'
						? h('button', {
							type: 'button',
							className: 'claudian-action-btn claudian-open-new-tab-btn',
							'aria-label': 'Open in new tab',
							onClick: (event) => {
								event.stopPropagation();
								onOpenNew(item.id);
							},
						}, h(Icon, { name: 'square-plus', size: 14 }))
						: null,
					h('button', {
						type: 'button',
						className: 'claudian-action-btn',
						'aria-label': 'Rename',
						onClick: (event) => {
							event.stopPropagation();
							startRename(item);
						},
					}, h(Icon, { name: 'pencil', size: 14 })),
					h('button', {
						type: 'button',
						className: 'claudian-action-btn claudian-delete-btn',
						'aria-label': 'Delete',
						onClick: (event) => {
							event.stopPropagation();
							onDelete(item.id);
						},
					}, h(Icon, { name: 'trash-2', size: 14 })),
				),
				contextMenu?.id === item.id ? h(HistoryContextMenu, {
					state: contextMenu,
					item,
					status,
					onOpen,
					onOpenNew,
					onRename: startRename,
					onDelete,
					onClose: () => setContextMenu(null),
				}) : null,
			);
		}

		return h('div', {
			className: `claudian-history-menu ${visible ? 'visible' : ''}`,
			onClick: (event) => event.stopPropagation(),
			onMouseDown: (event) => event.stopPropagation(),
		},
			h('div', { className: 'claudian-history-header' }, h('span', null, 'Conversations')),
			h('div', { className: 'claudian-history-list' },
				sortedHistories.length === 0
					? h('div', { className: 'claudian-history-empty' }, 'No conversations')
					: sortedHistories.map(renderItem),
			),
		);
	}

	function historySortTime(item, index) {
		const explicit = Number(item?.lastResponseAt ?? item?.createdAt);
		if (Number.isFinite(explicit) && explicit > 0) return explicit;
		const parsed = Date.parse(String(item?.date || ''));
		if (Number.isFinite(parsed)) return parsed;
		return -index;
	}

	function ResumeDropdown({ visible, histories, activeHistoryId, onSelect, onDismiss }) {
		const [selectedIndex, setSelectedIndex] = useState(0);
		const sortedHistories = useMemo(() => [...(histories || [])]
			.map((item, index) => ({ item, index }))
			.sort((left, right) => {
				const leftTime = historySortTime(left.item, left.index);
				const rightTime = historySortTime(right.item, right.index);
				if (rightTime !== leftTime) return rightTime - leftTime;
				return left.index - right.index;
			})
			.map((entry) => entry.item), [histories]);

		useEffect(() => {
			if (visible) setSelectedIndex(0);
		}, [visible, histories]);

		useEffect(() => {
			if (!visible) return;
			document.querySelector('.claudian-resume-item.selected')?.scrollIntoView({ block: 'nearest' });
		}, [visible, selectedIndex, sortedHistories]);

		useEffect(() => {
			if (!visible) return undefined;
			const handler = (event) => {
				if (event.key === 'ArrowDown') {
					event.preventDefault();
					event.stopPropagation();
					setSelectedIndex((current) => Math.min(sortedHistories.length - 1, current + 1));
					return;
				}
				if (event.key === 'ArrowUp') {
					event.preventDefault();
					event.stopPropagation();
					setSelectedIndex((current) => Math.max(0, current - 1));
					return;
				}
				if (event.key === 'Enter' || event.key === 'Tab') {
					if (sortedHistories.length > 0) {
						event.preventDefault();
						event.stopPropagation();
						const selected = sortedHistories[selectedIndex] || sortedHistories[0];
						if (selected?.id === activeHistoryId) {
							onDismiss();
						}
						else if (selected?.id) {
							onSelect(selected.id);
						}
					}
					return;
				}
				if (event.key === 'Escape') {
					event.preventDefault();
					event.stopPropagation();
					onDismiss();
				}
			};
			window.addEventListener('keydown', handler, true);
			return () => window.removeEventListener('keydown', handler, true);
		}, [visible, sortedHistories, selectedIndex, activeHistoryId, onSelect, onDismiss]);

		function formatResumeDate(item, isCurrent) {
			if (isCurrent) return 'Current session';
			if (item.date) return item.date;
			const timestamp = item.lastResponseAt || item.createdAt;
			if (!timestamp) return 'Saved session';
			const date = new Date(timestamp);
			const now = new Date();
			if (date.toDateString() === now.toDateString()) {
				return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
			}
			return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
		}

		return h('div', { className: `claudian-resume-dropdown ${visible ? 'visible' : ''}` },
			h('div', { className: 'claudian-resume-header' }, h('span', null, 'Resume conversation')),
			sortedHistories.length === 0
				? h('div', { className: 'claudian-resume-empty' }, 'No conversations')
				: h('div', { className: 'claudian-resume-list' },
					sortedHistories.map((item, index) => {
						const isCurrent = item.id === activeHistoryId;
						return h('div', {
							key: item.id,
							className: `claudian-resume-item ${isCurrent ? 'current' : ''} ${index === selectedIndex ? 'selected' : ''}`,
							onMouseEnter: () => setSelectedIndex(index),
							onMouseDown: (event) => {
								event.preventDefault();
								if (isCurrent) onDismiss();
								else onSelect(item.id);
							},
						},
							h('div', { className: 'claudian-resume-item-icon' }, h(Icon, { name: isCurrent ? 'message-square-dot' : 'message-square', size: 16 })),
							h('div', { className: 'claudian-resume-item-content' },
								h('div', { className: 'claudian-resume-item-title', title: item.title }, item.title || 'Untitled conversation'),
								h('div', { className: 'claudian-resume-item-date' }, formatResumeDate(item, isCurrent)),
							),
						);
					}),
				),
		);
	}

	function ModelSelector({ model, settings, providerId: activeProviderId, onChange, onAddCustom, onRemoveCustom }) {
		const [customModelDraft, setCustomModelDraft] = useState('');
		const [dropdownOpen, setDropdownOpen] = useState(false);
		const [customInputFocused, setCustomInputFocused] = useState(false);
		const composingRef = useRef(false);
		const customInputFocusedRef = useRef(false);
		const selectorRef = useRef(null);
		const groups = getModelOptions(settings).reduce((acc, item) => {
			acc[item.group] = acc[item.group] || [];
			acc[item.group].push(item);
			return acc;
		}, {});
		const providerId = activeProviderId === 'claude' || activeProviderId === 'codex'
			? activeProviderId
			: settings?.provider === 'claude' || settings?.provider === 'codex'
				? settings.provider
				: modelToProvider(model, settings);
		const isZh = normalizeLocale(settings?.locale) === 'zh-CN';
		const customPlaceholder = providerId === 'claude'
			? (isZh ? '添加 Claude 模型' : 'Add Claude model')
			: (isZh ? '添加 Codex 模型' : 'Add Codex model');
		const addLabel = isZh ? '添加' : 'Add';
		const removeLabel = isZh ? '删除自定义模型' : 'Remove custom model';
		const submitCustomModel = () => {
			const value = customModelDraft.trim();
			if (!value || typeof onAddCustom !== 'function') return;
			onAddCustom(value, providerId);
			setCustomModelDraft('');
		};
		const closeDropdownWhenInactive = () => {
			setTimeout(() => {
				if (composingRef.current || customInputFocusedRef.current) return;
				if (!selectorRef.current?.contains(document.activeElement)) {
					setDropdownOpen(false);
				}
			}, 0);
		};
		const setCustomModelInputFocus = (focused) => {
			customInputFocusedRef.current = focused;
			setCustomInputFocused(focused);
		};
		return h('div', {
			ref: selectorRef,
			className: `claudian-model-selector ${dropdownOpen || customInputFocused ? 'is-open' : ''}`,
			onMouseEnter: () => setDropdownOpen(true),
			onMouseLeave: () => {
				if (!customInputFocusedRef.current && !composingRef.current) setDropdownOpen(false);
			},
			onFocusCapture: () => setDropdownOpen(true),
			onBlurCapture: closeDropdownWhenInactive,
		},
			h('div', { className: 'claudian-model-btn' },
				h('span', { className: 'claudian-model-label' }, getModelLabel(model, settings)),
			),
			h('div', { className: 'claudian-model-dropdown' },
				Object.keys(groups).reverse().map((group) => [
					h('div', { key: `${group}-g`, className: 'claudian-model-group' }, group),
					groups[group].map((item) => h('div', {
						key: modelOptionSelectionValue(item),
						className: `claudian-model-option ${modelOptionMatches(item, model) ? 'selected' : ''}`,
						title: item.value,
						onClick: (event) => {
							event.stopPropagation();
							onChange(modelOptionSelectionValue(item));
						},
					},
						h(ProviderIcon, { providerId: item.providerId, size: 12, className: 'claudian-model-provider-icon' }),
						h('span', { className: 'claudian-model-option-label' }, item.label),
						item.custom && typeof onRemoveCustom === 'function' ? h('button', {
							type: 'button',
							className: 'claudian-model-option-remove',
							title: removeLabel,
							'aria-label': removeLabel,
							onClick: (event) => {
								event.preventDefault();
								event.stopPropagation();
								onRemoveCustom(item.value, item.providerId);
							},
						}, h(Icon, { name: 'x', size: 13 })) : null,
					)),
				]),
				h('div', { className: 'claudian-model-custom', onClick: (event) => event.stopPropagation() },
					h('input', {
						className: 'claudian-model-custom-input',
						value: customModelDraft,
						placeholder: customPlaceholder,
						spellCheck: false,
						onChange: (event) => setCustomModelDraft(event.currentTarget.value),
						onFocus: () => {
							setCustomModelInputFocus(true);
							setDropdownOpen(true);
						},
						onBlur: () => {
							setCustomModelInputFocus(false);
							closeDropdownWhenInactive();
						},
						onCompositionStart: () => {
							composingRef.current = true;
							setDropdownOpen(true);
						},
						onCompositionEnd: () => {
							composingRef.current = false;
							closeDropdownWhenInactive();
						},
						onKeyDown: (event) => {
							event.stopPropagation();
							if (event.isComposing || event.keyCode === 229) return;
							if (event.key === 'Enter') {
								event.preventDefault();
								submitCustomModel();
							}
						},
					}),
					h('button', {
						type: 'button',
						className: 'claudian-model-custom-add',
						disabled: !customModelDraft.trim(),
						onClick: (event) => {
							event.stopPropagation();
							submitCustomModel();
						},
					}, addLabel),
				),
			),
		);
	}

	const CODEX_EFFORT_OPTIONS = [
		{ value: 'low', label: 'Low' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'high', label: 'High' },
		{ value: 'xhigh', label: 'XHigh' },
		{ value: 'max', label: 'Max' },
		{ value: 'ultra', label: 'Ultra' },
	];
	const CLAUDE_EFFORT_OPTIONS = [
		{ value: 'low', label: 'Low' },
		{ value: 'medium', label: 'Med' },
		{ value: 'high', label: 'High' },
		{ value: 'xhigh', label: 'XHigh' },
		{ value: 'max', label: 'Max' },
	];

	function isCodexGpt56OrLater(model) {
		const normalized = providerRuntimeModelId('codex', model).toLowerCase();
		const match = normalized.match(/^gpt-5\.(\d+)(?:-|$)/u);
		return !!match && Number(match[1]) >= 6;
	}

	function supportsClaudeXHighEffort(model) {
		const normalized = providerRuntimeModelId('claude', model).toLowerCase();
		return ['best', 'fable', 'opus', 'opus[1m]', 'opusplan'].includes(normalized)
			|| /^(?:claude-fable-5|claude-opus-5|claude-sonnet-5|claude-opus-4-(?:7|8))(?:-|\[|$)/u.test(normalized);
	}

	function supportsClaudeMaxEffort(model) {
		const normalized = providerRuntimeModelId('claude', model).toLowerCase();
		return supportsClaudeXHighEffort(model)
			|| normalized === 'sonnet'
			|| normalized === 'sonnet[1m]'
			|| /^(?:claude-opus-4-6|claude-sonnet-4-6)(?:-|\[|$)/u.test(normalized);
	}

	function getModelReasoningOption(settings, providerId, model) {
		const options = getModelOptions(settings);
		return options.find((option) => option.providerId === providerId && modelOptionMatches(option, model)) || null;
	}

	function getEffortOptions(providerId, model, settings = {}) {
		const modelOption = getModelReasoningOption(settings, providerId, model);
		const explicit = normalizeReasoningEffortList(modelOption?.supportedReasoningEfforts);
		if (modelOption?.supportsReasoningEffort === false) return [];
		if (providerId === 'claude') {
			if (explicit.length > 0) {
				return CLAUDE_EFFORT_OPTIONS.filter((option) => explicit.includes(option.value));
			}
			const values = [];
			if (supportsClaudeMaxEffort(model)) values.push('low', 'medium', 'high', 'max');
			if (supportsClaudeXHighEffort(model)) values.splice(3, 0, 'xhigh');
			return CLAUDE_EFFORT_OPTIONS.filter((option) => values.includes(option.value));
		}

		const gpt56OrLater = isCodexGpt56OrLater(model);
		if (explicit.length > 0 && !gpt56OrLater) {
			return CODEX_EFFORT_OPTIONS.filter((option) => explicit.includes(option.value));
		}
		const values = ['low', 'medium', 'high', 'xhigh'];
		if (gpt56OrLater) values.push('max');
		if (gpt56OrLater) values.push('ultra');
		return CODEX_EFFORT_OPTIONS.filter((option) => [...values, ...explicit].includes(option.value));
	}

	function safeSidebarEffort(providerId, model, effort, settings = {}) {
		const normalized = normalizeSidebarEffort(effort);
		const options = getEffortOptions(providerId, model, settings);
		if (!options.length) return normalized;
		if (options.some((option) => option.value === normalized)) return normalized;
		const requestedIndex = REASONING_EFFORT_ORDER.indexOf(normalized);
		const fallback = options
			.map((option) => option.value)
			.filter((value) => REASONING_EFFORT_ORDER.indexOf(value) <= requestedIndex)
			.at(-1);
		return fallback || options[Math.min(2, options.length - 1)]?.value || 'high';
	}

	function ThinkingSelector({ effort, providerId, model, settings, onChange }) {
		const options = getEffortOptions(providerId, model, settings);
		if (!options.length) return null;
		const normalizedEffort = String(effort || 'high').toLowerCase();
		const current = options.find((option) => option.value === normalizedEffort) || options.find((option) => option.value === 'high') || options[0];
		return h('div', { className: 'claudian-thinking-selector' },
			h('div', { className: 'claudian-thinking-effort' },
				h('div', { className: 'claudian-thinking-gears' },
					h('div', { className: 'claudian-thinking-current' }, current?.label || 'High'),
					h('div', { className: 'claudian-thinking-options' },
						options.slice().reverse().map((item) => h('div', {
							key: item.value,
							className: `claudian-thinking-gear ${item.value === current?.value ? 'selected' : ''}`,
							onClick: () => onChange(item.value),
						}, item.label)),
					),
				),
			),
		);
	}

	function getContextMeterDisplay(usage) {
		const percent = Math.min(100, Math.max(0, usage?.percentage || 0));
		const formatTokens = (tokens) => tokens >= 1000 ? `${Math.round(tokens / 1000)}k` : String(tokens);
		const isCritical = percent >= 95;
		return {
			percent,
			isWarning: percent > 80,
			isCritical,
			stateLabel: isCritical ? 'Full' : '',
			tooltip: `${formatTokens(usage?.contextTokens || 0)} / ${formatTokens(usage?.contextWindow || 0)}${isCritical ? ' (Context is full. Run `/compact` or wait for provider compaction.)' : percent > 80 ? ' (Approaching limit, run `/compact` to continue)' : ''}`,
		};
	}

	function ContextMeter({ usage }) {
		if (!usage || Number(usage.contextTokens || 0) <= 0) return h('div', { className: 'claudian-context-meter claudian-hidden' });
		const display = getContextMeterDisplay(usage);
		const percent = display.percent;
		const size = 16;
		const strokeWidth = 2;
		const radius = (size - strokeWidth) / 2;
		const cx = size / 2;
		const cy = size / 2;
		const startAngle = 150;
		const endAngle = 390;
		const arcRadians = ((endAngle - startAngle) * Math.PI) / 180;
		const circumference = radius * arcRadians;
		const toPoint = (angle) => {
			const radians = (angle * Math.PI) / 180;
			return {
				x: cx + radius * Math.cos(radians),
				y: cy + radius * Math.sin(radians),
			};
		};
		const start = toPoint(startAngle);
		const end = toPoint(endAngle);
		const pathData = `M ${start.x} ${start.y} A ${radius} ${radius} 0 1 1 ${end.x} ${end.y}`;
		const fillLength = (percent / 100) * circumference;
		return h('div', { className: `claudian-context-meter ${display.isWarning ? 'warning' : ''} ${display.isCritical ? 'critical' : ''}`, 'data-tooltip': display.tooltip },
			h('div', { className: 'claudian-context-meter-gauge' },
				h('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
					h('path', { className: 'claudian-meter-bg', d: pathData, fill: 'none', strokeWidth, strokeLinecap: 'round' }),
					h('path', {
						className: 'claudian-meter-fill',
						d: pathData,
						fill: 'none',
						strokeWidth,
						strokeLinecap: 'round',
						strokeDasharray: circumference,
						strokeDashoffset: circumference - fillLength,
					}),
				),
			),
			h('span', { className: 'claudian-context-meter-percent' }, `${percent}%`),
			display.stateLabel ? h('span', { className: 'claudian-context-meter-state' }, display.stateLabel) : null,
		);
	}

	function ExternalContextSelector({ paths, onAdd, onRemove, onTogglePersistent }) {
		return h('div', { className: 'claudian-external-context-selector' },
			h('div', { className: 'claudian-external-context-icon-wrapper', onClick: onAdd },
				h('div', { className: `claudian-external-context-icon ${paths.length ? 'active' : ''}` }, h(Icon, { name: 'folder' })),
				h('div', { className: `claudian-external-context-badge ${paths.length > 1 ? 'visible' : ''}` }, paths.length > 1 ? String(paths.length) : ''),
			),
			h('div', { className: 'claudian-external-context-dropdown' },
				h('div', { className: 'claudian-external-context-header' }, 'External contexts'),
				h('div', { className: 'claudian-external-context-list' },
					paths.length === 0 ? h('div', { className: 'claudian-external-context-empty' }, 'Click folder icon to add') :
						paths.map((item) => h('div', { key: item.path, className: 'claudian-external-context-item' },
							h('span', { className: 'claudian-external-context-text', title: item.path }, item.path),
							h('span', {
								className: `claudian-external-context-lock ${item.persistent ? 'locked' : ''}`,
								title: item.persistent ? 'Persistent (click to make session-only)' : 'Session-only (click to persist)',
								onClick: (event) => {
									event.stopPropagation();
									onTogglePersistent(item.path);
								},
							}, h(Icon, { name: item.persistent ? 'lock' : 'unlock', size: 12 })),
							h('span', {
								className: 'claudian-external-context-remove',
								onClick: (event) => {
									event.stopPropagation();
									onRemove(item.path);
								},
							}, h(Icon, { name: 'x', size: 14 })),
						)),
				),
			),
		);
	}

	function McpSelector({ servers, onToggle }) {
		const enabled = servers.filter((server) => server.enabled);
		return h('div', { className: 'claudian-mcp-selector' },
			h('div', { className: 'claudian-mcp-selector-icon-wrapper' },
				h('div', { className: `claudian-mcp-selector-icon ${enabled.length ? 'active' : ''}` }, h('span', { className: 'claudian-mcp-mini' }, 'M')),
				h('div', { className: `claudian-mcp-selector-badge ${enabled.length > 1 ? 'visible' : ''}` }, enabled.length > 1 ? String(enabled.length) : ''),
			),
			h('div', { className: 'claudian-mcp-selector-dropdown' },
				h('div', { className: 'claudian-mcp-selector-header' }, 'Mcp servers'),
				h('div', { className: 'claudian-mcp-selector-list' },
					servers.length === 0 ? h('div', { className: 'claudian-mcp-selector-empty' }, 'No MCP servers configured') :
						servers.map((server) => h('div', {
							key: server.name,
							className: `claudian-mcp-selector-item ${server.enabled ? 'enabled' : ''}`,
							onMouseDown: (event) => {
								event.preventDefault();
								onToggle(server.name);
							},
						},
							h('div', { className: 'claudian-mcp-selector-check' }, server.enabled ? h(Icon, { name: 'check', size: 12 }) : null),
							h('div', { className: 'claudian-mcp-selector-item-info' },
								h('span', { className: 'claudian-mcp-selector-item-name' }, server.name),
								server.contextSaving ? h('span', { className: 'claudian-mcp-selector-cs-badge' }, '@') : null,
							),
						)),
				),
			),
		);
	}

	function InputToolbar({ tab, settings, usage, externalPaths, mcpServers, onModel, onAddCustomModel, onRemoveCustomModel, onEffort, onServiceTier, onPermission, onMode, onAddContext, onRemoveContext, onTogglePersistent, onToggleMcp }) {
		const toolbarModel = tab.model || settings.model;
		const toolbarProviderId = tab.providerId;
		const showServiceTier = tab.providerId === 'codex' && isFastTierCodexModel(toolbarModel);
		const showModeSelector = false;
		const showMcpSelector = supportsMcpToolsForProvider(toolbarProviderId);
		return h('div', { className: 'claudian-input-toolbar' },
			h(ModelSelector, {
				model: toolbarModel,
				settings,
				providerId: toolbarProviderId,
				onChange: onModel,
				onAddCustom: onAddCustomModel,
				onRemoveCustom: onRemoveCustomModel,
			}),
			h(ThinkingSelector, { effort: settings.effort, providerId: toolbarProviderId, model: toolbarModel, settings, onChange: onEffort }),
			showServiceTier ? h('div', { className: 'claudian-service-tier-toggle' },
				h('div', { className: `claudian-service-tier-button ${settings.serviceTier === 'fast' ? 'active' : ''}`, onClick: onServiceTier, title: 'Toggle on/off fast mode' },
					h('span', { className: 'claudian-service-tier-icon' }, h(Icon, { name: 'zap', size: 14 })),
				),
			) : null,
			h(ContextMeter, { usage }),
			h(ExternalContextSelector, { paths: externalPaths, onAdd: onAddContext, onRemove: onRemoveContext, onTogglePersistent }),
			showMcpSelector ? h(McpSelector, { servers: mcpServers, onToggle: onToggleMcp }) : null,
			h('div', { className: 'claudian-permission-toggle' },
				h('span', { className: `claudian-permission-label ${settings.permissionMode === 'plan' ? 'plan-active' : ''}` }, settings.permissionMode === 'plan' ? 'PLAN' : settings.permissionMode === 'yolo' ? 'YOLO' : 'Safe'),
				settings.permissionMode !== 'plan' ? h('div', {
					className: `claudian-toggle-switch ${settings.permissionMode === 'yolo' ? 'active' : ''}`,
					onClick: onPermission,
				}) : null,
			),
			showModeSelector ? h('div', { className: 'claudian-mode-selector' },
				h('span', { className: `claudian-mode-label ${settings.mode === 'agent' ? 'active' : ''}` }, settings.mode === 'agent' ? 'Agent' : 'Chat'),
				h('div', { className: `claudian-toggle-switch ${settings.mode === 'agent' ? 'active' : ''}`, onClick: onMode }),
			) : null,
		);
	}

	function MentionDropdown({ visible, items, selectedIndex, onHover, onPick }) {
		const iconFor = (item) => {
			if (item.type === 'mcp-server') return 'terminal';
			if (item.type === 'agent' || item.type === 'agent-folder') return 'box';
			if (item.type === 'folder' || item.type === 'context-folder') return 'folder';
			return 'file';
		};
		const nameFor = (item) => {
			if (item.type === 'mcp-server') return `@${item.name}`;
			if (item.type === 'agent-folder') return `@${item.name}/`;
			if (item.type === 'agent') return `@${item.id}`;
			if (item.type === 'context-folder') return `@${item.name}/`;
			if (item.type === 'context-file') return item.name;
			if (item.type === 'folder') return `@${item.path}/`;
			return item.path || item.name;
		};
		const nameClassFor = (item) => {
			if (item.type === 'agent-folder') return 'claudian-mention-name claudian-mention-name-agent-folder';
			if (item.type === 'agent') return 'claudian-mention-name claudian-mention-name-agent';
			if (item.type === 'context-folder' || item.type === 'folder') return 'claudian-mention-name claudian-mention-name-folder';
			if (item.type === 'context-file') return 'claudian-mention-name claudian-mention-name-context';
			if (item.type === 'mcp-server') return 'claudian-mention-name';
			return 'claudian-mention-path';
		};
		const keyFor = (item) => `${item.type}:${item.id || item.absolutePath || item.path || item.name}`;
		return h('div', { className: `claudian-mention-dropdown ${visible ? 'visible' : ''}` },
			items.length === 0 ? h('div', { className: 'claudian-mention-empty' }, 'No matches') : null,
			items.map((item, index) => h('div', {
				key: keyFor(item),
				className: `claudian-mention-item ${item.type} ${index === selectedIndex ? 'selected' : ''}`,
				onMouseDown: (event) => {
					event.preventDefault();
					onPick(item);
				},
				onMouseEnter: () => onHover(index),
			},
				h('span', { className: 'claudian-mention-icon' }, h(Icon, { name: iconFor(item), size: 14 })),
				h('span', { className: 'claudian-mention-text' },
					h('span', { className: nameClassFor(item) }, nameFor(item)),
					item.description ? h('span', { className: item.type === 'agent' ? 'claudian-mention-agent-desc' : 'claudian-mention-desc' }, item.description) : null,
				),
			)),
		);
	}

	function SlashDropdown({ visible, query, selectedIndex, onHover, onPick, itemsOverride, emptyLabel = 'No matching commands', variant = 'slash' }) {
		const search = String(query || '').toLowerCase();
		const sourceItems = itemsOverride || COMMANDS;
		const items = sourceItems.filter((command) => dropdownItemMatches(command, search));
		const sortedItems = sortDropdownItems(items, search);
		const displayName = (command) => {
			const explicit = String(command?.name || '');
			if (/^[$/]/.test(explicit)) return explicit;
			const prefix = command?.displayPrefix || command?.entry?.displayPrefix || '';
			return `${prefix}${explicit}`;
		};
		const variantClass = variant ? ` claudian-slash-dropdown-${variant}` : '';
		return h('div', { className: `claudian-slash-dropdown${variantClass} ${visible ? 'visible' : ''}`, 'data-dropdown-kind': variant || 'slash' },
			sortedItems.length === 0 ? h('div', { className: 'claudian-slash-empty' }, emptyLabel) : null,
			sortedItems.map((command, index) => h('div', {
				key: `${command.name}:${command.scope || ''}:${command.entry?.persistenceKey || command.entry?.id || ''}`,
				className: `claudian-slash-item ${index === selectedIndex ? 'selected' : ''}`,
				style: command.depth ? { paddingLeft: `${12 + Math.min(6, Number(command.depth) || 0) * 12}px` } : undefined,
				onMouseDown: (event) => {
					event.preventDefault();
					onPick(command);
				},
				onMouseEnter: () => onHover(index),
			},
				h('span', { className: 'claudian-slash-name' }, displayName(command)),
				command.argumentHint ? h('span', { className: 'claudian-slash-hint' }, normalizeSlashArgumentHint(command.argumentHint)) : null,
				h('span', { className: 'claudian-slash-desc' }, command.desc),
			)),
		);
	}

	function PdfTreeCheckbox({ checked, indeterminate, disabled, onToggle, title }) {
		const checkboxRef = useRef(null);
		useEffect(() => {
			if (checkboxRef.current) checkboxRef.current.indeterminate = !!indeterminate;
		}, [indeterminate]);
		return h('input', {
			ref: checkboxRef,
			type: 'checkbox',
			className: 'claudian-pdf-tree-checkbox',
			checked: !!checked,
			disabled: !!disabled,
			title,
			onChange: () => {},
			onMouseDown: (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (!disabled) onToggle?.();
			},
		});
	}

	function PdfContextTreeDropdown({
		visible,
		nodes,
		expandedIds,
		selectedKeys,
		selectedIndex,
		typeFilter = 'all',
		typeFilters = PDF_TREE_TYPE_FILTERS,
		typeFilterCounts = {},
		onHover,
		onToggleExpanded,
		onToggleSelection,
		onTypeFilterChange,
		onDismiss,
		onRequestInputFocus,
		emptyLabel = 'No matching PDF context',
		query = '',
	}) {
		if (!visible) return null;
		const visibleNodes = collectPdfTreeVisibleNodes(nodes, expandedIds);
		const iconForNode = (node) => {
			const type = String(node?.type || '');
			if (type === 'image' || type === 'table' || type === 'figures' || type === 'tables') return 'image';
			if (type === 'paper' || type === 'text' || type === 'paragraph' || type === 'reference') return 'file-text';
			if (type === 'equation') return 'list';
			if (type === 'references' || type === 'outline' || type === 'context-group') return 'list-checks';
			return 'folder';
		};
		return h('div', {
			className: 'claudian-slash-dropdown claudian-slash-dropdown-pdf claudian-pdf-tree-dropdown visible',
			'data-dropdown-kind': 'pdf',
			onKeyDown: (event) => {
				if (event.key !== 'Escape' || event.isComposing) return;
				event.preventDefault();
				event.stopPropagation();
				onDismiss?.();
			},
			onMouseDown: (event) => {
				if (event.defaultPrevented) return;
				window.requestAnimationFrame(() => onRequestInputFocus?.());
			},
		},
			h('div', { className: 'claudian-pdf-tree-header' },
				h('div', { className: 'claudian-pdf-tree-header-top' },
					h('span', null, query ? `PDF context: ${query}` : 'PDF context'),
					h('span', null, 'Space/Enter select · Esc close'),
				),
				h('div', { className: 'claudian-pdf-tree-filters' },
					typeFilters.map((filter) => {
						const count = Number(typeFilterCounts?.[filter.id] || 0);
						const selected = normalizePdfTreeTypeFilter(typeFilter) === filter.id;
						return h('button', {
							key: filter.id,
							type: 'button',
							className: `claudian-pdf-tree-filter ${selected ? 'selected' : ''}`,
							onMouseDown: (event) => {
								event.preventDefault();
								event.stopPropagation();
								onTypeFilterChange?.(filter.id);
							},
						}, `${filter.label}${Number.isFinite(count) ? ` ${count}` : ''}`);
					}),
				),
			),
			h('div', { className: 'claudian-pdf-tree-body' },
				visibleNodes.length === 0 ? h('div', { className: 'claudian-slash-empty' }, emptyLabel) : null,
				visibleNodes.map((node, index) => {
				const hasChildren = Array.isArray(node.children) && node.children.length > 0;
				const expanded = expandedIds?.has?.(node.key);
				const selection = pdfTreeSelectionState(node, selectedKeys);
				const rowClass = [
					'claudian-pdf-tree-row',
					node.type ? `type-${node.type}` : '',
					index === selectedIndex ? 'selected' : '',
					selection.checked ? 'is-checked' : '',
					selection.indeterminate ? 'is-indeterminate' : '',
					hasChildren ? 'has-children' : '',
				].filter(Boolean).join(' ');
				return h('div', {
					key: node.key,
					className: rowClass,
					style: { '--pdf-tree-depth': String(Math.min(8, Number(node.depth) || 0)) },
					title: [node.label, node.desc].filter(Boolean).join('\n'),
					onMouseEnter: () => onHover?.(index),
					onMouseDown: (event) => {
						event.preventDefault();
						if (hasChildren) onToggleExpanded?.(node.key);
					},
				},
					h('button', {
						type: 'button',
						className: `claudian-pdf-tree-caret ${hasChildren ? '' : 'is-empty'}`,
						tabIndex: -1,
						'aria-label': expanded ? 'Collapse' : 'Expand',
						onMouseDown: (event) => {
							event.preventDefault();
							event.stopPropagation();
							if (hasChildren) onToggleExpanded?.(node.key);
						},
					}, hasChildren ? h(Icon, { name: expanded ? 'chevron-down' : 'chevron-right', size: 13 }) : null),
					h(PdfTreeCheckbox, {
						checked: selection.checked,
						indeterminate: selection.indeterminate,
						disabled: selection.selectableCount === 0,
						title: selection.selectableCount > 1 ? `选择 ${selection.selectableCount} 个 PDF 片段` : '选择 PDF 片段',
						onToggle: () => onToggleSelection?.(node),
					}),
					h('span', { className: `claudian-pdf-tree-icon ${node.type || ''}` }, h(Icon, { name: iconForNode(node), size: 13 })),
					h('span', { className: 'claudian-pdf-tree-text' },
						h('span', { className: 'claudian-pdf-tree-label' }, [node.label, node.desc].filter(Boolean).join(' · ')),
					),
				);
				}),
			),
		);
	}

	function Composer({
		tab,
		settings,
		input: committedInput,
		setInput: setCommittedInput,
		inputRef,
		onSend,
		onInstructionSubmit,
		onCancel,
		onFocusMessages,
		navContent,
		toolbarProps,
		externalPaths,
		mcpServers,
		turnContext,
		pdfSelection,
		includePdfSelection,
		pdfSnippetCatalog,
		pdfSnippetChips,
		featureGuideAction,
		onDismissPdfSelection,
		onDismissGraphSelection,
		onAddPdfSnippet,
		onRemovePdfSnippet,
		onClearPdfSnippets,
		onRequestPdfSnippetsRefresh,
		onAttachMentionFile,
		onRemoveMentionFile,
		onMentionMcp,
		onRemoveMcpMention,
		onMentionAgent,
		onRemoveAgentMention,
		onAttachImages,
		onRemoveImage,
		onEditQueued,
		onDiscardQueued,
		onSteerQueued,
		onBangBashCommand,
		onRequestClaudeRuntimeCommands,
		onRequestCodexRuntimeSkills,
		claudeRuntimeCommandRefreshReady,
		codexRuntimeSkillRefreshReady,
		resumeVisible,
		histories,
		activeHistoryId,
		onResumeSelect,
		onDismissResume,
	}) {
		const textareaRef = useRef(null);
		const pendingCursorRef = useRef(null);
		const committedInputValue = String(committedInput || '');
		const [draftInput, setDraftInput] = useState(committedInputValue);
		const draftInputRef = useRef(committedInputValue);
		const lastCommittedInputRef = useRef(committedInputValue);
		const commitInputTimerRef = useRef(null);
		const tabIdRef = useRef(tab.id);
		const [slashIndex, setSlashIndex] = useState(0);
		const [skillIndex, setSkillIndex] = useState(0);
		const [mentionIndex, setMentionIndex] = useState(0);
		const [pdfSnippetIndex, setPdfSnippetIndex] = useState(0);
		const [pdfSnippetTypeFilter, setPdfSnippetTypeFilter] = useState('all');
		const [pdfTreeExpandedIds, setPdfTreeExpandedIds] = useState(() => new Set(['pdf-tree-current-context']));
		const [cursorIndex, setCursorIndex] = useState(() => committedInputValue.length);
		const [slashDismissedInput, setSlashDismissedInput] = useState('');
		const [mentionDismissedInput, setMentionDismissedInput] = useState('');
		const [skillDismissedInput, setSkillDismissedInput] = useState('');
		const [pdfSnippetDismissedInput, setPdfSnippetDismissedInput] = useState('');
		const [instructionModeActive, setInstructionModeActive] = useState(false);
		const [bangBashModeActive, setBangBashModeActive] = useState(false);
		const [transientClaudeRuntimeCommands, setTransientClaudeRuntimeCommands] = useState([]);
		const [transientCodexRuntimeSkills, setTransientCodexRuntimeSkills] = useState([]);
		const [claudeRuntimeCommandStatus, setClaudeRuntimeCommandStatus] = useState('idle');
		const [codexRuntimeSkillStatus, setCodexRuntimeSkillStatus] = useState('idle');
		const instructionModeActiveRef = useRef(false);
		const bangBashModeActiveRef = useRef(false);
		const [dropVisible, setDropVisible] = useState(false);
		const [modalImage, setModalImage] = useState(null);
		const input = draftInput;
		const instructionMode = instructionModeActive;
		const bangBashEnabled = isBangBashEnabledForProvider(tab.providerId, settings);
		const bangBashMode = bangBashEnabled && bangBashModeActive;
		const activeCursorIndex = Math.max(0, Math.min(String(input || '').length, Number.isFinite(cursorIndex) ? cursorIndex : String(input || '').length));
		const slashTrigger = getSlashTrigger(input, activeCursorIndex);
		const slashQuery = slashTrigger?.query || '';
		const pdfSnippetTrigger = getPdfSnippetTrigger(input, activeCursorIndex);
		const pdfSnippetQuery = pdfSnippetTrigger?.query || '';
		const claudeRuntimeCommandRequestKeyRef = useRef('');
		const codexRuntimeSkillRequestKeyRef = useRef('');
		const slashCatalogSettings = useMemo(() => {
			let next = settings;
			if (tab.providerId === 'claude' && transientClaudeRuntimeCommands.length > 0) {
				const seen = new Set();
				const mergedRuntimeCommands = [
					...normalizeClaudeCommands(transientClaudeRuntimeCommands),
					...normalizeClaudeCommands(settings.claudeRuntimeCommands),
				].filter((entry) => {
					const key = String(entry.name || '').toLowerCase();
					if (!key || seen.has(key)) return false;
					seen.add(key);
					return true;
				});
				next = { ...next, claudeRuntimeCommands: mergedRuntimeCommands };
			}
			if (tab.providerId === 'codex' && transientCodexRuntimeSkills.length > 0) {
				const seen = new Set();
				const mergedRuntimeSkills = [
					...normalizeCodexRuntimeSkills(transientCodexRuntimeSkills),
					...normalizeCodexRuntimeSkills(settings.codexRuntimeSkills),
				].filter((entry) => {
					const key = [String(entry.name || '').toLowerCase(), String(entry.path || entry.filePath || '').toLowerCase()].join('|');
					if (!String(entry.name || '').trim() || seen.has(key)) return false;
					seen.add(key);
					return true;
				});
				next = { ...next, codexRuntimeSkills: mergedRuntimeSkills };
			}
			return next;
		}, [settings, settings.claudeRuntimeCommands, settings.codexRuntimeSkills, tab.providerId, transientClaudeRuntimeCommands, transientCodexRuntimeSkills]);
		const slashCatalog = useMemo(() => getSlashCommandItems(slashCatalogSettings, tab.providerId), [
			settings.claudeCommands,
			slashCatalogSettings,
			settings.claudeHiddenCommands,
			settings.codexSkills,
			settings.codexRuntimeSkills,
			settings.codexHiddenCommands,
			tab.providerId,
		]);
		const slashItems = useMemo(() => {
			if (instructionMode || bangBashMode || !slashTrigger) return [];
			return sortDropdownItems(slashCatalog.filter((command) => {
				if (!slashTrigger?.atStart && (command.isBuiltIn || command.topLevelOnly)) return false;
				return dropdownItemMatches(command, slashQuery);
			}), slashQuery);
		}, [bangBashMode, instructionMode, slashCatalog, slashQuery, slashTrigger]);
		const slashRuntimeStatus = tab.providerId === 'claude' ? claudeRuntimeCommandStatus : tab.providerId === 'codex' ? codexRuntimeSkillStatus : 'idle';
		const slashEmptyLabel = slashRuntimeStatus === 'loading'
			? (tab.providerId === 'claude' ? 'Loading Claude commands...' : 'Loading Codex skills...')
			: slashRuntimeStatus === 'error'
				? (tab.providerId === 'claude' ? 'Unable to load Claude commands' : 'Unable to load Codex skills')
				: 'No matching commands';
		const showSlash = !instructionMode && !bangBashMode && !!slashTrigger && slashDismissedInput !== input;
		const skillTrigger = getSkillTrigger(input, activeCursorIndex);
		const skillQuery = skillTrigger?.query || '';
		const skillCatalog = useMemo(() => getCodexSkillItems(slashCatalogSettings), [slashCatalogSettings, settings.codexSkills, settings.codexRuntimeSkills, settings.codexHiddenCommands]);
		const skillItems = useMemo(() => {
			if (tab.providerId !== 'codex' || !skillTrigger) return [];
			const query = skillQuery.toLowerCase();
			return sortDropdownItems(skillCatalog
				.filter((skill) => skill.rawName.toLowerCase().includes(query) || skill.desc.toLowerCase().includes(query)), skillQuery);
		}, [skillCatalog, skillQuery, skillTrigger, tab.providerId]);
		const skillEmptyLabel = codexRuntimeSkillStatus === 'loading'
			? 'Loading Codex skills...'
			: codexRuntimeSkillStatus === 'error'
				? 'Unable to load Codex skills'
				: 'No matching skills';
		const showSkill = tab.providerId === 'codex' && !!skillTrigger && skillDismissedInput !== input;
		const pdfSnippetTree = useMemo(() => buildPdfSnippetTree(pdfSnippetCatalog || [], settings), [pdfSnippetCatalog, settings.workspace]);
		const pdfSnippetTypeFilterCounts = useMemo(() => Object.fromEntries(PDF_TREE_TYPE_FILTERS.map((filter) => [
			filter.id,
			countPdfTreeFilterLeaves(pdfSnippetTree, filter.id),
		])), [pdfSnippetTree]);
		const typedPdfSnippetTree = useMemo(
			() => filterPdfSnippetTreeByType(pdfSnippetTree, pdfSnippetTypeFilter),
			[pdfSnippetTree, pdfSnippetTypeFilter],
		);
		const pdfSnippetTreeNodes = useMemo(
			() => pdfSnippetTrigger ? filterPdfSnippetTree(typedPdfSnippetTree, pdfSnippetQuery) : typedPdfSnippetTree,
			[pdfSnippetQuery, pdfSnippetTrigger, typedPdfSnippetTree],
		);
		const forcedPdfTreeExpandedIds = useMemo(() => {
			const hasQuery = !!String(pdfSnippetQuery || '').trim();
			const isFiltered = normalizePdfTreeTypeFilter(pdfSnippetTypeFilter) !== 'all';
			return hasQuery || isFiltered ? collectPdfTreeBranchIds(pdfSnippetTreeNodes) : new Set();
		}, [pdfSnippetQuery, pdfSnippetTreeNodes, pdfSnippetTypeFilter]);
		const visiblePdfTreeExpandedIds = useMemo(
			() => mergePdfTreeExpandedIds(pdfTreeExpandedIds, forcedPdfTreeExpandedIds),
			[forcedPdfTreeExpandedIds, pdfTreeExpandedIds],
		);
		const showPdfSnippets = !instructionMode
			&& !bangBashMode
			&& !!pdfSnippetTrigger
			&& pdfSnippetDismissedInput !== input;
		const pdfSnippetEmptyLabel = 'No matching PDF context';
		useEffect(() => {
			if (!pdfSnippetTrigger) return;
			onRequestPdfSnippetsRefresh?.();
		}, [onRequestPdfSnippetsRefresh, pdfSnippetTrigger?.start, pdfSnippetQuery]);
		useEffect(() => {
			if (!showPdfSnippets) return undefined;
			const handlePdfSnippetEscape = (event) => {
				if (event.key !== 'Escape' || event.isComposing) return;
				const target = event.target;
				if (target?.closest?.('.claudian-modal-overlay, .claudian-ask-inline, .claudian-permission-block, .claudian-plan-approval-block')) {
					return;
				}
				event.preventDefault();
				event.stopPropagation();
				dismissPdfSnippetMenu();
			};
			window.addEventListener('keydown', handlePdfSnippetEscape, true);
			return () => window.removeEventListener('keydown', handlePdfSnippetEscape, true);
		}, [input, showPdfSnippets]);
		useEffect(() => {
			setPdfTreeExpandedIds((current) => {
				const defaults = collectDefaultPdfTreeExpandedIds(pdfSnippetTree);
				let changed = false;
				const next = new Set(current);
				for (const id of defaults) {
					if (!next.has(id)) {
						next.add(id);
						changed = true;
					}
				}
				return changed ? next : current;
			});
		}, [pdfSnippetTree]);
		useEffect(() => {
			if (tab.providerId !== 'claude') return;
			if (!slashTrigger) {
				claudeRuntimeCommandRequestKeyRef.current = '';
				setClaudeRuntimeCommandStatus('idle');
				return;
			}
			if (!claudeRuntimeCommandRefreshReady) return;
			if (!onRequestClaudeRuntimeCommands) return;
			const key = [
				settings.workspace || '',
				settings.claudePath || '',
				settings.claudeSafeMode || '',
				settings.claudeLoadUserSettings === false ? 'project,local' : 'user,project,local',
				settings.claudeEnableChrome ? 'chrome' : '',
				settings.envText || '',
			].join('|');
			if (claudeRuntimeCommandRequestKeyRef.current === key) return;
			claudeRuntimeCommandRequestKeyRef.current = key;
			setClaudeRuntimeCommandStatus('loading');
			onRequestClaudeRuntimeCommands({ forceReload: false })
				.then((result) => {
					const commands = result?.assets?.claudeRuntimeCommands;
					if (Array.isArray(commands) && commands.length > 0) {
						setTransientClaudeRuntimeCommands(normalizeClaudeCommands(commands));
						setClaudeRuntimeCommandStatus('ready');
					}
					else {
						setClaudeRuntimeCommandStatus('empty');
					}
				})
				.catch(() => {
					setClaudeRuntimeCommandStatus('error');
				});
		}, [
			claudeRuntimeCommandRefreshReady,
			onRequestClaudeRuntimeCommands,
			settings.claudeEnableChrome,
			settings.claudeLoadUserSettings,
			settings.claudePath,
			settings.claudeSafeMode,
			settings.envText,
			settings.workspace,
			slashTrigger,
			tab.providerId,
		]);
		useEffect(() => {
			setTransientClaudeRuntimeCommands([]);
			setClaudeRuntimeCommandStatus('idle');
		}, [
			settings.claudeEnableChrome,
			settings.claudeLoadUserSettings,
			settings.claudePath,
			settings.claudeSafeMode,
			settings.envText,
			settings.workspace,
			tab.id,
			tab.providerId,
		]);
		useEffect(() => {
			if (tab.providerId !== 'codex') return;
			if (!slashTrigger && !skillTrigger) {
				codexRuntimeSkillRequestKeyRef.current = '';
				setCodexRuntimeSkillStatus('idle');
				return;
			}
			if (!codexRuntimeSkillRefreshReady) return;
			if (!onRequestCodexRuntimeSkills) return;
			const key = [
				settings.workspace || '',
				settings.codexInstallationMethod || '',
				settings.codexPath || '',
				settings.codexWslDistroOverride || '',
				settings.openaiModel || '',
				settings.envText || '',
			].join('|');
			if (codexRuntimeSkillRequestKeyRef.current === key) return;
			codexRuntimeSkillRequestKeyRef.current = key;
			setCodexRuntimeSkillStatus('loading');
			onRequestCodexRuntimeSkills({ forceReload: true })
				.then((result) => {
					const skills = result?.assets?.codexRuntimeSkills;
					if (Array.isArray(skills) && skills.length > 0) {
						setTransientCodexRuntimeSkills(normalizeCodexRuntimeSkills(skills));
						setCodexRuntimeSkillStatus('ready');
					}
					else {
						setTransientCodexRuntimeSkills([]);
						setCodexRuntimeSkillStatus('empty');
					}
				})
				.catch(() => {
					setCodexRuntimeSkillStatus('error');
				});
		}, [
			codexRuntimeSkillRefreshReady,
			onRequestCodexRuntimeSkills,
			settings.codexInstallationMethod,
			settings.codexPath,
			settings.codexWslDistroOverride,
			settings.openaiModel,
			settings.envText,
			settings.workspace,
			skillTrigger,
			slashTrigger,
			tab.providerId,
		]);
		useEffect(() => {
			setTransientCodexRuntimeSkills([]);
			setCodexRuntimeSkillStatus('idle');
		}, [
			settings.codexInstallationMethod,
			settings.codexPath,
			settings.codexWslDistroOverride,
			settings.openaiModel,
			settings.envText,
			settings.workspace,
			tab.id,
			tab.providerId,
		]);
		const mentionTrigger = getMentionTrigger(input, activeCursorIndex);
		const mentionQuery = mentionTrigger?.query || '';
		const mentionItems = useMemo(
			() => mentionTrigger ? buildMentionItems(mentionQuery, externalPaths, mcpServers, settings, tab.providerId) : [],
			[mentionQuery, mentionTrigger, externalPaths, mcpServers, settings.claudeAgents, settings.codexSubagents, settings.excludedTagsText, tab.providerId],
		);
		const showMention = !!mentionTrigger && mentionDismissedInput !== input;
		const fileChips = tab.fileChips || [];
		const agentChips = tab.agentChips || [];
		const mcpMentions = tab.mcpMentions || [];
		const imageChips = tab.imageChips || [];
		const pdfSelectionImages = useMemo(
			() => (includePdfSelection ? normalizePdfSelectionImages(pdfSelection) : []),
			[includePdfSelection, pdfSelection],
		);
		const hasPdfSelectionImages = pdfSelectionImages.length > 0;
		const visibleImageChips = useMemo(
			() => mergeTurnImages(imageChips, pdfSelectionImages),
			[imageChips, pdfSelectionImages],
		);
		const selectedPdfSnippets = Array.isArray(pdfSnippetChips) ? pdfSnippetChips : [];
		const collapsePdfSnippetChips = selectedPdfSnippets.length > MAX_COMPOSER_VISIBLE_PDF_SNIPPET_CHIPS;
		const pdfSnippetSummary = useMemo(
			() => summarizePdfSnippetSelection(selectedPdfSnippets),
			[selectedPdfSnippets],
		);
		const selectedPdfSnippetKeys = useMemo(
			() => new Set(selectedPdfSnippets.map(pdfSnippetSelectionKey).filter(Boolean)),
			[selectedPdfSnippets],
		);
		const hasPdfSelectionChip = includePdfSelection && !!pdfSelection;
		const normalizedTurnContext = normalizeTurnContext(turnContext);
		const pdfSelectionPathKey = normalizePathText(pdfSelection?.filePath || pdfSelection?.label || '').toLowerCase();
		const pdfSelectionTextKey = String(pdfSelection?.selectedText || pdfSelection?.text || '').trim();
		const editorSelectionIsPdfSelection = hasPdfSelectionChip && !!normalizedTurnContext.editorSelection && (
			(pdfSelectionPathKey && normalizePathText(normalizedTurnContext.editorSelection.notePath || '').toLowerCase() === pdfSelectionPathKey)
			|| (pdfSelectionTextKey && String(normalizedTurnContext.editorSelection.selectedText || '').trim() === pdfSelectionTextKey)
		);
		const currentNoteIsPdfSelection = hasPdfSelectionChip
			&& pdfSelectionPathKey
			&& normalizePathText(normalizedTurnContext.currentNotePath || '').toLowerCase() === pdfSelectionPathKey;
		const visibleTurnContext = {
			...normalizedTurnContext,
			currentNotePath: currentNoteIsPdfSelection ? '' : normalizedTurnContext.currentNotePath,
			editorSelection: editorSelectionIsPdfSelection ? null : normalizedTurnContext.editorSelection,
		};
		const rawGraphContextChips = Array.isArray(tab.turnContextChips) && tab.turnContextChips.length
			? tab.turnContextChips
			: buildGraphMessageContextChips(visibleTurnContext.graphSelection);
		const graphContextChips = normalizeMessageContextChips(rawGraphContextChips)
			.filter((chip) => chip.type === 'graph-node');
		const contextHasContent = fileChips.length || agentChips.length || mcpMentions.length || visibleImageChips.length || selectedPdfSnippets.length || graphContextChips.length || hasPdfSelectionChip || hasTurnContext(visibleTurnContext) || instructionMode || bangBashMode;
		const wrapperClass = [
			'claudian-input-wrapper',
			settings.permissionMode === 'plan' ? 'claudian-input-plan-mode' : '',
			instructionMode ? 'claudian-input-instruction-mode' : '',
			bangBashMode ? 'claudian-input-bang-bash-mode' : '',
		].filter(Boolean).join(' ');

		function removeVisibleImage(imageId) {
			if (pdfSelectionImages.some((image) => image.id === imageId)) {
				onDismissPdfSelection?.();
				return;
			}
			onRemoveImage?.(imageId);
		}

		function clearCommitInputTimer() {
			if (!commitInputTimerRef.current) return;
			window.clearTimeout(commitInputTimerRef.current);
			commitInputTimerRef.current = null;
		}

		const commitInputNow = useCallback((value = draftInputRef.current) => {
			clearCommitInputTimer();
			const nextValue = String(value ?? '');
			lastCommittedInputRef.current = nextValue;
			setCommittedInput(nextValue);
		}, [setCommittedInput]);

		const commitInputSoon = useCallback((value) => {
			clearCommitInputTimer();
			const nextValue = String(value ?? '');
			commitInputTimerRef.current = window.setTimeout(() => {
				commitInputTimerRef.current = null;
				lastCommittedInputRef.current = nextValue;
				setCommittedInput(nextValue);
			}, 750);
		}, [setCommittedInput]);

		function setInput(valueOrUpdater, options = {}) {
			const currentValue = draftInputRef.current;
			const nextValue = typeof valueOrUpdater === 'function'
				? valueOrUpdater(currentValue)
				: valueOrUpdater;
			const normalized = String(nextValue ?? '');
			draftInputRef.current = normalized;
			setDraftInput(normalized);
			if (options.commit === 'now') {
				commitInputNow(normalized);
			}
			else if (options.commit !== 'skip') {
				commitInputSoon(normalized);
			}
			return normalized;
		}

		function setInstructionModeActiveNow(value) {
			const nextValue = Boolean(value);
			instructionModeActiveRef.current = nextValue;
			setInstructionModeActive(nextValue);
		}

		function setBangBashModeActiveNow(value) {
			const nextValue = Boolean(value);
			bangBashModeActiveRef.current = nextValue;
			setBangBashModeActive(nextValue);
		}

		function cancelInstructionMode(options = {}) {
			setInstructionModeActiveNow(false);
			setInput('', { commit: 'now' });
			pendingCursorRef.current = 0;
			if (options.refocus !== false) {
				window.requestAnimationFrame(() => textareaRef.current?.focus());
			}
		}

		function cancelBangBashMode(options = {}) {
			setBangBashModeActiveNow(false);
			setInput('', { commit: 'now' });
			pendingCursorRef.current = 0;
			if (options.refocus !== false) {
				window.requestAnimationFrame(() => textareaRef.current?.focus());
			}
		}

		useEffect(() => {
			return () => clearCommitInputTimer();
		}, []);

		useEffect(() => {
			const tabChanged = tabIdRef.current !== tab.id;
			const changedExternally = committedInputValue !== lastCommittedInputRef.current;
			if (tabChanged || changedExternally) {
				clearCommitInputTimer();
				draftInputRef.current = committedInputValue;
				setDraftInput(committedInputValue);
				setCursorIndex(committedInputValue.length);
			}
			lastCommittedInputRef.current = committedInputValue;
			tabIdRef.current = tab.id;
		}, [committedInputValue, tab.id]);

		useEffect(() => {
			draftInputRef.current = draftInput;
		}, [draftInput]);

		useEffect(() => {
			const el = textareaRef.current;
			if (!el) return;
			if (el.value !== input) {
				el.value = input;
			}
		}, [input, tab.id]);

		useEffect(() => {
			if (featureGuideAction?.type !== 'menu') return;
			setInstructionModeActiveNow(false);
			setBangBashModeActiveNow(false);
			setPdfSnippetDismissedInput('');
			setPdfSnippetTypeFilter('all');
			setInput('!', { commit: 'now' });
			setCursorIndex(1);
			pendingCursorRef.current = 1;
			window.requestAnimationFrame(() => {
				const textarea = textareaRef.current;
				textarea?.focus();
				textarea?.setSelectionRange?.(1, 1);
			});
		}, [featureGuideAction?.token]);

		useEffect(() => {
			if (resumeVisible && committedInputValue) onDismissResume?.();
		}, [resumeVisible, committedInputValue, onDismissResume]);

		useEffect(() => {
			const el = textareaRef.current;
			if (!el) return;
			el.style.height = 'auto';
			el.style.height = `${Math.min(220, Math.max(76, el.scrollHeight))}px`;
		}, [input]);

		useEffect(() => {
			const cursor = pendingCursorRef.current;
			if (cursor === null || cursor === undefined) return;
			const el = textareaRef.current;
			if (!el) return;
			const nextCursor = Math.max(0, Math.min(String(input || '').length, cursor));
			el.setSelectionRange(nextCursor, nextCursor);
			setCursorIndex(nextCursor);
			pendingCursorRef.current = null;
		}, [input]);

		useEffect(() => {
			if (!inputRef) return undefined;
			const node = textareaRef.current;
			inputRef.current = node;
			return () => {
				if (inputRef.current === node) {
					inputRef.current = null;
				}
			};
		}, [inputRef]);

		useEffect(() => {
			setInstructionModeActiveNow(false);
			setBangBashModeActiveNow(false);
		}, [tab.id]);

		useEffect(() => {
			if (!instructionModeActive && !bangBashModeActive) return undefined;
			const handleModeEscape = (event) => {
				if (event.key !== 'Escape' || event.isComposing) return;
				const target = event.target;
				if (target?.closest?.('.claudian-modal-overlay, .claudian-ask-inline, .claudian-permission-block, .claudian-plan-approval-block')) {
					return;
				}
				if (instructionModeActiveRef.current) {
					event.preventDefault();
					event.stopPropagation();
					cancelInstructionMode();
					return;
				}
				if (bangBashModeActiveRef.current) {
					event.preventDefault();
					event.stopPropagation();
					cancelBangBashMode();
				}
			};
			window.addEventListener('keydown', handleModeEscape, true);
			return () => window.removeEventListener('keydown', handleModeEscape, true);
		}, [instructionModeActive, bangBashModeActive]);

		useEffect(() => {
			setSlashIndex(0);
			if (slashDismissedInput && slashDismissedInput !== input) {
				setSlashDismissedInput('');
			}
		}, [slashQuery, input, slashDismissedInput]);

		useEffect(() => {
			setSkillIndex(0);
			if (skillDismissedInput && skillDismissedInput !== input) {
				setSkillDismissedInput('');
			}
		}, [skillQuery, input, skillDismissedInput]);

		useEffect(() => {
			setPdfSnippetIndex(0);
			if (pdfSnippetDismissedInput && pdfSnippetDismissedInput !== input) {
				setPdfSnippetDismissedInput('');
			}
		}, [pdfSnippetQuery, input, pdfSnippetDismissedInput]);

		useEffect(() => {
			setMentionIndex(0);
			if (mentionDismissedInput && mentionDismissedInput !== input) {
				setMentionDismissedInput('');
			}
		}, [mentionQuery, input, mentionDismissedInput]);

		function updateCursorFromTextarea(target) {
			if (!target) return;
			const cursor = typeof target.selectionStart === 'number' ? target.selectionStart : String(target.value || '').length;
			setCursorIndex(cursor);
		}

		function pickSlash(item, triggerOverride) {
			let nextCursor = null;
			setInput((current) => {
				const trigger = triggerOverride || getSlashTrigger(current, activeCursorIndex);
				if (!trigger) return current;
				const rawName = String(item?.rawName || item?.entry?.name || item?.name || '').replace(/^[$/]+/, '');
				const explicitName = String(item?.name || '');
				const insertPrefix = item?.insertPrefix || item?.entry?.insertPrefix || '';
				const name = insertPrefix
					? `${insertPrefix}${rawName}`
					: (/^[$/]/.test(explicitName) ? explicitName : `/${explicitName}`);
				const replacement = `${name} `;
				nextCursor = trigger.start + replacement.length;
				return `${current.slice(0, trigger.start)}${replacement}${current.slice(trigger.end)}`;
			});
			if (nextCursor !== null) pendingCursorRef.current = nextCursor;
			setSlashDismissedInput('');
		}

		function pickMention(item, triggerOverride) {
			let nextCursor = null;
			setInput((current) => {
				const trigger = triggerOverride || getMentionTrigger(current, activeCursorIndex);
				if (!trigger) return current;
				const replacement = mentionReplacement(item);
				nextCursor = trigger.start + replacement.length;
				return `${current.slice(0, trigger.start)}${replacement}${current.slice(trigger.end)}`;
			});
			if (nextCursor !== null) pendingCursorRef.current = nextCursor;
			setMentionDismissedInput('');
			if (item.type === 'context-folder' || item.type === 'agent-folder') {
				return;
			}
			if (item.type === 'mcp-server') {
				onMentionMcp(item.name);
			}
			else if (item.type === 'agent') {
				onMentionAgent(item);
			}
			else {
				onAttachMentionFile(item);
			}
		}

		function pickSkill(item, triggerOverride) {
			let nextCursor = null;
			setInput((current) => {
				const trigger = triggerOverride || getSkillTrigger(current, activeCursorIndex);
				if (!trigger) return current;
				const name = item?.rawName || String(item?.name || '').replace(/^\$/, '');
				const replacement = `$${name} `;
				nextCursor = trigger.start + replacement.length;
				return `${current.slice(0, trigger.start)}${replacement}${current.slice(trigger.end)}`;
			});
			if (nextCursor !== null) pendingCursorRef.current = nextCursor;
			setSkillDismissedInput('');
		}

		function dismissPdfSnippetTrigger(triggerOverride) {
			let nextCursor = null;
			const nextValue = setInput((current) => {
				const trigger = triggerOverride || getPdfSnippetTrigger(current, activeCursorIndex) || getPdfSnippetTrigger(current, String(current || '').length);
				if (!trigger) return current;
				const before = current.slice(0, trigger.start);
				const after = current.slice(trigger.end);
				const needsSpace = before && after && !/\s$/.test(before) && !/^\s/.test(after);
				nextCursor = before.length + (needsSpace ? 1 : 0);
				return `${before}${needsSpace ? ' ' : ''}${after}`.replace(/[ \t]{2,}/g, ' ');
			}, { commit: 'now' });
			setPdfSnippetDismissedInput(nextValue);
			setPdfSnippetIndex(0);
			if (nextCursor !== null) pendingCursorRef.current = nextCursor;
			window.requestAnimationFrame(() => textareaRef.current?.focus());
		}

		function dismissPdfSnippetMenu() {
			const currentValue = textareaRef.current?.value ?? draftInputRef.current ?? input;
			setPdfSnippetDismissedInput(String(currentValue || ''));
			setPdfSnippetIndex(0);
			window.requestAnimationFrame(() => textareaRef.current?.focus());
		}

		function togglePdfTreeExpanded(nodeKey) {
			if (!nodeKey) return;
			setPdfTreeExpandedIds((current) => {
				const next = new Set(current);
				if (next.has(nodeKey)) next.delete(nodeKey);
				else next.add(nodeKey);
				return next;
			});
		}

		function togglePdfTreeSelection(node, triggerOverride) {
			const targets = collectPdfTreeSelectionTargets(node);
			if (!targets.length) return;
			const keys = targets.map(pdfSnippetSelectionKey).filter(Boolean);
			const leafKeys = collectPdfTreeSelectableLeaves(node).map(pdfSnippetSelectionKey).filter(Boolean);
			const coveredKeys = collectPdfTreeCoveredSelectionKeys(node);
			const selectedCoveredKeys = coveredKeys.filter((key) => selectedPdfSnippetKeys.has(key));
			const allSelected = keys.length > 0 && keys.every((key) => selectedPdfSnippetKeys.has(key));
			const allLeavesSelected = leafKeys.length > 0 && leafKeys.every((key) => selectedPdfSnippetKeys.has(key));
			if (allSelected) {
				selectedCoveredKeys.forEach((key) => onRemovePdfSnippet?.(key));
				dismissPdfSnippetTrigger(triggerOverride);
				return;
			}
			if (allLeavesSelected && leafKeys.some((key) => !keys.includes(key))) {
				selectedCoveredKeys.forEach((key) => onRemovePdfSnippet?.(key));
				dismissPdfSnippetTrigger(triggerOverride);
				return;
			}
			selectedCoveredKeys.forEach((key) => onRemovePdfSnippet?.(key));
			targets.forEach((item) => {
				const key = pdfSnippetSelectionKey(item);
				if (!key || selectedPdfSnippetKeys.has(key)) return;
				onAddPdfSnippet?.(item);
			});
			dismissPdfSnippetTrigger(triggerOverride);
		}

		function removePdfSnippetList(chips) {
			for (const chip of Array.isArray(chips) ? chips : []) {
				const key = pdfSnippetSelectionKey(chip);
				if (key) onRemovePdfSnippet?.(key);
			}
		}

		function renderPdfSnippetChip(chip) {
			return h('span', { key: chip.id || chip.token || chip.name, className: `claudian-file-chip pdf-snippet ${chip.type || ''}`, title: chip.content || chip.label || chip.name },
				h('span', { className: 'claudian-file-chip-icon' }, h(Icon, { name: chip.type === 'image' || chip.type === 'table' ? 'image' : 'file-text', size: 12 })),
				h('span', { className: 'claudian-file-chip-name' }, chip.label || chip.name || chip.token),
				h('span', {
					className: 'claudian-file-chip-remove',
					onMouseDown: (event) => {
						event.preventDefault();
						onRemovePdfSnippet?.(chip.id || chip.token || chip.name);
					},
				}, h(Icon, { name: 'x', size: 12 })),
			);
		}

		function stripPdfSnippetTriggerToken(value) {
			const text = String(value || '');
			const cursor = Math.max(0, Math.min(text.length, activeCursorIndex));
			const trigger = getPdfSnippetTrigger(text, cursor) || getPdfSnippetTrigger(text, text.length);
			if (!trigger) return text;
			const before = text.slice(0, trigger.start);
			const after = text.slice(trigger.end);
			const needsSpace = before && after && !/\s$/.test(before) && !/^\s/.test(after);
			return `${before}${needsSpace ? ' ' : ''}${after}`.replace(/[ \t]{2,}/g, ' ').trim();
		}

		function renderChip(chip, iconName, onRemove) {
			return h('span', { key: chip.key || chip.path || chip.id || chip.name, className: `claudian-file-chip ${chip.type || ''}`, title: chip.path || chip.id || chip.name },
				h('span', { className: 'claudian-file-chip-icon' }, h(Icon, { name: iconName, size: 12 })),
				h('span', { className: 'claudian-file-chip-name' }, chip.name || pathBaseName(chip.path || chip.id)),
				h('span', {
					className: 'claudian-file-chip-remove',
					onMouseDown: (event) => {
						event.preventDefault();
						onRemove(chip);
					},
				}, h(Icon, { name: 'x', size: 12 })),
			);
		}

		function fileToAttachment(file, source) {
			return new Promise((resolve, reject) => {
				if ((Number(file?.size || 0) || 0) > MAX_IMAGE_ATTACHMENT_BYTES) {
					reject(new Error('Image is too large'));
					return;
				}
				const reader = new FileReader();
				reader.onload = () => {
					const dataUrl = String(reader.result || '');
					const parts = dataUrl.split(',');
					resolve({
						id: makeId('img'),
						name: file.name || `image-${Date.now()}.png`,
						mediaType: attachmentMediaType(file),
						data: parts[1] || MOCK_IMAGE_DATA,
						size: file.size || 0,
						source,
					});
				};
				reader.onerror = () => reject(reader.error || new Error('Failed to read image'));
				reader.readAsDataURL(file);
			});
		}

		async function attachFiles(files, source) {
			const imageFiles = Array.from(files || [])
				.filter((file) => isSupportedImageFile(file) && (Number(file?.size || 0) || 0) <= MAX_IMAGE_ATTACHMENT_BYTES)
				.slice(0, MAX_TURN_IMAGES);
			if (imageFiles.length === 0) return;
			const attachments = [];
			for (const file of imageFiles) {
				try {
					attachments.push(await fileToAttachment(file, source));
				}
				catch {
					attachments.push({
						id: makeId('img'),
						name: file.name || 'image.png',
						mediaType: attachmentMediaType(file),
						data: MOCK_IMAGE_DATA,
						size: file.size || 0,
						source,
					});
				}
			}
			onAttachImages(attachments);
		}

		function handlePaste(event) {
			const items = Array.from(event.clipboardData?.items || []);
			const files = items.map((item) => item.kind === 'file' ? item.getAsFile() : null).filter(Boolean);
			if (files.some(isSupportedImageFile)) {
				event.preventDefault();
				void attachFiles(files, 'paste');
			}
		}

		function handleKeyDown(event) {
			const liveValue = event.currentTarget.value;
			const liveCursor = typeof event.currentTarget.selectionStart === 'number'
				? event.currentTarget.selectionStart
				: String(liveValue || '').length;
			const liveInstructionMode = instructionModeActiveRef.current || instructionModeActive;
			const liveBangBashMode = bangBashEnabled && (bangBashModeActiveRef.current || bangBashModeActive);

			const modeAction = resolveComposerModeKeyAction({
				value: liveValue,
				key: event.key,
				shiftKey: event.shiftKey,
				isComposing: event.isComposing,
				instructionMode: liveInstructionMode,
				bangBashEnabled: bangBashEnabled && liveBangBashMode,
				bangBashMode: liveBangBashMode,
			});
			if (modeAction) {
				if (modeAction.preventDefault) {
					event.preventDefault();
				}
				if (modeAction.type === 'cancel-bang-bash') {
					cancelBangBashMode();
				}
				else if (modeAction.type === 'submit-bang-bash') {
					setBangBashModeActiveNow(false);
					setInput('', { commit: 'now' });
					pendingCursorRef.current = 0;
					onBangBashCommand?.(modeAction.command);
				}
				else if (modeAction.type === 'enter-instruction') {
					setInstructionModeActiveNow(true);
					pendingCursorRef.current = 0;
					window.requestAnimationFrame(() => textareaRef.current?.focus());
				}
				else if (modeAction.type === 'enter-bang-bash') {
					setBangBashModeActiveNow(true);
					pendingCursorRef.current = 0;
					window.requestAnimationFrame(() => textareaRef.current?.focus());
				}
				else if (modeAction.type === 'cancel-instruction') {
					cancelInstructionMode();
				}
				else if (modeAction.type === 'submit-instruction') {
					setInstructionModeActiveNow(false);
					setInput('', { commit: 'now' });
					pendingCursorRef.current = 0;
					onInstructionSubmit?.(modeAction.instruction);
				}
				return;
			}

			const isDropdownKey = event.key === 'ArrowDown'
				|| event.key === 'ArrowUp'
				|| event.key === 'ArrowLeft'
				|| event.key === 'ArrowRight'
				|| event.key === 'Enter'
				|| event.key === 'Tab'
				|| event.key === ' '
				|| event.key === 'Escape';
			if (!isDropdownKey) {
				return;
			}

			const livePdfSnippetTrigger = getPdfSnippetTrigger(liveValue, liveCursor);
			const livePdfSnippetQuery = livePdfSnippetTrigger?.query || '';
			const livePdfSnippetTree = livePdfSnippetTrigger
				? filterPdfSnippetTree(typedPdfSnippetTree, livePdfSnippetQuery)
				: [];
			const liveForcedPdfTreeExpandedIds = livePdfSnippetTrigger
				&& (String(livePdfSnippetQuery || '').trim() || normalizePdfTreeTypeFilter(pdfSnippetTypeFilter) !== 'all')
				? collectPdfTreeBranchIds(livePdfSnippetTree)
				: new Set();
			const livePdfSnippetNodes = livePdfSnippetTrigger
				? collectPdfTreeVisibleNodes(livePdfSnippetTree, mergePdfTreeExpandedIds(pdfTreeExpandedIds, liveForcedPdfTreeExpandedIds))
				: [];
			const liveShowPdfSnippets = !liveInstructionMode
				&& !liveBangBashMode
				&& !!livePdfSnippetTrigger
				&& pdfSnippetDismissedInput !== liveValue;
			const liveSlashTrigger = getSlashTrigger(liveValue, liveCursor);
			const liveSlashQuery = liveSlashTrigger?.query || '';
			const liveSlashItems = liveSlashTrigger
				? sortDropdownItems(slashCatalog.filter((command) => {
					if (!liveSlashTrigger.atStart && (command.isBuiltIn || command.topLevelOnly)) return false;
					return dropdownItemMatches(command, liveSlashQuery);
				}), liveSlashQuery)
				: [];
			const liveShowSlash = !liveInstructionMode
				&& !liveBangBashMode
				&& !!liveSlashTrigger
				&& slashDismissedInput !== liveValue;
			const liveSkillTrigger = getSkillTrigger(liveValue, liveCursor);
			const liveSkillQuery = liveSkillTrigger?.query || '';
			const liveSkillItems = liveSkillTrigger
				? sortDropdownItems(skillCatalog.filter((skill) => skill.rawName.toLowerCase().includes(liveSkillQuery.toLowerCase()) || skill.desc.toLowerCase().includes(liveSkillQuery.toLowerCase())), liveSkillQuery)
				: [];
			const liveShowSkill = tab.providerId === 'codex'
				&& !!liveSkillTrigger
				&& skillDismissedInput !== liveValue;
			const liveMentionTrigger = getMentionTrigger(liveValue, liveCursor);
			const liveMentionQuery = liveMentionTrigger?.query || '';
			const liveMentionItems = liveMentionTrigger
				? buildMentionItems(liveMentionQuery, externalPaths, mcpServers, settings, tab.providerId)
				: [];
			const liveShowMention = !!liveMentionTrigger && mentionDismissedInput !== liveValue;

			if (liveShowPdfSnippets) {
				if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
					event.preventDefault();
					const direction = event.key === 'ArrowDown' ? 1 : -1;
					setPdfSnippetIndex((current) => {
						const max = Math.max(0, livePdfSnippetNodes.length - 1);
						return Math.max(0, Math.min(max, current + direction));
					});
					return;
				}
				if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && livePdfSnippetNodes.length > 0) {
					event.preventDefault();
					const node = livePdfSnippetNodes[pdfSnippetIndex] || livePdfSnippetNodes[0];
					const hasChildren = Array.isArray(node?.children) && node.children.length > 0;
					if (hasChildren) {
						setPdfTreeExpandedIds((current) => {
							const next = new Set(current);
							if (event.key === 'ArrowRight') next.add(node.key);
							else next.delete(node.key);
							return next;
						});
					}
					return;
				}
				if ((event.key === 'Enter' || event.key === 'Tab' || event.key === ' ') && livePdfSnippetNodes.length > 0 && !event.isComposing) {
					event.preventDefault();
					togglePdfTreeSelection(livePdfSnippetNodes[pdfSnippetIndex] || livePdfSnippetNodes[0], livePdfSnippetTrigger);
					return;
				}
				if (event.key === 'Escape' && !event.isComposing) {
					event.preventDefault();
					dismissPdfSnippetMenu();
					return;
				}
			}
			if (liveShowSkill) {
				if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
					event.preventDefault();
					const direction = event.key === 'ArrowDown' ? 1 : -1;
					setSkillIndex((current) => {
						const max = Math.max(0, liveSkillItems.length - 1);
						return Math.max(0, Math.min(max, current + direction));
					});
					return;
				}
				if ((event.key === 'Enter' || event.key === 'Tab') && liveSkillItems.length > 0 && !event.isComposing) {
					event.preventDefault();
					pickSkill(liveSkillItems[skillIndex] || liveSkillItems[0], liveSkillTrigger);
					return;
				}
				if (event.key === 'Escape' && !event.isComposing) {
					event.preventDefault();
					setSkillDismissedInput(liveValue);
					return;
				}
			}
			if (liveShowMention) {
				if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
					event.preventDefault();
					const direction = event.key === 'ArrowDown' ? 1 : -1;
					setMentionIndex((current) => {
						const max = Math.max(0, liveMentionItems.length - 1);
						return Math.max(0, Math.min(max, current + direction));
					});
					return;
				}
				if ((event.key === 'Enter' || event.key === 'Tab') && liveMentionItems.length > 0 && !event.isComposing) {
					event.preventDefault();
					pickMention(liveMentionItems[mentionIndex] || liveMentionItems[0], liveMentionTrigger);
					return;
				}
				if (event.key === 'Escape' && !event.isComposing) {
					event.preventDefault();
					setMentionDismissedInput(liveValue);
					return;
				}
			}
			if (liveShowSlash) {
				if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
					event.preventDefault();
					const direction = event.key === 'ArrowDown' ? 1 : -1;
					setSlashIndex((current) => {
						const max = Math.max(0, liveSlashItems.length - 1);
						return Math.max(0, Math.min(max, current + direction));
					});
					return;
				}
				if ((event.key === 'Enter' || event.key === 'Tab') && liveSlashItems.length > 0 && !event.isComposing) {
					event.preventDefault();
					pickSlash(liveSlashItems[slashIndex] || liveSlashItems[0], liveSlashTrigger);
					return;
				}
				if (event.key === 'Escape' && !event.isComposing) {
					event.preventDefault();
					setSlashDismissedInput(liveValue);
					return;
				}
			}
			const sendWithEnter = settings.requireCommandOrControlEnterToSend !== true
				|| event.metaKey
				|| event.ctrlKey;
			if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && sendWithEnter) {
				event.preventDefault();
				const submittedValue = selectedPdfSnippetKeys.size > 0
					? stripPdfSnippetTriggerToken(event.currentTarget.value)
					: event.currentTarget.value;
				setInput('', { commit: 'now' });
				onSend(submittedValue);
				return;
			}
			if (event.key === 'Escape' && tab.isStreaming) {
				event.preventDefault();
				onCancel();
				return;
			}
			if (event.key === 'Escape' && !event.isComposing) {
				event.preventDefault();
				event.currentTarget.blur();
				onFocusMessages?.();
			}
		}

		return h('div', { className: 'claudian-input-composer' },
			h('div', { className: 'claudian-input-container' },
				h(ResumeDropdown, {
					visible: resumeVisible,
					histories,
					activeHistoryId,
					onSelect: onResumeSelect,
					onDismiss: onDismissResume,
				}),
				h('div', { className: `claudian-input-queue-row ${tab.queuedText || tab.queuedImages?.length ? 'claudian-visible-flex' : 'claudian-hidden'}` },
					h('span', { className: 'claudian-queue-indicator-text' }, tab.queuedText || tab.queuedImages?.length ? `⌙ Queued: ${queuedPreview(tab.queuedDisplayText || tab.queuedText, tab.queuedImages)}` : ''),
					tab.queuedText || tab.queuedImages?.length ? h('span', { className: 'claudian-queue-indicator-actions' },
						tab.isStreaming && supportsTurnSteerForProvider(tab.providerId) ? h('button', {
							type: 'button',
							className: 'claudian-queue-indicator-action',
							onMouseDown: (event) => {
								event.preventDefault();
								onSteerQueued();
							},
						}, 'Steer Now') : null,
						h('button', {
							type: 'button',
							className: 'claudian-queue-indicator-icon-action',
							title: 'Edit queued message',
							'aria-label': 'Edit queued message',
							onMouseDown: (event) => {
								event.preventDefault();
								onEditQueued(tab.queuedDisplayText || tab.queuedText || '', tab.queuedImages || [], textareaRef.current?.value ?? input);
							},
						}, h(Icon, { name: 'pencil', size: 14 })),
						h('button', {
							type: 'button',
							className: 'claudian-queue-indicator-icon-action',
							title: 'Discard queued message',
							'aria-label': 'Discard queued message',
							onMouseDown: (event) => {
								event.preventDefault();
								onDiscardQueued();
							},
						}, h(Icon, { name: 'trash-2', size: 14 })),
					) : null,
				),
				h('div', { className: 'claudian-input-nav-row' }, navContent),
				h('div', {
					className: wrapperClass,
					onDragEnter: (event) => {
						if (Array.from(event.dataTransfer?.types || []).includes('Files')) {
							event.preventDefault();
							setDropVisible(true);
						}
					},
					onDragOver: (event) => {
						event.preventDefault();
						if (Array.from(event.dataTransfer?.types || []).includes('Files')) setDropVisible(true);
					},
					onDragLeave: (event) => {
						const rect = event.currentTarget.getBoundingClientRect();
						if (event.clientX <= rect.left || event.clientX >= rect.right || event.clientY <= rect.top || event.clientY >= rect.bottom) {
							setDropVisible(false);
						}
					},
					onDrop: (event) => {
						event.preventDefault();
						setDropVisible(false);
						void attachFiles(event.dataTransfer?.files, 'drop');
					},
				},
					h('div', { className: `claudian-drop-overlay ${dropVisible ? 'visible' : ''}` },
						h('div', { className: 'claudian-drop-content' },
							h(Icon, { name: 'upload', size: 32 }),
							h('span', null, 'Drop image here'),
						),
					),
					h(MentionDropdown, {
						visible: showMention,
						items: mentionItems,
						selectedIndex: mentionIndex,
						onHover: setMentionIndex,
						onPick: pickMention,
					}),
					h(PdfContextTreeDropdown, {
						visible: showPdfSnippets,
						nodes: pdfSnippetTreeNodes,
						expandedIds: visiblePdfTreeExpandedIds,
						selectedKeys: selectedPdfSnippetKeys,
						query: pdfSnippetQuery,
						selectedIndex: pdfSnippetIndex,
						typeFilter: pdfSnippetTypeFilter,
						typeFilters: PDF_TREE_TYPE_FILTERS,
						typeFilterCounts: pdfSnippetTypeFilterCounts,
						onHover: setPdfSnippetIndex,
						onToggleExpanded: togglePdfTreeExpanded,
						onToggleSelection: togglePdfTreeSelection,
						onDismiss: dismissPdfSnippetMenu,
						onRequestInputFocus: () => textareaRef.current?.focus(),
						onTypeFilterChange: (filterId) => {
							setPdfSnippetTypeFilter(normalizePdfTreeTypeFilter(filterId));
							setPdfSnippetIndex(0);
						},
						emptyLabel: pdfSnippetEmptyLabel,
					}),
					h(SlashDropdown, {
						visible: showSlash,
						variant: 'slash',
						query: slashQuery,
						selectedIndex: slashIndex,
						onHover: setSlashIndex,
						onPick: (command) => pickSlash(command || slashItems[0]),
						itemsOverride: slashItems,
						emptyLabel: slashEmptyLabel,
					}),
					h(SlashDropdown, {
						visible: showSkill,
						variant: 'skill',
						query: skillQuery,
						selectedIndex: skillIndex,
						onHover: setSkillIndex,
						onPick: (command) => pickSkill(command || skillItems[0]),
						itemsOverride: skillItems,
						emptyLabel: skillEmptyLabel,
					}),
					h('div', { className: `claudian-context-row ${contextHasContent ? 'has-content' : ''}` },
						h(ImagePreview, { images: visibleImageChips, settings, onRemove: removeVisibleImage, onOpen: setModalImage }),
						fileChips.length || agentChips.length || mcpMentions.length || selectedPdfSnippets.length || graphContextChips.length || hasPdfSelectionChip || visibleTurnContext.currentNotePath ? h('div', { className: 'claudian-file-indicator', style: { display: 'flex' } },
							visibleTurnContext.currentNotePath ? h('span', { key: 'linked-note', className: 'claudian-file-chip current-note', title: visibleTurnContext.currentNotePath },
								h('span', { className: 'claudian-file-chip-icon' }, h(Icon, { name: 'file', size: 12 })),
								h('span', { className: 'claudian-file-chip-name' }, pathBaseName(visibleTurnContext.currentNotePath)),
							) : null,
							graphContextChips.map((chip) => h('span', { key: chip.id || chip.label, className: 'claudian-file-chip graph-node', title: [chip.label, chip.detail, chip.path].filter(Boolean).join('\n') },
								h('span', { className: 'claudian-file-chip-icon' }, h(Icon, { name: 'map', size: 12 })),
								h('span', { className: 'claudian-file-chip-name' }, chip.label),
								h('span', {
									className: 'claudian-file-chip-remove',
									onMouseDown: (event) => {
										event.preventDefault();
										onDismissGraphSelection?.();
									},
								}, h(Icon, { name: 'x', size: 12 })),
							)),
							hasPdfSelectionChip && !hasPdfSelectionImages ? h('span', { key: 'pdf-selection', className: 'claudian-file-chip pdf-selection', title: pdfSelection?.filePath || pdfSelection?.displayLabel || 'PDF selection' },
								h('span', { className: 'claudian-file-chip-icon' }, h(Icon, { name: pdfSelectionIconName(pdfSelection), size: 12 })),
								h('span', { className: 'claudian-file-chip-name' }, pdfSelectionLabel(pdfSelection, settings.locale)),
								h('span', {
									className: 'claudian-file-chip-remove',
									onMouseDown: (event) => {
										event.preventDefault();
										onDismissPdfSelection?.();
									},
								}, h(Icon, { name: 'x', size: 12 })),
							) : null,
							collapsePdfSnippetChips ? h('span', { key: 'pdf-snippet-summary', className: 'claudian-file-chip pdf-snippet pdf-snippet-summary', title: pdfSnippetSummary.title },
								h('span', { className: 'claudian-file-chip-icon' }, h(Icon, { name: 'file-text', size: 12 })),
								h('span', { className: 'claudian-file-chip-name' }, pdfSnippetSummary.detail ? `${pdfSnippetSummary.label} · ${pdfSnippetSummary.detail}` : pdfSnippetSummary.label),
								h('span', {
									className: 'claudian-file-chip-remove',
									onMouseDown: (event) => {
										event.preventDefault();
										if (onClearPdfSnippets) onClearPdfSnippets();
										else removePdfSnippetList(selectedPdfSnippets);
									},
								}, h(Icon, { name: 'x', size: 12 })),
							) : selectedPdfSnippets.map(renderPdfSnippetChip),
							fileChips.map((chip) => renderChip(chip, chip.type === 'folder' ? 'folder' : 'file', () => onRemoveMentionFile(chip.path))),
							agentChips.map((chip) => renderChip(chip, 'box', () => onRemoveAgentMention(chip.id))),
							mcpMentions.map((chip) => renderChip(chip, 'terminal', () => onRemoveMcpMention(chip.name))),
						) : null,
						visibleTurnContext.editorSelection ? h('span', {
							className: 'claudian-selection-indicator',
							title: visibleTurnContext.editorSelection.notePath,
						}, editorSelectionLabel(visibleTurnContext.editorSelection)) : null,
						visibleTurnContext.browserSelection ? h('span', {
							className: 'claudian-browser-selection-indicator',
							title: [
								visibleTurnContext.browserSelection.source,
								visibleTurnContext.browserSelection.title,
								visibleTurnContext.browserSelection.url,
							].filter(Boolean).join('\n'),
						}, browserSelectionLabel(visibleTurnContext.browserSelection)) : null,
						visibleTurnContext.canvasSelection ? h('span', {
							className: 'claudian-canvas-indicator',
							title: visibleTurnContext.canvasSelection.canvasPath,
						}, canvasSelectionLabel(visibleTurnContext.canvasSelection)) : null,
						instructionMode ? h('span', { className: 'claudian-selection-indicator' }, t(settings, 'composer.instructionMode')) : null,
						bangBashMode ? h('span', { className: 'claudian-selection-indicator' }, t(settings, 'composer.bangBashMode')) : null,
					),
					h('textarea', {
						ref: textareaRef,
						className: 'claudian-input',
						rows: 3,
						dir: 'auto',
						defaultValue: input,
						placeholder: bangBashMode ? t(settings, 'composer.bangBashPlaceholder') : instructionMode ? t(settings, 'composer.instructionPlaceholder') : t(settings, 'composer.placeholder'),
						onChange: (event) => {
							if (instructionModeActiveRef.current && event.target.value === '') {
								setInstructionModeActiveNow(false);
							}
							if (resumeVisible && event.target.value) {
								onDismissResume?.();
							}
							setInput(event.target.value);
							updateCursorFromTextarea(event.target);
						},
						onClick: (event) => updateCursorFromTextarea(event.currentTarget),
						onBlur: (event) => commitInputNow(event.currentTarget.value),
						onKeyUp: (event) => updateCursorFromTextarea(event.currentTarget),
						onPaste: handlePaste,
						onKeyDown: handleKeyDown,
					}),
					h(InputToolbar, toolbarProps),
					h(ImageModal, { image: modalImage, onClose: () => setModalImage(null) }),
				),
			),
		);
	}

	function SettingItem({ name, desc, className, children }) {
		return h('div', { className: `setting-item ${className || ''}` },
			h('div', { className: 'setting-item-info' },
				h('div', { className: 'setting-item-name' }, name),
				desc ? h('div', { className: 'setting-item-description' }, desc) : null,
			),
			h('div', { className: 'setting-item-control' }, children),
		);
	}

	function EnvSnippetModal({ snippet, initialEnvText, customContextLimits, customModelAliases, onSave, onClose }) {
		const [name, setName] = useState(snippet?.name || '');
		const [description, setDescription] = useState(snippet?.description || '');
		const [envVars, setEnvVars] = useState(snippet?.envVars ?? initialEnvText ?? '');
		const [limitText, setLimitText] = useState(() => {
			const source = snippet?.contextLimits || customContextLimits || {};
			return Object.fromEntries(Object.entries(source).map(([model, value]) => [model, formatContextLimitText(value)]));
		});
		const [aliases, setAliases] = useState(() => ({ ...(customModelAliases || {}), ...(snippet?.modelAliases || {}) }));
		const [error, setError] = useState('');
		const modelIds = useMemo(() => detectEnvModelIds(envVars), [envVars]);
		const isEdit = !!snippet;

		function save() {
			const trimmedName = name.trim();
			if (!trimmedName) {
				setError('Name is required');
				return;
			}
			const contextLimits = {};
			for (const modelId of modelIds) {
				const parsed = parseContextLimitText(limitText[modelId]);
				if (parsed) contextLimits[modelId] = parsed;
			}
			const modelAliases = {};
			for (const modelId of modelIds) {
				const alias = String(aliases[modelId] || '').trim();
				if (alias) modelAliases[modelId] = alias;
			}
			onSave({
				id: snippet?.id || makeId('snippet'),
				name: trimmedName,
				description: description.trim(),
				envVars,
				scope: 'shared',
				contextLimits: Object.keys(contextLimits).length ? contextLimits : undefined,
				modelAliases: modelIds.length ? modelAliases : undefined,
			});
		}

		const handleFieldKeyDown = (event) => {
			if (event.key === 'Enter' && !event.isComposing) {
				event.preventDefault();
				save();
			}
			if (event.key === 'Escape' && !event.isComposing) {
				event.preventDefault();
				onClose();
			}
		};

		return h('div', { className: 'claudian-modal-overlay', onMouseDown: onClose },
			h('div', {
				className: 'claudian-modal-card claudian-env-snippet-modal',
				role: 'dialog',
				'aria-modal': 'true',
				onMouseDown: (event) => event.stopPropagation(),
			},
				h('div', { className: 'modal-content' },
					h('h2', null, isEdit ? 'Edit environment snippet' : 'Save environment snippet'),
					error ? h('div', { className: 'claudian-setting-validation claudian-setting-validation-error' }, error) : null,
					h(SettingItem, { name: 'Name', desc: 'A short name for this environment preset' },
						h('input', {
							className: 'claudian-env-snippet-name-input',
							value: name,
							placeholder: 'Relay endpoint',
							onChange: (event) => setName(event.target.value),
							onKeyDown: handleFieldKeyDown,
							autoFocus: true,
						}),
					),
					h(SettingItem, { name: 'Description', desc: 'Optional note shown in the snippet list' },
						h('input', {
							className: 'claudian-env-snippet-desc-input',
							value: description,
							placeholder: 'OpenAI-compatible relay settings',
							onChange: (event) => setDescription(event.target.value),
							onKeyDown: handleFieldKeyDown,
						}),
					),
					h(SettingItem, { name: 'Environment variables', desc: 'KEY=value lines inserted into the current environment block', className: 'claudian-env-snippet-setting' },
						h('div', { className: 'claudian-env-snippet-control' },
							h('textarea', {
								className: 'claudian-env-snippet-env-input',
								rows: 8,
								value: envVars,
								placeholder: 'OPENAI_BASE_URL=https://relay.example/v1\nOPENAI_MODEL=relay-model',
								onChange: (event) => setEnvVars(event.target.value),
								onKeyDown: (event) => {
									if (event.key === 'Escape' && !event.isComposing) {
										event.preventDefault();
										onClose();
									}
								},
							}),
						),
					),
					h('div', { className: `claudian-snippet-context-limits ${modelIds.length ? '' : 'claudian-hidden'}` },
						modelIds.length ? h(React.Fragment, null,
							h('div', { className: 'setting-item-name' }, 'Custom model overrides'),
							h('div', { className: 'setting-item-description' }, 'Set optional model labels and context windows for model IDs found in this snippet.'),
							modelIds.map((modelId) => h('div', { key: modelId, className: 'claudian-snippet-limit-row' },
								h('span', { className: 'claudian-snippet-limit-model' }, modelId),
								h('span', { className: 'claudian-snippet-limit-spacer' }),
								h('input', {
									className: 'claudian-snippet-alias-input',
									value: aliases[modelId] || '',
									placeholder: 'Alias',
									'aria-label': `Alias for ${modelId}`,
									onChange: (event) => setAliases((current) => ({ ...current, [modelId]: event.target.value })),
								}),
								h('input', {
									className: 'claudian-snippet-limit-input',
									value: limitText[modelId] || '',
									placeholder: '200k',
									'aria-label': `Context window for ${modelId}`,
									onChange: (event) => setLimitText((current) => ({ ...current, [modelId]: event.target.value })),
								}),
							)),
						) : null,
					),
					h('div', { className: 'claudian-snippet-buttons' },
						h('button', { type: 'button', className: 'claudian-cancel-btn', onClick: onClose }, 'Cancel'),
						h('button', { type: 'button', className: 'claudian-save-btn', onClick: save }, isEdit ? 'Update' : 'Save'),
					),
				),
			),
		);
	}

	function EnvSnippetSection({ draft, onPatch }) {
		const snippets = Array.isArray(draft.envSnippets) ? draft.envSnippets : [];
		const [modalState, setModalState] = useState(null);

		function saveSnippet(snippet) {
			const nextSnippets = modalState?.snippet
				? snippets.map((item) => item.id === modalState.snippet.id ? snippet : item)
				: [...snippets, snippet];
			onPatch({ envSnippets: nextSnippets });
			setModalState(null);
		}

		function insertSnippet(snippet) {
			const patch = {
				envText: String(snippet.envVars || '').trim(),
			};
			if (snippet.contextLimits) {
				patch.customContextLimits = { ...(draft.customContextLimits || {}), ...snippet.contextLimits };
			}
			if (snippet.modelAliases) {
				patch.customModelAliases = { ...(draft.customModelAliases || {}), ...snippet.modelAliases };
			}
			onPatch(patch);
		}

		function deleteSnippet(snippet) {
			if (!window.confirm(`Delete environment snippet "${snippet.name}"?`)) return;
			onPatch({ envSnippets: snippets.filter((item) => item.id !== snippet.id) });
		}

		return h('div', { className: 'claudian-env-snippets-container' },
			h('div', { className: 'claudian-snippet-header' },
				h('span', { className: 'claudian-snippet-label' }, 'Environment snippets'),
				h('button', {
					type: 'button',
					className: 'claudian-settings-action-btn',
					'aria-label': 'Add environment snippet',
					onClick: () => setModalState({ snippet: null }),
				}, h(Icon, { name: 'plus', size: 14 })),
			),
			snippets.length === 0 ? h('div', { className: 'claudian-snippet-empty' }, 'No environment snippets saved') :
				h('div', { className: 'claudian-snippet-list' },
					snippets.map((snippet) => h('div', { key: snippet.id, className: 'claudian-snippet-item' },
						h('div', { className: 'claudian-snippet-info' },
							h('div', { className: 'claudian-snippet-name' }, snippet.name),
							snippet.description ? h('div', { className: 'claudian-snippet-description' }, snippet.description) : null,
						),
						h('div', { className: 'claudian-snippet-actions' },
							h('button', {
								type: 'button',
								className: 'claudian-settings-action-btn',
								'aria-label': 'Insert',
								onClick: () => insertSnippet(snippet),
							}, h(Icon, { name: 'clipboard-paste', size: 14 })),
							h('button', {
								type: 'button',
								className: 'claudian-settings-action-btn',
								'aria-label': 'Edit',
								onClick: () => setModalState({ snippet }),
							}, h(Icon, { name: 'pencil', size: 14 })),
							h('button', {
								type: 'button',
								className: 'claudian-settings-action-btn claudian-settings-delete-btn',
								'aria-label': 'Delete',
								onClick: () => deleteSnippet(snippet),
							}, h(Icon, { name: 'trash-2', size: 14 })),
						),
					)),
				),
			modalState ? h(EnvSnippetModal, {
				snippet: modalState.snippet,
				initialEnvText: draft.envText,
				customContextLimits: draft.customContextLimits,
				customModelAliases: draft.customModelAliases,
				onSave: saveSnippet,
				onClose: () => setModalState(null),
			}) : null,
		);
	}

	function CustomContextLimitsSection({ draft, onPatch }) {
		const modelIds = useMemo(() => detectEnvModelIds(draft.envText), [draft.envText]);
		const modelKey = modelIds.join('\n');
		const [aliasDraft, setAliasDraft] = useState({});
		const [limitDraft, setLimitDraft] = useState({});
		const [errors, setErrors] = useState({});

		useEffect(() => {
			const aliases = draft.customModelAliases || {};
			const limits = draft.customContextLimits || {};
			setAliasDraft(Object.fromEntries(modelIds.map((modelId) => [modelId, aliases[modelId] || ''])));
			setLimitDraft(Object.fromEntries(modelIds.map((modelId) => [modelId, formatContextLimitText(limits[modelId])])));
			setErrors({});
		}, [modelKey, draft.customModelAliases, draft.customContextLimits]);

		if (modelIds.length === 0) {
			return h('div', { className: 'claudian-context-limits-container claudian-hidden' });
		}

		function saveAlias(modelId, rawValue) {
			const trimmed = String(rawValue ?? aliasDraft[modelId] ?? '').trim();
			const next = { ...(draft.customModelAliases || {}) };
			if (trimmed) next[modelId] = trimmed;
			else delete next[modelId];
			setAliasDraft((current) => ({ ...current, [modelId]: trimmed }));
			onPatch({ customModelAliases: next });
		}

		function updateContextLimit(modelId, value) {
			setLimitDraft((current) => ({ ...current, [modelId]: value }));
			const trimmed = String(value || '').trim();
			const nextLimits = { ...(draft.customContextLimits || {}) };
			if (!trimmed) {
				delete nextLimits[modelId];
				setErrors((current) => ({ ...current, [modelId]: '' }));
				onPatch({ customContextLimits: nextLimits });
				return;
			}
			const parsed = parseContextLimitText(trimmed);
			if (!parsed) {
				setErrors((current) => ({ ...current, [modelId]: 'Use values like 200k, 1m, or 180000' }));
				return;
			}
			nextLimits[modelId] = parsed;
			setErrors((current) => ({ ...current, [modelId]: '' }));
			onPatch({ customContextLimits: nextLimits });
		}

		return h('div', { className: 'claudian-context-limits-container' },
			h('div', { className: 'claudian-context-limits-header' },
				h('span', { className: 'claudian-context-limits-label' }, 'Custom model overrides'),
			),
			h('div', { className: 'claudian-context-limits-desc' }, 'Set optional labels and context windows for model IDs discovered in environment variables.'),
			h('div', { className: 'claudian-context-limits-list' },
				modelIds.map((modelId) => h('div', { key: modelId, className: 'claudian-context-limits-item' },
					h('div', { className: 'claudian-context-limits-model' }, modelId),
					h('div', { className: 'claudian-context-limits-input-wrapper' },
						h('input', {
							type: 'text',
							className: 'claudian-context-alias-input',
							value: aliasDraft[modelId] || '',
							placeholder: 'Alias',
							'aria-label': `Alias for ${modelId}`,
							title: 'Custom label shown in the model selector. Leave empty to use the default.',
							onChange: (event) => setAliasDraft((current) => ({ ...current, [modelId]: event.target.value })),
							onBlur: (event) => saveAlias(modelId, event.currentTarget.value),
							onKeyDown: (event) => {
								if (event.key === 'Enter') {
									event.preventDefault();
									event.currentTarget.blur();
								}
								else if (event.key === 'Escape') {
									event.preventDefault();
									setAliasDraft((current) => ({ ...current, [modelId]: draft.customModelAliases?.[modelId] || '' }));
									event.currentTarget.blur();
								}
							},
						}),
						h('input', {
							type: 'text',
							className: `claudian-context-limits-input ${errors[modelId] ? 'claudian-input-error' : ''}`,
							value: limitDraft[modelId] || '',
							placeholder: '200k',
							'aria-label': `Context window for ${modelId}`,
							onChange: (event) => updateContextLimit(modelId, event.target.value),
						}),
						h('div', { className: `claudian-context-limit-validation ${errors[modelId] ? '' : 'claudian-hidden'}` }, errors[modelId] || ''),
					),
				)),
			),
		);
	}

	function SlashCommandModal({ command, commands, onSave, onClose }) {
		const existingIsSkill = isSkillEntry(command);
		const [selectedType, setSelectedType] = useState(existingIsSkill ? 'skill' : 'command');
		const [name, setName] = useState(command?.name || '');
		const [description, setDescription] = useState(command?.description || '');
		const [argumentHint, setArgumentHint] = useState(command?.argumentHint || '');
		const [model, setModel] = useState(command?.model || '');
		const [allowedTools, setAllowedTools] = useState(Array.isArray(command?.allowedTools) ? command.allowedTools.join(', ') : '');
		const [disableModelInvocation, setDisableModelInvocation] = useState(command?.disableModelInvocation === true);
		const [disableUserInvocation, setDisableUserInvocation] = useState(command?.userInvocable === false);
		const [contextFork, setContextFork] = useState(command?.context === 'fork');
		const [agent, setAgent] = useState(command?.agent || '');
		const [content, setContent] = useState(() => parseSlashCommandContent(command?.content || '').promptContent);
		const [error, setError] = useState('');
		const isEdit = !!command;
		const titleType = selectedType === 'skill' ? 'Skill' : 'Slash Command';

		function save() {
			const normalizedName = normalizeCommandName(name);
			const nameError = validateCommandName(normalizedName);
			if (nameError) {
				setError(nameError);
				return;
			}
			if (!String(content || '').trim()) {
				setError('Prompt template is required');
				return;
			}
			const duplicate = normalizeClaudeCommands(commands).find((entry) => (
				entry.name.toLowerCase() === normalizedName.toLowerCase()
				&& entry.id !== command?.id
			));
			if (duplicate) {
				setError(`A command named "/${normalizedName}" already exists`);
				return;
			}
			const parsed = parseSlashCommandContent(content);
			const promptContent = parsed.promptContent;
			onSave({
				id: command?.id || (selectedType === 'skill' ? `skill-${normalizedName}` : makeId('cmd')),
				providerId: 'claude',
				kind: selectedType,
				name: normalizedName,
				description: description.trim() || parsed.description || undefined,
				argumentHint: normalizeArgumentHint(argumentHint.trim()) || parsed.argumentHint || undefined,
				allowedTools: parseCommaList(allowedTools) || parsed.allowedTools,
				model: model.trim() || parsed.model || undefined,
				content: promptContent,
				disableModelInvocation: disableModelInvocation || undefined,
				userInvocable: selectedType === 'skill' && disableUserInvocation ? false : undefined,
				context: contextFork ? 'fork' : undefined,
				agent: contextFork ? (agent.trim() || undefined) : undefined,
				scope: 'vault',
				source: command?.source || 'user',
				isEditable: true,
				isDeletable: true,
				displayPrefix: '/',
				insertPrefix: '/',
				persistenceKey: command?.persistenceKey,
				hooks: parsed.hooks ?? command?.hooks,
			});
		}

		function handleKeyDown(event) {
			if (event.key === 'Escape' && !event.isComposing) {
				event.preventDefault();
				onClose();
			}
		}

		return h('div', { className: 'claudian-modal-overlay', onMouseDown: onClose },
			h('div', {
				className: 'claudian-modal-card claudian-sp-modal claudian-slash-command-modal',
				role: 'dialog',
				'aria-modal': 'true',
				onMouseDown: (event) => event.stopPropagation(),
				onKeyDown: handleKeyDown,
			},
				h('div', { className: 'modal-content' },
					h('h2', { className: 'modal-title' }, isEdit ? `Edit ${titleType}` : `Add ${titleType}`),
					error ? h('div', { className: 'claudian-setting-validation claudian-setting-validation-error' }, error) : null,
					h(SettingItem, { name: 'Type', desc: 'Command or skill' },
						h('select', {
							value: selectedType,
							disabled: isEdit,
							onChange: (event) => {
								const value = event.target.value;
								setSelectedType(value);
								if (value !== 'skill') setDisableUserInvocation(false);
							},
						},
							h('option', { value: 'command' }, 'Command'),
							h('option', { value: 'skill' }, 'Skill'),
						),
					),
					h(SettingItem, { name: 'Command name', desc: 'The name used after / (e.g., "review" for /review)' },
						h('input', {
							className: 'claudian-slash-name-input',
							value: name,
							placeholder: 'review-code',
							onChange: (event) => setName(event.target.value),
							autoFocus: true,
						}),
					),
					h(SettingItem, { name: 'Description', desc: 'Optional description shown in dropdown' },
						h('input', {
							className: 'claudian-slash-desc-input',
							value: description,
							onChange: (event) => setDescription(event.target.value),
						}),
					),
					h('details', {
						className: 'claudian-sp-advanced-section',
						open: !!(argumentHint || model || allowedTools || disableModelInvocation || disableUserInvocation || contextFork || agent),
					},
						h('summary', { className: 'claudian-sp-advanced-summary' }, 'Advanced options'),
						h(SettingItem, { name: 'Argument hint', desc: 'Placeholder text for arguments (e.g., "[file] [focus]")' },
							h('input', {
								className: 'claudian-slash-hint-input',
								value: argumentHint,
								placeholder: '[file] [focus]',
								onChange: (event) => setArgumentHint(event.target.value),
							}),
						),
						h(SettingItem, { name: 'Model override', desc: 'Optional model to use for this command' },
							h('input', {
								className: 'claudian-slash-model-input',
								value: model,
								placeholder: 'claude-sonnet-5',
								onChange: (event) => setModel(event.target.value),
							}),
						),
						h(SettingItem, { name: 'Allowed tools', desc: 'Comma-separated list of tools to allow (empty = all)' },
							h('input', {
								className: 'claudian-slash-tools-input',
								value: allowedTools,
								placeholder: 'Read, Edit, Bash',
								onChange: (event) => setAllowedTools(event.target.value),
							}),
						),
						h(SettingItem, { name: 'Disable model invocation', desc: 'Prevent the model from invoking this command itself' },
							h('label', { className: 'claudian-toggle-row' },
								h('input', {
									type: 'checkbox',
									checked: disableModelInvocation,
									onChange: (event) => setDisableModelInvocation(event.target.checked),
								}),
								h('span', null, disableModelInvocation ? 'Disabled' : 'Allowed'),
							),
						),
						h(SettingItem, {
							name: 'Disable user invocation',
							desc: 'Prevent the user from invoking this skill directly',
							className: selectedType === 'skill' ? '' : 'claudian-hidden',
						},
							h('label', { className: 'claudian-toggle-row' },
								h('input', {
									type: 'checkbox',
									checked: disableUserInvocation,
									onChange: (event) => setDisableUserInvocation(event.target.checked),
								}),
								h('span', null, disableUserInvocation ? 'Hidden from / menu' : 'Shown in / menu'),
							),
						),
						h(SettingItem, { name: 'Context', desc: 'Run in a subagent (fork)' },
							h('label', { className: 'claudian-toggle-row' },
								h('input', {
									type: 'checkbox',
									checked: contextFork,
									onChange: (event) => setContextFork(event.target.checked),
								}),
								h('span', null, contextFork ? 'fork' : 'default'),
							),
						),
						h(SettingItem, {
							name: 'Agent',
							desc: 'Subagent type when context is fork',
							className: contextFork ? '' : 'claudian-hidden',
						},
							h('input', {
								className: 'claudian-slash-agent-input',
								value: agent,
								placeholder: 'code-reviewer',
								onChange: (event) => setAgent(event.target.value),
							}),
						),
					),
					h(SettingItem, { name: 'Prompt template', desc: 'Use $ARGUMENTS, $1, $2, @file, !`bash`' }),
					h('textarea', {
						className: 'claudian-sp-content-area claudian-slash-content-area',
						rows: 10,
						value: content,
						placeholder: 'Review this code for:\n$ARGUMENTS\n\n@$1',
						onChange: (event) => setContent(event.target.value),
					}),
					h('div', { className: 'claudian-sp-modal-buttons' },
						h('button', { type: 'button', className: 'claudian-cancel-btn', onClick: onClose }, 'Cancel'),
						h('button', { type: 'button', className: 'claudian-save-btn', onClick: save }, 'Save'),
					),
				),
			),
		);
	}

	function SlashCommandSettingsSection({ commands, onCommandsChange, onRefresh }) {
		const [modalCommand, setModalCommand] = useState(undefined);
		const [refreshing, setRefreshing] = useState(false);
		const items = useMemo(() => normalizeClaudeCommands(commands), [commands]);
		const visibleItems = useMemo(() => items.filter((item) => item.deleted !== true), [items]);

		function update(nextItems) {
			onCommandsChange(nextItems.map((entry) => ({ ...entry })));
		}

		function refreshCommands() {
			if (!onRefresh) return;
			setRefreshing(true);
			Promise.resolve(onRefresh()).finally(() => setRefreshing(false));
		}

		function saveCommand(entry) {
			const normalizedEntry = normalizeClaudeCommands([entry])[0];
			const exists = items.some((item) => item.id === normalizedEntry.id);
			const previous = exists ? items.find((item) => item.id === normalizedEntry.id) : null;
			const renamed = previous && previous.name !== normalizedEntry.name;
			if (renamed) {
				normalizedEntry.filePath = undefined;
				normalizedEntry.persistenceKey = `${isSkillEntry(normalizedEntry) ? 'claude-skill' : 'claude-command'}:${encodeURIComponent(normalizedEntry.name)}`;
			}
			const nextItems = exists
				? items.map((item) => item.id === normalizedEntry.id ? normalizedEntry : item)
				: [...items, normalizedEntry];
			update(renamed && previous
				? [...nextItems, { ...previous, deleted: true }]
				: nextItems);
			setModalCommand(undefined);
		}

		function deleteCommand(command) {
			const label = isSkillEntry(command) ? 'skill' : 'slash command';
			if (typeof window.confirm === 'function' && !window.confirm(`Delete ${label} "/${command.name}"?`)) return;
			update([
				...items.filter((item) => item.id !== command.id),
				{ ...command, deleted: true },
			]);
		}

		function transformToSkill(command) {
			const skillName = commandNameToClaudeSkillName(command.name);
			if (visibleItems.some((item) => isSkillEntry(item) && item.name === skillName)) {
				return;
			}
			const skill = normalizeClaudeCommands([{
				...command,
				id: `skill-${skillName}`,
				kind: 'skill',
				name: skillName,
				description: command.description || firstParagraph(command.content),
				source: 'user',
				scope: 'vault',
				filePath: undefined,
				persistenceKey: `claude-skill:${encodeURIComponent(skillName)}`,
			}])[0];
			update([...items.filter((item) => item.id !== command.id), { ...command, deleted: true }, skill]);
		}

		function renderCommandItem(command) {
			return h('div', { key: command.id, className: 'claudian-sp-item' },
				h('div', { className: 'claudian-sp-info' },
					h('div', { className: 'claudian-sp-item-header' },
						h('span', { className: 'claudian-sp-item-name' }, `/${command.name}`),
						isSkillEntry(command) ? h('span', { className: 'claudian-slash-item-badge' }, 'skill') : null,
						command.argumentHint ? h('span', { className: 'claudian-slash-item-hint' }, command.argumentHint) : null,
					),
					command.description ? h('div', { className: 'claudian-sp-item-desc' }, command.description) : null,
				),
				h('div', { className: 'claudian-sp-item-actions' },
					command.isEditable ? h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Edit',
						onClick: () => setModalCommand(command),
					}, h(Icon, { name: 'pencil', size: 14 })) : null,
					!isSkillEntry(command) && command.isEditable ? h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Convert to skill',
						onClick: () => transformToSkill(command),
					}, h(Icon, { name: 'box', size: 14 })) : null,
					command.isDeletable ? h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn claudian-settings-delete-btn',
						'aria-label': 'Delete',
						onClick: () => deleteCommand(command),
					}, h(Icon, { name: 'trash-2', size: 14 })) : null,
				),
			);
		}

		return h('div', { className: 'claudian-slash-settings-container' },
			h('div', { className: 'claudian-sp-header' },
				h('span', { className: 'claudian-sp-label' }, 'Slash Commands'),
				h('div', { className: 'claudian-sp-header-actions' },
					onRefresh ? h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Refresh slash commands',
						onClick: refreshCommands,
					}, h(Icon, { name: refreshing ? 'rotate-ccw' : 'refresh-cw', size: 14 })) : null,
					h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Add slash command',
						onClick: () => setModalCommand(null),
					}, h(Icon, { name: 'plus', size: 14 })),
				),
			),
			visibleItems.length === 0
				? h('div', { className: 'claudian-sp-empty-state' }, 'No commands or skills configured. Click + to create one.')
				: h('div', { className: 'claudian-sp-list' }, visibleItems.map(renderCommandItem)),
			modalCommand !== undefined ? h(SlashCommandModal, {
				command: modalCommand,
				commands: visibleItems,
				onSave: saveCommand,
				onClose: () => setModalCommand(undefined),
			}) : null,
		);
	}

	function AgentModal({ agent, agents, onSave, onClose }) {
		const [name, setName] = useState(agent?.name || '');
		const [description, setDescription] = useState(agent?.description || '');
		const [model, setModel] = useState(agent?.model || 'inherit');
		const [tools, setTools] = useState(Array.isArray(agent?.tools) ? agent.tools.join(', ') : '');
		const [disallowedTools, setDisallowedTools] = useState(Array.isArray(agent?.disallowedTools) ? agent.disallowedTools.join(', ') : '');
		const [skills, setSkills] = useState(Array.isArray(agent?.skills) ? agent.skills.join(', ') : '');
		const [prompt, setPrompt] = useState(agent?.prompt || '');
		const [error, setError] = useState('');
		const isEdit = !!agent;

		function save() {
			const trimmedName = name.trim();
			const nameError = validateAgentName(trimmedName);
			if (nameError) {
				setError(nameError);
				return;
			}
			if (!description.trim()) {
				setError('Description is required');
				return;
			}
			if (!prompt.trim()) {
				setError('Prompt is required');
				return;
			}
			const duplicate = normalizeClaudeAgents(agents).find((candidate) => (
				candidate.id.toLowerCase() === trimmedName.toLowerCase()
				&& candidate.id !== agent?.id
			));
			if (duplicate) {
				setError(`A subagent named "${trimmedName}" already exists`);
				return;
			}
			onSave({
				id: trimmedName,
				name: trimmedName,
				description: description.trim(),
				prompt,
				model: model || 'inherit',
				tools: parseCommaList(tools),
				disallowedTools: parseCommaList(disallowedTools),
				skills: parseCommaList(skills),
				source: 'vault',
				filePath: agent?.filePath,
				permissionMode: agent?.permissionMode,
				hooks: agent?.hooks,
				extraFrontmatter: agent?.extraFrontmatter,
			});
		}

		function handleKeyDown(event) {
			if (event.key === 'Escape' && !event.isComposing) {
				event.preventDefault();
				onClose();
			}
		}

		return h('div', { className: 'claudian-modal-overlay', onMouseDown: onClose },
			h('div', {
				className: 'claudian-modal-card claudian-sp-modal claudian-agent-modal',
				role: 'dialog',
				'aria-modal': 'true',
				onMouseDown: (event) => event.stopPropagation(),
				onKeyDown: handleKeyDown,
			},
				h('div', { className: 'modal-content' },
					h('h2', { className: 'modal-title' }, isEdit ? 'Edit subagent' : 'Add subagent'),
					error ? h('div', { className: 'claudian-setting-validation claudian-setting-validation-error' }, error) : null,
					h(SettingItem, { name: 'Name', desc: 'Used in @Agents/name mentions and subagent files' },
						h('input', {
							className: 'claudian-agent-name-input',
							value: name,
							placeholder: 'code-reviewer',
							onChange: (event) => setName(event.target.value),
							autoFocus: true,
						}),
					),
					h(SettingItem, { name: 'Description', desc: 'Shown in mention dropdowns and task delegation UI' },
						h('input', {
							className: 'claudian-agent-desc-input',
							value: description,
							placeholder: 'Reviews code changes for regressions',
							onChange: (event) => setDescription(event.target.value),
						}),
					),
					h('details', {
						className: 'claudian-sp-advanced-section',
						open: model !== 'inherit' || tools || disallowedTools || skills,
					},
						h('summary', { className: 'claudian-sp-advanced-summary' }, 'Advanced options'),
						h(SettingItem, { name: 'Model', desc: 'Model preference for this agent' },
							h('select', { value: model, onChange: (event) => setModel(event.target.value) },
								h('option', { value: 'inherit' }, 'Inherit'),
								h('option', { value: 'sonnet' }, 'Sonnet'),
								h('option', { value: 'opus' }, 'Opus'),
								h('option', { value: 'haiku' }, 'Haiku'),
							),
						),
						h(SettingItem, { name: 'Tools', desc: 'Comma-separated allowed tools' },
							h('input', {
								className: 'claudian-agent-tools-input',
								value: tools,
								placeholder: 'Read, Edit, Grep',
								onChange: (event) => setTools(event.target.value),
							}),
						),
						h(SettingItem, { name: 'Disallowed tools', desc: 'Comma-separated tools this agent must not use' },
							h('input', {
								className: 'claudian-agent-disallowed-tools-input',
								value: disallowedTools,
								placeholder: 'Bash',
								onChange: (event) => setDisallowedTools(event.target.value),
							}),
						),
						h(SettingItem, { name: 'Skills', desc: 'Comma-separated skills attached to this agent' },
							h('input', {
								className: 'claudian-agent-skills-input',
								value: skills,
								placeholder: 'review-code, note-polish',
								onChange: (event) => setSkills(event.target.value),
							}),
						),
					),
					h(SettingItem, { name: 'Prompt', desc: 'System prompt for this subagent' }),
					h('textarea', {
						className: 'claudian-sp-content-area claudian-agent-prompt-area',
						rows: 10,
						value: prompt,
						placeholder: 'You are a focused code review agent...',
						onChange: (event) => setPrompt(event.target.value),
					}),
					h('div', { className: 'claudian-sp-modal-buttons' },
						h('button', { type: 'button', className: 'claudian-cancel-btn', onClick: onClose }, 'Cancel'),
						h('button', { type: 'button', className: 'claudian-save-btn', onClick: save }, 'Save'),
					),
				),
			),
		);
	}

	function AgentSettingsSection({ agents, onAgentsChange, onRefresh }) {
		const [modalAgent, setModalAgent] = useState(undefined);
		const [refreshing, setRefreshing] = useState(false);
		const items = useMemo(() => normalizeClaudeAgents(agents), [agents]);
		const vaultAgents = items.filter((agent) => agent.source === 'vault');

		function update(nextItems) {
			onAgentsChange(nextItems.map((agent) => ({ ...agent })));
		}

		function refreshAgents() {
			if (onRefresh) {
				setRefreshing(true);
				Promise.resolve(onRefresh()).finally(() => setRefreshing(false));
				return;
			}
			setRefreshing(true);
			window.setTimeout(() => setRefreshing(false), 250);
		}

		function saveAgent(nextAgent) {
			const normalizedAgent = normalizeClaudeAgents([nextAgent])[0];
			const exists = items.some((item) => item.id === modalAgent?.id);
			update(exists
				? items.map((item) => item.id === modalAgent.id ? normalizedAgent : item)
				: [...items, normalizedAgent]);
			setModalAgent(undefined);
		}

		function deleteAgent(agent) {
			if (typeof window.confirm === 'function' && !window.confirm(`Delete subagent "${agent.name}"?`)) return;
			update(items.filter((item) => item.id !== agent.id));
		}

		function renderAgentItem(agent) {
			return h('div', { key: agent.id, className: 'claudian-sp-item' },
				h('div', { className: 'claudian-sp-info' },
					h('div', { className: 'claudian-sp-item-header' },
						h('span', { className: 'claudian-sp-item-name' }, agent.name),
					),
					agent.description ? h('div', { className: 'claudian-sp-item-desc' }, agent.description) : null,
				),
				h('div', { className: 'claudian-sp-item-actions' },
					h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Edit',
						onClick: () => setModalAgent(agent),
					}, h(Icon, { name: 'pencil', size: 14 })),
					h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn claudian-settings-delete-btn',
						'aria-label': 'Delete',
						onClick: () => deleteAgent(agent),
					}, h(Icon, { name: 'trash-2', size: 14 })),
				),
			);
		}

		return h('div', { className: 'claudian-agent-settings-container' },
			h('div', { className: 'claudian-sp-header' },
				h('span', { className: 'claudian-sp-label' }, 'Subagents'),
				h('div', { className: 'claudian-sp-header-actions' },
					h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Refresh subagents',
						onClick: refreshAgents,
					}, h(Icon, { name: refreshing ? 'rotate-ccw' : 'refresh-cw', size: 14 })),
					h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Add subagent',
						onClick: () => setModalAgent(null),
					}, h(Icon, { name: 'plus', size: 14 })),
				),
			),
			vaultAgents.length === 0
				? h('div', { className: 'claudian-sp-empty-state' }, 'No subagents configured. Click + to create one.')
				: h('div', { className: 'claudian-sp-list' }, vaultAgents.map(renderAgentItem)),
			modalAgent !== undefined ? h(AgentModal, {
				agent: modalAgent,
				agents: items,
				onSave: saveAgent,
				onClose: () => setModalAgent(undefined),
			}) : null,
		);
	}

	function CodexSkillModal({ skill, skills, onSave, onClose }) {
		const rootId = 'vault-codex';
		const [name, setName] = useState(skill?.name || '');
		const [description, setDescription] = useState(skill?.description || '');
		const [content, setContent] = useState(skill?.content || '');
		const [error, setError] = useState('');
		const isEdit = !!skill;

		function save() {
			const normalizedName = normalizeCommandName(name);
			const nameError = validateCommandName(normalizedName);
			if (nameError) {
				setError(nameError);
				return;
			}
			if (!content.trim()) {
				setError('Instructions are required');
				return;
			}
			const duplicate = normalizeCodexSkills(skills).find((entry) => (
				entry.name.toLowerCase() === normalizedName.toLowerCase()
				&& entry.id !== skill?.id
			));
			if (duplicate) {
				setError(`A Codex skill named "$${normalizedName}" already exists`);
				return;
			}
			onSave({
				id: skill?.id || `codex-skill-${normalizedName}`,
				providerId: 'codex',
				kind: 'skill',
				name: normalizedName,
				description: description.trim(),
				content,
				scope: 'vault',
				source: 'user',
				rootId,
				persistenceKey: createCodexSkillPersistenceKey(rootId, skill?.name || normalizedName),
				isEditable: true,
				isDeletable: true,
				displayPrefix: '$',
				insertPrefix: '$',
			});
		}

		function handleKeyDown(event) {
			if (event.key === 'Escape' && !event.isComposing) {
				event.preventDefault();
				onClose();
			}
		}

		return h('div', { className: 'claudian-modal-overlay', onMouseDown: onClose },
			h('div', {
				className: 'claudian-modal-card claudian-sp-modal claudian-codex-skill-modal',
				role: 'dialog',
				'aria-modal': 'true',
				onMouseDown: (event) => event.stopPropagation(),
				onKeyDown: handleKeyDown,
			},
					h('div', { className: 'modal-content' },
						h('h2', { className: 'modal-title' }, isEdit ? 'Edit Codex Skill' : 'Add Codex Skill'),
						error ? h('div', { className: 'claudian-setting-validation claudian-setting-validation-error' }, error) : null,
					h(SettingItem, { name: 'Directory', desc: 'Stored in project .codex/skills' },
						h('span', { className: 'claudian-slash-item-hint' }, '.codex/skills'),
					),
					h(SettingItem, { name: 'Skill name', desc: 'The name used after $ (e.g., "analyze" for $analyze)' },
						h('input', {
							className: 'claudian-codex-skill-name-input',
							value: name,
							placeholder: 'analyze-code',
							onChange: (event) => setName(event.target.value),
							autoFocus: true,
						}),
					),
					h(SettingItem, { name: 'Description', desc: 'Optional description shown in dropdown' },
						h('input', {
							className: 'claudian-codex-skill-desc-input',
							value: description,
							onChange: (event) => setDescription(event.target.value),
						}),
					),
					h(SettingItem, { name: 'Instructions', desc: 'The skill instructions (SKILL.md content)' }),
					h('textarea', {
						className: 'claudian-sp-content-area claudian-codex-skill-content-area',
						rows: 10,
						value: content,
						placeholder: 'Analyze the code for...',
						onChange: (event) => setContent(event.target.value),
					}),
					h('div', { className: 'claudian-sp-modal-buttons' },
						h('button', { type: 'button', className: 'claudian-cancel-btn', onClick: onClose }, 'Cancel'),
						h('button', { type: 'button', className: 'claudian-save-btn', onClick: save }, 'Save'),
					),
				),
			),
		);
	}

	function CodexSkillSettingsSection({ skills, onSkillsChange, onRefresh }) {
		const [modalSkill, setModalSkill] = useState(undefined);
		const [refreshing, setRefreshing] = useState(false);
		const items = useMemo(() => normalizeCodexSkills(skills), [skills]);
		const visibleItems = useMemo(() => items.filter((item) => item.deleted !== true), [items]);

		function update(nextItems) {
			onSkillsChange(nextItems.map((entry) => ({ ...entry })));
		}

		function refreshSkills() {
			if (onRefresh) {
				setRefreshing(true);
				Promise.resolve(onRefresh()).finally(() => setRefreshing(false));
				return;
			}
			setRefreshing(true);
			window.setTimeout(() => setRefreshing(false), 250);
		}

		function saveSkill(entry) {
			const normalizedEntry = normalizeCodexSkills([entry])[0];
			const exists = items.some((item) => item.id === normalizedEntry.id);
			update(exists
				? items.map((item) => item.id === normalizedEntry.id ? normalizedEntry : item)
				: [...items, normalizedEntry]);
			setModalSkill(undefined);
		}

		function deleteSkill(skill) {
			if (typeof window.confirm === 'function' && !window.confirm(`Delete Codex skill "$${skill.name}"?`)) return;
			update([
				...items.filter((item) => item.id !== skill.id),
				{ ...skill, deleted: true },
			]);
		}

		function renderSkillItem(skill) {
			const rootLabel = CODEX_SKILL_ROOT_OPTIONS.find((option) => option.id === skill.rootId)?.label || '.codex/skills';
			return h('div', { key: skill.id, className: 'claudian-sp-item' },
				h('div', { className: 'claudian-sp-info' },
					h('div', { className: 'claudian-sp-item-header' },
						h('span', { className: 'claudian-sp-item-name' }, `$${skill.name}`),
						h('span', { className: 'claudian-slash-item-badge' }, 'skill'),
						h('span', { className: 'claudian-slash-item-hint' }, rootLabel),
					),
					skill.description ? h('div', { className: 'claudian-sp-item-desc' }, skill.description) : null,
				),
				h('div', { className: 'claudian-sp-item-actions' },
					skill.isEditable ? h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Edit',
						onClick: () => setModalSkill(skill),
					}, h(Icon, { name: 'pencil', size: 14 })) : null,
					skill.isDeletable ? h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn claudian-settings-delete-btn',
						'aria-label': 'Delete',
						onClick: () => deleteSkill(skill),
					}, h(Icon, { name: 'trash-2', size: 14 })) : null,
				),
			);
		}

		return h('div', { className: 'claudian-codex-skill-settings-container' },
			h('div', { className: 'claudian-sp-header' },
				h('span', { className: 'claudian-sp-label' }, 'Codex Skills'),
				h('div', { className: 'claudian-sp-header-actions' },
					h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Refresh Codex skills',
						onClick: refreshSkills,
					}, h(Icon, { name: refreshing ? 'rotate-ccw' : 'refresh-cw', size: 14 })),
					h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Add Codex skill',
						onClick: () => setModalSkill(null),
					}, h(Icon, { name: 'plus', size: 14 })),
				),
			),
			visibleItems.length === 0
				? h('div', { className: 'claudian-sp-empty-state' }, 'No Codex skills in vault. Click + to create one.')
				: h('div', { className: 'claudian-sp-list' }, visibleItems.map(renderSkillItem)),
			modalSkill !== undefined ? h(CodexSkillModal, {
				skill: modalSkill,
				skills: visibleItems,
				onSave: saveSkill,
				onClose: () => setModalSkill(undefined),
			}) : null,
		);
	}

	function CodexSubagentModal({ agent, agents, onSave, onClose }) {
		const [name, setName] = useState(agent?.name || '');
		const [description, setDescription] = useState(agent?.description || '');
		const [model, setModel] = useState(agent?.model || '');
		const [reasoningEffort, setReasoningEffort] = useState(agent?.modelReasoningEffort || '');
		const [sandboxMode, setSandboxMode] = useState(agent?.sandboxMode || '');
		const [nicknames, setNicknames] = useState(Array.isArray(agent?.nicknameCandidates) ? agent.nicknameCandidates.join(', ') : '');
		const [developerInstructions, setDeveloperInstructions] = useState(agent?.developerInstructions || '');
		const [error, setError] = useState('');
		const isEdit = !!agent;

		function save() {
			const trimmedName = name.trim();
			const nameError = validateCodexSubagentName(trimmedName);
			if (nameError) {
				setError(nameError);
				return;
			}
			if (!description.trim()) {
				setError('Description is required');
				return;
			}
			if (!developerInstructions.trim()) {
				setError('Developer instructions are required');
				return;
			}
			const nicknameError = validateCodexNicknames(nicknames);
			if (nicknameError) {
				setError(nicknameError);
				return;
			}
			const duplicate = normalizeCodexSubagents(agents).find((candidate) => (
				candidate.name.toLowerCase() === trimmedName.toLowerCase()
				&& candidate.persistenceKey !== agent?.persistenceKey
			));
			if (duplicate) {
				setError(`A subagent named "${trimmedName}" already exists`);
				return;
			}
			onSave({
				name: trimmedName,
				description: description.trim(),
				developerInstructions,
				nicknameCandidates: parseCommaList(nicknames),
				model: model.trim(),
				modelReasoningEffort: reasoningEffort || undefined,
				sandboxMode: sandboxMode || undefined,
				persistenceKey: agent?.persistenceKey || `codex-subagent:${encodeURIComponent(trimmedName)}.toml`,
				extraFields: agent?.extraFields,
			});
		}

		function handleKeyDown(event) {
			if (event.key === 'Escape' && !event.isComposing) {
				event.preventDefault();
				onClose();
			}
		}

		return h('div', { className: 'claudian-modal-overlay', onMouseDown: onClose },
			h('div', {
				className: 'claudian-modal-card claudian-sp-modal claudian-codex-subagent-modal',
				role: 'dialog',
				'aria-modal': 'true',
				onMouseDown: (event) => event.stopPropagation(),
				onKeyDown: handleKeyDown,
			},
				h('div', { className: 'modal-content' },
					h('h2', { className: 'modal-title' }, isEdit ? 'Edit Codex Subagent' : 'Add Codex Subagent'),
					error ? h('div', { className: 'claudian-setting-validation claudian-setting-validation-error' }, error) : null,
					h(SettingItem, { name: 'Name', desc: 'Agent name Codex uses when spawning (lowercase, hyphens, underscores)' },
						h('input', {
							className: 'claudian-codex-subagent-name-input',
							value: name,
							placeholder: 'code_reviewer',
							onChange: (event) => setName(event.target.value),
							autoFocus: true,
						}),
					),
					h(SettingItem, { name: 'Description', desc: 'When Codex should use this agent' },
						h('input', {
							className: 'claudian-codex-subagent-desc-input',
							value: description,
							placeholder: 'Reviews code for correctness and security',
							onChange: (event) => setDescription(event.target.value),
						}),
					),
					h('details', {
						className: 'claudian-sp-advanced-section',
						open: !!(model || reasoningEffort || sandboxMode || nicknames),
					},
						h('summary', { className: 'claudian-sp-advanced-summary' }, 'Advanced options'),
						h(SettingItem, { name: 'Model', desc: 'Model override (leave empty to inherit)' },
							h('input', {
								className: 'claudian-codex-subagent-model-input',
								value: model,
								placeholder: 'gpt-5.5',
								onChange: (event) => setModel(event.target.value),
							}),
						),
						h(SettingItem, { name: 'Reasoning effort', desc: 'Model reasoning effort level' },
							h('select', {
								className: 'claudian-codex-subagent-effort-select',
								value: reasoningEffort,
								onChange: (event) => setReasoningEffort(event.target.value),
							},
								h('option', { value: '' }, 'Inherit'),
								h('option', { value: 'low' }, 'Low'),
								h('option', { value: 'medium' }, 'Medium'),
								h('option', { value: 'high' }, 'High'),
								h('option', { value: 'xhigh' }, 'Extra High'),
							),
						),
						h(SettingItem, { name: 'Sandbox mode', desc: 'Sandbox restriction for this agent' },
							h('select', {
								className: 'claudian-codex-subagent-sandbox-select',
								value: sandboxMode,
								onChange: (event) => setSandboxMode(event.target.value),
							},
								h('option', { value: '' }, 'Inherit'),
								h('option', { value: 'read-only' }, 'Read only'),
								h('option', { value: 'danger-full-access' }, 'Danger full access'),
								h('option', { value: 'workspace-write' }, 'Workspace write'),
							),
						),
						h(SettingItem, { name: 'Nickname candidates', desc: 'Comma-separated display nicknames (e.g., atlas, delta, echo)' },
							h('input', {
								className: 'claudian-codex-subagent-nicknames-input',
								value: nicknames,
								placeholder: 'atlas, delta, echo',
								onChange: (event) => setNicknames(event.target.value),
							}),
						),
					),
					h(SettingItem, { name: 'Developer instructions', desc: "Core instructions that define the agent's behavior" }),
					h('textarea', {
						className: 'claudian-sp-content-area claudian-codex-subagent-instructions-area',
						rows: 10,
						value: developerInstructions,
						placeholder: 'Review code like an owner.\nPrioritize correctness, security, and missing test coverage.',
						onChange: (event) => setDeveloperInstructions(event.target.value),
					}),
					h('div', { className: 'claudian-sp-modal-buttons' },
						h('button', { type: 'button', className: 'claudian-cancel-btn', onClick: onClose }, 'Cancel'),
						h('button', { type: 'button', className: 'claudian-save-btn', onClick: save }, 'Save'),
					),
				),
			),
		);
	}

	function CodexSubagentSettingsSection({ agents, onAgentsChange, onRefresh }) {
		const [modalAgent, setModalAgent] = useState(undefined);
		const [refreshing, setRefreshing] = useState(false);
		const items = useMemo(() => normalizeCodexSubagents(agents), [agents]);

		function update(nextItems) {
			onAgentsChange(nextItems.map((agent) => ({ ...agent })));
		}

		function refreshAgents() {
			if (onRefresh) {
				setRefreshing(true);
				Promise.resolve(onRefresh()).finally(() => setRefreshing(false));
				return;
			}
			setRefreshing(true);
			window.setTimeout(() => setRefreshing(false), 250);
		}

		function saveAgent(nextAgent) {
			const normalizedAgent = normalizeCodexSubagents([nextAgent])[0];
			const exists = items.some((item) => item.persistenceKey === modalAgent?.persistenceKey);
			update(exists
				? items.map((item) => item.persistenceKey === modalAgent.persistenceKey ? normalizedAgent : item)
				: [...items, normalizedAgent]);
			setModalAgent(undefined);
		}

		function deleteAgent(agent) {
			if (typeof window.confirm === 'function' && !window.confirm(`Delete subagent "${agent.name}"?`)) return;
			update(items.filter((item) => item.persistenceKey !== agent.persistenceKey));
		}

		function renderAgentItem(agent) {
			return h('div', { key: agent.persistenceKey || agent.name, className: 'claudian-sp-item' },
				h('div', { className: 'claudian-sp-info' },
					h('div', { className: 'claudian-sp-item-header' },
						h('span', { className: 'claudian-sp-item-name' }, agent.name),
						agent.model ? h('span', { className: 'claudian-slash-item-badge' }, agent.model) : null,
						agent.modelReasoningEffort ? h('span', { className: 'claudian-slash-item-hint' }, agent.modelReasoningEffort) : null,
					),
					agent.description ? h('div', { className: 'claudian-sp-item-desc' }, agent.description) : null,
				),
				h('div', { className: 'claudian-sp-item-actions' },
					h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Edit',
						onClick: () => setModalAgent(agent),
					}, h(Icon, { name: 'pencil', size: 14 })),
					h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn claudian-settings-delete-btn',
						'aria-label': 'Delete',
						onClick: () => deleteAgent(agent),
					}, h(Icon, { name: 'trash-2', size: 14 })),
				),
			);
		}

		return h('div', { className: 'claudian-codex-subagent-settings-container' },
			h('div', { className: 'claudian-sp-header' },
				h('span', { className: 'claudian-sp-label' }, 'Codex Subagents'),
				h('div', { className: 'claudian-sp-header-actions' },
					h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Refresh Codex subagents',
						onClick: refreshAgents,
					}, h(Icon, { name: refreshing ? 'rotate-ccw' : 'refresh-cw', size: 14 })),
					h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Add Codex subagent',
						onClick: () => setModalAgent(null),
					}, h(Icon, { name: 'plus', size: 14 })),
				),
			),
			items.length === 0
				? h('div', { className: 'claudian-sp-empty-state' }, 'No Codex subagents in vault. Click + to create one.')
				: h('div', { className: 'claudian-sp-list' }, items.map(renderAgentItem)),
			modalAgent !== undefined ? h(CodexSubagentModal, {
				agent: modalAgent,
				agents: items,
				onSave: saveAgent,
				onClose: () => setModalAgent(undefined),
			}) : null,
		);
	}

	function ClaudePluginsSection({ plugins, onPluginsChange, onRefresh }) {
		const normalizedPlugins = useMemo(() => normalizeClaudePlugins(plugins), [plugins]);
		const [refreshing, setRefreshing] = useState(false);
		const projectPlugins = normalizedPlugins.filter((plugin) => plugin.scope === 'project');
		const userPlugins = normalizedPlugins.filter((plugin) => plugin.scope === 'user');

		function updatePlugins(next) {
			onPluginsChange(next.map((plugin) => ({ ...plugin })));
		}

		function refreshPlugins() {
			setRefreshing(true);
			Promise.resolve(onRefresh ? onRefresh() : null).finally(() => {
				setRefreshing(false);
			});
		}

		function togglePlugin(pluginId) {
			updatePlugins(normalizedPlugins.map((plugin) => plugin.id === pluginId ? { ...plugin, enabled: !plugin.enabled } : plugin));
		}

		function renderPlugin(plugin) {
			const disabled = !plugin.enabled;
			const hasError = !!plugin.error;
			return h('div', {
				key: plugin.id,
				className: [
					'claudian-plugin-item',
					disabled ? 'claudian-plugin-item-disabled' : '',
					hasError ? 'claudian-plugin-item-error' : '',
				].filter(Boolean).join(' '),
			},
				h('div', { className: `claudian-plugin-status ${hasError ? 'claudian-plugin-status-error' : plugin.enabled ? 'claudian-plugin-status-enabled' : 'claudian-plugin-status-disabled'}` }),
				h('div', { className: 'claudian-plugin-info' },
					h('div', { className: 'claudian-plugin-name-row' },
						h('span', { className: 'claudian-plugin-name' }, plugin.name),
						plugin.version ? h('span', { className: 'claudian-plugin-version-badge' }, plugin.version) : null,
						hasError ? h('span', { className: 'claudian-plugin-error-badge' }, 'error') : null,
					),
					h('div', { className: `claudian-plugin-preview ${hasError ? 'claudian-plugin-preview-error' : ''}` },
						hasError ? plugin.error : (plugin.description || plugin.installPath || plugin.id),
					),
				),
				h('div', { className: 'claudian-plugin-actions' },
					h('button', {
						type: 'button',
						className: 'claudian-plugin-action-btn',
						'aria-label': plugin.enabled ? 'Disable' : 'Enable',
						onClick: () => togglePlugin(plugin.id),
					}, h(Icon, { name: plugin.enabled ? 'toggle-right' : 'toggle-left', size: 14 })),
				),
			);
		}

		function renderGroup(title, items) {
			if (items.length === 0) return null;
			return h(React.Fragment, { key: title },
				h('div', { className: 'claudian-plugin-section-header' }, title),
				items.map(renderPlugin),
			);
		}

		return h('div', { className: 'claudian-plugins-container' },
			h('div', { className: 'claudian-plugin-header' },
				h('span', { className: 'claudian-plugin-label' }, 'Claude Code Plugins'),
				h('button', {
					type: 'button',
					className: 'claudian-settings-action-btn',
					'aria-label': 'Refresh',
					onClick: refreshPlugins,
				}, h(Icon, { name: refreshing ? 'rotate-ccw' : 'refresh-cw', size: 14 })),
			),
			normalizedPlugins.length === 0 ? h('div', { className: 'claudian-plugin-empty' }, 'No Claude code plugins found. Enable plugins via the Claude CLI.') :
				h('div', { className: 'claudian-plugin-list' },
					renderGroup('Project plugins', projectPlugins),
					renderGroup('User plugins', userPlugins),
				),
		);
	}

	function McpServerModal({ existingServer, initialType, prefillServer, externalError, saving, onSave, onClose }) {
		const source = existingServer || prefillServer || null;
		const [name, setName] = useState(source?.name || '');
		const [serverType, setServerType] = useState(source ? getMcpServerType(source.config) : (initialType || 'stdio'));
		const [enabled, setEnabled] = useState(source?.enabled !== false);
		const [contextSaving, setContextSaving] = useState(source?.contextSaving !== false);
		const [command, setCommand] = useState(() => {
			const config = source?.config || {};
			const args = Array.isArray(config.args) ? config.args.join(' ') : '';
			return config.command ? `${config.command}${args ? ` ${args}` : ''}` : '';
		});
		const [env, setEnv] = useState(() => keyValueRecordToText(source?.config?.env));
		const [url, setUrl] = useState(() => source?.config?.url || '');
		const [headers, setHeaders] = useState(() => keyValueRecordToText(source?.config?.headers));
		const [error, setError] = useState('');
		const isEdit = !!existingServer;
		const visibleError = error || externalError || '';

		function save() {
			if (saving) return;
			const trimmedName = name.trim();
			if (!trimmedName) {
				setError('Please enter a server name');
				return;
			}
			if (!/^[a-zA-Z0-9._-]+$/.test(trimmedName)) {
				setError('Server name can only contain letters, numbers, dots, hyphens, and underscores');
				return;
			}
			let config = null;
			if (serverType === 'stdio') {
				const parsed = parseCommandLine(command);
				if (!parsed.command) {
					setError('Please enter a command');
					return;
				}
				config = { command: parsed.command };
				if (parsed.args.length) config.args = parsed.args;
				const envRecord = parseKeyValueLines(env);
				if (Object.keys(envRecord).length) config.env = envRecord;
			}
			else {
				const trimmedUrl = url.trim();
				if (!trimmedUrl) {
					setError('Please enter a URL');
					return;
				}
				config = { type: serverType, url: trimmedUrl };
				const headerRecord = parseKeyValueLines(headers);
				if (Object.keys(headerRecord).length) config.headers = headerRecord;
			}
			onSave(normalizeMcpServer({
				name: trimmedName,
				config,
				enabled,
				contextSaving,
				description: source?.description || '',
				disabledTools: source?.disabledTools || [],
			}), existingServer?.name || '');
		}

		return h('div', { className: 'claudian-modal-overlay', onMouseDown: onClose },
			h('div', {
				className: 'claudian-modal-card claudian-mcp-modal',
				role: 'dialog',
				'aria-modal': 'true',
				onMouseDown: (event) => event.stopPropagation(),
			},
				h('div', { className: 'modal-title' }, isEdit ? 'Edit MCP Server' : 'Add MCP Server'),
				visibleError ? h('div', { className: 'claudian-setting-validation claudian-setting-validation-error' }, visibleError) : null,
				h(SettingItem, { name: 'Server name', desc: 'Unique identifier for this server' },
					h('input', {
						className: 'claudian-mcp-name-input',
						value: name,
						placeholder: 'My-mcp-server',
						onChange: (event) => setName(event.target.value),
						onKeyDown: (event) => {
							if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
								event.preventDefault();
								save();
							}
							if (event.key === 'Escape' && !event.isComposing) {
								event.preventDefault();
								onClose();
							}
						},
					}),
				),
				h(SettingItem, { name: 'Type', desc: 'Server connection type' },
					h('select', { value: serverType, onChange: (event) => setServerType(event.target.value) },
						h('option', { value: 'stdio' }, 'Stdio (local command)'),
						h('option', { value: 'sse' }, 'Sse (server-sent events)'),
						h('option', { value: 'http' }, 'HTTP (HTTP endpoint)'),
					),
				),
				h('div', { className: 'claudian-mcp-type-fields' },
					serverType === 'stdio' ? [
						h(SettingItem, { key: 'cmd', name: 'Command', desc: 'Full command with arguments', className: 'claudian-mcp-cmd-setting' },
							h('textarea', {
								className: 'claudian-mcp-cmd-textarea',
								rows: 2,
								value: command,
								placeholder: 'docker exec -i mcp-server python -m src.server',
								onChange: (event) => setCommand(event.target.value),
							}),
						),
						h(SettingItem, { key: 'env', name: 'Environment variables', desc: 'Key=value per line (optional)', className: 'claudian-mcp-env-setting' },
							h('textarea', {
								className: 'claudian-mcp-env-textarea',
								rows: 2,
								value: env,
								placeholder: 'API_KEY=your-key',
								onChange: (event) => setEnv(event.target.value),
							}),
						),
					] : [
						h(SettingItem, { key: 'url', name: 'URL', desc: serverType === 'sse' ? 'SSE endpoint URL' : 'HTTP endpoint URL' },
							h('input', {
								value: url,
								placeholder: serverType === 'sse' ? 'http://localhost:3000/sse' : 'http://localhost:3000/mcp',
								onChange: (event) => setUrl(event.target.value),
							}),
						),
						h(SettingItem, { key: 'headers', name: 'Headers', desc: 'HTTP headers (key=value per line)', className: 'claudian-mcp-env-setting' },
							h('textarea', {
								className: 'claudian-mcp-env-textarea',
								rows: 3,
								value: headers,
								placeholder: 'Authorization=bearer token\ncontent-type=application/json',
								onChange: (event) => setHeaders(event.target.value),
							}),
						),
					],
				),
				h(SettingItem, { name: 'Enabled', desc: 'Whether this server is active' },
					h('label', { className: 'claudian-toggle-row' },
						h('input', { type: 'checkbox', checked: enabled, onChange: (event) => setEnabled(event.target.checked) }),
						h('span', null, enabled ? 'Enabled' : 'Disabled'),
					),
				),
				h(SettingItem, { name: 'Context-saving mode', desc: 'Hide tools from agent unless @-mentioned (saves context window)' },
					h('label', { className: 'claudian-toggle-row' },
						h('input', { type: 'checkbox', checked: contextSaving, onChange: (event) => setContextSaving(event.target.checked) }),
						h('span', null, contextSaving ? 'Mention with @ to enable' : 'Always available'),
					),
				),
				h('div', { className: 'claudian-mcp-buttons' },
					h('button', { type: 'button', className: 'claudian-cancel-btn', disabled: saving, onClick: onClose }, 'Cancel'),
					h('button', { type: 'button', className: 'claudian-save-btn mod-cta', disabled: saving, onClick: save }, isEdit ? 'Update' : 'Add'),
				),
			),
		);
	}

	function McpTestModal({ server, onClose, onUpdateServer }) {
		const normalized = normalizeMcpServer(server);
		const [loading, setLoading] = useState(true);
		const [testResult, setTestResult] = useState(null);
		const [disabledTools, setDisabledTools] = useState(new Set(normalized.disabledTools || []));
		const [toggleError, setToggleError] = useState('');
		const [pendingToggle, setPendingToggle] = useState('');
		const configKey = useMemo(() => JSON.stringify(normalized.config || {}), [normalized.config]);
		const disabledToolsKey = useMemo(() => (normalized.disabledTools || []).join('\u0000'), [normalized.disabledTools]);
		const fallbackTools = useMemo(() => buildMockMcpTools(normalized), [normalized.name, configKey]);
		const hasRuntimeTestApi = !!api?.testMcpServer;
		const tools = resolveMcpTestTools(testResult, fallbackTools, hasRuntimeTestApi);
		const success = !testResult || testResult.success !== false;

		useEffect(() => {
			let cancelled = false;
			setLoading(true);
			setTestResult(null);
			if (api?.testMcpServer) {
				api.testMcpServer({ server: normalized })
					.then((result) => {
						if (cancelled) return;
						setTestResult({
							success: result?.success === true || result?.ok === true,
							error: result?.error || '',
							serverName: result?.serverName || '',
							serverVersion: result?.serverVersion || '',
							tools: Array.isArray(result?.tools) ? result.tools : [],
							source: 'runtime',
						});
						setLoading(false);
					})
					.catch((error) => {
						if (cancelled) return;
						setTestResult({
							success: false,
							error: error instanceof Error ? error.message : String(error),
							tools: [],
						});
						setLoading(false);
					});
				return () => {
					cancelled = true;
				};
			}
			const timer = window.setTimeout(() => {
				if (cancelled) return;
				setTestResult({ success: true, tools: fallbackTools, source: 'mock' });
				setLoading(false);
			}, 420);
			return () => {
				cancelled = true;
				window.clearTimeout(timer);
			};
		}, [normalized.name, configKey, fallbackTools]);

		useEffect(() => {
			setDisabledTools(new Set(normalized.disabledTools || []));
		}, [normalized.name, disabledToolsKey]);

		async function persist(nextDisabled, toggleId) {
			if (pendingToggle) return false;
			const previous = new Set(disabledTools);
			const list = Array.from(nextDisabled);
			setDisabledTools(new Set(list));
			setToggleError('');
			setPendingToggle(toggleId || 'mcp');
			try {
				const saved = await onUpdateServer({ ...normalized, disabledTools: list });
				if (saved) {
					const savedServer = normalizeMcpServer(saved);
					setDisabledTools(new Set(savedServer.disabledTools || []));
				}
				return true;
			}
			catch (error) {
				setDisabledTools(previous);
				setToggleError(formatMcpSaveError(error));
				return false;
			}
			finally {
				setPendingToggle('');
			}
		}

		function toggleTool(toolName) {
			if (pendingToggle) return;
			const next = new Set(disabledTools);
			if (next.has(toolName)) next.delete(toolName);
			else next.add(toolName);
			void persist(next, toolName);
		}

		function toggleAll() {
			if (pendingToggle) return;
			const allEnabled = disabledTools.size === 0;
			void persist(new Set(allEnabled ? tools.map((tool) => tool.name) : []), '__all');
		}

		return h('div', { className: 'claudian-modal-overlay', onMouseDown: onClose },
			h('div', {
				className: 'claudian-modal-card claudian-mcp-test-modal',
				role: 'dialog',
				'aria-modal': 'true',
				onMouseDown: (event) => event.stopPropagation(),
			},
				h('div', { className: 'modal-title' }, `Verify: ${normalized.name}`),
				loading ? h('div', { className: 'claudian-mcp-test-loading' },
					h('div', { className: 'claudian-mcp-test-spinner' }, h(Icon, { name: 'settings' })),
					h('span', null, 'Connecting to MCP server...'),
				) : [
					h('div', { key: 'status', className: `claudian-mcp-test-status ${success ? '' : 'error'}` },
						h('span', { className: `claudian-mcp-test-icon ${success ? 'success' : 'error'}` }, h(Icon, { name: success ? 'check-circle' : 'alert-circle', size: 20 })),
						h('span', { className: 'claudian-mcp-test-text' }, success
							? `Connected successfully to ${testResult?.serverName || normalized.name}${testResult?.serverVersion ? ` ${testResult.serverVersion}` : ''}`
							: `Connection failed: ${testResult?.error || 'Unknown error'}`),
					),
					!success ? h('div', { key: 'error', className: 'claudian-mcp-test-error' }, testResult?.error || 'Unknown MCP error') : null,
					toggleError ? h('div', { key: 'toggle-error', className: 'claudian-mcp-test-error claudian-mcp-toggle-error' }, toggleError) : null,
					success ? h('div', { key: 'tools', className: 'claudian-mcp-test-tools' },
						h('div', { className: 'claudian-mcp-test-tools-header' }, `Available Tools (${tools.length})`),
						tools.length === 0 ? h('div', { className: 'claudian-mcp-test-no-tools' }, 'Connected, but no tools were reported.') : h('div', { className: 'claudian-mcp-test-tools-list' },
							tools.map((tool) => {
								const enabled = !disabledTools.has(tool.name);
								return h('div', { key: tool.name, className: `claudian-mcp-test-tool ${enabled ? '' : 'claudian-mcp-test-tool-disabled'}` },
									h('div', { className: 'claudian-mcp-test-tool-header' },
										h('span', { className: 'claudian-mcp-test-tool-icon' }, h(Icon, { name: 'wrench', size: 14 })),
										h('span', { className: 'claudian-mcp-test-tool-name' }, tool.name),
										h('div', { className: 'claudian-mcp-test-tool-toggle' },
											h('label', {
												className: `checkbox-container ${enabled ? 'is-enabled' : ''}`,
												onClick: (event) => event.stopPropagation(),
											},
												h('input', {
													type: 'checkbox',
													checked: enabled,
													disabled: !!pendingToggle,
													onChange: () => toggleTool(tool.name),
												}),
											),
										),
									),
									tool.description ? h('div', { className: 'claudian-mcp-test-tool-desc' }, tool.description) : null,
								);
							}),
						),
					) : null,
					h('div', { key: 'buttons', className: 'claudian-mcp-test-buttons' },
						success && tools.length ? h('button', {
							type: 'button',
							className: `claudian-mcp-toggle-all-btn ${disabledTools.size === 0 ? 'is-destructive' : ''}`,
							disabled: !!pendingToggle,
							onClick: toggleAll,
						}, disabledTools.size === 0 ? 'Disable all' : 'Enable All') : null,
						h('button', { type: 'button', className: 'mod-cta claudian-save-btn', onClick: onClose }, 'Close'),
					),
				],
			),
		);
	}

	function McpSettingsSection({ servers, workspace, onServersChange }) {
		const [addOpen, setAddOpen] = useState(false);
		const [modalState, setModalState] = useState(null);
		const [testServer, setTestServer] = useState(null);
		const [pendingAction, setPendingAction] = useState('');
		const [actionError, setActionError] = useState('');
		const normalizedServers = useMemo(() => (servers || []).map(normalizeMcpServer), [servers]);
		const isSaving = !!pendingAction;

		async function updateServers(nextServers, actionLabel = 'MCP servers') {
			const normalizedNext = nextServers.map(normalizeMcpServer);
			setPendingAction(actionLabel);
			setActionError('');
			try {
				const saved = await onServersChange(normalizedNext, { workspace });
				return Array.isArray(saved) ? saved.map(normalizeMcpServer) : normalizedNext;
			}
			catch (error) {
				const message = formatMcpSaveError(error);
				setActionError(message);
				throw new Error(message);
			}
			finally {
				setPendingAction('');
			}
		}

		async function saveServer(server, existingName) {
			const normalized = normalizeMcpServer(server);
			const conflict = normalizedServers.some((candidate) => candidate.name === normalized.name && candidate.name !== existingName);
			if (conflict) {
				setModalState({ ...(modalState || {}), error: `Server "${normalized.name}" already exists` });
				return;
			}
			try {
				if (existingName) {
					await updateServers(normalizedServers.map((candidate) => candidate.name === existingName ? normalized : candidate), `Updating ${normalized.name}`);
				}
				else {
					await updateServers([...normalizedServers, normalized], `Adding ${normalized.name}`);
				}
				setModalState(null);
			}
			catch (error) {
				setModalState({ ...(modalState || {}), error: formatMcpSaveError(error, 'Failed to save MCP server') });
			}
		}

		async function toggleServer(server) {
			try {
				await updateServers(
					normalizedServers.map((candidate) => candidate.name === server.name ? { ...candidate, enabled: !candidate.enabled } : candidate),
					`${server.enabled ? 'Disabling' : 'Enabling'} ${server.name}`,
				);
			}
			catch {
				// updateServers displays the error and the parent rolls back the list.
			}
		}

		async function updateServer(server) {
			const normalized = normalizeMcpServer(server);
			const saved = await updateServers(
				normalizedServers.map((candidate) => candidate.name === normalized.name ? normalized : candidate),
				`Updating ${normalized.name}`,
			);
			return saved.find((candidate) => candidate.name === normalized.name) || normalized;
		}

		async function deleteServer(server) {
			const confirmed = typeof window.confirm === 'function'
				? window.confirm(`Delete MCP server "${server.name}"?`)
				: true;
			if (!confirmed) return;
			try {
				await updateServers(normalizedServers.filter((candidate) => candidate.name !== server.name), `Deleting ${server.name}`);
			}
			catch {
				// updateServers displays the error and the parent rolls back the list.
			}
		}

		async function importFromClipboard() {
			let text = '';
			try {
				text = await navigator.clipboard.readText();
			}
			catch {
				setActionError('Failed to read clipboard');
				return;
			}
			const parsed = tryParseMcpClipboardConfig(text);
			if (!parsed || parsed.servers.length === 0) {
				setActionError('No valid mcp configuration found in clipboard');
				return;
			}
			if (parsed.needsName || parsed.servers.length === 1) {
				const server = parsed.servers[0];
				setActionError(parsed.needsName ? 'Enter a name for the server' : '');
				setModalState({
					initialType: getMcpServerType(server.config),
					prefillServer: {
						name: server.name || '',
						config: server.config,
						enabled: true,
						contextSaving: true,
						disabledTools: [],
					},
				});
				return;
			}
			const existing = new Set(normalizedServers.map((server) => server.name));
			const imported = [];
			for (const server of parsed.servers) {
				const name = String(server.name || '').trim();
				if (!name || !/^[a-zA-Z0-9._-]+$/.test(name) || existing.has(name)) {
					continue;
				}
				existing.add(name);
				imported.push(normalizeMcpServer({
					name,
					config: server.config,
					enabled: true,
					contextSaving: true,
				}));
			}
			if (!imported.length) {
				setActionError('No new mcp servers imported');
				return;
			}
			try {
				await updateServers([...normalizedServers, ...imported], 'Importing MCP servers');
			}
			catch {
				// updateServers displays the error and the parent rolls back the list.
			}
		}

		return h('div', { className: 'claudian-mcp-container' },
			h('div', { className: 'claudian-mcp-settings-desc' }, 'Manage MCP servers used by Claude provider contexts. Context-saving servers can be enabled with @mentions.'),
			h('div', { className: 'claudian-mcp-header' },
				h('span', { className: 'claudian-mcp-label' }, 'MCP Servers'),
				h('div', { className: 'claudian-mcp-add-container' },
					h('button', {
						type: 'button',
						className: 'claudian-settings-action-btn',
						'aria-label': 'Add',
						disabled: isSaving,
						onClick: (event) => {
							event.stopPropagation();
							setAddOpen((value) => !value);
						},
					}, h(Icon, { name: 'plus', size: 14 })),
					h('div', { className: `claudian-mcp-add-dropdown ${addOpen ? 'is-visible' : ''}` },
						h('div', {
							className: 'claudian-mcp-add-option',
							onClick: () => {
								setAddOpen(false);
								setModalState({ initialType: 'stdio' });
							},
						}, h('span', { className: 'claudian-mcp-add-option-icon' }, h(Icon, { name: 'terminal', size: 16 })), h('span', null, 'stdio (local command)')),
						h('div', {
							className: 'claudian-mcp-add-option',
							onClick: () => {
								setAddOpen(false);
								setModalState({ initialType: 'http' });
							},
						}, h('span', { className: 'claudian-mcp-add-option-icon' }, h(Icon, { name: 'globe', size: 16 })), h('span', null, 'http / sse (remote)')),
						h('div', {
							className: 'claudian-mcp-add-option',
							onClick: () => {
								setAddOpen(false);
								void importFromClipboard();
							},
						}, h('span', { className: 'claudian-mcp-add-option-icon' }, h(Icon, { name: 'clipboard-paste', size: 16 })), h('span', null, 'Import from clipboard')),
					),
				),
			),
			actionError ? h('div', { className: 'claudian-setting-validation claudian-setting-validation-error claudian-mcp-save-error' }, actionError) : null,
			normalizedServers.length === 0 ? h('div', { className: 'claudian-mcp-empty' }, 'No mcp servers configured. Click "add" to add one.') :
				h('div', { className: 'claudian-mcp-list' }, normalizedServers.map((server) => {
					const type = getMcpServerType(server.config);
					return h('div', { key: server.name, className: `claudian-mcp-item ${server.enabled ? '' : 'claudian-mcp-item-disabled'}` },
						h('div', { className: `claudian-mcp-status ${server.enabled ? 'claudian-mcp-status-enabled' : 'claudian-mcp-status-disabled'}` }),
						h('div', { className: 'claudian-mcp-info' },
							h('div', { className: 'claudian-mcp-name-row' },
								h('span', { className: 'claudian-mcp-name' }, server.name),
								h('span', { className: 'claudian-mcp-type-badge' }, type),
								server.contextSaving ? h('span', { className: 'claudian-mcp-context-saving-badge', title: `Context-saving: mention with @${server.name} to enable` }, '@') : null,
							),
							h('div', { className: 'claudian-mcp-preview' }, mcpPreview(server)),
						),
						h('div', { className: 'claudian-mcp-actions' },
							h('button', { type: 'button', className: 'claudian-mcp-action-btn', 'aria-label': 'Verify (show tools)', disabled: isSaving, onClick: () => setTestServer(server) }, h(Icon, { name: 'zap', size: 14 })),
							h('button', { type: 'button', className: 'claudian-mcp-action-btn', 'aria-label': server.enabled ? 'Disable' : 'Enable', disabled: isSaving, onClick: () => { void toggleServer(server); } }, h(Icon, { name: server.enabled ? 'toggle-right' : 'toggle-left', size: 14 })),
							h('button', { type: 'button', className: 'claudian-mcp-action-btn', 'aria-label': 'Edit', disabled: isSaving, onClick: () => setModalState({ existingServer: server }) }, h(Icon, { name: 'pencil', size: 14 })),
							h('button', { type: 'button', className: 'claudian-mcp-action-btn claudian-mcp-delete-btn', 'aria-label': 'Delete', disabled: pendingAction.startsWith('Deleting '), onClick: () => { void deleteServer(server); } }, h(Icon, { name: 'trash-2', size: 14 })),
						),
					);
				})),
			modalState ? h(McpServerModal, {
				existingServer: modalState.existingServer,
				initialType: modalState.initialType,
				prefillServer: modalState.prefillServer,
				externalError: modalState.error || '',
				saving: isSaving,
				onSave: saveServer,
				onClose: () => setModalState(null),
			}) : null,
			testServer ? h(McpTestModal, {
				server: testServer,
				onClose: () => setTestServer(null),
				onUpdateServer: async (server) => {
					const saved = await updateServer(server);
					setTestServer(saved);
					return saved;
				},
			}) : null,
		);
	}

	function combineEnvironmentText(...parts) {
		return parts
			.map((part) => String(part || '').trim())
			.filter(Boolean)
			.join('\n');
	}

	function getConfiguredMaxTabs(settings) {
		const value = Number(settings?.maxTabs);
		if (!Number.isFinite(value)) return 5;
		return Math.max(3, Math.min(10, Math.round(value)));
	}

	const DEFAULT_KEYBOARD_NAVIGATION = Object.freeze({
		scrollUpKey: 'k',
		scrollDownKey: 'j',
		focusInputKey: 'i',
	});

	function normalizeKeyboardNavigation(settings) {
		const source = settings && typeof settings === 'object' ? settings : {};
		return {
			scrollUpKey: String(source.scrollUpKey || DEFAULT_KEYBOARD_NAVIGATION.scrollUpKey).toLowerCase(),
			scrollDownKey: String(source.scrollDownKey || DEFAULT_KEYBOARD_NAVIGATION.scrollDownKey).toLowerCase(),
			focusInputKey: String(source.focusInputKey || DEFAULT_KEYBOARD_NAVIGATION.focusInputKey).toLowerCase(),
		};
	}

	function keyboardNavigationToText(settings) {
		const normalized = normalizeKeyboardNavigation(settings);
		return [
			`Map ${normalized.scrollUpKey} scrollup`,
			`Map ${normalized.scrollDownKey} scrolldown`,
			`Map ${normalized.focusInputKey} focusinput`,
		].join('\n');
	}

	function parseKeyboardNavigationText(text) {
		const result = { ...DEFAULT_KEYBOARD_NAVIGATION };
		for (const rawLine of String(text || '').split(/\r?\n/)) {
			const line = rawLine.trim();
			if (!line) continue;
			const match = line.match(/^map\s+(\S+)\s+(scrollup|scrolldown|focusinput)$/i);
			if (!match) return null;
			const key = match[1].toLowerCase();
			const action = match[2].toLowerCase();
			if (action === 'scrollup') result.scrollUpKey = key;
			if (action === 'scrolldown') result.scrollDownKey = key;
			if (action === 'focusinput') result.focusInputKey = key;
		}
		return result;
	}

	function runtimeEnvTextForSettings(settings) {
		return '';
	}

	function buildStandaloneSystemPrompt(settings) {
		const workspace = settings?.workspace || 'the configured workspace';
		const mediaFolder = String(settings?.mediaFolder || '').trim();
		const mediaPath = mediaFolder ? `./${mediaFolder}` : '.';
		const mediaExample = mediaFolder ? `${mediaFolder}/` : '';
		const sections = [];
		const userName = String(settings?.userName || '').trim();
		if (userName) {
			sections.push(`## User Context\n\nYou are collaborating with **${userName}**.`);
		}
		sections.push(`## Time Context

- **Current Date**: Use \`bash: date\` to get the current date and time. Never guess or assume.
- **Knowledge Status**: You possess extensive internal knowledge up to your training cutoff. Treat your internal weights as static and the current date as present.

## Identity & Role

You are an expert AI assistant specialized in Markdown workspace management, knowledge organization, and code analysis. You operate directly inside the user's workspace.

**Core Principles:**
1. **Workspace Native**: You understand Markdown, YAML frontmatter, wiki-links, and project code.
2. **Safety First**: You never overwrite data without understanding context. Use relative paths for workspace files.
3. **Proactive Thinking**: You plan and verify. You anticipate broken links, missing files, and regressions.
4. **Clarity**: Your changes are precise and minimize noise.

The current working directory is the workspace root.

The current workspace root is ${workspace}.

Workspace absolute path: ${workspace}

## Path Conventions

| Location | Access | Path Format | Example |
|----------|--------|-------------|---------|
| **Workspace** | Read/Write | Relative from workspace root | \`notes/example.md\`, \`.\` |
| **External contexts** | Full access | Absolute path | \`/Users/me/Project/file.ts\` |

**Workspace files**:
- Correct: \`notes/example.md\`, \`folder/file.md\`, \`.\`
- Wrong: \`/${workspace}/file.md\` or other made-up absolute workspace paths.

**External context paths**: When external directories are selected, use absolute paths to access files there. These directories are explicitly granted for the current session.

## User Message Format

User messages have the query first, followed by optional XML context tags:

\`\`\`xml
User's question or request here

<linked_note>
path/to/note.md
</linked_note>

<editor_selection path="path/to/note.md" lines="10-15">
selected text content
</editor_selection>

<browser_selection source="browser:https://example.com" title="Example" url="https://example.com">
selected browser content
</browser_selection>
\`\`\`

- The user's query/instruction always comes first in the message.
- \`<linked_note>\`: The note this session is linked to. Legacy messages may use \`<current_note>\` for the same context.
- \`<editor_selection>\`: Text currently selected in the editor, with file path and line numbers.
- \`<browser_selection>\`: Text selected in a browser/web view, including optional source/title/url metadata.
- \`@filename.md\`: Files mentioned with @ in the query. Read these files when referenced.

## Markdown Vault Context

- **Structure**: Files are Markdown (.md). Folders organize content.
- **Frontmatter**: YAML at the top of files. Respect existing fields.
- **Links**: Internal wiki-links look like \`[[note-name]]\` or \`[[folder/note-name]]\`.
- **Tags**: \`#tag-name\` for categorization.
- **Dataview**: You may encounter Dataview queries in fenced blocks. Do not break them unless asked.
- **Config folders**: Hidden config folders may contain app state. Touch them only when the user asks or the task clearly requires it.

**File References in Responses:**
When mentioning vault files in your responses, prefer wiki-link format when appropriate:
- Use: \`[[folder/note.md]]\` or \`[[note]]\`
- Avoid: plain paths when a wiki-link would be more useful.

## Selection Context

When an \`<editor_selection>\` or \`<editor_cursor>\` tag is present, use it to understand exactly what the user is referring to before editing or explaining.`);
		sections.push(`## Embedded Images in Notes

**Proactive image reading**: When reading a note with embedded images, read them alongside text for full context.

**Local images** (\`![[image.jpg]]\`):
- Located in media folder: \`${mediaPath}\`
- Read with paths like \`${mediaExample}image.jpg\`
- Formats: PNG, JPG/JPEG, GIF, WebP

**External images**:
- Download to the media folder when the user wants the image preserved in the vault.
- Replace external image links with Obsidian wiki-link embeds when appropriate.`);
		const excludedTags = normalizeExcludedTags(settings?.excludedTagsText);
		if (excludedTags.length) {
			sections.push(`## Excluded Tags\n\nDo not include files tagged with: ${excludedTags.map((tag) => `#${tag}`).join(', ')}.`);
		}
		if (String(settings?.systemPrompt || '').trim()) {
			sections.push(`## Custom Instructions\n\n${String(settings.systemPrompt).trim()}`);
		}
		return sections.filter(Boolean).join('\n\n');
	}

	function SettingsDrawer({ open, settings, runtimeStatus, runtimeLogPath, runtimeLogCopyStatus, runtimeDiagnostics, runtimeDiagnosticsStatus, onCopyRuntimeLogPath, onOpenRuntimeLogFolder, onRefreshRuntimeDiagnostics, environment, onEnvironmentAction, mcpServers, onMcpServersChange, onProviderAssetsDirty, onRefreshProviderAssets, onClose, onSave, onReset }) {
		const [draft, setDraft] = useState(settings);
		const [pythonPathDraft, setPythonPathDraft] = useState('');
		const draftRef = useRef(settings);
		const workspaceInputRef = useRef(null);
		const previousOpenRef = useRef(open);
		const [activeTab, setActiveTab] = useState('general');
		const tx = (key, fallback) => t(draft, key, fallback);
		const tabs = [
			{ id: 'general', label: tx('settings.tab.general') },
			{ id: 'claude', label: tx('settings.tab.claude') },
			{ id: 'codex', label: tx('settings.tab.codex') },
		];
		useLayoutEffect(() => {
			const wasOpen = previousOpenRef.current;
			const justOpened = open && !wasOpen;
			previousOpenRef.current = open;
			if (open && !justOpened) return;
			draftRef.current = settings;
			setDraft(settings);
		}, [settings, open]);
		const previousCliPathsRef = useRef({ codexPath: settings.codexPath, claudePath: settings.claudePath });
		useLayoutEffect(() => {
			const previous = previousCliPathsRef.current;
			previousCliPathsRef.current = { codexPath: settings.codexPath, claudePath: settings.claudePath };
			const patch = {};
			for (const key of ['codexPath', 'claudePath']) {
				if (settings[key] !== previous[key] && draftRef.current?.[key] === previous[key]) patch[key] = settings[key];
			}
			if (Object.keys(patch).length) {
				const next = { ...(draftRef.current || settings), ...patch };
				draftRef.current = next;
				setDraft(next);
			}
		}, [settings.codexPath, settings.claudePath]);
		const commitDraft = (next, options = {}) => {
			draftRef.current = next;
			if (options.save !== false && onSave) {
				onSave(next, { keepOpen: true });
			}
			return next;
		};
		const update = (key, value) => {
			const next = commitDraft({ ...(draftRef.current || draft), [key]: value });
			setDraft(next);
		};
		const updateMany = (patch) => {
			const next = commitDraft({ ...(draftRef.current || draft), ...patch });
			setDraft(next);
		};
		const updateProviderAssets = (key, value) => {
			if (onProviderAssetsDirty) onProviderAssetsDirty();
			update(key, value);
		};
		const environmentItems = Array.isArray(environment?.items) ? environment.items : [];
		const environmentJob = environment?.job && typeof environment.job === 'object' ? environment.job : null;
		const environmentJobRunning = environmentJob?.status === 'running';
		const environmentBusy = environment?.checking || environmentJobRunning;
		const environmentSourceLabels = {
			settings: '设置中的路径', saved: '应用保存的路径', PATH: '系统 PATH', launcher: 'Python 启动器',
			'virtual-env': '虚拟环境', conda: 'Conda', 'local-install': '本机安装目录',
			'program-files': 'Program Files', scoop: 'Scoop', pyenv: 'pyenv', uv: 'uv',
		};
		const renderEnvironmentItem = (item) => {
			const attempts = Array.isArray(item.attempts) ? item.attempts : [];
			const sourceLabel = environmentSourceLabels[item.source] || item.source || '';
			const canInstall = item.canInstall ?? environment?.supported;
			const canSavePythonPath = item.id === 'python' && item.ok && item.source !== 'saved'
				&& /[\\/]python\.exe$/iu.test(String(item.path || ''));
			return h('div', { key: item.id, className: `claudian-environment-item ${item.ok ? 'is-ready' : 'is-missing'}` },
				h('div', { className: 'claudian-environment-item-head' },
					h('div', { className: 'claudian-environment-item-title' },
						h('strong', null, item.name),
						h('span', null, item.ok ? item.version || '已识别' : '未识别'),
					),
					canInstall && (!item.ok || ['codex', 'claude'].includes(item.id)) ? h('button', { type: 'button', disabled: environmentBusy, onClick: () => onEnvironmentAction?.({ action: 'install', id: item.id }) }, environmentJobRunning && environmentJob.id === item.id ? '安装中…' : item.ok ? '下载并使用' : '下载并安装') : null,
					canSavePythonPath ? h('button', { type: 'button', disabled: environmentBusy, onClick: () => onEnvironmentAction?.({ action: 'use-path', id: 'python', path: item.path }) }, '设为应用 Python') : null,
				),
				item.ok ? h('div', { className: 'claudian-environment-item-meta' },
					sourceLabel ? h('span', null, `来源：${sourceLabel}`) : null,
					item.path ? h('code', { title: item.path }, item.path) : null,
					item.id === 'python' && !['PATH', 'saved', 'settings'].includes(item.source)
						? h('span', null, '已在本机安装目录找到可运行的 Python。') : null,
				) : h('div', { className: 'claudian-environment-item-error' }, item.error || '未找到可运行的命令'),
				attempts.length ? h('details', { className: 'claudian-environment-attempts' },
					h('summary', null, `检测记录（${attempts.length}）`),
					attempts.map((attempt, index) => h('div', { key: `${attempt.command || 'candidate'}-${index}`, className: `claudian-environment-attempt ${attempt.ok ? 'is-ready' : 'is-missing'}` },
						h('span', null, attempt.ok ? '通过' : '失败'),
						h('code', { title: attempt.command || '' }, attempt.command || ''),
						h('span', null, environmentSourceLabels[attempt.source] || attempt.source || ''),
						attempt.output ? h('small', null, attempt.output) : null,
					)),
				) : null,
			);
		};
		const environmentBlock = h('div', { className: 'claudian-environment-checker' },
			h('div', { className: 'claudian-diagnostics-health-head' },
				h('div', { className: 'claudian-diagnostics-label' }, `运行环境${environmentItems.length ? ` · 已识别 ${environmentItems.filter((item) => item.ok).length}/${environmentItems.length}` : ''}`),
				h('button', { type: 'button', className: 'claudian-diagnostics-refresh-btn', disabled: environmentBusy, onClick: () => onEnvironmentAction?.({ action: 'check' }) }, environment?.checking ? '检查中…' : '重新检查'),
			),
			h('div', { className: 'claudian-environment-region' },
				h('span', null, '下载线路'),
				h('select', { value: environment?.region || 'china', onChange: (event) => onEnvironmentAction?.({ action: 'region', region: event.target.value }) }, h('option', { value: 'china' }, '国内镜像'), h('option', { value: 'global' }, '国外官方')),
			),
			environment?.error ? h('div', { className: 'claudian-environment-error', role: 'alert' }, environment.error) : null,
			environmentJob ? h('div', { className: `claudian-environment-job is-${environmentJob.status || 'idle'}` }, environmentJob.status === 'running' ? `正在安装 ${environmentJob.id || ''}… ${Math.round(Number(environmentJob.percent) || 0)}%` : environmentJob.status === 'failed' ? `安装失败：${environmentJob.error || '未知错误'}` : environmentJob.status === 'completed' ? '安装完成' : '') : null,
			h('div', { className: 'claudian-environment-items' }, environmentItems.map(renderEnvironmentItem)),
			h('div', { className: 'claudian-environment-manual' },
				h('label', { htmlFor: 'claudian-environment-python-path' }, 'Python 安装在其他位置？输入 Python 可执行文件的完整路径：'),
				h('div', { className: 'claudian-environment-manual-row' },
					h('input', { id: 'claudian-environment-python-path', type: 'text', value: pythonPathDraft, placeholder: /Win/i.test(navigator.platform || '') ? 'C:\\...\\python.exe' : '/opt/homebrew/bin/python3', onChange: (event) => setPythonPathDraft(event.target.value) }),
					h('button', { type: 'button', disabled: environmentBusy || !pythonPathDraft.trim(), onClick: () => onEnvironmentAction?.({ action: 'use-path', id: 'python', path: pythonPathDraft }) }, '验证并使用'),
				),
			),
		);
		const renderDiagnosticRecord = (record, key) => {
			if (!record || typeof record !== 'object') return null;
			const title = [record.event, record.type, record.status].filter(Boolean).join(' / ') || 'record';
			const meta = [
				record.requestId ? `request ${record.requestId}` : '',
				record.threadId ? `thread ${record.threadId}` : '',
				record.turnId ? `turn ${record.turnId}` : '',
			].filter(Boolean).join(' · ');
			const detail = String(record.detail || '').trim();
			return h('div', { key, className: 'claudian-diagnostics-record' },
				h('div', { className: 'claudian-diagnostics-record-head' },
					h('span', { className: 'claudian-diagnostics-record-event' }, title),
					record.at ? h('span', { className: 'claudian-diagnostics-record-time' }, record.at) : null,
				),
				meta ? h('div', { className: 'claudian-diagnostics-record-meta' }, meta) : null,
				detail ? h('div', { className: 'claudian-diagnostics-record-detail' }, detail) : null,
			);
		};
		const renderDiagnosticRecords = (records, keyPrefix) => {
			const items = Array.isArray(records) ? records.filter(Boolean) : [];
			if (!items.length) return null;
			return h('div', { className: 'claudian-diagnostics-records' },
				items.slice(0, 5).map((record, index) => renderDiagnosticRecord(record, `${keyPrefix}-${index}`)),
			);
		};
		const renderDiagnosticsSummary = () => {
			const diagnostics = runtimeDiagnostics && typeof runtimeDiagnostics === 'object' ? runtimeDiagnostics : null;
			const issueCount = Array.isArray(diagnostics?.issues) ? diagnostics.issues.length : 0;
			const healthy = diagnostics?.healthy === true && issueCount === 0;
			const counts = [
				`Approvals ${Number(diagnostics?.pendingApprovalCount || 0)}`,
				`Open turns ${Number(diagnostics?.openTurnCount || 0)}`,
				`Empty ${Number(diagnostics?.emptyResponseCount || 0)}`,
				`Mojibake ${Number(diagnostics?.mojibakeCount || 0)}`,
				`Errors ${Number(diagnostics?.errorCount || 0)}`,
			];
			const markers = [
				{ label: 'Latest approval', record: diagnostics?.latestApproval },
				{ label: 'Latest status', record: diagnostics?.latestStatus },
				{ label: 'Latest done', record: diagnostics?.latestDone },
				{ label: 'Latest error', record: diagnostics?.latestError },
			].filter((item) => item.record);
			const recentImportant = Array.isArray(diagnostics?.recentImportant) ? diagnostics.recentImportant : [];
			return h('div', { className: `claudian-diagnostics-health ${healthy ? 'is-healthy' : issueCount > 0 ? 'has-issues' : ''}` },
				h('div', { className: 'claudian-diagnostics-health-head' },
					h('div', { className: 'claudian-diagnostics-label' }, 'Runtime health'),
					h('span', { className: 'claudian-diagnostics-health-state' }, diagnostics ? (healthy ? 'Healthy' : issueCount > 0 ? 'Needs attention' : 'No issues detected') : 'Not checked'),
					onRefreshRuntimeDiagnostics ? h('button', {
						type: 'button',
						className: 'claudian-diagnostics-refresh-btn',
						onClick: onRefreshRuntimeDiagnostics,
					}, runtimeDiagnosticsStatus || 'Refresh') : null,
				),
				diagnostics ? h('div', { className: 'claudian-diagnostics-counts' },
					counts.map((item) => h('span', { key: item, className: 'claudian-diagnostics-count' }, item)),
				) : h('div', { className: 'claudian-diagnostics-note' }, 'Open or refresh diagnostics after starting a provider run.'),
				issueCount > 0 ? h('div', { className: 'claudian-diagnostics-issues' },
					diagnostics.issues.slice(0, 4).map((issue, index) => h('div', { key: `${issue.kind || 'issue'}-${index}`, className: 'claudian-diagnostics-issue' },
						h('div', { className: 'claudian-diagnostics-issue-head' },
							h('span', { className: 'claudian-diagnostics-issue-kind' }, issue.kind || 'issue'),
							h('span', { className: 'claudian-diagnostics-issue-message' }, issue.message || ''),
						),
						renderDiagnosticRecords(issue.records, `issue-records-${index}`),
					)),
				) : null,
				diagnostics && (markers.length > 0 || recentImportant.length > 0) ? h('details', { className: 'claudian-diagnostics-details' },
					h('summary', null, 'Recent runtime events'),
					markers.length > 0 ? h('div', { className: 'claudian-diagnostics-markers' },
						markers.map((item) => h('div', { key: item.label, className: 'claudian-diagnostics-marker' },
							h('span', { className: 'claudian-diagnostics-marker-label' }, item.label),
							renderDiagnosticRecord(item.record, `${item.label}-record`),
						)),
					) : null,
					recentImportant.length > 0 ? h('div', { className: 'claudian-diagnostics-recent' },
						h('div', { className: 'claudian-diagnostics-recent-label' }, 'Recent important records'),
						renderDiagnosticRecords(recentImportant.slice(-8), 'recent-important'),
					) : null,
				) : null,
			);
		};
		const currentDraft = () => {
			const current = draftRef.current || draft;
			const workspace = workspaceInputRef.current?.value;
			return workspace === undefined || workspace === current.workspace
				? current
				: { ...current, workspace };
		};
		const refreshProviderAssetsIntoDraft = async (keys, options = {}) => {
			if (!onRefreshProviderAssets) return null;
			const draftBeforeRefresh = currentDraft();
			const requestedKeys = Array.isArray(keys) ? keys : [];
			logRendererEvent('settings.providerAssets.refresh.start', {
				workspace: draftBeforeRefresh.workspace || '',
				keys: requestedKeys,
				options,
			});
			const result = await onRefreshProviderAssets(draftBeforeRefresh.workspace, {
				forceEmpty: true,
				applyToGlobal: false,
				settings: draftBeforeRefresh,
				...options,
			});
			logRendererEvent('settings.providerAssets.refresh.result', {
				workspace: draftBeforeRefresh.workspace || '',
				ok: result?.ok === true,
				error: result?.error || '',
				keys: requestedKeys,
				summary: summarizeProviderAssetsForLog(result?.assets),
			});
			if (result?.ok && result.assets && providerAssetsHaveAny(result.assets)) {
				const selectedAssets = {};
				for (const key of requestedKeys) {
					selectedAssets[key] = result.assets[key];
				}
				const next = mergeProviderAssetsIntoSettings(
					draftRef.current || draft,
					Object.keys(selectedAssets).length ? selectedAssets : result.assets,
					{ forceEmpty: true },
				);
				commitDraft(next);
				setDraft(next);
				logRendererEvent('settings.providerAssets.refresh.merged', {
					keys: requestedKeys,
					summary: summarizeProviderAssetsForLog(next),
				});
			}
			return result;
		};
		const incompleteClass = (options) => options?.incomplete ? ' claudian-setting-incomplete' : '';
		const heading = (name, desc, options = {}) => h('div', {
			className: `setting-item setting-item-heading${incompleteClass(options)}`,
			title: options.incomplete ? 'Not fully implemented in the Electron sidebar yet' : undefined,
		},
			h('div', { className: 'setting-item-info' },
				h('div', { className: 'setting-item-name' }, name),
				desc ? h('div', { className: 'setting-item-description' }, desc) : null,
			),
		);
		const field = (name, control, options = {}) => h('label', {
			className: `claudian-settings-field${incompleteClass(options)}`,
			title: options.incomplete ? 'Not fully implemented in the Electron sidebar yet' : undefined,
		},
			h('span', null, name),
			control,
		);
		const toggleControl = (checked, onChange, enabledText, disabledText) => h('span', { className: 'claudian-toggle-row' },
			h('input', {
				type: 'checkbox',
				checked,
				onChange: (event) => onChange(event.target.checked),
			}),
			h('span', null, checked ? enabledText : disabledText),
		);
		const runtimeModelRefreshControl = (surface, count) => h('span', { className: 'claudian-settings-inline-actions' },
			h('button', {
				type: 'button',
				className: 'claudian-settings-refresh-btn',
				onClick: (event) => {
					event.preventDefault();
					const spec = getSettingsProviderAssetRefreshSpec(surface);
					return refreshProviderAssetsIntoDraft(spec.keys, spec.options);
				},
			},
				h(Icon, { name: 'refresh-cw', size: 14 }),
				h('span', null, tx('settings.refreshModels')),
			),
			h('span', { className: 'claudian-settings-inline-meta' }, `${Number(count) || 0} ${tx('settings.runtimeModelCount')}`),
		);
		const maxTabs = getConfiguredMaxTabs(draft);
		const sidebarFontSize = normalizeSidebarFontSize(draft.sidebarFontSize);
		const navMappingText = draft.navMappingsText ?? keyboardNavigationToText(draft.keyboardNavigation);
		const runtimeMode = draft.runtimeMode || 'codex';
		const isMockRuntime = runtimeMode === 'mock';
		const runtimeModeOptions = [
			isMockRuntime ? { value: 'mock', label: 'Mock UI test' } : null,
			{ value: 'claude', label: 'Claude CLI runtime' },
			{ value: 'codex', label: 'Codex IPC runtime' },
		].filter(Boolean);
		const generalTab = h(React.Fragment, null,
			h('div', { className: 'claudian-runtime-status-line' }, runtimeStatus?.detail || runtimeStatus?.status || tx('settings.runtimeIdle')),
			heading(tx('settings.setup'), tx('settings.setupDesc')),
			field(tx('settings.language'), h('select', { value: normalizeLocale(draft.locale), onChange: (event) => update('locale', event.target.value) },
				h('option', { value: 'en' }, 'English'),
				h('option', { value: 'zh-CN' }, '中文'),
			)),
			!hostTheme ? field(tx('settings.theme'), h('select', { value: normalizeTheme(draft.theme), onChange: (event) => update('theme', event.target.value) },
				h('option', { value: 'light' }, tx('settings.themeLight')),
				h('option', { value: 'dark' }, tx('settings.themeDark')),
			)) : null,
			field(tx('settings.runtimeMode'), h('select', { value: runtimeMode, onChange: (event) => update('runtimeMode', event.target.value) },
				runtimeModeOptions.map((option) => h('option', { key: option.value, value: option.value }, option.label)),
			)),
			field(tx('settings.workspace'), h('input', {
				ref: workspaceInputRef,
				value: draft.workspace || '',
				onChange: (event) => update('workspace', event.target.value),
				onInput: (event) => update('workspace', event.currentTarget.value),
			})),
			field(tx('settings.model'), h('input', { value: draft.model || '', onChange: (event) => update('model', event.target.value) })),
			field(tx('settings.permissionMode'), h('select', { value: draft.permissionMode, onChange: (event) => update('permissionMode', event.target.value) },
				h('option', { value: 'normal' }, 'normal'),
				h('option', { value: 'plan' }, 'plan'),
				h('option', { value: 'yolo' }, 'yolo'),
			)),
			heading(tx('settings.display'), tx('settings.displayDesc')),
			field(tx('settings.maximumTabs'), h('div', { className: 'claudian-settings-slider-row' },
				h('input', {
					type: 'range',
					min: 3,
					max: 10,
					step: 1,
					value: maxTabs,
					onChange: (event) => update('maxTabs', Number(event.target.value)),
				}),
				h('span', { className: 'claudian-settings-slider-value' }, String(maxTabs)),
			)),
			maxTabs > 5 ? h('div', { className: 'claudian-max-tabs-warning claudian-setting-validation claudian-setting-validation-warning' }, tx('settings.largeTabsWarning')) : null,
			field(tx('settings.chatViewPlacement'), h('select', { value: draft.chatViewPlacement || 'right-sidebar', onChange: (event) => update('chatViewPlacement', event.target.value) },
				h('option', { value: 'right-sidebar' }, tx('settings.rightSidebar')),
				h('option', { value: 'left-sidebar' }, tx('settings.leftSidebar')),
				h('option', { value: 'main-tab' }, tx('settings.mainTab')),
			), { incomplete: true }),
			field(tx('settings.autoScroll'), toggleControl(draft.enableAutoScroll !== false, (value) => update('enableAutoScroll', value), tx('settings.enabled'), tx('settings.disabled'))),
			field(tx('settings.deferMath'), toggleControl(draft.deferMathRenderingDuringStreaming !== false, (value) => update('deferMathRenderingDuringStreaming', value), tx('settings.enabled'), tx('settings.disabled'))),
			field(tx('settings.expandFileEdits'), toggleControl(draft.expandFileEditsByDefault === true, (value) => update('expandFileEditsByDefault', value), tx('settings.enabled'), tx('settings.disabled'))),
			heading(tx('settings.conversations'), tx('settings.conversationsDesc')),
			field(tx('settings.autoTitle'), toggleControl(draft.enableAutoTitleGeneration !== false, (value) => update('enableAutoTitleGeneration', value), tx('settings.enabled'), tx('settings.disabled'))),
			draft.enableAutoTitleGeneration === false ? null : field(tx('settings.titleModel'), h('select', { value: draft.titleGenerationModel || '', onChange: (event) => update('titleGenerationModel', event.target.value) },
				h('option', { value: '' }, tx('settings.auto')),
				getTitleModelOptions(draft).map((model) => h('option', { key: model.value, value: model.value }, `${model.group}: ${model.label}`)),
			)),
			heading(tx('settings.content'), tx('settings.contentDesc')),
			field(tx('settings.userName'), h('input', {
				value: draft.userName || '',
				placeholder: 'User',
				onChange: (event) => update('userName', event.target.value),
			})),
			field(tx('settings.sharedEnvironment'), h('textarea', {
				className: 'claudian-settings-env-textarea',
				'data-env-scope': 'shared',
				value: draft.envText || '',
				placeholder: 'PATH=C:\\Tools\\bin\nHTTPS_PROXY=http://proxy.example:8080',
				onChange: (event) => update('envText', event.target.value),
			})),
			h(CustomContextLimitsSection, { draft, onPatch: updateMany }),
			h(EnvSnippetSection, { draft, onPatch: updateMany }),
			field(tx('settings.systemPrompt'), h('textarea', {
				value: draft.systemPrompt || '',
				placeholder: 'Custom instructions appended by # mode',
				onChange: (event) => update('systemPrompt', event.target.value),
			})),
			field(tx('settings.excludedTags'), h('textarea', {
				value: draft.excludedTagsText || '',
				placeholder: 'System\nprivate\ndraft',
				onChange: (event) => update('excludedTagsText', event.target.value),
			})),
			field(tx('settings.mediaFolder'), h('input', {
				className: 'claudian-settings-media-input',
				value: draft.mediaFolder || '',
				placeholder: 'Attachments',
				onChange: (event) => update('mediaFolder', event.target.value),
			})),
			heading(tx('settings.input'), tx('settings.inputDesc')),
			field(tx('settings.sendShortcut'), toggleControl(draft.requireCommandOrControlEnterToSend === true, (value) => update('requireCommandOrControlEnterToSend', value), tx('settings.commandCtrlEnter'), tx('settings.enterToSend'))),
			field(tx('settings.navigationMappings'), h('textarea', {
				className: 'claudian-nav-mappings-textarea',
				value: navMappingText,
				placeholder: 'Map k scrollup\nMap j scrolldown\nMap i focusinput',
				onChange: (event) => {
					const value = event.target.value;
					const parsed = parseKeyboardNavigationText(value);
					updateMany(parsed ? { navMappingsText: value, keyboardNavigation: parsed } : { navMappingsText: value });
				},
				onBlur: () => {
					if (parseKeyboardNavigationText(navMappingText)) {
						update('navMappingsText', keyboardNavigationToText(parseKeyboardNavigationText(navMappingText)));
					}
				},
			})),
			heading(tx('settings.hotkeys'), tx('settings.hotkeysDesc'), { incomplete: true }),
			h('div', { className: 'claudian-hotkey-grid' },
				[tx('settings.inlineEdit'), tx('settings.openChat'), tx('settings.newSession'), tx('settings.newTab'), tx('settings.closeCurrentTab')].map((name) => h('div', { key: name, className: 'claudian-hotkey-item' },
					h('span', { className: 'claudian-hotkey-name' }, name),
					h('span', { className: 'claudian-hotkey-badge' }, isMockRuntime ? 'mock' : 'host'),
				)),
			),
			isMockRuntime ? h(React.Fragment, null,
				heading(tx('settings.mockRuntime'), tx('settings.mockRuntimeDesc')),
				field(tx('settings.mockTranscriptSpeed'), h('select', { value: draft.mockSpeed, onChange: (event) => update('mockSpeed', event.target.value) },
					h('option', { value: 'fast' }, 'fast'),
					h('option', { value: 'normal' }, 'normal'),
					h('option', { value: 'slow' }, 'slow'),
				)),
			) : null,
			heading(tx('settings.diagnostics'), tx('settings.diagnosticsDesc')),
			environmentBlock,
			h('div', { className: 'claudian-diagnostics-row' },
				h('div', { className: 'claudian-diagnostics-label' }, tx('settings.runtimeLog')),
				h('code', {
					className: 'claudian-diagnostics-path',
					title: runtimeLogPath || 'Runtime log path is not available yet',
				}, runtimeLogPath || 'Not available yet'),
				h('button', {
					type: 'button',
					className: 'claudian-diagnostics-copy-btn',
					disabled: !runtimeLogPath,
					onClick: onCopyRuntimeLogPath,
				}, runtimeLogCopyStatus || tx('settings.copyPath')),
				h('button', {
					type: 'button',
					className: 'claudian-diagnostics-open-btn',
					disabled: !runtimeLogPath || !onOpenRuntimeLogFolder,
					onClick: onOpenRuntimeLogFolder,
				}, tx('settings.openFolder')),
			),
			renderDiagnosticsSummary(),
		);

		const claudeTab = h(React.Fragment, null,
			heading(tx('settings.setup'), tx('settings.claudeSetupDesc')),
			field(tx('settings.claudeCliPath'), h('input', {
				className: 'claudian-settings-cli-path-input',
				value: draft.claudePath || '',
				placeholder: 'claude or full path to claude.cmd',
				onChange: (event) => update('claudePath', event.target.value),
			})),
			heading(tx('settings.safety'), tx('settings.claudeSafetyDesc')),
			field(tx('settings.claudeSafeMode'), h('select', { value: draft.claudeSafeMode || 'default', onChange: (event) => update('claudeSafeMode', event.target.value) },
				h('option', { value: 'acceptEdits' }, 'acceptEdits'),
				h('option', { value: 'auto' }, 'auto'),
				h('option', { value: 'default' }, 'default'),
			)),
			field(tx('settings.loadUserSettings'), toggleControl(draft.claudeLoadUserSettings !== false, (value) => update('claudeLoadUserSettings', value), tx('settings.enabled'), tx('settings.disabled'))),
			heading(tx('settings.models'), tx('settings.claudeModelsDesc')),
			field(tx('settings.enableOpus1m'), toggleControl(draft.claudeEnableOpus1M === true, (value) => update('claudeEnableOpus1M', value), tx('settings.enabled'), tx('settings.disabled'))),
			field(tx('settings.enableSonnet1m'), toggleControl(draft.claudeEnableSonnet1M === true, (value) => update('claudeEnableSonnet1M', value), tx('settings.enabled'), tx('settings.disabled'))),
			field(tx('settings.customModels'), h('textarea', {
				className: 'claudian-claude-custom-models-textarea',
				value: draft.claudeCustomModels || '',
				placeholder: 'claude-custom-model\nanthropic/experimental-model',
				onChange: (event) => update('claudeCustomModels', event.target.value),
			})),
			field(tx('settings.availableModels'), runtimeModelRefreshControl('claudeModels', draft.claudeRuntimeModels?.length)),
			heading(tx('settings.slashCommands'), tx('settings.slashCommandsDesc')),
			h(SlashCommandSettingsSection, {
				commands: draft.claudeCommands,
				onCommandsChange: (commands) => updateProviderAssets('claudeCommands', commands),
				onRefresh: () => {
					const spec = getSettingsProviderAssetRefreshSpec('claudeCommands');
					return refreshProviderAssetsIntoDraft(spec.keys, spec.options);
				},
			}),
			field(tx('settings.hiddenSlashCommands'), h('textarea', {
				className: 'claudian-hidden-claude-commands-textarea',
				value: draft.claudeHiddenCommands || '',
				placeholder: 'compact\nreview-code\nnote-polish',
				onChange: (event) => update('claudeHiddenCommands', event.target.value),
			})),
			heading(tx('settings.subagents'), tx('settings.claudeSubagentsDesc')),
			h(AgentSettingsSection, {
				agents: draft.claudeAgents,
				onAgentsChange: (agents) => updateProviderAssets('claudeAgents', agents),
				onRefresh: () => refreshProviderAssetsIntoDraft(['claudeAgents']),
			}),
			heading(tx('settings.mcpServers'), tx('settings.claudeMcpDesc')),
			h(McpSettingsSection, {
				servers: mcpServers,
				workspace: draft.workspace || settings.workspace || '',
				onServersChange: onMcpServersChange,
			}),
			heading(tx('settings.plugins'), tx('settings.pluginsDesc')),
			h('div', { className: 'claudian-plugin-settings-desc' },
				h('p', { className: 'setting-item-description' }, tx('settings.pluginsNote')),
			),
			h(ClaudePluginsSection, {
				plugins: draft.claudePlugins,
				onPluginsChange: (plugins) => updateProviderAssets('claudePlugins', plugins),
				onRefresh: () => refreshProviderAssetsIntoDraft(['claudePlugins']),
			}),
			heading(tx('settings.experimental'), tx('settings.experimentalDesc')),
			field(tx('settings.chromeIntegration'), toggleControl(draft.claudeEnableChrome === true, (value) => update('claudeEnableChrome', value), tx('settings.enabled'), tx('settings.disabled')), { incomplete: true }),
			field(tx('settings.bangBashMode'), toggleControl(draft.claudeEnableBangBash !== false, (value) => update('claudeEnableBangBash', value), tx('settings.enabled'), tx('settings.disabled'))),
		);

		const isWindowsHost = /Win/i.test(navigator.platform || '');
		const codexTab = h(React.Fragment, null,
			heading(tx('settings.setup'), tx('settings.codexSetupDesc')),
			field(tx('settings.enableCodexProvider'), h('span', { className: 'claudian-toggle-row' },
				h('input', {
					type: 'checkbox',
					checked: draft.codexEnabled !== false,
					onChange: (event) => update('codexEnabled', event.target.checked),
				}),
				h('span', null, draft.codexEnabled === false ? tx('settings.disabled') : tx('settings.enabled')),
			)),
			field(tx('settings.installationMethod'), h('select', { value: draft.codexInstallationMethod || 'native-windows', onChange: (event) => update('codexInstallationMethod', event.target.value) },
				h('option', { value: 'native-windows' }, isWindowsHost ? 'Native Windows' : '本机 CLI 直连'),
				isWindowsHost ? h('option', { value: 'wsl' }, 'WSL') : null,
			)),
			field(tx('settings.codexCliPath'), h('input', {
				className: 'claudian-settings-cli-path-input',
				value: draft.codexPath || '',
				placeholder: isWindowsHost ? (draft.codexInstallationMethod === 'wsl' ? 'codex' : 'codex or full path to codex.cmd') : '/Users/username/.local/bin/codex',
				onChange: (event) => update('codexPath', event.target.value),
			})),
			isWindowsHost ? field(tx('settings.codexDownloadSource'), h('select', {
				value: draft.codexDownloadSource || 'npm-mirror',
				onChange: (event) => update('codexDownloadSource', event.target.value),
			},
				h('option', { value: 'auto' }, tx('settings.codexDownloadSourceAuto')),
				h('option', { value: 'official' }, tx('settings.codexDownloadSourceOfficial')),
				h('option', { value: 'npm-mirror' }, tx('settings.codexDownloadSourceNpmMirror')),
				h('option', { value: 'custom' }, tx('settings.codexDownloadSourceCustom')),
			)) : null,
			isWindowsHost && draft.codexDownloadSource === 'custom' ? field(tx('settings.codexCustomDownloadUrl'), h('input', {
				className: 'claudian-settings-cli-path-input',
				value: draft.codexDownloadUrl || '',
				placeholder: 'https://example.com/codex.exe.zst',
				onChange: (event) => update('codexDownloadUrl', event.target.value),
			})) : null,
			draft.codexInstallationMethod === 'wsl' ? field(tx('settings.wslDistroOverride'), h('input', {
				value: draft.codexWslDistroOverride || '',
				placeholder: 'Ubuntu',
				onChange: (event) => update('codexWslDistroOverride', event.target.value),
			})) : null,
			field(tx('settings.openaiModelOverride'), h('input', {
				value: draft.openaiModel || '',
				placeholder: 'optional OPENAI_MODEL',
				onChange: (event) => update('openaiModel', event.target.value),
			})),
			heading(tx('settings.safety'), tx('settings.codexSafetyDesc')),
			field(tx('settings.codexSafeMode'), h('select', {
				value: draft.codexSafeMode || 'read-only',
				onChange: (event) => {
					const value = event.target.value;
					updateMany({ codexSafeMode: value, sandbox: value });
				},
			},
				h('option', { value: 'workspace-write' }, 'Workspace write'),
				h('option', { value: 'read-only' }, 'Read only'),
			)),
			field(tx('settings.sandbox'), h('select', { value: draft.sandbox || 'read-only', onChange: (event) => update('sandbox', event.target.value) },
				h('option', { value: 'workspace-write' }, 'workspace-write'),
				h('option', { value: 'read-only' }, 'read-only'),
				h('option', { value: 'danger-full-access' }, 'danger-full-access'),
			)),
			field(tx('settings.reasoningSummary'), h('select', { value: draft.reasoningSummary || 'detailed', onChange: (event) => update('reasoningSummary', event.target.value) },
				h('option', { value: 'auto' }, 'auto'),
				h('option', { value: 'concise' }, 'concise'),
				h('option', { value: 'detailed' }, 'detailed'),
				h('option', { value: 'none' }, 'none'),
			)),
			heading(tx('settings.models'), tx('settings.codexModelsDesc')),
			field(tx('settings.customModels'), h('textarea', {
				className: 'claudian-codex-custom-models-textarea',
				value: draft.codexCustomModels || '',
				placeholder: 'gpt-5.4-mini\ngpt-5.5',
				onChange: (event) => update('codexCustomModels', event.target.value),
			})),
			field(tx('settings.availableModels'), runtimeModelRefreshControl('codexModels', draft.codexRuntimeModels?.length)),
			heading(tx('settings.codexSkills'), tx('settings.codexSkillsDesc')),
			h(CodexSkillSettingsSection, {
				skills: draft.codexSkills,
				onSkillsChange: (skills) => updateProviderAssets('codexSkills', skills),
				onRefresh: () => {
					const spec = getSettingsProviderAssetRefreshSpec('codexSkills');
					return refreshProviderAssetsIntoDraft(spec.keys, spec.options);
				},
			}),
			field(tx('settings.hiddenSkills'), h('textarea', {
				className: 'claudian-hidden-codex-commands-textarea',
				value: draft.codexHiddenCommands || '',
				placeholder: 'analyze\nreview\nsummarize',
				onChange: (event) => update('codexHiddenCommands', event.target.value),
			})),
			heading(tx('settings.codexSubagents'), tx('settings.codexSubagentsDesc')),
			h(CodexSubagentSettingsSection, {
				agents: draft.codexSubagents,
				onAgentsChange: (agents) => updateProviderAssets('codexSubagents', agents),
				onRefresh: () => refreshProviderAssetsIntoDraft(['codexSubagents']),
			}),
			heading(tx('settings.mcpServers'), tx('settings.codexMcpDesc'), { incomplete: true }),
			h('div', { className: 'claudian-mcp-settings-desc' },
				h('p', { className: 'setting-item-description' },
					tx('settings.codexMcpNotePrefix'),
					h('code', null, 'codex mcp'),
					tx('settings.codexMcpNoteSuffix'),
				),
			),
		);

		const tabContent = {
			general: generalTab,
			claude: claudeTab,
			codex: codexTab,
		};

		return h('aside', { className: `claudian-settings-drawer claudian-settings ${open ? 'is-open' : ''}` },
			h('div', { className: 'claudian-settings-drawer-header' },
				h('h2', null, tx('settings.title')),
				h('button', { type: 'button', className: 'claudian-icon-button', onClick: onClose }, h(Icon, { name: 'x' })),
			),
			h('div', { className: 'claudian-settings-drawer-body' },
				h('div', { className: 'claudian-settings-tabs' },
					tabs.map((tab) => h('button', {
						key: tab.id,
						type: 'button',
						className: `claudian-settings-tab ${activeTab === tab.id ? 'claudian-settings-tab--active' : ''}`,
						onClick: () => setActiveTab(tab.id),
					}, tab.label)),
				),
				tabs.map((tab) => h('div', {
					key: tab.id,
					className: `claudian-settings-tab-content ${activeTab === tab.id ? 'claudian-settings-tab-content--active' : ''}`,
					'data-settings-tab': tab.id,
				}, tabContent[tab.id])),
				h('div', { className: 'claudian-settings-drawer-actions' },
					h('button', { type: 'button', onClick: onReset }, isMockRuntime ? tx('settings.resetMock') : tx('settings.resetLocal')),
				),
			),
		);
	}

	const STORAGE_KEY = 'claudian-sidebar-mock-state-v1';
	const MOCK_STATE_MAX_RAW_BYTES = 1024 * 1024;
	const MOCK_STATE_MAX_TABS = 8;
	const MOCK_STATE_MAX_HISTORIES = 20;
	const MOCK_STATE_MAX_MESSAGES = 80;
	const MOCK_STATE_MAX_ARRAY_ITEMS = 80;
	const MOCK_STATE_MAX_OBJECT_KEYS = 80;
	const MOCK_STATE_MAX_STRING_LENGTH = 12000;
	const MOCK_STATE_MAX_INPUT_LENGTH = 12000;
	const MOCK_STATE_MAX_DEPTH = 5;
	const NATIVE_ROUTE_SETTING_KEYS = new Set([
		'openaiApiKey',
		'openaiBaseUrl',
		'anthropicApiKey',
		'anthropicBaseUrl',
		'claudeConfigDir',
		'claudeEnvText',
		'codexEnvText',
	]);

	function defaultExternalPaths() {
		const workspace = getDefaultWorkspacePath();
		return workspace ? [{ path: workspace, persistent: true }] : [];
	}

	function sidebarSourceMockPath(settings) {
		const workspace = settings?.workspace || getDefaultWorkspacePath();
		return workspace ? joinDisplayPath(workspace, 'electron\\claudian-sidebar-react.js') : 'electron\\claudian-sidebar-react.js';
	}

	function truncatePersistedText(value, maxLength = MOCK_STATE_MAX_STRING_LENGTH) {
		const text = String(value || '');
		return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 3))}...` : text;
	}

	function cloneForMockPersistence(value, depth = 0) {
		if (value === null || value === undefined) return value;
		if (typeof value === 'string') return truncatePersistedText(value);
		if (typeof value === 'number' || typeof value === 'boolean') return value;
		if (typeof value !== 'object') return undefined;
		if (depth >= MOCK_STATE_MAX_DEPTH) return undefined;
		if (Array.isArray(value)) {
			return value
				.slice(0, MOCK_STATE_MAX_ARRAY_ITEMS)
				.map((item) => cloneForMockPersistence(item, depth + 1))
				.filter((item) => item !== undefined);
		}
		const output = {};
		for (const [key, item] of Object.entries(value).slice(0, MOCK_STATE_MAX_OBJECT_KEYS)) {
			const cloned = cloneForMockPersistence(item, depth + 1);
			if (cloned !== undefined) output[key] = cloned;
		}
		return output;
	}

	function sanitizePersistedSettings(settings) {
		const cloned = cloneForMockPersistence(settings || {});
		const output = cloned && typeof cloned === 'object' && !Array.isArray(cloned) ? cloned : {};
		for (const key of NATIVE_ROUTE_SETTING_KEYS) {
			delete output[key];
		}
		return output;
	}

	function compactPersistedMessages(messages) {
		return (Array.isArray(messages) ? messages : [])
			.slice(-MOCK_STATE_MAX_MESSAGES)
			.map((message) => cloneForMockPersistence(message))
			.filter((message) => message && typeof message === 'object');
	}

	function compactPersistedTab(tab, index) {
		const cloned = cloneForMockPersistence(tab || {});
		const output = cloned && typeof cloned === 'object' && !Array.isArray(cloned) ? cloned : {};
		output.index = index + 1;
		output.isStreaming = false;
		output.messages = compactPersistedMessages(tab?.messages);
		output.queuedText = tab?.isStreaming ? '' : truncatePersistedText(tab?.queuedText || '', MOCK_STATE_MAX_INPUT_LENGTH);
		output.queuedDisplayText = tab?.isStreaming ? '' : truncatePersistedText(tab?.queuedDisplayText || '', MOCK_STATE_MAX_INPUT_LENGTH);
		output.queuedContextChips = tab?.isStreaming ? [] : cloneForMockPersistence(tab?.queuedContextChips || []);
		output.queuedImages = [];
		output.queuedContext = tab?.isStreaming ? null : cloneForMockPersistence(tab?.queuedContext || null);
		output.imageChips = [];
		output.bashOutputs = Array.isArray(tab?.bashOutputs)
			? cloneForMockPersistence(tab.bashOutputs.slice(-MAX_STATUS_PANEL_BASH_OUTPUTS))
			: [];
		return output;
	}

	function compactPersistedHistory(entry) {
		const cloned = cloneForMockPersistence(entry || {});
		const output = cloned && typeof cloned === 'object' && !Array.isArray(cloned) ? cloned : {};
		output.messages = compactPersistedMessages(entry?.messages);
		return output;
	}

	function compactInputByTab(inputByTab, tabs) {
		if (!inputByTab || typeof inputByTab !== 'object') return {};
		const activeIds = new Set((tabs || []).map((tab) => tab?.id).filter(Boolean));
		const output = {};
		for (const [tabId, value] of Object.entries(inputByTab).slice(0, MOCK_STATE_MAX_TABS)) {
			if (activeIds.size && !activeIds.has(tabId)) continue;
			output[tabId] = truncatePersistedText(value, MOCK_STATE_MAX_INPUT_LENGTH);
		}
		return output;
	}

	function stripTransientPdfSnippetTrigger(value) {
		const text = String(value ?? '');
		const match = text.match(/(^|\s)![^\s]*$/u);
		if (!match) return text;
		return text.slice(0, match.index).replace(/[ \t]+$/u, '');
	}

	function sanitizePersistedInputByTab(inputByTab) {
		if (!inputByTab || typeof inputByTab !== 'object') return {};
		return Object.fromEntries(Object.entries(inputByTab).map(([tabId, value]) => [
			tabId,
			stripTransientPdfSnippetTrigger(value),
		]));
	}

	function buildPersistedMockState({ settings, tabs, activeTabId, inputByTab, histories, externalPaths, mcpServers }) {
		const serializableTabs = (Array.isArray(tabs) ? tabs : [])
			.slice(0, MOCK_STATE_MAX_TABS)
			.map((tab, index) => compactPersistedTab(tab, index));
		const active = serializableTabs.some((tab) => tab.id === activeTabId)
			? activeTabId
			: serializableTabs[0]?.id || null;
		return {
			settings: sanitizePersistedSettings(settings),
			tabs: serializableTabs,
			activeTabId: active,
			inputByTab: compactInputByTab(inputByTab, serializableTabs),
			histories: (Array.isArray(histories) ? histories : [])
				.slice(0, MOCK_STATE_MAX_HISTORIES)
				.map(compactPersistedHistory),
			externalPaths: cloneForMockPersistence(externalPaths || []),
			mcpServers: cloneForMockPersistence(mcpServers || []),
		};
	}

	const DEFAULT_SETTINGS = {
		runtimeMode: 'codex',
		provider: 'codex',
		model: 'gpt-5.5',
		modelSelectionSource: 'native',
		effort: 'high',
		reasoningSummary: 'detailed',
		serviceTier: 'default',
		permissionMode: 'normal',
		sandbox: 'read-only',
		mode: 'agent',
		locale: 'en',
		theme: 'light',
		sidebarFontSize: SIDEBAR_FONT_SIZE_DEFAULT,
		maxTabs: 5,
		chatViewPlacement: 'right-sidebar',
		enableAutoScroll: true,
		deferMathRenderingDuringStreaming: true,
		expandFileEditsByDefault: false,
		enableAutoTitleGeneration: true,
		titleGenerationModel: '',
		userName: '',
		excludedTagsText: '',
		mediaFolder: 'Attachments',
		requireCommandOrControlEnterToSend: false,
		keyboardNavigation: { ...DEFAULT_KEYBOARD_NAVIGATION },
		navMappingsText: keyboardNavigationToText(DEFAULT_KEYBOARD_NAVIGATION),
		mockSpeed: 'normal',
		workspace: getDefaultWorkspacePath(),
		codexPath: '',
		codexDownloadUrl: '',
		codexDownloadSource: 'npm-mirror',
		claudePath: '',
		llmProviderMode: 'native-cli',
		openaiModel: '',
		codexEnabled: true,
		claudeSafeMode: 'acceptEdits',
		claudeLoadUserSettings: true,
		claudeEnableOpus1M: false,
		claudeEnableSonnet1M: false,
		claudeCustomModels: '',
		claudeHiddenCommands: '',
		claudeEnableChrome: false,
		claudeEnableBangBash: true,
		codexInstallationMethod: 'native-windows',
		codexWslDistroOverride: '',
		codexSafeMode: 'read-only',
		codexCustomModels: '',
		codexHiddenCommands: '',
		envSnippets: [],
		customContextLimits: {},
		customModelAliases: {},
		systemPrompt: '',
		claudeCommands: [],
		claudeRuntimeCommands: [],
		claudeModels: [],
		claudeRuntimeModels: [],
		claudeAgents: [],
		codexSkills: [],
		codexRuntimeSkills: [],
		codexModels: [],
		codexRuntimeModels: [],
		codexSubagents: [],
		claudePlugins: [],
	};

	function createDefaultHistories() {
		const now = Date.now();
		return [
			{ id: 'hist-1', title: 'Mock approval flow', date: 'Today 14:08', createdAt: now - 3600000, lastResponseAt: now - 120000, messages: [userMessage('Show me an approval card'), systemAssistantMessage('Loaded from mock history. Send a message to continue.')], providerId: 'claude' },
			{ id: 'hist-2', title: 'Plan mode dry run', date: 'Today 13:42', createdAt: now - 7200000, lastResponseAt: now - 1800000, messages: [userMessage('Create a plan'), systemAssistantMessage('This is a saved mock planning session.')], providerId: 'codex' },
		];
	}

	function shouldUseMockSeedData() {
		const params = new URLSearchParams(window.location.search || '');
		return params.get('runtimeMode') === 'mock' || Boolean(params.get('mockScenario'));
	}

	function isKnownMockHistoryEntry(entry) {
		const title = String(entry?.title || '');
		if (title === 'Mock approval flow' || title === 'Plan mode dry run') {
			return true;
		}
		const text = JSON.stringify(entry?.messages || []);
		return text.includes('Loaded from mock history')
			|| text.includes('This is a saved mock planning session.');
	}

	function shouldDiscardPersistedMockState(parsed, urlSettings) {
		if (shouldUseMockSeedData()) {
			return false;
		}
		const runtimeMode = urlSettings.runtimeMode || parsed?.settings?.runtimeMode || DEFAULT_SETTINGS.runtimeMode;
		if (runtimeMode === 'mock') {
			return true;
		}
		return Array.isArray(parsed?.histories) && parsed.histories.some(isKnownMockHistoryEntry);
	}

	function withMockProviderAssets(settings) {
		return {
			...settings,
			claudeCommands: defaultClaudeCommands(),
			claudeAgents: defaultClaudeAgents(),
			claudePlugins: defaultClaudePlugins(),
			codexSkills: defaultCodexSkills(),
			codexSubagents: defaultCodexSubagents(),
		};
	}

	function createDefaultMockState() {
		const useMockSeedData = shouldUseMockSeedData();
		const settings = useMockSeedData ? withMockProviderAssets(DEFAULT_SETTINGS) : { ...DEFAULT_SETTINGS };
		const tabs = [createEmptyTab(1, settings)];
		return {
			settings,
			tabs,
			activeTabId: tabs[0].id,
			inputByTab: {},
			histories: useMockSeedData ? createDefaultHistories() : [],
			externalPaths: defaultExternalPaths(),
			mcpServers: defaultMcpServers(),
		};
	}

	function createNavigationMockState() {
		const settings = withMockProviderAssets({ ...DEFAULT_SETTINGS, mockSpeed: 'fast' });
		const tab = createEmptyTab(1, settings);
		tab.title = 'Navigation parity smoke';
		tab.messages = [];
		for (let index = 1; index <= 12; index += 1) {
			tab.messages.push(userMessage([
				`Navigation checkpoint ${index}`,
				`This prompt validates directory entry ${index}, previous/next jumping, and keyboard scrolling.`,
			].join('\n')));
			tab.messages.push(systemAssistantMessage([
				`Mock navigation response ${index}.`,
				'The standalone sidebar keeps enough content in each turn to make the message panel scrollable.',
				'This verifies the floating navigation controls without contacting Claude or Codex.',
				'Additional filler line for scroll depth and visual parity.',
			].join('\n\n')));
		}
		tab.usage = { contextTokens: 42000, contextWindow: 200000, percentage: 21 };
		return {
			settings,
			tabs: [tab],
			activeTabId: tab.id,
			inputByTab: {},
			histories: createDefaultHistories(),
			externalPaths: defaultExternalPaths(),
			mcpServers: defaultMcpServers(),
		};
	}

	function createRuntimeWaitingMockState() {
		const settings = withMockProviderAssets({ ...DEFAULT_SETTINGS, runtimeMode: 'mock', mockSpeed: 'fast' });
		const tab = createEmptyTab(1, settings);
		tab.id = 'runtime-waiting-tab';
		tab.title = 'Runtime waiting probe';
		tab.providerId = 'codex';
		tab.runtimeProviderId = 'codex';
		tab.runtimeSessionKey = 'runtime-waiting-session';
		tab.runtimeThreadId = 'runtime-waiting-thread';
		tab.model = 'gpt-5.5';
		tab.messages = [
			userMessage('Runtime waiting probe'),
			assistantMessageWithRuntimeWaiting('codex'),
		];
		tab.isStreaming = true;
		return {
			settings,
			tabs: [tab],
			activeTabId: tab.id,
			inputByTab: {},
			histories: createDefaultHistories(),
			externalPaths: defaultExternalPaths(),
			mcpServers: defaultMcpServers(),
		};
	}

	function readMockScenario() {
		const params = new URLSearchParams(window.location.search || '');
		return params.get('mockScenario') || '';
	}

	function isProviderRuntimeMode(runtimeMode) {
		return runtimeMode === 'claude' || runtimeMode === 'codex';
	}

	function readUrlSettingsOverride() {
		const params = new URLSearchParams(window.location.search || '');
		const runtimeMode = params.get('runtimeMode');
		const model = params.get('model');
		const workspace = params.get('workspace') || params.get('workspacePath');
		const theme = params.get('theme');
		const locale = params.get('locale') || params.get('lang');
		const override = {};
		if (['mock', 'codex', 'claude'].includes(runtimeMode)) {
			override.runtimeMode = runtimeMode;
		}
		if (theme) {
			override.theme = normalizeTheme(theme);
		}
		if (locale) {
			override.locale = normalizeLocale(locale);
		}
		if (model) {
			override.model = model;
			override.provider = modelToProvider(model);
		}
		if (workspace) {
			override.workspace = workspace;
		}
		if (override.runtimeMode === 'codex' && modelToProvider(override.model) !== 'codex') {
			override.model = 'gpt-5.5';
			override.provider = 'codex';
		}
		if (override.runtimeMode === 'claude' && modelToProvider(override.model) !== 'claude') {
			override.model = 'sonnet';
			override.provider = 'claude';
		}
		return override;
	}

	function shouldResetPersistedMockState() {
		const params = new URLSearchParams(window.location.search || '');
		return params.get('resetState') === '1';
	}

	function hasUrlWorkspaceOverride() {
		const params = new URLSearchParams(window.location.search || '');
		return Boolean(params.get('workspace') || params.get('workspacePath'));
	}

	function loadPersistedMockState() {
		const fallback = createDefaultMockState();
		const urlSettings = readUrlSettingsOverride();
		if (readMockScenario() === 'navigation') {
			const scenarioState = createNavigationMockState();
			return {
				...scenarioState,
				settings: { ...scenarioState.settings, ...urlSettings },
				tabs: scenarioState.tabs.map((tab) => ({
					...tab,
					model: urlSettings.model || tab.model,
					providerId: urlSettings.provider || tab.providerId,
				})),
			};
		}
		if (readMockScenario() === 'runtime-waiting') {
			const scenarioState = createRuntimeWaitingMockState();
			return {
				...scenarioState,
				settings: { ...scenarioState.settings, ...urlSettings },
				tabs: scenarioState.tabs.map((tab) => ({
					...tab,
					model: urlSettings.model || tab.model,
					providerId: urlSettings.provider || tab.providerId,
				})),
			};
		}
		if (shouldResetPersistedMockState()) {
			return {
				...fallback,
				settings: { ...fallback.settings, ...urlSettings },
				tabs: fallback.tabs.map((tab) => ({
					...tab,
					model: urlSettings.model || tab.model,
					providerId: urlSettings.provider || tab.providerId,
				})),
			};
		}
		try {
			const raw = window.localStorage.getItem(STORAGE_KEY);
			if (!raw) {
				return {
					...fallback,
					settings: { ...fallback.settings, ...urlSettings },
					tabs: fallback.tabs.map((tab) => ({
						...tab,
						model: urlSettings.model || tab.model,
						providerId: urlSettings.provider || tab.providerId,
					})),
				};
			}
			if (raw.length > MOCK_STATE_MAX_RAW_BYTES) {
				window.localStorage.removeItem(STORAGE_KEY);
				return {
					...fallback,
					settings: { ...fallback.settings, ...urlSettings },
					tabs: fallback.tabs.map((tab) => ({
						...tab,
						model: urlSettings.model || tab.model,
						providerId: urlSettings.provider || tab.providerId,
					})),
				};
			}
			const parsed = JSON.parse(raw);
			if (shouldDiscardPersistedMockState(parsed, urlSettings)) {
				return {
					...fallback,
					settings: { ...fallback.settings, ...urlSettings },
					tabs: fallback.tabs.map((tab) => ({
						...tab,
						model: urlSettings.model || tab.model,
						providerId: urlSettings.provider || tab.providerId,
					})),
				};
			}
			const tabs = Array.isArray(parsed.tabs) && parsed.tabs.length > 0
				? parsed.tabs.map((tab, index) => ({
					...tab,
					index: index + 1,
					isStreaming: false,
					queuedText: '',
					queuedDisplayText: '',
					queuedContextChips: [],
					queuedImages: Array.isArray(tab.queuedImages) ? tab.queuedImages : [],
					bashOutputs: Array.isArray(tab.bashOutputs) ? tab.bashOutputs : [],
					needsAttention: false,
					fileChips: Array.isArray(tab.fileChips) ? tab.fileChips : [],
					agentChips: Array.isArray(tab.agentChips) ? tab.agentChips : [],
					mcpMentions: Array.isArray(tab.mcpMentions) ? tab.mcpMentions : [],
					imageChips: Array.isArray(tab.imageChips) ? tab.imageChips : [],
					pdfSnippetChips: Array.isArray(tab.pdfSnippetChips) ? tab.pdfSnippetChips : [],
					queuedContext: hasTurnContext(normalizeTurnContext(tab.queuedContext)) ? normalizeTurnContext(tab.queuedContext) : null,
					runtimeResumeAt: typeof tab.runtimeResumeAt === 'string' && tab.runtimeResumeAt.trim() ? tab.runtimeResumeAt.trim() : null,
				}))
				: fallback.tabs;
			const activeTabId = tabs.some((tab) => tab.id === parsed.activeTabId)
				? parsed.activeTabId
				: tabs[0].id;
			const mergedSettings = sanitizePersistedSettings({ ...fallback.settings, ...(parsed.settings || {}), ...urlSettings });
			return {
				settings: mergedSettings,
				tabs: tabs.map((tab) => ({
					...tab,
					model: urlSettings.model || tab.model,
					providerId: urlSettings.provider || tab.providerId,
				})),
				activeTabId,
				inputByTab: sanitizePersistedInputByTab(parsed.inputByTab),
				histories: Array.isArray(parsed.histories) ? parsed.histories : fallback.histories,
				externalPaths: Array.isArray(parsed.externalPaths) ? parsed.externalPaths : fallback.externalPaths,
				mcpServers: Array.isArray(parsed.mcpServers) ? parsed.mcpServers.map(normalizeMcpServer) : fallback.mcpServers,
			};
		}
		catch {
			return {
				...fallback,
				settings: { ...fallback.settings, ...urlSettings },
			};
		}
	}

	function providerAssetsHaveAny(assets) {
		return !!assets && (
			assets.claudeCommandsLoaded === true
			|| assets.claudeRuntimeCommandsLoaded === true
			|| assets.claudeModelsLoaded === true
			|| assets.claudeRuntimeModelsLoaded === true
			|| assets.claudeAgentsLoaded === true
			|| assets.claudePluginsLoaded === true
			|| assets.codexSkillsLoaded === true
			|| assets.codexRuntimeSkillsLoaded === true
			|| assets.codexModelsLoaded === true
			|| assets.codexRuntimeModelsLoaded === true
			|| assets.codexSubagentsLoaded === true
			|| assets.mcpServersLoaded === true
			|| (Array.isArray(assets.claudeCommands) && assets.claudeCommands.length > 0)
			|| (Array.isArray(assets.claudeRuntimeCommands) && assets.claudeRuntimeCommands.length > 0)
			|| (Array.isArray(assets.claudeModels) && assets.claudeModels.length > 0)
			|| (Array.isArray(assets.claudeRuntimeModels) && assets.claudeRuntimeModels.length > 0)
			|| (Array.isArray(assets.claudeAgents) && assets.claudeAgents.length > 0)
			|| (Array.isArray(assets.claudePlugins) && assets.claudePlugins.length > 0)
			|| (Array.isArray(assets.codexSkills) && assets.codexSkills.length > 0)
			|| (Array.isArray(assets.codexRuntimeSkills) && assets.codexRuntimeSkills.length > 0)
			|| (Array.isArray(assets.codexModels) && assets.codexModels.length > 0)
			|| (Array.isArray(assets.codexRuntimeModels) && assets.codexRuntimeModels.length > 0)
			|| (Array.isArray(assets.codexSubagents) && assets.codexSubagents.length > 0)
		);
	}

	function normalizeWorkspaceForCompare(value) {
		return String(value || '')
			.trim()
			.replace(/\\/g, '/')
			.replace(/\/+$/, '')
			.toLowerCase();
	}

	function providerAssetsMatchWorkspace(assets, workspace) {
		const assetWorkspace = normalizeWorkspaceForCompare(assets?.workspace);
		const expectedWorkspace = normalizeWorkspaceForCompare(workspace);
		return !assetWorkspace || !expectedWorkspace || assetWorkspace === expectedWorkspace;
	}

	function mergeNativeHistories(currentHistories, nativeHistories, limit = 40) {
		const current = Array.isArray(currentHistories) ? currentHistories : [];
		const native = Array.isArray(nativeHistories) ? nativeHistories : [];
		if (!native.length) return current;
		const byId = new Map();
		current.forEach((item, index) => {
			if (!item?.id) return;
			byId.set(item.id, { item, index });
		});
		native.forEach((item, offset) => {
			if (!item?.id) return;
			const previous = byId.get(item.id);
			const previousItem = previous?.item;
			const preserveManualTitle = previousItem?.titleGenerationStatus === 'manual' && previousItem.title;
			const merged = previousItem
				? {
					...previousItem,
					...item,
					title: preserveManualTitle ? previousItem.title : item.title,
					titleGenerationStatus: previousItem.titleGenerationStatus || item.titleGenerationStatus,
				}
				: item;
			byId.set(item.id, {
				item: merged,
				index: previous?.index ?? current.length + offset,
			});
		});
		return [...byId.values()]
			.sort((left, right) => {
				const leftTime = historySortTime(left.item, left.index);
				const rightTime = historySortTime(right.item, right.index);
				if (rightTime !== leftTime) return rightTime - leftTime;
				return left.index - right.index;
			})
			.map((entry) => entry.item)
			.slice(0, limit);
	}

	function getSettingsProviderAssetRefreshSpec(surface) {
		if (surface === 'claudeCommands') {
			return {
				keys: ['claudeCommands', 'claudeRuntimeCommands'],
				options: {
					provider: 'claude',
					includeClaudeRuntimeCommands: true,
					forceReload: true,
				},
			};
		}
		if (surface === 'codexSkills') {
			return {
				keys: ['codexSkills', 'codexRuntimeSkills'],
				options: {
					provider: 'codex',
					includeCodexRuntimeSkills: true,
					forceReload: true,
				},
			};
		}
		if (surface === 'claudeModels') {
			return {
				keys: ['claudeRuntimeModels'],
				options: {
					provider: 'claude',
					includeRuntimeModels: true,
					forceReload: true,
				},
			};
		}
		if (surface === 'codexModels') {
			return {
				keys: ['codexRuntimeModels'],
				options: {
					provider: 'codex',
					includeRuntimeModels: true,
					forceReload: true,
				},
			};
		}
		return {
			keys: [surface],
			options: { forceReload: true },
		};
	}

	function summarizeProviderAssetsForLog(assets) {
		const count = (key) => Array.isArray(assets?.[key]) ? assets[key].length : 0;
		const deleted = (key) => (Array.isArray(assets?.[key]) ? assets[key] : [])
			.filter((item) => item?.deleted === true || item?._deleted === true)
			.map((item) => item?.name || item?.id || '')
			.filter(Boolean);
		return {
			claudeCommands: count('claudeCommands'),
			claudeRuntimeCommands: count('claudeRuntimeCommands'),
			claudeModels: count('claudeModels'),
			claudeRuntimeModels: count('claudeRuntimeModels'),
			claudeAgents: count('claudeAgents'),
			claudePlugins: count('claudePlugins'),
			codexSkills: count('codexSkills'),
			codexRuntimeSkills: count('codexRuntimeSkills'),
			codexModels: count('codexModels'),
			codexRuntimeModels: count('codexRuntimeModels'),
			codexSubagents: count('codexSubagents'),
			deleted: {
				claudeCommands: deleted('claudeCommands'),
				claudeAgents: deleted('claudeAgents'),
				codexSkills: deleted('codexSkills'),
				codexSubagents: deleted('codexSubagents'),
			},
		};
	}

	function mergeProviderAssetsIntoSettings(current, assets, options = {}) {
		if (!assets || typeof assets !== 'object') return current;
		const forceEmpty = options.forceEmpty === true;
		const preserveExistingEmptyAssets = options.preserveExistingEmptyAssets === true;
		const shouldPatchArray = (key, loadedKey = `${key}Loaded`, opts = {}) => (
			Array.isArray(assets[key])
			&& (
				assets[key].length > 0
				|| (opts.patchWhenLoaded === true && assets[loadedKey] === true)
				|| (forceEmpty && !preserveExistingEmptyAssets)
			)
		);
		const patch = {};
		if (shouldPatchArray('claudeCommands')) {
			patch.claudeCommands = normalizeClaudeCommands(assets.claudeCommands);
		}
		if (shouldPatchArray('claudeRuntimeCommands')) {
			patch.claudeRuntimeCommands = normalizeClaudeCommands(assets.claudeRuntimeCommands);
		}
		if (shouldPatchArray('claudeModels')) {
			patch.claudeModels = normalizeModelOptions(assets.claudeModels, 'claude', 'Claude', 'runtime', current?.customModelAliases || {});
		}
		if (shouldPatchArray('claudeRuntimeModels', 'claudeRuntimeModelsLoaded', { patchWhenLoaded: true })) {
			patch.claudeRuntimeModels = normalizeModelOptions(assets.claudeRuntimeModels, 'claude', 'Claude', 'runtime', current?.customModelAliases || {});
		}
		if (shouldPatchArray('claudeAgents')) {
			patch.claudeAgents = normalizeClaudeAgents(assets.claudeAgents);
		}
		if (Array.isArray(assets.claudePlugins) && (assets.claudePlugins.length > 0 || (forceEmpty && assets.claudePluginsLoaded === true))) {
			patch.claudePlugins = normalizeClaudePlugins(assets.claudePlugins);
		}
		if (shouldPatchArray('codexSkills')) {
			patch.codexSkills = normalizeCodexSkills(assets.codexSkills);
		}
		if (shouldPatchArray('codexRuntimeSkills')) {
			patch.codexRuntimeSkills = normalizeCodexRuntimeSkills(assets.codexRuntimeSkills);
		}
		if (shouldPatchArray('codexModels')) {
			patch.codexModels = normalizeModelOptions(assets.codexModels, 'codex', 'Codex', 'runtime', current?.customModelAliases || {});
		}
		if (shouldPatchArray('codexRuntimeModels', 'codexRuntimeModelsLoaded', { patchWhenLoaded: true })) {
			patch.codexRuntimeModels = normalizeModelOptions(assets.codexRuntimeModels, 'codex', 'Codex', 'runtime', current?.customModelAliases || {});
		}
		if (shouldPatchArray('codexSubagents')) {
			patch.codexSubagents = normalizeCodexSubagents(assets.codexSubagents);
		}
		return Object.keys(patch).length ? { ...current, ...patch } : current;
	}

	function buildProviderAssetsPayload(sourceSettings) {
		return {
			claudeCommands: normalizeClaudeCommands(sourceSettings?.claudeCommands),
			claudeAgents: normalizeClaudeAgents(sourceSettings?.claudeAgents).filter((agent) => agent.source === 'vault'),
			claudePlugins: normalizeClaudePlugins(sourceSettings?.claudePlugins),
			codexSkills: normalizeCodexSkills(sourceSettings?.codexSkills),
			codexSubagents: normalizeCodexSubagents(sourceSettings?.codexSubagents),
		};
	}

	function initialRuntimeStatusForSettings(settings) {
		return (settings?.runtimeMode || DEFAULT_SETTINGS.runtimeMode) === 'mock'
			? { detail: 'Mock UI runtime' }
			: { detail: 'Runtime idle' };
	}

	function readUrlUsageOverride(tab, settings) {
		const params = new URLSearchParams(window.location.search || '');
		const rawPercent = params.get('contextPercent') || params.get('usagePercent');
		const rawTokens = params.get('contextTokens') || params.get('usageTokens');
		if (!rawPercent && !rawTokens) return null;
		const model = tab?.model || settings?.model || DEFAULT_SETTINGS.model;
		const configuredWindow = getConfiguredContextWindow(model, settings || DEFAULT_SETTINGS);
		const requestedWindow = Number(params.get('contextWindow') || params.get('usageWindow') || 0) || 0;
		const contextWindow = isValidContextWindow(requestedWindow) ? requestedWindow : configuredWindow;
		const requestedTokens = Number(rawTokens || 0) || 0;
		const requestedPercent = Number(rawPercent || 0) || 0;
		const contextTokens = requestedTokens > 0
			? requestedTokens
			: Math.round(contextWindow * Math.min(100, Math.max(0, requestedPercent)) / 100);
		return normalizeUsageInfo({
			model,
			contextTokens,
			contextWindow,
			contextWindowIsAuthoritative: true,
		}, model, settings || DEFAULT_SETTINGS);
	}

	function applyUrlInitialStateOverrides(state) {
		const settings = state?.settings || DEFAULT_SETTINGS;
		const tabs = Array.isArray(state?.tabs) ? state.tabs : [];
		let changed = false;
		const nextTabs = tabs.map((tab) => {
			const usage = readUrlUsageOverride(tab, settings);
			if (!usage) return tab;
			changed = true;
			return { ...tab, usage };
		});
		return changed ? { ...state, tabs: nextTabs } : state;
	}

	function App() {
		const initialStateRef = useRef(null);
		if (!initialStateRef.current) {
			const loadedState = applyUrlInitialStateOverrides(loadPersistedMockState());
			initialStateRef.current = {
				...loadedState,
				settings: normalizeSidebarSettings(loadedState.settings),
			};
		}
		const [settings, setSettings] = useState(initialStateRef.current.settings);
		const [tabs, setTabs] = useState(initialStateRef.current.tabs);
		const [activeTabId, setActiveTabId] = useState(initialStateRef.current.activeTabId);
		const [inputByTab, setInputByTab] = useState(initialStateRef.current.inputByTab);
		const [historyVisible, setHistoryVisible] = useState(false);
		const [resumeVisible, setResumeVisible] = useState(false);
		const [histories, setHistories] = useState(initialStateRef.current.histories);
		const [externalPaths, setExternalPaths] = useState(initialStateRef.current.externalPaths);
		const [mcpServers, setMcpServers] = useState(initialStateRef.current.mcpServers);
		const [turnContext, setTurnContext] = useState(() => normalizeTurnContext(initialStateRef.current.turnContext));
		const turnContextRef = useRef(turnContext);
		const [pdfShellContext, setPdfShellContext] = useState(() => normalizePdfAiShellPayload(null));
		const [includePdfSelection, setIncludePdfSelection] = useState(false);
		const [pdfWorkspaceTree, setPdfWorkspaceTree] = useState(null);
		const pdfWorkspacePendingRef = useRef(null);
		const pdfWorkspacePendingKeyRef = useRef('');
		const [drawerOpen, setDrawerOpen] = useState(false);
		const [inlineEditOpen, setInlineEditOpen] = useState(false);
		const [runtimeStatus, setRuntimeStatus] = useState(() => initialRuntimeStatusForSettings(initialStateRef.current.settings));
		const [codexDownloadStatus, setCodexDownloadStatus] = useState(null);
		const [runtimeLogPath, setRuntimeLogPath] = useState('');
		const [runtimeLogCopyStatus, setRuntimeLogCopyStatus] = useState('');
		const [runtimeDiagnostics, setRuntimeDiagnostics] = useState(null);
		const [runtimeDiagnosticsStatus, setRuntimeDiagnosticsStatus] = useState('');
		const [environment, setEnvironment] = useState(null);
		const [runtimeStateLoaded, setRuntimeStateLoaded] = useState(!api?.getState);
		const environmentAction = async (payload = {}) => {
			if (!api?.environment) return;
			if (payload.action === 'check' || payload.action === 'use-path') {
				setEnvironment((current) => ({ ...(current || {}), checking: true, error: '' }));
			}
			try {
				const result = await api.environment(payload);
				if (result) setEnvironment(result);
			}
			catch (error) {
				setEnvironment((current) => ({ ...(current || {}), checking: false, error: error?.message || String(error) }));
			}
		};
		useEffect(() => { void environmentAction({ action: 'check' }); }, []);
		useEffect(() => {
			if (environment?.job?.status !== 'running') return undefined;
			const timer = window.setInterval(() => { void environmentAction({ action: 'status' }); }, 1000);
			return () => window.clearInterval(timer);
		}, [environment?.job?.status]);
		const [sidebarMode, setSidebarMode] = useState('ai');
		const [featureGuideAction, setFeatureGuideAction] = useState(null);
		const [markdownNoteTab, setMarkdownNoteTab] = useState({
			fileName: 'Markdown',
			filePath: '',
			open: false,
			dirty: false,
			saving: false,
		});
		const [instructionModal, setInstructionModal] = useState(null);
		const [forkRequest, setForkRequest] = useState(null);
		const mcpServersRef = useRef(initialStateRef.current.mcpServers);
		const mcpSaveSeqRef = useRef(0);
		const timersRef = useRef([]);
		const runtimeTabIdRef = useRef(null);
		const messagesRef = useRef(null);
		const inputRef = useRef(null);
		const autoScrollRef = useRef(true);
		const reEnableScrollTimerRef = useRef(null);
		const bottomScrollFrameRef = useRef(0);
		const scrollDirectionRef = useRef(null);
		const scrollFrameRef = useRef(0);
		const runtimeChunkQueueRef = useRef([]);
		const runtimeChunkFrameRef = useRef(0);
		const runtimeChunkTimerRef = useRef(null);
		const persistenceTimerRef = useRef(null);
		const providerAssetsDirtyRef = useRef(false);
		const providerAssetsLoadedRef = useRef(false);
		const shellTaskIdsRef = useRef(new Set());
		const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
		const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];
		const actualActiveTabId = activeTab?.id;
		const tabsRef = useRef(tabs);
		const settingsRef = useRef(settings);
		const activeTabIdRef = useRef(actualActiveTabId);
		const input = inputByTab[actualActiveTabId] || '';
		const currentPdfSelection = pdfShellContext?.selection || null;
		const pdfSnippetCatalog = useMemo(() => buildPdfSnippetItems({
			selection: currentPdfSelection,
			workspaceTree: pdfWorkspaceTree,
			settings,
		}), [currentPdfSelection, pdfWorkspaceTree, settings.workspace]);
		const configuredMaxTabs = getConfiguredMaxTabs(settings);
		const keyboardNavigation = normalizeKeyboardNavigation(settings.keyboardNavigation);

		useEffect(() => {
			setPdfWorkspaceTree(null);
			pdfWorkspacePendingRef.current = null;
			pdfWorkspacePendingKeyRef.current = '';
		}, [pdfShellContext?.workspaceId, pdfShellContext?.workspaceRootDir, settings.workspace]);

		useEffect(() => {
			tabsRef.current = tabs;
		}, [tabs]);

		useEffect(() => {
			settingsRef.current = settings;
		}, [settings]);

		useEffect(() => {
			const theme = normalizeTheme(settings?.theme);
			const locale = normalizeLocale(settings?.locale);
			document.body.dataset.theme = theme;
			document.body.classList.toggle('theme-dark', theme === 'dark');
			document.body.classList.toggle('theme-light', theme === 'light');
			document.documentElement.dataset.theme = theme;
			document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : 'en';
		}, [settings?.theme, settings?.locale]);

		useEffect(() => {
			activeTabIdRef.current = actualActiveTabId;
		}, [actualActiveTabId]);

		useEffect(() => {
			mcpServersRef.current = mcpServers;
		}, [mcpServers]);

		function setAutoScroll(value) {
			autoScrollRef.current = value;
			setAutoScrollEnabled(value);
		}

		function shouldStickMessagesToBottom(tab = null) {
			if ((settingsRef.current || settings).enableAutoScroll === false) return false;
			const currentTab = tab || (tabsRef.current || []).find((item) => item.id === activeTabIdRef.current);
			return autoScrollRef.current || currentTab?.isStreaming === true;
		}

		function setMessagesScrollToBottom() {
			const messagesEl = messagesRef.current;
			if (!messagesEl || !shouldStickMessagesToBottom()) return false;
			messagesEl.scrollTop = messagesEl.scrollHeight;
			return true;
		}

		function scheduleMessagesScrollToBottom() {
			if (!messagesRef.current || !shouldStickMessagesToBottom() || bottomScrollFrameRef.current) return;
			bottomScrollFrameRef.current = window.requestAnimationFrame(() => {
				bottomScrollFrameRef.current = 0;
				setMessagesScrollToBottom();
			});
		}

		function stopKeyboardScroll() {
			scrollDirectionRef.current = null;
			if (scrollFrameRef.current) {
				window.cancelAnimationFrame(scrollFrameRef.current);
				scrollFrameRef.current = 0;
			}
		}

		function startKeyboardScroll(direction) {
			if (scrollDirectionRef.current === direction) return;
			stopKeyboardScroll();
			scrollDirectionRef.current = direction;
			const step = () => {
				const messagesEl = messagesRef.current;
				if (!messagesEl || !scrollDirectionRef.current) {
					stopKeyboardScroll();
					return;
				}
				messagesEl.scrollTop += scrollDirectionRef.current === 'up' ? -8 : 8;
				scrollFrameRef.current = window.requestAnimationFrame(step);
			};
			step();
		}

		function handleMessagesKeyDown(event) {
			if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
			const interactiveTarget = event.target !== event.currentTarget
				&& event.target?.closest?.('input, textarea, select, button, a, [contenteditable="true"], [role="button"]');
			if (interactiveTarget) return;
			const key = String(event.key || '').toLowerCase();
			if (key === keyboardNavigation.scrollUpKey) {
				event.preventDefault();
				startKeyboardScroll('up');
				return;
			}
			if (key === keyboardNavigation.scrollDownKey) {
				event.preventDefault();
				startKeyboardScroll('down');
				return;
			}
			if (key === keyboardNavigation.focusInputKey) {
				event.preventDefault();
				inputRef.current?.focus();
			}
		}

		function focusMessages() {
			messagesRef.current?.focus();
		}

		function clearRuntimeChunkSchedule() {
			if (runtimeChunkFrameRef.current) {
				window.cancelAnimationFrame(runtimeChunkFrameRef.current);
				runtimeChunkFrameRef.current = 0;
			}
			if (runtimeChunkTimerRef.current) {
				window.clearTimeout(runtimeChunkTimerRef.current);
				runtimeChunkTimerRef.current = null;
			}
		}

		function flushRuntimeChunks() {
			const queued = runtimeChunkQueueRef.current;
			if (!queued.length) return;
			clearRuntimeChunkSchedule();
			runtimeChunkQueueRef.current = [];
			const grouped = groupRuntimeChunkItemsByTab(queued);
			const coalesced = grouped.flatMap((item) => item.chunks);
			const summary = summarizeRuntimeChunkTypes(coalesced);
			logRendererEvent('runtime.flushChunks', {
				count: queued.length,
				coalescedCount: coalesced.length,
				...summary,
				tabIds: grouped.map((item) => item.tabId),
			});
			setTabs((current) => {
				let nextTabs = current;
				const runtimeSettings = settingsRef.current || settings;
				for (const item of grouped) {
					nextTabs = updateTab(nextTabs, item.tabId, (tab) => (
						item.chunks.reduce((nextTab, chunk) => applyRuntimeChunk(nextTab, chunk, runtimeSettings), tab)
					));
				}
				return nextTabs;
			});
		}

		function flushRuntimeChunksNow() {
			clearRuntimeChunkSchedule();
			flushRuntimeChunks();
		}

		function takeRuntimeChunksForTab(tabId) {
			const queued = runtimeChunkQueueRef.current;
			if (!queued.length) return [];
			const picked = [];
			const remaining = [];
			for (const item of queued) {
				if (item.tabId === tabId) {
					picked.push(item.chunk);
				}
				else {
					remaining.push(item);
				}
			}
			runtimeChunkQueueRef.current = remaining;
			if (!remaining.length) {
				clearRuntimeChunkSchedule();
			}
			const coalesced = coalesceRuntimeChunks(picked);
			if (picked.length) {
				const summary = summarizeRuntimeChunkTypes(coalesced);
				logRendererEvent('runtime.takeQueuedChunks', {
					tabId,
					count: picked.length,
					coalescedCount: coalesced.length,
					...summary,
				});
			}
			return coalesced;
		}

		function applyRuntimeChunksToTab(tab, chunks) {
			const runtimeSettings = settingsRef.current || settings;
			return coalesceRuntimeChunks(chunks).reduce((nextTab, chunk) => applyRuntimeChunk(nextTab, chunk, runtimeSettings), tab);
		}

		function scheduleRuntimeChunkFlush() {
			if (runtimeChunkFrameRef.current || runtimeChunkTimerRef.current) return;
			runtimeChunkFrameRef.current = window.requestAnimationFrame(() => {
				runtimeChunkFrameRef.current = 0;
				flushRuntimeChunks();
			});
			runtimeChunkTimerRef.current = window.setTimeout(() => {
				runtimeChunkTimerRef.current = null;
				flushRuntimeChunks();
			}, RUNTIME_CHUNK_FLUSH_MAX_DELAY_MS);
		}

		function enqueueRuntimeChunk(tabId, chunk) {
			if (!tabId || !chunk) return;
			const enrichedChunk = chunk && typeof chunk === 'object' && !chunk.workspace && settings.workspace
				? { ...chunk, workspace: settings.workspace }
				: chunk;
			const queue = runtimeChunkQueueRef.current;
			const lastIndex = queue.length - 1;
			const lastItem = queue[lastIndex];
			if (enrichedChunk?.type === 'context_compacted') {
				const tab = (tabsRef.current || []).find((item) => item.id === tabId);
				logRendererEvent('runtime.contextCompaction.queued', {
					tabId,
					queueLength: queue.length,
					usagePercentage: Number(tab?.usage?.percentage || 0) || 0,
					usageContextTokens: Number(tab?.usage?.contextTokens || 0) || 0,
					usageContextWindow: Number(tab?.usage?.contextWindow || 0) || 0,
				});
			}
			if (lastItem?.tabId === tabId && canMergeRuntimeChunks(lastItem.chunk, enrichedChunk)) {
				queue[lastIndex] = { ...lastItem, chunk: mergeRuntimeChunks(lastItem.chunk, enrichedChunk) };
			}
			else {
				queue.push({ tabId, chunk: enrichedChunk });
			}
			if (queue.length >= RUNTIME_CHUNK_FLUSH_HIGH_WATERMARK) {
				flushRuntimeChunksNow();
				return;
			}
			scheduleRuntimeChunkFlush();
		}

		useEffect(() => {
			if (!activeTabId && tabs[0]) setActiveTabId(tabs[0].id);
		}, [activeTabId, tabs]);

		useEffect(() => {
			setAutoScroll(settings.enableAutoScroll !== false);
		}, [actualActiveTabId, settings.enableAutoScroll]);

		useEffect(() => {
			const handleKeyUp = (event) => {
				const key = String(event.key || '').toLowerCase();
				if (key === keyboardNavigation.scrollDownKey || key === keyboardNavigation.scrollUpKey) stopKeyboardScroll();
			};
			window.addEventListener('keyup', handleKeyUp);
			return () => {
				window.removeEventListener('keyup', handleKeyUp);
				stopKeyboardScroll();
			};
		}, [keyboardNavigation.scrollDownKey, keyboardNavigation.scrollUpKey]);

		useEffect(() => {
			if (!historyVisible) return undefined;
			const closeHistory = () => setHistoryVisible(false);
			document.addEventListener('click', closeHistory);
			return () => document.removeEventListener('click', closeHistory);
		}, [historyVisible]);

		useEffect(() => {
			const messagesEl = messagesRef.current;
			if (!messagesEl) return undefined;
			const clearReEnableTimer = () => {
				if (!reEnableScrollTimerRef.current) return;
				window.clearTimeout(reEnableScrollTimerRef.current);
				reEnableScrollTimerRef.current = null;
			};
			const handleScroll = () => {
				if (settings.enableAutoScroll === false) {
					clearReEnableTimer();
					setAutoScroll(false);
					return;
				}
				const currentTab = (tabsRef.current || []).find((tab) => tab.id === activeTabIdRef.current);
				if (currentTab?.isStreaming) {
					clearReEnableTimer();
					setAutoScroll(true);
					return;
				}
				const isAtBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight <= 20;
				if (!isAtBottom) {
					clearReEnableTimer();
					setAutoScroll(false);
					return;
				}
				if (!autoScrollRef.current && !reEnableScrollTimerRef.current) {
					reEnableScrollTimerRef.current = window.setTimeout(() => {
						reEnableScrollTimerRef.current = null;
						if (messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight <= 20) {
							setAutoScroll(true);
						}
					}, 150);
				}
			};
			messagesEl.addEventListener('scroll', handleScroll, { passive: true });
			handleScroll();
			return () => {
				clearReEnableTimer();
				messagesEl.removeEventListener('scroll', handleScroll);
			};
		}, [actualActiveTabId, settings.enableAutoScroll]);

		useLayoutEffect(() => {
			if (!messagesRef.current || !shouldStickMessagesToBottom(activeTab)) return undefined;
			setAutoScroll(true);
			setMessagesScrollToBottom();
			scheduleMessagesScrollToBottom();
			return undefined;
		}, [actualActiveTabId, activeTab?.messages, activeTab?.isStreaming, settings.enableAutoScroll]);

		useEffect(() => {
			const messagesEl = messagesRef.current;
			if (!messagesEl || settings.enableAutoScroll === false) return undefined;
			let resizeObserver = null;
			const observeChildren = () => {
				if (!resizeObserver) return;
				resizeObserver.observe(messagesEl);
				Array.from(messagesEl.children || []).forEach((child) => resizeObserver.observe(child));
			};
			const handleContentChange = () => {
				observeChildren();
				scheduleMessagesScrollToBottom();
			};
			if (typeof ResizeObserver === 'function') {
				resizeObserver = new ResizeObserver(handleContentChange);
				observeChildren();
			}
			const mutationObserver = typeof MutationObserver === 'function'
				? new MutationObserver(handleContentChange)
				: null;
			mutationObserver?.observe(messagesEl, { childList: true, subtree: true, characterData: true });
			handleContentChange();
			return () => {
				mutationObserver?.disconnect();
				resizeObserver?.disconnect();
			};
		}, [actualActiveTabId, settings.enableAutoScroll]);

		useEffect(() => () => {
			if (bottomScrollFrameRef.current) {
				window.cancelAnimationFrame(bottomScrollFrameRef.current);
				bottomScrollFrameRef.current = 0;
			}
		}, []);

		useEffect(() => {
			if (resumeVisible && input) setResumeVisible(false);
		}, [resumeVisible, input]);

		function reportShellTaskTerminalState(tabId, event = {}) {
			window.setTimeout(() => {
				const tab = (tabsRef.current || []).find((item) => item.id === tabId);
				const shellTask = tab?.shellTask;
				if (!shellTask?.id || shellTask.source !== 'pdfai-context') {
					return;
				}
				const rawStatus = event.status || event.raw?.params?.turn?.status || '';
				const userInterrupted = lastAssistantWasInterrupted(tab);
				const status = userInterrupted
					? 'cancelled'
					: (String(rawStatus || '').trim().toLowerCase() || 'completed');
				const payload = {
					taskId: shellTask.id,
					rootTaskId: shellTask.rootTaskId || shellTask.id,
					source: shellTask.source,
					status,
					retryAttempt: shellTask.retryAttempt || 0,
					hasRenderableOutput: lastAssistantHasRenderableRuntimeContent(tab),
					userInterrupted,
				};
				try {
					if (window.parent && window.parent !== window) {
						postMessageToHost({ type: 'pdf-ai-shell-task-status', payload });
					}
				}
				finally {
					setTabs((current) => updateTab(current, tabId, (currentTab) => (
						currentTab?.shellTask?.id === shellTask.id
							? { ...currentTab, shellTask: null }
							: currentTab
					)));
				}
			}, 48);
		}

		function startShellTaskFromPayload(payload = {}) {
			const taskId = String(payload.taskId || payload.id || '').trim();
			if (taskId) {
				if (shellTaskIdsRef.current.has(taskId)) return;
				shellTaskIdsRef.current.add(taskId);
			}
			const text = truncatePersistedText(String(payload.text || payload.prompt || '').trim(), MAX_SHELL_PAYLOAD_TEXT_LENGTH);
			if (!text) return;
			const currentSettings = settingsRef.current || settings;
			const requestedProvider = normalizeRuntimeProviderId(payload.runtimeMode || payload.provider);
			const currentProvider = isProviderRuntimeMode(currentSettings.runtimeMode)
				? currentSettings.runtimeMode
				: normalizeRuntimeProviderId(modelToProvider(currentSettings.model, currentSettings));
			const runtimeMode = requestedProvider || currentProvider || 'codex';
			const workspace = String(payload.workspace || payload.workspaceRootDir || payload.turnContext?.workspaceRootDir || currentSettings.workspace || '').trim();
			const requestedReasoningSummary = ['auto', 'concise', 'detailed', 'none'].includes(payload.reasoningSummary)
				? payload.reasoningSummary
				: currentSettings.reasoningSummary;
			const shellTask = {
				id: taskId,
				rootTaskId: String(payload.rootTaskId || taskId).trim(),
				source: String(payload.source || '').trim(),
				retryAttempt: Math.max(0, Number(payload.retryAttempt || 0) || 0),
				maxRetries: Math.max(0, Number(payload.maxRetries || 0) || 0),
				suppressAutoTitle: payload.suppressAutoTitle === true,
			};
			const taskSettings = {
				...currentSettings,
				runtimeMode,
				provider: runtimeMode,
				workspace,
				effort: normalizeRuntimeEffort(payload.effort || currentSettings.effort),
				reasoningSummary: requestedReasoningSummary || 'detailed',
				permissionMode: payload.permissionMode === 'yolo' ? 'yolo' : (payload.permissionMode || 'yolo'),
				sandbox: payload.sandbox || 'danger-full-access',
			};
			const currentTabs = tabsRef.current || tabs;
			const maxTabs = getConfiguredMaxTabs(currentSettings);
			const title = truncatePersistedText(String(payload.title || '').trim(), 160);
			let targetTab = null;
			let createdTab = null;
			if (payload.newTab !== false && currentTabs.length < maxTabs) {
				createdTab = {
					...createEmptyTab(currentTabs.length + 1, taskSettings),
					title: title || 'Graph build',
					providerId: runtimeMode,
					workspace,
					shellTask,
				};
				targetTab = createdTab;
				setTabs((current) => current.some((tab) => tab.id === createdTab.id) ? current : [...current, createdTab]);
			}
			else {
				targetTab = currentTabs.find((tab) => !tab.isStreaming && (!tab.messages || tab.messages.length === 0))
					|| currentTabs.find((tab) => !tab.isStreaming)
					|| currentTabs.find((tab) => tab.id === activeTabIdRef.current)
					|| currentTabs[0];
			}
			if (!targetTab?.id) return;
			if (!createdTab) {
				setTabs((current) => updateTab(current, targetTab.id, (tab) => ({ ...tab, shellTask })));
			}
			setActiveTabId(targetTab.id);
			const turnContextOverride = normalizeTurnContext(payload.turnContext || {
				source: payload.source || 'electron-shell',
				workspaceId: payload.workspaceId || '',
				workspaceRootDir: workspace,
			});
			const contextChips = normalizeMessageContextChips(payload.contextChips);
			const displayText = truncatePersistedText(String(payload.displayText || '').trim(), MAX_SHELL_PAYLOAD_TEXT_LENGTH) || text;
			const latestTarget = (tabsRef.current || currentTabs).find((tab) => tab.id === targetTab.id) || targetTab;
			if (!createdTab && latestTarget?.isStreaming) {
				setTabs((current) => updateTab(current, targetTab.id, (tab) => ({
					...tab,
					...mergeQueuedState(tab, text, [], turnContextOverride, displayText, contextChips),
				})));
				return;
			}
			schedule(() => startTurnWithText(targetTab.id, text, [], {
				settingsOverride: taskSettings,
				turnContextOverride,
				displayText,
				contextChips,
				suppressAutoTitle: shellTask.suppressAutoTitle,
			}), 0);
		}

		function fillComposerFromShellPayload(payload = {}) {
			const text = truncatePersistedText(String(payload.text || payload.prompt || '').trim(), MAX_SHELL_PAYLOAD_TEXT_LENGTH);
			const contextChips = normalizeMessageContextChips(payload.contextChips);
			if (!text && !contextChips.length && !payload.turnContext) return;
			const currentSettings = settingsRef.current || settings;
			const currentTabs = tabsRef.current || tabs;
			let targetTab = currentTabs.find((tab) => tab.id === activeTabIdRef.current)
				|| currentTabs.find((tab) => !tab.isStreaming)
				|| currentTabs[0];
			if (!targetTab || targetTab.isStreaming) {
				const requestedProvider = normalizeRuntimeProviderId(payload.runtimeMode || payload.provider);
				const currentProvider = isProviderRuntimeMode(currentSettings.runtimeMode)
					? currentSettings.runtimeMode
					: normalizeRuntimeProviderId(modelToProvider(currentSettings.model, currentSettings));
				const runtimeMode = requestedProvider || currentProvider || 'codex';
				const workspace = String(payload.workspace || payload.workspaceRootDir || payload.turnContext?.workspaceRootDir || currentSettings.workspace || '').trim();
				const draftSettings = {
					...currentSettings,
					runtimeMode,
					provider: runtimeMode,
					workspace,
				};
				targetTab = {
					...createEmptyTab(currentTabs.length + 1, draftSettings),
					title: truncatePersistedText(String(payload.title || '').trim(), 160) || 'Graph context',
					providerId: runtimeMode,
					workspace,
				};
				setTabs((current) => current.some((tab) => tab.id === targetTab.id) ? current : [...current, targetTab]);
			}
			if (!targetTab?.id) return;
			setActiveTabId(targetTab.id);
			const shouldAppend = payload.append === true;
			const contextChipMode = payload.composerMode === 'context-chip'
				|| payload.displayMode === 'chip'
				|| String(payload.source || '').startsWith('notebookmr-graph');
			setInputByTab((current) => ({
				...current,
				[targetTab.id]: contextChipMode
					? (payload.replaceInput === true
						? truncatePersistedText(String(payload.inputText || ''), MAX_SHELL_PAYLOAD_TEXT_LENGTH)
						: (isNotebookGraphPromptText(current[targetTab.id]) ? '' : truncatePersistedText(current[targetTab.id] || '', MAX_SHELL_PAYLOAD_TEXT_LENGTH)))
					: (shouldAppend ? truncatePersistedText(appendMarkdownSnippet(current[targetTab.id] || '', text), MAX_SHELL_PAYLOAD_TEXT_LENGTH) : text),
			}));
			const turnContextOverride = normalizeTurnContext(payload.turnContext || {
				source: payload.source || 'electron-shell',
				workspaceId: payload.workspaceId || '',
				workspaceRootDir: payload.workspace || payload.workspaceRootDir || currentSettings.workspace || '',
				graphSelection: contextChipMode ? {
					source: payload.source || 'notebookmr-graph-node',
					workspaceId: payload.workspaceId || '',
					workspaceRootDir: payload.workspace || payload.workspaceRootDir || currentSettings.workspace || '',
					prompt: text,
				} : null,
			});
			turnContextRef.current = turnContextOverride;
			setTurnContext(turnContextOverride);
			setTabs((current) => updateTab(current, targetTab.id, (tab) => ({
				...tab,
				queuedContext: null,
				queuedContextChips: [],
				turnContext: turnContextOverride,
				turnContextChips: contextChips,
			})));
			window.requestAnimationFrame(() => inputRef.current?.focus?.());
		}

		function clearGraphSelectionFromShellPayload() {
			const nextContext = normalizeTurnContext(removeGraphSelectionFromContext(turnContextRef.current));
			turnContextRef.current = nextContext;
			setTurnContext(nextContext);
			const targetId = activeTabIdRef.current;
			setTabs((current) => current.map((tab) => {
				if (targetId && tab.id !== targetId) return tab;
				return {
					...tab,
					turnContext: removeGraphSelectionFromContext(tab.turnContext || nextContext),
					turnContextChips: normalizeMessageContextChips(tab.turnContextChips).filter((chip) => chip.type !== 'graph-node'),
					queuedContext: tab.queuedContext ? removeGraphSelectionFromContext(tab.queuedContext) : tab.queuedContext,
					queuedContextChips: normalizeMessageContextChips(tab.queuedContextChips).filter((chip) => chip.type !== 'graph-node'),
				};
			}));
		}

		useEffect(() => {
			const applyContext = (value) => {
				const normalized = normalizeTurnContext(value);
				turnContextRef.current = normalized;
				setTurnContext(normalized);
			};
			const clearContext = () => applyContext(null);
			const handleMessage = (event) => {
				if (!isTrustedHostMessageEvent(event)) return;
				const data = event.data || {};
				if (!data || typeof data.type !== 'string') return;
				if (data.type === 'claudian-sidebar:set-context') {
					applyContext(data.payload || data.context || {});
				}
				if (data.type === 'claudian-sidebar:clear-context') {
					clearContext();
				}
				if (data.type === 'pdf-ai-shell-start-task') {
					startShellTaskFromPayload(data.payload || {});
				}
				if (data.type === 'pdf-ai-shell-fill-composer') {
					fillComposerFromShellPayload(data.payload || {});
				}
				if (data.type === 'pdf-ai-shell-clear-graph-context') {
					clearGraphSelectionFromShellPayload(data.payload || {});
				}
				if (data.type === 'pdf-ai-shell-context') {
					const payload = data.payload || {};
					if (payload.includeAttachmentContext === true || payload.selection) {
						const normalizedPdf = normalizePdfAiShellPayload(payload);
						setPdfShellContext(normalizedPdf);
						setIncludePdfSelection(!!normalizedPdf.selection);
						applyContext(null);
					}
					else {
						applyContext(normalizePdfAiShellContext(payload));
					}
				}
				if (data.type === 'pdf-ai-shell-theme') {
					const nextTheme = parseExplicitTheme(data.payload?.theme);
					const nextLocale = parseExplicitLocale(data.payload?.locale || data.payload?.lang);
					if (!nextTheme && !nextLocale) return;
					setSettings((current) => {
						const currentTheme = parseExplicitTheme(current?.theme);
						const currentLocale = parseExplicitLocale(current?.locale);
						if ((!nextTheme || currentTheme === nextTheme) && (!nextLocale || currentLocale === nextLocale)) return current;
						const nextSettings = {
							...current,
							...(nextTheme ? { theme: nextTheme } : {}),
							...(nextLocale ? { locale: nextLocale } : {}),
						};
						settingsRef.current = nextSettings;
						return nextSettings;
					});
				}
				if (data.type === 'pdf-ai-shell-settings') {
					const nextFontSize = Number(data.payload?.sidebarFontSize);
					if (!Number.isFinite(nextFontSize)) return;
					setSettings((current) => {
						const sidebarFontSize = normalizeSidebarFontSize(nextFontSize);
						if (current.sidebarFontSize === sidebarFontSize) return current;
						const nextSettings = { ...current, sidebarFontSize };
						settingsRef.current = nextSettings;
						return nextSettings;
					});
				}
			};
			window.addEventListener('message', handleMessage);
			window.claudianSidebarContext = {
				setContext: applyContext,
				clearContext,
				getContext: () => turnContextRef.current,
				getQueuedContext: () => {
					const active = tabs.find((tab) => tab.id === actualActiveTabId);
					return active?.queuedContext || null;
				},
			};
			return () => {
				window.removeEventListener('message', handleMessage);
				if (window.claudianSidebarContext?.setContext === applyContext) {
					delete window.claudianSidebarContext;
				}
			};
		}, [actualActiveTabId, tabs, turnContext]);

		useEffect(() => {
			let mounted = true;
			if (!api?.getState) return undefined;
			api.getState().then((state) => {
				if (!mounted) return;
				if (!state?.settings) {
					setRuntimeStateLoaded(true);
					return;
				}
				const providerAssets = state.providerAssetsLoaded ? state.providerAssets : null;
				const urlSettings = readUrlSettingsOverride();
				const effectiveWorkspace = hasUrlWorkspaceOverride()
					? (urlSettings.workspace || initialStateRef.current.settings.workspace || '')
					: (state.settings.workspace || initialStateRef.current.settings.workspace || '');
				const stateAssetsMatchWorkspace = providerAssetsMatchWorkspace(providerAssets, effectiveWorkspace);
				providerAssetsLoadedRef.current = state.providerAssetsLoaded === true && stateAssetsMatchWorkspace;
				setSettings((current) => {
				const runtimePatch = {
					workspace: hasUrlWorkspaceOverride() ? current.workspace : (state.settings.workspace || current.workspace),
					llmProviderMode: 'native-cli',
					effort: normalizeSidebarEffort(state.settings.effort ?? current.effort),
					sidebarFontSize: state.settings.sidebarFontSize ?? current.sidebarFontSize,
					openaiModel: state.settings.openaiModel ?? current.openaiModel,
					codexPath: state.settings.codexPath ?? current.codexPath,
					claudePath: state.settings.claudePath ?? current.claudePath,
					modelSelectionSource: state.settings.modelSelectionSource ?? current.modelSelectionSource,
					claudeCustomModels: state.settings.claudeCustomModels ?? current.claudeCustomModels,
					codexCustomModels: state.settings.codexCustomModels ?? current.codexCustomModels,
					claudeHiddenCommands: state.settings.claudeHiddenCommands ?? current.claudeHiddenCommands,
					codexHiddenCommands: state.settings.codexHiddenCommands ?? current.codexHiddenCommands,
						...(['codex', 'claude'].includes(current.runtimeMode) ? { model: state.settings.model || current.model } : {}),
					};
					const next = normalizeSidebarSettings({ ...current, ...runtimePatch });
					const merged = providerAssetsHaveAny(providerAssets) && stateAssetsMatchWorkspace
						? mergeProviderAssetsIntoSettings(next, providerAssets, {
							forceEmpty: true,
							preserveExistingEmptyAssets: shouldResetPersistedMockState(),
						})
						: next;
					settingsRef.current = merged;
					return merged;
				});
				if (providerAssetsHaveAny(providerAssets) && !stateAssetsMatchWorkspace) {
					logRendererEvent('settings.providerAssets.initial.skipped', {
						expectedWorkspace: effectiveWorkspace,
						assetWorkspace: providerAssets?.workspace || '',
						summary: summarizeProviderAssetsForLog(providerAssets),
					});
				}
				if (!stateAssetsMatchWorkspace && effectiveWorkspace && api?.loadProviderAssets) {
					api.loadProviderAssets({ workspace: effectiveWorkspace }).then((result) => {
						if (!mounted || !result?.ok || !result.assets) return;
						providerAssetsLoadedRef.current = true;
						setSettings((current) => mergeProviderAssetsIntoSettings(current, result.assets, {
							forceEmpty: true,
							preserveExistingEmptyAssets: shouldResetPersistedMockState(),
						}));
					}).catch(() => {});
				}
				if (Array.isArray(state.nativeHistories) && state.nativeHistories.length > 0) {
					setHistories((current) => mergeNativeHistories(current, state.nativeHistories, 40));
				}
				if (state.mcpServersLoaded && Array.isArray(state.mcpServers)) {
					setMcpServers(state.mcpServers.map(normalizeMcpServer));
				}
				setRuntimeStatus(state.status || { detail: 'Runtime ready' });
				if (state.logPath) {
					setRuntimeLogPath(state.logPath);
					logRendererEvent('runtime.logPath', { logPath: state.logPath });
				}
				if (state.diagnostics) {
					setRuntimeDiagnostics(state.diagnostics);
				}
				setRuntimeStateLoaded(true);
			}).catch(() => {
				if (mounted) setRuntimeStateLoaded(true);
			});
			return () => {
				mounted = false;
			};
		}, []);

		useEffect(() => {
			if (drawerOpen && api?.getDiagnostics) {
				void refreshRuntimeDiagnostics({ quiet: true });
			}
		}, [drawerOpen]);

		useEffect(() => {
			if (!api?.onEvent) return undefined;
			return api.onEvent((event) => {
				const chunkType = event?.chunk?.type || '';
				if (event?.type !== 'chunk' || ['usage', 'context_compacted', 'tool_use', 'tool_result', 'plan', 'plan_update', 'plan_completed'].includes(chunkType)) {
					logRendererEvent('runtime.event', summarizeRendererRuntimeEvent(event));
				}
				if (event.type === 'context' || event.type === 'context-update') {
					const normalized = normalizeTurnContext(event.context || event.payload || event);
					turnContextRef.current = normalized;
					setTurnContext(normalized);
					return;
				}
				if (event.type === 'context-clear') {
					turnContextRef.current = normalizeTurnContext(null);
					setTurnContext(turnContextRef.current);
					return;
				}
				if (event.type === 'sidebar-mode') {
					setSidebarMode(event.mode === 'notes' || event.mode === 'figures' ? event.mode : 'ai');
					const nextLocale = parseExplicitLocale(event.locale);
					if (nextLocale) {
						setSettings((current) => {
							if (parseExplicitLocale(current?.locale) === nextLocale) return current;
							const nextSettings = { ...current, locale: nextLocale };
							settingsRef.current = nextSettings;
							return nextSettings;
						});
					}
					return;
				}
				if (event.type === 'feature-guide-menu') {
					setSidebarMode('ai');
					setFeatureGuideAction({ type: 'menu', token: `${Date.now()}-${Math.random()}` });
					return;
				}
				if (event.type === 'markdown-note-state') {
					const nextFilePath = String(event.filePath || '').trim();
					const nextOpen = event.open === true;
					setMarkdownNoteTab({
						fileName: String(event.fileName || '').trim() || 'Markdown',
						filePath: nextFilePath,
						open: nextOpen,
						dirty: event.dirty === true,
						saving: event.saving === true,
					});
					return;
				}
				if (event.type === 'settings' && event.settings) {
					setSettings((current) => {
						const next = normalizeSidebarSettings({
							...current,
							effort: event.settings.effort ?? current.effort,
						codexPath: event.settings.codexPath ?? current.codexPath,
						claudePath: event.settings.claudePath ?? current.claudePath,
						});
						settingsRef.current = next;
						return next;
					});
					if (event.status) {
						setRuntimeStatus(event.status);
					}
					return;
				}
				if (event.type === 'sessions-invalidated') {
					const provider = event.provider || event.providerId;
					if (provider === 'codex') {
						setTabs((current) => current.map((tab) => clearInvalidatedProviderRuntimeState(tab, 'codex')));
						setHistories((current) => current.map((entry) => clearInvalidatedProviderRuntimeState(entry, 'codex')));
						setRuntimeStatus({
							status: 'ready',
							detail: event.detail || 'Codex sessions invalidated',
						});
					}
					return;
				}
				const targetTabId = resolveRuntimeEventTabIdFromTabs(event, tabsRef.current, {
					runtimeTabId: runtimeTabIdRef.current,
					activeTabId: activeTabIdRef.current,
				});
				const targetTab = targetTabId ? (tabsRef.current || []).find((tab) => tab.id === targetTabId) : null;
				if (isTabScopedRuntimeEvent(event) && shouldDropRuntimeEventForTab(event, targetTab, { runtimeTabId: runtimeTabIdRef.current })) {
					logRendererEvent('runtime.event.dropped', {
						...summarizeRendererRuntimeEvent(event),
						targetTabId,
						targetTabStreaming: targetTab?.isStreaming === true,
						runtimeTabId: runtimeTabIdRef.current || '',
					});
					if (event.type === 'done' && (!runtimeTabIdRef.current || runtimeTabIdRef.current === targetTabId)) {
						runtimeTabIdRef.current = null;
					}
					return;
				}
				if (isTabScopedRuntimeEvent(event) && !targetTabId) {
					logRendererEvent('runtime.event.unrouted', summarizeRendererRuntimeEvent(event));
					return;
				}
				if (event.type === 'provider-assets') {
					providerAssetsLoadedRef.current = true;
					if (event.assets) {
						setSettings((current) => mergeProviderAssetsIntoSettings(current, event.assets, {
							forceEmpty: true,
							preserveExistingEmptyAssets: shouldResetPersistedMockState(),
						}));
					}
					return;
				}
				if (event.type === 'native-histories') {
					if (Array.isArray(event.histories) && event.histories.length > 0) {
						setHistories((current) => mergeNativeHistories(current, event.histories, 40));
					}
					return;
				}
				if (event.type === 'diagnostics') {
					if (event.diagnostics) {
						setRuntimeDiagnostics(event.diagnostics);
					}
					return;
				}
				if (event.type === 'model') {
					const provider = event.provider || event.providerId || '';
					const model = String(event.model || '').trim();
					if (!model) return;
					if (targetTabId) {
						setTabs((current) => updateTab(current, targetTabId, (tab) => {
							const runtimeSettings = settingsRef.current || settings;
							const tabProvider = tab.runtimeProviderId || tab.providerId || modelToProvider(tab.model, runtimeSettings);
							if (provider && tabProvider !== provider) return tab;
							return {
								...tab,
								model,
								providerId: provider || tab.providerId,
								runtimeActualModel: model,
								usage: recalculateUsageForModel(tab.usage, model, runtimeSettings),
							};
						}));
					}
					return;
				}
				if (event.type === 'mcp-servers') {
					if (Array.isArray(event.servers)) {
						setMcpServers(event.servers.map(normalizeMcpServer));
					}
					return;
				}
				if (event.type === 'stderr') {
					return;
				}
				if (event.type === 'codex-download') {
					setCodexDownloadStatus({ ...event });
					if (event.stage === 'ready') {
						setTimeout(() => {
							setCodexDownloadStatus((current) => current?.stage === 'ready' ? null : current);
						}, 8000);
					}
					return;
				}
				if (event.type === 'status') {
					setRuntimeStatus({
						status: event.status || event.type,
						detail: event.detail || event.content || '',
					});
					return;
				}
				if (event.type === 'thread') {
					appendToTab(targetTabId, (tab) => ({
						...tab,
						runtimeSessionKey: event.sessionKey || tab.runtimeSessionKey || tab.historyId || tab.id,
						runtimeThreadId: event.threadId || tab.runtimeThreadId || null,
						runtimeProviderId: event.provider || tab.providerId || null,
						runtimeFork: event.threadId ? null : tab.runtimeFork,
					}));
					setRuntimeStatus({
						status: 'ready',
						detail: event.fork?.sourceThreadId
							? `Forked thread ${event.threadId}`
							: event.threadId ? `Thread ${event.threadId}` : 'Runtime thread ready',
					});
					return;
				}
				if (event.type === 'turn-started') {
					setRuntimeStatus({ status: 'running', detail: event.turnId || 'Turn started' });
					appendToTab(targetTabId, (tab) => {
						const next = updateLastAssistant(tab, (message) => ({
							...message,
							runtimeTurnId: event.turnId || message.runtimeTurnId || null,
							runtimeThreadId: event.threadId || tab.runtimeThreadId || message.runtimeThreadId || null,
							runtimeProviderId: tab.runtimeProviderId || tab.providerId || null,
						}));
						return { ...next, isStreaming: true };
					});
					return;
				}
				if (event.type === 'turn-metadata') {
					appendToTab(targetTabId, (tab) => updateLastAssistant(tab, (message) => applyRuntimeTurnMetadataToAssistant(message, {
						...event,
						threadId: event.threadId || tab.runtimeThreadId || message.runtimeThreadId || null,
					}, tab.runtimeProviderId || tab.providerId || '')));
					return;
				}
				if (event.type === 'user-metadata') {
					appendToTab(targetTabId, (tab) => updateLastUser(tab, (message) => ({
						...message,
						userMessageId: event.userMessageId || message.userMessageId,
						runtimeUserMessageId: event.userMessageId || message.runtimeUserMessageId || null,
						runtimeThreadId: event.threadId || tab.runtimeThreadId || message.runtimeThreadId || null,
						runtimeProviderId: tab.runtimeProviderId || tab.providerId || null,
					})));
					return;
				}
				if (event.type === 'chunk') {
					enqueueRuntimeChunk(targetTabId, event.chunk);
					return;
				}
				if (event.type === 'context_compacted') {
					enqueueRuntimeChunk(targetTabId, { type: 'context_compacted' });
					return;
				}
				if (event.type === 'approval') {
					const queuedChunks = takeRuntimeChunksForTab(targetTabId);
					logRendererEvent('runtime.approval.render', {
						tabId: targetTabId,
						queuedChunkCount: queuedChunks.length,
						approval: summarizeApprovalForLog(event.approval || {}),
					});
					appendToTab(targetTabId, (tab) => {
						const withChunks = applyRuntimeChunksToTab(tab, queuedChunks);
						return appendBlockToLastAssistant(removeRuntimeWaitingBlocksFromLastAssistant(withChunks), approvalToBlock(event.approval));
					});
					return;
				}
				if (event.type === 'approval_resolved') {
					flushRuntimeChunksNow();
					setTabs((current) => current.map((tab) => removeResolvedRuntimeApproval(tab, event)));
					setRuntimeStatus({ status: 'ready', detail: 'Pending request resolved by runtime' });
					return;
				}
				if (event.type === 'error') {
					const queuedChunks = takeRuntimeChunksForTab(targetTabId);
					appendToTab(targetTabId, (tab) => {
						const withChunks = applyRuntimeChunksToTab(tab, queuedChunks);
						const next = appendBlockToLastAssistant(removeRuntimeWaitingBlocksFromLastAssistant(withChunks), {
							type: 'text',
							id: makeId('runtime-error'),
							content: `Runtime error: ${event.content || 'Unknown error'}`,
						});
						return { ...next, isStreaming: false };
					});
					return;
				}
				if (event.type === 'done') {
					const queuedChunks = takeRuntimeChunksForTab(targetTabId);
					appendToTab(targetTabId, (tab) => {
						const withChunks = applyRuntimeChunksToTab(tab, queuedChunks);
						const withoutWaiting = removeRuntimeWaitingBlocksFromLastAssistant(withChunks);
						const completed = updateLastAssistant(withoutWaiting, (message) => completeRuntimeAssistantMessage(message, event));
						const doneTab = { ...completed, isStreaming: false };
						if (lastAssistantHasRenderableRuntimeContent(doneTab)) {
							return doneTab;
						}
						if (lastAssistantWasInterrupted(doneTab)) {
							return doneTab;
						}
						logRendererEvent('runtime.emptyResponse', {
							tabId: targetTabId,
							sessionKey: event.sessionKey || '',
							threadId: event.threadId || event.raw?.params?.threadId || '',
							turnId: event.turnId || event.raw?.params?.turnId || event.raw?.params?.turn?.id || '',
							queuedChunkCount: queuedChunks.length,
						});
						return appendRuntimeEmptyResponseDiagnostic(doneTab);
					});
					window.setTimeout(() => {
						reportShellTaskTerminalState(targetTabId, event);
					}, 0);
					window.setTimeout(() => {
						setTabs((current) => {
							const finished = current.find((tab) => tab.id === targetTabId);
							const item = buildHistoryItem(finished ? { ...finished, isStreaming: false } : null);
							if (item) {
								setHistories((histories) => [item, ...histories.filter((entry) => entry.id !== item.id)].slice(0, 20));
							}
							return updateTab(current, targetTabId, (tab) => {
								if (tab.pendingNewSessionPlan) {
									return createPlanNewSessionTab(tab, tab.pendingNewSessionPlan, settingsRef.current || settings);
								}
								return item ? { ...tab, historyId: item.id, title: item.title } : tab;
							});
						});
					}, 0);
					runtimeTabIdRef.current = null;
				}
			});
		}, [actualActiveTabId]);

		useEffect(() => () => {
			timersRef.current.forEach((timer) => window.clearTimeout(timer));
			timersRef.current = [];
			clearRuntimeChunkSchedule();
			runtimeChunkQueueRef.current = [];
			if (persistenceTimerRef.current) {
				window.clearTimeout(persistenceTimerRef.current);
				persistenceTimerRef.current = null;
			}
		}, []);

		useEffect(() => {
			if (persistenceTimerRef.current) {
				window.clearTimeout(persistenceTimerRef.current);
			}
			persistenceTimerRef.current = window.setTimeout(() => {
				persistenceTimerRef.current = null;
				try {
					window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPersistedMockState({
						settings,
						tabs,
						activeTabId: actualActiveTabId,
						inputByTab,
						histories,
						externalPaths,
						mcpServers,
					})));
				}
				catch {
					// Local persistence is a convenience for mock verification only.
				}
			}, 250);
			return () => {
				if (persistenceTimerRef.current) {
					window.clearTimeout(persistenceTimerRef.current);
					persistenceTimerRef.current = null;
				}
			};
		}, [settings, tabs, actualActiveTabId, inputByTab, histories, externalPaths, mcpServers]);

		const setInput = useCallback((valueOrUpdater) => {
			setInputByTab((current) => {
				const currentValue = current[actualActiveTabId] || '';
				const nextValue = typeof valueOrUpdater === 'function' ? valueOrUpdater(currentValue) : valueOrUpdater;
				return { ...current, [actualActiveTabId]: nextValue };
			});
		}, [actualActiveTabId]);

		const requestPdfSnippetsRefresh = useCallback(() => {
			if (!api?.getMineruWorkspaceTrees) {
				logRendererEvent('pdf.workspaceTree.load.error', {
					message: 'getMineruWorkspaceTrees API is unavailable',
				});
				return Promise.resolve(null);
			}
			const activeProjectID = currentPdfSelection?.projectID || pdfShellContext?.document?.projectID || '';
			const activeSourcePath = currentPdfSelection?.filePath
				|| currentPdfSelection?.sourcePath
				|| pdfShellContext?.document?.filePath
				|| pdfShellContext?.document?.sourcePath
				|| '';
			const workspaceId = pdfShellContext?.workspaceId || '';
			const workspaceRootDir = pdfShellContext?.workspaceRootDir || settings.workspace || '';
			const requestKey = [workspaceId, workspaceRootDir, activeProjectID, activeSourcePath].join('|');
			if (pdfWorkspacePendingRef.current && pdfWorkspacePendingKeyRef.current === requestKey) {
				return pdfWorkspacePendingRef.current;
			}
			pdfWorkspacePendingKeyRef.current = requestKey;
			logRendererEvent('pdf.workspaceTree.load.request', {
				workspaceId,
				hasWorkspaceRootDir: !!workspaceRootDir,
				activeProjectID,
				hasActiveSourcePath: !!activeSourcePath,
			});
			pdfWorkspacePendingRef.current = api.getMineruWorkspaceTrees({
				activeProjectID,
				activeSourcePath,
				workspaceId,
				workspaceRootDir,
			})
				.then((payload) => {
					const nextPayload = payload && typeof payload === 'object' ? payload : null;
					if (pdfWorkspacePendingKeyRef.current === requestKey) {
						setPdfWorkspaceTree(nextPayload);
					}
					const papers = Array.isArray(nextPayload?.papers) ? nextPayload.papers : [];
					const activePaper = papers.find((paper) => paper?.isActive) || papers[0] || null;
					logRendererEvent('pdf.workspaceTree.load.result', {
						workspaceId: nextPayload?.workspaceId || workspaceId,
						paperCount: papers.length,
						activeProjectID: nextPayload?.activeProjectID || activeProjectID,
						activePaperHasTree: !!activePaper?.tree,
						activePaperChildCount: Array.isArray(activePaper?.tree?.children) ? activePaper.tree.children.length : 0,
						stats: papers.slice(0, 8).map((paper) => ({
							projectID: paper?.projectID || '',
							isActive: paper?.isActive === true,
							textCount: Number(paper?.stats?.textCount || 0) || 0,
							imageCount: Number(paper?.stats?.imageCount || 0) || 0,
							tableCount: Number(paper?.stats?.tableCount || 0) || 0,
							equationCount: Number(paper?.stats?.equationCount || 0) || 0,
							referenceCount: Number(paper?.stats?.referenceCount || 0) || 0,
						})),
					});
					return nextPayload;
				})
				.catch((error) => {
					logRendererEvent('pdf.workspaceTree.load.error', {
						message: error instanceof Error ? error.message : String(error),
					});
					return null;
				})
				.finally(() => {
					if (pdfWorkspacePendingKeyRef.current === requestKey) {
						pdfWorkspacePendingRef.current = null;
					}
				});
			return pdfWorkspacePendingRef.current;
		}, [
			currentPdfSelection?.filePath,
			currentPdfSelection?.projectID,
			currentPdfSelection?.sourcePath,
			pdfShellContext?.document?.filePath,
			pdfShellContext?.document?.projectID,
			pdfShellContext?.document?.sourcePath,
			pdfShellContext?.workspaceId,
			pdfShellContext?.workspaceRootDir,
			settings.workspace,
		]);

		useEffect(() => {
			const hasPdfContext = !!(
				pdfShellContext?.workspaceId
				|| pdfShellContext?.workspaceRootDir
				|| pdfShellContext?.document?.projectID
				|| pdfShellContext?.document?.filePath
				|| currentPdfSelection?.projectID
				|| currentPdfSelection?.filePath
			);
			if (!hasPdfContext) return;
			requestPdfSnippetsRefresh();
		}, [
			currentPdfSelection?.filePath,
			currentPdfSelection?.projectID,
			pdfShellContext?.document?.filePath,
			pdfShellContext?.document?.projectID,
			pdfShellContext?.workspaceId,
			pdfShellContext?.workspaceRootDir,
			requestPdfSnippetsRefresh,
		]);

		function dismissPdfSelection() {
			setIncludePdfSelection(false);
		}

		function dismissGraphSelection() {
			const nextContext = normalizeTurnContext(removeGraphSelectionFromContext(turnContextRef.current));
			turnContextRef.current = nextContext;
			setTurnContext(nextContext);
			if (!actualActiveTabId) return;
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
				...tab,
				turnContext: removeGraphSelectionFromContext(tab.turnContext || nextContext),
				turnContextChips: normalizeMessageContextChips(tab.turnContextChips).filter((chip) => chip.type !== 'graph-node'),
			})));
		}

		function addPdfSnippet(snippet) {
			if (!actualActiveTabId || !snippet?.content) return;
			const chip = {
				...snippet,
				id: snippet.id || `pdf-${snippet.token || snippet.name || makeId('snippet')}`,
			};
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => {
				const existing = tab.pdfSnippetChips || [];
				const key = pdfSnippetSelectionKey(chip);
				if (existing.some((entry) => pdfSnippetSelectionKey(entry) === key)) return tab;
				return { ...tab, pdfSnippetChips: [...existing, chip] };
			}));
		}

		function removePdfSnippet(chipId) {
			if (!actualActiveTabId) return;
			const key = String(chipId || '').trim().toLowerCase();
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
				...tab,
				pdfSnippetChips: (tab.pdfSnippetChips || []).filter((chip) => pdfSnippetSelectionKey(chip) !== key),
			})));
		}

		function clearPdfSnippets() {
			if (!actualActiveTabId) return;
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
				...tab,
				pdfSnippetChips: [],
			})));
		}

		function attachMentionFile(item) {
			if (!actualActiveTabId) return;
			const chipPath = item.absolutePath || item.path || item.name;
			if (!chipPath) return;
			const chip = {
				type: item.type || 'file',
				path: chipPath,
				name: item.type === 'context-file' ? item.name : pathBaseName(chipPath),
			};
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => {
				const existing = tab.fileChips || [];
				if (existing.some((entry) => entry.path === chip.path)) return tab;
				return { ...tab, fileChips: [...existing, chip] };
			}));
		}

		function removeMentionFile(pathText) {
			if (!actualActiveTabId) return;
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
				...tab,
				fileChips: (tab.fileChips || []).filter((chip) => chip.path !== pathText),
			})));
		}

		function mentionMcpServer(name) {
			if (!actualActiveTabId || !name) return;
			const active = tabs.find((tab) => tab.id === actualActiveTabId);
			if (!supportsMcpToolsForProvider(active?.providerId)) return;
			setMcpServers((current) => {
				const hasServer = current.some((server) => server.name === name);
				const next = current.map((server) => server.name === name ? { ...server, enabled: true, contextSaving: true } : server);
				return hasServer ? next.map(normalizeMcpServer) : [...next, normalizeMcpServer({ name, enabled: true, contextSaving: true })];
			});
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => {
				const existing = tab.mcpMentions || [];
				if (existing.some((entry) => entry.name === name)) return tab;
				return { ...tab, mcpMentions: [...existing, { type: 'mcp-server', name }] };
			}));
		}

		function removeMcpMention(name) {
			if (!actualActiveTabId) return;
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
				...tab,
				mcpMentions: (tab.mcpMentions || []).filter((chip) => chip.name !== name),
			})));
		}

		function mentionAgent(agent) {
			if (!actualActiveTabId || !agent?.id) return;
			const active = tabs.find((item) => item.id === actualActiveTabId);
			if (agent.providerId && active?.providerId && agent.providerId !== active.providerId) return;
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => {
				const existing = tab.agentChips || [];
				if (existing.some((entry) => entry.id === agent.id)) return tab;
				return {
					...tab,
					agentChips: [...existing, {
						type: 'agent',
						id: agent.id,
						name: agent.name || agent.id,
						description: agent.description || '',
						providerId: agent.providerId || tab.providerId,
					}],
				};
			}));
		}

		function removeAgentMention(agentId) {
			if (!actualActiveTabId) return;
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
				...tab,
				agentChips: (tab.agentChips || []).filter((chip) => chip.id !== agentId),
			})));
		}

		function attachImages(images) {
			if (!actualActiveTabId || !Array.isArray(images) || images.length === 0) return;
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => {
				const existing = tab.imageChips || [];
				const known = new Set(existing.map((image) => image.id));
				const nextImages = images.filter((image) => image?.id && !known.has(image.id));
				return nextImages.length ? { ...tab, imageChips: [...existing, ...nextImages] } : tab;
			}));
		}

		function removeImage(imageId) {
			if (!actualActiveTabId) return;
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
				...tab,
				imageChips: (tab.imageChips || []).filter((image) => image.id !== imageId),
			})));
		}

		function openInstructionModal(rawInstruction) {
			const normalized = normalizeInstructionInput(rawInstruction);
			if (!normalized) return;
			setInstructionModal({ id: makeId('instruction'), rawInstruction: normalized });
			setRuntimeStatus({ detail: isProviderRuntimeMode(settings.runtimeMode) ? 'Refining custom instruction with provider' : 'Refining custom instruction in mock mode' });
		}

		function acceptInstruction(finalInstruction) {
			const snippet = String(finalInstruction || '').trim();
			if (!snippet) {
				setInstructionModal(null);
				return;
			}
			if (isProviderRuntimeMode(settings.runtimeMode)) {
				api?.cancelInstructionRefine?.().catch(() => {});
			}
			setSettings((current) => ({
				...current,
				systemPrompt: appendMarkdownSnippet(current.systemPrompt, snippet),
			}));
			setInstructionModal(null);
			setRuntimeStatus({ detail: 'Instruction added to custom system prompt' });
		}

		function rejectInstruction() {
			if (isProviderRuntimeMode(settings.runtimeMode)) {
				api?.cancelInstructionRefine?.().catch(() => {});
			}
			setInstructionModal(null);
			setRuntimeStatus({ detail: 'Instruction mode cancelled' });
		}

		function closeInstructionWithError(message) {
			const detail = String(message || 'Failed to refine instruction');
			if (isProviderRuntimeMode(settings.runtimeMode)) {
				api?.cancelInstructionRefine?.().catch(() => {});
			}
			setInstructionModal(null);
			setRuntimeStatus({ status: 'error', detail });
		}

		function clearQueuedMessage() {
			if (!actualActiveTabId) return;
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
				...tab,
				queuedText: '',
				queuedDisplayText: '',
				queuedContextChips: [],
				queuedImages: [],
				queuedContext: null,
			})));
		}

		function editQueuedMessage(snapshotText = '', snapshotImages = [], draftText = '') {
			if (!actualActiveTabId) return;
			const tab = tabs.find((item) => item.id === actualActiveTabId);
			const queuedText = String(snapshotText || tab?.queuedText || '');
			const queuedImages = Array.isArray(snapshotImages) && snapshotImages.length ? snapshotImages : (tab?.queuedImages || []);
			const composerDraft = String(draftText || inputByTab[actualActiveTabId] || '');
			if (!queuedText && !queuedImages.length) return;
			setInput(appendMarkdownSnippet(queuedText, composerDraft));
			setTabs((current) => updateTab(current, actualActiveTabId, (draft) => ({
				...draft,
				imageChips: [...queuedImages, ...(draft.imageChips || [])],
				queuedText: '',
				queuedDisplayText: '',
				queuedContextChips: [],
				queuedImages: [],
				queuedContext: null,
			})));
		}

		async function steerQueuedMessage() {
			if (!actualActiveTabId) return;
			const tab = tabs.find((item) => item.id === actualActiveTabId);
			if (!tab?.queuedText && !tab?.queuedImages?.length) return;
			if (!supportsTurnSteerForProvider(tab.providerId)) {
				setRuntimeStatus({ detail: 'Turn steer is not supported by this provider' });
				return;
			}
			const preview = queuedPreview(tab.queuedDisplayText || tab.queuedText, tab.queuedImages);
			if (settings.runtimeMode === 'codex' && api?.steerTurn) {
				const runtimeSettings = buildRuntimeSettings(tab, settings);
				setRuntimeStatus({ status: 'running', detail: `Steering queued Codex message: ${preview}` });
				try {
					if (api.updateSettings) {
						await api.updateSettings(runtimeSettings);
					}
					const result = await api.steerTurn({
						text: tab.queuedText || '',
						images: tab.queuedImages || [],
						sessionKey: getRuntimeSessionKey(tab),
						threadId: tab.runtimeThreadId || '',
						turnId: tab.runtimeTurnId || '',
						model: runtimeSettings.model,
						effort: runtimeSettings.effort,
						reasoningSummary: runtimeSettings.reasoningSummary,
						...turnContextPayload(tab.queuedContext || turnContextRef.current),
					});
					if (!result?.ok) {
						throw new Error(result?.error || 'Codex did not accept the queued message');
					}
					setTabs((current) => updateTab(current, actualActiveTabId, (draft) => ({
						...draft,
						queuedText: '',
						queuedDisplayText: '',
						queuedContextChips: [],
						queuedImages: [],
						queuedContext: null,
					})));
					setRuntimeStatus({ status: 'running', detail: `Steered queued Codex message: ${preview}` });
					return;
				}
				catch (error) {
					setRuntimeStatus({
						status: 'error',
						detail: error instanceof Error ? error.message : String(error),
					});
					return;
				}
			}
			appendToTab(actualActiveTabId, (draft) => {
				const next = appendBlockToLastAssistant(draft, {
					type: 'text',
					id: makeId('steer'),
					content: `Steered queued message into the running mock turn: ${preview}`,
				});
				return { ...next, queuedText: '', queuedDisplayText: '', queuedContextChips: [], queuedImages: [], queuedContext: null };
			});
		}

		function schedule(fn, delay) {
			const timer = window.setTimeout(() => {
				timersRef.current = timersRef.current.filter((item) => item !== timer);
				fn();
			}, delay);
			timersRef.current.push(timer);
		}

		function speedDelay(base) {
			if (settings.mockSpeed === 'fast') return Math.max(80, base * 0.45);
			if (settings.mockSpeed === 'slow') return base * 1.8;
			return base;
		}

		function createTab() {
			setTabs((current) => {
				if (current.length >= configuredMaxTabs) return current;
				const next = createEmptyTab(current.length + 1, settings);
				setActiveTabId(next.id);
				return [...current, next];
			});
		}

		function countUserMessagesForForkTitle(messages) {
			return (messages || []).filter((message) => (
				message?.role === 'user'
				&& !message.isInterrupt
				&& !message.isRebuiltContext
			)).length;
		}

		function resolveForkTitleUserIndex(source, request) {
			const messages = source?.messages || [];
			if (request?.type === 'message') {
				const sourceIndex = messages.findIndex((message) => message.id === request.messageId);
				return sourceIndex >= 0 ? countUserMessagesForForkTitle(messages.slice(0, sourceIndex + 1)) : 0;
			}
			if (request?.type === 'all') {
				return countUserMessagesForForkTitle(messages) + 1;
			}
			return 0;
		}

		function buildForkTitle(sourceTitle, forkAtUserMessage) {
			const prefix = 'Fork: ';
			const suffix = forkAtUserMessage ? ` (#${forkAtUserMessage})` : '';
			const source = sourceTitle || 'New Chat';
			const maxSourceLength = Math.max(1, 50 - prefix.length - suffix.length);
			const truncated = source.length > maxSourceLength
				? `${source.slice(0, Math.max(1, maxSourceLength - 3))}...`
				: source;
			return `${prefix}${truncated}${suffix}`;
		}

		function getForkMessages(source, request) {
			if (request?.type === 'all') return source.messages.slice();
			const sourceIndex = source.messages.findIndex((message) => message.id === request?.messageId);
			return sourceIndex >= 0 ? source.messages.slice(0, sourceIndex) : source.messages.slice();
		}

		function findForkCheckpoint(messages, providerId) {
			for (let index = messages.length - 1; index >= 0; index -= 1) {
				const message = messages[index];
				const checkpoint = assistantCheckpointId(message, providerId);
				if (checkpoint) {
					return checkpoint;
				}
			}
			return '';
		}

		function findRewindContext(messages, userIndex, providerId) {
			let prevAssistantId = '';
			let prevRuntimeTurnId = '';
			for (let index = userIndex - 1; index >= 0; index -= 1) {
				const message = messages[index];
				if (message?.role === 'assistant') {
					prevRuntimeTurnId = message.runtimeTurnId || '';
					prevAssistantId = assistantCheckpointId(message, providerId);
					break;
				}
			}
			let hasResponse = false;
			for (let index = userIndex + 1; index < messages.length; index += 1) {
				const message = messages[index];
				if (message?.role === 'user') break;
				if (assistantCheckpointId(message, providerId)) {
					hasResponse = true;
					break;
				}
			}
			return { prevAssistantId, prevRuntimeTurnId, hasResponse };
		}

		function buildRuntimeFork(source, request, messages) {
			const providerId = source.runtimeProviderId || source.providerId;
			const sourceThreadId = source.runtimeThreadId || '';
			if (!providerId || !sourceThreadId) {
				return null;
			}
			const resumeAt = findForkCheckpoint(messages, providerId);
			if (request?.type === 'message' && !resumeAt) {
				return null;
			}
			return {
				providerId,
				sourceThreadId,
				resumeAt,
				sourceSessionKey: getRuntimeSessionKey(source),
			};
		}

		function requestForkFromMessage(messageId) {
			const source = tabs.find((tab) => tab.id === actualActiveTabId);
			if (!source || source.isStreaming) {
				setRuntimeStatus({ detail: 'Cannot fork while streaming' });
				return;
			}
			const index = source.messages.findIndex((message) => message.id === messageId);
			const forkContext = findRewindContext(source.messages, index, source.runtimeProviderId || source.providerId);
			if (index < 0 || !forkContext.hasResponse || !forkContext.prevAssistantId) {
				setRuntimeStatus({ detail: 'Cannot fork: no completed response after this message' });
				return;
			}
			setForkRequest({ type: 'message', messageId });
		}

		function requestForkAll() {
			const source = tabs.find((tab) => tab.id === actualActiveTabId);
			if (!source) return;
			if (source.isStreaming) {
				setRuntimeStatus({ detail: 'Cannot fork while streaming' });
				return;
			}
			if (source.messages.length === 0) {
				setRuntimeStatus({ detail: 'Cannot fork: no messages in conversation' });
				return;
			}
			setForkRequest({ type: 'all' });
		}

		function performFork(target) {
			const request = forkRequest;
			setForkRequest(null);
			const source = tabs.find((tab) => tab.id === actualActiveTabId);
			if (!source || !request) return;
			const messages = getForkMessages(source, request);
			const runtimeFork = buildRuntimeFork(source, request, messages);
			const title = buildForkTitle(source.title || 'New Chat', resolveForkTitleUserIndex(source, request));
			if (target === 'current-tab') {
				setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
					...tab,
					title,
					messages,
					historyId: makeId('fork-current'),
					runtimeSessionKey: makeId('fork-session'),
					runtimeThreadId: null,
					runtimeProviderId: runtimeFork?.providerId || source.runtimeProviderId || source.providerId || null,
					runtimeFork,
					runtimeResumeAt: null,
					isStreaming: false,
					queuedText: '',
					queuedDisplayText: '',
					queuedContextChips: [],
					queuedImages: [],
				})));
				setRuntimeStatus({ detail: runtimeFork ? 'Forked in current tab' : 'Forked in current tab (local transcript)' });
				return;
			}
			setTabs((current) => {
				if (current.length >= configuredMaxTabs) {
					setRuntimeStatus({ detail: `Cannot fork: maximum ${configuredMaxTabs} tabs reached` });
					return current;
				}
				const next = {
					...createEmptyTab(current.length + 1, settings),
					title,
					providerId: source.providerId,
					model: source.model,
					messages,
					usage: source.usage,
					fileChips: [...(source.fileChips || [])],
					agentChips: [...(source.agentChips || [])],
					mcpMentions: [...(source.mcpMentions || [])],
					imageChips: [...(source.imageChips || [])],
					pdfSnippetChips: [...(source.pdfSnippetChips || [])],
					runtimeSessionKey: makeId('fork-session'),
					runtimeThreadId: null,
					runtimeProviderId: runtimeFork?.providerId || source.runtimeProviderId || source.providerId || null,
					runtimeFork,
					runtimeResumeAt: null,
				};
				setActiveTabId(next.id);
				setRuntimeStatus({ detail: runtimeFork ? 'Forked conversation' : 'Forked conversation (local transcript)' });
				return [...current, next];
			});
		}

		async function rewindToMessage(messageId, mode) {
			const source = tabs.find((tab) => tab.id === actualActiveTabId);
			if (!source) return;
			if (source.isStreaming) {
				setRuntimeStatus({ detail: 'Cannot rewind while streaming' });
				return;
			}
			if (source.providerId === 'codex' || source.runtimeProviderId === 'codex') {
				setRuntimeStatus({ detail: 'Rewind is not supported by Codex' });
				return;
			}
			const index = source.messages.findIndex((message) => message.id === messageId);
			if (index < 0) {
				setRuntimeStatus({ detail: 'Cannot rewind: message not found' });
				return;
			}
			const user = source.messages[index];
			const rewind = findRewindContext(source.messages, index, source.runtimeProviderId || source.providerId);
			if (!rewind.hasResponse) {
				setRuntimeStatus({ detail: 'Cannot rewind: no completed response after this message' });
				return;
			}
			const shouldResumeRuntime = (settings.runtimeMode === 'claude' || source.runtimeProviderId === 'claude')
				&& source.runtimeThreadId
				&& rewind.prevAssistantId;
			let fileRewindSummary = '';
			if (mode !== 'conversation') {
				const userMessageId = user.runtimeUserMessageId || user.userMessageId || '';
				if (!shouldResumeRuntime || !userMessageId) {
					setRuntimeStatus({ status: 'failed', detail: 'Cannot rewind files: Claude runtime checkpoint is missing' });
					return;
				}
				if (!api?.rewindClaudeFiles) {
					setRuntimeStatus({ status: 'failed', detail: 'Claude file rewind runtime is unavailable' });
					return;
				}
				let result = null;
				try {
					const runtimeSettings = buildRuntimeSettings(source, settings);
					if (api.updateSettings) {
						await api.updateSettings(runtimeSettings);
					}
					setRuntimeStatus({ status: 'running', detail: 'Rewinding Claude file changes' });
					result = await api.rewindClaudeFiles({
						provider: 'claude',
						threadId: source.runtimeThreadId,
						userMessageId,
					});
				}
				catch (error) {
					setRuntimeStatus({ status: 'failed', detail: `File rewind failed: ${error instanceof Error ? error.message : String(error)}` });
					return;
				}
				if (!result?.ok) {
					setRuntimeStatus({ status: 'failed', detail: `File rewind failed: ${result?.error || 'Unknown error'}` });
					return;
				}
				fileRewindSummary = result.summary || 'Claude files rewound';
			}
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => {
				return {
					...tab,
					messages: tab.messages.slice(0, index),
					isStreaming: false,
					queuedText: '',
					queuedDisplayText: '',
					queuedContextChips: [],
					queuedImages: [],
					runtimeResumeAt: shouldResumeRuntime ? rewind.prevAssistantId : null,
				};
			}));
			setInput(user.displayContent || user.content || '');
			if (mode === 'conversation') {
				setRuntimeStatus({ detail: shouldResumeRuntime ? `Rewound conversation to ${rewind.prevAssistantId}` : 'Rewound conversation only' });
			}
			else {
				setRuntimeStatus({
					detail: shouldResumeRuntime
						? `${fileRewindSummary}; rewound conversation to ${rewind.prevRuntimeTurnId}`
						: fileRewindSummary || 'Rewound code and conversation',
				});
			}
		}

		function closeTab(tabId) {
			const closingTab = tabs.find((tab) => tab.id === tabId);
			if (closingTab?.isStreaming) {
				timersRef.current.forEach((timer) => window.clearTimeout(timer));
				timersRef.current = [];
				if (runtimeTabIdRef.current === tabId) {
					api?.cancelTurn?.().catch(() => {});
					runtimeTabIdRef.current = null;
				}
			}
			api?.cancelTitleGeneration?.({ conversationId: tabId }).catch(() => {});
			setTabs((current) => {
				if (current.length <= 1) return current;
				const index = current.findIndex((tab) => tab.id === tabId);
				const next = current.filter((tab) => tab.id !== tabId);
				if (activeTabId === tabId) {
					setActiveTabId(next[Math.max(0, index - 1)]?.id || next[0]?.id);
				}
				return next;
			});
		}

		function newConversation() {
			api?.cancelTitleGeneration?.({ conversationId: actualActiveTabId }).catch(() => {});
			setExternalPaths((current) => current.filter((item) => item.persistent));
			turnContextRef.current = normalizeTurnContext(null);
			setTurnContext(turnContextRef.current);
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
				...createEmptyTab(tab.index, settings),
				id: tab.id,
				index: tab.index,
				providerId: tab.providerId,
				model: tab.model,
				runtimeSessionKey: null,
				runtimeThreadId: null,
				runtimeProviderId: null,
				runtimeFork: null,
				runtimeResumeAt: null,
			})));
			setInput('');
		}

		function addExternalContext(pathText) {
			const normalizedPath = normalizeExternalContextPath(pathText);
			if (!normalizedPath) {
				return { success: false, error: 'No path provided. Usage: /add-dir /absolute/path' };
			}
			if (!isAbsoluteExternalContextPath(normalizedPath)) {
				return { success: false, error: 'Path must be absolute. Usage: /add-dir /absolute/path' };
			}
			const conflict = findExternalContextConflict(normalizedPath, externalPaths);
			if (conflict) {
				return { success: false, error: formatExternalContextConflict(normalizedPath, conflict) };
			}
			setExternalPaths((current) => [...current, { path: normalizedPath, persistent: false }]);
			return { success: true, normalizedPath };
		}

		async function pickExternalContext() {
			let selectedPath = '';
			if (typeof window.__claudianMockPickWorkspacePath === 'string') {
				selectedPath = window.__claudianMockPickWorkspacePath;
			}
			else if (api?.pickWorkspace) {
				try {
					const result = await api.pickWorkspace();
					selectedPath = result?.ok ? result.path || '' : '';
				}
				catch {
					selectedPath = '';
				}
			}
			else {
				selectedPath = settings.workspace || getDefaultWorkspacePath();
			}
			if (!selectedPath) {
				setRuntimeStatus({ detail: 'External context picker cancelled' });
				return;
			}
			const result = addExternalContext(selectedPath);
			setRuntimeStatus({
				status: result.success ? 'ready' : 'error',
				detail: result.success ? `Added external context: ${result.normalizedPath}` : result.error,
			});
		}

		function buildHistoryItem(tab) {
			if (!tab?.messages?.length) return null;
			const firstUser = tab.messages.find((message) => message.role === 'user');
			const fallbackTitle = buildConversationTitle(settings, firstUser?.content || '', firstUser?.images || []);
			const title = tab.title && tab.title !== 'New Chat' ? tab.title : fallbackTitle;
			const now = Date.now();
			const previous = histories.find((entry) => entry.id === tab.historyId);
			return {
				id: tab.historyId || makeId('hist'),
				title,
				date: new Date(now).toLocaleString([], { hour: '2-digit', minute: '2-digit' }),
				createdAt: previous?.createdAt || now,
				lastResponseAt: now,
				messages: tab.messages,
				providerId: tab.providerId,
				model: tab.model,
				runtimeSessionKey: tab.runtimeSessionKey || tab.id,
				runtimeThreadId: tab.runtimeThreadId || null,
				runtimeProviderId: tab.runtimeProviderId || tab.providerId || null,
				runtimeFork: tab.runtimeFork || null,
				runtimeResumeAt: tab.runtimeResumeAt || null,
				titleGenerationProvider: tab.titleGenerationProvider || '',
				titleGenerationModel: tab.titleGenerationModel || settings.titleGenerationModel || '',
				autoTitleEnabled: settings.enableAutoTitleGeneration !== false,
			};
		}

		function renameHistory(id, title) {
			const nextTitle = String(title || '').trim();
			if (!id || !nextTitle) return;
			setHistories((current) => current.map((entry) => (
				entry.id === id ? { ...entry, title: nextTitle, titleGenerationStatus: 'manual' } : entry
			)));
			setTabs((current) => current.map((tab) => (
				tab.historyId === id ? { ...tab, title: nextTitle } : tab
			)));
			setRuntimeStatus({ detail: 'Conversation renamed' });
		}

		function deleteHistory(id) {
			if (!id) return;
			const runningTab = tabs.find((tab) => tab.historyId === id && tab.isStreaming);
			if (runningTab) {
				setRuntimeStatus({ detail: 'Cannot delete a running conversation' });
				return;
			}
			setHistories((current) => current.filter((entry) => entry.id !== id));
			setTabs((current) => current.map((tab) => {
				if (tab.historyId !== id) return tab;
				if (tab.id === actualActiveTabId) {
					return {
						...createEmptyTab(tab.index, settings),
						id: tab.id,
						index: tab.index,
						providerId: tab.providerId,
						model: tab.model,
					};
				}
				return {
					...tab,
					historyId: null,
					runtimeSessionKey: null,
					runtimeThreadId: null,
					runtimeProviderId: null,
					runtimeFork: null,
					runtimeResumeAt: null,
				};
			}));
			setRuntimeStatus({ detail: 'Conversation deleted' });
		}

		function openHistory(id, inNewTab) {
			const item = histories.find((entry) => entry.id === id);
			if (!item) return;
			const openTab = tabs.find((tab) => tab.historyId === id);
			if (!inNewTab && openTab) {
				setActiveTabId(openTab.id);
				setHistoryVisible(false);
				setResumeVisible(false);
				return;
			}
			if (inNewTab) {
				setTabs((current) => {
					if (current.length >= configuredMaxTabs) {
						setRuntimeStatus({ detail: `Cannot open conversation: maximum ${configuredMaxTabs} tabs reached` });
						return current;
					}
					const next = createEmptyTab(current.length + 1, settings);
					next.title = item.title;
					next.messages = item.messages;
					next.historyId = item.id;
					next.providerId = item.providerId || 'claude';
					next.model = item.model || settings.model;
					next.runtimeSessionKey = item.runtimeSessionKey || item.id;
					next.runtimeThreadId = item.runtimeThreadId || null;
					next.runtimeProviderId = item.runtimeProviderId || item.providerId || null;
					next.runtimeFork = item.runtimeFork || null;
					next.runtimeResumeAt = item.runtimeResumeAt || null;
					setActiveTabId(next.id);
					return [...current, next];
				});
			}
			else {
				setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
					...tab,
					title: item.title,
					messages: item.messages,
					historyId: item.id,
					providerId: item.providerId || tab.providerId,
					model: item.model || tab.model,
					runtimeSessionKey: item.runtimeSessionKey || item.id,
					runtimeThreadId: item.runtimeThreadId || null,
					runtimeProviderId: item.runtimeProviderId || item.providerId || null,
					runtimeFork: item.runtimeFork || null,
					runtimeResumeAt: item.runtimeResumeAt || null,
				})));
			}
			setHistoryVisible(false);
			setResumeVisible(false);
		}

		function appendLocalAssistantTurn(tabId, userText, assistantText) {
			const nextUser = userMessage(userText);
			const nextAssistant = systemAssistantMessage(assistantText);
			setTabs((current) => updateTab(current, tabId, (tab) => ({
				...tab,
				messages: [...tab.messages, nextUser, nextAssistant],
				title: tab.messages.length ? tab.title : buildConversationTitle(settings, userText),
				isStreaming: false,
				queuedText: '',
				queuedDisplayText: '',
				queuedContextChips: [],
				queuedImages: [],
			})));
		}

		function executeBuiltInCommand(tabId, text) {
			const sourceTab = tabs.find((item) => item.id === tabId);
			const providerId = sourceTab?.providerId || modelToProvider(sourceTab?.model || settings.currentModel, settings);
			const resolved = resolveStandaloneSlashCommandAction(text, providerId, settings);
			if (!resolved) return false;
			const { action, args, configured } = resolved;
			if (action === 'clear') {
				newConversation();
				return true;
			}
			if (action === 'resume') {
				setHistoryVisible(false);
				setResumeVisible(true);
				return true;
			}
			if (action === 'model') {
				setDrawerOpen(true);
				return true;
			}
			if (action === 'add-dir') {
				const result = addExternalContext(args);
				const detail = result.success
					? `Added external context: ${result.normalizedPath}`
					: `Failed to add external context: ${result.error}`;
				setRuntimeStatus({ status: result.success ? 'ready' : 'error', detail });
				if (shouldEchoStandaloneCommandInChat(action, settings)) {
					appendLocalAssistantTurn(tabId, text, detail);
				}
				return true;
			}
			if (action === 'fork') {
				requestForkAll();
				return true;
			}
			if (action === 'help') {
				window.dispatchEvent(new Event(FEATURE_GUIDE_OPEN_EVENT));
				return true;
			}
			if (action === 'mock-claude-command' && configured) {
				if (shouldEchoStandaloneCommandInChat(action, settings)) {
					appendLocalAssistantTurn(tabId, text, renderVaultCommandMock(configured, args));
				}
				return true;
			}
			return false;
		}

		function appendToTab(tabId, updater) {
			setTabs((current) => updateTab(current, tabId, updater));
		}

		function completeTurn(tabId) {
			appendToTab(tabId, (tab) => {
				const lastMessage = (tab.messages || [])[Math.max(0, (tab.messages || []).length - 1)];
				const hasCompactBoundary = lastMessage?.role === 'assistant'
					&& (lastMessage.contentBlocks || []).some((block) => block.type === 'context_compacted');
				const completed = updateLastAssistant(tab, (message) => ({
					...message,
					durationSeconds: (message.contentBlocks || []).some((block) => block.type === 'context_compacted') ? 0 : (message.durationSeconds || 6),
				}));
				const usage = hasCompactBoundary ? null : {
					contextTokens: Math.min(190000, (tab.usage?.contextTokens || 12000) + 1800),
					contextWindow: 200000,
					percentage: Math.min(95, Math.round((((tab.usage?.contextTokens || 12000) + 1800) / 200000) * 100)),
				};
				return { ...completed, isStreaming: false, usage };
			});
			window.setTimeout(() => {
				setTabs((current) => {
					const finished = current.find((tab) => tab.id === tabId);
					const item = buildHistoryItem(finished ? { ...finished, isStreaming: false } : null);
					if (!item) return current;
					setHistories((histories) => [item, ...histories.filter((entry) => entry.id !== item.id)].slice(0, 20));
					return updateTab(current, tabId, (tab) => ({ ...tab, historyId: item.id, title: item.title }));
				});
			}, 0);
		}

		async function runLocalBangBashCommand(tabId, rawCommand) {
			const command = String(rawCommand || '').trim();
			if (!tabId || !command) return;
			const id = makeId('bash');
			appendToTab(tabId, (tab) => ({
				...tab,
				bashOutputs: [
					...(Array.isArray(tab.bashOutputs) ? tab.bashOutputs : []),
					{ id, command, status: 'running', result: '' },
				].slice(-50),
			}));
			setRuntimeStatus({ status: 'running', detail: `Running local shell command: ${command}` });
			if (api?.runBangBash) {
				let result = null;
				try {
					result = await api.runBangBash({
						command,
						workspace: settings.workspace,
						envText: runtimeEnvTextForSettings({ ...settings, runtimeMode: 'claude' }),
					});
				}
				catch (error) {
					result = {
						ok: false,
						exitCode: 1,
						error: error instanceof Error ? error.message : String(error),
					};
				}
				const rawOutput = String(result?.output || [result?.stdout, result?.stderr, result?.error].filter(Boolean).join('\n') || '').trim();
				const output = result?.ok
					? [rawOutput, 'Command completed successfully.'].filter(Boolean).join('\n')
					: rawOutput;
				const status = result?.ok ? 'completed' : 'error';
				appendToTab(tabId, (tab) => ({
					...tab,
					bashOutputs: (Array.isArray(tab.bashOutputs) ? tab.bashOutputs : []).map((entry) => (
						entry.id === id
							? {
								...entry,
								status,
								result: output,
								exitCode: Number.isFinite(Number(result?.exitCode)) ? Number(result.exitCode) : (result?.ok ? 0 : 1),
							}
							: entry
					)),
				}));
				setRuntimeStatus({
					status: result?.ok ? 'ready' : 'failed',
					detail: result?.ok ? `Local shell command completed: ${command}` : `Local shell command failed: ${command}`,
				});
				return;
			}
			schedule(() => {
				appendToTab(tabId, (tab) => ({
					...tab,
					bashOutputs: (Array.isArray(tab.bashOutputs) ? tab.bashOutputs : []).map((entry) => (
						entry.id === id
							? {
								...entry,
								status: 'completed',
								result: `mock-shell: ${command}\nCommand completed successfully.`,
								exitCode: 0,
							}
							: entry
					)),
				}));
				setRuntimeStatus({ status: 'ready', detail: `Local shell command completed: ${command}` });
			}, speedDelay(360));
		}

		function runMockTurn(tabId, text, images, sourceProviderId) {
			const lower = text.toLowerCase();
			const providerId = sourceProviderId || tabs.find((item) => item.id === tabId)?.providerId || modelToProvider(settings.model, settings);
			const skillNames = providerId === 'codex' ? extractSkillNames(text) : [];
			const imagePaths = (images || []).map((image) => imageDisplayPath(image, settings));
			appendToTab(tabId, (tab) => ({ ...tab, isStreaming: true }));

			function mockContentSettingsSummary() {
				const lines = [];
				if (String(settings.userName || '').trim()) lines.push(`user: ${String(settings.userName).trim()}`);
				if (String(settings.mediaFolder || '').trim()) lines.push(`media folder: ${String(settings.mediaFolder).trim()}`);
				const excluded = normalizeExcludedTags(settings.excludedTagsText);
				if (excluded.length) lines.push(`excluded tags: ${excluded.map((tag) => `#${tag}`).join(', ')}`);
				if (imagePaths.length) lines.push(`image paths: ${imagePaths.join(', ')}`);
				if (!lines.length) return '';
				return `\n\nContent settings applied:\n${lines.map((line) => `- ${line}`).join('\n')}`;
			}

			if (lower.startsWith('/clear')) {
				schedule(() => {
					appendToTab(tabId, (tab) => ({ ...tab, messages: [systemAssistantMessage('Visible conversation cleared. Mock state is ready for a fresh turn.')], isStreaming: false }));
				}, speedDelay(180));
				return;
			}

			if (lower.startsWith('/compact')) {
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, { type: 'thinking', id: makeId('think'), label: 'Compacting', content: 'Summarizing previous messages into a compact boundary.', durationSeconds: 1 })), speedDelay(220));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, { type: 'context_compacted', id: makeId('compact') })), speedDelay(520));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, { type: 'text', id: makeId('text'), content: 'Context compacted. Future turns will continue from the durable summary.' })), speedDelay(700));
				schedule(() => completeTurn(tabId), speedDelay(900));
				return;
			}

			if (lower.includes('generated file path') || lower.includes('ppt generated') || lower.includes('ppt 已生成')) {
				const workspace = settings.workspace || DEFAULT_SETTINGS.workspace;
				const result = 'PPT 已生成：Claude Code 介绍.pptx（工作区根目录）。';
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('generated-file'),
					name: 'Bash',
					icon: 'terminal',
					command: 'python make_claude_code_intro.py',
					summary: 'python make_claude_code_intro.py',
					status: 'completed',
					workspace,
					result,
					generatedFiles: extractGeneratedFilePaths(result, workspace),
				})), speedDelay(360));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'text',
					id: makeId('text'),
					content: 'PPT 已生成：Claude Code 介绍.pptx（工作区根目录）。Generated file path rendering is visible in the assistant reply.',
				})), speedDelay(620));
				schedule(() => completeTurn(tabId), speedDelay(820));
				return;
			}

			if (isBangBashEnabledForProvider(providerId, settings) && text.trim().startsWith('!')) {
				const command = text.trim().slice(1) || 'pwd';
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('tool'),
					name: 'Bash',
					icon: 'terminal',
					command,
					summary: command,
					status: 'running',
				})), speedDelay(200));
				schedule(() => appendToTab(tabId, (tab) => updateLastAssistant(tab, (message) => ({
					...message,
					contentBlocks: message.contentBlocks.map((block) => block.type === 'tool_use' ? { ...block, status: 'completed', result: 'mock-shell: command completed successfully' } : block),
				}))), speedDelay(780));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, { type: 'text', id: makeId('text'), content: 'Bang-bash mode rendered as a local shell tool call. No command was actually executed.' })), speedDelay(980));
				schedule(() => completeTurn(tabId), speedDelay(1200));
				return;
			}

			schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
				type: 'thinking',
				id: makeId('think'),
				label: settings.permissionMode === 'plan' ? 'Planning' : 'Thinking',
				content: 'Reading the request, checking selected context, and deciding which UI path should be demonstrated.',
				durationSeconds: 2,
			})), speedDelay(220));

			if (skillNames.length > 0) {
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('skill'),
					name: 'Skill',
					icon: 'zap',
					summary: skillNames.map((name) => `$${name}`).join(', '),
					status: 'completed',
					input: { skill: skillNames[0], skills: skillNames },
					result: `Resolved mock Codex skill input for ${skillNames.map((name) => `$${name}`).join(', ')}.`,
				})), speedDelay(560));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'text',
					id: makeId('text'),
					content: `Skill context attached: ${skillNames.map((name) => `$${name}`).join(', ')}. The mock runtime kept the skill mention in the user prompt and rendered the resolved provider input.`,
				})), speedDelay(900));
				schedule(() => completeTurn(tabId), speedDelay(1160));
				return;
			}

			if (lower.includes('ask')) {
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'ask_user',
					id: makeId('ask'),
					title: 'Question',
					questions: [
						{ id: 'scope', header: 'Scope', question: 'Which part of the sidebar should the mock continue with?', isOther: true, options: [{ label: 'Composer', value: 'composer', description: 'Exercise input, mention, slash command, and queue states.' }, { label: 'Messages', value: 'messages', description: 'Exercise streaming text, thinking, tools, and copy actions.' }] },
						{ id: 'states', header: 'States', question: 'Which states should stay visible?', multiSelect: true, isOther: true, options: [{ label: 'Tool calls', value: 'tool calls' }, { label: 'Approvals', value: 'approvals' }, { label: 'Plan mode', value: 'plan mode' }] },
					],
				})), speedDelay(600));
				return;
			}

			if (lower.includes('approve') || lower.includes('permission')) {
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'permission',
					id: makeId('perm'),
					title: 'Permission required',
					tool: 'Edit',
					icon: 'file',
					reason: 'Mock runtime wants to edit a sidebar file.',
					path: sidebarSourceMockPath(settings),
					description: 'Replace the current UI prototype with an AI-sidebar-compatible DOM structure.',
				})), speedDelay(650));
				return;
			}

			if (settings.permissionMode === 'plan' || lower.includes('plan')) {
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'text',
					id: makeId('text'),
					content: 'Here is the proposed implementation plan:\n\n1. Match the original sidebar DOM and CSS class names.\n2. Drive every visible interaction from local mock state.\n3. Verify with a demo Electron window before connecting a provider.',
				})), speedDelay(650));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'plan_approval',
					id: makeId('plan'),
					plan: '1. Port header, messages, toolbar, and composer.\n2. Add mock streaming turns for text, thinking, tools, questions, approvals, and plan approval.\n3. Keep runtime disconnected until UI acceptance.',
				})), speedDelay(950));
				return;
			}

			if (lower.includes('markdown') || lower.includes('code block') || lower.includes('code rendering')) {
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'text',
					id: makeId('text'),
					content: [
						'## Markdown renderer parity',
						'',
						'This mock response checks **bold text**, *italic text*, `inline code`, [external links](https://example.com), and [[src/features/chat/rendering/MessageRenderer.ts|file links]].',
						'',
						'- Unordered item with `inline code`',
						'- File link in inline code: `[[src/style/components/code.css|code.css]]`',
						'',
						'1. Ordered item one',
						'2. Ordered item two',
						'',
						'> A quoted line from the mock renderer.',
						'',
						'Obsidian image embed fallback: ![[diagram.png]]',
						'',
						'| Surface | Status |',
						'| --- | --- |',
						'| Code wrapper | Restored |',
						'| Copy feedback | Restored |',
						'',
						'```js',
						'function renderMarkdown(value) {',
						'  return value.trim();',
						'}',
						'```',
						'',
						'```',
						'plain wrapped block',
						'second line',
						'```',
					].join('\n'),
				})), speedDelay(650));
				schedule(() => completeTurn(tabId), speedDelay(1050));
				return;
			}

			if (lower.includes('tool renderer') || lower.includes('renderers') || lower.includes('diff') || lower.includes('todo') || lower.includes('subagent') || lower.includes('websearch') || lower.includes('web fetch')) {
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('edit'),
					name: 'Edit',
					icon: 'file',
					filePath: sidebarSourceMockPath(settings),
					summary: 'claudian-sidebar-react.js',
					status: 'completed',
					diffLines: [
						{ type: 'equal', text: 'function ToolBlock({ block }) {' },
						{ type: 'delete', text: '  return renderGenericTool(block);' },
						{ type: 'insert', text: '  return renderSpecializedTool(block);' },
						{ type: 'equal', text: '}' },
					],
				})), speedDelay(520));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('todo'),
					name: 'TodoWrite',
					icon: 'check',
					summary: 'Tasks 1/3',
					status: 'running',
					input: {
						todos: [
							{ id: 'todo-1', status: 'completed', content: 'Map original renderer classes', activeForm: 'Mapping original renderer classes' },
							{ id: 'todo-2', status: 'in_progress', content: 'Implement specialized tool blocks', activeForm: 'Implementing specialized tool blocks' },
							{ id: 'todo-3', status: 'pending', content: 'Verify smoke coverage', activeForm: 'Verifying smoke coverage' },
						],
					},
				})), speedDelay(700));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('web-search'),
					name: 'WebSearch',
					icon: 'search',
					summary: 'AI sidebar renderer structure',
					status: 'completed',
					input: { query: 'AI sidebar renderer structure' },
					links: [
						{ title: 'Renderer reference', url: 'https://example.com/claudian-renderer' },
						{ title: 'Tool block notes', url: 'https://example.com/tool-blocks' },
					],
					result: 'Mock web search returned structured links and a compact summary.',
				})), speedDelay(880));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('web-fetch'),
					name: 'WebFetch',
					icon: 'search',
					summary: 'https://example.com/claudian-renderer',
					status: 'completed',
					result: 'Fetched mock documentation: Write/Edit blocks use diff rows, TodoWrite uses todo panel rows, and subagents keep prompt, tool, and result sections together.',
				})), speedDelay(1040));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('read'),
					name: 'Read',
					icon: 'file',
					summary: 'ToolCallRenderer.ts',
					status: 'completed',
					result: '1→import { setIcon } from "obsidian";\n2→renderToolCall(parentEl, toolCall);',
				})), speedDelay(1110));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('grep'),
					name: 'Grep',
					icon: 'search',
					summary: 'claudian-tool-search-item',
					status: 'completed',
					result: 'src/style/components/toolcalls.css:168: .claudian-tool-search-item\nsrc/features/chat/rendering/ToolCallRenderer.ts:489: renderToolSearchExpanded',
				})), speedDelay(1180));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('tool-search'),
					name: 'ToolSearch',
					icon: 'search',
					summary: 'Read, Grep',
					status: 'completed',
					result: JSON.stringify([
						{ type: 'tool_reference', tool_name: 'Read' },
						{ type: 'tool_reference', tool_name: 'Grep' },
					]),
				})), speedDelay(1250));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('stdin'),
					name: 'write_stdin',
					icon: 'terminal',
					summary: '#42 y',
					status: 'completed',
					input: { session_id: 42, chars: 'y\n' },
					result: 'Sent 2 bytes to session 42',
				})), speedDelay(1320));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('spawn-agent'),
					name: 'spawn_agent',
					icon: 'bot',
					summary: 'Audit renderer parity for the sidebar mock',
					status: 'completed',
					input: { message: 'Audit renderer parity for the sidebar mock', model: 'gpt-5.5' },
					result: JSON.stringify({ agent_id: 'agent-42', nickname: 'renderer-audit' }),
				})), speedDelay(1380));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('send-input'),
					name: 'send_input',
					icon: 'bot',
					summary: 'Inspect tool call renderer gaps',
					status: 'completed',
					input: { agent_id: 'agent-42', message: 'Inspect tool call renderer gaps' },
					result: JSON.stringify({ queued: true, agent_id: 'agent-42' }),
				})), speedDelay(1440));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('wait-agent'),
					name: 'wait',
					icon: 'clock',
					summary: '1 agent, 30s',
					status: 'completed',
					input: { ids: ['agent-42'], timeout_ms: 30000 },
					result: JSON.stringify({ status: { 'agent-42': { completed: 'Renderer lifecycle task completed.' } }, timed_out: false }),
				})), speedDelay(1500));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('resume-agent'),
					name: 'resume_agent',
					icon: 'bot',
					summary: '',
					status: 'completed',
					input: { agent_id: 'agent-42' },
					result: JSON.stringify({ agent_id: 'agent-42', status: 'resumed' }),
				})), speedDelay(1560));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'tool_use',
					id: makeId('close-agent'),
					name: 'close_agent',
					icon: 'bot',
					summary: '',
					status: 'completed',
					input: { agent_id: 'agent-42' },
					result: JSON.stringify({ agent_id: 'agent-42', status: 'closed' }),
				})), speedDelay(1620));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'subagent',
					id: makeId('subagent'),
					description: 'Review sidebar renderer parity',
					prompt: 'Compare the standalone sidebar against the original tool rendering behavior.',
					status: 'completed',
					tools: [
						{ id: 'sub-read', name: 'Read', icon: 'file', summary: 'ToolCallRenderer.ts', status: 'completed', result: 'Found TodoWrite and web rendering branches.' },
						{ id: 'sub-search', name: 'Grep', icon: 'search', summary: 'claudian-subagent-*', status: 'completed', result: 'Subagent CSS classes are available in the standalone style bundle.' },
					],
					result: 'Renderer parity mock completed.',
				})), speedDelay(1680));
				schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
					type: 'text',
					id: makeId('text'),
					content: 'Specialized tool renderers are now exercised locally: Write/Edit diff, TodoWrite, WebSearch, WebFetch, Read/Grep, ToolSearch, write_stdin, agent lifecycle tools, and Subagent.',
				})), speedDelay(1840));
				schedule(() => completeTurn(tabId), speedDelay(2060));
				return;
			}

			schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
				type: 'tool_use',
				id: makeId('tool'),
				name: 'Read',
				icon: 'file',
				summary: 'claudian-sidebar-react.js',
				status: 'running',
				lines: [{ text: sidebarSourceMockPath(settings) }],
			})), speedDelay(520));
			schedule(() => appendToTab(tabId, (tab) => updateLastAssistant(tab, (message) => ({
				...message,
				contentBlocks: message.contentBlocks.map((block) => block.type === 'tool_use' ? { ...block, status: 'completed', result: 'Mock read completed. Renderer classes match the compatibility naming.' } : block),
			}))), speedDelay(900));
			schedule(() => appendToTab(tabId, (tab) => appendBlockToLastAssistant(tab, {
				type: 'text',
				id: makeId('text'),
				content: `This is the mock AI sidebar flow. The message body, thinking block, tool call, history menu, toolbar selectors, permission modes, slash commands, @ mentions, queue row, and plan/approval cards are all handled locally without touching Claude or Codex.${mockContentSettingsSummary()}`,
			})), speedDelay(1150));
			schedule(() => completeTurn(tabId), speedDelay(1500));
		}

		function normalizeRuntimeEffort(value) {
			return normalizeSidebarEffort(value);
		}

	function resolveCodexModel(tab, sourceSettings = settings) {
		const candidate = sourceSettings.openaiModel
			|| (sourceSettings.modelSelectionSource === 'native' ? sourceSettings.model : '')
			|| tab?.model
			|| sourceSettings.model;
		return modelToProvider(candidate, sourceSettings) === 'codex' ? providerRuntimeModelId('codex', candidate) : 'gpt-5.5';
	}

	function resolveClaudeModel(tab, sourceSettings = settings) {
		const candidate = (sourceSettings.modelSelectionSource === 'native' ? sourceSettings.model : '')
			|| tab?.model
			|| sourceSettings.model;
		return modelToProvider(candidate, sourceSettings) === 'claude' ? providerRuntimeModelId('claude', candidate) : 'sonnet';
		}

		function getRuntimeSessionKey(tab) {
			return tab?.runtimeSessionKey || tab?.historyId || tab?.id || makeId('runtime-session');
		}

		const RUNTIME_HISTORY_MAX_MESSAGES = 60;
		const RUNTIME_HISTORY_MAX_BLOCKS = 80;
		const RUNTIME_HISTORY_MAX_TOOL_CALLS = 40;
		const RUNTIME_HISTORY_MAX_TEXT_LENGTH = 24000;
		const RUNTIME_HISTORY_MAX_TOOL_RESULT_LENGTH = 16000;

		function truncateRuntimeHistoryText(value, maxLength = RUNTIME_HISTORY_MAX_TEXT_LENGTH) {
			const text = String(value || '');
			return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 3))}...` : text;
		}

		function runtimeHistoryBlocks(blocks) {
			return (Array.isArray(blocks) ? blocks : [])
				.filter((block) => ['text', 'thinking', 'context_compacted'].includes(block?.type))
				.slice(-RUNTIME_HISTORY_MAX_BLOCKS)
				.map((block) => ({
					type: block.type,
					content: truncateRuntimeHistoryText(block.content),
					durationSeconds: Number.isFinite(Number(block.durationSeconds)) ? Number(block.durationSeconds) : 0,
				}));
		}

		function runtimeHistoryToolCalls(toolCalls) {
			return (Array.isArray(toolCalls) ? toolCalls : []).slice(-RUNTIME_HISTORY_MAX_TOOL_CALLS).map((tool) => ({
				id: tool?.id || '',
				name: tool?.name || '',
				input: tool?.input && typeof tool.input === 'object' && !Array.isArray(tool.input) ? cloneForMockPersistence(tool.input) || {} : {},
				status: tool?.status || '',
				result: truncateRuntimeHistoryText(tool?.result, RUNTIME_HISTORY_MAX_TOOL_RESULT_LENGTH),
				isError: tool?.isError === true,
			}));
		}

		function runtimeConversationHistory(messages) {
			return (Array.isArray(messages) ? messages : [])
				.filter((message) => message?.role === 'user' || message?.role === 'assistant')
				.slice(-RUNTIME_HISTORY_MAX_MESSAGES)
				.map((message) => ({
					id: message.id || '',
					role: message.role,
					content: truncateRuntimeHistoryText(message.content),
					displayContent: truncateRuntimeHistoryText(message.displayContent),
					contentBlocks: runtimeHistoryBlocks(message.contentBlocks),
					toolCalls: runtimeHistoryToolCalls(message.toolCalls),
					assistantMessageId: message.assistantMessageId || '',
					runtimeTurnId: message.runtimeTurnId || '',
					currentNote: truncateRuntimeHistoryText(message.currentNote, 2048),
					isInterrupt: message.isInterrupt === true,
				}));
		}

		function buildRuntimeSettings(tab, sourceSettings = settings) {
			const provider = resolveRuntimeProviderForTab(tab, sourceSettings);
			const model = provider === 'codex' ? resolveCodexModel(tab, sourceSettings) : resolveClaudeModel(tab, sourceSettings);
			const serviceTier = provider === 'codex' && isFastTierCodexModel(model) && sourceSettings.serviceTier === 'fast'
				? 'fast'
				: 'default';
			return {
				provider,
				workspace: sourceSettings.workspace,
				locale: normalizeLocale(sourceSettings.locale),
				codexPath: sourceSettings.codexPath || '',
				codexDownloadSource: sourceSettings.codexDownloadSource || 'npm-mirror',
				codexDownloadUrl: sourceSettings.codexDownloadUrl || '',
				codexInstallationMethod: sourceSettings.codexInstallationMethod || 'native-windows',
				codexWslDistroOverride: sourceSettings.codexWslDistroOverride || '',
				claudePath: sourceSettings.claudePath || '',
				model,
				effort: normalizeRuntimeEffort(sourceSettings.effort),
				reasoningSummary: sourceSettings.reasoningSummary || 'detailed',
				serviceTier,
				permissionMode: sourceSettings.permissionMode || 'normal',
				sandbox: sourceSettings.sandbox || 'read-only',
				sidebarFontSize: normalizeSidebarFontSize(sourceSettings.sidebarFontSize),
				llmProviderMode: 'native-cli',
				modelSelectionSource: sourceSettings.modelSelectionSource === 'user' ? 'user' : 'native',
				openaiModel: sourceSettings.openaiModel || '',
				claudeCustomModels: sourceSettings.claudeCustomModels || '',
				codexCustomModels: sourceSettings.codexCustomModels || '',
				claudeSafeMode: sourceSettings.claudeSafeMode || 'acceptEdits',
				claudeLoadUserSettings: sourceSettings.claudeLoadUserSettings !== false,
				claudeEnableChrome: sourceSettings.claudeEnableChrome === true,
				claudeEnableBangBash: sourceSettings.claudeEnableBangBash !== false,
				claudeHiddenCommands: sourceSettings.claudeHiddenCommands || '',
				codexHiddenCommands: sourceSettings.codexHiddenCommands || '',
				envText: runtimeEnvTextForSettings({ ...sourceSettings, runtimeMode: provider }),
				systemPrompt: buildStandaloneSystemPrompt(sourceSettings),
			};
		}

		async function startRuntimeTurn(tabId, text, images, settingsOverride, turnContextOverride, historyOverride) {
			if (!api?.startTurn) {
				appendToTab(tabId, (tab) => ({
					...appendBlockToLastAssistant(removeRuntimeWaitingBlocksFromLastAssistant(tab), {
						type: 'text',
						id: makeId('runtime-missing'),
						content: 'AI sidebar runtime is unavailable in this window.',
					}),
					isStreaming: false,
				}));
				return;
			}
			const tab = (tabsRef.current || tabs).find((item) => item.id === tabId);
			const runtimeSettings = buildRuntimeSettings(tab, settingsOverride || settingsRef.current || settings);
			runtimeTabIdRef.current = tabId;
			setRuntimeStatus({ status: 'starting', detail: `Starting ${runtimeSettings.provider} runtime` });
			logRendererEvent('runtime.startTurn.request', {
				tabId,
				provider: runtimeSettings.provider,
				model: runtimeSettings.model,
				effort: runtimeSettings.effort,
				textLength: String(text || '').length,
				textPreview: logPreview(text || ''),
				imageCount: Array.isArray(images) ? images.length : 0,
				imageNames: Array.isArray(images) ? images.map((image) => image?.name || '').slice(0, 8) : [],
				imageSources: Array.isArray(images) ? images.map((image) => image?.source || '').slice(0, 8) : [],
				historyCount: Array.isArray(historyOverride || tab?.messages) ? (historyOverride || tab?.messages || []).length : 0,
			});
			try {
				if (api.updateSettings) {
					await api.updateSettings(runtimeSettings);
				}
				const result = await api.startTurn({
					text,
					sessionKey: getRuntimeSessionKey(tab),
					threadId: tab?.runtimeProviderId === runtimeSettings.provider ? (tab?.runtimeThreadId || '') : '',
					fork: tab?.runtimeFork?.providerId === runtimeSettings.provider ? tab.runtimeFork : null,
					resumeAt: tab?.runtimeProviderId === runtimeSettings.provider ? (tab?.runtimeResumeAt || '') : '',
					model: runtimeSettings.model,
					effort: runtimeSettings.effort,
					reasoningSummary: runtimeSettings.reasoningSummary,
					images: Array.isArray(images) ? images : [],
					conversationHistory: runtimeConversationHistory(historyOverride || tab?.messages || []),
					...turnContextPayload(turnContextOverride === undefined ? turnContextRef.current : turnContextOverride),
					externalContextPaths: (externalPaths || []).map((entry) => entry?.path || entry).filter(Boolean),
					mcpMentions: (tab?.mcpMentions || []).map((entry) => entry?.name || entry).filter(Boolean),
					mcpServers: (mcpServers || []).map(normalizeMcpServer),
				});
				if (!result?.ok) {
					throw new Error(result?.error || `Failed to start ${runtimeSettings.provider} turn`);
				}
				logRendererEvent('runtime.startTurn.ok', {
					tabId,
					provider: runtimeSettings.provider,
					threadId: result.threadId || '',
					turnId: result.turnId || '',
				});
			}
			catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				runtimeTabIdRef.current = null;
				logRendererEvent('runtime.startTurn.error', {
					tabId,
					provider: runtimeSettings.provider,
					message,
				});
				appendToTab(tabId, (tab) => ({
					...appendBlockToLastAssistant(removeRuntimeWaitingBlocksFromLastAssistant(tab), {
						type: 'text',
						id: makeId('runtime-start-error'),
						content: `Runtime error: ${message}`,
					}),
					isStreaming: false,
				}));
			}
		}

		async function runProviderInlineEdit(action) {
			if (!api?.startInlineEdit || !api?.continueInlineEdit) {
				return { ok: false, error: 'Inline edit runtime is unavailable' };
			}
			const runtimeSettings = buildRuntimeSettings(activeTab, settings);
			setRuntimeStatus({ status: 'running', detail: `Inline edit via ${runtimeSettings.provider}` });
			if (api.updateSettings) {
				await api.updateSettings(runtimeSettings);
			}
			const result = action?.type === 'continue'
				? await api.continueInlineEdit({
					provider: runtimeSettings.provider,
					message: action.message || '',
					contextFiles: action.contextFiles || [],
				})
				: await api.startInlineEdit({
					provider: runtimeSettings.provider,
					model: runtimeSettings.model,
					request: action.request || {},
				});
			setRuntimeStatus({
				status: result?.ok ? 'ready' : 'failed',
				detail: result?.ok ? 'Inline edit ready' : (result?.error || 'Inline edit failed'),
			});
			return result;
		}

		async function runProviderInstructionRefine(action) {
			if (!api?.startInstructionRefine || !api?.continueInstructionRefine) {
				return { ok: false, error: 'Instruction refine runtime is unavailable' };
			}
			const runtimeSettings = buildRuntimeSettings(activeTab, settings);
			setRuntimeStatus({ status: 'running', detail: `Instruction refine via ${runtimeSettings.provider}` });
			if (api.updateSettings) {
				await api.updateSettings(runtimeSettings);
			}
			const result = action?.type === 'continue'
				? await api.continueInstructionRefine({
					provider: runtimeSettings.provider,
					model: runtimeSettings.model,
					message: action.message || '',
				})
				: await api.startInstructionRefine({
					provider: runtimeSettings.provider,
					model: runtimeSettings.model,
					rawInstruction: action.rawInstruction || '',
					existingInstructions: settings.systemPrompt || '',
				});
			setRuntimeStatus({
				status: result?.ok ? 'ready' : 'failed',
				detail: result?.ok ? 'Instruction refine ready' : (result?.error || 'Instruction refine failed'),
			});
			return result;
		}

		function applyGeneratedTitle(tabId, title, metadata = {}) {
			const nextTitle = String(title || '').trim();
			if (!tabId || !nextTitle) return;
			const titleGenerationProvider = String(metadata.provider || '').trim();
			const titleGenerationModel = String(metadata.model || '').trim();
			setTabs((current) => updateTab(current, tabId, (tab) => ({
				...tab,
				title: nextTitle,
				titleGenerationProvider: titleGenerationProvider || tab.titleGenerationProvider || '',
				titleGenerationModel: titleGenerationModel || tab.titleGenerationModel || '',
			})));
			setHistories((current) => current.map((entry) => (
				entry.runtimeSessionKey === tabId || entry.id === tabId
					? {
						...entry,
						title: nextTitle,
						titleGenerationProvider: titleGenerationProvider || entry.titleGenerationProvider || '',
						titleGenerationModel: titleGenerationModel || entry.titleGenerationModel || '',
					}
					: entry
			)));
		}

		async function runProviderTitleGeneration(tabId, userText, runtimeSettings) {
			if (!api?.generateTitle || settings.enableAutoTitleGeneration === false) {
				return;
			}
			const configuredTitleModel = String(settings.titleGenerationModel || '').trim();
			const defaultTitleProvider = normalizeRuntimeProviderId(runtimeSettings?.provider) || 'claude';
			const titleProvider = configuredTitleModel ? modelToProvider(configuredTitleModel, settings) : defaultTitleProvider;
			const titleModel = configuredTitleModel || (titleProvider === 'codex' ? runtimeSettings?.model || resolveCodexModel(null, settings) : 'claude-haiku-4-5');
			try {
				if (api.updateSettings) {
					await api.updateSettings(runtimeSettings);
				}
				const result = await api.generateTitle({
					conversationId: tabId,
					provider: titleProvider,
					model: titleModel,
					userMessage: userText || '',
				});
				if (result?.ok && result.title) {
					applyGeneratedTitle(tabId, result.title, {
						provider: result.provider || titleProvider,
						model: titleModel,
					});
				}
			}
			catch {
				// Title generation is best-effort, matching the original sidebar behavior.
			}
		}

		function startTurnWithText(tabId, text, imagesOverride, options = {}) {
			const effectiveSettings = options.settingsOverride || settingsRef.current || settings;
			const trimmed = text.trim();
			const sourceTab = (tabsRef.current || tabs).find((item) => item.id === tabId);
			const imagesForTurn = mergeTurnImages(Array.isArray(imagesOverride) ? imagesOverride : (sourceTab?.imageChips || []), []);
			const contextChips = normalizeMessageContextChips(options.contextChips);
			const displayWasProvided = options.displayText !== undefined;
			const displayTrimmed = String(displayWasProvided ? options.displayText : trimmed).trim();
			const visibleUserText = displayTrimmed || (displayWasProvided ? (imagesForTurn.length ? '[image]' : 'PDF context') : (trimmed ? '' : '[image]'));
			const isProviderRuntime = isProviderRuntimeMode(effectiveSettings.runtimeMode);
			const runtimeSettings = isProviderRuntime ? buildRuntimeSettings(sourceTab, effectiveSettings) : null;
			const providerForTurn = runtimeSettings?.provider
				|| sourceTab?.providerId
				|| modelToProvider(sourceTab?.model || effectiveSettings.model, effectiveSettings);
			const nextAssistant = isProviderRuntime
				? assistantMessageWithRuntimeWaiting(providerForTurn)
				: assistantMessage();
			const isFirstMessage = !(sourceTab?.messages?.length);
			setTabs((current) => updateTab(current, tabId, (draft) => ({
				...draft,
				messages: [...draft.messages, userMessage(trimmed || '[image]', imagesForTurn, { displayContent: visibleUserText, contextChips }), nextAssistant],
				title: draft.messages.length ? draft.title : buildConversationTitle(effectiveSettings, visibleUserText || trimmed, imagesForTurn),
				providerId: providerForTurn,
				queuedText: '',
				queuedDisplayText: '',
				queuedContextChips: [],
				queuedImages: [],
				queuedContext: null,
				imageChips: [],
				pdfSnippetChips: [],
				runtimeResumeAt: null,
				isStreaming: isProviderRuntime ? true : draft.isStreaming,
			})));
			if (isProviderRuntime) {
				if (isFirstMessage && options.suppressAutoTitle !== true && effectiveSettings.enableAutoTitleGeneration !== false) {
					void runProviderTitleGeneration(tabId, visibleUserText || trimmed || '[image]', runtimeSettings);
				}
				void startRuntimeTurn(tabId, trimmed || '[image]', imagesForTurn, effectiveSettings, options.turnContextOverride, sourceTab?.messages || []);
				return;
			}
			runMockTurn(tabId, visibleUserText || trimmed, imagesForTurn, sourceTab?.providerId);
		}

		function startPostPlanImplementationWhenIdle(tabId, settingsOverride, attempt = 0) {
			const latest = (tabsRef.current || []).find((tab) => tab.id === tabId);
			if (!latest) return;
			if (latest.isStreaming) {
				if (attempt < 200) {
					schedule(() => startPostPlanImplementationWhenIdle(tabId, settingsOverride, attempt + 1), 50);
					return;
				}
				setTabs((current) => updateTab(current, tabId, (tab) => ({
					...tab,
					...mergeQueuedState(tab, 'Implement the plan.', [], turnContextRef.current),
				})));
				return;
			}
			startTurnWithText(tabId, 'Implement the plan.', undefined, { settingsOverride });
		}

		useEffect(() => {
			const queuedTab = tabs.find((tab) => !tab.isStreaming && (tab.queuedText || tab.queuedImages?.length));
			if (!queuedTab) return;
			const queuedText = queuedTab.queuedText;
			const queuedDisplayText = queuedTab.queuedDisplayText || queuedText;
			const queuedContextChips = queuedTab.queuedContextChips || [];
			const queuedImages = queuedTab.queuedImages || [];
			const queuedContext = queuedTab.queuedContext || null;
			schedule(() => startTurnWithText(queuedTab.id, queuedText, queuedImages, { turnContextOverride: queuedContext, displayText: queuedDisplayText, contextChips: queuedContextChips }), 0);
		}, [tabs]);

		function send(textOverride) {
			const text = String(textOverride ?? input).trim();
			if (!actualActiveTabId) return;
			const tab = tabs.find((item) => item.id === actualActiveTabId);
			if (!tab) return;
			const pdfSelectionForTurn = includePdfSelection ? currentPdfSelection : null;
			const pdfSelectionText = pdfSelectionForTurn ? buildPdfSelectionPromptContent(pdfSelectionForTurn) : '';
			const pdfSnippetText = buildPdfSnippetPromptContent(tab.pdfSnippetChips || []);
			const pdfContextChips = buildPdfMessageContextChips(pdfSelectionForTurn, tab.pdfSnippetChips || []);
			const tabGraphChips = normalizeMessageContextChips(tab.turnContextChips).filter((chip) => chip.type === 'graph-node');
			const activeTurnContext = tab.turnContext
				|| (tabGraphChips.length ? turnContextRef.current : removeGraphSelectionFromContext(turnContextRef.current));
			const graphSelection = normalizeTurnContext(activeTurnContext).graphSelection;
			const graphContextText = buildGraphSelectionPromptContent(activeTurnContext);
			const graphContextChips = mergeMessageContextChips(tabGraphChips, buildGraphMessageContextChips(graphSelection))
				.filter((chip) => chip.type === 'graph-node');
			const contextChipsForTurn = mergeMessageContextChips(graphContextChips, pdfContextChips);
			const textForTurn = mergePromptWithGraphContext(text, graphContextText, [pdfSelectionText, pdfSnippetText]);
			const pdfSelectionImagesForTurn = normalizePdfSelectionImages(pdfSelectionForTurn);
			const imagesForTurn = mergeTurnImages(tab.imageChips || [], pdfSelectionImagesForTurn);
			logRendererEvent('pdf-selection.send-context', {
				hasPdfSelection: !!pdfSelectionForTurn,
				pdfSelectionKind: pdfSelectionForTurn?.kind || '',
				pdfSelectionRawAttachmentCount: Number(pdfSelectionForTurn?.rawAttachmentCount || 0) || 0,
				pdfSelectionAcceptedAttachmentCount: Number(pdfSelectionForTurn?.acceptedAttachmentCount || 0) || 0,
				pdfSelectionImageCount: pdfSelectionImagesForTurn.length,
				imageCount: imagesForTurn.length,
				imageNames: imagesForTurn.map((image) => image?.name || '').slice(0, 8),
			});
			const hasImages = imagesForTurn.length > 0;
			if (!textForTurn && !hasImages) return;
			if (isBangBashEnabledForProvider(tab.providerId, settings) && text.startsWith('!!')) {
				runLocalBangBashCommand(actualActiveTabId, text.slice(2));
				setInput('');
				return;
			}
			if (executeBuiltInCommand(actualActiveTabId, text)) {
				setInput('');
				return;
			}
			if (tab.isStreaming) {
				setTabs((current) => updateTab(current, actualActiveTabId, (draft) => ({
					...draft,
					...mergeQueuedState(draft, textForTurn, imagesForTurn, activeTurnContext, text || graphSelectionTitle(graphSelection) || 'PDF context', contextChipsForTurn),
					imageChips: [],
					pdfSnippetChips: [],
				})));
				setInput('');
				return;
			}
			setInput('');
			startTurnWithText(actualActiveTabId, textForTurn, imagesForTurn, {
					displayText: text || (graphSelection
					? `询问图谱节点：${graphSelectionTitle(graphSelection)}`
					: 'PDF context'),
				contextChips: contextChipsForTurn,
				turnContextOverride: activeTurnContext,
			});
		}

		function cancel() {
			const tab = tabs.find((item) => item.id === actualActiveTabId);
			const queuedTurnWasRestored = hasQueuedTurn(tab);
			if (queuedTurnWasRestored) {
				setInput((current) => restoreCancelledQueueInput(tab, current));
			}
			timersRef.current.forEach((timer) => window.clearTimeout(timer));
			timersRef.current = [];
			flushRuntimeChunksNow();
			if (settings.runtimeMode === 'codex' || settings.runtimeMode === 'claude') {
				api?.cancelTurn?.().catch(() => {});
				runtimeTabIdRef.current = null;
			}
			setTabs((current) => updateTab(current, actualActiveTabId, createCancelledTabState));
			setRuntimeStatus({
				status: 'cancelled',
				detail: queuedTurnWasRestored ? 'Turn cancelled; queued message restored to composer' : 'Turn cancelled',
			});
			window.requestAnimationFrame(() => inputRef.current?.focus?.());
		}

		function findBlock(blockId) {
			const sourceTab = (tabsRef.current || []).find((tab) => tab.id === actualActiveTabId) || activeTab;
			for (const message of sourceTab?.messages || []) {
				const block = (message.contentBlocks || []).find((candidate) => candidate.id === blockId);
				if (block) return block;
			}
			return null;
		}

		function removeInlineBlock(blockId) {
			appendToTab(actualActiveTabId, (tab) => removeContentBlockById(tab, blockId));
		}

		function updateInlineBlock(blockId, updater) {
			appendToTab(actualActiveTabId, (tab) => updateContentBlockById(tab, blockId, updater));
		}

		async function submitRuntimeApproval(block, payload, statusDetail = 'Submitting approval response') {
			if (!block?.runtimeApprovalId || block.responsePending) return false;
			updateInlineBlock(block.id, (current) => ({
				...current,
				responsePending: true,
				responseError: '',
			}));
			setRuntimeStatus({ status: 'running', detail: statusDetail });
			logRendererEvent('runtime.approval.respond.request', {
				approvalId: block.runtimeApprovalId,
				requestId: block.runtimeRequestId || '',
				threadId: block.runtimeThreadId || '',
				blockType: block.type || '',
			});
			try {
				const result = await api?.respondApproval?.({ id: block.runtimeApprovalId, ...(payload || {}) });
				if (!result?.ok) {
					throw new Error(result?.error || 'Runtime did not accept approval response');
				}
				logRendererEvent('runtime.approval.respond.ok', {
					approvalId: block.runtimeApprovalId,
					requestId: block.runtimeRequestId || '',
					threadId: block.runtimeThreadId || '',
					blockType: block.type || '',
				});
				removeInlineBlock(block.id);
				setRuntimeStatus({ status: 'ready', detail: 'Approval response submitted' });
				return true;
			}
			catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logRendererEvent('runtime.approval.respond.error', {
					approvalId: block.runtimeApprovalId,
					requestId: block.runtimeRequestId || '',
					threadId: block.runtimeThreadId || '',
					blockType: block.type || '',
					message,
				});
				updateInlineBlock(block.id, (current) => ({
					...current,
					responsePending: false,
					responseError: message,
				}));
				setRuntimeStatus({ status: 'error', detail: `Approval response failed: ${message}` });
				window.requestAnimationFrame(() => {
					document.querySelector(`[data-inline-interaction-type="${block.type}"]`)?.querySelector('[tabindex="0"]')?.focus?.();
				});
				return false;
			}
		}

		async function handleAskAnswer(blockId, answer) {
			const block = findBlock(blockId);
			if (block?.runtimeApprovalId) {
				await submitRuntimeApproval(block, { answers: answer || {}, cancelled: !answer }, answer ? 'Submitting answers' : 'Cancelling question');
				return;
			}
			appendToTab(actualActiveTabId, (tab) => {
				const next = updateLastAssistant(tab, (message) => ({
					...message,
					contentBlocks: message.contentBlocks.filter((block) => block.id !== blockId),
				}));
				return appendBlockToLastAssistant(next, {
					type: 'text',
					id: makeId('text'),
					content: answer ? `Received mock answer: ${JSON.stringify(answer)}` : 'Question cancelled.',
				});
			});
			schedule(() => completeTurn(actualActiveTabId), speedDelay(400));
		}

		async function handlePermission(blockId, decision) {
			const block = findBlock(blockId);
			if (block?.runtimeApprovalId) {
				await submitRuntimeApproval(block, { decision }, 'Submitting permission decision');
				return;
			}
			appendToTab(actualActiveTabId, (tab) => {
				const next = updateLastAssistant(tab, (message) => ({
					...message,
					contentBlocks: message.contentBlocks.filter((block) => block.id !== blockId),
				}));
				return appendBlockToLastAssistant(next, {
					type: 'text',
					id: makeId('text'),
					content: `Permission decision: ${decision}. The mock runtime continues without executing anything.`,
				});
			});
			schedule(() => completeTurn(actualActiveTabId), speedDelay(400));
		}

		async function handlePlan(blockId, decision) {
			const block = findBlock(blockId);
			logRendererEvent('plan.decision', {
				blockId,
				found: !!block,
				variant: block?.variant || '',
				hasRuntimeApprovalId: !!block?.runtimeApprovalId,
				decisionType: typeof decision === 'string' ? decision : (decision?.type || ''),
				isStreaming: activeTab?.isStreaming === true,
			});
			if (block?.runtimeApprovalId) {
				const planDecision = normalizePlanDecisionForRuntime(block, decision || { type: 'cancel' });
				const accepted = await submitRuntimeApproval(block, { planDecision }, 'Submitting plan decision');
				if (accepted && (planDecision.type === 'approve' || planDecision.type === 'approve-new-session')) {
					const currentTab = (tabsRef.current || []).find((tab) => tab.id === actualActiveTabId) || activeTab;
					const restoredMode = currentTab?.prePlanPermissionMode || 'normal';
					setSettings((current) => ({ ...current, permissionMode: restoredMode }));
					setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
						...tab,
						prePlanPermissionMode: null,
						pendingNewSessionPlan: planDecision.type === 'approve-new-session' ? planDecision.planContent : null,
					})));
				}
				return;
			}
			if (decision?.type === 'implement' && (!block || block?.variant === 'post-plan')) {
				const currentTab = (tabsRef.current || []).find((tab) => tab.id === actualActiveTabId) || activeTab;
				const restoredSettings = { ...(settingsRef.current || settings), permissionMode: currentTab?.prePlanPermissionMode || 'normal' };
				settingsRef.current = restoredSettings;
				setSettings(restoredSettings);
				setInput('');
				if (currentTab?.isStreaming) {
					setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
						...removeContentBlockById(tab, blockId),
						prePlanPermissionMode: null,
					})));
					setRuntimeStatus({ status: 'running', detail: 'Plan accepted; implementation queued' });
					schedule(() => startPostPlanImplementationWhenIdle(actualActiveTabId, restoredSettings), 50);
					return;
				}
				setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
					...removeContentBlockById(tab, blockId),
					prePlanPermissionMode: null,
				})));
				schedule(() => startTurnWithText(actualActiveTabId, 'Implement the plan.', undefined, { settingsOverride: restoredSettings }), 0);
				return;
			}
			if (block?.variant === 'post-plan') {
				removeInlineBlock(blockId);
				if (decision?.type === 'revise') {
					setInput(decision.text || '');
					inputRef.current?.focus();
					return;
				}
				setSettings((current) => ({ ...current, permissionMode: activeTab?.prePlanPermissionMode || 'normal' }));
				setRuntimeStatus({ detail: 'Plan approval cancelled' });
				return;
			}
			appendToTab(actualActiveTabId, (tab) => {
				const next = updateLastAssistant(tab, (message) => ({
					...message,
					contentBlocks: message.contentBlocks.filter((block) => block.id !== blockId),
				}));
				return appendBlockToLastAssistant(next, {
					type: 'text',
					id: makeId('text'),
					content: decision?.type === 'feedback'
						? `Plan feedback captured: ${decision.text}`
						: `Plan decision: ${decision?.type || 'cancelled'}.`,
				});
			});
			schedule(() => completeTurn(actualActiveTabId), speedDelay(400));
		}

		function syncRuntimeSettingsFromToolbar(nextSettings, tabOverride, reason) {
			if (!api?.updateSettings) return;
			const runtimeTab = tabOverride || tabsRef.current.find((item) => item.id === activeTabIdRef.current) || activeTab;
			const runtimePayload = isProviderRuntimeMode(nextSettings?.runtimeMode)
				? buildRuntimeSettings(runtimeTab, nextSettings)
				: {
					workspace: nextSettings.workspace || '',
					claudeCustomModels: nextSettings.claudeCustomModels || '',
					codexCustomModels: nextSettings.codexCustomModels || '',
				};
			logRendererEvent('runtime.settings.sync.request', {
				reason,
				provider: runtimePayload.provider || nextSettings.provider || '',
				model: runtimePayload.model || '',
				effort: runtimePayload.effort,
				serviceTier: runtimePayload.serviceTier,
				permissionMode: runtimePayload.permissionMode,
			});
			api.updateSettings(runtimePayload).then((result) => {
				logRendererEvent('runtime.settings.sync.result', {
					reason,
					ok: result?.ok !== false,
					restarted: result?.restarted === true,
					invalidatedProviderSessions: Array.isArray(result?.invalidatedProviderSessions) ? result.invalidatedProviderSessions : [],
				});
			}).catch((error) => {
				logRendererEvent('runtime.settings.sync.error', {
					reason,
					error: error instanceof Error ? error.message : String(error),
				});
				setRuntimeStatus({ status: 'error', detail: `Failed to sync runtime settings: ${error instanceof Error ? error.message : String(error)}` });
			});
		}

		function applyToolbarSettingsPatch(updater, reason, options = {}) {
			const currentSettings = settingsRef.current || settings;
			const patch = typeof updater === 'function' ? updater(currentSettings) : updater;
			const nextSettings = normalizeSidebarSettings({ ...currentSettings, ...(patch || {}) });
			settingsRef.current = nextSettings;
			setSettings(nextSettings);
			syncRuntimeSettingsFromToolbar(nextSettings, options.tabOverride, reason);
			return nextSettings;
		}

		function changeModel(model) {
			const currentSettings = settingsRef.current || settings;
			const providerId = modelToProvider(model, currentSettings);
			const nextEffort = safeSidebarEffort(providerId, model, currentSettings.effort, {
				...currentSettings,
				model,
				provider: providerId,
			});
			const nextSettings = applyToolbarSettingsPatch((current) => ({
				model,
				effort: nextEffort,
				modelSelectionSource: 'user',
				provider: providerId,
				runtimeMode: isProviderRuntimeMode(current.runtimeMode) ? providerId : current.runtimeMode,
			}), 'model', {
				tabOverride: {
					...(activeTab || {}),
					model,
					providerId,
				},
			});
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
				...tab,
				model,
				providerId,
				usage: recalculateUsageForModel(tab.usage, model, nextSettings),
				mcpMentions: supportsMcpToolsForProvider(providerId) ? (tab.mcpMentions || []) : [],
				agentChips: tab.providerId === providerId
					? (tab.agentChips || [])
					: (tab.agentChips || []).filter((chip) => chip.providerId === providerId),
			})));
		}

		function resolveCustomModelProvider(requestedProviderId, sourceSettings) {
			if (requestedProviderId === 'claude' || requestedProviderId === 'codex') {
				return requestedProviderId;
			}
			if (sourceSettings?.provider === 'claude' || sourceSettings?.provider === 'codex') {
				return sourceSettings.provider;
			}
			return modelToProvider(sourceSettings?.model, sourceSettings);
		}

		function addCustomModel(rawModel, requestedProviderId) {
			const modelValue = String(rawModel || '').trim();
			if (!modelValue) return;
			const currentSettings = settingsRef.current || settings;
			const providerId = resolveCustomModelProvider(requestedProviderId, currentSettings);
			const customKey = providerId === 'claude' ? 'claudeCustomModels' : 'codexCustomModels';
			const selectionValue = encodeProviderPrefixedModel(providerId, modelValue);
			const nextSettings = applyToolbarSettingsPatch((current) => {
				const nextCustomModels = uniqueModelValues([
					...String(current[customKey] || '').split(/\r?\n/),
					modelValue,
				]).join('\n');
				return {
					[customKey]: nextCustomModels,
					model: selectionValue,
					modelSelectionSource: 'user',
					provider: providerId,
					runtimeMode: isProviderRuntimeMode(current.runtimeMode) ? providerId : current.runtimeMode,
				};
			}, 'custom-model', {
				tabOverride: {
					...(activeTab || {}),
					model: selectionValue,
					providerId,
				},
			});
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
				...tab,
				model: selectionValue,
				providerId,
				usage: recalculateUsageForModel(tab.usage, selectionValue, nextSettings),
				mcpMentions: supportsMcpToolsForProvider(providerId) ? (tab.mcpMentions || []) : [],
				agentChips: tab.providerId === providerId
					? (tab.agentChips || [])
				: (tab.agentChips || []).filter((chip) => chip.providerId === providerId),
			})));
		}

		function removeCustomModel(rawModel, requestedProviderId) {
			const modelValue = String(rawModel || '').trim();
			if (!modelValue) return;
			const currentSettings = settingsRef.current || settings;
			const providerId = resolveCustomModelProvider(requestedProviderId, currentSettings);
			const customKey = providerId === 'claude' ? 'claudeCustomModels' : 'codexCustomModels';
			const runtimeModelsKey = providerId === 'claude' ? 'claudeRuntimeModels' : 'codexRuntimeModels';
			const remainingCustomModels = uniqueModelValues(
				String(currentSettings[customKey] || '')
					.split(/\r?\n/)
					.filter((value) => String(value || '').trim().toLowerCase() !== modelValue.toLowerCase()),
			).join('\n');
			const remainingRuntimeModels = Array.isArray(currentSettings[runtimeModelsKey])
				? currentSettings[runtimeModelsKey].filter((entry) => !(
					String(entry?.source || '').toLowerCase() === 'custom'
					&& String(entry?.value || entry || '').trim().toLowerCase() === modelValue.toLowerCase()
				))
				: currentSettings[runtimeModelsKey];
			const draftSettings = {
				...currentSettings,
				[customKey]: remainingCustomModels,
				[runtimeModelsKey]: remainingRuntimeModels,
			};
			const selectedProviderId = modelToProvider(currentSettings.model, currentSettings);
			const selectedRuntimeModel = providerRuntimeModelId(providerId, currentSettings.model);
			const removesSelectedModel = selectedProviderId === providerId
				&& selectedRuntimeModel.toLowerCase() === modelValue.toLowerCase();
			const fallback = removesSelectedModel
				? getModelOptions(draftSettings).find((item) => (
					item.providerId === providerId && item.value.toLowerCase() !== modelValue.toLowerCase()
				)) || getModelOptions(draftSettings).find((item) => item.value.toLowerCase() !== modelValue.toLowerCase())
				: null;
			const nextModel = fallback ? modelOptionSelectionValue(fallback) : currentSettings.model;
			const nextProviderId = fallback ? fallback.providerId : currentSettings.provider;
			const runtimeTab = {
				...(activeTab || {}),
				model: removesSelectedModel ? nextModel : (activeTab?.model || currentSettings.model),
				providerId: removesSelectedModel ? nextProviderId : (activeTab?.providerId || currentSettings.provider),
			};
			const nextSettings = applyToolbarSettingsPatch((current) => ({
				[customKey]: remainingCustomModels,
				[runtimeModelsKey]: remainingRuntimeModels,
				...(fallback ? {
					model: nextModel,
					modelSelectionSource: 'user',
					provider: nextProviderId,
					runtimeMode: isProviderRuntimeMode(current.runtimeMode) ? nextProviderId : current.runtimeMode,
				} : {}),
			}), 'remove-custom-model', { tabOverride: runtimeTab });
			if (!fallback) return;
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
				...tab,
				model: nextModel,
				providerId: nextProviderId,
				usage: recalculateUsageForModel(tab.usage, nextModel, nextSettings),
				mcpMentions: supportsMcpToolsForProvider(nextProviderId) ? (tab.mcpMentions || []) : [],
				agentChips: tab.providerId === nextProviderId
					? (tab.agentChips || [])
					: (tab.agentChips || []).filter((chip) => chip.providerId === nextProviderId),
			})));
		}

		function markProviderAssetsDirty() {
			providerAssetsDirtyRef.current = true;
		}

		async function refreshProviderAssets(workspaceOverride, options = {}) {
			if (!api?.loadProviderAssets) {
				return { ok: false, error: 'Provider asset runtime API is unavailable' };
			}
			const workspace = String(workspaceOverride || settings.workspace || '').trim();
			const result = await api.loadProviderAssets({
				workspace,
				provider: options.provider || settings.provider || modelToProvider(settings.model, settings),
				includeClaudeRuntimeCommands: options.includeClaudeRuntimeCommands === true,
				includeCodexRuntimeSkills: options.includeCodexRuntimeSkills === true,
				includeRuntimeModels: options.includeRuntimeModels === true,
				forceReload: options.forceReload === true,
				settings: options.settings || null,
			});
			if (result?.ok && result.assets) {
				providerAssetsLoadedRef.current = true;
				if (options.applyToGlobal !== false) {
					setSettings((current) => mergeProviderAssetsIntoSettings(current, result.assets, {
						forceEmpty: options.forceEmpty !== false,
					}));
				}
			}
			return result;
		}

		const requestCodexRuntimeSkills = useCallback(async (options = {}) => {
			const result = await refreshProviderAssets(settings.workspace, {
				provider: 'codex',
				includeCodexRuntimeSkills: true,
				forceReload: options.forceReload === true,
				forceEmpty: false,
			});
			if (result?.ok && Array.isArray(result.assets?.codexRuntimeSkills)) {
				logRendererEvent('settings.codexRuntimeSkills.refreshed', {
					count: result.assets.codexRuntimeSkills.length,
				});
			}
			return result;
		}, [
			settings.workspace,
			settings.codexInstallationMethod,
			settings.codexPath,
			settings.codexWslDistroOverride,
			settings.openaiModel,
		]);

		const requestClaudeRuntimeCommands = useCallback(async (options = {}) => {
			const result = await refreshProviderAssets(settings.workspace, {
				provider: 'claude',
				includeClaudeRuntimeCommands: true,
				forceReload: options.forceReload === true,
				forceEmpty: false,
			});
			if (result?.ok && Array.isArray(result.assets?.claudeRuntimeCommands)) {
				logRendererEvent('settings.claudeRuntimeCommands.refreshed', {
					count: result.assets.claudeRuntimeCommands.length,
				});
			}
			return result;
		}, [
			settings.workspace,
			settings.claudePath,
			settings.claudeSafeMode,
			settings.claudeLoadUserSettings,
			settings.claudeEnableChrome,
			settings.envText,
		]);

		async function updateMcpServers(nextServers, options = {}) {
			const normalized = (Array.isArray(nextServers) ? nextServers : []).map(normalizeMcpServer);
			const previous = (mcpServersRef.current || []).map(normalizeMcpServer);
			const saveSeq = mcpSaveSeqRef.current + 1;
			mcpSaveSeqRef.current = saveSeq;
			setMcpServers(normalized);
			if (!api?.saveMcpServers) {
				return normalized;
			}
			try {
				const workspace = String(options.workspace || settings.workspace || '').trim();
				const result = await api.saveMcpServers({ workspace, servers: normalized });
				if (!result?.ok) {
					throw new Error(result?.error || 'Failed to save MCP servers');
				}
				const saved = Array.isArray(result.servers) ? result.servers.map(normalizeMcpServer) : normalized;
				if (mcpSaveSeqRef.current === saveSeq) {
					setMcpServers(saved);
					setRuntimeStatus({ status: 'ready', detail: 'MCP servers saved' });
				}
				return saved;
			}
			catch (error) {
				const message = formatMcpSaveError(error);
				if (mcpSaveSeqRef.current === saveSeq) {
					setMcpServers(previous);
					setRuntimeStatus({ status: 'error', detail: message });
				}
				throw new Error(message);
			}
		}

		async function copyRuntimeLogPath() {
			const value = String(runtimeLogPath || '').trim();
			if (!value) {
				setRuntimeLogCopyStatus('Unavailable');
				return;
			}
			try {
				if (navigator?.clipboard?.writeText) {
					await navigator.clipboard.writeText(value);
				}
				else {
					const textarea = document.createElement('textarea');
					textarea.value = value;
					textarea.style.position = 'fixed';
					textarea.style.left = '-9999px';
					document.body.appendChild(textarea);
					textarea.focus();
					textarea.select();
					document.execCommand('copy');
					textarea.remove();
				}
				setRuntimeLogCopyStatus('Copied');
				logRendererEvent('runtime.logPath.copy', { ok: true, logPath: value });
				window.setTimeout(() => setRuntimeLogCopyStatus(''), 1600);
			}
			catch (error) {
				setRuntimeLogCopyStatus('Copy failed');
				logRendererEvent('runtime.logPath.copy', {
					ok: false,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		async function openRuntimeLogFolder() {
			const value = String(runtimeLogPath || '').trim();
			if (!value || !api?.openLogFolder) {
				setRuntimeLogCopyStatus('Unavailable');
				window.setTimeout(() => setRuntimeLogCopyStatus(''), 1600);
				return;
			}
			try {
				const result = await api.openLogFolder();
				if (!result?.ok) {
					throw new Error(result?.error || 'Unable to open log folder');
				}
				setRuntimeLogCopyStatus('Opened');
				logRendererEvent('runtime.logFolder.open', { ok: true, logPath: value, folder: result.path || '' });
				window.setTimeout(() => setRuntimeLogCopyStatus(''), 1600);
			}
			catch (error) {
				setRuntimeLogCopyStatus('Open failed');
				logRendererEvent('runtime.logFolder.open', {
					ok: false,
					logPath: value,
					error: error instanceof Error ? error.message : String(error),
				});
				window.setTimeout(() => setRuntimeLogCopyStatus(''), 2200);
			}
		}

		async function refreshRuntimeDiagnostics(options = {}) {
			if (!api?.getDiagnostics) {
				setRuntimeDiagnosticsStatus('Unavailable');
				window.setTimeout(() => setRuntimeDiagnosticsStatus(''), 1600);
				return null;
			}
			if (!options.quiet) {
				setRuntimeDiagnosticsStatus('Refreshing');
			}
			try {
				const result = await api.getDiagnostics();
				if (!result?.ok) {
					throw new Error(result?.error || 'Unable to load diagnostics');
				}
				setRuntimeDiagnostics(result);
				if (!options.quiet) {
					setRuntimeDiagnosticsStatus('Updated');
				}
				logRendererEvent('runtime.diagnostics.refresh', {
					ok: true,
					pendingApprovalCount: result.pendingApprovalCount || 0,
					openTurnCount: result.openTurnCount || 0,
					emptyResponseCount: result.emptyResponseCount || 0,
					errorCount: result.errorCount || 0,
				});
				if (!options.quiet) {
					window.setTimeout(() => setRuntimeDiagnosticsStatus(''), 1600);
				}
				return result;
			}
			catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				setRuntimeDiagnosticsStatus('Refresh failed');
				logRendererEvent('runtime.diagnostics.refresh', { ok: false, error: message });
				window.setTimeout(() => setRuntimeDiagnosticsStatus(''), 2200);
				return null;
			}
		}

		function updateSettings(next, options = {}) {
			const previousTheme = normalizeTheme(settings?.theme);
			const normalized = normalizeSidebarSettings(next);
			normalized.locale = normalizeLocale(normalized.locale);
			normalized.theme = normalizeTheme(normalized.theme);
			normalized.sidebarFontSize = normalizeSidebarFontSize(normalized.sidebarFontSize);
			if (normalized.model !== settings.model) {
				normalized.modelSelectionSource = 'user';
			}
			if (normalized.runtimeMode === 'codex' && modelToProvider(normalized.model, normalized) !== 'codex') {
				normalized.model = normalized.openaiModel || 'gpt-5.5';
			}
			if (normalized.runtimeMode === 'claude' && modelToProvider(normalized.model, normalized) !== 'claude') {
				normalized.model = 'sonnet';
			}
			normalized.provider = normalized.runtimeMode === 'codex'
				? 'codex'
				: normalized.runtimeMode === 'claude'
					? 'claude'
					: modelToProvider(normalized.model, normalized);
			settingsRef.current = normalized;
			setSettings(normalized);
			if (previousTheme !== normalized.theme) {
				requestShellThemeChange(normalized.theme);
			}
			setTabs((current) => updateTab(current, actualActiveTabId, (tab) => ({
				...tab,
				model: normalized.model,
				providerId: normalized.provider,
			})));
			if (api?.updateSettings) {
				const runtimeModel = providerRuntimeModelId(normalized.provider, normalized.model);
				const runtimeServiceTier = normalized.provider === 'codex' && isFastTierCodexModel(runtimeModel) && normalized.serviceTier === 'fast'
					? 'fast'
					: 'default';
				const runtimePayload = normalized.runtimeMode === 'codex' || normalized.runtimeMode === 'claude'
					? {
						provider: normalized.provider,
						workspace: normalized.workspace,
						codexPath: normalized.codexPath || '',
					codexDownloadSource: normalized.codexDownloadSource || 'npm-mirror',
						codexDownloadUrl: normalized.codexDownloadUrl || '',
						codexInstallationMethod: normalized.codexInstallationMethod || 'native-windows',
						codexWslDistroOverride: normalized.codexWslDistroOverride || '',
						claudePath: normalized.claudePath || '',
						model: runtimeModel,
						effort: normalizeRuntimeEffort(normalized.effort),
						reasoningSummary: normalized.reasoningSummary || 'detailed',
						serviceTier: runtimeServiceTier,
						permissionMode: normalized.permissionMode || 'normal',
						sandbox: normalized.sandbox || 'read-only',
						sidebarFontSize: normalized.sidebarFontSize,
						llmProviderMode: 'native-cli',
						modelSelectionSource: normalized.modelSelectionSource === 'user' ? 'user' : 'native',
						openaiModel: normalized.openaiModel || '',
						claudeCustomModels: normalized.claudeCustomModels || '',
						codexCustomModels: normalized.codexCustomModels || '',
						claudeSafeMode: normalized.claudeSafeMode || 'acceptEdits',
						claudeLoadUserSettings: normalized.claudeLoadUserSettings !== false,
						claudeEnableChrome: normalized.claudeEnableChrome === true,
						claudeEnableBangBash: normalized.claudeEnableBangBash !== false,
						claudeHiddenCommands: normalized.claudeHiddenCommands || '',
						codexHiddenCommands: normalized.codexHiddenCommands || '',
						envText: runtimeEnvTextForSettings(normalized),
						systemPrompt: buildStandaloneSystemPrompt(normalized),
					}
					: normalized;
				api.updateSettings(runtimePayload).catch(() => {});
			}
			if (api?.saveMcpServers) {
				api.saveMcpServers({
					workspace: normalized.workspace,
					servers: mcpServers.map(normalizeMcpServer),
				}).then((result) => {
					if (result?.ok && Array.isArray(result.servers)) {
						setMcpServers(result.servers.map(normalizeMcpServer));
					}
				}).catch(() => {});
			}
			if (api?.saveProviderAssets && providerAssetsDirtyRef.current) {
				api.saveProviderAssets({
					workspace: normalized.workspace,
					assets: buildProviderAssetsPayload(normalized),
				}).then((result) => {
					if (result?.ok && result.assets) {
						providerAssetsLoadedRef.current = true;
						providerAssetsDirtyRef.current = false;
						logRendererEvent('settings.providerAssets.saved', {
							workspace: normalized.workspace,
							summary: summarizeProviderAssetsForLog(result.assets),
						});
						setSettings((current) => mergeProviderAssetsIntoSettings(current, result.assets, { forceEmpty: true }));
						setRuntimeStatus({ status: 'ready', detail: 'Provider assets saved' });
					}
					else if (result && !result.ok) {
						logRendererEvent('settings.providerAssets.saveFailed', {
							workspace: normalized.workspace,
							error: result.error || 'Failed to save provider assets',
						});
						setRuntimeStatus({ status: 'error', detail: result.error || 'Failed to save provider assets' });
					}
				}).catch((error) => {
					logRendererEvent('settings.providerAssets.saveFailed', {
						workspace: normalized.workspace,
						error: error instanceof Error ? error.message : String(error),
					});
					setRuntimeStatus({ status: 'error', detail: error instanceof Error ? error.message : String(error) });
				});
			}
			if (!options.keepOpen) {
				setDrawerOpen(false);
			}
		}

		function resetMockState() {
			const next = createDefaultMockState();
			const urlSettings = readUrlSettingsOverride();
			if (Object.keys(urlSettings).length) {
				next.settings = { ...next.settings, ...urlSettings };
				next.tabs = next.tabs.map((tab) => ({
					...tab,
					model: urlSettings.model || tab.model,
					providerId: urlSettings.provider || tab.providerId,
				}));
			}
			try {
				window.localStorage.removeItem(STORAGE_KEY);
			}
			catch {
				// Reset still works for the active in-memory mock state.
			}
			timersRef.current.forEach((timer) => window.clearTimeout(timer));
			timersRef.current = [];
			setSettings(next.settings);
			setTabs(next.tabs);
			setActiveTabId(next.activeTabId);
			setInputByTab(next.inputByTab);
			setHistories(next.histories);
			setExternalPaths(next.externalPaths);
			setMcpServers(next.mcpServers);
			turnContextRef.current = normalizeTurnContext(null);
			setTurnContext(turnContextRef.current);
			setDrawerOpen(false);
			setInlineEditOpen(false);
		}

		const navContent = h('div', { className: 'claudian-input-nav-content' },
			h(TabBadges, { tabs, activeTabId: actualActiveTabId, maxTabs: configuredMaxTabs, onSwitch: setActiveTabId, onClose: closeTab }),
			h('div', { className: 'claudian-input-nav-actions' },
				h('div', { className: `claudian-input-nav-btn claudian-new-tab-btn ${tabs.length >= configuredMaxTabs ? 'claudian-hidden' : ''}`, onClick: createTab, 'aria-label': 'New tab' }, h(Icon, { name: 'square-plus' })),
				h('div', { className: 'claudian-input-nav-btn', onClick: newConversation, 'aria-label': 'New conversation' }, h(Icon, { name: 'square-pen' })),
				h('div', { className: 'claudian-history-container' },
					h('div', { className: 'claudian-input-nav-btn', onClick: (event) => { event.stopPropagation(); setHistoryVisible((value) => !value); }, 'aria-label': 'Chat history' }, h(Icon, { name: 'history' })),
					h(HistoryMenu, {
						visible: historyVisible,
						histories,
						tabs,
						activeTabId: actualActiveTabId,
						activeHistoryId: activeTab?.historyId,
						onOpen: (id) => openHistory(id, false),
						onOpenNew: (id) => openHistory(id, true),
						onRename: renameHistory,
						onDelete: deleteHistory,
					}),
				),
				!chatOnly ? h('div', { className: 'claudian-input-nav-btn', onClick: () => setInlineEditOpen(true), 'aria-label': 'Inline edit' }, h(Icon, { name: 'pencil' })) : null,
				h('div', { className: 'claudian-input-nav-btn', onClick: () => setDrawerOpen(true), 'aria-label': 'Settings' }, h(Icon, { name: 'settings' })),
			),
		);

		if (!activeTab) return null;

		const pendingInlineInteraction = findActiveInlineInteractionBlock(activeTab);
		const hostClass = settings.runtimeMode === 'mock' ? 'claudian-mock-host' : 'claudian-provider-host';
		const sidebarFontSize = normalizeSidebarFontSize(settings.sidebarFontSize);
		return h('div', {
			className: `claudian-container claudian-standalone-host ${hostClass}`,
			'data-provider': activeTab.providerId,
			style: {
				'--claudian-sidebar-font-size': `${sidebarFontSize}px`,
			},
			onKeyDown: (event) => {
				if (event.defaultPrevented) return;
				if (event.key === 'Escape' && activeTab.isStreaming && !event.isComposing) {
					event.preventDefault();
					event.stopPropagation();
					cancel();
					return;
				}
				if (event.key === 'Tab' && event.shiftKey && !event.isComposing) {
					event.preventDefault();
					const nextMode = settings.permissionMode === 'plan' ? (activeTab.prePlanPermissionMode || 'normal') : 'plan';
					applyToolbarSettingsPatch({ permissionMode: nextMode }, 'permission-mode');
					setTabs((current) => updateTab(current, activeTab.id, (tab) => ({
						...tab,
						prePlanPermissionMode: settings.permissionMode === 'plan' ? null : settings.permissionMode,
					})));
				}
			},
			},
			chatOnly ? h('nav', { className: 'claudian-chat-providers', 'aria-label': 'AI 对话引擎' },
				['codex', 'claude'].map((providerId) => h('button', {
					key: providerId, type: 'button', 'aria-pressed': activeTab.providerId === providerId,
					disabled: activeTab.isStreaming, title: providerProductLabel(providerId),
					onClick: () => {
						if (activeTab.providerId === providerId) return;
						const existing = tabs.find((tab) => tab.providerId === providerId);
						if (existing) { setActiveTabId(existing.id); return; }
						const model = getModelOptions(settings).find((option) => option.providerId === providerId);
						changeModel(model?.selectionValue || encodeProviderPrefixedModel(providerId,
							providerId === 'claude' ? 'sonnet' : (settings.openaiModel || DEFAULT_SETTINGS.model)));
					},
				}, h(ProviderIcon, { providerId, size: 16 }), h('span', null, providerId === 'codex' ? 'Codex' : 'Claude'))),
			) : h(Header, { providerId: activeTab.providerId, sidebarMode, markdownNote: markdownNoteTab, settings }),
			environment && Array.isArray(environment.items) && environment.items.some((item) => !item.ok) ? h('div', { className: 'claudian-environment-startup' },
				h('span', null, `运行环境缺少：${environment.items.filter((item) => !item.ok).map((item) => item.name).join('、')}`),
				h('button', { type: 'button', onClick: () => setDrawerOpen(true) }, '检查并安装'),
			) : null,
			h(InlineEditPanel, {
				open: inlineEditOpen,
				providerEnabled: settings.runtimeMode === 'claude' || settings.runtimeMode === 'codex',
				onProviderInlineEdit: runProviderInlineEdit,
				settings,
				externalPaths,
				providerId: activeTab.providerId,
				onClose: () => {
					api?.cancelInlineEdit?.().catch(() => {});
					setInlineEditOpen(false);
				},
			}),
			h('div', { className: 'claudian-tab-content-container' },
				h('div', { className: 'claudian-tab-content' },
					h('div', { className: 'claudian-messages-wrapper' },
						h('div', {
							ref: messagesRef,
							className: 'claudian-messages claudian-messages-focusable',
							tabIndex: 0,
							'data-auto-scroll': autoScrollEnabled ? 'true' : 'false',
							onKeyDown: handleMessagesKeyDown,
							onKeyUp: (event) => {
								const key = String(event.key || '').toLowerCase();
								if (key === 'j' || key === 'k') stopKeyboardScroll();
							},
							onBlur: stopKeyboardScroll,
						},
							activeTab.messages.length === 0 ? h('div', { className: 'claudian-welcome' },
								h('div', { className: 'claudian-welcome-greeting' }, getGreeting(activeTab.providerId, settings)),
							) : activeTab.messages.map((message, index) => {
								const rewindContext = message.role === 'user'
									? findRewindContext(activeTab.messages, index, activeTab.runtimeProviderId || activeTab.providerId)
									: null;
								const canRewind = message.role === 'user'
									&& activeTab.providerId !== 'codex'
									&& Boolean(rewindContext?.hasResponse);
								const canFork = message.role === 'user'
									&& Boolean(rewindContext?.hasResponse && rewindContext?.prevAssistantId);
								return h(Message, {
									key: message.id,
									message,
									providerId: activeTab.providerId,
									settings,
									canRewind,
									canFork,
									onRewind: rewindToMessage,
									onFork: requestForkFromMessage,
									onAskAnswer: handleAskAnswer,
									onPermission: handlePermission,
									onPlan: handlePlan,
									onAddToNote: chatOnly ? undefined : requestAppendToMarkdownNote,
									hiddenInlineInteractionBlockId: pendingInlineInteraction?.blockId || '',
								});
							}),
						),
						h(NavigationSidebar, {
							messagesRef,
							messages: activeTab.messages,
							onReachedBottom: () => setAutoScroll(settings.enableAutoScroll !== false),
						}),
					),
					hasStatusPanelContent(activeTab) ? h('div', { className: 'claudian-status-panel-container' }, h(StatusPanel, { tab: activeTab })) : null,
				),
				h(RuntimeCornerLoader, {
					tab: activeTab,
					runtimeStatus,
					settings,
				}),
			),
			h(CodexDownloadPanel, { download: codexDownloadStatus }),
			h('div', { className: 'claudian-input-footer' },
				h('div', { className: `claudian-active-input-slot ${pendingInlineInteraction ? 'claudian-active-input-slot-inline' : ''}` },
					pendingInlineInteraction ? h(InlineInteractionSurface, {
						pending: pendingInlineInteraction,
						onAskAnswer: handleAskAnswer,
						onPermission: handlePermission,
						onPlan: handlePlan,
					}) : h(Composer, {
						tab: activeTab,
						settings,
						input,
						setInput,
						inputRef,
						onSend: send,
						onInstructionSubmit: (instruction) => openInstructionModal(instruction),
						onCancel: cancel,
						onFocusMessages: focusMessages,
						navContent,
						externalPaths,
						mcpServers,
						turnContext,
						pdfSelection: currentPdfSelection,
						includePdfSelection,
						pdfSnippetCatalog,
						pdfSnippetChips: activeTab.pdfSnippetChips || [],
						featureGuideAction,
						onDismissPdfSelection: dismissPdfSelection,
						onDismissGraphSelection: dismissGraphSelection,
						onAddPdfSnippet: addPdfSnippet,
						onRemovePdfSnippet: removePdfSnippet,
						onClearPdfSnippets: clearPdfSnippets,
						onRequestPdfSnippetsRefresh: requestPdfSnippetsRefresh,
						onAttachMentionFile: attachMentionFile,
						onRemoveMentionFile: removeMentionFile,
						onMentionMcp: mentionMcpServer,
						onRemoveMcpMention: removeMcpMention,
						onMentionAgent: mentionAgent,
						onRemoveAgentMention: removeAgentMention,
						onAttachImages: attachImages,
						onRemoveImage: removeImage,
						onEditQueued: editQueuedMessage,
						onDiscardQueued: clearQueuedMessage,
						onSteerQueued: steerQueuedMessage,
						onBangBashCommand: (command) => {
							if (!isBangBashEnabledForProvider(activeTab.providerId, settings)) return;
							runLocalBangBashCommand(activeTab.id, command);
						},
						onRequestClaudeRuntimeCommands: requestClaudeRuntimeCommands,
						onRequestCodexRuntimeSkills: requestCodexRuntimeSkills,
						claudeRuntimeCommandRefreshReady: runtimeStateLoaded,
						codexRuntimeSkillRefreshReady: runtimeStateLoaded,
						resumeVisible,
						histories,
						activeHistoryId: activeTab?.historyId,
						onResumeSelect: (id) => openHistory(id, false),
						onDismissResume: () => setResumeVisible(false),
						toolbarProps: {
							tab: activeTab,
							settings,
							usage: activeTab.usage,
							externalPaths,
							mcpServers,
							onModel: changeModel,
							onAddCustomModel: addCustomModel,
							onRemoveCustomModel: removeCustomModel,
							onEffort: (value) => applyToolbarSettingsPatch({ effort: normalizeSidebarEffort(value) }, 'effort'),
							onServiceTier: () => applyToolbarSettingsPatch((current) => ({ serviceTier: current.serviceTier === 'fast' ? 'default' : 'fast' }), 'service-tier'),
							onPermission: () => applyToolbarSettingsPatch((current) => ({ permissionMode: current.permissionMode === 'yolo' ? 'normal' : 'yolo' }), 'permission-mode'),
							onMode: () => applyToolbarSettingsPatch((current) => ({ mode: current.mode === 'agent' ? 'chat' : 'agent' }), 'mode'),
							onAddContext: pickExternalContext,
							onRemoveContext: (path) => setExternalPaths((current) => current.filter((item) => item.path !== path)),
							onTogglePersistent: (path) => setExternalPaths((current) => current.map((item) => item.path === path ? { ...item, persistent: !item.persistent } : item)),
							onToggleMcp: (name) => {
								const next = (mcpServersRef.current || []).map((server) => server.name === name ? { ...server, enabled: !server.enabled } : server);
								void updateMcpServers(next).catch(() => {});
							},
						},
					}),
				),
			),
			h(SettingsDrawer, {
				open: drawerOpen,
				settings,
				runtimeStatus,
				runtimeLogPath,
				runtimeLogCopyStatus,
				runtimeDiagnostics,
				runtimeDiagnosticsStatus,
				environment,
				onEnvironmentAction: environmentAction,
				onCopyRuntimeLogPath: copyRuntimeLogPath,
				onOpenRuntimeLogFolder: api?.openLogFolder ? openRuntimeLogFolder : null,
				onRefreshRuntimeDiagnostics: api?.getDiagnostics ? refreshRuntimeDiagnostics : null,
				mcpServers,
				onMcpServersChange: updateMcpServers,
				onProviderAssetsDirty: markProviderAssetsDirty,
				onRefreshProviderAssets: refreshProviderAssets,
				onClose: () => setDrawerOpen(false),
				onSave: updateSettings,
				onReset: resetMockState,
			}),
			instructionModal ? h(InstructionModal, {
				key: instructionModal.id,
				rawInstruction: instructionModal.rawInstruction,
				providerEnabled: isProviderRuntimeMode(settings.runtimeMode),
				onProviderInstructionRefine: runProviderInstructionRefine,
				onAccept: acceptInstruction,
				onReject: rejectInstruction,
				onError: closeInstructionWithError,
			}) : null,
			forkRequest ? h(ForkTargetModal, {
				onChoose: performFork,
				onClose: () => setForkRequest(null),
			}) : null,
		);
	}

	if (window.__CLAUDIAN_ENABLE_TESTING__ === true) {
		window.__CLAUDIAN_SIDEBAR_TESTING__ = {
			createParentBridgeApi,
			getModelOptions,
			getModelLabel,
			modelToProvider,
			providerRuntimeModelId,
			modelOptionSelectionValue,
			getClaudeModelOptions,
			getCodexModelOptions,
			getSlashCommandItems,
			getCodexSkillItems,
			createCodexSkillPersistenceKey,
			parseCodexSkillRootId,
			getSlashTrigger,
			getSkillTrigger,
			getPdfSnippetTrigger,
			stripTransientPdfSnippetTrigger,
			sanitizePersistedInputByTab,
			normalizePdfAiShellPayload,
			buildPdfSnippetItems,
			filterPdfSnippetEntries,
			buildPdfSnippetTree,
			filterPdfSnippetTree,
			filterPdfSnippetTreeByType,
			countPdfTreeFilterLeaves,
			PDF_TREE_TYPE_FILTERS,
			collectPdfTreeSelectableLeaves,
			collectPdfTreeSelectionTargets,
			collectPdfTreeVisibleNodes,
			collectDefaultPdfTreeExpandedIds,
			pdfTreeSelectionState,
			pdfSnippetSelectionKey,
			buildPdfSelectionPromptContent,
			buildPdfSnippetPromptContent,
			buildPdfMessageContextChips,
			normalizePdfSelectionImages,
			mergePromptWithPdfContext,
			parseMarkdownBlocks,
			toolIconForName,
			buildMockMcpTools,
			resolveMcpTestTools,
			clearInvalidatedProviderRuntimeState,
			extractSkillNames,
			commandNameToClaudeSkillName,
			resolveComposerModeKeyAction,
			resolveStandaloneSlashCommandAction,
			shouldEchoStandaloneCommandInChat,
			assistantCheckpointId,
			applyRuntimeTurnMetadataToAssistant,
			resolveRuntimeProviderForTab,
			hasQueuedTurn,
			restoreCancelledQueueInput,
			createCancelledTabState,
			runtimeWaitingBlock,
			runtimeWaitingDisplay,
			runtimeWaitingHint,
			planImplementationPrompt,
			normalizePlanDecisionForRuntime,
			createPlanNewSessionTab,
			extractGeneratedFilePaths,
			collectStatusPanelData,
			hasStatusPanelContent,
			userMessage,
			isStatusPanelBashRunning,
			shouldAutoExpandStatusPanelBash,
			truncateStatusPanelDescription,
			createRuntimeTestTab,
			applyRuntimeChunksForTesting,
			applyRuntimeEventsForTesting,
			resolveRuntimeEventTabIdFromTabs,
			shouldDropRuntimeEventForTab,
			normalizePermissionDecisionOptions,
			findActiveInlineInteractionBlock,
			filterInlineInteractionBlocks,
			lastAssistantWasInterrupted,
			removeResolvedRuntimeApproval,
			approvalToBlock,
			normalizeUsageInfo,
			recalculateUsageForModel,
			getConfiguredContextWindow,
			getContextMeterDisplay,
			mergeNativeHistories,
			getSettingsProviderAssetRefreshSpec,
			mergeProviderAssetsIntoSettings,
			shouldUseMockSeedData,
			createDefaultMockState,
			createRuntimeWaitingMockState,
			loadPersistedMockState,
			coalesceRuntimeChunks,
			groupRuntimeChunkItemsByTab,
			summarizeRuntimeChunkTypes,
		};
	}

	ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
