(function () {
  'use strict';
  const h = React.createElement;
  // ComposerApprovalRequestCard R + pending-request-item-panel Jr/Zr.
  function Approval({ block, options, onDecision }) {
    const { CommandPreview } = window.CodexRequestUI;
    const gate = React.useRef(false);

    const pending = block.responsePending === true;
    React.useEffect(() => { gate.current = pending; }, [pending, block.responseError]);
    const approve = options.find(option => option.decision === 'allow') || options.find(option => option.value === 'accept');
    const deny = options.find(option => option.decision === 'deny') || options.find(option => option.value === 'decline');
    const extras = options.filter(option => option !== approve && option !== deny && option.decision !== 'cancel');
    const kind = block.approvalKind;
    const command = block.command || (kind === 'command' ? block.reason : '');
    const reason = block.requestReason || (block.reason !== command ? block.reason : '') || block.description;
    function choose(option) {
      if (!option || pending || gate.current) return;
      gate.current = true;
      Promise.resolve(onDecision(block.id, option.decision)).finally(() => { gate.current = false; });
    }
    const fallbackTitle = /^Execute command\?|^Permission required$/.test(block.title || '') ? '允许执行这条命令？'
      : /^Apply file change\?/.test(block.title || '') ? '允许修改这些文件？'
        : /^Grant permissions\?/.test(block.title || '') ? '允许使用这些权限？' : block.title;
    const title = kind === 'command' && reason && reason !== command ? reason : fallbackTitle;
    const reject = deny || options.find(option => option.decision === 'cancel');
    const scoped = extras.filter(option => option !== reject);
    return h(window.CodexNativeApprovalSource.ApprovalCard, {
      title: title || '允许执行这项操作？',
      headerContent: h(React.Fragment, null, h(window.CodexSidebarView.Glyph, { name: kind === 'file_change' ? 'edit' : 'terminal', size: 16 }), kind === 'file_change' ? '编辑文件' : kind === 'command' ? '终端' : '权限请求'),
      body: h(React.Fragment, null, h(CommandPreview, { command }), block.responseError ? h('p', { role: 'alert', className: 'cg-request-error' }, block.responseError) : null),
      actions: {
        disabled: false, isLoading: pending,
        approveDisabled: !approve,
        approveLabel: '允许这一次', denyLabel: reject?.decision === 'cancel' ? '取消' : '拒绝',
        onApprove: () => choose(approve), onDeny: () => choose(reject),
        scopedApproveAction: scoped.length === 1 ? { label: scoped[0].label, onClick: () => choose(scoped[0]) } : undefined,
        leadingAction: scoped.length > 1 ? { label: '更多选项', menu: scoped.map(option => h(window.CodexApprovalBindings.MenuItem, { key: option.value, onSelect: () => choose(option) }, option.label)) } : undefined,
      },
    });
  }
  window.CodexApprovalUI = Object.freeze({ Approval });
})();
