(function () {
  'use strict';
  const h = React.createElement;
  const { useState, useEffect, useRef } = React;

  function SettingsPanel({ open, sections, onClose, onReset, Icon, busy }) {
    const [selected, setSelected] = useState('general');
    const [query, setQuery] = useState('');
    const panel = useRef(null);
    const content = useRef(null);
    const previousFocus = useRef(null);
    useEffect(() => {
      if (!open) return;
      previousFocus.current = document.activeElement;
      panel.current?.querySelector('button')?.focus();
      const keydown = event => {
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.key === 'Tab') {
          const nodes = [...panel.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select,textarea,[tabindex="0"]')].filter(node => node.getClientRects().length);
          const first = nodes[0], last = nodes.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      };
      document.addEventListener('keydown', keydown);
      return () => { document.removeEventListener('keydown', keydown); previousFocus.current?.focus?.(); };
    }, [open]);
    useEffect(() => { if (content.current) content.current.scrollTop = 0; }, [selected, query]);
    if (!open) return null;
    const matching = sections.filter(section => `${section.label} ${section.description} ${section.keywords || ''}`.toLowerCase().includes(query.toLowerCase().trim()));
    const section = matching.find(item => item.id === selected) || matching[0];
    return h('section', { className: 'sw-settings-layer', role: 'region', 'aria-label': '设置', ref: panel },
      h('div', { className: 'sw-settings' },
        h('header', { className: 'sw-settings-header' },
          h('button', { type: 'button', className: 'sw-settings-back', onClick: onClose, 'aria-label': '返回对话' }, h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 }, h('path', { d: 'm15 5-7 7 7 7' })), '设置'),
          h('details', { className: 'sw-settings-category' },
            h('summary', null, section?.label || '选择分类', h(Icon, { name: 'chevron-down', size: 12 })),
            h('div', { className: 'sw-settings-category-menu' },
              h('label', { className: 'sw-settings-search' }, h(Icon, { name: 'search', size: 14 }), h('input', { value: query, onChange: event => setQuery(event.target.value), placeholder: '搜索设置分类', 'aria-label': '搜索设置分类' })),
              h('nav', { className: 'sw-settings-nav', 'aria-label': '设置分类' }, matching.map(item => h('button', { type: 'button', key: item.id, 'aria-label':item.label, 'aria-current': item.id === section?.id ? 'page' : undefined,
                onClick: event => { setSelected(item.id); setQuery(''); event.currentTarget.closest('details').open = false; } }, h(Icon, { name: item.icon, size: 15 }), item.label))),
              h('button', { type: 'button', className: 'sw-settings-reset', onClick: onReset }, '恢复默认设置'))),
          h('span', { className: 'sw-settings-autosave' }, '自动保存')),
        h('div', { className: 'sw-settings-scroll', ref: content },
          section ? h(React.Fragment, null, h('div', { className: 'sw-settings-page-title' }, h('h3', null, section.label), h('p', null, section.description)),
            busy ? h('p', { className: 'sw-settings-notice' }, '有会话正在运行，运行配置将在下一次任务开始时应用。') : null,
            h('div', { className: 'sw-settings-fields' }, section.content)) : h('p', { className: 'sw-settings-empty' }, '没有匹配的设置分类'))));

  }

  window.SidebarWorkspace = Object.freeze({ SettingsPanel });
})();
