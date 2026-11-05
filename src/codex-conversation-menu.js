(function(){
  'use strict';
  const h=React.createElement;
  function Menu(props){
    const N=window.CodexNavigationSource,S=window.SidebarConversationHooks.useConversations(props);
    const [search,setSearch]=React.useState(false);
    const Icon=window.CodexSourceIcons.Icon;
    return h('nav',{className:'codex-conversation-popup','data-codex-navigation-source':'','data-conversation-menu':'codex','aria-label':'Codex 会话',onKeyDown:props.onKeyDown},
      h('div',{className:'codex-conversation-actions'},
        h(N.Project,{label:'新对话',icon:h(Icon,{name:'plus',size:20}),onPress:props.canNew?props.onNew:undefined,isDisabled:!props.canNew}),
        h(N.Project,{label:'搜索对话',icon:h(props.Icon,{name:'search',size:16}),onPress:()=>setSearch(v=>!v),'aria-expanded':search}),
        search?h('input',{className:'codex-conversation-query',autoFocus:true,value:props.query,onChange:e=>props.setQuery(e.target.value),placeholder:'搜索项目或对话','aria-label':'搜索 Codex 对话'}):null),
      h('div',{className:'codex-conversation-scroll',ref:props.scrollRef},
        S.groups.map(project=>h('section',{key:project.key,'data-project-path':project.path},
          h(N.Project,{label:project.label,ariaLabel:project.path||project.label,ariaExpanded:!!props.query||!S.collapsed[project.key],
            icon:h(Icon,{name:'folder'}),disclosure:h(Icon,{name:'down',style:{transform:!props.query&&S.collapsed[project.key]?'rotate(-90deg)':undefined}}),
            onPress:()=>S.toggle(project.key)}),
          props.query||!S.collapsed[project.key]?project.entries.map(entry=>h(N.Session,{key:entry.key,title:entry.title,ariaLabel:entry.title,
            variant:'sidebar',indentLevel:1,statusState:{type:'idle'},isActive:entry.kind==='tab'&&entry.item.id===props.activeId,disabled:!!S.opening,
            onClick:()=>S.open(entry),additionalHoverActionCount:entry.kind==='tab'?1:0,
            renderActions:entry.kind==='tab'&&props.tabs.length>1?()=>h('span',{'data-codex-control-surface':'',className:'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'},h(window.CodexControlsSource.Button,{color:'ghost',size:'sm',uniform:true,'aria-label':'关闭 '+entry.title,disabled:entry.item.isStreaming,onClick:event=>{event.stopPropagation();props.onCloseTab(entry.item.id)}},h(props.Icon,{name:'x',size:14}))):undefined,
            dataAttributes:{'data-conversation-id':entry.key,'data-session-provider':'codex',title:entry.title,
              onKeyDown:event=>{if(event.key==='Delete'&&entry.kind==='tab'&&props.tabs.length>1&&!entry.item.isStreaming){event.preventDefault();props.onCloseTab(entry.item.id)}}}
          })):null)),
        S.loading?h('p',{className:'codex-conversation-note',role:'status'},'正在读取近期对话…'):null,
        S.error?h('div',{role:'alert'},h('p',{className:'codex-conversation-note'},S.error),h(N.Project,{label:'重试',onPress:S.retry})):null,
        !S.loading&&!S.error&&!S.count?h('p',{className:'codex-conversation-note'},'没有匹配的对话'):null,
        S.more?h(N.Project,{label:'加载更多',onPress:S.more,isDisabled:S.loading}):null));
  }
  window.CodexConversationMenu=Menu;
})();

