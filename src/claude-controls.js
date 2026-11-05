(function () {
  'use strict';
  const h = React.createElement;

  // CLI data and window appearance are host services. The four menus below use
  // the shipped renderers, interaction logic and CSS without replacement rows.
  function Provider({ children }) {
    const N = window.ClaudeMenuSource;
    const intl = window.ClaudeNativeSource.useIntl();
    const [container, setContainer] = React.useState(null);
    React.useLayoutEffect(() => {
      const root = document.querySelector('[data-claude-native]');
      const portal = document.createElement('div');
      portal.setAttribute('data-claude-controls-source', '');
      portal.className = 'cds-root epitaxy-root';
      Object.assign(portal.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '120', background: 'transparent' });
      root.appendChild(portal);
      setContainer(portal);
      return () => portal.remove();
    }, []);
    const mode = document.documentElement.dataset.theme || 'light';
    React.useLayoutEffect(() => {
      if (!container) return;
      container.dataset.theme = 'claude';
      container.dataset.mode = mode;
      container.className = 'cds-root epitaxy-root ' + mode;
    }, [container, mode]);
    const store = React.useMemo(() => ({
      getSnapshot: () => document.documentElement.dataset.theme || 'light',
      getServerSnapshot: () => 'light',
      subscribe: notify => {
        const observer = new MutationObserver(notify);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
      },
    }), []);
    return h('span', {
      style: { display: 'contents' },
      'data-claude-controls-source': '', 'data-theme': 'claude', 'data-mode': mode,
      className: 'cds-root epitaxy-root ' + mode,
    }, h(N.IntlContext.Provider, { value: intl },
      h(N.ModeContext.Provider, { value: store },
        h(N.PortalContext.Provider, { value: container }, children))));
  }

  function Add({ onAddContext }) {
    const N = window.ClaudeMenuSource;
    const intl = window.ClaudeNativeSource.useIntl();
    // The local Code branch supplies this row from bx; connected-account issue
    // pickers are supplied only by a host that actually implements those services.
    const items = React.useMemo(() => [{
      label: intl.formatMessage({ defaultMessage: 'Add folder', id: 'lhYeghbH/7' }),
      icon: 'Folder', onSelect: () => onAddContext('directory'),
    }], [intl, onAddContext]);
    return h(N.AddMenu, {
      onAddFiles: files => onAddContext({ files }), supportsFileAttachments: true,
      plusMenuItems: items, side: 'top', size: 'base', dockGlyph: true,
    });
  }
  function AddMenu(props) { return h(Provider, null, h(Add, props)); }

  function Suggestions({ items, query, onPick, onDismiss, variant }) {
    const N = window.ClaudeMenuSource;
    const editor = React.useCallback(() => document.querySelector('.claudian-native-input'), []);
    const liveQueryRef = React.useRef(query);
    liveQueryRef.current = query;
    const rows = React.useMemo(() => items.map(item => ({
      type: 'skill', skillId: item.name, label: String(item.name).replace(/^\//, ''),
      skillDescription: item.desc || '', argumentHint: item.argumentHint,
      disabled: !!item.disabled, onAction: () => onPick(item),
    })), [items, onPick]);
    const reference = React.useCallback(() => {
      const input = editor(), selection = input?.ownerDocument.getSelection();
      if (selection?.rangeCount && input.contains(selection.anchorNode)) {
        const caret = selection.getRangeAt(0).getBoundingClientRect();
        if (caret.height) return caret;
      }
      return input?.getBoundingClientRect() || new DOMRect();
    }, [editor]);
    const popup = h(N.SlashPopup, {
      clientRect: reference, decorationNode: editor(), maxHeightCap: 384, zIndex: 80,
    });
    return h(N.SlashProvider, {
      items: rows, itemsForQuery: () => rows, resetKey: query,
      onClose: onDismiss, onDismiss, liveQueryRef, getInputElement: editor,
      keepsEscape: true, ownerDocument: document, startsUnselected: false,
    }, popup);
  }
  function SlashDropdown(props) {
    if (!props.visible) return null;
    return h(window.ClaudeSidebarUI.Ready, null, () => h(Provider, null,
      h(Suggestions, props)));
  }
  window.ClaudeControls = Object.freeze({ Provider, AddMenu, SlashDropdown });
})();
