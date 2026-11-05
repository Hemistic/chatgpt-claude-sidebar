# 独立 CLI 会话菜单：源码接入与验收

原问题是两个提供方复用同一棵手写导航 DOM，Claude 菜单也调用 Codex 的 threads 接口。现在两边是独立菜单组件、独立样式与各自会话数据；只共享去重、路径归组和打开回调。

## 源码对应

- Codex 26.1027.6604.0：本机 app.asar 中的 Tja/xja（行与键盘交互）、dMa/aMa/nMa（项目行、折叠及缩进）、QAn（会话行）、Vja/Hja/Uja/Wja（标题截断、渐隐及悬停滚动）。19 个原始声明和 402 条相关 CSS 规则通过可重复导入脚本保存；哈希在 codex-navigation-source-manifest.json。
- Claude 4.4212.0.0：本机 ion-dist.asar 的 shared-18-BuAf9MDW.js 中 AA（会话行）、lj/vj（分组标题），以及原始 dframe 密度、颜色与字体。导入声明哈希在 claude-navigation-source-manifest.json。
- Claude 无图标会话行必须显式传入 icon:null，才能走原生 iconless label 分支，创建 dframe-fade-label。之前直接给字符串使底层行失去标题容器，长文字换行后与下一行重叠。本次使用该源码分支，没有另写固定字数截断。
- Claude 导入的 React use(context) 经宿主兼容层接到 useContext；视觉声明保持原文。原服务端重命名增强未接入。

## 独立部分和边界

claude-conversation-menu.js/css 与 codex-conversation-menu.js/css 分开；sidebar-recent.js 只保留数据 Hook。Claude 不再请求 Codex threads，提供方过滤在去重前执行，兼容提供方信息保存在历史记录中的旧标签。

原 App 的整页侧栏被放入用户指定的左上角独立弹出入口。定位、弹出容器、搜索输入、CLI 数据绑定和关闭本地标签动作是宿主适配；原 App 的云端导航、云状态徽标、账户菜单和环境悬浮卡未接入。本次是有源码出处的导航组件接入，不能据此宣称完整 App 已经过逐像素对比验收。Claude 历史沿用已有本地发现缓存；Codex 通过 app-server 分页。

## 验证

- 真 token：Claude claude-haiku-5-5 / high 与 Codex gpt-6.1-sol / high。原始回复、用量与截图在 test-artifacts/navigation-2026-11-04/live/，summary.json 保留最终用量事件，未重复累加事件。
- 日/夜 × 360/900 CSS 像素 × Claude/Codex，共 8 组。验证提供方样式隔离、原生行高度、标题单行且不越界、菜单左右边界、滚动到底、点击自己的真实会话、刷新后恢复。
- 分别关闭真实会话标签并从历史菜单恢复，检查 provider、runtimeThreadId 和消息内容。
- 5 项数据隔离/样式回归检查通过；两个源码导入脚本 --check 通过。
- 已亲自查看真实回复与两种菜单的日夜截图。早期发现的标题重叠已修复。外部 CDP 在窗口被最小化/关闭时截图曾失败，后续通过 Electron webContents.capturePage(stayHidden:true) 做后台实际渲染验收，保留普通 CDP 入口供可见窗口使用。

复用：standalone/navigation-live-test.cjs。独立启动器支持 --background-test --navigation-ui-check，并在后台通过 Electron debugger 控制自己的页面。默认执行真实回合；--recheck-ui 只复查同一隔离档案中已记录的两个真实回合，不能代替首次真实验收。

本次测试会话按专用工作区和 ID 精确清理，清理报告为 test-artifacts/navigation-2026-11-04/cleanup.json；未清理其他正常会话或以前任务的历史。
