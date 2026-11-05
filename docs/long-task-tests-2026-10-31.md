# Codex 与 Claude Code 长任务真测记录

两种 CLI 各完成同一会话内的 **8 个阶段**，另用 Codex 做了真实的转义竖线表格复现。**CLI 链路与任务可以完成，界面验收尚未通过：确认 8 项待修问题，其中表格解析会改变内容。** 本轮按用户要求记录问题，没有把这些产品问题标成已修复。

机器记录：[汇总](../test-artifacts/long-task-2026-10-31/summary.json)、[问题清单](../test-artifacts/long-task-2026-10-31/findings.json)、[Codex 事件](../test-artifacts/long-task-2026-10-31/codex-run.json)、[Claude 事件](../test-artifacts/long-task-2026-10-31/claude-run.json)。运行产物保存在 Git 忽略目录。

## 测试范围与配置

| 项目 | Codex | Claude Code |
| --- | --- | --- |
| 本机 CLI | 0.163.0 | 2.1.283 |
| 模型／强度 | `gpt-6.1-sol / high`，来自本机配置 | `claude-haiku-5-5 / high`，测试参数传入 |
| 采纳的真实阶段 | 8/8 完成 | 8/8 完成，包含一次应用重启后的续接 |
| 采纳阶段耗时合计 | 16 分 48 秒 | 10 分 40 秒；含中断及重启的墙钟跨度约 17 分 52 秒 |
| 不同工具 ID 数 | 56 | 57 |
| 界面交互次数 | 12 | 21 |
| 任务项目最终测试 | 90 项通过 | 46 项通过 |
| 长报告字符数 | 4,062 | 6,352 |
| 重载前后消息项 | 14 → 14 | 16 → 16 |
| 重载前后代码块 | 未见数量回退 | 5 → 5 |

工具 ID 包含编排工具和实际命令工具，不等于终端命令条数。90／46 是**模型完成的隔离项目的测试数量**，不是侧栏产品单元测试数量；两种实现的测试策略不同，不用这组耗时或数量给模型排名。

任务是在 `.tmp-standalone/2026-10-31T14-50-25-518Z/workspace/codex` 与 `workspace/claude` 中制作 CSV 账本库、CLI、验证脚本和文档。真实模型负责读取、规划、写代码、执行测试与修复。输入从真实编辑器进入，审批和问答使用实际组件；没有注入模型回答或模拟 SDK 回调。

Claude 的测试参数没有锁死产品模型。关闭自动标题生成，测试上下文禁止子代理及其他模型调用；采纳的 Claude 用量事件均为 `claude-haiku-5-5`。没有启动 ArtInFact，没有使用 Computer Use。

## 八阶段结果

| 阶段 | 检查内容 | Codex 耗时 | Claude 耗时 | 结果 |
| --- | --- | ---: | ---: | --- |
| 01 规划／问答 | 读取随机编号和项目，原生提问，原生计划与批准 | 86.2 秒 | 93.9 秒 | 完成；Codex 问答状态有滞后问题 |
| 02 多文件实现 | 模块、命令入口、测试、文档；实际审批和终端执行 | 285.4 秒 | 175.7 秒 | 完成 |
| 03 增量变更 | 修改退款计数规则，过滤边界、多行中文与引号回归 | 170.7 秒 | 53.2 秒 | 完成；Claude 为恢复后采纳的回合 |
| 04 失败恢复 | 执行不存在的脚本，保留退出码 1；完善真实验证脚本 | 139.4 秒 | 87.3 秒 | 完成，预期失败没有被计为通过 |
| 05 长报告 | 再跑测试、长 Markdown、表格、四类代码块、长路径 | 255.4 秒 | 166.6 秒 | 内容生成完成；发现表格及摘要显示问题 |
| 06 主动停止 | 真实长输出中点击停止 | 46.0 秒 | 36.1 秒 | 停止成功；Claude 缺少明确停止提示 |
| 07 继续对话 | 不调用工具，复述原始随机编号和已变更规则 | 8.1 秒 | 10.9 秒 | 原始编号与会话上下文保留 |
| 08 重载／重连 | 重载界面，继续原会话读取并运行验证脚本 | 17.1 秒 | 16.2 秒 | 原会话保留，验证脚本退出 0 |

