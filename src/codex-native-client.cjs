'use strict';

const requiredText = (value, name, limit = 500) => {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error(`Invalid ${name}`);
  return value.trim();
};
const pageLimit = value => Math.max(1, Math.min(100, Number.isInteger(value) ? value : 30));
const cursor = value => typeof value === 'string' && value.length <= 10000 ? value : null;

function reviewTarget(command) {
  const args = String(command || '').replace(/^\/review\b/i, '').trim();
  if (!args) return { type: 'uncommittedChanges' };
  if (args.startsWith('--base ')) return { type: 'baseBranch', branch: requiredText(args.slice(7), 'base branch') };
  if (args.startsWith('--commit ')) return { type: 'commit', sha: requiredText(args.slice(9), 'commit', 100) };
  return { type: 'custom', instructions: requiredText(args, 'review instructions', 16000) };
}

function publicAccount(response) {
  const account = response?.account;
  return { requiresOpenaiAuth: response?.requiresOpenaiAuth === true,
    account: account ? { type: account.type, planType: account.planType || null,
      email: typeof account.email === 'string' ? account.email : null } : null };
}

function parseReview(text) {
  try {
    const value = JSON.parse(String(text || '').replace(/^```(?:json)?\s*|\s*```$/g, ''));
    return Array.isArray(value?.findings) && typeof value.overall_explanation === 'string' ? value : null;
  } catch { return null; }
}

class CodexNativeClient {
  constructor(request) { this.request = request; this.unsupported = new Set(); }

  async call(method, params = {}) {
    if (this.unsupported.has(method)) throw Object.assign(new Error(`CLI does not support ${method}`), { code: 'UNSUPPORTED_METHOD' });
    try { return await this.request(method, params, 30000); }
    catch (error) {
      if (error.code === -32601 || /method not found|unknown (?:method|variant)|unsupported method/i.test(error.message || '')) {
        this.unsupported.add(method);
        throw Object.assign(new Error(`CLI does not support ${method}`), { code: 'UNSUPPORTED_METHOD' });
      }
      throw error;
    }
  }

  async status() {
    const [account, limits] = await Promise.allSettled([
      this.call('account/read', { refreshToken: false }), this.call('account/rateLimits/read'),
    ]);
    return {
      account: account.status === 'fulfilled' ? publicAccount(account.value) : null,
      rateLimits: limits.status === 'fulfilled' ? limits.value : null,
      errors: [account, limits].filter(result => result.status === 'rejected').map(result => result.reason.message),
    };
  }

  async models() {
    const models = [], seen = new Set(); let next = null;
    for (let page = 0; page < 20; page++) {
      const response = await this.call('model/list', { cursor: next, limit: 100, includeHidden: false });
      models.push(...(response.data || []));
      next = response.nextCursor;
      if (!next) return models;
      if (seen.has(next)) throw new Error('CLI repeated the model pagination cursor');
      seen.add(next);
    }
    throw new Error('CLI model catalog exceeded 20 pages');
  }

  threads(params = {}, workspace) {
    return this.call('thread/list', { cursor: cursor(params.cursor), limit: pageLimit(params.limit),
      sortKey: 'updated_at', sortDirection: 'desc', cwd: params.allProjects === true ? null : workspace,
      archived: params.archived === true,
      ...(params.search ? { searchTerm: requiredText(params.search, 'search', 500) } : {}) });
  }

  async history(params = {}) {
    const threadId = requiredText(params.threadId, 'threadId');
    const [metadata, turns] = await Promise.all([
      this.call('thread/read', { threadId, includeTurns: false }),
      this.call('thread/turns/list', { threadId, cursor: cursor(params.cursor), limit: pageLimit(params.limit), itemsView: 'full', sortDirection: 'desc' }),
    ]);
    return { thread: metadata.thread, ...turns };
  }

  rename(params = {}) {
    return this.call('thread/name/set', { threadId: requiredText(params.threadId, 'threadId'), name: requiredText(params.name, 'thread name', 200) });
  }

  goal(params = {}) {
    const threadId = requiredText(params.threadId, 'threadId');
    if (params.action === 'goalGet') return this.call('thread/goal/get', { threadId });
    if (params.action === 'goalClear') return this.call('thread/goal/clear', { threadId, origin: 'user' });
    const patch = { threadId, origin: 'user' };
    if (params.objective !== undefined) patch.objective = requiredText(params.objective, 'goal objective', 4000);
    if (params.status !== undefined) {
      if (!['active', 'paused', 'complete'].includes(params.status)) throw new Error('Invalid user goal status');
      patch.status = params.status;
    }
    if (params.tokenBudget !== undefined) {
      if (params.tokenBudget !== null && (!Number.isSafeInteger(params.tokenBudget) || params.tokenBudget <= 0)) throw new Error('Invalid goal token budget');
      patch.tokenBudget = params.tokenBudget;
    }
    if (Object.keys(patch).length === 2) throw new Error('Goal update is empty');
    return this.call('thread/goal/set', patch);
  }

  async queue(params = {}) {
    const threadId = requiredText(params.threadId, 'threadId');
    const input = () => [{ type: 'text', text: requiredText(params.text, 'queued message', 128000) }];
    const queuedSubmissionId = () => requiredText(params.id, 'queued submission id');
    switch (params.action) {
      case 'queueList': {
        const data = [], seen = new Set(); let next = null;
        do {
          const page = await this.call('thread/queue/list', { threadId, cursor: next, limit: 100 });
          data.push(...(page.data || [])); next = page.nextCursor;
          if (next && seen.has(next)) throw new Error('CLI repeated the queue cursor');
          if (next) seen.add(next);
          if (data.length > 100) throw new Error('CLI queue exceeded 100 messages');
        } while (next);
        return { data };
      }
      case 'queueAdd': return this.call('thread/queue/add', { threadId, clientUserMessageId: requiredText(params.clientId, 'client message id'), input: input() });
      case 'queueUpdate': return this.call('thread/queue/update', { threadId, queuedSubmissionId: queuedSubmissionId(), input: input() });
      case 'queueDelete': return this.call('thread/queue/delete', { threadId, queuedSubmissionId: queuedSubmissionId() });
      case 'queueReorder': {
        if (!Array.isArray(params.ids) || params.ids.length > 100 || new Set(params.ids).size !== params.ids.length) throw new Error('Invalid queue order');
        const ids = params.ids.map(id => requiredText(id, 'queued submission id'));
        return this.call('thread/queue/reorder', { threadId, queuedSubmissionIds: ids });
      }
      case 'queueStart': return this.call('thread/queue/start', { threadId, queuedSubmissionId: params.id ? queuedSubmissionId() : null });
      default: throw new Error('Unsupported queue action');
    }
  }

  async action(payload, workspace) {
    switch (payload.action) {
      case 'status': return this.status();
      case 'models': return this.models();
      case 'threads': return this.threads(payload, workspace);
      case 'history': return this.history(payload);
      case 'rename': return this.rename(payload);
      case 'archive': return this.call('thread/archive', { threadId: requiredText(payload.threadId, 'threadId') });
      case 'unarchive': return this.call('thread/unarchive', { threadId: requiredText(payload.threadId, 'threadId') });
      case 'goalGet': case 'goalSet': case 'goalClear': return this.goal(payload);
      case 'queueList': case 'queueAdd': case 'queueUpdate': case 'queueDelete': case 'queueReorder': case 'queueStart': return this.queue(payload);
      default: throw new Error(`Unsupported Codex sidebar action: ${payload.action}`);
    }
  }
}

module.exports = { CodexNativeClient, reviewTarget, publicAccount, parseReview };
