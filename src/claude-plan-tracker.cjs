'use strict';
const path = require('node:path');
const os = require('node:os');

// ExitPlanMode can contain only allowedPrompts. Bind its missing text to a
// successful tool call from this launch, never to the newest global plan file.
class ClaudePlanTracker {
  constructor(directories = [path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'plans')]) {
    this.directories = directories.map(directory => path.resolve(directory));
    this.tools = new Map();
    this.generation = 0;
    this.sequence = 0;
    this.latest = null;
    this.enterId = null;
  }
  observe(id, name, input) {
    if (name === 'EnterPlanMode' && id !== this.enterId) {
      this.enterId = id;
      this.generation++;
      this.latest = null;
      this.tools.clear();
    }
    if (!id || !['Write', 'Edit', 'Read', 'MultiEdit'].includes(name)) return;
    const file = input?.file_path;
    if (typeof file !== 'string' || !path.isAbsolute(file) || !/\.md$/i.test(file)) return;
    const absolute = path.resolve(file);
    if (!this.directories.some(directory => {
      const relative = path.relative(directory, absolute);
      return relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep);
    })) return;
    if (!this.tools.has(id)) this.tools.set(id, { file: absolute, generation: this.generation, sequence: ++this.sequence });
  }
  complete(id, failed) {
    const entry = this.tools.get(id);
    if (!entry || failed || entry.generation !== this.generation) return;
    if (!this.latest || entry.sequence >= this.latest.sequence) this.latest = entry;
  }
  get filePath() { return this.latest?.file || ''; }
}
module.exports = { ClaudePlanTracker };
