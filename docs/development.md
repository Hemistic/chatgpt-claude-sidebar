# 开发与维护

本仓库目前是独立 Electron 侧栏与现有宿主桥接的源码基础。面向软件开发者的统一 SDK 仍在建设中。

## 本地运行

```shell
npm ci
npm start
npm start -- --workspace="D:/Projects/my-app"
```

独立窗口加载 `src/claudian-sidebar.html`，不需要启动原业务软件。配置与日志保存在系统应用数据目录下的 `ai-sidebar-standalone`；Windows 为 `%APPDATA%/ai-sidebar-standalone`。关闭窗口会释放本窗口创建的 CLI 进程。

可用 `--profile="绝对路径"` 指定独立配置目录。CLI 登录由相应 CLI 自身管理，配置目录不是登录信息的替代品。

默认入口使用 Codex；新档案可以用 `--provider=claude` 选择 Claude。已有档案恢复保存的会话状态。左上角悬停只展开切换胶囊，点击另一提供方图标才会切换。

## 模块边界

| 位置 | 职责 |
| --- | --- |
| `index.cjs` | `register()`、`sourcePath()` 与宿主配置入口 |
| `standalone/main.cjs` | 独立 Electron 窗口、运行时注册与退出清理 |
| `src/claudian-sidebar-runtime.js` | IPC、CLI 生命周期、事件适配与原生历史发现 |
| `src/codex-native-client.cjs` | Codex app-server 操作与能力探测 |
| `src/claudian-sidebar-react.js` | 现有对话状态与界面组装，仍需继续拆分 |
| `src/sidebar-header.js` | 紧凑顶栏、点击切换与菜单入口 |
| `src/sidebar-conversation-data.js` | 会话去重、提供方过滤与项目归组 |
| `src/codex-conversation-menu.*` | Codex 独立会话菜单 |
| `src/claude-conversation-menu.*` | Claude 独立会话菜单 |
| `src/sidebar-provider-styles.js` | 互斥启用提供方样式，避免切换时异步重载样式表 |
| `src/claudian-sidebar-preload.js` | 独立窗口的预加载桥接 |
| `src/claudian-host-bridge.js` | 现有 iframe 宿主桥接 |

历史命名会逐步整理。新功能优先放入明确职责的模块，避免继续扩大中心文件。

## 界面来源与导入

两种提供方的样式独立维护。Claude 界面只启用 Claude 样式表；Codex 只启用自己的样式表。共享代码应限于会话、数据和宿主逻辑。

带 `.native.js`、`.source.css` 的生成文件对应固定版本的安装资源。更新时修改导入或适配脚本，保留来源与哈希，避免手改原始渲染声明。

| 内容 | 入口 |
| --- | --- |
| Claude 消息与 Code 页面基础 | `scripts/import-claude-ui.cjs` |
| Claude 模型、权限与输入控件 | `scripts/import-claude-controls.cjs`、`scripts/import-claude-controls-style.cjs` |
| Claude 会话导航 | `scripts/import-claude-navigation.cjs` |
| Codex 模型、输入与代码控件 | `scripts/import-codex-controls.cjs` |
| Codex 会话导航 | `scripts/import-codex-navigation.cjs` |
| 来源与版本 | `docs/*source-manifest.json`、[界面参考](ui-reference.md) |

这些脚本依赖对应版本的本机安装资源，不是启动侧栏的前置步骤。组件版本和宿主适配边界分别记录，不能用局部导入代表整套官方 App 已逐像素验收。

## 验证入口

```shell
npm test
```

本地回归无需模型调用。真实 CLI 验证通过独立工作区执行，会消耗对应账户额度。

| 命令 | 范围 |
| --- | --- |
| `npm run test:live` | 文件读取、流式输出与真实连接 |
| `npm run test:live:smoke` | 普通对话、审批、取消与计划提问 |
| `npm run test:live:codex` | Codex 模型、文件变更、差异与历史等操作 |
| `npm run test:live:plan` | 只读规划、调整、确认后执行 |
| `npm run test:live:thread-tools` | 原生目标及归档、恢复 |
| `npm run test:live:queue` | 原生队列交互 |

后续 Claude 真实验收选用 `claude-haiku-5-5` / `high`，通过测试参数传入；产品本身允许切换模型。不可用时记录真实失败，不静默换模型，也不把未上报用量记为零。

每轮检查实际渲染并查看截图，包括文字、换行、溢出、重复内容和运行状态。测试会话须在完成检查后按专用工作区与会话 ID 精确清理，保留报告和截图。部分旧脚本仍需人工执行这一步，不能假设所有入口都已自动清理。

报告与临时档案通常位于 `.tmp-standalone/`、`test-artifacts/`，二者不进入 Git。对外展示用的精选素材放在 `docs/media/`。

## 宿主接入

现有 Electron 接入通过 `register(ipcMain, options)` 注册，退出时调用 `runtime.shutdown()`。页面与预加载资源通过 `sourcePath()` 定位。

顶层 iframe 宿主可以使用 `claudianSidebarHostBridge.attach({ sourceSelector: '#ai-sidebar-frame' })`。上下文通过 `claudian-sidebar:set-context` 消息传入，卸载时释放桥接。调用来源必须与宿主白名单匹配。

完整的统一宿主契约仍待整理；当前边界见 [架构说明](architecture.md)。

## 已有验证记录

- [CLI 操作与验证边界](codex-connection.md)
- [模型菜单修复](model-picker-repair-2026-11-01.md)
- [会话滚动与跟随](scroll-follow-2026-11-02.md)
- [文件拖放与点击切换](drag-click-2026-11-04.md)
- [切换绘制稳定性](switch-motion-2026-11-04.md)
- [独立会话菜单](navigation-2026-11-04.md)

## 提交范围

代码、文档、源码清单与精选展示素材可以进入 Git。CLI 认证信息、个人会话、临时配置、依赖安装目录、日志与原始测试产物不进入 Git。
