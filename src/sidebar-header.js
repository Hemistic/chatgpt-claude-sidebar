(function () {
  "use strict";
  const h = React.createElement;
  function Header({
    providerId,
    busy,
    onProvider,
    locale,
    workspace,
    Icon: HostIcon,
    ProviderIcon,
    onNew,
    onSettings,
    title,
    tabs = [],
    histories = [],
    api,
    activeId,
    onSwitch,
    onCloseTab,
    onOpenHistory,
    onOpenNativeHistory,
    maxTabs,
  }) {
    const Icon = providerId === "claude" ? window.ClaudeShellUI.Icon : HostIcon;
    const Button =
      providerId === "claude" ? window.ClaudeShellUI.Button : "button";
    const railRef = React.useRef(null),
      menuRef = React.useRef(null),
      scrollRef = React.useRef(null);
    const [open, setOpen] = React.useState(false),
      [query, setQuery] = React.useState(""),
      [count, setCount] = React.useState(0);
    const [expanded, setExpanded] = React.useState(false);
    const hover = React.useRef({ inside: false, suppress: false, engine: null });
    const hoverTimer = React.useRef(null);
    const otherProvider = providerId === "codex" ? "claude" : "codex";
    const clearHover = () => {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    };
    React.useEffect(() => () => clearTimeout(hoverTimer.current), []);
    function pointerMove(event) {
      // The recent menu is a descendant, but hovering it must not expand the rail.
      const rect = event.currentTarget.getBoundingClientRect();
      const inside =
        event.clientY >= rect.top &&
        event.clientY < rect.bottom &&
        event.clientX >= rect.left &&
        event.clientX < rect.right;
      if (!inside) {
        leave();
        return;
      }
      if (event.pointerType === "touch") return;
      if (!hover.current.inside) {
        hover.current.inside = true;
        if (!hover.current.suppress)
          hoverTimer.current = setTimeout(() => {
            if (hover.current.inside && !hover.current.suppress)
              setExpanded(true);
          }, 120);
      }
    }
    function leave() {
      clearHover();
      hover.current = { inside: false, suppress: false, engine: null };
      setExpanded(false);
    }
    function collapse() {
      clearHover();
      hover.current.suppress = hover.current.inside;
      setExpanded(false);
    }
    React.useEffect(() => {
      // Switching providers replaces their native button elements. Observe the
      // document as well so removal of a hovered element cannot swallow leave.
      const outside = (event) => {
        const rect = railRef.current?.getBoundingClientRect();
        if (hover.current.inside && rect &&
            (event.clientX < rect.left || event.clientX >= rect.right ||
             event.clientY < rect.top || event.clientY >= rect.bottom)) leave();
      };
      document.addEventListener("pointermove", outside);
      window.addEventListener("blur", leave);
      return () => {
        document.removeEventListener("pointermove", outside);
        window.removeEventListener("blur", leave);
      };
    }, []);
    function selectProvider(id, event) {
      collapse();
      if (id !== providerId) {
        if (!busy) onProvider(id);
        close();
      } else if (menuRef.current) menuRef.current.open = !menuRef.current.open;
    }
    const close = () => {
      if (menuRef.current) menuRef.current.open = false;
      setOpen(false);
    };
    React.useEffect(() => {
      const dismiss = (event) => {
        if (
          event.type === "keydown"
            ? event.key === "Escape"
            : !menuRef.current?.parentElement?.contains(event.target)
        ) {
          close();
          if (event.type === "keydown")
            menuRef.current?.querySelector("summary")?.focus();
        }
      };
      document.addEventListener("pointerdown", dismiss);
      document.addEventListener("keydown", dismiss);
      return () => {
        document.removeEventListener("pointerdown", dismiss);
        document.removeEventListener("keydown", dismiss);
      };
    }, []);
    React.useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [query, open]);
    React.useLayoutEffect(() => {
      collapse();
      close();
    }, [activeId, providerId]);
    const index = tabs.findIndex((tab) => tab.id === activeId);
    const currentTitle = window.SidebarConversationData.title(
      { ...tabs[index], title: title || tabs[index]?.title },
      Math.max(0, index),
      locale,
    );
    function navigate(event) {
      if (
        event.target.closest("input,textarea") ||
        !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
      )
        return;
      const rows = [
        ...menuRef.current.querySelectorAll("[data-sidebar-cycle-item], [data-row-main-button], [data-group-toggle]"),
      ];
      if (!rows.length) return;
      const index = rows.indexOf(document.activeElement);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? rows.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + rows.length) %
              rows.length;
      event.preventDefault();
      rows[next].focus();
      rows[next].scrollIntoView({ block: "nearest" });
    }
    function containWheel(event) {
      const scroll = scrollRef.current;
      if (
        !scroll?.contains(event.target) ||
        (event.deltaY < 0 && scroll.scrollTop <= 0) ||
        (event.deltaY > 0 &&
          scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 1)
      )
        event.preventDefault();
      event.stopPropagation();
    }
    React.useEffect(() => {
      const node = menuRef.current?.querySelector(
        "[data-conversation-menu]",
      );
      if (!node) return;
      node.addEventListener("wheel", containWheel, { passive: false });
      return () => node.removeEventListener("wheel", containWheel);
    }, [open]);
    return h(
      "header",
      { className: "sidebar-header" },
      h(
        "div",
        { className: "sidebar-header-main" },
        h(
          "div",
          {
            className: "sidebar-provider-switch",
            ref: railRef,
            "aria-label": "CLI 切换",
            "data-expanded": expanded,
            onPointerEnter: pointerMove,
            onPointerMove: pointerMove,
            onPointerLeave: leave,
          },
          h(
            "details",
            {
              className: "sidebar-engine-menu",
              ref: menuRef,
              onToggle: (event) => {
                setOpen(event.currentTarget.open);
                if (event.currentTarget.open) setQuery("");
              },
            },
            h(
              "summary",
              {
                className: "sidebar-logo-button",
                "aria-label": "近期对话",
                title: `近期对话 · ${providerId === "claude" ? "Claude Code" : "OpenAI Codex"}`,
                onClick: collapse,
                onKeyDown: (event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    clearHover();
                    setExpanded(true);
                    const id = event.key === "ArrowLeft" ? providerId : otherProvider;
                    requestAnimationFrame(() => railRef.current?.querySelector('[data-engine="' + id + '"]')?.focus());
                  }
                },
              },
              h(ProviderIcon, { providerId, size: 19 }),
            ),
            open ? h(providerId === 'claude' ? window.ClaudeConversationMenu : window.CodexConversationMenu, {
              key:providerId, providerId, api, tabs, histories, workspace, activeId,
              query, setQuery, Icon, onSwitch, onCloseTab, onOpenHistory,
              onOpenNativeHistory, onClose:close, onCount:setCount,
              scrollRef, onKeyDown:navigate,
              onNew:()=>{onNew();close()}, canNew:tabs.length<maxTabs,
            }) : null,
          ),
          [providerId, otherProvider].map((id) => h(
            Button,
            {
              key: id,
              type: "button",
              className: (id === "codex" ? "sidebar-codex-button" : "sidebar-anthropic-button") + " sidebar-cli-button",
              "data-engine": id,
              "data-active": providerId === id,
              "aria-label": id === "codex" ? "切换到 OpenAI Codex" : "切换到 Anthropic Claude Code",
              "aria-pressed": providerId === id,
              "aria-hidden": !expanded,
              tabIndex: expanded ? 0 : -1,
              title: busy ? "当前任务结束后可切换 CLI" : id === "codex" ? "OpenAI · Codex" : "Anthropic · Claude Code",
              disabled: busy && providerId !== id,
              onClick: (event) => selectProvider(id, event),
            },
            h(ProviderIcon, { providerId: id, size: 19 }),
          )),
        ),
        h(
          "div",
          {
            className: "sidebar-current-title",
            title: currentTitle,
            "aria-label": "当前对话标题",
          },
          currentTitle,
        ),
        h(
          "div",
          { className: "sidebar-header-actions" },
          h(
            Button,
            {
              type: "button",
              className: "sidebar-icon-button",
              onClick: () => {
                close();
                onNew();
              },
              "aria-label": "新对话",
              disabled: tabs.length >= maxTabs,
              title: tabs.length >= maxTabs ? `已打开 ${maxTabs} 个会话，请先关闭一个会话` : "新对话",
            },
            h(Icon, { name: "square-pen", size: 18 }),
          ),
          h(
            Button,
            {
              type: "button",
              className: "sidebar-icon-button",
              onClick: () => {
                close();
                onSettings();
              },
              "aria-label": "设置",
              title: "设置",
            },
            h(Icon, { name: "settings", size: 18 }),
          ),
        ),
      ),
    );
  }
  window.SidebarHeaderController = Header;
})();
