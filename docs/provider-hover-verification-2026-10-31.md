# 左上角原位胶囊验证

用户要求：圆形入口原位向右展开，左 OpenAI、右 Claude 花形标志，鼠标移入标志即切换 CLI；离开恢复当前引擎圆形入口。点击圆形入口仍打开近期会话。

修改 `src/sidebar-header.js`，以实际指针移动选择引擎，悬停选择后保持胶囊展开。初次展开时不因静止指针下出现 OpenAI 标志而切换 Claude 会话；任务进行中沿用禁止跨 CLI 切换的约束。文档级指针离开检测处理切换原生按钮时节点替换吞掉离开事件的问题。

Claude 样式中的原生 `relative` 定位覆盖了宿主定位，导致标志落到胶囊下方；修正 `src/claude-shell.css` 中宿主定位选择器的优先级，同时保留 Claude 专用样式。两个引擎仍各自加载独立样式表。

验证结果：

- `node scripts/start.cjs --header-test --provider-switch-only --background-test`：320、440、1440 三种宽度共 18 个截图检查点通过。验证双向悬停切换、不弹菜单、两个图标的坐标及大小、间隙穿越、离开收起、焦点不会保持展开、标题与按钮逐帧位置稳定、点击当前圆形入口打开近期会话。未发送模型请求。
- `node --test tests/provider-styles.test.cjs`：2 项通过，两个引擎加载的样式表互斥。
- 实际供用户验证的独立窗口已刷新，并使用 Chromium 指针输入验证展开、切换 Claude、移开收起；最终可编辑，Claude 仅启用三份专用样式表。截图位于 `test-artifacts/provider-hover-2026-10-31/`，已亲自查看。
- 全量旧顶栏流程另一次运行在“打开近期会话后标题等于所选行 title”的断言等待超时，因此本次通过范围限定为以上悬停专项与样式隔离检查；不声称全部顶栏历史流程通过。记录：`.tmp-standalone/2026-10-30T16-03-34-585Z/header.json`。

专项报告：`.tmp-standalone/2026-10-30T16-05-00-673Z/header.json`（文件夹使用 UTC 时间，用户本地日期为 10 月 31 日）。
