# Shared AI Sidebar

从 ArtInFact / pdf-ai 抽取的完整 Claudian 问答侧栏。支持 Codex CLI app-server 和 Claude Code Agent SDK：会话历史、流式回答、工具调用、审批、模型/推理强度、环境安装和 MCP 设置。来源版本与原文件哈希在 `PROVENANCE.json`；上游许可证、字体授权和 SDK 许可证随源码保留。

## 两个宿主共用

本机源仓库：`D:/Project/ai-sidebar`。两个宿主均使用 `electron/ai-sidebar` Git submodule，版本由各自的 gitlink 固定。当前没有发布远程仓库，也不包含任何密钥、用户配置、会话或 CLI 二进制。

在本仓库修改并提交后，在两个宿主中分别执行：

```powershell
git -C electron/ai-sidebar fetch origin
git -C electron/ai-sidebar checkout <共享提交>
git add electron/ai-sidebar
```

新机器需要先提供共享仓库远程地址，再更改 `.gitmodules` 的 URL 并执行 `git submodule sync` / `git submodule update --init`。当前本机 URL 不是公共下载地址。

## 宿主接口

主进程调用 `require('./ai-sidebar').register(ipcMain, { projectRoot, electronDir, defaultWorkspace, allowedEntryUrls })`。`allowedEntryUrls` 必须是宿主顶层页面的精确 URL；子 frame 不能直接调用运行时 IPC。关闭应用时调用 `runtime.shutdown()`。

预加载使用 `src/claudian-sidebar-preload.js`；隔离的 iframe 使用 `src/claudian-sidebar.html`。顶层页面挂载时调用 `claudianSidebarHostBridge.attach({ sourceSelector: '#ai-sidebar-frame' })`，卸载时 dispose。开发服务器只提供浏览器资源，不能暴露运行时、SDK、配置或项目文件。

工作区通过 URL `workspace` 传入；上下文通过 `claudian-sidebar:set-context` 消息传入。原生 CLI 的登录、模型和供应商配置保持原生路由。各宿主会话/侧栏设置分别存储在各自的 Electron userData 中。

LaTeX Studio 的 CLI 面板与已有 API 差异审查入口并存；CLI Agent 的授权写入属于原生工具操作，不应冒充为尚未落盘的建议。

## 检查

`npm test` 检查文件来源白名单、宿主桥接、file URL 回传、事件清理、非法 frame 拒绝。宿主另运行 Electron 集成检查。
