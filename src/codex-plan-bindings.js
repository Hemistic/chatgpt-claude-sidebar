(function () {
  'use strict';
  const h = React.createElement;
  const Context = React.createContext(null);
  const translations = {
    'Plan': 'Plan', 'Writing plan': '正在编写方案', 'Download plan': '下载方案',
    'Expand plan summary': '展开方案', 'Collapse plan summary': '折叠方案',
    'Expand': '展开', 'Collapse': '折叠', 'Expand plan': '展开方案',
    'Implement this plan?': '是否实施此计划？', 'Yes, implement this plan': '是，实施此计划',
  };
  const intl = { formatMessage: message => translations[message.defaultMessage] || message.defaultMessage };
  function Icon({ name, ...props }) { return h(window.CodexSidebarView.Glyph, { name, size: 14, ...props }); }
  function Button(props) { return h(window.CodexNativeApprovalSource.Button, props); }
  function CopyButton({ onCopy }) {
    return h(Button, { size: 'icon', color: 'ghost', 'aria-label': '复制方案', onClick: onCopy }, h(Icon, { name: 'copy' }));
  }
  function MotionDiv({ animate, initial, transition, inert, children, ...props }) {
    const style = { ...props.style, ...animate };
    delete style.transitionEnd;
    const [finished,setFinished]=React.useState(false);
    React.useEffect(()=>{setFinished(false);const timer=setTimeout(()=>setFinished(true),(transition?.duration || 0)*1000);return()=>clearTimeout(timer);},[animate?.height,transition?.duration]);
    const duration=(transition?.duration || 0)*1000;
    const ease=transition?.ease ? `cubic-bezier(${transition.ease.join(',')})` : 'linear';
    style.interpolateSize='allow-keywords';
    style.transition=`height ${duration}ms ${ease}, max-height ${duration}ms ${ease}, opacity ${duration}ms ${ease}`;
    if (animate?.height === 'auto') style.overflow = finished ? 'visible' : 'hidden';
    return h('div', { ...props, inert: inert ? '' : undefined, style }, children);
  }
  function Markdown({ markdown }) {
    const context = React.useContext(Context);
    return h('div', { className: 'px-4 py-3 cg-plan-content' }, context.renderMarkdown(markdown));
  }
  // Gr's question surface uses the same work-style request panel as ordinary CLI
  // questions. Only its answer shape is translated here, without granting access.
  function ImplementationQuestion({ questionAndOptions, onSubmit, onEscapeDismiss }) {
    const context = React.useContext(Context);
    const questions = questionAndOptions.map((question,index) => ({
      id: String(index), question: question.question, isOther: question.isOther,
      options: question.options.map(option=>({value:option.id,label:option.value})),
    }));
    return h('div', { className: 'cg-plan-implementation' }, h(window.CodexQuestionUI.Question, {
      block: { ...context.block, questions, freeformPlaceholder: '在此输入' },
      onAnswer: (_id, answers) => {
        if (!answers) return onEscapeDismiss();
        const value=answers['0'];
        onSubmit([{selectedOptionId:value==='implement-plan'?value:null,freeformText:value==='implement-plan'?null:value}]);
      },
    }));
  }
  function Card({ block, renderMarkdown, conversationId }) {
    return h(Context.Provider, { value: { renderMarkdown } },
      h('div', { 'data-codex-request-surface': true, 'data-plan-id': block.id, className: 'cg-request-host cg-plan-card' },
        h(window.CodexNativePlanSource.Card, { item: {content:block.plan || '',completed:true}, conversationId:conversationId || block.id, showOpenButton:false, defaultCollapsed:true })));
  }
  function Implementation({ block, onDecision }) {
    const store = {
      get: () => null,
      removePlanImplementationRequest() {},
      updateThreadSettingsForNextTurn: () => Promise.resolve(onDecision(block.id,{type:'cancel'})),
    };
    return h(Context.Provider, {value:{block,store}}, h(window.CodexNativePlanSource.Implementation, {
      conversationId:block.id,hostId:'standalone',pendingRequest:{turnId:block.id,planContent:block.plan},
      onSubmitLocalFollowup:(text,kind)=>onDecision(block.id,kind==='plan_implementation'?{type:'implement'}:{type:'revise',text}),
    }));
  }
  window.CodexPlanBindings=Object.freeze({Context,intl,Icon,Button,CopyButton,MotionDiv,Markdown,ImplementationQuestion});
  window.CodexPlanUI=Object.freeze({Card,Implementation});
})();
