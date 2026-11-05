const fs = require("fs"),
  path = require("path"),
  acorn = require("acorn"),
  scope = require("eslint-scope");
const root =
  "C:/Program Files/WindowsApps/Claude_2.9939.2.0_x64__pzs8sxrjxfjjc/app/resources/ion-dist/assets/v1";
const repo = path.resolve(__dirname, ".."),
  crypto = require("crypto"),
  postcss = require("postcss");
const modules = new Map(),
  selected = new Map(),
  external = new Map();
const initializers = new Map();
// These are application-service boundaries, not replacement UI components.
// The standalone profile owns storage; Claude's telemetry/context is not run.
const serviceBindings = new Map([
  ['shared-0-cChjMa9y.js#sT', '(error)=>console.error(error)'],
  ['shared-0-cChjMa9y.js#U', '()=>{}'],
  ['shared-2-R5nemkvN.js#Cf', 'localStorage'],
  ['shared-1-1bM18u9E.js#Ar', '(_context,action)=>action()'],
]);
function names(pattern, out = []) {
  if (!pattern) return out;
  if (pattern.type === "Identifier") out.push(pattern.name);
  else if (pattern.type === "ObjectPattern")
    pattern.properties.forEach((p) => names(p.value || p.argument, out));
  else if (pattern.type === "ArrayPattern")
    pattern.elements.forEach((p) => names(p, out));
  else if (pattern.type === "AssignmentPattern") names(pattern.left, out);
  return out;
}
function mod(file) {
  if (modules.has(file)) return modules.get(file);
  const source = fs.readFileSync(path.join(root, file), "utf8"),
    ast = acorn.parse(source, {
      ecmaVersion: "latest",
      sourceType: "module",
      ranges: true,
    }),
    decl = new Map(),
    imports = new Map(),
    exports = new Map();
  for (const n of ast.body) {
    if (n.type === "FunctionDeclaration" || n.type === "ClassDeclaration")
      decl.set(n.id.name, {
        key: n.id.name,
        start: n.start,
        text: source.slice(n.start, n.end),
      });
    else if (n.type === "VariableDeclaration")
      for (const d of n.declarations) {
        const text = source.slice(d.start, d.end),
          bound = names(d.id);
        for (const name of bound)
          decl.set(name, {
            key: bound.join(","),
            start: d.start,
            text: `var ${text};`,
            expression: source.slice(d.init?.start || 0, d.init?.end || 0),
          });
      }
    else if (n.type === "ImportDeclaration")
      for (const s of n.specifiers)
        imports.set(s.local.name, {
          file: n.source.value.slice(2),
          name: s.imported?.name || "default",
        });
    else if (n.type === "ExportNamedDeclaration")
      for (const s of n.specifiers || [])
        exports.set(s.exported.name, s.local.name);
  }
  const result = { source, ast, decl, imports, exports };
  modules.set(file, result);
  return result;
}
const framework = new Map();
for (const [name, d] of mod("vendor-frame-ChB4QRwu.js").decl) {
  const match = d.expression?.match(/^(?:o|cr)\.(\w+)$/);
  if (match) framework.set(name, match[1] === 'use' ? 'nativeUse' : `React.${match[1]}`);
}
for (const n of ["a", "o", "s", "cr"]) framework.set(n, "React");
framework.set("i", "(()=>React)");
framework.set("pe", "jsxRuntime");
framework.set("G", "jsxRuntime.jsx");
framework.set("he", "jsxRuntime.jsxs");
framework.set("me", "React.Fragment");
framework.set("ie", "React.version");
framework.set("se", "(()=>ReactDOM)");
function free(text) {
  const tree = acorn.parse(text, {
    ecmaVersion: "latest",
    sourceType: "module",
    ranges: true,
  });
  return [
    ...new Set(
      scope
        .analyze(tree, {
          ecmaVersion: 2024,
          sourceType: "module",
          ignoreEval: true,
        })
        .globalScope.through.map((r) => r.identifier.name),
    ),
  ];
}
function select(file, name) {
  const m = mod(file);
  if (file === "vendor-frame-ChB4QRwu.js" && framework.has(name)) {
    external.set(file + "#" + name, framework.get(name));
    return;
  }
  const id = file + "#" + name;
  if (selected.has(id) || external.has(id)) return;
  if (serviceBindings.has(id)) {
    external.set(id, serviceBindings.get(id));
    return;
  }
  // Resolve the original lazy effort control locally; its JSX and hooks stay
  // unchanged, without importing the original application's Vite loader.
  if (id === "shared-15-KGWycdaF.js#cw") {
    select("c8e04f916-B4R0hSk7.js", "w");
    external.set(id, "IMPORT:c8e04f916-B4R0hSk7.js#w");
    return;
  }
  if (
    [
      "shared-1-1bM18u9E.js",
      "shared-2-R5nemkvN.js",
      "shared-3-x8sDb0ru.js",
      "shared-5-BQFU70E0.js",
      "vendor-query-DGWa9KPo.js",
      "vendor-growthbook-CDjm4m_O.js",
      "vendor-datadog-BKCGNWoC.js",
    ].includes(file) ||
    (file === "shared-0-cChjMa9y.js" && !["Zo", "JF", "HF", "Ce", "xe", "_", "m", "p"].includes(name))
  ) {
    external.set(id, "HOST");
    return;
  }
  const d = m.decl.get(name);
  if (!d) {
    const i = m.imports.get(name);
    if (i) {
      select(i.file, mod(i.file).exports.get(i.name) || i.name);
      external.set(
        id,
        "IMPORT:" + i.file + "#" + (mod(i.file).exports.get(i.name) || i.name),
      );
      return;
    }
    external.set(id, "GLOBAL");
    return;
  }
  selected.set(id, d);
  if (selected.size > 5000) throw Error("Graph too large");
  for (const dep of free(d.text))
    if (
      ![
        "window",
        "document",
        "navigator",
        "console",
        "Object",
        "Symbol",
        "String",
        "Boolean",
        "Number",
        "Math",
        "Map",
        "Set",
        "WeakMap",
        "WeakSet",
        "Array",
        "Promise",
        "JSON",
        "Date",
        "Error",
        "TypeError",
        "RegExp",
        "Intl",
        "Node",
        "HTMLElement",
        "Element",
        "HTMLInputElement",
        "HTMLTextAreaElement",
        "MutationObserver",
        "ResizeObserver",
        "IntersectionObserver",
        "AbortController",
        "URL",
        "URLSearchParams",
        "queueMicrotask",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "performance",
        "getComputedStyle",
        "parseFloat",
        "parseInt",
        "isNaN",
        "undefined",
        "globalThis",
        "CSS",
        "CustomEvent",
        "InputEvent",
        "PointerEvent",
        "MouseEvent",
        "KeyboardEvent",
        "Event",
        "Text",
        "Range",
        "NodeFilter",
        "Document",
        "DocumentFragment",
        "ShadowRoot",
        "SVGElement",
        "Selection",
        "EventTarget",
        "DOMRect",
        "HTMLButtonElement",
        "HTMLAnchorElement",
        "HTMLSelectElement",
        "HTMLAreaElement",
        "VisualViewport",
        "HTMLDocument",
        "crypto",
        "Float32Array",
        "Int32Array",
        "Uint32Array",
        "WeakRef",
        "FinalizationRegistry",
        "structuredClone",
        "atob",
        "btoa",
        "localStorage",
        "sessionStorage",
        "matchMedia",
      ].includes(dep)
    )
      select(file, dep);
}
for (const [file, names] of [
  ["shared-10-DyE9O65j.js", ["ow", "MC", "RC", "NC"]],
  ["c71ec5fd2-CdLCGwFp.js", ["T"]],
  ["shared-12-BqJE4_W4.js", ["Bh", "ah", "ml", "qm", "om", "rh", "ih", "sh"]],
  ["shared-frame-BgE9BXIr.js", ["fc", "my", "Gi"]],
  ["c05970c42-Cb32PFgB.js", ["G", "yt"]],
  ["shared-13-Cc4_02Tf.js", ["sh"]],
  ["cf6ae6197-H7y9eJvd.js", ["kc", "jc", "ac"]],
  ["shared-16-C5v0iJbn.js", ["Dp"]],
  ["vendor-intl-DWSFqcxC.js", ["qt", "J", "Wt"]],
  ["shared-17-DnxarKHW.js", ["Rb", "bc"]],
  ["shared-15-KGWycdaF.js", ["St", "ct", "$e", "et", "gc", "ot", "bt", "Ew", "sO", "CO"]],
  [
    "c099c328d-B_i6zFP6.js",
    [
      "Dp",
      "uf",
      "Gp",
      "wr",
      "Er",
      "_p",
      "Bo",
      "Vo",
      "vp",
      "Sp",
      "xp",
      "tn",
      "un",
      "Cr",
      "Lp",
    ],
  ],
  ["cc70f2bdf-CvtDMb7_.js", ["ml", "at", "rt", "pl", "he"]],
  ["c360a9e1c-BOKY-coh.js", ["rd"]],
  ["c19e90103-CSnstyow.js", ["qf", "uf", "Uf", "Bf", "Hf", "hd", "Vf", "zf", "gd", "Ua", "qa", "Gf", "bf", "je", "Of", "ui", "pf", "mf"]],
  [
    "c1c1ec7b9-BpMPRL5q.js",
    [
      "Ck",
      "sk",
      "YF",
      "GF",
      "qF",
      "xk",
      "sa",
      "yo",
      "vk",
      "bk",
      "Ei",
      "X_",
      "Xk",
      "Yk",
      "$u",
      "xb",
      "sd",
    ],
  ],
])
  for (const name of names) select(file, name);
