# AI Sidebar

面向开发者的独立 AI 侧栏源码库。目标是在支持扩展或嵌入视图的应用中复用同一套对话界面，通过宿主适配器与应用交互，执行流程遵循 Codex CLI 和 Claude Code CLI。

当前是已抽取的 Electron 侧栏代码，支持 Codex app-server 与 Claude Agent SDK 的会话、流式回答、工具调用、审批、模型选择和 MCP 设置。通用宿主 SDK、独立预览程序及跨软件适配尚待建设。

## 仓库边界

- 本库独立开发、提交与测试，不依赖启动任何现有业务软件。
- `src/` 是侧栏界面、CLI 运行时与现有宿主桥接；`index.cjs` 是 Node 入口。
- `tests/` 的本地回归测试无需业务软件、CLI 登录或模型调用。
- `PROVENANCE.json` 与 `licenses/` 记录原始代码来源和授权；源码中的历史命名会逐步整理。
- CLI 登录信息、供应商配置、会话、二进制、测试日志及上游工作副本不进入 Git。

## 本地开发

```powershell
npm install
npm test
```

本机独立仓库：`D:/Project/ai-sidebar`。目前没有远程仓库，也没有对外发布 npm 包。

当前没有 `npm start` 或独立窗口入口。后续预览应使用本库自带的最小 Electron 宿主，不以启动来源软件替代独立预览。

## 现有接入接口

宿主主进程通过 `register(ipcMain, options)` 注册运行时，关闭时调用 `runtime.shutdown()`：

```js
const sidebar = require('/path/to/ai-sidebar');
const runtime = sidebar.register(ipcMain, {
  projectRoot: workspacePath,
  electronDir: hostResourceDirectory,
  defaultWorkspace: workspacePath,
  allowedEntryUrls: [trustedHostPageUrl],
});
```

预加载入口：`src/claudian-sidebar-preload.js`。页面入口：`src/claudian-sidebar.html`。使用 `surface=chat` 可选择纯聊天视图，`theme=light` 或 `theme=dark` 指定主题。

顶层页面可通过 `claudianSidebarHostBridge.attach({ sourceSelector: '#ai-sidebar-frame' })` 绑定 iframe，卸载时 dispose。上下文通过 `claudian-sidebar:set-context` 消息传入。现有接口仍保留抽取时的结构，后续统一为明确的开发者 API。

应用需要提供可嵌入区域及交互接口，才能实现真正的内嵌侧栏。缺少扩展接口的原生软件需要额外适配，不能假设 Electron 可以直接注入任意软件。

## 后续建设

见 [独立侧栏建设边界](docs/architecture.md)：先完成独立预览与宿主契约，再按软件类型增加适配器，建立测试与性能测量矩阵。
