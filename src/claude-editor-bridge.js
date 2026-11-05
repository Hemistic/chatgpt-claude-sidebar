(function () {
  "use strict";
  const h = React.createElement;
  const setRef = (ref, value) =>
    typeof ref === "function" ? ref(value) : ref && (ref.current = value);
  function textOf(node) {
    const inline = (element) =>
      [...element.childNodes]
        .map((child) =>
          child.nodeType === 3
            ? child.textContent
            : child.nodeName === "BR"
              ? "\n"
              : inline(child),
        )
        .join("");
    return [...node.childNodes]
      .map((child) =>
        child.nodeType === 3
          ? child.textContent
          : inline(child).replace(/\n$/, ""),
      )
      .join("\n");
  }
  function writeText(node, value) {
    node.replaceChildren(
      ...String(value || "")
        .split("\n")
        .map((line) => {
          const paragraph = document.createElement("p");
          if (line) paragraph.textContent = line;
          else {
            const br = document.createElement("br");
            br.className = "ProseMirror-trailingBreak";
            paragraph.append(br);
          }
          return paragraph;
        }),
    );
  }
  function caret(node) {
    const selection = node.ownerDocument.getSelection();
    if (!selection?.rangeCount || !node.contains(selection.anchorNode))
      return textOf(node).length;
    const range = selection.getRangeAt(0).cloneRange();
    range.selectNodeContents(node);
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    return textOf(range.cloneContents()).length;
  }
  function select(node, start, end = start) {
    function point(offset) {
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let current,
        previousBlock = null;
      while ((current = walker.nextNode())) {
        const block = current.parentElement.closest("p,div");
        if (previousBlock && previousBlock !== block) offset--;
        if (offset <= current.textContent.length)
          return [current, Math.max(0, offset)];
        offset -= current.textContent.length;
        previousBlock = block;
      }
      return [node, node.childNodes.length];
    }
    const range = document.createRange();
    range.setStart(...point(start));
    range.setEnd(...point(end));
    const selection = node.ownerDocument.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
  // Keeps the existing draft/command/attachment controller, behind the native
  // editor JSX. It exposes the small input API that the CLI controller uses.
  function Input({
    element,
    onMeasureTarget,
    extraEditorAttributes,
    native,
    maxHeight = "min(24rem, 40svh)",
    placeholderFit = "grow",
    minLines = 1,
  }) {
    const layout = React.useContext(native.editorLayout.context);
    const props = element.props,
      ref = React.useRef(null),
      composing = React.useRef(false);
    const [value, setValue] = React.useState(String(props.defaultValue || ""));
    const attach = React.useCallback(
      (node) => {
        ref.current = node;
        if (node) {
          Object.defineProperties(node, {
            value: {
              configurable: true,
              get: () => textOf(node),
              set: (value) => {
                writeText(node, value);
                setValue(String(value || ""));
              },
            },
            selectionStart: { configurable: true, get: () => caret(node) },
            selectionEnd: { configurable: true, get: () => caret(node) },
          });
          node.setSelectionRange = (start, end) => select(node, start, end);
          node.select = () => select(node, 0, textOf(node).length);
          writeText(node, props.defaultValue || "");
        }
        setRef(element.ref, node);
        onMeasureTarget?.(node);
      },
      [element.ref, onMeasureTarget],
    );
    React.useLayoutEffect(() => {
      const node = ref.current,
        next = String(props.defaultValue || "");
      if (node && !composing.current && textOf(node) !== next) {
        writeText(node, next);
        setValue(next);
      }
    }, [props.defaultValue]);
    const change = (event) => {
      setValue(textOf(event.currentTarget));
      props.onChange?.(event);
    };
    const content = h("div", {
      ...extraEditorAttributes,
      ref: attach,
      className: "tiptap ProseMirror claudian-native-input",
      contentEditable: !props.readOnly,
      suppressContentEditableWarning: true,
      dir: props.dir || "auto",
      role: "textbox",
      "aria-label": props["aria-label"],
      "aria-multiline": "true",
      "aria-required": "false",
      "aria-invalid": "false",
      "aria-readonly": !!props.readOnly,
      "data-testid": "code-prompt-input",
      onInput: change,
      onKeyDown: props.onKeyDown,
      onKeyUp: props.onKeyUp,
      onClick: props.onClick,
      onBlur: props.onBlur,
      onCompositionStart: () => {
        composing.current = true;
      },
      onCompositionEnd: (event) => {
        composing.current = false;
        change(event);
      },
      onPaste: (event) => {
        props.onPaste?.(event);
        if (
          !event.defaultPrevented &&
          event.clipboardData?.types.includes("text/plain")
        ) {
          event.preventDefault();
          document.execCommand(
            "insertText",
            false,
            event.clipboardData.getData("text/plain"),
          );
        }
      },
    });
    const EditorContent = React.useMemo(
      () =>
        function EditorContent({ editor, children, ...attrs }) {
          return h("div", attrs, editor, children);
        },
      [],
    );
    const N = native,
      E = N.editorLayout;
    return N.templates.Editor({
      z: N.jsx.jsxs,
      I: N.jsx.jsx,
      D: React.Fragment,
      ae: !value,
      oe: true,
      je: undefined,
      fe: { text: props.placeholder },
      ct: E.placeholder,
      q: layout.multiline,
      c: minLines,
      l: maxHeight,
      s: placeholderFit,
      re: layout.startInset,
      d: !!props.readOnly,
      Ee: true,
      J: layout.columnReservesTrailing,
      o: undefined,
      kc: ({ resolved }) => resolved.text,
      Cp: EditorContent,
      St: E.className,
      ko: (...values) => values.filter(Boolean).join(" "),
      et: E.contentClass,
      Ne:
        placeholderFit === "grow" &&
        E.reservation(props.placeholder).length > 0,
      te: "epitaxy-prompt-input",
      $e: E.style,
      X: content,
      Ae: undefined,
      $P: undefined,
      Yc: null,
      Pe: (placeholderFit === "grow"
        ? E.reservation(props.placeholder)
        : []
      ).map((text) =>
        h("span", {
          ...E.ghost({
            text,
            multiline: layout.multiline,
            reserveTrailing: !layout.columnReservesTrailing,
          }),
          key: text,
        }),
      ),
      y: false,
      sf: null,
      me: null,
      _e: null,
    });
  }
  window.ClaudeEditorBridge = Object.freeze({ Input, textOf, writeText });
})();
