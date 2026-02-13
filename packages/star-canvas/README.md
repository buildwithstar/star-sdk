# Star Canvas

Essential DOM utilities for reliable game initialization.

`star-canvas` solves common bugs in web games: event listeners on null elements, canvas sizing issues, and frame-rate dependent speed. It provides a tiny (~1KB), zero-dependency toolkit with a mobile-first design.

This package is part of the **Star SDK**.

## Features

- **Safe Initialization:** Never crash from timing issues with `onReady()`
- **Delegated Events:** Survive `innerHTML` re-renders with `on()`
- **Responsive Canvas:** Auto-sizing with DPR handling via `canvas()`
- **Frame-Rate Independence:** Delta time for consistent speed via `loop()`
- **Zero Dependencies:** Pure vanilla JavaScript, SSR-safe
- **Tiny:** <1KB gzipped

## Install

```bash
yarn add star-canvas
# or
npm install star-canvas
```

## Quick Start

### UI Click Game

```javascript
import { onReady, mount, on } from 'star-canvas';

onReady(() => {
  const root = mount('#game-root');
  let score = 0;

  function render() {
    root.innerHTML = `
      <div class="h-screen grid place-items-center bg-purple-900 text-white">
        <div class="text-center space-y-4">
          <h1 class="text-4xl font-bold">Score: ${score}</h1>
          <button id="clickBtn" class="px-8 py-4 rounded-xl bg-cyan-400 text-slate-900 font-bold">
            Click Me!
          </button>
        </div>
      </div>`;
  }

  // Delegated event - survives re-renders
  on(root, 'click', '#clickBtn', () => {
    score++;
    render();
  });

  render();
});
```

### Canvas Game

```javascript
import { onReady, mount, canvas, loop } from 'star-canvas';

onReady(() => {
  const root = mount('#game-root');

  root.innerHTML = `
    <div class="h-screen w-screen bg-slate-900">
      <!-- canvas auto-created here -->
    </div>`;

  const container = root.firstElementChild;
  const { ctx, canvas: c } = canvas(container, { pixelRatio: 'device' });

  const player = { x: 50, y: 50, vx: 200 }; // 200 px/sec

  loop((dt) => {
    // Delta time → same speed on all devices
    player.x += player.vx * dt;

    // Wrap around
    if (player.x > c.width) player.x = 0;

    // Render
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(player.x, player.y, 32, 32);
  });
});
```

## API

### `onReady(fn: () => void)`

Run callback when DOM is ready. Works with all script loading patterns.

```javascript
onReady(() => {
  // Safe to access DOM here
});
```

### `mount(selector?: string | Element): HTMLElement`

Ensure a root element exists. Creates `#game-root` if missing.

```javascript
const root = mount('#game-root'); // guaranteed non-null
```

### `on(root, type, selector, handler, options?)`

Delegated event listener that survives re-renders.

```javascript
on(root, 'click', '#button', () => {
  console.log('Clicked!');
});

// Later, safe to do:
root.innerHTML = '<button id="button">Click</button>';
// Event still works!
```

### `canvas(root, opts?): { canvas, ctx, resize }`

Auto-sizing canvas with DPR handling.

```javascript
const { canvas: c, ctx } = canvas(container, { pixelRatio: 'device' });
// Auto-resizes when container changes
// Handles retina displays automatically
```

### `loop(tick): { start, stop }`

RAF loop with delta time for frame-rate independence.

```javascript
const { stop } = loop((dt) => {
  player.x += speed * dt; // Same speed on 60Hz and 120Hz
});

// Later:
stop();
```

## Why Star DOM?

### Problem: Event Listeners on Null

```javascript
// ❌ Breaks if script runs before DOM ready
const btn = document.getElementById('start');
btn.addEventListener('click', () => { /* ... */ }); // TypeError!
```

```javascript
// ✅ Always works
import { onReady, mount, on } from 'star-canvas';

onReady(() => {
  const root = mount();
  on(root, 'click', '#start', () => { /* ... */ });
});
```

### Problem: Canvas Doesn't Resize

```javascript
// ❌ Fixed size, doesn't adapt
const canvas = document.createElement('canvas');
canvas.width = 800;
canvas.height = 600;
```

```javascript
// ✅ Auto-sizes to container
const { canvas: c } = canvas(container);
// Resizes when sidebar appears/disappears
// Handles DPR for crisp rendering
```

### Problem: Game Speed Varies by Device

```javascript
// ❌ 2x faster on 120Hz displays
function gameLoop() {
  player.x += 5; // 300px/sec on 60Hz, 600px/sec on 120Hz
  requestAnimationFrame(gameLoop);
}
```

```javascript
// ✅ Same speed everywhere
loop((dt) => {
  player.x += 300 * dt; // 300px/sec on ALL devices
});
```

## License

MIT
