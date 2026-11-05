# Claude 审批、问答与计划的真实测试

2026-10-31：本轮采用真实 Claude CLI／SDK 请求、实际 Electron 界面、preload IPC 和真实服务回复；不是样例或模拟回调。测试启动时传入 `--test-model=claude-haiku-5-5 --test-effort=high`，产品的模型切换与默认配置没有锁定。关闭测试会话的自动标题生成，避免辅助请求选用其他模型。

## 通过项目

| 类目 | 实际验证 |
| --- | --- |
| 基础连接 | Chromium 输入、多行编辑、Send → CLI → Read 随机标记文件 → 原生消息呈现；原文件未变 |
| 允许一次 | 真实 Write 请求弹出审批，允许后仅创建测试夹具文件，内容匹配随机标记 |
| 拒绝 | 真实 Write 请求被拒绝，目标文件没有创建，模型确认 DENIED |
| 始终允许 | 真实 Write 请求选择 Always allow，模型继续完成夹具写入 |
| 分页单选／多选 | 真实 AskUserQuestion 发出两页问题，提交 Local / Files / Terminal，模型明确确认这三个答案 |
| 自填 | 真实 AskUserQuestion 的 Other 输入中文，模型原样确认中文答案 |
| 跳过 | 真实 AskUserQuestion 选择 Skip，回合正常结束 |
| 修改计划 | 真实 EnterPlanMode → ExitPlanMode，显示方案正文，提交反馈后继续规划并结束，没有实现项目改动 |
| 拒绝计划 | 真实 ExitPlanMode 的 Reject 导致用户中断，未把预期中断误显示成运行异常 |
| 批准计划 | 真实 ExitPlanMode 的 Accept 退出计划模式，模型再次 Read 原夹具后结束，未修改原文件 |

主要完整回归共 1 个基础读取回合和 9 个交互回合，全部通过。每个完成回合都返回了真实用量，记录的模型为 `claude-haiku-5-5`。报告保留每回合返回的用量，不把中间流式用量重复相加。

主要证据：

- `.tmp-standalone/2026-10-31T06-51-56-049Z/claude-real-interactions.json`
- `.tmp-standalone/2026-10-31T06-51-56-049Z/claude-live.json`
- `test-artifacts/claude-real-2026-10-31/summary.json` 与逐状态截图，已亲自查看。
- 附加真实回合核对 `Open plan` 原生 TextLink 的显示、点击定位及拒绝后的 interrupted 状态：`test-artifacts/claude-real-2026-10-31/plan-native-link.json`。
- 附加真实回合选择 `Accept and allow edits` 后，CLI 继续读取夹具并正常结束：`test-artifacts/claude-real-2026-10-31/plan-native-accept-edits.json`。主回归中的批准选项是手动 `Accept`，两条批准路径分开记录。
- `Open plan` 使用的是原厂 `shared-frame` 的 `vl`（TextLink），不是拿普通 Button 代替。真实方案定位后保持键盘焦点，使用原生 `outline-none` 工具类去掉浏览器附带的大框；自查图为 `plan-focus-native-outline.png`。

## 修正内容

1. 问答回传采用原厂的问题正文和选项标签，按选项顺序提交多选；Other 空内容沿原厂语义提交 Something else。
2. 计划批准携带用户选择的 targetMode，避免仍把 CLI 留在 plan 模式；侧栏同步恢复对应会话模式。
3. 计划反馈为空时继续规划，不被误当作拒绝；反馈编辑聚焦和 Enter／Escape 行为对齐相应源码路径。
4. ExitPlanMode 的真实方案内容进入对话呈现，原厂 `Open plan` TextLink 可定位方案。
5. 用户拒绝计划产生的特定中断结果标记为 interrupted；其他错误继续报告。错误结果中的真实用量也保留。
6. 回复写入失败时保留审批供重试，界面显示失败原因；同步保护正在提交的审批，防止重复提交。此项最初由协议回归发现；不能将此前夹具结果冒充为真实网络断连验证。
7. 未知／新模型的能力元数据缺失时，不再静默丢弃显式 effort；CLI 和 SDK 使用相同的计算结果，让真实服务校验请求配置。

## 验证边界

这证明上述真实路径能够工作，不代表完整 Claude App 的全部样式已达到 1:1。网络断连后重试、全部键盘组合与 IME 边界、所有窗口尺寸和所有审批类型还没有逐一完成真 token 验收。界面移植差异仍以 `claude-source-audit-2026-10-31.md` 为准。

复现命令：

```powershell
$env:ELECTRON_OVERRIDE_DIST_PATH = Join-Path $env:LOCALAPPDATA 'ai-sidebar/runtime/electron-34.5.8/dist'
node scripts/start.cjs --claude-interactions-test --test-model=claude-haiku-5-5 --test-effort=high --background-test --keep-open
```

本机 D 盘 Electron 程序读取曾被 Windows 报错而退出，因此本次从已恢复的同版本 C 盘缓存启动；项目源码仍是独立库。未启动 ArtInFact。
