# README 展示素材

所有 PNG 与 GIF 都只包含 Electron WebView 的页面内容，**没有操作系统窗口标题栏，也没有最小化、最大化或关闭按钮**。没有借用其他产品的界面截图。

## 2026-11-05 现场录制

- Codex 与 Claude 各执行一次真实的标签工具只读任务。源码只有一个公开的 tags.js 文件，不含个人项目内容。
- Codex：gpt-6.1-sol / high；Claude：claude-haiku-5-5 / high。这是本次录制选用的模型，不是产品模型锁定。
- codex-dark/light.png、claude-dark/light.png：真实回复、工具记录和日夜主题。
- codex-models.png、claude-models.png：实际模型 / 强度菜单，目录取决于本机 CLI 配置与账户。
- codex-sessions.png、claude-sessions.png：独立菜单，筛选本次展示项目。
- file-context.png：通过真实文件输入添加 tags.js，未发送额外模型回合。
- slash-commands.png：输入 / 后显示的实际命令建议。
- provider-switch.gif：实际指针悬停、点击、切换与返回过程。原始帧逐一从 WebView 捕获，按录制时间编码；未手绘或拼造界面状态。相邻相同帧合并以减少体积。

最初的日夜界面、菜单与动图画布为 480 × 800。通过 Electron webContents.capturePage() 截取实际页面；可见窗口预热绘制后取合成帧，避免后台旧帧。GIF 仅作色彩索引与编码，不修改界面布局。

## 不同窗口宽度与 CLI 连接

另以专用工作区 readme-widths-2026-11-05 完成两次新的真实文件读取，分别使用 claude-haiku-5-5 / high 和 gpt-6.1-sol / high。每个提供方都在同一真实会话中调整窗口宽度后截图，没有把单张窄图拉伸成宽图。

- codex-width-320/440/800/1440.png：Codex 的四种 WebView 宽度。
- claude-width-320/440/800/1440.png：Claude 的四种 WebView 宽度。
- 图片保存原始内容区域宽度，高度约 860 像素；原始 PNG 尺寸和实测 viewport 均记录在 manifest.json。
- 已检查顶栏、输入区、阅读列、长文字和代码；八组均无页面整体横向溢出，代码可在自身区域横向滚动。
- 2026-11-05 本机终端检查：Codex CLI 0.163.0、Claude Code 2.1.283、Node.js 24.13.0。版本快照不表示固定兼容要求，与桌面 UI 资源导入版本分别记录。
- CLI 连接文字同时对照运行时代码、官方 app-server 文档和 Agent SDK 文档，分别说明协议连接、原生会话身份、审批回传、停止与资源清理。

完整本机报告在 test-artifacts/readme-widths-2026-11-05/，测试会话仅按该专用工作区和会话 ID 清理。

## 既有真实交互记录

以下三个文件直接复制已完成的 2026-11-02 真实 Claude 验收截图，未裁改界面；它们展示的是当次原生交互状态。

| 文件 | 内容 | 验证依据 |
| --- | --- | --- |
| permission-approval.png | 文件写入审批 | [原生交互记录](../native-interactions-2026-11-02.md) |
| user-question.png | 原生用户提问 | [原生交互记录](../native-interactions-2026-11-02.md) |
| plan-confirmation.png | 原生方案确认 | [计划交互记录](../plan-source-2026-11-02.md) |

这三张截图保留原始 748 × 1267 分辨率，仍然只有 WebView，没有窗口外壳。

## 校验与维护

[manifest.json](manifest.json) 记录尺寸、GIF 时长、文件 SHA-256、录制模型和用量。完整本机事件与原始帧在 test-artifacts/readme-2026-11-05/，不进入 Git。原始测试会话按本次专用工作区精确清理；对外只保留精选截图和动图。

status.svg、electron.svg、runtimes.svg 是本地静态信息徽章，不表示远程 CI、下载量或正式发布状态。
