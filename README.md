# AI Sidebar

面向开发者的独立 AI 侧栏源码库。目标是在支持扩展或嵌入视图的应用中复用同一套对话界面，通过宿主适配器与应用交互，执行流程遵循 Codex CLI 和 Claude Code CLI。

当前是已抽取的 Electron 侧栏代码，支持 Codex app-server 与 Claude Agent SDK 的会话、流式回答、工具调用、审批、模型选择和 MCP 设置。已提供独立 Electron 窗口，默认接入本机 Codex CLI。通用宿主 SDK 及跨软件适配尚待建设。

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
npm start
```

本机独立仓库：`D:/Project/ai-sidebar`。目前没有远程仓库，也没有对外发布 npm 包。

`npm start` 启动本库自带的 Electron 窗口，直接加载侧栏。需要本机已安装、登录并可用的 Codex CLI；沿用其原生模型与认证配置，不在本库保存密钥。启动时建立 app-server 连接，发送消息后才调用模型。

默认工作区为本库目录，可用 `npm start -- --workspace="D:/your-project"` 指定。独立界面配置与日志保存在系统应用数据目录下的 `ai-sidebar-standalone`（Windows 为 `%APPDATA%/ai-sidebar-standalone`），不读取原业务软件的侧栏设置。关闭窗口会关闭本窗口创建的 CLI 进程。

`npm run test:live` 显式发起一次真实模型请求：在隔离测试工作区生成随机内容，通过界面要求 CLI 读取文件，核对工具事件、流式输出、最终显示和文件未修改。不会自动批准权限请求。报告和截图保存在 `.tmp-standalone/`，测试后自动关闭测试窗口。此测试使用原生 CLI 账户，会消耗模型额度。

`npm run test:live:smoke` 覆盖真实普通对话、随机文件读取、命令批准、命令取消和计划模式单选提问，保存原生 token 用量事件与逐项截图。批准测试仅允许指定的 `Write-Output APPROVAL_UI_OK`，取消测试拒绝另一个指定的输出命令；不会批准其他命令。取消回合未上报用量时记录为 `null`，不记为零。缓存输入包含在输入 token 中。

## 界面维护

会话身份、切换绘制与设置背景／主题记忆的后续修复及六轮真实验收见 [会话切换记录](docs/conversation-switch-2026-11-01.md)。

2026-11-01：Codex 模型／权限／加号／slash 的原生组件及日夜主题已导入 26.1027.3384.0；Claude 的两套主题保持独立，修复宽度卡顿和强度同步。来源、真实测试、失败记录及适配边界见 [菜单与主题修复报告](docs/menus-themes-2026-11-01.md)。

模型选择后续修复：Claude 模型／强度／加号／slash 控件已导入当前 4.4212.0.0；Codex 补齐原控件基础样式和模型弹层几何。四轮真实请求及往返模型选择的证据见 [模型选择修复报告](docs/model-picker-repair-2026-11-01.md)。

界面根据提供方切换源码组件：Codex 使用本机 ChatGPT 26.1023.6621.0 的前端 JS/CSS；Claude Code 使用本机 Claude 2.9939.2.0 的 Code 页面前端 JS/CSS。Claude 消息、输入框、工具折叠、菜单、审批、提问和计划确认使用导入的原生渲染函数或原始 JSX 表达式。CLI 事件、草稿、附件和编辑控制器通过宿主适配层接入。源码位置、哈希、适配范围与复现方式见 [docs/ui-reference.md](docs/ui-reference.md)。截图用于实际渲染自查。

- `scripts/import-claude-ui.cjs`：从安装包提取界面声明、内联样式、CSS 和字体；`--check` 校验生成文件。
- `src/claude-ui.native.js` / `src/claude-ui.source.css`：生成的原生组件和隔离样式，禁止手工修改组件声明。
- `src/claude-surface.js` / `src/claude-editor-bridge.js`：CLI 数据与原生界面的适配，编辑区保留现有草稿和输入事件。
- `src/claude-code-composer.js`：按 Claude Code 的 Kp/Ol/fl 源码模板组装输入框、底栏、加号和发送／停止控件。
- `src/sidebar-provider-styles.js`：互斥启用两种提供方的样式；Claude 只启用 `claude-ui.source.css`、`claude-controls.source.css`、`claude-surface.css` 和 `claude-shell.css`，不启用 ChatGPT／Codex／旧共享样式。
- `src/claude-shell.js` / `src/claude-shell.css`：Claude 专用的顶栏、会话行和宿主页面适配，使用 Claude 原生控件及 `--cds-*` 变量。
- `npm start -- --claude-ui-test --background-test`：隔离工作区里的 Claude 界面、交互和宽度检查；加 `--real-claude-suite` 尝试真实 Claude 文件读取，会消耗该 CLI 配置通道的额度。

- `src/chatgpt-surface.js`：消息框架与 ComposerLayout 输入／前置／后置控件槽位。
- `src/chatgpt-composer.source.css`：固定版本的原组件 CSS，由导入脚本生成。
- `src/chatgpt-surface.css`：独立宿主的字号、主题变量和 CLI 控件适配。
- `src/sidebar-header.js`：当前 CLI 的圆形导航图标、悬停切换胶囊、居中标题与对话管理；`src/sidebar-shell.js` 提供欢迎页和发送／停止按钮。
- `src/sidebar-samples.js`：八类工作样例，交互不调用真实 CLI。
- `src/codex-approval.native.js`：安装版审批卡片、按钮与组合按钮的原始渲染函数；CLI 数据适配位于 `src/codex-approval.js`。
- `src/codex-desktop-theme.source.css` / `src/codex-approval.source.css`：完整桌面 CSS 级联解析后的变量及原版组件工具样式。
- `src/sidebar-palette.css`：仅供 Codex 使用的颜色、字体变量和兼容别名。
- `src/sidebar-shell.css`：仅供 Codex 使用的窗口布局、输入区和窄窗口适配。
- `src/codex-conversation.js` / `src/codex-conversation.css`：Codex 的对话组件、工具活动行、文件差异和模型／权限菜单。
- `docs/ui-reference.md`：已读取的 Codex App 打包前端资源、截图尺寸和组件边界。
- `src/claudian-chat.css`：嵌入区域的尺寸和溢出约束。

每次功能增量都做对应自动化检查和真实 CLI 验证；测试完成后保存实际窗口截图，并人工查看字体、换行、溢出、重复内容和交互状态。截图使用 Chromium 当前合成表面，避免窗口后台时截到黑图或旧帧。最后打开独立 Electron 窗口供用户验证。

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

多会话共用一行紧凑顶栏：左上角默认只显示当前 CLI 的圆形图标（OpenAI 或 Claude 花形标志），点击打开按项目分类的近期会话；鼠标悬停时展开左 OpenAI、右 Claude 的切换胶囊，移入对应标志即切换 CLI，保持原位展开，移开后收起；中间显示当前标题并省略超长末端。菜单左对齐、最大宽度 280px，搜索框固定、列表独立滚动；草稿与回复独立。工作样例位于设置 → 调试与样例。实现与验证见 `docs/multiple-sessions.md`。运行 `npm start -- --showcase` 打开工作样例，或 `npm start -- --live-showcase --background-test` 执行隔离样例及真实 CLI 审批／提问检查。

Codex 原生连接已增加账户／用量读取、CLI 模型同步、原生会话分页恢复与重命名、`/review` 审查、整轮差异、完整计划模式、会话目标及归档／恢复。接口、版本与测试边界见 [Codex CLI 连接](docs/codex-connection.md)。运行 `npm run test:live:codex`、`npm run test:live:plan`、`npm run test:live:thread-tools` 执行对应隔离工作区的真实增量测试；会消耗当前 CLI 账户的 token，测试后保留窗口。
