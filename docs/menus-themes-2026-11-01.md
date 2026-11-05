# 菜单、主题与宽度修复记录（2026-11-01）

本轮修改独立 Electron 侧栏，没有启动 ArtInFact。读取本机安装包内实际交付的前端 JavaScript/CSS，提取原组件及主题声明；不是私有 TypeScript 仓库，也不宣称整套应用所有状态均已 1:1 验收。

## 源码与适配边界

| 表面 | 来源与实现 |
| --- | --- |
| Codex 模型菜单、模型列表与强度面板 | Codex 26.1027.3384.0，原始 xWr/mWr/PUr 等渲染函数，`codex-controls.native.js`；指针服务、CLI 数据、浮层定位在适配层 |
| Codex 权限选项 | 同版 permissions-mode-dropdown，mn/hn/vn/an/pn 原始函数及原 SVG；映射实际支持的请求批准、完全访问两种权限 |
| Codex 加号与 slash 行 | 同版原 Menu.Item、标题、CSS module、原图标；选项内容对应本库实际 CLI 功能，未提供原 App 专属服务 |
| Codex 白天／黑夜 | 同版桌面 CSS 级联及 app-theme 的原始默认主题变量，分别 908/907 个变量；不以手填近似色代替 |
| Claude 模型、强度、加号及权限 | 既有 Claude Desktop 2.9939.2.0 原生界面快照；恢复原 light/dark 根节点与主题选择，不启用 Codex 样式 |
| Claude 宽度性能 | 同时读取当前 Claude 4.4212.0.0 的延后布局实现；采用测量后的行高与 content-visibility，修正旧外层 scope 对 Chromium 132 的布局开销 |

源码函数、CSS、SVG 和中文消息的哈希分别记录在 [Codex 控件清单](codex-controls-source-manifest.json)、[主题快照](codex-themes-source.json)、[Claude 清单](claude-ui-source-manifest.json)。Claude 现有组件没有伪称已全部升级到 4.4212。

原 App 的账号、遥测、在线服务和整包初始化未接入。原组件需要的浮层高度、焦点与键盘服务由宿主实现；CLI 目录、会话工具等本库功能仍有宿主适配。完全访问的原 App 二次确认对话框、原 App 专属功能不在本次原组件导入范围，不能视为全部权限流程已复刻。

## 修复

- 删除语音输入按钮；Codex 加号只保留文件与文件夹上下文，队列／目标／上下文管理移到设置的对话页，避免混入原生菜单。
- 权限菜单恢复原图标、选项说明和警示样式；计划模式不再冒充权限选项。
- 模型列表与强度面板采用原组件；补齐读屏提示的原 sr-only 样式和浮层可用高度，修复提示泄漏及列表裁切。
- slash 使用原菜单行样式；悬停时保留输入框焦点。
- Claude 强度可以实际操作；修复界面选 High、请求却沿用旧会话 Low 的设置竞态。设置按顺序同步，发送前等待同步完成。
- 附件真实路径通过 Electron webUtils 送入 CLI；界面显示原消息与文件标签，运行时收到独立文件上下文。
- 两家日夜主题互相隔离，切换及重载保留选择；设置页、代码块、表格随主题更新。

## 验证证据

最终采纳运行及截图见 [本机验收目录](../test-artifacts/menus-themes-2026-11-01/summary.json)。四轮请求都从实际窗口发送，保留服务原始用量事件；用量事件可能包含累计快照，未简单相加当作账单。

| 场景 | 模型／强度 | 验证内容 |
| --- | --- | --- |
| Claude 深色 | claude-haiku-5-5 / high | 原文件输入接入、Read 随机文件、代码块 |
| Claude 浅色 | claude-haiku-5-5 / high | 真实表格、代码块、重载保留主题 |
| Codex 深色 | gpt-6.1-sol / high | 真实文件读取、代码块 |
| Codex 浅色 | gpt-6.1-sol / high | 真实表格、代码块、重载保留主题 |

另有逐项模型／权限／加号／强度／slash／设置截图，人工检查字号、换行、溢出、原始 JSON 泄漏及运行状态。本地回归 54/54；本地测试不能替代以上真实验收。Windows 系统文件选择器本身尚需人工操作验收；测试通过 Chromium 原文件输入选择真实磁盘文件，没有模拟文件返回。

## 宽度测量

同一份 Claude 长历史（16 条消息、2209 个节点），Chromium 132，360–740px 共 20 次宽度变更，每次等待两帧：

| 指标 | 修改前 | 修改后 |
| --- | --- | --- |
| 最慢一次宽度更新 | 2091ms | 157ms |
| 累计布局耗时 | 11.784376s | 1.089531s |
| 累计主线程任务 | 12.855365s | 1.537126s |

这是本机这份历史的结果，不代表所有长会话均达到固定帧率；原始采样数组保存在验收目录 resize.json。

## 未采纳运行与限制

保留原始失败日志，没有将失败调用算作通过：12:15 的测试器误找 slider；12:20 文件上下文接线导致空白（未发出模型请求）；12:25 发现 High 界面／Low 请求不一致，确实产生一次 Haiku 5.5 Low 调用，已排除并修复。其后采纳运行的 Claude 请求均核对 high。截图又发现隐藏提示和浮层高度遗漏，补齐原样式／宿主几何服务后重新运行完整四轮。

本轮没有重新验收此前长任务记录中的全部八项问题（包括转义竖线表格与用量聚合）；不能据此宣布整个产品全部通过。审批、提问和计划完整流程仍以各自真实交互报告为准，本轮重点是菜单、主题、附件、强度同步与宽度性能。

## 复验

```powershell
node scripts/import-codex-controls.cjs --check
# 以下主题检查由 Electron 运行，不是普通 node：
electron scripts/import-codex-themes.cjs --check
node --test tests/*.test.cjs
node scripts/start.cjs --controls-live-test --provider=claude --test-model=claude-haiku-5-5 --test-effort=high --keep-open
```

导入脚本固定版本并检查源码漂移；安装包更新后需要明确更新清单，不能静默换来源。
