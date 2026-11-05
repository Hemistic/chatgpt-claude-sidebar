(function(){
  'use strict';
  // The installed Claude transcript uses measured data-perf-row boundaries and
  // content-visibility / contain-intrinsic-size (c4ea84cb3-CizlIWl6.js and
  // c3fde7009-C7SoV__i.js). Bind that strategy to this host's message lifecycle.
  // All measurements come from real rows; no synthetic height is assumed.
  const observer=typeof ResizeObserver==='function'?new (window.SidebarLayoutObserver || ResizeObserver)(entries=>{
    const updates=[];
    for(const {target,contentRect}of entries){
      if(contentRect.height>0&&Math.abs(Number(target.dataset.measuredHeight||0)-contentRect.height)>.5)
        updates.push([target,contentRect.height]);
    }
    for(const [node,height]of updates){
      node.dataset.measuredHeight=String(height);
      node.style.containIntrinsicSize=`auto ${height}px`;
      node.style.contentVisibility='auto';
    }
  }):null;
  function MeasuredTurn({children}){
    const ref=React.useRef(null);
    React.useEffect(()=>{const node=ref.current;if(!node||!observer)return;observer.observe(node);return()=>observer.unobserve(node);},[]);
    return React.createElement('div',{ref,'data-perf-row':'',className:'claude-turn-viewport',style:{minWidth:0}},children);
  }
  window.ClaudeDeferredTurns=Object.freeze({MeasuredTurn});
})();
