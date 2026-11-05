# Claude 原生交互续查（2026-11-02）

本轮按实际安装包源码补齐审批／问答适配，并修复真实测试暴露的计划正文缺失。独立 Electron 窗口完成 1 个基础读取回合和 9 个真实交互回合，均使用 claude-haiku-5-5 / high；产品模型选项未锁定。

## 源码与改动

- 原生快捷键：直接导入 Claude 4.4212 的 ccbc7e432-CQxW8kje.js 中 j 及其 DOM、焦点、事件时钟、输入法保护依赖。原声明字节哈希见 claude-controls-source-manifest.json，共 2193 条；未重写为全局无条件 Enter 处理。只由宿主绑定活动卡片和真实 CLI 回调。
- 审批按钮使用现有原生 ApprovalActions，补齐 esc / cmd+enter / cmd+shift+enter 的 shortcut 和 persistent 属性；Windows 由原组件显示 Ctrl 提示。
- 问答依照旧版 wk、当前版 rn 共有逻辑：Other 选择后同步渲染并聚焦，翻页时保留卡片焦点，带上原文案的 disabledReason，空选择不能快捷提交。Question 模板仍来自 2.9939，不把行为修复说成整个组件已经更新到 4.4212。
- 计划缺失来自 ExitPlanMode 请求未携带正文／文件路径。新增 ClaudePlanTracker 关联同一运行中成功 Read／Write／Edit 的计划文件；只使用配置目录下 plans/*.md，失败工具、其他目录、上一轮／其他会话不作为回退。显式正文仍优先。SDK 与 CLI 控制请求走相同解析。未扫描全局最新计划文件，也没有补造方案文字。

## 真 token 验收

最终运行：2026-11-02T12-03-45-837Z。完整事件、返回用量和截图在 [summary.json](../test-artifacts/native-interactions-2026-11-02/summary.json) 同目录。

| 路径 | 实际验证 |
| --- | --- |
| 基础读取 | 真实 Read 随机标记，原生渲染及文件未变化 |
| 允许一次／拒绝／始终允许 | Ctrl+Enter / Escape / Ctrl+Shift+Enter；允许后内容匹配，拒绝后文件不存在 |
| 问答分页与多选 | Ctrl+Enter 下一页及提交，焦点保留，模型确认 Local / Files / Terminal |
| 自填与跳过 | Other 自动聚焦，中文原样回传；Skip 正常完成 |
| 计划修改／拒绝／批准 | 原文存在、Open plan 入口出现，反馈继续，拒绝正常中断，批准后只读原夹具并完成 |

逐状态截图已保存；已亲自查看原生按钮提示、分页、中文输入焦点、方案正文和反馈框。渲染错误为 0。本地回归 63/63 通过，Claude 控件／样式及 Codex 控件的导入校验通过。用量快照可能累计，不加总冒充账单。

## 失败记录及边界

第一次真实读取成功，但标记被放进原生代码块 Shadow DOM，旧测试只看普通 innerText，误判未渲染；已查看失败截图，补上原生 Shadow DOM 文本检查。第二次前三种审批和三种问答通过，计划正文缺失被真实测试拦住，修复后重跑完整流程才通过。两个失败运行保存在 previous-attempts；未拿部分成功当作完整通过，失败阶段未保存的用量记未知。

本轮没有修改 Codex UI，也没有重跑 Codex 真 token 请求。尚未证明全 App 零像素一致：审批标题／工具详情映射、Markdown 解析和编辑行为仍有宿主适配，计划的全局键盘快捷键未纳入本轮验收。顶部及设置中的自定义壳层也不能算原厂 1:1。
