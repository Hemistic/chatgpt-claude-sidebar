# Claude 模型菜单、权限菜单与代码块移植

本轮直接读取本机 Claude Desktop **2.9939.2.0** 发布包中的编译 JavaScript/CSS，移植对应呈现组件，再接入独立侧栏的真实 CLI。没有用截图推测布局，没有启动 ArtInFact，也没有把样例或模拟请求算作验收。

源码路径与哈希见 [来源清单](claude-ui-source-manifest.json)。本轮校验为 **3381 条声明、17 个渲染表达式、336 个资源**；另有两处原生初始化表达式。执行 `node scripts/import-claude-ui.cjs --check` 可以复核生成结果。

## 源码与接线

| 项目 | 原 App 路径 | 本库接入 |
| --- | --- | --- |
| 模型菜单 | `c360a9e1c` 的 `ld` 使用 `rd` 配置，经 `Nw` 到 `shared-15` 的 `Ew`；其 `Tw / xw / Sw / Cw / bw` 负责原生 pill、列表、快捷键与选中状态 | `claude-code-composer.js` 的 `ModelControl` 直接渲染导入的 `Ew`，不再用权限 picker 拼模型列表。模型值来自 CLI，选择仍调用现有会话切换逻辑 |
| 思考档位 | `ww` 加载 `c8e04f916` 的 `w`，使用原生 effort 按钮、弹层和滑轨 | 导入原组件，保留独立于模型菜单的呈现方式；仅把档位变化传回现有 CLI 设置 |
| 权限菜单 | `cc70f2bdf` 的 `fl`；`shared-15` 的 `sO / CO` 提供模式文案、说明和本地顺序 | Manual、Accept edits、Plan、Bypass permissions；危险模式提示取自 `Ol` 原文。将 UI 的模式映射到真正的 `permissionMode / claudeSafeMode`，并按会话保存 |
| 代码块 | `c19e90103` 的 `tp`、`Uf / uf / qf`；`c64baa838` 内部渲染器 | 原样导入 `tp` 渲染表达式及高亮器，保留 fence、复制/已复制按钮、主题、未知语言归一化、长行换行和秘密隐藏组件。宿主只提供正文和流式状态 |
| 正文容器 | `$y` 的 `epitaxy-markdown` 分支、`pf / mf` 上下文、原生选择复制 hook | 替换旧的通用 Prose 外壳，使段落与代码块间距使用 Code 页面的原始 CSS |

没有把内部的“Native CLI configured model”等来源诊断字符串当成产品中的模型说明显示；真实模型说明有值时仍交由原生组件显示。

## 必须保留的初始化与适配

- 原 App 使用 React 19，宿主仍为 React 18。导入层明确绑定 JSX、ref、Context 与 `use(Context/thenable)`，不修改原组件的声明正文。
- `c5d464fa3` 的顶层表达式注册 Claude light/dark 主题；只抽取函数会漏掉它，真实测试曾因此报主题加载错误。
- `c64baa838` 的顶层条件语句注册 `diffs-container` 和原生 Shadow DOM 样式；只抽取渲染器会出现行号、字体和换行错误。本轮已保留原语句并记录哈希。
- 语言/主题动态模块和高亮 worker 一起存入 `src/claude-native-assets/`。动态导入和 worker 地址的本地迁移记录在清单中，运行时不依赖原 App 的安装路径。
- 原 App 的遥测、诊断上下文、偏好存储分别绑定到独立宿主边界，具体绑定也记录在清单中。没有运行原 App 的账户或遥测服务。

## 真 token 验收

测试参数为 **`--test-model=claude-haiku-5-5 --test-effort=high`**。这是测试选择，没有锁死产品模型。自动标题生成关闭；本轮模型请求没有使用其他模型。每个已完成回合都验证真实服务用量，缺失用量直接失败。

最终完整通过的记录：

`D:/Project/ai-sidebar/.tmp-standalone/2026-10-31T12-59-48-929Z/claude-source-all.json`

集中保存的 [报告与截图](../test-artifacts/claude-source-ui-2026-10-31/summary.json)，以及 [完整事件报告](../test-artifacts/claude-source-ui-2026-10-31/claude-source-all.json)。这些运行产物位于 Git 忽略目录。

| 真实回合 | 验证内容 | 服务返回的最终 totalTokens | 结果 |
| --- | --- | ---: | --- |
| 模型选择后读取 | 通过原生菜单选中 Haiku 5.5；实际编辑器发送；Read 读取本轮随机标记文件；正文显示一致；原文件未变 | 76501 | 通过 |
| Manual | 从权限菜单切换；真实 Write 触发审批；点击 Allow once；核对写入文件的随机标记 | 77218 | 通过 |
| Accept edits | 从权限菜单切换；真实 Write 直接完成；事件中没有审批请求；核对文件内容 | 77950 | 通过 |
| Plan | 从权限菜单进入；实际读取、生成方案、调用 ExitPlanMode；展示正文和原生审批；Reject 后正常结束 | 82380 | 通过 |
| 代码块 | 真实回复生成 JavaScript、JSON、未知语言三个代码块；原生语法高亮、中文、长行、复制后状态、剪贴板内容、宽窗边距 | 43567 | 通过 |

上表是每个回合的最终返回值，包含服务的缓存计数；不是把多条流式用量重复累加，也不是费用估算。

Bypass permissions 本轮验证了菜单选择和状态显示，随后立即恢复 Manual；没有声称执行过绕过权限的模型回合。

代码块还断言了实际 Shadow DOM 行/token、原生自定义元素注册、内部样式存在、没有渲染错误、文档及代码块没有横向越界。复制内容只归一化 Windows 剪贴板的 CRLF 表示，字符和代码结构保持一致。

## 截图自查与最终窗口

已亲自查看最终完整回合中的模型菜单、权限菜单、Write 审批、计划审批、流式代码、复制后的代码和宽窗截图。检查了原始协议泄漏、重复内容、字形、间距、中文断行、溢出和运行状态。

本轮过程中出现过并已修正的失败均保留在原始 `.tmp-standalone` 记录：React `use` 兼容错误、主题/容器初始化遗漏；测试脚本中旧 Prose 选择器、隐藏窗口的剪贴板焦点、Windows 换行断言与外层滚动定位也已修正。较早的失败或错误定位截图不作为最终通过证据。

最终窗口保留真实对话，模型为 Haiku 5.5、思考强度 high，输入区可编辑。Claude 模式仍只启用 `claude-ui.source.css / claude-surface.css / claude-shell.css` 三份独立样式。

## 仍然存在的边界

- 原 App 账户 catalog、组织限制、Preset 和 chipLevel 服务没有移植。本地模型来源为 CLI 配置及其模型接口；其数据不等同于原 App 账户目录。
- 当前 CLI 未给 Haiku 5.5 返回可选 effort 档位元数据，因此界面用原生的单档禁用状态显示**已选 High**，不虚构额外档位。真实请求仍传入 high；其他模型有档位元数据时使用原生可选择控件。本轮没有把滑轨上所有档位标记为真 token 验收通过。
- Auto 的原 App 账户/模型门控没有接入，所以不额外假装开放该选项；已有显式 Auto 会话保留可见状态。
- 代码块的块内终端执行、原 App 虚拟化调度器及 Mermaid 预览没有包含在本轮验收。Markdown AST、工具详情/分组与编辑器行为仍有宿主实现，完整页面不能据此标成全状态 1:1。详见 [差异清单](claude-source-audit-2026-10-31.md)。
