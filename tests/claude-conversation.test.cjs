const test = require("node:test"),
  assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs"),
  path = require("node:path");
const context = { React: { createElement() {} }, window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "../src/claude-surface.js"), "utf8"),
  context,
);
const visible = context.window.ClaudeSidebarUI.visibleBlocks;
test("Claude failure shown once across assistant, result and process error reports", () => {
  const detail = "Failed to authenticate. API Error: 403 Not enough quota";
  const blocks = [
    { type: "text", content: "Runtime error: authentication_failed" },
    { type: "text", content: detail },
    { type: "text", content: "Runtime error: " + detail },
    {
      type: "text",
      content: "Runtime error: Claude Code returned an error result: " + detail,
    },
  ];
  assert.equal(visible(blocks).length, 1);
  assert.equal(visible(blocks)[0].content, detail);
});
test("Claude presentation retains different failures, normal repeated text and tool results", () => {
  const blocks = [
    { type: "text", content: "repeat" },
    { type: "text", content: "repeat" },
    { type: "text", content: "Runtime error: distinct" },
    { type: "tool_use", content: "repeat" },
  ];
  assert.equal(visible(blocks).length, 4);
});
