(function () {
  "use strict";
  const h = React.createElement;
  // CLI reports one failure through assistant content, result and process exit.
  // Keep all protocol events in storage, but show the detailed failure once.
  function visibleBlocks(blocks) {
    const normalized = (block) =>
      String(block.content || "")
        .replace(/^Runtime error:\s*/, "")
        .replace(/^Claude Code returned an error result:\s*/, "")
        .trim();
    return blocks.filter((block, index) => {
      if (block.type !== "text") return true;
      const text = normalized(block);
      if (
        text === "authentication_failed" &&
        blocks.some((other) =>
          normalized(other).startsWith("Failed to authenticate."),
        )
      )
        return false;
      if (!String(block.content).startsWith("Runtime error:")) return true;
      return !blocks.some(
        (other, i) =>
          other.type === "text" &&
          i !== index &&
          normalized(other) === text &&
          (!String(other.content).startsWith("Runtime error:") || i < index),
      );
    });
  }
  function Ready({ children }) {
    const [ready, setReady] = React.useState(!!window.ClaudeNativeSource);
    React.useEffect(() => {
      const loaded = () => setReady(!!window.ClaudeNativeSource);
      window.addEventListener("claude-native-ready", loaded);
      loaded();
      return () => window.removeEventListener("claude-native-ready", loaded);
    }, []);
    const N = window.ClaudeNativeSource;
    if (!ready || !N) return null;
    return h(
      N.IntlProvider,
      {
        locale: "en-US",
        defaultLocale: "en-US",
        onError: (error) => {
          if (error.code !== "MISSING_TRANSLATION") console.error(error);
        },
      },
      h(
        N.PortalProvider,
        { value: document.querySelector("[data-claude-native]") },
        children(N),
      ),
    );
  }
  function Column({ children }) {
    return h(Ready, null, (N) =>
      h(
        "div",
        {
          className: `epitaxy-transcript-typography ${N.ColumnClass} flex flex-col gap-[var(--chat-turn-gap)] pt-[48px] pb-[32px]`,
          "data-claude-column": "",
        },
        children,
      ),
    );
  }
  function CodeBlock({ text, language = "text", isStreaming = false }) {
    const N = window.ClaudeNativeSource, P = N.codeBlockParts;
    language = P.language(language);
    const { jsx: v, jsxs: b } = N.jsx, intl = N.useIntl();
    const { theme } = P.useThemes();
    const target = React.useRef(null), timer = React.useRef(null);
    const [copied, setCopied] = React.useState(false);
    const [streamReady, setStreamReady] = React.useState(false);
    const [streamHighlighted, setStreamHighlighted] = React.useState(true);
    const [streamEnded, setStreamEnded] = React.useState(false);
    const [fileReady, setFileReady] = React.useState(false);
    const [revealed, setRevealed] = React.useState(false);
    const secrets = P.findSecrets(text, !isStreaming);
    const display = React.useMemo(() => secrets && !revealed ? P.maskSecrets(text, secrets) : text, [text, secrets, revealed]);
    const padding = P.padding(1 + Number(!!secrets));
    const unsafeCSS = React.useMemo(() => `[data-file] { padding: ${P.tokens.pad.md.cssVar} calc(${padding} + 1ch) ${P.tokens.pad.md.cssVar} calc(10px + 1ch); ${P.features} } [data-code] { padding-block: 0; overflow: clip; contain: ${P.contain.contain}; } [data-line] { min-height: 1lh; padding-inline: 0; } [data-line]:hover { background: transparent; }`, [P, padding]);
    const firstRender = React.useCallback(({ highlighted }) => { setStreamHighlighted(highlighted); setStreamReady(true); }, []);
    const ended = React.useCallback(() => setStreamEnded(true), []);
    const detached = React.useCallback(height => target.current?.style.setProperty('min-height', `${height}px`), []);
    const rendered = React.useCallback(() => target.current?.style.removeProperty('min-height'), []);
    const options = React.useMemo(() => ({ theme, disableFileHeader: true, disableLineNumbers: true, overflow: "wrap", unsafeCSS,
      onPostRender: (element, _unused, phase) => {
        if (phase !== "unmount" && element.shadowRoot?.querySelector('[data-line]')) { setFileReady(true); target.current?.style.removeProperty('min-height'); }
      },
    }), [theme, unsafeCSS]);
    React.useEffect(() => () => clearTimeout(timer.current), []);
    const copy = () => {
      // Match tp: copy the displayed (possibly masked) source, reset at 1200ms.
      navigator.clipboard.writeText(display).then(() => {
        setCopied(true); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1200);
      }).catch(() => {});
    };
    const stream = language !== 'ansi' && !streamEnded && (isStreaming || (streamReady && streamHighlighted));
    const file = !isStreaming && !(streamReady && streamHighlighted && !streamEnded);
    const plain = isStreaming ? !streamReady : file ? !fileReady : !streamReady;
    // tp's original render expression is imported verbatim. The CLI adapter has
    // no inline terminal executor; that optional app service is absent here.
    return N.templates.CodeBlock({
      b, g: (...parts) => parts.filter(Boolean).join(' '), le: null, se: null, qa: P.minWidth, c: undefined, l: undefined,
      C: target, E: isStreaming, U: display, Ue: plain, v, Uf: P.Plain, Te: padding, Re: true, He: !fileReady,
      Ke: detached, K: stream, uf: P.Streaming, t: language, w: theme, Ye: unsafeCSS, Oe: streamReady,
      zf: P.hidden, We: firstRender, qe: rendered, Ge: ended, Le: file, qf: P.Highlighted, Xe: options,
      ce: false, Ze: !/[\r\n]/.test(text.trimEnd()), we: false, Xf: N.Button, Jf: "Stop", f: intl,
      ye: undefined, Ua: P.stopMouse, _e: false, ve: false, be: undefined, p: React.Fragment,
      de: secrets, Of: P.Secrets, fe: revealed, pe: setRevealed, y: copied, Ce: copy,
      Qf: EmptyCodeOutput, oe: false, O: null, xe: undefined, ue: undefined,
    });
  }
  function EmptyCodeOutput() { return null; }
  function Markdown({ content = "", adapters, isStreaming = false }) {
    const N = window.ClaudeNativeSource;
    const root = React.useRef(null);
    function block(node, key) {
      const inline = (text) => adapters.inline(String(text || ""), key);
      switch (node.type) {
        case "code":
          return h(CodeBlock, { key, text: node.code, language: node.language || "text", isStreaming });
        case "math":
          return h("div", { key }, adapters.math(node.latex));
        case "heading":
          return h(
            `h${Math.min(6, Math.max(1, node.level))}`,
            { key },
            inline(node.text),
          );
        case "blockquote":
          return h("blockquote", { key }, inline(node.text));
        case "hr":
          return h("hr", { key });
        case "list":
          return h(
            node.ordered ? "ol" : "ul",
            { key },
            node.items.map((item, i) =>
              h(
                "li",
                { key: i, value: node.ordered ? item.value : undefined },
                inline(typeof item === "string" ? item : item.text),
                (item.children || []).map((child, j) =>
                  block(child, `${key}-${i}-${j}`),
                ),
              ),
            ),
          );
        case "table":
          return h(
            "div",
            { key, className: "overflow-x-auto" },
            h(
              "table",
              null,
              h(
                "thead",
                null,
                h(
                  "tr",
                  null,
                  node.headers.map((text, i) =>
                    h("th", { key: i }, inline(text)),
                  ),
                ),
              ),
              h(
                "tbody",
                null,
                node.rows.map((row, i) =>
                  h(
                    "tr",
                    { key: i },
                    node.headers.map((_, j) =>
                      h("td", { key: j }, inline(row[j])),
                    ),
                  ),
                ),
              ),
            ),
          );
        default:
          return h("p", { key }, inline(node.text));
      }
    }
    return N.templates.MarkdownRoot({ Jn: N.markdownSelection, s: undefined, T: React.useMemo, e: "epitaxy", t: undefined, n: "sans", i: root,
      a: adapters.parse(String(content)).map((node, i) => block(node, i)),
      v: N.jsx.jsx, pf: N.markdownContext, mf: N.markdownSizeContext, dr: N.Prose,
    });
  }
  function ThinkingStatus({ block, adapters }) {
    const N = window.ClaudeNativeSource;
    // CLI startTime is authoritative. A missing timestamp gets one stable
    // fallback per block, never a new start on each streaming render.
    const fallback = React.useRef(null);
    if (!fallback.current || fallback.current.id !== block.id) {
      fallback.current = { id: block.id, startedAt: Date.now() };
    }
    const suppliedStart = Number(block.startTime);
    const startedAt = Number.isFinite(suppliedStart) && suppliedStart > 0
      ? suppliedStart : fallback.current.startedAt;
    const running = block.runtimeStreaming === true;
    const readElapsed = () => Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const [elapsed, setElapsed] = React.useState(readElapsed);
    React.useEffect(() => {
      if (!running) return undefined;
      const tick = () => setElapsed(readElapsed());
      tick();
      // Update independently of CLI chunks, including silent thinking periods.
      const timer = window.setInterval(tick, 250);
      return () => window.clearInterval(timer);
    }, [block.id, running, startedAt]);
    const stored = Number(block.durationSeconds);
    const seconds = running ? elapsed : Number.isFinite(stored) && stored >= 0 ? stored : 0;
    // A clock tick must not reparse an unchanged, potentially long thought.
    const content = React.useMemo(() => block.content
      ? h(N.ToolStep, { label: 'Thinking' }, h(Markdown, { content: block.content, adapters }))
      : null, [N, block.content, adapters]);
    return h(N.TurnStatus, {
      label: 'Thinking', state: running ? 'busy' : 'done', elapsedSeconds: seconds,
      'data-thinking-block-id': block.id,
      'data-thinking-running': String(running),
      'data-thinking-seconds': seconds,
      'data-thinking-started-at': startedAt,
    }, content);
  }

  function ConversationTurn(props) {
    return h(window.ClaudeDeferredTurns.MeasuredTurn, null, h(Ready, null, () => h(Turn, props)));
  }
  function Turn({
    message,
    blocks,
    adapters,
    canFork,
    canRewind,
    onFork,
    onRewind,
    onPermission,
    onAskAnswer,
    onPlan,
  }) {
    const N = window.ClaudeNativeSource,
      text = message.displayContent || message.content || "";
    const actions = h(
      N.MessageActions,
      null,
      h(N.CopyAction, {
        getText: () =>
          text ||
          blocks
            .filter((b) => b.type === "text")
            .map((b) => b.content)
            .join("\n\n"),
      }),
      canFork
        ? h(N.Action, {
            icon: "ArrowSplitRight",
            label: "Fork from here",
            onClick: () => onFork(message.id),
          })
        : null,
      canRewind
        ? h(N.Action, {
            icon: "Rewind",
            label: "Rewind",
            onClick: () => onRewind(message.id),
          })
        : null,
    );
    if (message.role === "user")
      return h(
        "div",
        {
          className: "claude-conversation-turn",
          "data-role": "user",
          "data-message-id": message.id,
        },
        h(
          N.UserMessage,
          { collapsible: true },
          text,
          message.images?.length
            ? h(
                N.MessageAttachments,
                null,
                message.images.map((image, i) =>
                  h(N.MessageAttachments.Image, {
                    key: i,
                    src: adapters.imageSrc(image),
                    alt: image.name || "Image",
                  }),
                ),
              )
            : null,
          actions,
        ),
      );
    function render(block, index) {
      const key = block.id || index;
      if (block.type === "plan_proposal")
        return h("div", { key, "data-claude-plan": block.id, tabIndex: -1, className: "outline-none" },
          h(Markdown, { content: block.plan || block.content || "", adapters }));
      if (["text", "plan", "plan_proposal"].includes(block.type))
        return h(Markdown, {
          key,
          content: block.plan || block.content || "",
          adapters,
          isStreaming: !!message.runtimeStreaming && !!block.runtimeStreaming,
        });
      if (block.type === "tool_use") {
        const command =
          block.command ||
          block.input?.command ||
          block.input?.file_path ||
          block.filePath ||
          block.summary ||
          "";
        const state =
          block.status === "running" || block.status === "pending"
            ? "busy"
            : block.isError || ["error", "failed"].includes(block.status)
              ? "failed"
              : "done";
        return h(
          N.TurnStatus,
          { key, label: block.name || "Tool", state, failedLabel: "Failed" },
          h(
            N.ToolStep,
            {
              label: block.name || "Tool",
              // Native ToolStep renders meta as a second text column. A name-only
              // CLI summary carries no additional detail and must not repeat the label.
              meta: typeof command === "string" && command.trim() === (block.name || "Tool")
                ? undefined : command,
              state,
              failedLabel: "Failed",
            },
            block.result
              ? h(
                  "pre",
                  { className: N.approvalClasses.detail },
                  typeof block.result === "string"
                    ? block.result
                    : JSON.stringify(block.result, null, 2),
                )
              : null,
          ),
        );
      }
      if (block.type === "thinking")
        return h(ThinkingStatus, { key, block, adapters });
      if (block.type === "context_compacted")
        return h(N.TurnStatus, {
          key,
          label: "Context compacted",
          state: "done",
        });
      if (block.type === "turn_diff")
        return h(
          N.TurnStatus,
          { key, label: "Changes", state: "done" },
          h(
            N.ToolStep,
            { label: "Changes" },
            h("pre", { className: N.approvalClasses.detail }, block.diff || ""),
          ),
        );
      if (["permission", "ask_user", "plan_approval"].includes(block.type))
        return h(Interaction, {
          key,
          block,
          onPermission,
          onAskAnswer,
          onPlan,
        });
      if (block.type === "task_plan")
        return h(
          N.Prose,
          { key },
          h(
            "ul",
            null,
            (block.steps || []).map((step, i) =>
              h("li", { key: i }, step.step),
            ),
          ),
        );
      if (block.type === "review_result")
        return h(
          N.Prose,
          { key },
          h("p", null, block.review?.overall_explanation),
          (block.review?.findings || []).map((finding, i) =>
            h(
              "div",
              { key: i },
              h("strong", null, finding.title),
              h("p", null, finding.body),
            ),
          ),
        );
      return block.content
        ? h(Markdown, { key, content: block.content, adapters, isStreaming: !!message.runtimeStreaming && !!block.runtimeStreaming })
        : null;
    }
    return h(
      "div",
      {
        className: "claude-conversation-turn",
        "data-role": "assistant",
        "data-message-id": message.id,
      },
      h(
        N.AssistantMessage,
        { busy: message.runtimeStreaming },
        visibleBlocks(blocks).map(render),
        actions,
      ),
    );
  }

  // The model callback is kept out of the native menu implementation.
  function ComposerControls(props) {
    return h(window.ClaudeCodeComposer.Controls, props);
  }
  function ComposerRoot({ children, className, ...events }) {
    return h(
      "div",
      { ...events, className: "claude-composer-host relative" },
      children,
    );
  }
  function ComposerFooter(props) {
    return h(window.ClaudeCodeComposer.Footer, props);
  }

  function Interaction({ block, onAskAnswer, onPermission, onPlan }) {
    return h(Ready, null, (N) => h("div", {
      "data-claude-interaction": block.type,
      "aria-busy": !!block.responsePending,
    }, block.type === "ask_user"
        ? h(Question, { key: block.id, block, onAnswer: onAskAnswer })
        : block.type === "plan_approval"
          ? h(Plan, { key: block.id, block, onDecision: onPlan })
          : h(Permission, { key: block.id, block, onDecision: onPermission }),
      block.responseError ? h(N.Prose, null, h("p", {role:"alert",className:"text-danger text-footnote"}, block.responseError)) : null,
    ));
  }
  // The installed App owns chord handling, grace periods and focus/IME guards.
  // The host supplies only the active card and the real CLI decision callbacks.
  function useApprovalKeys(root, block, callbacks) {
    window.ClaudeMenuSource.useApprovalHotkeys({
      enabled: !block.responsePending,
      active: true, cardRootRef: root, armKey: block.id,
      yieldWhenOffScreen: true, armGraceMs: 400,
      isOwnComposer: element => !!element?.closest?.('[data-cds="ChatComposer"]'),
      hasComposerPopup: () => !!document.querySelector('[role="menu"], [role="listbox"], [role="dialog"]'),
      ...callbacks,
    });
  }
  function Permission({ block, onDecision }) {
    const N = window.ClaudeNativeSource,
      { jsx: x, jsxs: C } = N.jsx;
    const decide = (value) => onDecision(block.id, value),
      busy = !!block.responsePending;
    const root = React.useRef(null);
    useApprovalKeys(root, block, {
      deny: () => decide('deny'),
      allowOnce: () => decide('allow'),
      allowPersistent: () => decide('allow-always'),
    });
    const detail = String(
      block.command ||
        block.input?.command ||
        block.description ||
        block.reason ||
        block.tool ||
        "",
    );
    const content = () =>
      N.templates.ApprovalContent({
        _: !!detail,
        J: false,
        T: null,
        C,
        x,
        yw: N.ApprovalHeading,
        se: h(N.Icon, { name: block.approvalKind === "file_change" ? "File" : "CommandLine", size: "sm" }),
        Y: block.title || "Allow Claude to run this command?",
        t: {},
        ce: N.templates.ApprovalDetail({
          x,
          D: undefined,
          S: undefined,
          YF: N.approvalClasses.detail,
          t: {},
          wd: String,
          e: detail,
        }),
        N: null,
        j: null,
        B: null,
        M: null,
        O: null,
        P: null,
        R: null,
        w: null,
        F: null,
        L: null,
        H: null,
        ee: null,
        q: null,
        te: null,
        z: undefined,
      });
    const action = (key, label, value, variant = "secondary") => ({
      key,
      label,
      variant,
      disabled: busy,
      shortcut: key === 'deny' ? 'esc' : key === 'always' ? 'cmd+shift+enter' : 'cmd+enter',
      persistent: key === 'always',
      onClick: () => decide(value),
    });
    return N.templates.Approval({
      C,
      x,
      Ow: N.ApprovalCard,
      ow: N.ApprovalBody,
      k: 0,
      Pi: (...s) => s.filter(Boolean).join(" "),
      Tw: "",
      Se: "dock",
      at: { ref: root, tabIndex: -1, "data-claude-approval": "", "aria-label": "Permission request" },
      fI: content,
      e: { id: block.id },
      W: {},
      h: undefined,
      d: undefined,
      a: false,
      S: true,
      V: false,
      ye: undefined,
      _e: () => {},
      ee: false,
      I: null,
      xe: undefined,
      we: false,
      lt: h(N.ApprovalActions, {
        deny: action("deny", "Deny", "deny"),
        allows: [
          action("always", "Always allow", "allow-always"),
          action("once", "Allow once", "allow", "primary"),
        ],
      }),
    });
  }
  function Question({ block, onAnswer }) {
    const N = window.ClaudeNativeSource,
      p = N.useIntl(),
      { jsx: x, jsxs: C } = N.jsx;
    const questions = block.questions || [],
      [page, setPage] = React.useState(0);
    const [answers, setAnswers] = React.useState(() =>
      questions.map(() => ({ selected: [], other: "" })),
    );
    const root = React.useRef(null),
      other = React.useRef(null);
    const restoreFocus = React.useRef(false);
    const goToPage = (next) => {
      restoreFocus.current = !!root.current?.contains(document.activeElement);
      setPage(next);
    };
    React.useLayoutEffect(() => {
      if (restoreFocus.current) {
        restoreFocus.current = false;
        root.current?.focus({ preventScroll: true });
      }
    }, [page]);
    const question = questions[page];
    const answer = answers[page],
      busy = !!block.responsePending,
      last = page === questions.length - 1;
    const update = (patch) =>
      setAnswers((items) =>
        items.map((item, i) => (i === page ? { ...item, ...patch } : item)),
      );
    const select = (index) =>
      setAnswers((items) =>
        items.map((item, i) =>
          i !== page
            ? item
            : {
                ...item,
                skipped: false,
                selected: question?.multiSelect
                  ? item.selected.includes(index)
                    ? item.selected.filter((value) => value !== index)
                    : [...item.selected, index]
                  : [index],
              },
        ),
      );
    // wk/hk allows an empty Other selection and submits "Something else".
    const valid = (item) => item.skipped || item.selected.length > 0;
    const canSubmit = !!question && (last ? answers.every(valid) : valid(answer));
    const unanswered = answers.findIndex((item, index) => index !== page && !valid(item));
    const disabledReason = canSubmit ? undefined : valid(answer || { selected: [] })
      ? p.formatMessage({ defaultMessage: 'Question {n} is unanswered', id: 'FUhtZuza1v' }, { n: unanswered + 1 })
      : p.formatMessage({ defaultMessage: 'Choose an option or skip this question', id: 'ArJPHUks2W' });
    const emit = (items) => {
      const response = Object.fromEntries(
        questions.map((question, i) => {
          const item = items[i],
            values = [...item.selected].sort((a,b)=>a-b).map((index) =>
              index === -1
                ? item.other.trim() || "Something else"
                : question.options[index].label,
            );
          return [
            question.question,
            item.skipped
              ? "[No preference]"
              : question.multiSelect
                ? values
                : values[0],
          ];
        }),
      );
      onAnswer(block.id, response);
    };
    const skip = () => {
      if (busy) return;
      const next = answers.map((item, i) =>
        i === page ? { selected: [], other: "", skipped: true } : item,
      );
      setAnswers(next);
      if (!last) {
        goToPage(page + 1);
        return;
      }
      const unanswered = next.findIndex((item) => !valid(item));
      if (unanswered >= 0) goToPage(unanswered);
      else emit(next);
    };
    const submit = () => {
      if (!canSubmit || busy) return;
      if (!last) {
        goToPage(page + 1);
        return;
      }
      emit(answers);
    };
    useApprovalKeys(root, block, {
      isActive: () => canSubmit, yieldToComposerDraft: false,
      allowOnce: submit,
    });
    if (!question) return null;
    const pagination = N.templates.QuestionPagination({
      y: questions.length,
      C,
      x,
      Ni: N.Button,
      c: busy,
      P: page,
      p,
      vk: N.questionConstants.stopMouse,
      H: goToPage,
      Q: N.FormattedMessage,
      R: last,
    });
    return N.templates.Question({
      C,
      x,
      Ow: N.ApprovalCard,
      h: root,
      n: 0,
      yk: (event) => event.stopPropagation(),
      ue: question.question,
      yo: N.questionConstants.rootAttribute,
      ae: false,
      xk: N.questionConstants.padding,
      SS: (text) => text,
      le: question.question,
      P: page,
      fe: pagination,
      I: question,
      Ck: N.QuestionOption,
      L: answer,
      c: busy,
      U: select,
      Ca: String,
      bk: N.questionConstants.hasSelection,
      K: () => {
        ReactDOM.flushSync(() => select(-1));
        other.current?.focus();
      },
      ce: answer.selected.includes(-1),
      p,
      de: (checked) =>
        h(question.multiSelect ? N.Checkbox : N.Radio, {
          checked,
          className: N.questionConstants.markClass,
        }),
      Q: N.FormattedMessage,
      Ei: N.Textarea,
      G: other,
      Rt: String,
      W: (value) => update({ other: value }),
      ne: { current: canSubmit },
      Y: submit,
      X_: N.questionConstants.tokens,
      Ni: N.Button,
      vk: N.questionConstants.stopMouse,
      te: skip,
      q: !!canSubmit,
      J: disabledReason,
      r: true,
      R: last,
    });
  }
  function Plan({ block, onDecision }) {
    return h(window.ClaudeControls.Provider, null, h(NativePlan, { block, onDecision }));
  }
  function NativePlan({ block, onDecision }) {
    const root = React.useRef(null), sending = React.useRef(false);
    const tool = React.useMemo(() => ({
      id: block.id, name: 'ExitPlanMode', input: { plan: block.plan || '' },
    }), [block.id, block.plan]);
    const openPlan = React.useCallback(() => {
      const id = String(block.runtimeApprovalId || '') + '-plan';
      const target = [...document.querySelectorAll('[data-claude-plan]')]
        .find(node => node.getAttribute('data-claude-plan') === id);
      target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      target?.focus({ preventScroll: true });
    }, [block.runtimeApprovalId]);
    const decide = (decision, input, callbacks = {}) => {
      if (sending.current || block.responsePending) return undefined;
      sending.current = true;
      const revising = !!root.current?.querySelector('textarea');
      const response = decision === 'once'
        ? { type: block.variant === 'post-plan' ? 'implement' : 'approve', targetMode: input._targetMode || 'default' }
        : revising || input._feedbackMessage?.trim()
          ? { type: block.variant === 'post-plan' ? 'revise' : 'feedback', text: input._feedbackMessage?.trim() || 'Continue planning.' }
          : { type: 'cancel' };
      Promise.resolve().then(() => onDecision(block.id, response)).then(accepted => {
        if (accepted !== false) callbacks.onPosted?.();
        callbacks.onAnswered?.(accepted !== false);
      }, () => callbacks.onAnswered?.(false)).finally(() => { sending.current = false; });
      // Native Dc infers its mode from the original updated tool input. The
      // asynchronous delivery result goes back through its onAnswered callback.
      return input;
    };
    return h('div', { ref: root, 'data-claude-native-plan': '' },
      h(window.ClaudeMenuSource.PlanApproval, {
        tool, decide, trustForwardMode: 'acceptEdits', acceptOptions: ['acceptEdits'],
        defaultAcceptAllowed: true, onOpenPlan: block.plan ? openPlan : undefined,
        isPanelActive: !block.responsePending, isFocusedPane: true,
        hasComposerPopup: () => !!document.querySelector('[role="menu"], [role="listbox"], [role="dialog"]'),
        hasComposerDraft: () => !!document.querySelector('[contenteditable="true"]')?.textContent?.trim(),
      }));
  }
  function ImageAttachments({ images, imageSrc, onRemove, onOpen }) {
    const N = window.ClaudeNativeSource;
    if (!images?.length || !N) return null;
    return h('div', { 'data-cds-composer-attachments': '' },
      h(N.Attachments, { className: 'justify-start' }, images.map(image =>
        h(N.Attachments.Image, {
          key: image.id, src: imageSrc(image), alt: image.name || 'Attached image',
          onClick: () => onOpen(image), onRemove: () => onRemove(image.id),
          removeLabel: '移除图片', 'data-sidebar-image-attachment': '',
        }))));
  }
  window.ClaudeSidebarUI = Object.freeze({
    ImageAttachments,
    visibleBlocks,
    Ready,
    Column,
    ConversationTurn,
    ComposerRoot,
    ComposerFooter,
    ComposerControls,
    Interaction,
  });
})();
