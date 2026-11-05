# ChatGPT conversation presentation source

The conversation UI is now ported from the locally installed ChatGPT frontend in
OpenAI.Codex_26.1023.6621.0_x64__2p2nqsd0c76g0/app/resources/app.asar.
This is the shipped, compiled JavaScript and CSS. It is not the private original
TypeScript repository. Screenshots are used for QA, rather than to infer this
component layout. Exact resource names, byte counts and SHA-256 digests are pinned
in [chatgpt-source-manifest.json](chatgpt-source-manifest.json).

## Source-to-component mapping

| Installed resource | Inspected component | Local implementation |
| --- | --- | --- |
| app-initial-db76c3384587.js | ComposerLayout, adaptive footer, leading/input/trailing slots (l1n, _1n, y1n, b1n) | src/chatgpt-surface.js |
| app-initial-161052524772.css | ComposerLayout CSS module _1q7o3 | src/chatgpt-composer.source.css |
| chatgpt-conversation-transcript-44ed78f18faa.js | transcript/turn grouping | src/chatgpt-surface.js, src/codex-conversation.js |
| chatgpt-conversation-turn-content-9ed3e4450cf3.js | message author wrapper, user text, assistant content | src/chatgpt-surface.js, src/codex-conversation.js |
| user-message-b08fde1ac39f.js | user message content and in-flow action controls (jt) | src/chatgpt-surface.js |
| app-primary-83c2b5ae05b6.js | UserMessageBubble (Ngn) | src/chatgpt-surface.js |
| app-primary-4ccde6131b6d.css | message bubble CSS module _168sz | src/chatgpt-composer.source.css |
| app-shared-398c891a59df.css | system font, spacing, neutral palette, composer and message tokens | src/chatgpt-surface.css |

ComposerLayout and bubble CSS selectors/declarations are copied from the pinned
resources, with whitespace expanded. Their original CSS-module names are retained.
To reproduce or check the import from the pinned local installation:

    node scripts/import-chatgpt-presentation.cjs
    node scripts/import-chatgpt-presentation.cjs --check

A different archive may be specified with --asar=<absolute path>. Changed source
filenames/boundaries fail explicitly; importing a new release needs a deliberate
manifest and adapter update.

## Independent host integration

src/chatgpt-surface.js owns the message frame and ComposerLayout DOM. Its slots
receive the existing textarea, context attachments, model/effort controls,
permissions and send/stop actions. These components are enabled only for Codex; Claude uses its own source components and exclusive stylesheets.
No authentication, telemetry, native RPC, remote service code or app bundle is
loaded from the installed application at runtime.

src/chatgpt-surface.css contains the host token mapping and textarea/CLI slot
adaptations, separate from the imported component CSS. The sidebar retains its
single 40px header and existing inline settings/navigation. Conversation text and
input use 16px for the user's readability requirement. The empty multiline
composer is 96px tall: 44px input, 32px controls and 20px total spacing. Long drafts
grow up to 220px before scrolling. At 320px width the permission label collapses;
its icon and accessible label remain available.

Message actions occupy document flow rather than an absolute overlay. User text
preserves authored line breaks and punctuation; assistant text uses the existing
safe Markdown parser. Tool rows, plans and reviews use local CLI presentation
adapters. The microphone input button has been removed.

This is a source-based port of the conversation primitives and a standalone CLI
integration, not a redistribution of the complete ChatGPT application. It does
not imply that ChatGPT-only tools, account screens or every product state have
been reproduced or verified.

## Desktop approval source and style cascade (2026-10-29)

The approval surface now retains the shipped `R` (ComposerApprovalRequestCard),
`fRt` (BaseButton) and `sFn` (CompoundButton) render functions byte-for-byte in
`src/codex-approval.native.js`. This is compiled frontend code from the pinned
installation, not the private TypeScript repository. React compiler cache, local
translation, portal and keyboard services are bound by the independent host.
`src/codex-approval.js` only adapts CLI request data and decisions. In particular,
the native CLI's cancel-only rejection choice is preserved as a Cancel button.

`src/codex-desktop-theme.source.css` resolves the complete three-file CSS cascade
under `data-codex-window-type=electron`, `data-theme=dark`, with the native pure
theme function `p(defaults.dark, dark).variables` from app-theme-74be6a9cf7df.js.
The function runs in an isolated VM with no app startup, native bridge, DOM,
network or filesystem. CSS alone misses runtime control colors. The native
Tailwind property registrations are retained for gradients and focus rings.
`src/codex-approval.source.css` contains native utilities and scoped preflight.
Reference colors, radius, runtime version
and token count are recorded in `docs/codex-desktop-theme.json`. Rem values are
resolved against the reference document's 16px root to isolate legacy host CSS.

    node scripts/sync-codex-approval-source.cjs
    node scripts/sync-codex-approval-source.cjs --check
    electron scripts/resolve-codex-desktop-theme.cjs