两个项目的独立宿主核对结果均为：`count=3`、`total=17.5`，分类为图书 `2/10.00`、文具 `1/7.50`；排除退款和日期过滤结果也通过独立断言。

Codex 在八阶段中保持同一原生会话 ID。Claude 在测试脚本中断、应用重启、继续变更和后续界面重载后，也保持原来的原生会话 ID。完整 ID 和各阶段事件在 JSON 中保留。

## 待修问题

| 优先级／编号 | 影响 | 真实现象与定位 | 建议修复方向 |
| --- | --- | --- | --- |
| **P1／UI-06** | 两种界面的共享 Markdown | `parseTableRow` 直接 `split('|')`，将合法的 `\|` 当作分隔符，后续列错位，超过表头列数的最后结果被丢掉 | 按原 App 的 Markdown／表格解析路径处理转义和代码跨度，停止用简单字符串分割承担表格语法 |
| P2／CLI-02 | Codex 启动配置与权限 | 测试启动指定 `workspace-write`，前端 `getState` 恢复没有合并 `sandbox`，新会话实际使用 `read-only`，产生额外写入审批 | 修正运行时设置恢复及新会话设置的初始化顺序，保留已有会话明确的覆盖值 |
| P2／CLI-01 | Claude 上下文状态数据 | 最后单次消息约 61,535 token、31%；SDK 结束结果的累计值 489,010 被写成“当前上下文”，百分比跳至 100% | 分开保存累计用量与当前上下文；结果汇总不能覆盖最近单次请求的上下文占用 |
| P2／UI-01 | Codex 问答状态 | 回答已经回传，模型继续生成方案，工具行仍显示“等待回答”，整轮结束后才显示“已收到回答” | 问答解决事件应同时更新对应工具记录的状态 |
| P2／UI-02 | 两种界面的工具摘要 | Codex 显示 PowerShell 启动路径与转义，实际命令被省略；Claude Read 多个完整路径具有相同前缀，文件名不可辨认 | 按原 App 的命令／路径摘要组件提供关键部分，完整信息放到可展开详情 |
| P2／UI-03 | Codex 长工具输出 | 执行组的 224px 滚动区再套 260px 输出滚动区，与外层会话形成三级滚动 | 按原源码的详情层级核对滚动责任，避免记录区与输出区同时限制高度 |
| P2／UI-04 | Codex 窄表格 | 状态列约 51px，扣除 padding 后 `2（预期）` 逐字竖排，长表占用大量高度 | 核对原 App 表格的最小列宽、短值不换行和内部横向滚动策略 |
| P2／UI-05 | Claude 主动停止状态 | CLI 明确发出 cancelled／done，发送按钮恢复，但对话末尾只有被截断的半句，没有明确的主动停止提示 | 将消息的 `isInterrupt` 接到 Claude 原生中断呈现路径 |

CLI-01 是传给界面的状态字段错误；当前 Claude 输入框没有单独展示完整上下文环，不能将本次累计统计误写成用户已经实际耗尽窗口。中断后的额外到达片段也不自动作为丢字缺陷：停止时冻结显示与停止后的传输尾包需要区分。

主要代码位置：

- 表格解析：[claudian-sidebar-react.js](../src/claudian-sidebar-react.js)，`parseTableRow`，约 6363 行；两个界面都使用同一 `adapters.parse`。
- 启动设置：[claudian-sidebar-react.js](../src/claudian-sidebar-react.js)，`api.getState` 恢复，约 16859 行；测试启动配置见 `standalone/main.cjs`。
- Claude 用量：[claudian-sidebar-runtime.js](../src/claudian-sidebar-runtime.js)，`emitClaudeUsage`，约 16364 行。
- 问答完成：[claudian-sidebar-react.js](../src/claudian-sidebar-react.js)，`removeResolvedRuntimeApproval`，约 6115 行。
- 命令／路径摘要：[codex-conversation.js](../src/codex-conversation.js)、[claude-surface.js](../src/claude-surface.js)。
- 嵌套滚动：[codex-conversation.css](../src/codex-conversation.css)，约 54、67 行。
- 停止提示：[claude-surface.js](../src/claude-surface.js) 的 `Turn` 未处理 `isInterrupt`；Codex 对应路径在 [codex-conversation.js](../src/codex-conversation.js) 约 271 行。

