# Claude Code 源码一致性复查

结论：**当前不是 Claude Code App 页面整体的 1:1 移植。** 原生组件来源校验通过，不能据此推导出宿主组装页面的一致性。下表已更新模型菜单、权限菜单和代码块的后续移植状态；真实验收见 [本轮记录](claude-source-ui-2026-10-31.md)。

依据为本机 Claude Desktop 2.9939.2.0 发布包的编译 JavaScript/CSS，目录见 `claude-ui-source-manifest.json`。不是原厂私有 TypeScript 仓库。后续导入校验覆盖 3381 条原生声明、17 个渲染表达式、336 个固定来源资源，以及主题注册、代码容器注册两处原生初始化。

## 已确认的差异

| 项目 | 原厂 Code 源码 | 当前独立侧栏 | 判断 |
| --- | --- | --- | --- |
| 模型选择器 | `cc43287c9-BAqI9kMU.js` 的 `G_` 渲染 `PP`，经 `Bs` 指向 `c360a9e1c-BOKY-coh.js` 的 `ld`，再由 `Nw → Ew` 渲染模型和 effort | 已导入 `Ew / Tw / xw / Sw / Cw / bw / ww`，包括独立 effort 控件 `c8e04f916` 的 `w`；沿用 `ld` 的 `rd` 配置和 pill 触发形式 | **呈现组件已替换**。catalog 来自真实 CLI；原 App 账户 catalog、Preset、组织限制服务没有冒充接入。CLI 缺少新模型档位元数据时，仅展示已选档位，不虚构其它档位 |
| 权限菜单 | `Ol / fl`，`shared-15` 的 `sO` 提供文案和图标，`CO` 提供本地模式顺序 | 原生 `fl` 模板配 `sO / CO`，提供 Manual / Accept edits / Plan / Bypass permissions，并按会话保存 `claudeSafeMode`，实际传给 SDK | **基础本地模式已接入并实测**。没有移植原 App 的组织策略、chipLevel、Auto 账户门控与相关服务；未据此宣称全状态一致 |
| 代码块 | `rp → tp`，含 `epitaxy-codeblock / epitaxy-diff / epitaxy-fence`、复制、秘密隐藏、主题、流式与最终高亮路径 | 使用原生 `tp` 渲染表达式，`Uf / uf / qf`、内部高亮引擎、原生主题、Shadow DOM 样式及语言归一化；保留原文和复制状态 | **显示和复制路径已接入并实测**。宿主提供流式状态，未接原 App 的块内终端运行服务和虚拟化调度器；Mermaid 预览不在本轮验收范围 |
| 正文与表格 | 原厂 Markdown 渲染器还有专门的表格滚动、流式、代码块与布局上下文 | 已使用 `$y` 的原生 `epitaxy-markdown` 排版表达式、上下文和选择复制 hook；Markdown AST 解析和表格结构仍由宿主维护 | **原生正文容器已修正，完整解析器仍有差异** |
| 编辑器 | `Kp → Fn/Bh → nF` 的编辑区由原厂 TipTap 状态及扩展驱动 | 保留原生外部 JSX，`claude-editor-bridge.js` 自行维护 contenteditable、段落、粘贴、选区和 IME | **外部框架有来源，编辑行为未完整移植** |
| 工具／思考／差异 | 原生 ToolStep / TurnStatus 组件受原厂 turn 分组、工具类型及专用详情组件控制 | 每个宿主 block 自行包成 TurnStatus/ToolStep；差异详情仍是 pre | **组件有来源，分组和详情不同** |
| 顶栏／近期会话／设置 | 原厂应用外壳及设置组件 | 用户指定的圆标／胶囊、会话管理与宿主 SettingsDrawer；Claude 独立 CSS 适配 | **自定义部分**。样式独立不等于原厂页面 1:1 |
| 输入框宿主布局 | 原厂 Code 页面决定 composer 外侧的列、状态栏、提示和底部区域 | `Column`、`claude-shell.css`、`claude-surface.css` 另外决定外侧布局，含固定顶／底间距 | **未证明一致**。仅导入 Bh、Kp、Ol 模板不足以证明整块页面间距相同 |

## 不能遗漏的源码分支

`cc43287c9-BAqI9kMU.js` 的 `dX` 并非无条件使用 CDS 输入框。其 `za=fn()` 来自 `shared-22-DG1cgDka.js` 的 `gw`，由 CDS composer、session presets、force legacy 与 `code-composer-body-latch` 等值决定分支。当前侧栏固定走 Kp 的 CDS 版本，未验证与用户原厂 App 实际启用的分支相同。因此不能宣称当前 Kp 页面就是原 App 当前显示的唯一页面。

## 现有验证的实际边界

- 源码声明／模板哈希检查：可以验证导入原文，不能验证宿主传入的全部状态和布局。
- `standalone/claude-reference-test.cjs`：只比较四个组件的 40 项计算样式；对照文档也使用当前宿主 `ClaudeCodeComposer.Footer`。它能发现部分 CSS 变换问题，**不能独立发现该宿主本身组装错误**，也不是对原厂完整页面的像素比较。
- CSS 经过 selector scope 和 layer 展平，基础颜色变量相同不代表所有级联结果相同。上次胶囊按钮被原生 relative 样式挤到下方就是实际反例。
- Claude 模式只启用三份 Claude 样式表；这是两引擎隔离检查通过，**不等于页面一致性检查通过**。
- 初次复查中的样例只用于定位差异。后续验收全部通过真实 CLI 和 `claude-haiku-5-5 / high` 回合，保存真实用量和实际 Chromium 截图，未启动 ArtInFact。

## 修正顺序

模型、权限基础菜单与 Code 代码块的后续结果见本轮记录。剩余工作包括完整 Markdown 解析、工具详情／分组、TipTap 行为及页面外层布局；composer 的原 App 实际功能开关分支仍需独立确认。圆标胶囊等用户指定的导航继续明确记为定制部分。
