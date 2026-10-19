const { contextBridge, ipcRenderer } = require('electron');
const { createHostBridge: createSharedClaudianHostBridge } = require('./claudian-host-bridge');

const CHANNELS = Object.freeze({
	getState: 'claudian-sidebar:get-state',
	getDiagnostics: 'claudian-sidebar:get-diagnostics',
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
	respondApproval: 'claudian-sidebar:respond-approval',
	pickWorkspace: 'claudian-sidebar:pick-workspace',
	openLogFolder: 'claudian-sidebar:open-log-folder',
	openPath: 'claudian-sidebar:open-path',
	getMineruWorkspaceTrees: 'claudian-sidebar:get-mineru-workspace-trees',
	log: 'claudian-sidebar:log',
	event: 'claudian-sidebar:event',
});

const sidebarApi = {
	environment(payload) {
		return ipcRenderer.invoke('claudian-sidebar:environment', payload || {});
	},
	getState() {
		return ipcRenderer.invoke(CHANNELS.getState);
	},
	getDiagnostics() {
		return ipcRenderer.invoke(CHANNELS.getDiagnostics);
	},
	updateSettings(payload) {
		return ipcRenderer.invoke(CHANNELS.updateSettings, payload || {});
	},
	saveMcpServers(payload) {
		return ipcRenderer.invoke(CHANNELS.saveMcpServers, payload || {});
	},
	testMcpServer(payload) {
		return ipcRenderer.invoke(CHANNELS.testMcpServer, payload || {});
	},
	loadProviderAssets(payload) {
		return ipcRenderer.invoke(CHANNELS.loadProviderAssets, payload || {});
	},
	saveProviderAssets(payload) {
		return ipcRenderer.invoke(CHANNELS.saveProviderAssets, payload || {});
	},
	generateTitle(payload) {
		return ipcRenderer.invoke(CHANNELS.generateTitle, payload || {});
	},
	cancelTitleGeneration(payload) {
		return ipcRenderer.invoke(CHANNELS.cancelTitleGeneration, payload || {});
	},
	startInstructionRefine(payload) {
		return ipcRenderer.invoke(CHANNELS.startInstructionRefine, payload || {});
	},
	continueInstructionRefine(payload) {
		return ipcRenderer.invoke(CHANNELS.continueInstructionRefine, payload || {});
	},
	cancelInstructionRefine() {
		return ipcRenderer.invoke(CHANNELS.cancelInstructionRefine);
	},
	startInlineEdit(payload) {
		return ipcRenderer.invoke(CHANNELS.startInlineEdit, payload || {});
	},
	continueInlineEdit(payload) {
		return ipcRenderer.invoke(CHANNELS.continueInlineEdit, payload || {});
	},
	cancelInlineEdit() {
		return ipcRenderer.invoke(CHANNELS.cancelInlineEdit);
	},
	rewindClaudeFiles(payload) {
		return ipcRenderer.invoke(CHANNELS.rewindClaudeFiles, payload || {});
	},
	runBangBash(payload) {
		return ipcRenderer.invoke(CHANNELS.runBangBash, payload || {});
	},
	startTurn(payload) {
		return ipcRenderer.invoke(CHANNELS.startTurn, payload || {});
	},
	steerTurn(payload) {
		return ipcRenderer.invoke(CHANNELS.steerTurn, payload || {});
	},
	cancelTurn() {
		return ipcRenderer.invoke(CHANNELS.cancelTurn);
	},
	respondApproval(payload) {
		return ipcRenderer.invoke(CHANNELS.respondApproval, payload || {});
	},
	pickWorkspace() {
		return ipcRenderer.invoke(CHANNELS.pickWorkspace);
	},
	openLogFolder() {
		return ipcRenderer.invoke(CHANNELS.openLogFolder);
	},
	openPath(payload) {
		return ipcRenderer.invoke(CHANNELS.openPath, payload || {});
	},
	getMineruWorkspaceTrees(payload) {
		return ipcRenderer.invoke(CHANNELS.getMineruWorkspaceTrees, payload || {});
	},
	log(payload) {
		return ipcRenderer.invoke(CHANNELS.log, payload || {});
	},
	onEvent(listener) {
		const handler = (_event, envelope) => {
			listener(envelope || {});
		};
		ipcRenderer.on(CHANNELS.event, handler);
		return () => ipcRenderer.removeListener(CHANNELS.event, handler);
	},
};

let activeHostBridge = null;

function createHostBridge(options = {}) {
	return createSharedClaudianHostBridge({
		api: sidebarApi,
		hostWindow: globalThis.window,
		allowedOrigins: options.allowedOrigins,
		sourceSelector: options.sourceSelector,
	});
}

contextBridge.exposeInMainWorld('claudianSidebar', sidebarApi);

contextBridge.exposeInMainWorld('claudianSidebarHostBridge', {
	attach(options = {}) {
		activeHostBridge?.dispose?.();
		activeHostBridge = createHostBridge(options || {});
		return {
			dispose() {
				if (activeHostBridge) {
					activeHostBridge.dispose();
					activeHostBridge = null;
				}
			},
		};
	},
	dispose() {
		activeHostBridge?.dispose?.();
		activeHostBridge = null;
	},
});