## 表格错列的精确复现

Claude 长报告首先触发，随后用 Codex 真实请求确认。最终 Codex 回包为合法四列表格，包含这一行：

```markdown
| 1 | `a\|b` | sample.cjs | ESCAPED_PIPE_REAL_PASS |
```

界面却显示四个单元格为：`1`、`` `a\ ``、`` b` ``、`sample.cjs`。真正的 `ESCAPED_PIPE_REAL_PASS` 消失。这是解析导致的内容错误，不是模型未返回结果。

证据：[真实回包与 DOM 对比](../test-artifacts/long-task-2026-10-31/escaped-pipe-real.json)、[Codex 实际窗口](../test-artifacts/long-task-2026-10-31/codex/codex-real-escaped-pipe.png)、[Claude 对应表格](../test-artifacts/long-task-2026-10-31/claude/claude-table-right.png)。

## 截图与误报复核

保存 **190 张过程及阶段截图**。人工检查了各阶段结束、审批／问答／计划、失败详情、长报告、停止及重载等关键截图；没有宣称逐张审核了全部定时采样帧。窗口宽度覆盖 360、440、1100，并采集顶部、中部、底部。

代表性截图：

- [Codex 方案与实施确认](../test-artifacts/long-task-2026-10-31/codex/codex-01-plan-question-done.png)
- [Codex 大命令审批](../test-artifacts/long-task-2026-10-31/codex/codex-02-implement-approval-0.png)
- [Codex 错误详情的嵌套滚动](../test-artifacts/long-task-2026-10-31/codex/codex-failure-detail-manual.png)
- [Codex 窄表格的短列竖排](../test-artifacts/long-task-2026-10-31/codex/codex-03-change-request-done.png)
- [Claude 原生问答](../test-artifacts/long-task-2026-10-31/claude/claude-01-plan-question-question-0.png)
- [Claude 停止后的半句](../test-artifacts/long-task-2026-10-31/claude/claude-06-cancel-done.png)
- [Claude 重连后的实际结果](../test-artifacts/long-task-2026-10-31/claude/claude-08-reconnect-done.png)

自动检查将 Claude 的宽表格报告为横向溢出，经实际滚动与截图复核，该表宽约 510px，容器约 385px，可滚到 `scrollLeft≈125px`，页面宽度没有被撑大。这是正常的内部横向滚动，已排除为页面溢出缺陷。原始检查结果保留，最终分类见 `findings.json`。

本轮采纳回合没有记录 CLI 传输级错误或渲染器异常。命令级的预期失败、测试首次失败及模型自行恢复均保留在事件中，不等于整个任务失败。

## 用量记录与测试入口

Codex 按原生 `thread/tokenUsage/updated.total` 的回合差值记录，不把 `last` 当整轮累计。Claude 保存 SDK 回合汇总与消息级用量。停止回合没有独立上报的新增用量标为未知；没有补写零或估算费用。

测试入口为 `standalone/long-task-test.cjs`，通过 `--long-task-test` 启动。Claude 模型与 effort 必须显式传入；`--long-resume` 可在相同 profile/workspace 下恢复先前会话的后续阶段。`--provider=claude` 支持直接打开保留的 Claude 验证窗口，无需先连接 Codex。

本轮开发测试脚本时，修正过命令筛选误判、项目内临时清理被过严拦截、显式 profile 时结果目录未创建，以及观察器生命周期／选择器等待问题；这些没有计入上面的产品缺陷。失败尝试保留在原 `.tmp-standalone` 记录，最终采纳数据来自完整成功回合和清理观察器后重新发起的真实表格请求。Claude 恢复后继续使用原生会话，不是另开模型会话替代上下文测试。

这是一轮有范围的长任务检查，不是满上下文容量或通宵稳定性认证。原生 `/review`、所有审批变体和并发双会话执行不在本轮覆盖之内。

修复顺序建议：**共享表格解析 → 启动权限与用量语义 → 问答／停止状态 → 摘要、滚动与窄表格布局**。修复后继续用真实任务回归，不能用静态样例替代。
