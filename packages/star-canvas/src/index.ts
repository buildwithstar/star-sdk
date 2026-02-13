/**
 * Star DOM SDK v0.6.7
 * MIT License
 * https://buildwithstar.com
 *
 * A tiny, reliable DOM & Canvas SDK for browser games.
 * Solves common LLM bugs: DOM timing, null listeners,
 * canvas sizing/DPR, and canvas-vs-UI conflicts.
 *
 * Designed for LLMs and humans: owns the iframe <body>,
 * provides a scrollable UI overlay, stable loop with dt,
 * DPR-correct canvas sizing, and safe delegated events.
 *
 * ~1.5KB min+gz, zero deps, SSR-safe, iframe-first.
 */

export const version = '0.8.0';

/* -------------------------------------------------------------------------- */
/* Types                                     */
/* -------------------------------------------------------------------------- */

declare global {
  interface Window { __STAR_DOM__?: { destroy: () => void } }
}

export type GameTick = (dt: number, now: number) => void;

export interface GameLoop {
  start: () => void;
  stop: () => void;
  readonly running: boolean;
}

export interface GameUI {
  /** The root <div> element for UI, stacked on top of the canvas. */
  readonly root: HTMLElement;
  /** Safely replaces the content of the UI overlay. */
  render: (html: string) => void;
  /** Scoped querySelector for the UI root. */
  el: <T extends Element = HTMLElement>(selector: string) => T | null;
  /** Scoped querySelectorAll for the UI root. */
  all: <T extends Element = HTMLElement>(selector: string) => NodeListOf<T>;
}

/** Point with coordinates and the original event */
export interface InputPoint {
  x: number;
  y: number;
  event: PointerEvent;
}

/** Input handler type */
export type InputHandler = (point: InputPoint) => void;

export interface GameContext {
  /** The root <div> element for the canvas. */
  readonly stage: HTMLElement;
  /** The canvas element. */
  readonly canvas: HTMLCanvasElement;
  /** The 2D rendering context. */
  readonly ctx: CanvasRenderingContext2D;
  /** Logical width (CSS px). Use this for game logic. Default: 640 (landscape) or 360 (portrait). */
  readonly width: number;
  /** Logical height (CSS px). Use this for game logic. Default: 360 (landscape) or 640 (portrait). */
  readonly height: number;
  /** Effective device pixel ratio. */
  readonly dpr: number;
  /** Safely attaches delegated event listeners to the document. */
  on: (
  type: string,
  selector: string,
  handler: (this: Element, ev: Event) => void,
  options?: AddEventListenerOptions
  ) => () => void;
  /** Starts a stable, auto-starting game loop. */
  loop: (tick: GameTick) => GameLoop;
  /** The dedicated UI overlay manager. */
  readonly ui: GameUI;
  /** Converts DOM event coords to logical stage coords (CSS px). Clamps to canvas bounds. */
  toStagePoint: (e: { clientX: number; clientY: number }) => { x: number; y: number };
  /** Creates a drag state helper for pointer-based dragging. Handles coordinate conversion and offset. */
  createDrag: <T extends { x: number; y: number }>() => DragState<T>;
  /** Register handler for tap/click (fires on pointerdown). Works anywhere on screen including letterbox. */
  onTap: (handler: InputHandler) => void;
  /** Register handler for pointer move. Works anywhere on screen including letterbox. */
  onMove: (handler: InputHandler) => void;
  /** Register handler for pointer release (fires on pointerup). Works anywhere on screen including letterbox. */
  onRelease: (handler: InputHandler) => void;
  /** Re-calculates stage size (rarely needed). */
  resize: () => void;
  /** Cleans up all listeners and observers. */
  destroy: () => void;
  /** Runs a function with ctx.save/restore automatically managed. */
  scoped: (fn: () => void) => void;
}

