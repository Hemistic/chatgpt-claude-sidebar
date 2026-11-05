(function () {
  "use strict";
  const h = React.createElement;
  function Ready({ children }) {
    return h(window.ClaudeSidebarUI.Ready, null, children);
  }
  const Button = React.forwardRef(function Button(props, ref) {
    return h(Ready, null, (N) =>
      h(N.Button, { variant: "ghost", ...props, ref }),
    );
  });
  const names = {
    "square-pen": "Create",
    settings: "Settings",
    folder: "Folder",
    search: "Search",
    x: "X",
    "chevron-down": "CaretDown",
    "chevron-right": "CaretRight",
    "chevron-left": "CaretLeft",
    "message-square": "Chat",
    "messages-square": "Chats",
    terminal: "CommandLine",
    "file-pen": "Edit",
    "file-diff": "GitDiff",
    "list-checks": "Checklist",
    shield: "LockShield",
    "circle-help": "Help",
    file: "File",
    history: "History",
    plug: "Connectors",
    network: "Mcp",
    palette: "Palette",
    sliders: "Settings",
  };
  function Icon({ name, size = 16 }) {
    return h(Ready, null, (N) =>
      h(N.Icon, { name: names[name] || "Code", customSize: size }),
    );
  }
  function Row({
    title,
    icon,
    trailing,
    active,
    disabled,
    onSelect,
    indent = 0,
    className = "",
    ...attrs
  }) {
    return h(Ready, null, (N) =>
      h(
        N.Button,
        {
          ...attrs,
          variant: "ghost",
          size: "sm",
          disabled,
          pressed: !!active,
          render: h("div", { role: "button", tabIndex: disabled ? -1 : 0 }),
          className: `claude-sidebar-row ${className}`,
          "data-sidebar-cycle-item": "",
          onClick: onSelect,
          onKeyDown: (event) => {
            if (!disabled && ["Enter", " "].includes(event.key)) {
              event.preventDefault();
              onSelect?.();
            }
          },
        },
        h(
          "span",
          {
            className: "claude-sidebar-row-content",
            style: { paddingInlineStart: `${indent * 16}px` },
          },
          icon,
          h(
            "span",
            {
              dir: "auto",
              className: "claude-sidebar-row-title",
              title: typeof title === "string" ? title : undefined,
            },
            title,
          ),
          trailing,
        ),
      ),
    );
  }
  window.ClaudeShellUI = Object.freeze({ Button, Icon, Row });
})();
