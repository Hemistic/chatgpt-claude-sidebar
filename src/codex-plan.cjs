'use strict';

// Proposed specifications and execution progress lists are distinct protocol concepts.
function proposedPlan(text) {
  const match = String(text || '').match(/<proposed_plan>\s*([\s\S]*?)\s*<\/proposed_plan>/i);
  return match?.[1]?.trim() || null;
}

class CodexPlan {
  constructor(enabled = false) { this.enabled = enabled; this.text = ''; this.authoritative = false; }
  delta(text) {
    this.enabled = true;
    if (!this.authoritative) this.text = (this.text + String(text || '')).slice(0, 160000);
    return this.text;
  }
  capture(text, native = false) {
    const plan = native ? String(text || '').trim() : this.enabled ? proposedPlan(text) : null;
    if (!plan) return false;
    if (native || !this.authoritative) this.text = plan.slice(0, 160000);
    if (native) this.authoritative = true;
    this.enabled = true;
    return true;
  }
  completed(status) { return status === 'completed' ? this.text.trim() : ''; }
}

module.exports = { CodexPlan, proposedPlan };