// The original theme module registers its two Claude themes as a side effect.
// A declaration-only graph would omit this essential native initialization.
for (const [file, matches] of [
  ['c5d464fa3-BUTu9XNs.js', (node, source) => node.type === 'ExpressionStatement' && source.startsWith('f(m,')],
  ['c64baa838-DowwSLKF.js', (node, source) => node.type === 'IfStatement' && source.includes('customElements.define')],
]) {
  const m = mod(file);
  const node = m.ast.body.find(node => matches(node, m.source.slice(node.start, node.end)));
  if (!node) throw Error('Native Claude initialization changed: ' + file);
  const text = m.source.slice(node.start, node.end);
  initializers.set(file, text);
  for (const name of free(text)) select(file, name);
}
if ([...external.values()].includes("HOST"))
  throw Error(
    "Presentation graph unexpectedly imported application services: " +
      [...external]
        .filter(([id, b]) => b === "HOST")
        .map(([id]) => id)
        .join(", "),
  );
const digest = (text) => crypto.createHash("sha256").update(text).digest("hex");
const check = process.argv.includes("--check"),
  resources = new Map();
function write(file, value) {
  const target = path.join(repo, file);
  if (check) {
    if (
      !fs.existsSync(target) ||
      !fs.readFileSync(target).equals(Buffer.from(value))
    )
      throw Error("Claude source drift: " + file);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, value);
  }
}
const files = [...new Set([...selected.keys()].map((id) => id.split("#")[0]))];
let output = `/* Generated from Claude Desktop 2.9939.2.0 ion-dist. Do not hand-edit native declarations. */\n(function(){'use strict';const ResizeObserver=window.SidebarLayoutObserver||window.ResizeObserver;\nconst refFunctions=new WeakMap();const jsx=(type,props,key)=>{if(type?.$$typeof===Symbol.for('react.context')&&type.Provider!==type)type=type.Provider;if(typeof type==='function'&&Object.hasOwn(props||{},'ref')){let wrapped=refFunctions.get(type);if(!wrapped){const original=type;wrapped=React.forwardRef((props,ref)=>original({...props,ref}));refFunctions.set(type,wrapped);}type=wrapped;}const {children,...rest}=props||{},attrs={...rest,...(key==null?{}:{key})};return Object.hasOwn(props||{},'children')?React.createElement(type,attrs,children):React.createElement(type,attrs);};\nconst jsxRuntime={jsx,jsxs:jsx,Fragment:React.Fragment};const factories={},cache={};\nfunction load(id){if(cache[id])return cache[id];const exports=cache[id]={};factories[id](exports);return exports;}\n`;
const manifest = {
  application: "Claude",
  version: "2.9939.2.0",
  sourceRoot: root,
  framework:
    "React host binding; original native render declarations and local presentation dependencies",
  resources: [],
  declarations: [],
  templates: [],
  serviceBindings: [...serviceBindings].map(([source, binding]) => ({ source, binding })),
  moduleRelocations: [],
  initializers: [...initializers].map(([file, text]) => ({ file, sha256: digest(text) })),
};
// React 19 use(Context/thenable) binding for the existing React 18 host. Native
// component declarations remain unchanged, as with the JSX/ref bindings above.
output += `const thenables=new WeakMap();function nativeUse(value){if(value?.$$typeof===Symbol.for('react.context'))return React.useContext(value);if(value&&typeof value.then==='function'){let state=thenables.get(value);if(!state){state={status:'pending'};thenables.set(value,state);value.then(result=>{state.status='fulfilled';state.value=result},error=>{state.status='rejected';state.value=error})}if(state.status==='fulfilled')return state.value;if(state.status==='rejected')throw state.value;throw value}throw new TypeError('Unsupported native use value')};\n`;
for (const file of files) {
  const m = mod(file),
    entries = [...selected].filter(([id]) => id.startsWith(file + "#")),
    aliases = [...external].filter(
      ([id]) =>
        id.startsWith(file + "#") &&
        id.slice(file.length + 1) !== "decodeURIComponent",
    );
  const declarations = [
    ...new Map(entries.map(([id, d]) => [d.key, d])).values(),
  ].sort((a, b) => a.start - b.start);
  output += `factories[${JSON.stringify(file)}]=exports=>{\n`;
  output += `Object.defineProperties(exports,{${entries
    .map(([id]) => {
      const name = id.slice(file.length + 1);
      return JSON.stringify(name) + ":{get:()=>" + name + "}";
    })
    .join(",")}});\n`;
  for (const [id, binding] of aliases) {
    const name = id.slice(file.length + 1);
    if (binding === "GLOBAL") continue;
    if (binding.startsWith("IMPORT:")) {
      const [f, n] = binding.slice(7).split("#");
      const mapped = external.get(f + "#" + n);
      output += `const ${name}=${mapped && !mapped.startsWith("IMPORT:") && mapped !== "GLOBAL" ? mapped : `load(${JSON.stringify(f)})[${JSON.stringify(n)}]`};\n`;
    } else output += `const ${name}=${binding};\n`;
  }
  for (const d of declarations) {
    output += d.text + "\n";
    manifest.declarations.push({
      file,
      symbols: d.key,
      sha256: digest(d.text),
    });
  }
  if (initializers.has(file)) output += initializers.get(file) + '\n';
  output += "};\n";
  resources.set(file, digest(m.source));
}
output += `const user=load('shared-10-DyE9O65j.js'),composer=load('shared-12-BqJE4_W4.js'),frame=load('shared-frame-BgE9BXIr.js'),approval=load('cf6ae6197-H7y9eJvd.js'),question=load('c1c1ec7b9-BpMPRL5q.js');const templates={};\n`;
function template(name, symbol, binding, file = "c1c1ec7b9-BpMPRL5q.js") {
  const m = mod(file);
  let node =
    m.ast.body.find(
      (n) => n.type === "FunctionDeclaration" && n.id.name === symbol,
    ) ||
    m.ast.body
      .filter((n) => n.type === "VariableDeclaration")
      .flatMap((n) => n.declarations)
      .find((n) => n.id.name === symbol)?.init?.arguments?.[0];
  if (!node) throw Error("Missing native template " + symbol);
  let expression;
  if (binding) {
    const d = node.body.body
      .filter((n) => n.type === "VariableDeclaration")
      .flatMap((n) => n.declarations)
      .find((n) => n.id.name === binding);
    expression =
      d.init.type === "ArrowFunctionExpression" ? d.init.body : d.init;
  } else
    expression = [...node.body.body]
      .reverse()
      .find((n) => n.type === "ReturnStatement").argument;
  const text = m.source.slice(expression.start, expression.end),
    vars = free("var render=()=>(" + text + ");");
  output += `templates.${name}=bindings=>{const {${vars.join(",")}}=bindings;return (${text});};\n`;
  manifest.templates.push({
    name,
    file,
    symbol,
    binding: binding || null,
    sha256: digest(text),
    bindings: vars,
  });
  resources.set(file, digest(m.source));
}
template("Question", "wk");
template("QuestionPagination", "wk", "fe");
template("Approval", "hI");
template("ApprovalContent", "fI");
template("ApprovalDetail", "fI", "ae");
template("PlanApproval", "Zk");
template("CodeBlock", "tp", null, "c19e90103-CSnstyow.js");
template("MarkdownRoot", "$y", null, "c19e90103-CSnstyow.js");
template("Editor", "nF", null, "shared-15-KGWycdaF.js");
for (const [name, symbol, binding, file] of [
  ["CodeComposer", "Kp", null, "c099c328d-B_i6zFP6.js"],
  ["CodeSend", "Kp", "tt", "c099c328d-B_i6zFP6.js"],
  ["CodeSendControl", "Kp", "nt", "c099c328d-B_i6zFP6.js"],
  ["CodeSendCluster", "Kp", "rt", "c099c328d-B_i6zFP6.js"],
  ["CodeAddMenu", "yp", null, "c099c328d-B_i6zFP6.js"],
  ["CodeFooter", "Ol", null, "cc70f2bdf-CvtDMb7_.js"],
  ["CodeFooterLeading", "Ol", "Tt", "cc70f2bdf-CvtDMb7_.js"],
  ["CodePicker", "fl", null, "cc70f2bdf-CvtDMb7_.js"],
])
  template(name, symbol, binding, file);
