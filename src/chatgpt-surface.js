(function () {
  'use strict';
  const h = React.createElement;
  // Installed Codex 26.1027 composer declarations own the outer DOM/attributes.
  const native=()=>window.CodexControlsSource.Composer;
  function ComposerRoot({children,className='',...events}) {
    const N=native();
    return h(N.Root,{...events,className:'cg-composer '+className.replace(/\bclaudian-input-wrapper\b/g,''),layout:'multiline',density:'comfortable',radiusVariant:'default',surfaceVariant:'default',surfaceOverflow:'visible'},
      h('div',{className:N.classes.ComposerLayoutBody,'data-composer-layout':'multiline','data-composer-body':''},children));
  }
  function ComposerFooter({input,leading,trailing}) {
    const N=native();
    return h(N.Footer,{layout:'multiline',rows:'stacked',spacing:'default',responsive:true},
      h('div',{className:N.classes.AdaptiveFooterInput+' cg-composer-input-slot','data-composer-layout':'multiline'},h(N.Input,{layout:'multiline',spacing:'default'},input)),
      h('div',{className:'cg-composer-leading'},leading),h('div',{className:'cg-composer-trailing'},trailing));
  }

  function Message({ message, heading, children, actions }) {
    const user = message.role === 'user';
    return h('div', {
      className: `cg-message cx-turn cx-turn-${message.role}`,
      'data-role': message.role, 'data-message-id': message.id,
      'data-message-author-role': message.role, 'data-turn': message.role,
      'data-testid': `conversation-turn-${message.id}`,
    }, user
      ? h('div', { className: 'cg-user-message' },
        h('div', { className: '_bubble_nu8ad_1 cg-user-bubble', 'data-user-message-bubble': true }, children),
        h('div', { className: 'turn-action-controls cg-user-actions' }, actions))
      : h('div', { className: 'cg-assistant-message' }, heading,
        h('div', { className: 'cg-assistant-content' }, children),
        h('div', { className: 'turn-action-controls cg-assistant-actions' }, actions)));
  }

  window.ChatGPTSurface = Object.freeze({ ComposerRoot, ComposerFooter, Message });
})();
