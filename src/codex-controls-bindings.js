(function () {
  'use strict';
  const h=React.createElement;
  const cx=(...values)=>values.flat(Infinity).filter(v=>typeof v==='string'&&v).join(' ');
  const refComponents=new WeakMap();
  const jsx=(type,props,key)=>{if(type?.$$typeof===Symbol.for("react.context")&&type.Provider!==type)type=type.Provider;if(typeof type==='function'&&Object.hasOwn(props||{},'ref')){let component=refComponents.get(type);if(!component){const original=type;component=React.forwardRef((props,ref)=>original({...props,ref}));refComponents.set(type,component)}type=component}const {children,...attrs}=props||{};if(attrs.inert===true)attrs.inert='';if(attrs.inert===false)delete attrs.inert;return h(type,{...attrs,...(key==null?{}:{key})},children)};
  const compiler={c:size=>{const ref=React.useRef(null);if(!ref.current)ref.current=Array(size).fill(Symbol.for('react.memo_cache_sentinel'));return ref.current}};
  const translations={
    'Select model':'选择模型','Default':'默认','Recommended set of models':'推荐的模型组合',
    'Ask for approval':'请求批准','Full access':'完全访问',
    'Always ask to edit external files and use the internet':'编辑外部文件和使用互联网之前始终询问',
    'Unrestricted access to the internet and any file on your computer':'不受限制地访问互联网和此电脑上的任何文件',
    'Use Left and Right arrow keys to adjust power':'使用左右方向键调整推理强度',
    'Power':'推理强度','Reset to default':'恢复默认','Light':'低','Medium':'中','High':'高','Extra High':'超高','Max':'最高','Ultra':'极高',
  };
  function formatMessage({id,defaultMessage='',values={}}){let text=window.CodexControlsMessages?.[id]||translations[defaultMessage]||defaultMessage;for(const [k,v]of Object.entries(values))text=text.replaceAll('{'+k+'}',String(v));return text;}
  const Message=props=>formatMessage(props);
  const intl={formatMessage};
  function Glyph({name,className,...attrs}){const asset=name==='file'?'attachment':name;if(window.CodexSourceIcons?.has(asset))return h(window.CodexSourceIcons.Icon,{...attrs,name:asset,size:16,className});return h('span',{...attrs,className:cx('cx-control-glyph',className)},h(window.CodexSidebarView.Glyph,{name,size:16}));}
  const Check=p=>h(Glyph,{...p,name:'check'}),Chevron=p=>h(Glyph,{...p,name:'down'}),Lock=p=>h(Glyph,{...p,name:'shield'});
  const MenuContext=React.createContext(null);
  const PopupSlot=React.forwardRef(function PopupSlot({align,sideOffset,collisionPadding,onOpenAutoFocus,onInteractOutside,onCloseAutoFocus,onKeyDownCapture,...props},ref){return h('div',{...props,ref,onKeyDownCapture})});
  function ItemSlot({children,asChild,disabled,onClick,onSelect,...attrs}){
    const menu=React.useContext(MenuContext);
    const activate=event=>{if(disabled)return;onClick?.(event);if(event.defaultPrevented)return;onSelect?.(event);if(!event.defaultPrevented)menu?.close();};
    const child=asChild&&React.isValidElement(children)?children:h('div',null,children);
    return React.cloneElement(child,{...attrs,role:attrs.role||'menuitem',tabIndex:disabled?-1:0,'data-disabled':disabled?'':undefined,
      className:cx(child.props.className,attrs.className),onClick:activate,
      onPointerMove:event=>{if(menu&&event.pointerType==='mouse'&&!disabled)event.currentTarget.focus({preventScroll:true});attrs.onPointerMove?.(event);},
      onKeyDown:event=>{attrs.onKeyDown?.(event);if(!event.defaultPrevented&&(event.key==='Enter'||event.key===' ')){event.preventDefault();activate(event);}}
    });
  }
  // Only the headless pointer/keyboard service is adapted. Geometry, track,
  // range, stop and thumb classes/DOM come from CHr in the installed source.
  function PowerSlider({options,selectedOptionId,onSelectOption,onCommitOption,disabled,active,classes:C}){
    const root=React.useRef(null),drag=React.useRef(null);
    const index=Math.max(0,options.findIndex(o=>o.id===selectedOptionId));
    const [preview,setPreview]=React.useState(null),n=preview??index,max=Math.max(1,options.length-1),percent=n/max*100;
    const choose=event=>{const rect=root.current.getBoundingClientRect();return Math.max(0,Math.min(options.length-1,Math.round((event.clientX-rect.left)/rect.width*max)))};
    function finish(event,cancel=false){if(drag.current===null)return;const i=cancel?index:choose(event);drag.current=null;setPreview(null);if(!cancel){onSelectOption?.(options[i]);onCommitOption?.(options[i],options[index]);}}
    return h('div',{className:C.Container,'data-model-picker-power-slider':''},h('div',{
      ref:root,className:C.Root,dir:'ltr','data-reduced-motion':true,'data-dragging':drag.current!==null,
      role:'slider',tabIndex:disabled?-1:0,
      onKeyDown:event=>{
        if(disabled||!active||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
        event.preventDefault();event.stopPropagation();
        const next=event.key==='Home'?0:event.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,index+(['ArrowLeft','ArrowDown'].includes(event.key)?-1:1)));
        if(next!==index){onSelectOption?.(options[next]);onCommitOption?.(options[next],options[index]);}
      },'aria-label':'推理强度','aria-valuemin':0,'aria-valuemax':options.length-1,'aria-valuenow':n,'aria-valuetext':options[n]?.label,'aria-disabled':!!disabled,
      onPointerDown:event=>{if(disabled||event.button!==0)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);drag.current=index;setPreview(choose(event));},
      onPointerMove:event=>{if(drag.current!==null)setPreview(choose(event));},onPointerUp:event=>finish(event),onPointerCancel:event=>finish(event,true),
    },h('div',{className:C.Track},h('div',{className:C.Range,style:{width:percent+'%'}}),h('div',{className:C.TickRail},options.map((o,i)=>h('span',{key:o.id,className:C.Tick,'data-selected':i<=n,style:{left:i/max*100+'%'}})))),
      h('div',{'aria-hidden':true,className:C.VisualThumbRail},h('span',{className:C.ThumbScale,style:{left:percent+'%'}},h('span',{className:C.ThumbSpring},h('span',{className:C.Thumb})))),
      h('input',{className:C.ThumbInput,type:'range',min:0,max:options.length-1,step:1,value:n,disabled:disabled||!active,tabIndex:-1,'aria-label':'推理强度',
        onChange:event=>{const i=Number(event.target.value);onSelectOption?.(options[i]);onCommitOption?.(options[i],options[index]);}})
    ));
  }
  const effortMessages=Object.fromEntries(['none','minimal','low','medium','high','xhigh','max','ultra','persistent'].map(value=>[value,{id:'composer.mode.local.reasoning.'+value+(value==='low'?'.label.v2':'.label'),defaultMessage:({low:'Light',medium:'Medium',high:'High',xhigh:'Extra High',max:'Max',ultra:'Ultra'})[value]||value}]));
  function useDark(){
    const [dark,setDark]=React.useState(()=>document.documentElement.dataset.theme==='dark');
    React.useEffect(()=>{const observer=new MutationObserver(()=>setDark(document.documentElement.dataset.theme==='dark'));observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});return()=>observer.disconnect()},[]);
    return dark;
  }
  function CodeTooltip({content,children}){return React.isValidElement(children)?React.cloneElement(children,{title:typeof content==='string'?content:children.props['aria-label']}):children;}
  window.CodexControlBindings=Object.freeze({useDark,CodeTooltip,jsx:{jsx,jsxs:jsx,Fragment:React.Fragment},compiler,cx,Message,intl,ItemSlot,MenuContext,PopupSlot,PowerSlider,effortMessages,
    Check,Chevron,Lock,Asset:({children})=>children||null,ModelLabel:({displayName,model})=>displayName||model});
})();
