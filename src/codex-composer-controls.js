(function(){
  'use strict';
  const h=React.createElement,B=window.CodexControlBindings;
  const NativeButton=React.forwardRef((props,ref)=>B.jsx.jsx(window.CodexControlsSource.Button,{...props,ref}));
  const icon=name=>window.CodexSourceIcons?.has(name==='file'?'attachment':name)?h(window.CodexSourceIcons.Icon,{name:name==='file'?'attachment':name,size:16}):h(window.CodexSidebarView.Glyph,{name,size:16});
  function useDismiss(open,close,anchor,popup){React.useEffect(()=>{if(!open)return;const dismiss=e=>{if(e.type==='keydown'){if(e.key!=='Escape')return;e.preventDefault();e.stopPropagation();close();anchor.current?.focus();}else if(!anchor.current?.contains(e.target)&&!popup.current?.contains(e.target))close();};document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',dismiss,true);return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',dismiss,true)};},[open,close]);}
  function Popup({open,onOpenChange,trigger,children,kind,model=false}){
    const anchor=React.useRef(null),popup=React.useRef(null),[position,setPosition]=React.useState(null);
    const close=React.useCallback(()=>onOpenChange(false),[onOpenChange]);
    useDismiss(open,close,anchor,popup);
    React.useLayoutEffect(()=>{
      if(!open)return;
      const place=()=>{
        const r=anchor.current?.getBoundingClientRect();if(!r)return;
        // VGr centers the native model panel on its trigger. Measure the actual
        // source CSS width rather than assuming a generic menu width.
        const width=popup.current?.getBoundingClientRect().width||0;
        const next={
          '--radix-dropdown-menu-content-available-height':Math.max(0,r.top-10)+'px',
          '--radix-dropdown-menu-content-available-width':innerWidth-12+'px',
          left:Math.max(6,Math.min(innerWidth-width-6,model?(r.left+r.right-width)/2:r.left)),
          bottom:innerHeight-r.top+4,
        };
        setPosition(previous=>previous&&Object.keys(next).every(key=>previous[key]===next[key])?previous:next);
      };
      place();const observer=new ResizeObserver(place);
      // The portal mounts after the initial placement; defer observing it by a
      // frame so both simple and advanced native layouts stay within bounds.
      const frame=requestAnimationFrame(()=>{if(popup.current)observer.observe(popup.current);place()});
      observer.observe(anchor.current);window.addEventListener('resize',place);
      return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',place)};
    },[open,model]);
    React.useEffect(()=>{if(open&&position)popup.current?.focus({preventScroll:true});},[open,position]);
    const keydown=event=>{if(event.defaultPrevented||event.target.closest('[role=slider]'))return;if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;const items=[...popup.current.querySelectorAll('[role^=menuitem]:not([data-disabled])')].filter(n=>!n.closest('[inert],[aria-hidden=true]'));if(!items.length)return;event.preventDefault();const current=items.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?items.length-1:(current+(event.key==='ArrowUp'?-1:1)+items.length)%items.length;items[next].focus({preventScroll:true});};
    return h(React.Fragment,null,React.cloneElement(trigger,{ref:anchor,'aria-haspopup':'menu','aria-expanded':open,onClick:()=>onOpenChange(!open)}),open&&position?ReactDOM.createPortal(h(B.MenuContext.Provider,{value:{close}},B.jsx.jsx(window.CodexControlsSource.Popup,{ref:popup,variant:'default',tabIndex:-1,role:'menu','data-codex-control-surface':'','data-control-menu':kind,'data-side':'top',className:B.cx('cg-request-host codex-source-popup',model&&window.CodexControlsSource.maps.u5.ModelPickerDropdownContent,model&&'overflow-x-hidden overflow-y-hidden'),style:{...position,...(model?{backgroundColor:'var(--model-picker-background, color-mix(in oklab, var(--color-surface-elevated-secondary) 90%, transparent))'}:{})},onKeyDown:keydown,children})),document.body):null);
  }
  function ModelControl(props){
    const N=window.CodexControlsSource,[open,setOpen]=React.useState(false),[view,setView]=React.useState('simple'),[minimumWidth,setMinimumWidth]=React.useState(null);
    const selected=props.models.find(m=>m.selected),label=selected?.label||props.currentModel;
    const powers=props.efforts.map((e,i)=>({id:e.value,model:props.currentModel,modelLabel:label,reasoningEffort:e.value,powerSettingIndex:i,isLocked:false,labels:{model:label,effort:B.intl.formatMessage(B.effortMessages[e.value]||{defaultMessage:e.label})}}));
    const power=powers.find(p=>p.id===props.effort)||powers[0];
    const trigger=h(NativeButton,{type:'button',size:'composerAuxiliary',color:'ghost',className:'codex-source-model','aria-label':'选择模型和推理强度','data-composer-navigation-target':'reasoning',style:open&&minimumWidth?{minWidth:minimumWidth}:undefined},h('span',{className:'cx-model-name'},open&&view==='simple'?h(B.Message,{defaultMessage:'Select model'}):label),open&&view==='simple'?null:h('span',{className:'cx-effort-label'},power?.labels.effort),icon('down'));
    const pick=p=>props.onEffort(p.reasoningEffort);
    return h(Popup,{open,onOpenChange:value=>{setMinimumWidth(value?document.querySelector('.codex-source-model')?.getBoundingClientRect().width:null);setOpen(value);if(value)Promise.resolve(props.onLoadModels?.()).catch(error=>console.error(error.message));},trigger,model:true,kind:'model'},h(N.ModelMenu,{
      active:open,menuView:powers.length<2?'advanced':view,onToggleMenuView:setView,isExplicitModelSelection:true,stackLabels:false,fallbackModelLabel:label,
      modelListConfig:{showHeading:true,options:props.models.map(m=>({id:m.value,label:m.label,subText:['Native CLI configured model','Native Codex CLI model','Custom sidebar model','Available runtime model'].includes(m.description)?undefined:m.description,selected:m.selected,onSelect:()=>props.onModel(m.value)}))},
      modelSelectionDisabled:false,powerSelectionDisabled:!powers.length,powerSelections:powers,selectedPowerSelection:power,serviceTierOptions:[],serviceTierOptionsLoading:false,
      onSelectPower:pick,onCommitPower:()=>{},onConfirmCurrentSelection:()=>setOpen(false),onSelectComplete:()=>setOpen(false),shouldReduceMotion:false,
    }));
  }
  function PermissionControl({permissionMode,onPermissionMode}){
    const N=window.CodexControlsSource,P=window.CodexPermissionSource,[open,setOpen]=React.useState(false);
    // Collaboration/plan mode is a separate CLI setting, never an access preset.
    const selected=permissionMode==='yolo'?'full-access':'auto',selections=['auto','full-access'];
    const choice=value=>({kind:'agent-mode',agentMode:value});
    return h(Popup,{open,onOpenChange:setOpen,kind:'permissions',trigger:h(NativeButton,{type:'button',size:'composerAuxiliary',color:selected==='full-access'?'warning':'ghost',className:'codex-source-permissions','aria-label':'更改权限','data-composer-navigation-target':'permissions','data-full-access':selected==='full-access'},h(selected==='full-access'?window.CodexPermissionIcons.FullAccess:window.CodexPermissionIcons.Manual,{className:'icon-xs shrink-0'}),h(P.Label,{permissionSelection:choice(selected),variant:'trigger'}))},
      h(N.Title,{wrap:true},h(B.Message,{id:'composer.permissionsDropdown.title.chatgptDesktop',defaultMessage:'How should ChatGPT actions be approved?'})),selections.map(value=>h(P.Option,{key:value,selection:{permissionSelection:choice(value)},selectedPermissionSelection:choice(selected),selectPermission:selection=>onPermissionMode(selection.agentMode==='full-access'?'yolo':'normal')})));

  }
  function AddControl({onAddContext,extra}) {
    const N=window.CodexControlsSource;
    const [open,setOpen]=React.useState(false);
    const input=React.useRef(null);
    const files=h('input',{ref:input,type:'file',multiple:true,hidden:true,onChange:event=>{
      onAddContext({files:Array.from(event.currentTarget.files||[])});
      event.currentTarget.value='';
    }});
    const trigger=h(NativeButton,{type:'button',size:'composerAuxiliary',color:'ghost',uniform:true,className:'codex-source-add','aria-label':'添加文件与上下文'},icon('plus'));
    return h(React.Fragment,null,files,h(Popup,{open,onOpenChange:setOpen,kind:'add',trigger},
      h(N.Item,{leftIcon:icon('file'),onSelect:()=>input.current?.click()},'添加文件'),
      h(N.Item,{leftIcon:icon('folder'),onSelect:()=>onAddContext('directory')},'添加文件夹上下文'),
      null));
  }

  function Controls(props){return h('div',{className:'cx-composer-controls cg-controls-'+props.slot,'data-codex-control-surface':''},props.slot!=='trailing'?h(React.Fragment,null,h(AddControl,props),h(PermissionControl,props)):h(ModelControl,props));}
  function SlashDropdown({visible,items,query='',selectedIndex,onHover,onPick,emptyLabel,variant}) {
    const N=window.CodexControlsSource.Suggestion,root=React.useRef(null);
    const [height,setHeight]=React.useState(0);
    React.useLayoutEffect(()=>{
      if(!visible)return;
      const update=()=>{const node=root.current;if(node)setHeight(Math.max(0,node.getBoundingClientRect().bottom-8));};
      update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);
    },[visible]);
    React.useLayoutEffect(()=>{
      if(visible)root.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'});
    },[visible,selectedIndex]);
    if(!visible)return null;
    return B.jsx.jsx(N.Surface,{ref:root,'data-codex-control-surface':'','data-codex-slash-menu':'',
      className:'cg-request-host codex-source-slash',style:height?{'--composer-overlay-available-height':height+'px',maxHeight:height+'px'}:undefined,
      children:h(N.List,{role:'listbox',children:items.length?items.map((item,i)=>h(N.Row,{
        key:item.name||i,role:'option','aria-selected':i===selectedIndex,highlighted:i===selectedIndex,
        onMouseEnter:()=>onHover(i),onMouseDown:N.preventMouseFocus,onClick:()=>onPick(item),
      },h(N.Content,{query,item:{
        title:(variant==='skill'?String.fromCharCode(36):'/')+String(item.name||'').replace(/^[$/]/,''),
        description:item.desc,leftAccessory:icon('terminal'),secondaryContent:item.argumentHint||undefined,
      }}))):h(window.CodexControlsSource.Title,null,emptyLabel)})});
  }

  window.CodexComposerControls=Object.freeze({Controls,SlashDropdown,Popup});
})();
