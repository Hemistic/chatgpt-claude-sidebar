(function () {
  'use strict';
  // Presentation only: the existing application owns providers, sessions and actions.
  const h = React.createElement;
  const Header = window.SidebarHeaderController;

  function Welcome() { return null; }

  function SendButton({ busy, queued, disabled, onSend, onCancel, locale }) {
    const zh = locale === 'zh-CN';
    const label = queued ? '取消排队' : busy ? (zh ? '停止生成' : 'Stop generating') : (zh ? '发送消息' : 'Send message');
    return h('button', {
      type: 'button', className: 'sidebar-send-button', title: label, 'aria-label': label,
      disabled: !busy && disabled, onClick: busy ? onCancel : onSend,
    }, h('svg', { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
      busy ? h('rect', { x: 6, y: 6, width: 12, height: 12, rx: 2, fill: 'currentColor' })
        : h('path', { d: 'M12 19V5m-6 6 6-6 6 6', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })));
  }

  window.AISidebarUI = Object.freeze({ Header, Welcome, SendButton });
})();
