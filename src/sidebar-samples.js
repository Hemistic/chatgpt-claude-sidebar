(function () {
  'use strict';
  // Presentation fixtures use the production message renderers. No CLI/API calls.
  const catalog = [
    { id: 'conversation', title: '对话与排版', icon: 'message-square', description: '段落、列表、表格、引用和代码块' },
    { id: 'tools', title: '执行命令与浏览', icon: 'terminal', description: '文件读取、终端输出和网页搜索' },
    { id: 'changes', title: '文件修改', icon: 'square-pen', description: '逐文件增删、本轮差异和完成总结' },
    { id: 'plan', title: '计划模式', icon: 'list-checks', description: '步骤状态、方案和执行前确认' },
    { id: 'permission', title: '权限审批', icon: 'shield', description: '命令说明、允许与拒绝操作' },
    { id: 'question', title: '提问与选择', icon: 'message-square', description: '单选、多选和补充说明' },
    { id: 'review', title: '代码审查', icon: 'search', description: '问题等级、原因和代码位置' },
    { id: 'recovery', title: '运行状态与异常', icon: 'terminal', description: '思考、失败、停止和上下文压缩' },
  ];
  const text = content => ({ type: 'text', content });
  const command = (id, name, commandText, result, status = 'completed') => ({
    id, type: 'tool_use', name, command: commandText, input: { command: commandText }, result, status,
  });
  const patch = '*** Begin Patch\n*** Update File: src/greet.js\n@@\n-export const greet = name => `Hello, ${name}`;\n+export const greet = (name = "访客") => `Hello, ${name}`;\n*** End Patch';
  const diff = 'diff --git a/src/greet.js b/src/greet.js\n--- a/src/greet.js\n+++ b/src/greet.js\n@@ -1 +1 @@\n-export const greet = name => `Hello, ${name}`;\n+export const greet = (name = "访客") => `Hello, ${name}`;';

  function make(id, { userMessage, assistantMessage }) {
    const sample = catalog.find(item => item.id === id);
    if (!sample) return null;
    const blocks = {
      conversation: [text('## 检查结果\n\n侧栏可以把工作过程和最终结果放在同一条对话里。\n\n- **过程**：展开命令查看原始输出。\n- **结果**：正文保持清楚的层级和间距。\n\n| 项目 | 状态 |\n| --- | --- |\n| 文件检查 | 已完成 |\n| 页面布局 | 待确认 |\n\n> 这是一套界面样例，未执行真实任务。\n\n```javascript\nexport const greet = (name = "访客") => `Hello, ${name}`;\n```')],
      tools: [text('先读取入口文件，再检查语法并搜索相关文档。下面的执行记录都可以展开。'),
        command('read', 'Read', 'src/greet.js', 'export const greet = name => `Hello, ${name}`;'),
        command('check', 'exec_command', 'node --check src/greet.js', 'Exit code: 0\nJavaScript syntax check passed.'),
        { ...command('web', 'web_search', 'Electron BrowserWindow documentation', 'BrowserWindow · Electron 官方文档\nhttps://www.electronjs.org/docs/latest/api/browser-window'), input: { query: 'Electron BrowserWindow documentation' } },
        text('### 已完成\n\n读取、命令和浏览记录使用同样的图标、动作与说明结构。')],
      changes: [text('为问候函数补充默认参数。展开文件可查看实际增删行。'),
        { id: 'edit', type: 'tool_use', name: 'apply_patch', input: { patch }, status: 'completed', result: 'Updated src/greet.js' },
        { id: 'diff', type: 'turn_diff', diff }, text('已添加默认名称，其他调用方式保持兼容。')],
      plan: [
        { id: 'steps', type: 'task_plan', explanation: '先确定接口，再实现和验证。', steps: [{ step: '梳理输入和输出', status: 'completed' }, { step: '完成实现方案', status: 'completed' }, { step: '等待确认后执行', status: 'pending' }] },
        { id: 'proposal', type: 'plan_proposal', plan: '## 实现方案\n\n1. 保留现有函数接口。\n2. 添加默认名称和输入规范化。\n3. 补充空值与正常输入的测试。\n\n当前仅展示方案，没有修改文件。' },
        { id: 'decision', type: 'plan_approval', variant: 'post-plan' }],
      permission: [text('下面展示执行前的权限审批。按钮只改变样例显示，不会启动命令。'),
        { id: 'approval', type: 'permission', approvalKind: 'command', title: '允许执行这条命令？', tool: '终端', command: 'npm run build', reason: '需要生成生产构建，检查入口文件是否正确。', description: '将在当前工作区运行构建命令。', decisionOptions: [{ value: 'accept', label: '允许这一次', decision: 'allow' }, { value: 'session', label: '允许此会话', decision: 'allow-always' }, { value: 'decline', label: '拒绝', decision: 'deny' }] }],
      question: [text('开始实现之前，需要确定两个选项。可以切换问题、选择答案并提交。'),
        { id: 'question', type: 'ask_user', questions: [
          { id: 'storage', header: '保存方式', question: '对话记录保存在哪里？', options: [{ value: 'local', label: '保存在本机', description: '离线可用，跟随当前设备。' }, { value: 'host', label: '交给宿主软件', description: '由接入侧栏的软件管理。' }], isOther: true },
          { id: 'features', header: '首批功能', question: '第一批需要哪些能力？', multiSelect: true, options: [{ value: 'files', label: '文件修改', description: '查看变更和逐行差异。' }, { value: 'terminal', label: '终端执行', description: '运行命令并查看输出。' }], isOther: true },
        ] }],
      review: [{ id: 'review', type: 'review_result', review: { overall_explanation: '发现一个会影响空输入结果的问题，建议合并前修复。', findings: [{ title: '[P2] 空数组应返回 0', body: '当数组为空时，求和结果为 `0`，除以数组长度会得到 `NaN`。应在计算前处理空数组。', priority: 2, confidence_score: 1, code_location: { absolute_file_path: 'src/average.js', line_range: { start: 3, end: 3 } } }] } }],
      recovery: [{ id: 'thought', type: 'thinking', content: '先定位失败的测试，再确定需要修复的输入分支。', durationSeconds: 3 },
        command('failed', 'exec_command', 'npm test -- average.test.js', 'FAIL average.test.js\nExpected: 0\nReceived: NaN\nExit code: 1', 'error'),
        { id: 'compact', type: 'context_compacted' }, text('### 任务已停止\n\n保留了失败输出，可以调整任务后继续。错误不会显示成成功结果。')],
    }[id];
    const assistant = assistantMessage();
    assistant.contentBlocks = blocks.map((block, index) => ({ ...block, id: `sample-${id}-${block.id || index}` }));
    assistant.durationSeconds = 12;
    if (id === 'recovery') assistant.isInterrupt = true;
    return { ...sample, messages: [userMessage(`展示「${sample.title}」的工作样式。`), assistant] };
  }
  window.SidebarSamples = Object.freeze({ catalog, make });
})();
