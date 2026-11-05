(function () {
  "use strict";
  const h = React.createElement,
    Host = React.createContext(null),
    PickerAria = React.createContext(null);
  const Pass = ({ children }) => children ?? null;
  const Empty = () => null;
  const cx = (...values) => values.filter(Boolean).join(" ");

  // Only editor state/CLI callbacks are supplied by this host. Kp, Ol and fl
  // render expressions below are imported verbatim from the Code page.
  const PickerButton = React.forwardRef(function PickerButton(props, ref) {
    const aria = React.useContext(PickerAria);
    return h(window.ClaudeNativeSource.Button, {
      ...props,
      ref,
      "aria-label": aria,
    });
  });
  function Picker({ label, header, items, aria, tooltip, warning, description }) {
    const N = window.ClaudeNativeSource,
      { jsx: g, jsxs: v } = N.jsx;
    const [open, setOpen] = React.useState(false),
      [mounted, setMounted] = React.useState(false);
    if (open && !mounted) setMounted(true);
    return h(
      PickerAria.Provider,
      { value: aria },
      N.templates.CodePicker({
        c: open,
        x: mounted,
        S: setMounted,
        v,
        J: N.Menu,
        l: setOpen,
        g,
        X: N.codeParts.Tooltip,
        r: tooltip,
        t: header,
        n: undefined,
        s: false,
        Y: PickerButton,
        p: undefined,
        b: description,
        y: React.useId(),
        ml: N.codeParts.PickerLabel,
        m: warning ? "warning" : undefined,
        e: label,
        f: "top",
        d: undefined,
        _: document.querySelector("[data-claude-native]"),
        he: N.codeParts.collisionPadding,
        u: undefined,
        pl: N.codeParts.PickerItems,
        i: items,
      }),
    );
  }
  function Controls(props) {
    return h(window.ClaudeSidebarUI.Ready, null, () => {
      if (props.slot === "leading")
        return h(PermissionControl, props);
      return h(window.ClaudeControls.Provider, null, h(ModelControl, props));
    });
  }
  function PermissionControl(props) {
    const N = window.ClaudeNativeSource, intl = N.useIntl();
    const mode = props.permissionMode === "plan" ? "plan" : props.permissionMode === "yolo" ? "bypassPermissions" : (props.claudeSafeMode || "acceptEdits");
    // CO's local Code branch supplies the ordering. Auto requires the original
    // account/model gate, so retain it only for an explicitly configured session.
    const modes = N.permissionModes("local", { isBypassAvailable: true, isAutoModeAvailable: mode === "auto" });
    const presentation = N.permissionPresentation({ mode, intl, envType: "local" });
    return h(Picker, {
      aria: "Permission mode",
      header: intl.formatMessage({ defaultMessage: "Mode", id: "mrOnjMzgC4" }),
      label: presentation.triggerLabel || presentation.label,
      tooltip: presentation.isWarning ? intl.formatMessage({ defaultMessage: "Claude can modify or delete files without asking", id: "XMVuZLSpSV" }) : undefined,
      items: modes.map((value) => {
        const item = N.permissionPresentation({ mode: value, intl, envType: "local" });
        return { value, label: item.label, description: item.description, checked: value === mode,
          onSelect: () => props.onPermissionMode({ permissionMode: value === "plan" ? "plan" : value === "bypassPermissions" ? "yolo" : "normal", claudeSafeMode: value === "plan" ? (props.claudeSafeMode === "plan" ? "default" : props.claudeSafeMode || "acceptEdits") : value }),
        };
      }),
    });
  }
  // Nw's account/catalog service boundary is replaced by CLI metadata. The
  // Ew selector (including its list, pill, badges and effort slider) is native.
  function ModelControl(props) {
    const N = window.ClaudeMenuSource;
    const intl = window.ClaudeNativeSource.useIntl();
    const [open, setOpen] = React.useState(false);
    const [effortOpen, setEffortOpen] = React.useState(false);
    const current = props.models.find((model) => model.selected);
    const models = props.models.map((model) => {
      // An explicitly selected effort can outlive an older CLI catalog. Show
      // that actual setting with the native disabled single-stop control;
      // do not invent additional supported levels for an unknown model.
      const efforts = model.efforts?.length ? model.efforts : model.selected && model.supportsReasoningEffort !== false && props.effort ? [{ value: props.effort, label: props.effortLabel || props.effort }] : [];
      return {
        id: model.value,
        name: model.label,
        description: ["Native CLI configured model", "Native Claude CLI model", "Custom sidebar model", "Available runtime model"].includes(model.description) ? undefined : model.description || undefined,
        section: "main",
        ...(model.rawValue === props.defaultModel ? {
          badge: { message: intl.formatMessage({ defaultMessage: "Default", id: "7Aqe2/LqFL" }), variant: "neutral" },
        } : {}),
        ...(efforts.length ? { thinking: { type: "effort", effort_options: efforts.map((option) => ({ id: option.value, name: option.label || option.value })) } } : {}),
      };
    });
    return h(N.ModelSelector, {
      catalog: { models },
      state: { id: "code", model: current?.value || props.currentModel, thinking: { type: "effort", effort: props.effort } },
      onStateChange: async (_state, action) => {
        if (action.kind === "model") await props.onModel(action.modelId);
        else if (action.kind === "effort") await props.onEffort(action.effort);
        return true;
      },
      config: N.modelConfig,
      open, onOpenChange: value => { setOpen(value); if (value) Promise.resolve(props.onLoadModels?.()).catch(error => console.error(error.message)); },
      effortOpen, onEffortOpenChange: setEffortOpen,
      triggerVariant: "pill", triggerLabel: "Model",
      side: "top", align: "end",
      "data-testid": "epitaxy-cds-model-selector",
    });
  }
  function AddMenu(props) { return h(window.ClaudeControls.AddMenu, props); }
  function Send({ busy, disabled, onSend, onCancel }) {
    const N = window.ClaudeNativeSource,
      P = N.codeParts,
      { jsx: A, jsxs: j } = N.jsx;
    const stoppedAt = React.useRef(-Infinity);
    const submit = () => {
      if (Date.now() - stoppedAt.current >= P.stopGuardMs) onSend();
    };
    const stop = () => {
      stoppedAt.current = Date.now();
      onCancel();
    };
    const send = N.templates.CodeSend({
      A,
      tn: P.Button,
      Ye: "Send",
      wr: P.sendTestId,
      R: false,
      z: undefined,
      I: !disabled,
      L: undefined,
      uf: P.stopMouse,
      Ze: submit,
    });
    const control = N.templates.CodeSendControl({
      ne: busy,
      Qe: busy,
      Re: false,
      A,
      Ye: "Send",
      Ee: N.useIntl(),
      se: submit,
      G: () => undefined,
      $e: true,
      Xe: "Queue for later",
      q: "Stop",
      ce: stop,
      et: busy,
      _e: undefined,
      ve: undefined,
      Dp: P.SendSwitch,
      un: P.Tooltip,
      ge: false,
      tn: P.Button,
      Er: P.stopTestId,
      uf: P.stopMouse,
      j,
      Gp: P.ShortcutRow,
      K: true,
      he: false,
      pe: false,
      me: "",
      tt: send,
      i: undefined,
    });
    return N.templates.CodeSendCluster({
      j,
      A,
      Cp: { Provider: Pass },
      ve: undefined,
      _e: undefined,
      nt: control,
    });
  }
  function Chin({ leading, trailing, onAddContext }) {
    const N = window.ClaudeNativeSource,
      { jsx: g, jsxs: v } = N.jsx;
    const start = N.templates.CodeFooterLeading({
      v,
      f: React.Fragment,
      Fe: true,
      lt: h(AddMenu, { onAddContext }),
      Ne: null,
      vt: leading,
      L: undefined,
      g,
      dl: Empty,
      I: false,
      Pe: null,
    });
    return N.templates.CodeFooter({
      V: "chin",
      g,
      zt: { Chin: N.ComposerChin },
      Tt: start,
      St: cx,
      at: N.codeParts.footerGrid,
      Et: trailing,
      v,
      rt: N.codeParts.footerRow,
    });
  }
  Chin.cdsChatComposerPart = "Chin";
  function Footer(props) {
    return h(window.ClaudeSidebarUI.Ready, null, (N) =>
      h(CodeComposer, { ...props, native: N }),
    );
  }
  function CodeComposer({
    native: N,
    input,
    tab,
    busy,
    disabled,
    onSend,
    onCancel,
    onAddContext,
    leading,
    trailing,
  }) {
    const { jsx: A, jsxs: j } = N.jsx,
      editorRef = React.useRef(null);
    const Fn = React.useMemo(() => {
      function Frame({ editor, editorRef: _ref, children, ...attrs }) {
        const host = React.useContext(Host),
          focus = () => host.input.ref?.current?.focus();
        const render = React.useCallback(
          (options) =>
            h(window.ClaudeEditorBridge.Input, {
              native: N,
              element: React.cloneElement(host.input, {
                placeholder: editor.placeholder,
              }),
              ...options,
              maxHeight: editor.maxHeight,
              placeholderFit: editor.placeholderFit,
              minLines: editor.minLines,
            }),
          [
            host.input,
            editor.placeholder,
            editor.maxHeight,
            editor.placeholderFit,
            editor.minLines,
          ],
        );
        return h(
          N.Composer,
          {
            ...attrs,
            editor: {
              draftStoreKey: editor.draftStoreKey,
              disabled: editor.disabled,
              contentKey: host.input.props.defaultValue,
              hasDraftText: () => !!host.input.ref?.current?.value,
              focus,
              trailingNotch: "float",
              minLines: editor.minLines,
              render,
            },
          },
          children,
        );
      }
      return Object.assign(Frame, {
        Header: N.ComposerHeader,
        Attachments: N.Attachments,
        Actions: N.ComposerActions,
        Overlay: N.ComposerOverlay,
      });
    }, [N]);
    const placeholder = tab.messages.length
      ? "Type / for commands"
      : "Describe a task or ask a question";
    const chin = h(Chin, { leading, trailing, onAddContext });
    const content = N.templates.CodeComposer({
      A,
      j,
      re: false,
      Cr: N.codeParts.scopeAttribute,
      e: tab.id,
      Ce: undefined,
      ae: () => ({}),
      tc: { Provider: Pass },
      We: undefined,
      Oe: true,
      yo: Empty,
      Jn: Empty,
      ie: false,
      Ee: N.useIntl(),
      H: null,
      U: null,
      T: React.Fragment,
      ye: null,
      Or: { Provider: Pass },
      Ms: undefined,
      Fn,
      y: input.props["aria-label"],
      te: busy,
      N: !!input.props.readOnly,
      ee: false,
      Ke: undefined,
      ke: editorRef,
      r: undefined,
      Ie: () => {},
      oe: false,
      Ne: placeholder,
      l: undefined,
      li: undefined,
      u: false,
      d: [],
      f: () => {},
      m: () => {},
      Qf: Empty,
      Sf: undefined,
      Ae: undefined,
      g: undefined,
      Ge: undefined,
      Pe: () => {},
      w: onSend,
      ze: undefined,
      D: true,
      Re: false,
      E: () => false,
      s: undefined,
      Le: () => {},
      i: tab.id,
      C: input.props.onKeyDown,
      Je: null,
      B: null,
      Wp: Empty,
      He: false,
      Ve: () => {},
      Te: undefined,
      qe: undefined,
      rt: h(Send, { busy, disabled, onSend, onCancel }),
      W: undefined,
      Me: () => {},
      c: placeholder,
      we: chin,
      n: tab.id,
      P: null,
      yf: Empty,
    });
    return h(
      "div",
      { className: N.ColumnClass, "data-claude-code-composer": "" },
      h(Host.Provider, { value: { input } }, content),
    );
  }
  window.ClaudeCodeComposer = Object.freeze({ Footer, Controls });
})();