export interface GameOptions {
  /**
   * Preset for common game orientations (all use 16:9 aspect ratio with letterboxing).
   * - 'landscape' (default): 640x360, works identically on all devices
   * - 'portrait': 360x640, for mobile-style games
   * - 'responsive': No fixed dimensions, fills container (legacy behavior, gameplay varies by device)
   */
  preset?: 'landscape' | 'portrait' | 'responsive';
  /**
   * Logical width for fixed-size stages (e.g., 800).
   * Default: 640 (landscape preset).
   */
  width?: number;
  /**
   * Logical height for fixed-size stages (e.g., 600).
   * Default: 360 (landscape preset).
   */
  height?: number;
  /**
   * How a fixed-size stage fits its container.
   * - 'contain' (default): Letterbox/pillarbox to fit.
   * - 'cover': Fill container and crop.
   * - 'stretch': Distort to fill container.
   */
  fit?: 'contain' | 'cover' | 'stretch';
  /**
   * Backing store DPR. 'device' (default) or a number.
   */
  pixelRatio?: 'device' | number;
  /**
   * Max cap for 'device' DPR. Default: 2.
   */
  maxPixelRatio?: number;
  /**
   * 2D context attributes (e.g., { alpha: false }).
   */
  contextAttributes?: CanvasRenderingContext2DSettings;
  /**
   * Prevent context menu on canvas. Default: true.
   */
  preventContextMenu?: boolean;
}

/** Preset configurations - all use fixed 16:9 dimensions for consistent gameplay */
const PRESETS: Record<string, { width?: number; height?: number }> = {
  landscape: { width: 640, height: 360 },  // 16:9 landscape
  portrait: { width: 360, height: 640 },   // 9:16 portrait
  responsive: {},                           // Legacy: fills container
};

/** Drag state helper - handles coordinate conversion and offset tracking */
export interface DragState<T extends { x: number; y: number }> {
  /** Convert event to stage coordinates (pure function, no side effects) */
  point: (e: { clientX: number; clientY: number }) => { x: number; y: number };
  /** Start dragging an object - computes offset from cursor to object origin */
  grab: (e: { clientX: number; clientY: number }, obj: T) => void;
  /** Update the grabbed object's position based on pointer movement */
  move: (e: { clientX: number; clientY: number }) => void;
  /** Release the grabbed object and return it (or null if nothing was grabbed) */
  release: () => T | null;
  /** The currently grabbed object (or null) */
  readonly dragging: T | null;
}

