'use strict';
require('./process-output.cjs');
const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const showcase = process.argv.includes('--showcase') || process.argv.includes('--responsive-test') || process.argv.includes('--header-test') || process.argv.includes('--claude-ui-test');
const liveCategories = process.argv.includes('--live-categories');
const liveCodexFeatures = process.argv.includes('--live-codex-features');
const livePlan = process.argv.includes('--live-plan');
const liveThreadTools = process.argv.includes('--live-thread-tools');
const liveShowcase = process.argv.includes('--live-showcase');
const liveQueue = process.argv.includes('--live-queue');
const responsiveTest = process.argv.includes('--responsive-test');
const headerTest = process.argv.includes('--header-test');
const claudeUiTest = process.argv.includes('--claude-ui-test');
const claudeInteractionsTest = process.argv.includes('--claude-interactions-test');
const claudeLiveOnly = process.argv.includes('--claude-live-only');
const claudeSourceTest = process.argv.some(value => value.startsWith('--claude-source-test='));
const controlsLiveTest = process.argv.includes('--controls-live-test');
const scrollLiveTest = process.argv.includes('--scroll-live-test');
const thinkingLiveTest = process.argv.includes('--thinking-live-test');
const longTaskTest = process.argv.includes('--long-task-test');
const liveTest = process.argv.includes('--live-test') || liveCategories || liveCodexFeatures || livePlan || liveThreadTools || liveQueue || liveShowcase || responsiveTest || headerTest || claudeUiTest || claudeInteractionsTest || claudeLiveOnly || claudeSourceTest || longTaskTest || controlsLiveTest || scrollLiveTest || thinkingLiveTest;
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const runDir = liveTest ? path.join(root, '.tmp-standalone', new Date().toISOString().replace(/[:.]/g, '-')) : null;
const workspace = path.resolve(argument('workspace') || (runDir ? path.join(runDir, 'workspace') : root));
const userData = argument('profile') ? path.resolve(argument('profile')) : runDir ? path.join(runDir, 'profile') : path.join(app.getPath('appData'), 'ai-sidebar-standalone');
if (runDir) fs.mkdirSync(runDir, { recursive: true });
fs.mkdirSync(userData, { recursive: true });
fs.mkdirSync(workspace, { recursive: true });
app.setName('AI Sidebar');
app.setPath('userData', userData);
delete process.env.PDF_AI_CLAUDIAN_SETTINGS_PATH;
let window, runtime, quitting = false;

function showForReview() {
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const width = Math.min(440, area.width - 24), height = Math.min(760, area.height - 24);
  if (window.isMinimized()) window.restore();
  window.setBounds({ x: area.x + area.width - width - 12, y: area.y + 12, width, height });
  if (process.argv.includes('--maximized')) window.maximize();
  window.show(); window.setAlwaysOnTop(true); window.moveTop(); window.focus();
  setTimeout(() => { if (!window.isDestroyed()) window.setAlwaysOnTop(false); }, 1500);
  console.log('Review window: ' + JSON.stringify({ visible: window.isVisible(), minimized: window.isMinimized(), focused: window.isFocused(), bounds: window.getBounds() }));
}

async function quit(code = 0) {
  if (quitting) return;
  quitting = true;
  if (window && !window.isDestroyed()) window.destroy();
  try { await runtime?.shutdown(); }
  finally { app.exit(code); }
}
app.on('before-quit', event => { if (!quitting) { event.preventDefault(); void quit(); } });
app.on('window-all-closed', () => { void quit(); });