The standalone bottom input slot shows the active approval/question instead of
duplicating it beside a composer. Question controls follow Joi/Doi/joi from
app-primary and Kr from pending-request-item-panel; these remain an adapter port,
not unchanged native render functions. Portal menu behavior, glyph bindings and
host readability settings are also host integrations. The current generated
desktop request theme is dark; light request parity has not been certified.

The top-left circle shows the current provider (OpenAI or the Claude flower)
and opens recent conversations grouped by full project path. Pointer hover
expands the switch capsule with OpenAI on the left and Claude on the right.
Moving into either logo switches CLI without a click or dropdown. The capsule
stays expanded while hovered and collapses on pointer exit; retained keyboard
focus does not keep it expanded. Revealing OpenAI under a stationary pointer
does not switch a Claude session. Header columns and dimensions stay fixed
across providers, while each provider retains its own typography. Debugging
examples are available only in Settings → 调试与样例. The current conversation title is centered and truncates at
the end. There is no permanent conversation drawer or message rail in
the standalone chat surface. Examples exercise production renderers with local
feedback and never start a CLI turn.

## Native Plan and implementation request

`src/codex-plan.native.js` retains unchanged `PlanSummary.X` and `Surface.p`,
including the original 320px collapsed preview, gradient, expand button, header
controls and transition configuration. `ImplementPlanRequest.Gr` uses the work
request-input panel with one implement option plus freeform feedback. Its native
implementation prefix is `PLEASE IMPLEMENT THIS PLAN:`. The prior custom three
buttons and always-expanded plan layout have been removed.

`src/codex-plan-bindings.js` supplies host Markdown, clipboard, file download,
motion and CLI decision services. The shared question panel remains the source-
based host adapter described above. Plans remain in the conversation and the
implementation request occupies the composer slot, as in the native component.

    node scripts/sync-codex-plan-source.cjs --check

## Native responsive reading column

`src/chatgpt-layout.source.css` imports the Electron layout variables from the
pinned shared CSS. The source's 48rem thread maximum resolves to 768px against
its native 16px root. Turns are centered within the full-width scroll surface;
the composer uses the original adjacent-width/overhang calculation and also
stops growing on wide windows.

The message adapter uses the regular Ngn / `_bubble_168sz_1` variant. Its width
is intrinsic to the text and the original `--user-chat-width` caps its maximum;
the 70% value is a maximum, not a fixed width. The Aeon compact variant's 456px
cap is no longer applied. The responsive geometry harness exercises short and
long content at 320, 440, 900, 1440 and 1920px without calling a model:

    npm start -- --responsive-test --sample=conversation --background-test

## Native sidebar rows and compact navigation

`src/sidebar-row.native.js` retains the unchanged `nX` row frame and `Cpn`
keyboard/click selection function from the pinned `app-primary` bundle. The
original `.sidebar-navigation` context supplies 30px rows, spacing, typography,
hover and active state styles. `src/sidebar-row.js` supplies actual workspace,
conversation, history and sample titles and local actions. The host header and
280px left-aligned popup are composed in `src/sidebar-header.js`; this does not
claim access to the private original TypeScript repository or an unchanged
complete ChatGPT application shell.

    node scripts/sync-codex-sidebar-source.cjs --check
    npm start -- --header-test --sample=conversation --background-test

The recent menu merges tabs, local history and the cross-project native catalog
by conversation identity. `sidebar-conversation-data.js` is the pure grouping
and deduplication layer; `sidebar-recent.js` owns paginated native reads and host
navigation. Only the list scrolls; native non-passive wheel handling consumes
boundary/header wheel input. The Claude flower reuses the existing
`ProviderIcon` / `CLAUDE_PATH` SVG, also used by the provider controls.

## Claude Code source surface

**2026-10-31 audit:** the current host surface is not a complete 1:1 port.
The generic model picker, permission state mapping, Markdown/code blocks,
editor bridge and host shell still differ. Source hashes certify imported
declarations; the 40-property fixture does not certify the full page.
See [the source audit](claude-source-audit-2026-10-31.md).
The subsequent model selector, local permission menu and native code-block port,
including real CLI rounds and screenshot review, is recorded in
[the source UI verification](claude-source-ui-2026-10-31.md).

Claude mode now uses a separate native surface from installed Claude Desktop
**2.9939.2.0**, under
`C:/Program Files/WindowsApps/Claude_2.9939.2.0_x64__pzs8sxrjxfjjc/app/resources/ion-dist/assets/v1`.
These are the shipped compiled JavaScript and CSS, not the private TypeScript
repository. No account configuration, credentials, application bootstrap or
telemetry services are imported.

Read source entry points:

