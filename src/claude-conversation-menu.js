(function(){
  'use strict';
  const h=React.createElement;
  // Data belongs to the CLI. Row, group heading, typography and density belong
  // to the installed Claude dframe components, never to the Codex tree.
  function Menu(props){
    const N=window.ClaudeNavigationSource;
    const intl=window.ClaudeNativeSource.useIntl();
    const mode=document.documentElement.dataset.theme||'light';
    const store=React.useMemo(()=>({getSnapshot:()=>document.documentElement.dataset.theme||'light',getServerSnapshot:()=> 'light',subscribe:notify=>{const o=new MutationObserver(notify);o.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});return()=>o.disconnect()}}),[]);
    return h('div',{'data-claude-controls-source':'','data-theme':'claude','data-mode':mode,className:'claude-conversation-popup cds-root epitaxy-root dframe-root '+mode,'data-conversation-menu':'claude'},
      h(N.IntlContext.Provider,{value:intl},h(N.ModeContext.Provider,{value:store},h(N.PortalContext.Provider,{value:null},h(Tree,props)))));
  }
  function Tree(props){
    const N=window.ClaudeNavigationSource,S=window.SidebarConversationHooks.useConversations(props);
    const [search,setSearch]=React.useState(false);
    return h('nav',{className:'dframe-sidebar font-normal font-control','data-variant':'desktop','data-density':'comfortable','data-code-list':'','aria-label':'Claude Code 会话',onKeyDown:props.onKeyDown},
      h('div',{className:'dframe-sidebar-body flex flex-col flex-1 min-h-0 gap-2 px-2 pt-3 pb-1.5 [overflow:clip]'},
        h('div',{className:'claude-conversation-actions'},
          h(N.Row,{variant:'nav',icon:h(N.Icon,{name:'Create',customSize:20}),onClick:props.canNew?props.onNew:undefined,'aria-disabled':!props.canNew},'新会话'),
          h(N.Row,{variant:'nav',icon:h(N.Icon,{name:'Search',customSize:20}),onClick:()=>setSearch(v=>!v),'aria-expanded':search},'搜索会话'),
          search?h('input',{className:'claude-conversation-query',autoFocus:true,value:props.query,onChange:e=>props.setQuery(e.target.value),placeholder:'搜索项目或会话','aria-label':'搜索 Claude 会话'}):null),
        h('div',{className:'claude-conversation-scroll',ref:props.scrollRef},
          S.groups.map(project=>h('section',{key:project.key,'data-project-path':project.path,className:'group/section df-session-list relative isolate flex flex-col gap-px rounded-lg'},
            h(N.GroupHeading,{collapsed:!props.query&&!!S.collapsed[project.key],onToggle:()=>S.toggle(project.key)},project.label),
            props.query||!S.collapsed[project.key]?project.entries.map(entry=>h(N.Row,{key:entry.key,variant:'session',icon:null,selected:entry.kind==='tab'&&entry.item.id===props.activeId,
              'data-conversation-id':entry.key,'data-session-provider':'claude','aria-label':entry.title,
              onClick:()=>!S.opening&&S.open(entry),title:entry.title,
              trailingAction:entry.kind==='tab'&&props.tabs.length>1?h(N.Button,{variant:'ghost',size:'sm','aria-label':'关闭 '+entry.title,disabled:entry.item.isStreaming,onClick:event=>{event.stopPropagation();props.onCloseTab(entry.item.id)}},h(N.Icon,{name:'X',customSize:16})):undefined,
              onKeyDown:event=>{if(event.key==='Delete'&&entry.kind==='tab'&&props.tabs.length>1&&!entry.item.isStreaming){event.preventDefault();props.onCloseTab(entry.item.id)}},
            },entry.title)):null)),
          !S.count?h('p',{className:'claude-conversation-note'},'没有匹配的会话'):null,
          S.error?h('p',{role:'alert',className:'claude-conversation-note'},S.error):null)));
  }
  window.ClaudeConversationMenu=function(props){const [ready,setReady]=React.useState(!!window.ClaudeNavigationSource);React.useEffect(()=>{const loaded=()=>setReady(true);window.addEventListener("claude-navigation-ready",loaded);if(window.ClaudeNavigationSource)loaded();return()=>window.removeEventListener("claude-navigation-ready",loaded)},[]);return ready?h(window.ClaudeSidebarUI.Ready,null,()=>h(Menu,props)):null};
})();



