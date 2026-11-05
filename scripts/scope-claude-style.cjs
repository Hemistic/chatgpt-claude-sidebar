'use strict';
const postcss=require('postcss');
// Preserve declarations and native media/container conditions. Chromium 132's
// nested CSS @scope matcher stalls during width changes in long transcripts.
// Provider-exclusive stylesheets permit an equivalent ordinary selector root.
function scope(css){
  const tree=postcss.parse(css);
  tree.walkAtRules('scope',rule=>{if(rule.params==='([data-claude-native])')rule.replaceWith(...rule.nodes)});
  tree.walkRules(rule=>{rule.selector=rule.selector.replace(/:scope\b/g,':where([data-claude-native])')});
  return tree.toString();
}
module.exports={scope};
if(require.main===module){const fs=require('fs'),path=require('path'),file=path.join(__dirname,'../src/claude-ui.source.css');fs.writeFileSync(file,scope(fs.readFileSync(file,'utf8')));}
