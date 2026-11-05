(function () {
  'use strict';
  const h = React.createElement;
  // R6s/K6s, Z6s, X7s/e9s in the pinned app-initial frontend.
  // Utilities are copied from that build, scoped in codex-request.source.css.
  const Surface = React.forwardRef(function Surface({ children, className = '', ...props }, ref) {
    return h('div', { 'data-codex-request-surface': true, className: 'cg-request-host' },
      h('section', { ...props, ref, className: `flex flex-col overflow-hidden text-default focus:outline-none rounded-3xl border border-default bg-surface-elevated-secondary cg-request-surface ${className}` }, children));
  });
  function Header({ title, identity, subtitle }) {
    return h('div', { className: 'flex min-w-0 flex-col gap-2' },
      identity ? h('div', { className: 'flex items-center gap-2 font-normal text-secondary text-size-chat-sm leading-5' }, identity) : null,
      h('div', { className: 'flex min-w-0 flex-col gap-0.5' },
        h('div', { className: 'min-w-0 wrap-anywhere leading-5 font-medium text-default text-size-chat' }, title),
        subtitle ? h('div', { className: 'text-size-chat-sm text-codex-description' }, subtitle) : null));
  }
  function Marker({ index, checked, checkbox }) {
    return h('span', { 'aria-hidden': true, className: `flex size-5 shrink-0 items-center justify-center rounded-xs border text-xs leading-none font-medium self-start ${checked && checkbox ? 'border-text bg-primary-solid text-primary-solid' : 'border-default bg-text/5 text-codex-description'}` },
      checkbox ? (checked ? h(window.CodexSidebarView.Glyph, { name: 'check', size: 14 }) : null) : index);
  }
  function Button({ primary, className = '', children, ...props }) {
    if (window.CodexNativeApprovalSource) return h(window.CodexNativeApprovalSource.Button, { type: 'button', ...props, color: primary ? 'primary' : 'outline', size: 'composer', className }, children);
    return h('button', { type: 'button', ...props, className: `cg-request-button ${primary ? 'is-primary' : ''} ${className}` }, children);
  }
  function CommandPreview({ command }) {
    const [expanded, setExpanded] = React.useState(false);
    if (!command) return null;
    const long = command.length > 180 || command.split('\n').length > 3;
    return h('div', { className: 'px-3' }, h('div', { className: 'flex max-h-80 w-full flex-col overflow-hidden rounded-md bg-surface-tertiary text-size-code text-tertiary' },
      h('div', { className: 'min-h-0 overflow-y-auto px-2 pt-2 pb-2 font-mono font-medium' },
        h('span', { className: `block break-words whitespace-pre-wrap ${long && !expanded ? 'cg-command-collapsed' : ''}` }, command)),
      long ? h('div', { className: 'flex shrink-0 justify-end p-1' }, h(Button, { onClick: () => setExpanded(value => !value), 'aria-expanded': expanded }, expanded ? '收起' : '展开')) : null));
  }
  window.CodexRequestUI = Object.freeze({ Surface, Header, Marker, Button, CommandPreview });
})();
