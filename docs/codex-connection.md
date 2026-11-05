# Codex CLI 原生连接

协议依据：本机 Codex CLI 0.163.0 生成的 app-server JSON Schema，以及 [官方 app-server 文档](https://learn.chatgpt.com/docs/app-server)。保留本机原生登录、配置、模型路由与权限，不另建账户或 API 请求通道。模型目录表示 CLI 已提供的模型元数据，不保证所有模型均有账户权限。

## 模块边界

- `src/codex-native-client.cjs`：受限 RPC 操作、分页、输入检查、旧版方法探测和账户脱敏；不依赖 Electron 或 React。
- `src/claudian-sidebar-runtime.js`：管理进程／会话、鉴权 IPC、共享初始化、原生事件转译、审查与连接异常结束。
- `src/claudian-sidebar-preload.js`：暴露 `codexAction(payload)`；iframe 宿主沿用同名桥接方法。
- `src/codex-native-ui.js`：账户与用量、原生历史列表、历史消息转换。
- `src/codex-conversation.js`：计划、整轮差异与结构化审查结果，沿用共用 UI。

## 已接入的原生操作

| 入口 | 原生协议 | 行为 |
|---|---|---|
| 设置 → Codex → CLI 原生连接 | `account/read`、`account/rateLimits/read` | 只读取账户与用量，不回传凭据 |
| 同步 CLI 模型／现有模型刷新 | `model/list` | 读取全部分页，更新模型与推理强度菜单 |
| 会话导航 → Codex CLI 历史 | `thread/list` | 当前工作区筛选、搜索、分页 |
| 打开历史／加载更早对话 | `thread/read`、`thread/turns/list` | 保留原生 threadId 以便继续，稳定消息 ID 去重 |
| 历史重命名 | `thread/name/set` | 原生成功后更新本机标题 |
| `/review` | `review/start` | 未提交变更审查；支持 `--base 分支`、`--commit SHA` 和自定义说明 |
| 自动事件 | `turn/diff/updated`、`turn/plan/updated` | 同一轮更新已有快照，不重复堆积 |
| 输入栏权限 → 计划模式 | `turn/start.collaborationMode`、`plan` item | 规划期间强制只读；以最终计划为准，支持调整方案、确认后退出计划并执行 |
| 输入栏“＋”→ 会话目标 | `thread/goal/get`、`thread/goal/set`、`thread/goal/clear` | 显式用户操作、可选预算、暂停／继续／完成／清除；未改目标或预算时省略字段以保留用量 |
| 历史 → 已归档 | `thread/archive`、`thread/unarchive` | 原生归档与恢复；归档期间禁止发送，保留草稿 |

审查同时兼容原生 `agentMessage`、`rawResponseItem` 和 `event_msg` 返回通道。审查中的 JSON 流不作为普通正文渲染；完成后显示发现、说明和文件位置，过滤 CLI 重复的最终摘要。原生历史可能仅保存可读审查文本，因此恢复时也转换为同样的显示结构。

初始化并发请求共用一个握手 Promise；RPC 错误保留原生错误码。遇到方法不存在时提示不支持并缓存该能力，认证、网络错误仍按真实错误返回。CLI 进程意外退出会结束当前运行状态，下一次请求可重新连接。

归档恢复只恢复持久日志，不保证加载实时会话。目标修改前会按需 `thread/resume` 以复用正确的写入器；其他会话正在执行时不会抢占加载。

## 验证边界

`npm test` 覆盖受限 RPC、脱敏、分页、协议错误、并发初始化、计划／差异更新、审查多通道与历史恢复。`npm run test:live:codex` 在独立临时 Git 工作区通过真实输入框、IPC 和 CLI 验证账户、模型、文件修改、差异、审查、历史分页与重命名，保存原生结果及截图。

2026-10-24 已完成原生计划模式的真实增量验证：只读规划、反馈修订、确认执行、模式恢复及 4 个文件行为断言。执行进度列表 `turn/plan/updated` 与计划方案 `plan` item 是两个概念：当前路由未提供 `update_plan` 工具，不影响原生计划方案流。两者分别处理，最终 `item/completed` 计划覆盖增量，失败／停止不展示执行确认。

`npm run test:live:plan` 通过实际设置选择工作区写权限，再验证规划期间仍然只读、批准后恢复此前模式。`npm run test:live:thread-tools` 验证原生目标和归档／恢复。传入 `--pause-after-each` 会在每张截图后等待同目录的 `<阶段名>.checked`，用于逐项人工查看截图；不会自动把截图保存成功视为 UI 通过。

审查若未上报 usage 则标为“未上报”，不记为零。原生目标状态管理已验证，不代表持续自主执行循环也已验收。CLI 原生待办队列、实时语音、MCP 应用表单／动态工具、后台终端等专项功能尚未全部接入，本轮没有宣称全协议已完成。
