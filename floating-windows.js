/**
 * FloatingWindows - A very lightweight, very dependency-free window management library.
 * @version 1.0.1
 * @license MIT
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.FloatingWindows = factory());
}(this, function () {
  'use strict';

  // ~~~
  // UTILITIES
  // ~~~
  const utils = {
    slugify(s) {
      return (s || '').toString().trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'win';
    },
    clamp(val, min, max) {
      return Math.max(min, Math.min(max, val));
    },
    generateId() {
      return 'fw-' + Math.random().toString(36).substr(2, 9);
    }
  };

  // ~~~
  // STORAGE - (Persistence)
  // ~~~
  class Storage {
    constructor(key = 'floating-windows') {
      this.key = key;
    }
    load() {
      try {
        const raw = localStorage.getItem(this.key);
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        console.warn('[FloatingWindows] Failed to load state:', e);
        return {};
      }
    }
    save(states) {
      try {
        localStorage.setItem(this.key, JSON.stringify(states));
      } catch (e) {
        console.warn('[FloatingWindows] Failed to save state:', e);
      }
    }
    get(winId) {
      return this.load()[winId] || null;
    }
    set(winId, patch) {
      if (!winId) return;
      const states = this.load();
      states[winId] = { ...(states[winId] || {}), ...patch };
      this.save(states);
    }
    delete(winId) {
      const states = this.load();
      delete states[winId];
      this.save(states);
    }
    clear() {
      try { localStorage.removeItem(this.key); } catch (e) {}
    }
  }

  // ~~~
  // SNAP ENGINE - Window snapping logic
  // ~~~
  class SnapEngine {
    constructor(opts = {}) {
      this.threshold = opts.threshold || 24;
      this.padding = opts.padding || 4;
      this.enabled = opts.enabled !== false;
    }
    findSnapTargets(win, allWindows, bounds) {
      if (!this.enabled) return { x: null, y: null };
      const left = parseInt(win.style.left, 10);
      const top = parseInt(win.style.top, 10);
      const width = win.offsetWidth;
      const height = win.offsetHeight;
      const horizCandidates = [];
      const vertCandidates = [];
      // Edge bounding
      horizCandidates.push({ x: bounds.minLeft, prio: 2 });
      horizCandidates.push({ x: bounds.maxLeft, prio: 2 });
      vertCandidates.push({ y: bounds.minTop, prio: 2 });
      vertCandidates.push({ y: bounds.maxTop, prio: 2 });
      // Other windows 
      allWindows.forEach(other => {
        if (other === win || other.classList.contains('fw-minimized')) return;
        const oLeft = other.offsetLeft;
        const oTop = other.offsetTop;
        const oW = other.offsetWidth;
        const oH = other.offsetHeight;
        horizCandidates.push({ x: oLeft, prio: 0 });
        horizCandidates.push({ x: oLeft + oW - width, prio: 0 });
        horizCandidates.push({ x: oLeft + oW + this.padding, prio: 1 });
        horizCandidates.push({ x: oLeft - width - this.padding, prio: 1 });
        vertCandidates.push({ y: oTop, prio: 0 });
        vertCandidates.push({ y: oTop + oH - height, prio: 0 });
        vertCandidates.push({ y: oTop + oH + this.padding, prio: 1 });
        vertCandidates.push({ y: oTop - height - this.padding, prio: 1 });
      });
      let bestX = { d: Infinity, x: null };
      horizCandidates.forEach(c => {
        const d = Math.abs(left - c.x);
        if (d <= this.threshold && (d < bestX.d || (d === bestX.d && c.prio < bestX.prio))) {
          bestX = { d, prio: c.prio, x: c.x };
        }
      });
      let bestY = { d: Infinity, y: null };
      vertCandidates.forEach(c => {
        const d = Math.abs(top - c.y);
        if (d <= this.threshold && (d < bestY.d || (d === bestY.d && c.prio < bestY.prio))) {
          bestY = { d, prio: c.prio, y: c.y };
        }
      });
      return {
        x: bestX.d <= this.threshold ? bestX.x : null,
        y: bestY.d <= this.threshold ? bestY.y : null
      };
    }
  }

  // ~~~
  // DOCK - Container for minimized windows
  // ~~~
  class Dock {
    constructor(manager, opts = {}) {
      this.manager = manager;
      this.position = opts.position || 'top';
      this.element = null;
      this.buttons = new Map();
    }
    init() {
      if (this.position === 'none') return;
      this.element = document.createElement('div');
      this.element.className = 'fw-dock';
      this.element.setAttribute('data-position', this.position);
      const inner = document.createElement('div');
      inner.className = 'fw-dock-inner';
      this.element.appendChild(inner);
      if (this.position === 'top') {
        const anchor = this.manager.options.dockAnchor 
          ? document.querySelector(this.manager.options.dockAnchor) : null;
        if (anchor) anchor.parentNode.insertBefore(this.element, anchor.nextSibling);
        else document.body.prepend(this.element);
      } else if (this.position === 'bottom-right') {
        this.element.classList.add('fw-dock-floating');
        document.body.appendChild(this.element);
      } else if (typeof this.position === 'string') {
        const target = document.querySelector(this.position);
        if (target) target.appendChild(this.element);
      }
    }
    add(win) {
      if (!this.element || this.position === 'none') return;
      const btn = document.createElement('button');
      btn.className = 'fw-dock-btn';
      btn.type = 'button';
      btn.textContent = (win.title || '•').slice(0, 12);
      btn.title = win.title;
      btn.addEventListener('click', () => win.restore());
      this.element.querySelector('.fw-dock-inner').appendChild(btn);
      this.buttons.set(win.id, btn);
      this.element.classList.add('fw-dock-visible');
    }
    remove(winId) {
      const btn = this.buttons.get(winId);
      if (btn) { btn.remove(); this.buttons.delete(winId); }
      if (this.buttons.size === 0 && this.element) {
        this.element.classList.remove('fw-dock-visible');
      }
    }
    destroy() {
      if (this.element) { this.element.remove(); this.element = null; }
      this.buttons.clear();
    }
  }

  // ~~~
  // WINDOW - Individual window instance
  // ~~~
  class Window {
    constructor(manager, title, opts = {}) {
      this.manager = manager;
      this.title = title;
      this.id = opts.id || utils.generateId();
      this.options = opts;
      this.element = null;
      this.isMinimized = false;
      this.isClosed = false;
      this._eventHandlers = {};
      this._dragState = null;
      this._resizeState = null;
      this._boundOnMouseMove = this._onMouseMove.bind(this);
      this._boundOnMouseUp = this._onMouseUp.bind(this);
      this._create();
    }

    _create() {
      const saved = this.manager.storage?.get(this.id);
      this.draggable = this.options.draggable !== false;
      this.resizable = this.options.resizable !== false;
      this.closable = this.options.closable !== false;
      this.minimizable = this.options.minimizable !== false;
      this.boundsContainer = this.options.bounds 
        ? (typeof this.options.bounds === 'string' 
            ? document.querySelector(this.options.bounds) 
            : this.options.bounds)
        : null;

      this.element = document.createElement('div');
      this.element.className = 'fw-window';
      this.element.dataset.fwId = this.id;
      this.element.tabIndex = 0;

      // Builds controls HTML based on configured options
      let controlsHtml = '';
      if (this.minimizable) {
        controlsHtml += '<button class="fw-btn fw-btn-minimize" title="Minimize">−</button>';
      }
      if (this.closable) {
        controlsHtml += '<button class="fw-btn fw-btn-close" title="Close">×</button>';
      }

      this.element.innerHTML = `
        <div class="fw-header">
          <span class="fw-title">${this.title}</span>
          <div class="fw-controls">${controlsHtml}</div>
        </div>
        <div class="fw-body"></div>
      `;

      const body = this.element.querySelector('.fw-body');
      if (this.options.content) {
        if (typeof this.options.content === 'string') {
          body.innerHTML = this.options.content;
        } else if (this.options.content instanceof HTMLElement) {
          body.appendChild(this.options.content);
        }
      }

      // Position (relative to container)
      const pos = this.options.position || {};
      const x = saved?.left ?? pos.x ?? 50;
      const y = saved?.top ?? pos.y ?? 50;
      this.element.style.left = x + 'px';
      this.element.style.top = y + 'px';

      // Sizing
      const size = this.options.size || {};
      if (saved?.width || size.width) {
        this.element.style.width = (saved?.width || size.width) + 'px';
      }
      if (saved?.height || size.height) {
        this.element.style.height = (saved?.height || size.height) + 'px';
      }

      if (this.resizable) {
        const resizer = document.createElement('div');
        resizer.className = 'fw-resizer';
        this.element.appendChild(resizer);
        this._setupResize(resizer);
      }

      if (!this.draggable) this.element.classList.add('fw-locked');
      if (!this.resizable) this.element.classList.add('fw-no-resize');

      this._setupDrag();
      this._setupControls();
      this.element.addEventListener('mousedown', () => this.bringToFront());
      this.element.addEventListener('keydown', (e) => this._onKeyDown(e));

      this.manager.container.appendChild(this.element);

      this.element.classList.add('fw-enter');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.element.classList.remove('fw-enter'));
      });

      this.bringToFront();
      if (saved?.minimized) {
        requestAnimationFrame(() => this.minimize());
      }
    }

    _getBounds() {
      const margin = this.manager.options.edgeMargin;
      const winW = this.element.offsetWidth;
      const winH = this.element.offsetHeight;

      if (this.boundsContainer) {
        // Positions are relative to the container, so bounds are 0 to container size
        const containerW = this.boundsContainer.clientWidth;
        const containerH = this.boundsContainer.clientHeight;
        return {
          minLeft: margin,
          minTop: margin,
          maxLeft: Math.max(margin, containerW - winW - margin),
          maxTop: Math.max(margin, containerH - winH - margin)
        };
      }
      return this.manager._getBounds(this.element);
    }

    _setupDrag() {
      if (!this.draggable) return;
      const header = this.element.querySelector('.fw-header');
      header.style.cursor = 'grab';
      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.fw-btn')) return;
        e.preventDefault();
        this._startDrag(e.clientX, e.clientY);
      });
      header.addEventListener('touchstart', (e) => {
        if (e.target.closest('.fw-btn')) return;
        e.preventDefault();
        this._startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: false });
    }

    _startDrag(clientX, clientY) {
      this.bringToFront();
      const header = this.element.querySelector('.fw-header');
      header.style.cursor = 'grabbing';
      this._dragState = {
        startX: clientX,
        startY: clientY,
        origX: parseInt(this.element.style.left, 10) || 0,
        origY: parseInt(this.element.style.top, 10) || 0
      };
      document.addEventListener('mousemove', this._boundOnMouseMove);
      document.addEventListener('mouseup', this._boundOnMouseUp);
      document.addEventListener('touchmove', this._boundOnMouseMove, { passive: false });
      document.addEventListener('touchend', this._boundOnMouseUp);
    }

    _setupResize(resizer) {
      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._startResize(e.clientX, e.clientY);
      });
      resizer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this._startResize(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: false });
    }

    _startResize(clientX, clientY) {
      this._resizeState = {
        startX: clientX,
        startY: clientY,
        startW: this.element.offsetWidth,
        startH: this.element.offsetHeight
      };
      document.addEventListener('mousemove', this._boundOnMouseMove);
      document.addEventListener('mouseup', this._boundOnMouseUp);
      document.addEventListener('touchmove', this._boundOnMouseMove, { passive: false });
      document.addEventListener('touchend', this._boundOnMouseUp);
    }

    _onMouseMove(e) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      if (this._dragState) {
        const dx = clientX - this._dragState.startX;
        const dy = clientY - this._dragState.startY;
        let newX = this._dragState.origX + dx;
        let newY = this._dragState.origY + dy;
        const bounds = this._getBounds();
        newX = utils.clamp(newX, bounds.minLeft, bounds.maxLeft);
        newY = utils.clamp(newY, bounds.minTop, bounds.maxTop);
        this.element.style.left = newX + 'px';
        this.element.style.top = newY + 'px';
      }

      if (this._resizeState) {
        const minW = this.options.minWidth || 160;
        const minH = this.options.minHeight || 100;
        const maxW = this.options.maxWidth || 9999;
        const maxH = this.options.maxHeight || 9999;
        let newW = this._resizeState.startW + (clientX - this._resizeState.startX);
        let newH = this._resizeState.startH + (clientY - this._resizeState.startY);
        newW = utils.clamp(newW, minW, maxW);
        newH = utils.clamp(newH, minH, maxH);
        this.element.style.width = newW + 'px';
        this.element.style.height = newH + 'px';
      }
    }

    _onMouseUp() {
      const wasDragging = !!this._dragState;
      const wasResizing = !!this._resizeState;

      if (wasDragging) {
        const header = this.element.querySelector('.fw-header');
        header.style.cursor = 'grab';
        
        if (!this.manager._shiftPressed) {
          const bounds = this._getBounds();
          const snap = this.manager.snapEngine.findSnapTargets(
            this.element,
            this.manager.getAll().map(w => w.element),
            bounds
          );
          const currentX = parseInt(this.element.style.left, 10);
          const currentY = parseInt(this.element.style.top, 10);
          if (snap.x !== null || snap.y !== null) {
            const finalX = snap.x !== null ? snap.x : currentX;
            const finalY = snap.y !== null ? snap.y : currentY;
            this.element.style.transition = 'left 150ms ease, top 150ms ease';
            this.element.style.left = finalX + 'px';
            this.element.style.top = finalY + 'px';
            setTimeout(() => {
              this.element.style.transition = '';
              this._persist();
            }, 150);
          } else {
            this._persist();
          }
        } else {
          this._persist();
        }
      }

      if (wasResizing) this._persist();

      this._dragState = null;
      this._resizeState = null;
      document.removeEventListener('mousemove', this._boundOnMouseMove);
      document.removeEventListener('mouseup', this._boundOnMouseUp);
      document.removeEventListener('touchmove', this._boundOnMouseMove);
      document.removeEventListener('touchend', this._boundOnMouseUp);
    }

    _setupControls() {
      const minBtn = this.element.querySelector('.fw-btn-minimize');
      const closeBtn = this.element.querySelector('.fw-btn-close');
      minBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.minimize(); });
      closeBtn?.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
    }

    _onKeyDown(e) {
      if (!this.draggable) return;
      const step = e.shiftKey ? 20 : 8;
      const left = parseInt(this.element.style.left, 10) || 0;
      const top = parseInt(this.element.style.top, 10) || 0;
      switch (e.key) {
        case 'ArrowLeft': this.element.style.left = (left - step) + 'px'; e.preventDefault(); break;
        case 'ArrowRight': this.element.style.left = (left + step) + 'px'; e.preventDefault(); break;
        case 'ArrowUp': this.element.style.top = (top - step) + 'px'; e.preventDefault(); break;
        case 'ArrowDown': this.element.style.top = (top + step) + 'px'; e.preventDefault(); break;
        case 'Escape': if (this.minimizable) this.minimize(); break;
      }
    }

    _persist() {
      if (!this.manager.storage) return;
      this.manager.storage.set(this.id, {
        left: parseInt(this.element.style.left, 10),
        top: parseInt(this.element.style.top, 10),
        width: this.element.offsetWidth,
        height: this.element.offsetHeight,
        minimized: this.isMinimized
      });
    }

    // Public API
    bringToFront() { this.manager._bringToFront(this); this._emit('focus'); }
    
    minimize() {
      if (this.isMinimized || this.isClosed || !this.minimizable) return;
      this.isMinimized = true;
      this.element.classList.add('fw-minimized');
      this.manager.dock.add(this);
      this._persist();
      this._emit('minimize');
    }
    
    restore() {
      if (!this.isMinimized) return;
      this.isMinimized = false;
      this.element.classList.remove('fw-minimized');
      this.manager.dock.remove(this.id);
      this.bringToFront();
      this._persist();
      this._emit('restore');
    }
    
    close() {
      if (this.isClosed || !this.closable) return;
      this.isClosed = true;
      this.element.classList.add('fw-closing');
      this._emit('close');
      setTimeout(() => {
        this.element.remove();
        this.manager._remove(this);
        if (this.manager.storage) this.manager.storage.delete(this.id);
      }, 180);
    }

    setContent(content) {
      const body = this.element.querySelector('.fw-body');
      if (typeof content === 'string') body.innerHTML = content;
      else if (content instanceof HTMLElement) { body.innerHTML = ''; body.appendChild(content); }
    }
    setTitle(title) { this.title = title; this.element.querySelector('.fw-title').textContent = title; }
    setPosition(x, y) { this.element.style.left = x + 'px'; this.element.style.top = y + 'px'; this._persist(); }
    setSize(w, h) { if (w) this.element.style.width = w + 'px'; if (h) this.element.style.height = h + 'px'; this._persist(); }
    getPosition() { return { x: parseInt(this.element.style.left, 10) || 0, y: parseInt(this.element.style.top, 10) || 0 }; }
    getSize() { return { width: this.element.offsetWidth, height: this.element.offsetHeight }; }

    on(event, handler) {
      if (!this._eventHandlers[event]) this._eventHandlers[event] = [];
      this._eventHandlers[event].push(handler);
      return this;
    }
    off(event, handler) {
      if (!this._eventHandlers[event]) return this;
      if (handler) this._eventHandlers[event] = this._eventHandlers[event].filter(h => h !== handler);
      else this._eventHandlers[event] = [];
      return this;
    }
    _emit(event, data = {}) {
      if (!this._eventHandlers[event]) return;
      this._eventHandlers[event].forEach(h => { try { h({ window: this, ...data }); } catch (e) { console.error('[FloatingWindows] Event error:', e); } });
    }
  }

  // ~~~
  // MANAGER
  // ~~~
  class FloatingWindows {
    constructor(opts = {}) {
      this.options = {
        container: opts.container || 'body',
        persistence: opts.persistence !== false,
        storageKey: opts.storageKey || 'floating-windows',
        snapThreshold: opts.snapThreshold || 24,
        snapPadding: opts.snapPadding || 4,
        snapping: opts.snapping !== false,
        edgeMargin: opts.edgeMargin || 4,
        dock: opts.dock || { position: 'top' },
        dockAnchor: opts.dockAnchor || null,
        injectStyles: opts.injectStyles !== false,
        ...opts
      };
      this.container = typeof this.options.container === 'string'
        ? document.querySelector(this.options.container) : this.options.container;
      // Ensure container has position for absolute children
      if (this.container && getComputedStyle(this.container).position === 'static') {
        this.container.style.position = 'relative';
      }
      this.windows = new Map();
      this.zCounter = 1000;
      this._shiftPressed = false;
      this.storage = this.options.persistence ? new Storage(this.options.storageKey) : null;
      this.snapEngine = new SnapEngine({ threshold: this.options.snapThreshold, padding: this.options.snapPadding, enabled: this.options.snapping });
      this.dock = new Dock(this, this.options.dock);
      this._init();
    }

    _init() {
      if (this.options.injectStyles) this._injectStyles();
      window.addEventListener('keydown', (e) => { if (e.key === 'Shift') this._shiftPressed = true; });
      window.addEventListener('keyup', (e) => { if (e.key === 'Shift') this._shiftPressed = false; });
      window.addEventListener('blur', () => { this._shiftPressed = false; });
      this.dock.init();
    }

    _injectStyles() {
      if (document.getElementById('fw-injected-styles')) return;
      const style = document.createElement('style');
      style.id = 'fw-injected-styles';
      style.textContent = `.fw-window{position:absolute;display:flex;flex-direction:column;min-width:120px;min-height:80px;z-index:1000;user-select:none}.fw-header{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-shrink:0}.fw-locked .fw-header{cursor:default}.fw-title{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fw-controls{display:flex;gap:4px}.fw-btn{cursor:pointer;border:none;background:transparent}.fw-body{flex:1;overflow:auto}.fw-resizer{position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:se-resize}.fw-minimized{opacity:0;pointer-events:none;transform:scale(0.95)}.fw-enter{opacity:0;transform:translateY(-10px)}.fw-closing{opacity:0;transform:translateY(-10px);transition:opacity 150ms,transform 150ms}.fw-window{transition:opacity 180ms,transform 180ms}.fw-dock{display:none}.fw-dock-visible{display:block}.fw-dock-inner{display:flex;gap:6px;flex-wrap:wrap}.fw-dock-floating{position:fixed;right:12px;bottom:12px;z-index:999999}.fw-dock-btn{cursor:pointer}`;
      document.head.appendChild(style);
    }

    _getBounds(winEl) {
      const margin = this.options.edgeMargin;
      const winW = winEl.offsetWidth;
      const winH = winEl.offsetHeight;
      const docW = document.documentElement.clientWidth;
      const docH = window.innerHeight;
      const scrollY = window.scrollY || 0;
      return { minLeft: margin, minTop: margin + scrollY, maxLeft: Math.max(margin, docW - winW - margin), maxTop: Math.max(margin + scrollY, scrollY + docH - winH - margin) };
    }

    _bringToFront(win) {
      this.zCounter++;
      win.element.style.zIndex = this.zCounter;
      this.windows.forEach(w => { w.element.dataset.fwActive = w === win ? 'true' : 'false'; });
    }

    _remove(win) { this.windows.delete(win.id); this.dock.remove(win.id); }

    create(title, opts = {}) { const win = new Window(this, title, opts); this.windows.set(win.id, win); return win; }
    get(id) { return this.windows.get(id) || null; }
    getAll() { return Array.from(this.windows.values()); }
    closeAll() { this.windows.forEach(w => w.close()); }
    minimizeAll() { this.windows.forEach(w => w.minimize()); }
    restoreAll() { this.windows.forEach(w => w.restore()); }
    clearStorage() { if (this.storage) this.storage.clear(); }
    destroy() { this.closeAll(); this.dock.destroy(); }
  }

  FloatingWindows.Window = Window;
  FloatingWindows.Storage = Storage;
  FloatingWindows.SnapEngine = SnapEngine;
  FloatingWindows.Dock = Dock;

  return FloatingWindows;
}));
