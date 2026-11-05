(function (root) {
  'use strict';

  // One owner for transcript scrolling. Output never changes the user's choice
  // to pause following; only an explicit resume/new turn can do that.
  class TranscriptScroll {
    constructor(node, { following = true, top, onChange = () => {}, onPosition = () => {} } = {}) {
      this.node = node;
      this.view = node.ownerDocument.defaultView;
      this.onChange = onChange;
      this.onPosition = onPosition;
      this.following = following;
      this.frame = 0;
      this.destroyed = false;
      this.children = new Set();
      this.listeners = [];
      this.lastState = '';
      this.touchY = null;
      if (!following && top !== undefined) node.scrollTop = top;
      this.lastTop = node.scrollTop;

      this.listen('wheel', event => {
        if (event.deltaY < 0 && !this.nestedCanScroll(event.target, event.deltaY)) this.pause();
      });
      this.listen('touchstart', event => { this.touchY = event.touches[0]?.clientY ?? null; });
      this.listen('touchmove', event => {
        const y = event.touches[0]?.clientY;
        if (y !== undefined && this.touchY !== null && y > this.touchY + 1 && !this.nestedCanScroll(event.target, -1)) this.pause();
        this.touchY = y ?? null;
      });
      this.listen('keydown', event => {
        if (event.target.closest?.('input,textarea,select,[contenteditable=true]')) return;
        if (['ArrowUp', 'PageUp', 'Home'].includes(event.key) && !this.nestedCanScroll(event.target, -1)) this.pause();
        if (event.key === 'End') { event.preventDefault(); this.resume(); }
      }, false);
      this.listen('scroll', () => {
        const top = node.scrollTop;
        // Native scrollbar dragging and accessibility scroll commands have no
        // wheel event. A real upward move away from the bottom also pauses.
        if (this.following && top < this.lastTop - 1 && this.distance() > 2) this.pause();
        this.lastTop = top;
        this.publish();
      });
      this.resizeObserver = new this.view.ResizeObserver(() => {
        // ResizeObserver runs before paint: keep one settled position per frame
        // instead of starting competing smooth scrolls after every token.
        this.flush();
      });
      this.resizeObserver.observe(node);
      this.syncChildren();
      this.mutationObserver = new this.view.MutationObserver(() => {
        this.syncChildren();
        this.schedule();
      });
      this.mutationObserver.observe(node, { childList: true, subtree: true, characterData: true });
      this.flush();
    }

    listen(type, handler, passive = true) {
      this.node.addEventListener(type, handler, { passive });
      this.listeners.push([type, handler]);
    }

    nestedCanScroll(target, delta) {
      for (let element = target; element && element !== this.node; element = element.parentElement) {
        if (element.scrollHeight <= element.clientHeight + 1) continue;
        if (!/auto|scroll/.test(this.view.getComputedStyle(element).overflowY)) continue;
        if (delta < 0 ? element.scrollTop > 0 : element.scrollTop + element.clientHeight < element.scrollHeight - 1) return true;
      }
      return false;
    }

    syncChildren() {
      const next = new Set(this.node.children);
      for (const child of this.children) if (!next.has(child)) this.resizeObserver.unobserve(child);
      for (const child of next) if (!this.children.has(child)) this.resizeObserver.observe(child);
      this.children = next;
    }

    distance() { return Math.max(0, this.node.scrollHeight - this.node.clientHeight - this.node.scrollTop); }

    publish() {
      if (this.destroyed) return;
      const showButton = !this.following && this.node.scrollHeight > this.node.clientHeight + 2;
      const key = `${this.following}:${showButton}`;
      this.node.dataset.autoScroll = String(this.following);
      this.onPosition(this.node.scrollTop);
      if (key === this.lastState) return;
      this.lastState = key;
      this.onChange({ following: this.following, showButton });
    }

    cancelFrame() {
      if (this.frame) this.view.cancelAnimationFrame(this.frame);
      this.frame = 0;
    }

    setFollowing(value) {
      if (this.destroyed) return;
      this.following = Boolean(value);
      this.cancelFrame();
      if (this.following) this.flush();
      else this.publish();
    }

    pause() { this.setFollowing(false); }
    resume() { this.setFollowing(true); }

    flush() {
      this.cancelFrame();
      if (this.destroyed) return;
      if (this.following) {
        const bottom = Math.max(0, this.node.scrollHeight - this.node.clientHeight);
        if (Math.abs(this.node.scrollTop - bottom) > 0.5) this.node.scrollTop = bottom;
        this.lastTop = this.node.scrollTop;
      }
      this.publish();
    }

    schedule() {
      if (this.destroyed || this.frame) return;
      this.frame = this.view.requestAnimationFrame(() => { this.frame = 0; this.flush(); });
    }

    destroy() {
      this.destroyed = true;
      this.cancelFrame();
      this.resizeObserver.disconnect();
      this.mutationObserver.disconnect();
      for (const [type, handler] of this.listeners) this.node.removeEventListener(type, handler);
      this.children.clear();
    }
  }

  if (typeof module === 'object' && module.exports) module.exports = TranscriptScroll;
  else root.SidebarTranscriptScroll = TranscriptScroll;
})(typeof window === 'object' ? window : globalThis);
