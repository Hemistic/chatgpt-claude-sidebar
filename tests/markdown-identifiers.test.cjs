'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadRenderer() {
  const React = { createElement: (type, props, ...children) => ({ type, props, children }),
    useCallback: fn => fn, useEffect() {}, useLayoutEffect() {}, useMemo: fn => fn(),
    useRef: value => ({ current: value }), useState: value => [value, () => {}] };
  const window = { __CLAUDIAN_ENABLE_TESTING__: true, location: { search: '', href: 'file:///sidebar.html' },
    addEventListener() {}, removeEventListener() {} };
  window.parent = window;
  const context = { React, ReactDOM: { createRoot: () => ({ render() {} }) }, window,
    document: { documentElement: { dataset: {} }, getElementById: () => ({}) },
    URL, URLSearchParams, console, setTimeout, clearTimeout };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/claudian-sidebar-react.js'), 'utf8'), context);
  return window.__CLAUDIAN_SIDEBAR_TESTING__;
}
const renderer = loadRenderer();
const flatten = node => Array.isArray(node) ? node.map(flatten).join('') : typeof node === 'object' && node !== null ? flatten(node.children) : String(node ?? '');

test('model output preserves underscores inside identifiers and file names', () => {
  for (const input of ['SIDEBAR_CODEX_447c28f2', 'foo_bar_baz', 'file__name__v2.txt', '中文_变量_值', 'e\u0301_word_tail']) {
    assert.equal(flatten(renderer.renderInline(input, 'test', 0, {})), input);
  }
});

test('standalone Markdown emphasis and strong text still render', () => {
  for (const [input, tag, text] of [['_emphasis_', 'em', 'emphasis'], ['__strong__', 'strong', 'strong'], ['*emphasis*', 'em', 'emphasis'], ['**strong**', 'strong', 'strong']]) {
    const nodes = renderer.renderInline(input, 'test', 0, {});
    assert.equal(nodes[0].type, tag);
    assert.equal(flatten(nodes), text);
  }
});