/** Creates a drag state helper that handles coordinate conversion and offset tracking */
export function createDragState<T extends { x: number; y: number }>(
  toStagePoint: (e: { clientX: number; clientY: number }) => { x: number; y: number }
): DragState<T> {
  let target: T | null = null;
  let offsetX = 0;
  let offsetY = 0;

  return {
    point(e) {
      return toStagePoint(e);
    },
    grab(e, obj) {
      const { x, y } = toStagePoint(e);
      target = obj;
      offsetX = x - obj.x;
      offsetY = y - obj.y;
    },
    move(e) {
      if (target) {
        const { x, y } = toStagePoint(e);
        target.x = x - offsetX;
        target.y = y - offsetY;
      }
    },
    release() {
      const dropped = target;
      target = null;
      return dropped;
    },
    get dragging() {
      return target;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Implementation                               */
/* -------------------------------------------------------------------------- */

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function applyBaseCSS(): void {
  if (!isBrowser() || document.getElementById('star-canvas-base')) return;
  const style = document.createElement('style');
  style.id = 'star-canvas-base';
  style.textContent = `
    html, body { height: 100%; }
    body {
      margin: 0; min-height: 100dvh; overflow: hidden; background: #000;
      -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
    }
    /* Canvas is rendering only - no pointer events */
    .star-canvas {
      position: absolute; inset: 0; width: 100%; height: 100%;
      overflow: hidden; touch-action: none;
      z-index: 0;
      display: block;
      pointer-events: none;
    }
    /* Input layer captures all game input (including letterbox areas) */
    .star-input {
      position: absolute; inset: 0; width: 100%; height: 100%;
      z-index: 5;
      touch-action: none;
    }
    /* UI overlay - container is non-interactive, children opt-in */
    .star-ui {
      position: absolute; inset: 0; width: 100%; height: 100%;
      overflow-y: auto; z-index: 10;
      pointer-events: none;
    }
    /* Interactive UI elements opt-in to receive pointer events */
    .star-ui button, .star-ui a, .star-ui input, .star-ui select,
    .star-ui textarea, .star-ui [data-interactive] {
      pointer-events: auto;
    }
  `;
  document.head.appendChild(style);
}

/**
 * The main entry point. Runs setup when the DOM is ready,
 * providing a safe context for building a game.
 */
export function game(setup: (g: GameContext) => void, options: GameOptions = {}): void {
  if (!isBrowser()) return; // SSR-safe

  // 1. Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(setup, options), { once: true });
  } else {
    queueMicrotask(() => init(setup, options));
  }
}

/** Internal init function, called after DOM is ready. */
function init(setup: (g: GameContext) => void, options: GameOptions): void {
  applyBaseCSS();

  // Tear down any previous instance (HMR/dev safety)
  if (window.__STAR_DOM__?.destroy) {
    try { window.__STAR_DOM__.destroy(); } catch {}
  }

  // Avoid duplicates on HMR / reinitialization
  document.querySelectorAll('.star-ui, .star-canvas, .star-input').forEach(n => n.remove());

  // 2. Create DOM structure
  const uiRoot = document.createElement('div');
  uiRoot.className = 'star-ui';

  document.body.appendChild(uiRoot);

  const canvas = document.createElement('canvas');
  canvas.className = 'star-canvas';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d', options.contextAttributes ?? { alpha: true });
  if (!ctx) throw new Error('[star-canvas] Failed to get 2D context');

  if (options.preventContextMenu !== false) {
    const onCtxMenu = (e: Event) => e.preventDefault();
    canvas.addEventListener('contextmenu', onCtxMenu);
  }

  // Create input layer - captures all game input including letterbox areas
  const inputLayer = document.createElement('div');
  inputLayer.className = 'star-input';
  document.body.appendChild(inputLayer);

  // Input handler registries for the new onTap/onMove/onRelease API
  const tapHandlers: InputHandler[] = [];
  const moveHandlers: InputHandler[] = [];
  const releaseHandlers: InputHandler[] = [];

  // Proxy canvas.onclick to inputLayer with proper replacement semantics
  let currentOnClickHandler: ((e: Event) => void) | null = null;
  let onClickListener: ((e: Event) => void) | null = null;

  Object.defineProperty(canvas, 'onclick', {
    get: () => currentOnClickHandler,
    set: (fn: ((e: Event) => void) | null) => {
      // Remove previous listener if exists
      if (onClickListener) {
        inputLayer.removeEventListener('click', onClickListener);
        onClickListener = null;
      }
      currentOnClickHandler = fn;
      if (fn) {
        onClickListener = (e) => fn.call(canvas, e);
        inputLayer.addEventListener('click', onClickListener);
      }
    },
  });

  // Proxy addEventListener/removeEventListener to inputLayer for pointer/mouse/touch/click events
  const originalAddEventListener = canvas.addEventListener.bind(canvas);
  const originalRemoveEventListener = canvas.removeEventListener.bind(canvas);
  const listenerMap = new WeakMap<EventListenerOrEventListenerObject, EventListener>();

  canvas.addEventListener = function(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    if (/^(click|pointer|mouse|touch)/.test(type) && typeof listener === 'function') {
      const wrappedListener = ((e: Event) => (listener as EventListener).call(canvas, e)) as EventListener;
      listenerMap.set(listener, wrappedListener);
      inputLayer.addEventListener(type, wrappedListener, options);
    } else {
      originalAddEventListener(type, listener, options);
    }
  } as typeof canvas.addEventListener;

  canvas.removeEventListener = function(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ) {
    if (/^(click|pointer|mouse|touch)/.test(type) && typeof listener === 'function') {
      const wrappedListener = listenerMap.get(listener);
      if (wrappedListener) {
        inputLayer.removeEventListener(type, wrappedListener, options);
        listenerMap.delete(listener);
      }
    } else {
      originalRemoveEventListener(type, listener, options);
    }
  } as typeof canvas.removeEventListener;

  // 3. Setup State & Sizing
  // Apply preset defaults (landscape 640x360 is default)
  const preset = options.preset ?? 'landscape';
  const presetConfig = PRESETS[preset] ?? PRESETS.landscape;
  const fixedWidth = options.width ?? presetConfig.width;
  const fixedHeight = options.height ?? presetConfig.height;

  const maxDpr = options.maxPixelRatio ?? 2;
  const pr = options.pixelRatio ?? 'device';
  const fit = options.fit ?? 'contain';

  let dpr = 1;
  let cssW = fixedWidth ?? 1;
  let cssH = fixedHeight ?? 1;
  let resizeSubscribers = new Set<() => void>();
  let loopControls: { start: () => void; stop: () => void; readonly running: boolean } | null = null;
  let cleanup: (() => void)[] = [];

  function computeDpr(): number {
    if (typeof pr === 'number') return Math.min(Math.max(1, pr), maxDpr);
    return Math.min(Math.max(1, window.devicePixelRatio || 1), maxDpr);
  }

  function resize() {
    dpr = computeDpr();
    const rect = document.body.getBoundingClientRect();
    // Fallback to window dimensions if body hasn't laid out yet (safety net)
    const containerW = Math.max(1, Math.floor(rect.width || window.innerWidth || 800));
    const containerH = Math.max(1, Math.floor(rect.height || window.innerHeight || 600));

    if (fixedWidth && fixedHeight) {
      // BOTH dimensions fixed: letterbox/pillarbox mode
      cssW = fixedWidth;
      cssH = fixedHeight;
      const aspect = cssW / cssH;
      const containerAspect = containerW / containerH;
      let scale = 1;

      if (fit === 'contain') {
        scale = (containerAspect > aspect) ? (containerH / cssH) : (containerW / cssW);
      } else if (fit === 'cover') {
        scale = (containerAspect > aspect) ? (containerW / cssW) : (containerH / cssH);
      } // 'stretch' is handled by 100% w/h

      if (fit === 'stretch') {
        canvas.style.width = '100%';
        canvas.style.height = '100%';
      } else {
        const w = Math.floor(cssW * scale);
        const h = Math.floor(cssH * scale);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        canvas.style.position = 'absolute';
        canvas.style.left = `${Math.floor((containerW - w) / 2)}px`;
        canvas.style.top = `${Math.floor((containerH - h) / 2)}px`;
      }
    } else if (fixedHeight) {
      // ONLY height fixed: width adapts to container aspect ratio (NO letterboxing)
      // This is the default mode - games fill the screen with consistent vertical sizing
      cssH = fixedHeight;
      const containerAspect = containerW / containerH;
      cssW = Math.floor(cssH * containerAspect);

      // Canvas fills container completely
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.position = 'absolute';
      canvas.style.left = '0';
      canvas.style.top = '0';
    } else if (fixedWidth) {
      // ONLY width fixed: height adapts (rare, for horizontal scrollers)
      cssW = fixedWidth;
      const containerAspect = containerW / containerH;
      cssH = Math.floor(cssW / containerAspect);

      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.position = 'absolute';
      canvas.style.left = '0';
      canvas.style.top = '0';
    } else {
      // Fully responsive (legacy 'responsive' preset)
      cssW = containerW;
      cssH = containerH;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.style.position = 'absolute';
      canvas.style.left = '0';
      canvas.style.top = '0';
    }

    // Backing store size (device pixels)
    const bufW = Math.max(1, Math.floor(cssW * dpr));
    const bufH = Math.max(1, Math.floor(cssH * dpr));
    if (canvas.width !== bufW) canvas.width = bufW;
    if (canvas.height !== bufH) canvas.height = bufH;

    // Normalize drawing coordinates to logical CSS pixels
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    resizeSubscribers.forEach((fn) => fn());
  }

  // Observe size changes
  const ro = new ResizeObserver(resize);
  ro.observe(document.body);
  cleanup.push(() => ro.disconnect());
  
  // Fallback for older browsers or edge cases where ResizeObserver doesn't fire
  window.addEventListener('resize', resize);
  cleanup.push(() => window.removeEventListener('resize', resize));
  
  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener('resize', resize);
    cleanup.push(() => vv.removeEventListener('resize', resize));
  }
  
  // 4. Create the GameContext object
  const g: GameContext = {
    stage: document.body,
    canvas,
    ctx,
    get width() { return cssW; },
    get height() { return cssH; },
    get dpr() { return dpr; },
    resize,
    toStagePoint: (e) => {
      const rect = canvas.getBoundingClientRect();
      let x = (e.clientX - rect.left) * (cssW / rect.width);
      let y = (e.clientY - rect.top) * (cssH / rect.height);
      // Clamp to canvas bounds (handles letterbox clicks)
      x = Math.max(0, Math.min(cssW, x));
      y = Math.max(0, Math.min(cssH, y));
      return { x, y };
    },
    createDrag: <T extends { x: number; y: number }>() => {
      return createDragState<T>(g.toStagePoint);
    },
    onTap: (handler) => { tapHandlers.push(handler); },
    onMove: (handler) => { moveHandlers.push(handler); },
    onRelease: (handler) => { releaseHandlers.push(handler); },
    on: (type, selector, handler, options) => {
      // Events are delegated on the *document* to catch UI in the overlay
      // and canvas events bubbling up.
      const listener = (ev: Event) => {
        const target = ev.target as Element | null;
        const matched = target?.closest?.(selector);
        // If it matches a selector, fire.
        // This works because canvas clicks will bubble to body
        // and UI clicks will bubble (if 'pointer-events: auto')
        if (matched) {
          handler.call(matched, ev);
        }
      };
      document.addEventListener(type, listener, options);
      const off = () => document.removeEventListener(type, listener, options);
      cleanup.push(off);
      return off;
    },
    loop: (tick) => {
      const MAX_DT = 0.1; // 100ms
  let raf = 0;
      let running = false;
      let last = 0;

      const frame = (now: number) => {
        if (!running) return;
        const dt = last ? Math.min((now - last) / 1000, MAX_DT) : 0;
        last = now;
        try {
          tick(dt, now);
        } catch (err) {
          console.error('[star-canvas] Game loop error:', err);
          // Continue running - let game recover on next frame
        }
        raf = requestAnimationFrame(frame);
      };

      loopControls = {
        get running() { return running; },
        start() {
          if (running) return;
          running = true;
          last = performance.now();
  raf = requestAnimationFrame(frame);
        },
        stop() {
          if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    },
      };
      // Auto-start the first loop
      loopControls.start();
      return loopControls;
    },
    ui: {
      root: uiRoot,
      render: (html) => {
        // Skip update if HTML is identical (prevents unnecessary DOM thrashing)
        // This makes ui.render() safe to call in the game loop for static content
        if (uiRoot.innerHTML === html) return;
        uiRoot.innerHTML = html;
      },
      el: (selector) => uiRoot.querySelector(selector),
      all: (selector) => uiRoot.querySelectorAll(selector),
    },
    destroy: () => {
      loopControls?.stop();
      cleanup.forEach((fn) => fn());
      cleanup = [];
      resizeSubscribers.clear();
      if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
      if (uiRoot.parentElement) uiRoot.parentElement.removeChild(uiRoot);
      if (inputLayer.parentElement) inputLayer.parentElement.removeChild(inputLayer);
    },
    scoped: (fn: () => void) => {
      ctx.save();
      try {
        fn();
      } finally {
        ctx.restore();
      }
    },
  };

  // Wire up input layer event listeners for onTap/onMove/onRelease
  inputLayer.addEventListener('pointerdown', (e) => {
    const point: InputPoint = { ...g.toStagePoint(e), event: e };
    tapHandlers.forEach(fn => fn(point));
  });
  inputLayer.addEventListener('pointermove', (e) => {
    const point: InputPoint = { ...g.toStagePoint(e), event: e };
    moveHandlers.forEach(fn => fn(point));
  });
  inputLayer.addEventListener('pointerup', (e) => {
    const point: InputPoint = { ...g.toStagePoint(e), event: e };
    releaseHandlers.forEach(fn => fn(point));
  });

  // Expose destroy for the next run to cleanly replace us (HMR support)
  window.__STAR_DOM__ = { destroy: g.destroy };

  // 5. Run the user's setup code after initial sizing
  // Double rAF ensures CSS is applied and dimensions are correct
  requestAnimationFrame(() => requestAnimationFrame(() => {
    resize();
    try {
      setup(g);
    } catch (err) {
      console.error('[star-canvas] Game initialization failed:', err);
      // Don't call destroy - let the game stay in a recoverable state
    }
  }));
}
