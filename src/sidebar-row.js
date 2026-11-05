(function(){
  'use strict';
  const h=React.createElement;
  // Native nX owns selection, hover, focus, row height and disabled behavior.
  // The host supplies each row's actual title, icon and local actions.
  function Row({title,icon,trailing,active,disabled,onSelect,indent=0,className='',...props}) {
    let content=h('div',{className:'flex h-full w-full min-w-0 items-center gap-2'},
      icon?h('span',{className:'flex w-4 shrink-0 items-center justify-center','aria-hidden':true},icon):null,
      h('span',{className:'min-w-0 flex-1 truncate text-base leading-5',dir:'auto',title:typeof title==='string'?title:undefined},title),trailing);
    for(let level=0;level<indent;level++)content=h('div',{className:'flex h-full min-w-0 flex-1 ps-4'},content);
    return h(window.CodexNativeSidebarSource.Row,{...props,className:`sidebar-native-row py-row-y px-[var(--padding-row-cell-x,var(--padding-row-x))] ${className}`,isActive:active,isDisabled:disabled,onPress:onSelect,variant:'sidebar'},content);
  }
  window.ChatGPTSidebarUI=Object.freeze({Row});
})();
