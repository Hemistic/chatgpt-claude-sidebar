(function () {
  'use strict';
  const h = React.createElement;
  // Native render functions stay in codex-approval.native.js. Only host services
  // (portal, command bindings and submission) are supplied here.
  function MenuItem({ onSelect, children, disabled }) {
    return h('button', { type: 'button', role: 'menuitem', disabled, onClick: onSelect }, children);
  }
  function Popup({ trigger, children, open, onOpenChange }) {
    const [anchor, setAnchor] = React.useState(null);
    const button = React.useRef(null), menu = React.useRef(null);
    const closeMenu = () => { setAnchor(null); onOpenChange?.(false); };
    React.useEffect(() => {
      if (!anchor) return;
      const close = event => {
        if (event.type === 'keydown' ? event.key === 'Escape' : !button.current?.contains(event.target) && !menu.current?.contains(event.target)) {
          if (event.type === 'keydown') { event.preventDefault(); event.stopPropagation(); }
          closeMenu();
        }
      };
      document.addEventListener('pointerdown', close); document.addEventListener('keydown', close, true);
      return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close, true); };
    }, [anchor]);
    const toggle = () => {
      const rect = button.current.getBoundingClientRect();
      const opening = !anchor;
      setAnchor(opening ? { left: Math.max(12, Math.min(innerWidth - 252, rect.right - 240)), bottom: innerHeight - rect.top + 6 } : null);
      onOpenChange?.(opening);
    };
    return h(React.Fragment, null,
      h('span', { ref: button, style: { display: 'inline-flex' } }, trigger({ onClick: toggle, 'aria-expanded': !!anchor, 'aria-haspopup': 'menu' })),
      anchor && open !== false ? ReactDOM.createPortal(h('div', { ref: menu, 'data-codex-request-surface': true, className: 'cg-request-host cg-approval-scope-menu', role: 'menu', style: { position: 'fixed', width: 240, ...anchor }, onClick: closeMenu }, children), document.body) : null);
  }
  function LeadingMenu({ triggerButton, children }) {
    return h(Popup, { trigger: props => React.cloneElement(triggerButton, props) }, children);
  }
  function Dropdown({ triggerButton, children, open, onOpenChange }) {
    return h(Popup, { open, onOpenChange, trigger: props => React.cloneElement(triggerButton, props) }, children);
  }
  function useCommands({ enabled, onApprove, onDecline }) {
    React.useEffect(() => {
      if (!enabled) return;
      const key = event => {
        if (event.isComposing || event.defaultPrevented || document.querySelector('.cg-approval-scope-menu')) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onDecline(event.timeStamp); }
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); onApprove(event.timeStamp); }
      };
      document.addEventListener('keydown', key);
      return () => document.removeEventListener('keydown', key);
    }, [enabled, onApprove, onDecline]);
  }
  window.CodexApprovalBindings = Object.freeze({ MenuItem, LeadingMenu, Dropdown, useCommands });
})();
