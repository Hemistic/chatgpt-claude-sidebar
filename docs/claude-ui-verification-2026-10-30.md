# Claude Code 源码界面验证

更新：2026-10-31 已完成使用 `claude-haiku-5-5 + high` 的真实读取及审批／问答／计划回合；先前 403 记录仅属历史结果。见 [最新真实测试记录](claude-real-interactions-2026-10-31.md)。通过的交互不等于完整样式达到 1:1。

来源：本机 Claude Desktop 2.9939.2.0 的 Code 页面发布包；CLI 2.1.283。
源码与适配边界见 `ui-reference.md`，逐声明、模板和资源哈希见
`claude-ui-source-manifest.json`。没有取得原厂私有 TypeScript 仓库。

| 检查 | 结果 |
| --- | --- |
| `npm test` | 42/42；包含 Claude 重复错误合并和原有 Codex 协议回归 |
| `node scripts/import-claude-ui.cjs --check` | 2123 条原生声明、47 个固定来源资源一致 |
| Claude UI | 19 个截图检查点通过，包含 8 类样例及交互、菜单、切换和 320/900/1440/1920px |
| 原始 CSS 对照 | 未修改原始 CSS 的隔离文档与生产界面比较四个基础组件的 40 项计算样式，零差异 |
| Codex 回归 | 21 个截图检查点，真实命令批准、拒绝和计划模式提问通过 |
| Claude 真实请求 | 已通过 Chromium 输入、多行文字校验、原生 Send 按钮和 preload 到达 CLI；服务返回 403 额度不足，文件读取和回答未通过 |

Claude 请求失败时没有返回可用 token 用量，不记录为 0。Codex 批准回合
32834 tokens，提问回合 31683 tokens，拒绝回合未返回用量。

截图已人工检查：发现并修正内联 CSS 漏导入导致的单选标记缺失、窄窗口
占位文字越界、批量多选丢失，以及同一 CLI 错误被重复显示。正文、工具记录、
审批、提问、计划修改、菜单、窄窗口与宽屏均保存实际 Chromium 表面截图。

本机证据：

- Claude UI：`.tmp-standalone/2026-10-29T19-15-05-544Z/claude-ui.json`
- Codex 真实回归：`.tmp-standalone/2026-10-29T19-12-40-689Z/showcase.json`
- Claude 真实失败：`.tmp-standalone/2026-10-29T19-08-19-910Z/claude-live.json`
- 汇总副本及最终窗口截图：`test-artifacts/claude-native-2026-10-30/`

独立侧栏窗口保留打开，当前显示 Claude「对话与排版」样例。其他样例从设置
→ 调试与样例进入；新建对话可发送真实请求。此次未启动 ArtInFact。

完整 Claude App 的全部状态、TipTap 引擎与原厂账户／项目外壳不在这次移植
范围内；适配代码和安全 Markdown 解析仍由独立侧栏维护。40 项样式比较仅
证明已检查属性的一致，不能代替完整应用所有状态的像素一致性结论。

## 顶栏悬停切换修正

`sidebar-header.js` 的收起态使用当前提供方的 `ProviderIcon`；Claude 使用
现有花形 SVG，移除字母式 Anthropic 标志。只有指针停留在 32/68px 的图标
轨道内才展开，移出或选择后收起；键盘焦点和菜单悬停不保持胶囊。短点击
仍直接打开近期会话，悬停展开后左 OpenAI、右 Claude 可切换提供方。

顶栏分别使用提供方独立样式，固定为 40px，两侧预留 76px。切换过程中
逐帧比较顶栏、标题、图标与右侧操作区的坐标和尺寸。字体随各自 App
样式切换，不再要求两个提供方使用相同字体。

`standalone/provider-switch-test.cjs` 使用真实 Chromium 鼠标移动、点击，
覆盖 320/440/1440px 的默认圆标、悬停、跨图标间隙、点击切换、移出、保留
焦点、Claude 状态直接打开近期会话及切回 Codex，共 15 个截图检查点。
它由 `--header-test` 调用，同时保留项目分组、搜索、滚动和历史打开回归。
此次没有新增模型请求。

## Code 输入框与样式完全隔离（最新）

原先把通用 Chat Composer 与 Code 页面的组装层混用了。本次按
`c099c328d-B_i6zFP6.js` 的 `Kp`、`cc70f2bdf-CvtDMb7_.js` 的 `Ol/fl`
重新接入输入框：灰色回车发送键、StopCircle、原生加号菜单与底部工具栏，
并从原生 context 读取自动换行和空间预留。源常量 `Lp=500` 控制停止后
的防误触。模板原文和哈希已进入 manifest。

Claude 模式现在只激活三份 Claude 样式，ChatGPT／Codex／旧共享样式使用
`media="not all"` 停用；它们在切换时不会同时参与级联。样式先加载、解析
完毕再挂载页面，避免首次切换出现浏览器默认 8px margin 的无样式帧。
Claude 的顶栏、近期会话与设置使用独立适配样式和 Claude 变量，不引用
原共享 palette。近期会话行改用 Claude Button；设置和顶栏使用原生图标。

最新检查：

- 单元测试 44 项；包含双向样式隔离与 Claude 变量有效性。
- Claude 界面 25 个截图检查点通过，逐项记录生效样式表与隐藏面板状态。
- 使用 Code 组装路径的未改动 CSS 对照，40 项基础计算样式一致。
- 独立组件夹具中 Send / Stop 回调各 1 次，500ms 防误触通过；这不计为真实模型请求。
- `--header-test` 包含 15 个真实鼠标切换截图，320/440/1440px 下逐帧几何不变，近期会话搜索、滚动、历史打开通过。
- 源码导入校验：2149 条原生声明、52 个固定来源资源。

证据分别位于 `.tmp-standalone/2026-10-30T03-46-18-575Z/` 与
`.tmp-standalone/2026-10-30T03-51-34-828Z/`。Claude 的真实回答结果仍以
前文记录为准；此次是源码界面与样式检查，没有重试模型请求。
