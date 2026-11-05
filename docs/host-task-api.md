# Active-conversation host tasks

Trusted iframe parents can send `{type:'ai-sidebar:request-task',payload:{id,workspace,text}}`. The sidebar replies with `{type:'ai-sidebar:task-accepted',payload:{id,ok,error?,retry?}}`.

The request targets the active conversation and preserves its provider, model, permission mode and sandbox. It does not overwrite the composer draft or use shell-task permission defaults. Duplicate IDs are acknowledged once; a busy runtime or mismatched workspace is refused; initialization returns retry. An acknowledgement means handoff, not completion. Observe runtime events for errors, usage and completion.

Validated in the real LaTeX Studio host on 2026-11-05 with Codex GPT-6.1 Sol/high and Claude claude-haiku-5-5/high. Both read randomized fixture files through real tools and displayed streamed replies. Markdown inline AI was also verified: Codex accept/save, Claude reject/retain. Screenshots and native usage records are retained by the host's migration report. No product model or permission defaults were changed.