const resolved = (file, name) => {
  const i = mod(file).imports.get(name);
  return i
    ? `load(${JSON.stringify(i.file)})[${JSON.stringify(mod(i.file).exports.get(i.name) || i.name)}]`
    : `load(${JSON.stringify(file)})[${JSON.stringify(name)}]`;
};
output += `window.ClaudeNativeSource=Object.freeze({UserMessage:user.ow,AssistantMessage:load('c71ec5fd2-CdLCGwFp.js').T,Prose:load('shared-17-DnxarKHW.js').Rb,MessageActions:user.MC,Action:user.RC,CopyAction:user.NC,MessageAttachments:user.hp,Composer:composer.Bh,ComposerHeader:composer.ah,Attachments:composer.ml,ComposerActions:composer.qm,PrimaryAction:composer.om,ComposerChin:composer.rh,ComposerOverlay:composer.ih,Button:frame.fc,Icon:frame.to,TurnStatus:load('c05970c42-Cb32PFgB.js').yt,ToolStep:load('c05970c42-Cb32PFgB.js').G,ColumnClass:load('shared-13-Cc4_02Tf.js').sh,IntlProvider:load('vendor-intl-DWSFqcxC.js').qt,useIntl:load('vendor-intl-DWSFqcxC.js').J,FormattedMessage:load('vendor-intl-DWSFqcxC.js').q,ApprovalCard:approval.kc,ApprovalBody:approval.jc,ApprovalHeading:approval.ac,ApprovalActions:load('shared-16-C5v0iJbn.js').Dp,QuestionOption:question.Ck,Radio:question.sk,Checkbox:${resolved("c1c1ec7b9-BpMPRL5q.js", "Vi")},Textarea:${resolved("c1c1ec7b9-BpMPRL5q.js", "Ei")},questionConstants:{padding:question.xk,markClass:${resolved("c1c1ec7b9-BpMPRL5q.js", "sa")},rootAttribute:${resolved("c1c1ec7b9-BpMPRL5q.js", "yo")},tokens:${resolved("c1c1ec7b9-BpMPRL5q.js", "X_")},stopMouse:question.vk,hasSelection:question.bk},approvalClasses:{detail:question.YF,description:question.GF,note:question.qF},templates,jsx:jsxRuntime});window.dispatchEvent(new Event('claude-native-ready'));})();\n`;
output = output.replace("Button:frame.fc,Icon:", "Button:frame.fc,TextLink:frame.vl,Icon:");
output = output.replace("templates,jsx:jsxRuntime}", "ModelSelector:load('shared-15-KGWycdaF.js').Ew,modelSelectorConfig:load('c360a9e1c-BOKY-coh.js').rd,templates,jsx:jsxRuntime}");
output = output.replace("templates,jsx:jsxRuntime}", "permissionPresentation:load('shared-15-KGWycdaF.js').sO,permissionModes:load('shared-15-KGWycdaF.js').CO,templates,jsx:jsxRuntime}");
output = output.replace("templates,jsx:jsxRuntime}", `codeBlockParts:{Plain:load('c19e90103-CSnstyow.js').Uf,Highlighted:load('c19e90103-CSnstyow.js').qf,Streaming:load('c19e90103-CSnstyow.js').uf,padding:load('c19e90103-CSnstyow.js').Bf,minWidth:${resolved('c19e90103-CSnstyow.js','qa')},features:load('c19e90103-CSnstyow.js').gd,contain:load('c19e90103-CSnstyow.js').Vf,hidden:load('c19e90103-CSnstyow.js').zf,stopMouse:load('c19e90103-CSnstyow.js').Ua,findSecrets:load('c19e90103-CSnstyow.js').bf,maskSecrets:${resolved('c19e90103-CSnstyow.js','je')},Secrets:load('c19e90103-CSnstyow.js').Of,tokens:${resolved('c19e90103-CSnstyow.js','ht')},useThemes:${resolved('c19e90103-CSnstyow.js','bi')}},templates,jsx:jsxRuntime}`);
output = output.replace(
  "FormattedMessage:load('vendor-intl-DWSFqcxC.js').q",
  "FormattedMessage:load('vendor-intl-DWSFqcxC.js').Wt",
);
output = output.replace(
  "templates,jsx:jsxRuntime}",
  `Menu:frame.my,PortalProvider:frame.Gi.Provider,editorLayout:{className:${resolved("shared-15-KGWycdaF.js", "St")},placeholder:${resolved("shared-15-KGWycdaF.js", "ct")},style:${resolved("shared-15-KGWycdaF.js", "$e")},contentClass:${resolved("shared-15-KGWycdaF.js", "et")}},planConstants:{modeLabel:question.Xk,labels:question.Yk,group:${resolved("c1c1ec7b9-BpMPRL5q.js", "$u")},stopMouse:${resolved("c1c1ec7b9-BpMPRL5q.js", "xb")},captureKey:${resolved("c1c1ec7b9-BpMPRL5q.js", "sd")}},templates,jsx:jsxRuntime}`,
);
output = output.replace(
  "editorLayout:{className:",
  `editorLayout:{reservation:${resolved("shared-15-KGWycdaF.js", "gc")},ghost:${resolved("shared-15-KGWycdaF.js", "ot")},className:`,
);
output = output.replace(
  "templates,jsx:jsxRuntime}",
  `codeParts:{renderItem:${resolved("cc70f2bdf-CvtDMb7_.js", "Qi")},SendSwitch:load('c099c328d-B_i6zFP6.js').Dp,stopMouse:load('c099c328d-B_i6zFP6.js').uf,ShortcutRow:load('c099c328d-B_i6zFP6.js').Gp,sendTestId:${resolved("c099c328d-B_i6zFP6.js", "wr")},stopTestId:${resolved("c099c328d-B_i6zFP6.js", "Er")},scopeAttribute:${resolved("c099c328d-B_i6zFP6.js", "Cr")},Tooltip:${resolved("c099c328d-B_i6zFP6.js", "un")},Button:${resolved("c099c328d-B_i6zFP6.js", "tn")},PickerLabel:load('cc70f2bdf-CvtDMb7_.js').ml,PickerItems:load('cc70f2bdf-CvtDMb7_.js').pl,collisionPadding:${resolved("cc70f2bdf-CvtDMb7_.js", "he")},footerGrid:${resolved("cc70f2bdf-CvtDMb7_.js", "at")},footerRow:${resolved("cc70f2bdf-CvtDMb7_.js", "rt")},addSizes:load('c099c328d-B_i6zFP6.js')._p,dockSize:${resolved("c099c328d-B_i6zFP6.js", "Bo")},dockClass:${resolved("c099c328d-B_i6zFP6.js", "Vo")},fileItem:load('c099c328d-B_i6zFP6.js').vp,AddPopup:load('c099c328d-B_i6zFP6.js').Sp,AddItems:load('c099c328d-B_i6zFP6.js').xp},templates,jsx:jsxRuntime}`,
);
output = output.replace(
  "editorLayout:{reservation:",
  `editorLayout:{context:${resolved("shared-15-KGWycdaF.js", "bt")},reservation:`,
);
output = output.replace("codeBlockParts:{Plain:", `codeBlockParts:{language:${resolved('c19e90103-CSnstyow.js','ui')},Plain:`);
output = output.replace("templates,jsx:jsxRuntime}", "markdownContext:load('c19e90103-CSnstyow.js').pf,markdownSizeContext:load('c19e90103-CSnstyow.js').mf,markdownSelection:load('shared-17-DnxarKHW.js').bc,templates,jsx:jsxRuntime}");
output = output.replace(
  "codeParts:{renderItem:",
  `codeParts:{stopGuardMs:load('c099c328d-B_i6zFP6.js').Lp,Spinner:${resolved("shared-frame-BgE9BXIr.js", "ts")},renderItem:`,
);
output = output.replace(
  "Attachments:composer.ml",
  `Attachments:${resolved("shared-12-BqJE4_W4.js", "ml")}`,
);
// The syntax stack's dynamic ESM chunks contain no application services. Keep
// their original relative import graph and bytes; relocate only the generated
// bridge's dynamic import specifiers and the worker's absolute asset URL.
const copiedModules = new Set();
function copyModule(file) {
  file = path.posix.normalize(file);
  if (copiedModules.has(file)) return;
  copiedModules.add(file);
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  resources.set(file, digest(source));
  write('src/claude-native-assets/v1/' + file, source);
  const ast = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (['ImportDeclaration', 'ExportAllDeclaration', 'ImportExpression'].includes(node.type)) {
      const specifier = node.source?.value;
      if (typeof specifier === 'string' && specifier.startsWith('.')) copyModule(path.posix.join(path.posix.dirname(file), specifier));
    }
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value);
  }
  walk(ast);
}
output = output.replace(/import\((['"])\.\/([^'"]+)\1\)/g, (original, quote, file) => {
  copyModule(file);
  const relocated = './claude-native-assets/v1/' + file;
  manifest.moduleRelocations.push({ from: './' + file, to: relocated });
  return `import(${JSON.stringify(relocated)})`;
});
output = output.replace(/(['"])\/assets\/(highlightWorker-[^'"]+\.js)\1/g, (original, quote, file) => {
  const data = fs.readFileSync(path.join(root, '..', file));
  resources.set('../' + file, digest(data));
  write('src/claude-native-assets/' + file, data);
  manifest.moduleRelocations.push({ from: '/assets/' + file, to: './claude-native-assets/' + file });
  return `new URL(${JSON.stringify('./claude-native-assets/' + file)}, window.location.href).href`;
});
write("src/claude-ui.native.js", output);
const selectorParser = require("postcss-selector-parser");
const fontRules = [],
  propertyRules = [],
  styles = [];
const cssSources = [
  "shared-frame-DQeP3Fl-.css",
  "shared-styles-rFN8KR6_.css",
  "c6a992d55-BeQte42g.css",
  "c19e90103-BHvFJEXF.css",
].map((file) => {
  const original = fs.readFileSync(path.join(root, file), "utf8");
  resources.set(file, digest(original));
  return original;
});
// Vite also ships Code-specific styles in top-level inline-CSS injections.
// Read their literal arguments without running any application side effects.
manifest.inlineStyles = [];
for (const file of files) {
  const m = mod(file);
  for (const node of m.ast.body) {
    const call = node.type === "ExpressionStatement" && node.expression;
    if (
      call?.type !== "CallExpression" ||
      !m.source
        .slice(call.callee.start, call.callee.end)
        .includes("data-inline-css")
    )
      continue;
    const [id, value] = call.arguments;
    if (typeof id?.value !== "string" || typeof value?.value !== "string")
      throw Error("Unknown inline CSS injection: " + file);
    cssSources.push(value.value);
    manifest.inlineStyles.push({
      file,
      id: id.value,
      start: value.start,
      end: value.end,
      sha256: digest(value.value),
    });
  }
}
for (const original of cssSources) {
  const tree = postcss.parse(original);
  tree.walkAtRules("layer", (rule) => {
    if (rule.nodes) rule.replaceWith(...rule.nodes);
    else rule.remove();
  });
  tree.walkAtRules("font-face", (rule) => {
    fontRules.push(rule.toString());
    rule.remove();
  });
  tree.walkAtRules("property", (rule) => {
    propertyRules.push(rule.toString());
    rule.remove();
  });
  tree.walkRules((rule) => {
    if (rule.parent.type === "atrule" && /keyframes$/.test(rule.parent.name))
      return;
    const selector = rule.selector.replace(
      /:root|:host|(?<![\w-])html(?![\w-])|(?<![\w-])body(?![\w-])/g,
      ":scope",
    );
    const selectors = [];
    selectorParser((tree) =>
      tree.each((item) => {
        const tail = [];
        while (
          item.last?.type === "pseudo" &&
          (/^::/.test(item.last.value) ||
            [":before", ":after", ":first-letter", ":first-line"].includes(
              item.last.value,
            ))
        ) {
          tail.unshift(item.last.toString());
          item.last.remove();
        }
        const base = item.toString().trim() || "*",
          suffix = tail.join("");
        selectors.push(
          ":scope:is(" + base + ")" + suffix,
          ":scope :is(" + base + ")" + suffix,
        );
      }),
    ).processSync(selector);
    rule.selector = selectors.join(",");
  });
  styles.push(tree.toString());
}
let css =
  "/* Native Claude CSS; only selectors are scoped to isolate the host. */\n" +
  fontRules.join("\n") +
  "\n" +
  propertyRules.join("\n") +
  "\n@scope ([data-claude-native]) {\n" +
  styles.join("\n") +
  "\n}\n";
css = css.replace(/\/assets\/v1\/([^)'"\s]+)/g, (_, file) => {
  const data = fs.readFileSync(path.join(root, file));
  resources.set(file, digest(data));
  write("src/claude-native-assets/" + file, data);
  return "./claude-native-assets/" + file;
});
write("src/claude-ui.source.css", require("./scope-claude-style.cjs").scope(css));
manifest.resources = [...resources].map(([file, sha256]) => ({ file, sha256 }));
manifest.moduleRelocations = [...new Map(manifest.moduleRelocations.map(entry => [entry.from, entry])).values()];
write(
  "docs/claude-ui-source-manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `${check ? "Verified" : "Imported"} ${manifest.declarations.length} native Claude presentation declarations and ${resources.size} pinned source assets.`,
);