app.whenReady().then(async () => {
  const sidebar = require('../index.cjs');
  const entry = sidebar.sourcePath('claudian-sidebar.html');
  window = new BrowserWindow({
    title: 'AI Sidebar', width: 440, height: 760, minWidth: 320, minHeight: 480,
    show: false, autoHideMenuBar: true, backgroundColor: '#181818',
    webPreferences: {
      preload: sidebar.sourcePath('claudian-sidebar-preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
      backgroundThrottling: false,
      zoomFactor: 1,
    },
  });
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('page-title-updated', event => event.preventDefault());
  runtime = sidebar.register(ipcMain, {
    projectRoot: root, electronDir: path.join(root, 'src'), defaultWorkspace: workspace,
    allowedEntryUrls: [pathToFileURL(entry).href],
    logger: {
      filePath: path.join(userData, 'runtime.log'),
      log(event, payload) { fs.appendFileSync(this.filePath, `${JSON.stringify({ at: new Date().toISOString(), event, payload })}\n`); },
      warn: console.warn,
    },
  });
  const initialProvider = argument('provider') === 'claude' || (longTaskTest && argument('long-resume')) ? 'claude' : 'codex';
  await runtime.handleUpdateSettings({ sender: window.webContents }, { provider: initialProvider, workspace,
    ...(['light','dark'].includes(argument('theme')) ? { theme: argument('theme') } : {}),
    ...((liveCategories || liveCodexFeatures || livePlan || liveThreadTools || liveQueue || liveShowcase || claudeLiveOnly || claudeInteractionsTest || claudeSourceTest || longTaskTest || controlsLiveTest || scrollLiveTest || thinkingLiveTest) ? { enableAutoTitleGeneration: false } : {}),
    ...(longTaskTest ? { sandbox: 'workspace-write' } : {}),
    ...(initialProvider === 'claude' ? { ...(argument('test-model') ? { model: argument('test-model') } : {}), ...(argument('test-effort') ? { effort: argument('test-effort') } : {}), runtimeMode: 'claude' } : {}) });
  // Seed the first UI tab from the native configuration instead of the renderer's legacy default.
  await window.loadFile(entry, { query: { surface: 'chat', locale: 'zh-CN', runtimeMode: initialProvider, model: runtime.settings.model, workspace, ...(showcase ? { samples: '1', sample: argument('sample') || '' } : {}) } });
  window.webContents.setZoomFactor(1);
  if (!process.argv.includes('--background-test')) showForReview();
  console.log(`AI Sidebar opened: ${workspace}`);
  // Native app-server handshake; no model request until the user sends a message.
  try {
    const visibleProvider = await window.webContents.executeJavaScript('document.documentElement.dataset.sidebarProvider');
    if (visibleProvider === 'codex' && runtime.settings.provider === 'codex') {
      await runtime.ensureCodex(); console.log('Codex app-server connected');
    }
  }
  catch (error) {
    runtime.emit({ type: 'error', content: error.message });
    if (liveTest) throw error;
    console.error(error.message);
  }
  if (process.argv.includes('--navigation-ui-check')) {
    const result = await require('./navigation-live-test.cjs').run({window});
    await quit(result.ok ? 0 : 1);
    return;
  }
  if (liveTest) {
    const report = await require(thinkingLiveTest ? './thinking-live-test.cjs' : scrollLiveTest ? (process.argv.includes('--scroll-paint-check') ? './scroll-paint-live-test.cjs' : './scroll-live-test.cjs') : controlsLiveTest ? './controls-live-test.cjs' : longTaskTest ? './long-task-test.cjs' : claudeSourceTest ? './claude-source-test.cjs' : claudeLiveOnly ? './claude-live-test.cjs' : claudeInteractionsTest ? './claude-real-interactions.cjs' : claudeUiTest ? './claude-ui-test.cjs' : headerTest ? './header-test.cjs' : responsiveTest ? './responsive-test.cjs' : liveShowcase ? './live-showcase.cjs' : liveQueue ? './live-queue.cjs' : liveThreadTools ? './live-thread-tools.cjs' : livePlan ? './live-plan.cjs' : liveCodexFeatures ? './live-codex-features.cjs' : liveCategories ? './live-categories.cjs' : './live-test.cjs').run({ window, workspace, runDir, runtime });
    if (report.ok && (liveCategories || liveCodexFeatures || livePlan || liveThreadTools || liveQueue || process.argv.includes('--keep-open'))) {
      window.setTitle('AI Sidebar · 真实 token 分类测试');
      window.show();
      window.focus();
      if (process.argv.includes('--keep-open')) showForReview();
      console.log(`Category run finished; window remains open. Report: ${report.reportPath}`);
    } else await quit(report.ok ? 0 : 1);
  }
}).catch(async error => {
  console.error(error.stack || error.message);
  if (runDir) fs.writeFileSync(path.join(runDir, 'fatal.json'), JSON.stringify({ error: error.message }, null, 2));
  else if (!process.argv.includes('--background-test')) dialog.showErrorBox('AI Sidebar 启动失败', error.message);
  await quit(1);
});


