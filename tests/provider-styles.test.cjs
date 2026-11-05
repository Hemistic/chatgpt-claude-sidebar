const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  postcss = require("postcss");
const root = path.join(__dirname, "..");
test("Claude and Codex activate disjoint style sheets in both switch directions", () => {
  const html = fs.readFileSync(
    path.join(root, "src/claudian-sidebar.html"),
    "utf8",
  );
  const links = [
    ...html.matchAll(
      /<link rel="stylesheet" href="([^"]+)" data-provider-style="([^"]+)"/g,
    ),
  ].map(([, href, provider]) => ({
    href,
    dataset: { providerStyle: provider },
    sheet:{cssRules:[],media:{mediaText:provider === 'claude' ? 'not all' : 'all'}},
    // A linked sheet is already loaded. Mutating these would restart its load
    // in Chromium and regress the blank/unstyled frame during switching.
    set media(value) { throw new Error('Do not reload a loaded stylesheet'); },
    set disabled(value) { throw new Error('Do not disable a stylesheet link'); },
  }));
  assert.equal(
    links.length,
    (html.match(/<link rel="stylesheet"/g) || []).length,
    "Every stylesheet must have one provider owner",
  );
  const attrs = {},
    documentElement = {
      dataset: {},
      setAttribute: (k, v) => (attrs[k] = v),
      removeAttribute: (k) => delete attrs[k],
    };
  const window = {};
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "src/sidebar-provider-styles.js"), "utf8"),
    { window, document: { querySelectorAll: () => links, documentElement } },
  );
  for (const provider of ["claude", "codex", "claude", "codex"]) {
    window.SidebarProviderStyles.apply(provider);
    const active = links.filter((l) => !l.sheet.disabled && l.sheet.media.mediaText === "all");
    assert.ok(active.length);
    assert.ok(active.every((l) => l.dataset.providerStyle === provider));
    assert.ok(links.every(l => (l.dataset.providerStyleActive === "true") === active.includes(l)));
    if (provider === "claude")
      assert.deepEqual(active.map((l) => l.href).sort(), [
        "./claude-controls.source.css",
        "./claude-conversation-menu.css",
        "./claude-math.source.css",
        "./claude-shell.css",
        "./claude-surface.css",
        "./claude-ui.source.css",
      ]);
    assert.equal(documentElement.dataset.sidebarProvider, provider);
  }
});
test("Claude host styles use defined Claude tokens and no Codex palette", () => {
  const native = new Set();
  postcss
    .parse(fs.readFileSync(path.join(root, "src/claude-ui.source.css"), "utf8"))
    .walkDecls((d) => {
      if (d.prop.startsWith("--")) native.add(d.prop);
    });
  for (const file of ["claude-shell.css", "claude-surface.css", "claude-conversation-menu.css"]) {
    const text = fs.readFileSync(path.join(root, "src", file), "utf8");
    assert.doesNotMatch(text, /var\(--(?:sidebar-|color-|aif-|font-sans\b)/);
    postcss.parse(text).walkDecls((d) => {
      for (const m of d.value.matchAll(/var\((--cds-[\w-]+)/g))
        assert.ok(native.has(m[1]), "Undefined Claude token " + m[1]);
    });
  }
});

