# 提供方切换跳动修复

## 实际原因

对 link.media 的赋值触发 Chromium 异步重处理外部 CSS（包含嵌套 import）。React 已换成目标界面，但目标样式尚未完整生效，产生真实无样式中间帧。修复前捕获顶栏高度从 40 变为约 98.29 CSS 像素，输入区短暂离开底部。不是通过隐藏界面、固定延时或覆盖两种原 App 样式解决。

## 改动

加载完成后直接修改已解析 CSSStyleSheet.media.mediaText，避免修改 link.media 或 link.disabled。只在启动尚未取得 sheet 时使用链接 media。切换样式移入 useInsertionEffect，先于原生组件布局测量运行，避免输入框按上一提供方样式测量后再变宽。

Claude 和 Codex 的样式来源、文件、最终尺寸保持独立；每个采样帧只允许目标提供方样式生效。胶囊展开/收起动画保留，只有点击才切换。

## 验证

- 修复前后都保存了真实 Chromium 连续画面和每帧几何数据。
- 两个真实模型回合：claude-haiku-5-5/high、gpt-6.1-sol/high；usage 见 summary.json。长回复包含编号段落和代码块。
- 日/夜主题 × 360/440/1000/1600 CSS 像素宽度 × 双向切换，共 16 次。
- 检查 748 个目标界面帧，顶栏始终 40 像素；输入区底边误差最大 0.00006 像素。每次切换的目标布局从第一帧到稳定帧一致（阈值 0.6 像素）。
- 样式表对象替换、混用样式、页面横向溢出、拖放提示、renderer 异常均为 0。悬停未触发切换。
- 已查看修复前无样式帧、修复后连续帧和真实回复截图。
- 回归检查会拒绝对已加载链接的 media/disabled 赋值，防止重新引入异步重载。

复用测试：standalone/switch-motion-test.cjs。先启动隔离独立窗口（默认调试端口 19437），Claude 选用指定模型与 high；可用 SIDEBAR_DEBUG_PORT、SIDEBAR_TEST_ARTIFACTS 调整端口与报告目录。测试消耗真实 token，完成后按测试工作区精确清理会话。

报告在 test-artifacts/switch-motion-2026-11-04/，测试会话清理记录为 cleanup.json。
