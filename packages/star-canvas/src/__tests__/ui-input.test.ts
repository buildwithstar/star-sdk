/**
 * Tests for UI overlay + input interaction.
 *
 * These verify the core contracts:
 * 1. g.tap fires when clicking the game area (no interactive UI)
 * 2. g.tap fires when UI has non-interactive content only
 * 3. UI button clicks (via g.on delegation) work after ui.render
 * 4. ui.render() preserves element identity when structure is unchanged
 *    (morphdom patches only changed content, preventing click loss)
 * 5. Letterbox taps register as g.tap (CRITICAL for mobile)
 * 6. Standard DOM buttons work (not just g.ui.render buttons)
 */

import { game, type GameContext } from '../index';

declare global {
  function flushRAF(): void;
}

// Helper: initialize game and wait for setup
async function initGame(): Promise<GameContext> {
  return new Promise<GameContext>(async (resolve) => {
    game((g) => resolve(g));
    await Promise.resolve();
    await Promise.resolve();
    flushRAF();
    flushRAF();
  });
}

// Helper: dispatch a pointer event
function pointerEvent(type: string, el: Element | Document, x: number, y: number, id = 0): PointerEvent {
  const event = new PointerEvent(type, {
    clientX: x, clientY: y, pointerId: id,
    bubbles: true, cancelable: true,
  });
  el.dispatchEvent(event);
  return event;
}

// Helper: dispatch a click event
function clickEvent(el: Element, x: number, y: number): void {
  el.dispatchEvent(new MouseEvent('click', {
    clientX: x, clientY: y, bubbles: true, cancelable: true,
  }));
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.querySelectorAll('#star-canvas-base').forEach(el => el.remove());
  if (window.__STAR_DOM__?.destroy) {
    try { window.__STAR_DOM__.destroy(); } catch {}
  }
  window.__STAR_DOM__ = undefined;
});

describe('g.tap with no interactive UI', () => {
  test('fires on pointerdown in game area', async () => {
    const g = await initGame();
    g.ui.render('');

    pointerEvent('pointerdown', document, 100, 100);

    expect(g.tap).not.toBeNull();
  });

  test('fires when ui.render has non-interactive content', async () => {
    const g = await initGame();
    g.ui.render('<div style="color:white">Score: 100</div>');

    pointerEvent('pointerdown', document, 100, 100);

    expect(g.tap).not.toBeNull();
  });
});

describe('g.on click delegation', () => {
  test('fires on buttons in ui.render content', async () => {
    const g = await initGame();
    let clicked = false;

    g.on('click', '#test-btn', () => { clicked = true; });
    g.ui.render('<div data-interactive><button id="test-btn">Click</button></div>');

    const btn = document.querySelector('#test-btn') as HTMLElement;
    clickEvent(btn, 50, 50);

    expect(clicked).toBe(true);
  });

  test('works after ui.render replaces content', async () => {
    const g = await initGame();
    let clickCount = 0;

    g.on('click', '#test-btn', () => { clickCount++; });

    g.ui.render('<div data-interactive><button id="test-btn">Click</button><div>Score: 0</div></div>');
    g.ui.render('<div data-interactive><button id="test-btn">Click</button><div>Score: 10</div></div>');

    const btn = document.querySelector('#test-btn') as HTMLElement;
    clickEvent(btn, 50, 50);

    expect(clickCount).toBe(1);
  });
});

describe('ui.render preserves element identity (morphdom)', () => {
  test('button element survives when only text content changes', async () => {
    const g = await initGame();

    g.ui.render('<div data-interactive><button id="btn">Click</button><div>Score: 0</div></div>');
    const btnBefore = document.querySelector('#btn') as HTMLElement;
    expect(btnBefore).not.toBeNull();

    // Update with different score — button should be the SAME element
    g.ui.render('<div data-interactive><button id="btn">Click</button><div>Score: 10</div></div>');
    const btnAfter = document.querySelector('#btn') as HTMLElement;

    expect(btnAfter).toBe(btnBefore); // Same DOM node, not recreated
  });

  test('button element survives when attributes change on sibling', async () => {
    const g = await initGame();

    g.ui.render('<div data-interactive><button id="btn">Click</button><div class="score">0</div></div>');
    const btnBefore = document.querySelector('#btn') as HTMLElement;

    g.ui.render('<div data-interactive><button id="btn">Click</button><div class="score highlight">10</div></div>');
    const btnAfter = document.querySelector('#btn') as HTMLElement;

    expect(btnAfter).toBe(btnBefore);
  });

  test('click delegation works after content update preserves button', async () => {
    const g = await initGame();
    let clickCount = 0;

    g.on('click', '#btn', () => { clickCount++; });

    g.ui.render('<div data-interactive><button id="btn">Click</button><div>v1</div></div>');
    const btn = document.querySelector('#btn') as HTMLElement;

    // Simulate: pointerdown, then content changes, then click
    pointerEvent('pointerdown', btn, 50, 50);
    g.ui.render('<div data-interactive><button id="btn">Click</button><div>v2</div></div>');
    pointerEvent('pointerup', btn, 50, 50);

    // Button is the same element — click should work
    clickEvent(btn, 50, 50);

    expect(clickCount).toBe(1);
    // Verify it's still the same DOM node
    expect(document.querySelector('#btn')).toBe(btn);
  });

  test('full replacement when structure changes', async () => {
    const g = await initGame();

    g.ui.render('<div><span>A</span></div>');
    const spanBefore = document.querySelector('span') as HTMLElement;

    // Completely different structure
    g.ui.render('<p>B</p>');
    const spanAfter = document.querySelector('span');

    expect(spanAfter).toBeNull(); // span is gone
    expect(document.querySelector('p')).not.toBeNull(); // p replaced it
  });

  test('identical html is a no-op', async () => {
    const g = await initGame();

    g.ui.render('<div data-interactive><button id="btn">Click</button></div>');
    const btn = document.querySelector('#btn') as HTMLElement;

    g.ui.render('<div data-interactive><button id="btn">Click</button></div>');

    expect(document.querySelector('#btn')).toBe(btn);
  });
});

