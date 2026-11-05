(function () {
  "use strict";
  const h = React.createElement;
  function useConversations({
    providerId,
    api,
    tabs,
    histories,
    workspace,
    activeId,
    query,
    Icon,
    onSwitch,
    onCloseTab,
    onOpenHistory,
    onOpenNativeHistory,
    onClose,
    onCount,
  }) {
    const [native, setNative] = React.useState([]),
      [next, setNext] = React.useState(null);
    const [loading, setLoading] = React.useState(true),
      [error, setError] = React.useState("");
    const [opening, setOpening] = React.useState(null),
      [collapsed, setCollapsed] = React.useState({});
    const generation = React.useRef(0),
      seen = React.useRef(new Set());
    async function load(cursor, epoch) {
      setLoading(true);
      setError("");
      try {
        // Filter names AND project paths locally; server search only covers names.
        const response = await api.codexAction({
          action: "threads",
          allProjects: true,
          cursor,
          limit: 100,
        });
        if (epoch !== generation.current) return;
        if (!response?.ok) throw Error(response?.error || "无法读取近期会话");
        const page = response.data;
        if (page.nextCursor && seen.current.has(page.nextCursor))
          throw Error("CLI 返回了重复分页，已停止加载");
        if (page.nextCursor) seen.current.add(page.nextCursor);
        setNative((current) =>
          cursor
            ? [
                ...current,
                ...(page.data || []).filter(
                  (item) => !current.some((old) => old.id === item.id),
                ),
              ]
            : page.data || [],
        );
        setNext(page.nextCursor || null);
      } catch (e) {
        if (epoch === generation.current) setError(e.message);
      } finally {
        if (epoch === generation.current) setLoading(false);
      }
    }
    React.useEffect(() => {
      const epoch = ++generation.current;
      setNative([]);
      setNext(null);
      setLoading(true);
      seen.current.clear();
      const timer = providerId === "codex" ? setTimeout(() => load(null, epoch), 180) : null;
      if (providerId !== "codex") setLoading(false);
      return () => {
        clearTimeout(timer);
        generation.current++;
      };
    }, [api, providerId]);
    const groups = window.SidebarConversationData.group({
      providerId,
      tabs,
      histories,
      native,
      workspace,
      query,
    });
    const count = groups.reduce((sum, group) => sum + group.entries.length, 0);
    React.useEffect(() => onCount?.(count), [count, onCount]);
    async function open(entry) {
      setOpening(entry.key);
      setError("");
      try {
        if (entry.kind === "tab") onSwitch(entry.item.id);
        else if (entry.kind === "native") await onOpenNativeHistory(entry.item);
        else await onOpenHistory(entry.item.id);
        onClose();
      } catch (e) {
        setError(e.message);
      } finally {
        setOpening(null);
      }
    }
    return {groups,count,loading,error,opening,collapsed,open,
      more:next?()=>load(next,generation.current):null,
      retry:()=>load(next,generation.current),
      toggle:key=>setCollapsed(current=>({...current,[key]:!current[key]}))};
  }
  window.SidebarConversationHooks=Object.freeze({useConversations});
})();