| Source | Presentation code used |
| --- | --- |
| `cc43287c9-BAqI9kMU.js`, `cf74bc599-YPQxWtev.js` | Code scope, transcript hierarchy and native reading column context |
| `shared-10-DyE9O65j.js` `ow/MC/RC/NC` | User message, message actions and copy |
| `c71ec5fd2-CdLCGwFp.js` `T`; `shared-17-DnxarKHW.js` `Rb` | Assistant message and Prose root |
| `c099c328d-B_i6zFP6.js` `Kp/Dp/yp`; `cc70f2bdf-CvtDMb7_.js` `Ol/fl` | Code composer assembly, Enter/Stop controls, add menu, footer and picker templates |
| `shared-12-BqJE4_W4.js` `Bh/qm/rh` | Native frame, action slots and chin used by the Code assembly |
| `shared-15-KGWycdaF.js` `nF` | Original editor JSX, layout helpers and placeholder reservation |
| `c05970c42-Cb32PFgB.js` `G/yt` | Expandable tool/status rows |
| `c1c1ec7b9-BpMPRL5q.js` `hI/fI/wk/Zk/Ck/sk` | Approval, question, plan confirmation, option and radio markup |
| `cf6ae6197-H7y9eJvd.js`; `shared-16-C5v0iJbn.js` `Dp` | Approval card/body/heading and original guarded actions |
| `shared-frame-BgE9BXIr.js` `fc/my` | Native buttons, icons and popup menus |

`scripts/import-claude-ui.cjs` follows lexical presentation dependencies with an
AST. Original declaration bodies and extracted JSX expressions retain SHA-256
hashes in `docs/claude-ui-source-manifest.json`. Three native CSS sheets plus
module-level `data-inline-css` literals are imported, including question radio
marks and responsive approval actions. Font URLs are local; selectors are scoped
to Claude mode. Original CSS layer wrappers are flattened; pseudo-elements
remain outside selector `:is()`.

Styles are **exclusive by provider**. `sidebar-provider-styles.js` disables every
Codex, ChatGPT and legacy stylesheet in Claude mode, including the former shared
palette, navigation and settings CSS. Only `claude-ui.source.css`,
`claude-surface.css` and `claude-shell.css` are active. The two host adapter sheets
reference Claude's `--cds-*` tokens; no Codex palette aliases are read. Switching
back disables those three Claude sheets and restores the Codex set. Conversation
data and navigation logic are reusable; native controls and styles are separate.
Claude recent rows and header controls use native Claude Button/Icon components,
not the Codex SidebarRow. Hidden overlay state has explicit Claude-owned rules.

The Code composer follows **Kp → Fn/Bh → nF**, with the **Ol** chin and native
**fl** picker template. The previous generic `om` primary action is not used by
Code. Send is the native ghost ArrowReturn button and Stop is StopCircle; the
500ms Stop-to-Send guard comes from source constant `Lp`. Attachments use the
native add menu in the chin. The editor reads the real composer context for
multiline, start inset and trailing reservation; these values are not hardcoded.
`claude-code-composer.js` supplies CLI/draft services to the unchanged JSX.

The framework boundary binds the shipped React 19 component declarations to the
existing React 18 renderer. Context/ref and JSX render-prop compatibility are
adapted there. Host code supplies safe Markdown parsing, conversation data,
permission decisions, model selection, clipboard, and an existing-controller
contenteditable behind the unchanged native editor JSX. The complete TipTap
engine, app account/project shell, and every original Code subview are not
ported. Independent top navigation and settings remain host controls. This is
not a claim that the entire Claude application is pixel-identical in all states.

`standalone/claude-reference-test.cjs` renders native components against the
unmodified installed CSS in an isolated document and compares 40 computed
properties with the production scoped surface. The UI harness captures actual
Chromium images for chat, tools, changes, plans, plan feedback, approvals,
single/multiple questions, recovery, composer, model menu, switching back to
Codex, and widths 320/900/1440/1920. This comparison certifies those checked
properties, not every possible layout or component state.

    node scripts/import-claude-ui.cjs --check
    npm start -- --claude-ui-test --background-test
    npm start -- --claude-ui-test --real-claude-suite --background-test

The real test types through Chromium, checks multiline text, sends using the
native composer, and verifies a random file Read and streamed response. A CLI
service error remains a failed real test; UI samples never count as inference.

## Menus and day/night themes (2026-11-01)

Current Codex controls and themes are pinned to 26.1027.3384.0. Earlier conversation/approval/plan snapshots remain separately versioned. See [the current audit and real tests](menus-themes-2026-11-01.md), [control declarations](codex-controls-source-manifest.json) and [theme variables](codex-themes-source.json). Claude light/dark styles remain exclusive; no Codex CSS is enabled in Claude mode.