describe('letterbox taps (CRITICAL - mobile gameplay)', () => {
  test('g.tap fires when tapping the document body (letterbox area)', async () => {
    const g = await initGame();

    // Simulate tap on body (outside canvas bounds — letterbox area)
    pointerEvent('pointerdown', document.body, 100, 800);

    expect(g.tap).not.toBeNull();
    // Coordinates should be clamped to canvas bounds
    expect(g.tap!.x).toBeGreaterThanOrEqual(0);
    expect(g.tap!.y).toBeGreaterThanOrEqual(0);
  });

  test('g.tap fires when tapping document directly', async () => {
    const g = await initGame();

    pointerEvent('pointerdown', document, 100, 800);

    expect(g.tap).not.toBeNull();
  });

  test('g.pointer updates on move in letterbox area', async () => {
    const g = await initGame();

    pointerEvent('pointermove', document.body, 50, 900);

    // Pointer should update even in letterbox area
    expect(g.pointer.x).toBeGreaterThanOrEqual(0);
    expect(g.pointer.y).toBeGreaterThanOrEqual(0);
  });
});

describe('g.tap suppression on interactive elements', () => {
  test('g.tap is suppressed when tapping a g.ui.render() button', async () => {
    const g = await initGame();
    g.ui.render('<button id="btn">Click</button>');

    const btn = document.querySelector('#btn') as HTMLElement;
    pointerEvent('pointerdown', btn, 50, 50);

    expect(g.tap).toBeNull();
  });

  test('g.tap is suppressed when tapping a standard DOM button', async () => {
    const g = await initGame();

    // Add a button directly to the DOM (not via g.ui.render)
    const btn = document.createElement('button');
    btn.id = 'dom-btn';
    btn.textContent = 'Mute';
    btn.style.cssText = 'position:fixed;top:10px;right:10px;';
    document.body.appendChild(btn);

    pointerEvent('pointerdown', btn, 50, 50);

    expect(g.tap).toBeNull();
  });

  test('standard DOM button receives click events', async () => {
    const g = await initGame();

    let clicked = false;
    const btn = document.createElement('button');
    btn.id = 'dom-btn';
    btn.textContent = 'Mute';
    document.body.appendChild(btn);
    btn.addEventListener('click', () => { clicked = true; });

    clickEvent(btn, 50, 50);

    expect(clicked).toBe(true);
  });

  test('g.tap is suppressed when tapping an anchor tag', async () => {
    const g = await initGame();
    g.ui.render('<a href="#" id="link">Link</a>');

    const link = document.querySelector('#link') as HTMLElement;
    pointerEvent('pointerdown', link, 50, 50);

    expect(g.tap).toBeNull();
  });

  test('g.tap is suppressed when tapping an input element', async () => {
    const g = await initGame();
    g.ui.render('<input type="text" id="input" />');

    const input = document.querySelector('#input') as HTMLElement;
    pointerEvent('pointerdown', input, 50, 50);

    expect(g.tap).toBeNull();
  });

  test('g.tap fires when tapping non-interactive UI content', async () => {
    const g = await initGame();
    g.ui.render('<div id="score">Score: 42</div>');

    const score = document.querySelector('#score') as HTMLElement;
    pointerEvent('pointerdown', score, 50, 50);

    expect(g.tap).not.toBeNull();
  });
});

describe('no .star-input layer', () => {
  test('.star-input element does not exist', async () => {
    await initGame();

    const inputLayer = document.querySelector('.star-input');
    expect(inputLayer).toBeNull();
  });
});
