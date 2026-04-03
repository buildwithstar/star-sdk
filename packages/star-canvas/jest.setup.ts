// PointerEvent polyfill for jsdom
if (typeof PointerEvent === 'undefined') {
  (global as any).PointerEvent = class PointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
    }
  };
}

// Mock elementFromPoint (not implemented in jsdom)
document.elementFromPoint = () => null;

// Mock canvas getContext for jsdom (which doesn't implement it)
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string) {
  if (contextId === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: [] })),
      putImageData: jest.fn(),
      createImageData: jest.fn(),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      fillText: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      canvas: this,
    } as unknown as CanvasRenderingContext2D;
  }
  return null;
} as any;

// Mock ResizeObserver (not available in jsdom)
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock requestAnimationFrame for synchronous testing
let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

global.requestAnimationFrame = (cb: FrameRequestCallback) => {
  const id = ++rafId;
  rafCallbacks.set(id, cb);
  return id;
};

global.cancelAnimationFrame = (id: number) => {
  rafCallbacks.delete(id);
};

// Helper to flush rAF callbacks (exposed on window for tests)
(global as any).flushRAF = () => {
  const cbs = Array.from(rafCallbacks.entries());
  rafCallbacks.clear();
  cbs.forEach(([, cb]) => cb(performance.now()));
};
