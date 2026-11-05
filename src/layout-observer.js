(function () {
  'use strict';
  // Browser-service adapter for imported native layout hooks. Delivery on the
  // next frame prevents synchronous measure/write ResizeObserver feedback in
  // Chromium 132, while preserving native component render functions.
  const NativeResizeObserver = window.ResizeObserver;
  class LayoutObserver {
    constructor(callback) {
      this.entries = new Map();
      this.frame = 0;
      this.observer = new NativeResizeObserver(entries => {
        for (const entry of entries) this.entries.set(entry.target, entry);
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
          this.frame = 0;
          const pending = [...this.entries.values()];
          this.entries.clear();
          if (pending.length) callback(pending, this);
        });
      });
    }
    observe(target, options) { this.observer.observe(target, options); }
    unobserve(target) { this.observer.unobserve(target); this.entries.delete(target); }
    disconnect() {
      this.observer.disconnect();
      this.entries.clear();
      if (this.frame) cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
  }
  window.SidebarLayoutObserver = LayoutObserver;
  window.ResizeObserver = LayoutObserver;
})();
