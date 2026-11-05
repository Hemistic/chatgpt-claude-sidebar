# 文件拖放与提供方切换修复（2026-11-04）

- 文件拖放以前只过滤出图片；现在普通本地文件通过 Electron webUtils.getPathForFile 进入现有 fileChips / context_files 路径。聊天区域和输入区均接受拖放，重复文件按路径去重。
- 移除依赖 CSS 隐藏的常驻拖放提示，只在真实文件拖动时挂载。离开、取消、Escape、恢复鼠标移动、窗口失焦和切换会话/提供方时清理。
- 左上角悬停只展开，点击才调用提供方切换。方向键只展开并移动焦点，Enter/Space 仍可激活。
- 图片读取失败显示错误，不再用示例图片替代。超出大小/数量限制会提示。
- Claude 图片预览原来使用没有启用对应 CSS 的旧通用组件，导致图片撑满输入区。现在复用已导入的 ClaudeNativeSource.Attachments.Image 和原生 data-cds-composer-attachments 样式，实测 120 × 120 CSS 像素。未修改原生生成声明。原生图片消息使用正确的 alt 属性。

## 真实验证

Chromium Input.dispatchDragEvent 携带真实磁盘文件路径，产生 Electron 可解析的 File；鼠标移动与点击通过 Chromium 输入事件。没有模拟 CLI 回调。

- Claude claude-haiku-5-5 / high：1 个真实回合。
- Codex gpt-6.1-sol / high：1 个真实回合。
- 两边实际读取中文文件名文本附件，返回文件内的验证字符串；两边识别图片附件，均有实际 usage 记录。
- 验证取消拖放、重复文件去重、图片预览尺寸、悬停不切换、点击双向切换。
- MutationObserver 检查切换全过程：拖放提示节点新增数为 0。renderer 异常为 0。
- 5 个文件上下文和提供方样式回归通过；3 个修改文件语法检查通过。
- 已亲自查看两边附件、真实结果及悬停截图。早期取消拖动、图片布局失败记录保留在报告目录，不计为通过。

报告：test-artifacts/drag-click-2026-11-04/summary.json、report.json；清理：cleanup.json。
本轮限定上述缺陷，不宣称整个 App 已逐像素一致。
