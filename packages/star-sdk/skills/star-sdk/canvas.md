**Installation**

First, add the package to your project:

```bash
yarn add star-canvas
```

### Star DOM SDK

Use the **Star DOM SDK** to initialize games reliably.
It prevents the most common bugs:

  - ✅ No "cannot read addEventListener of null"
  - ✅ No canvas sizing/DPR/blur issues
  - ✅ No accidentally wiping the canvas with `innerHTML`
  - ✅ Games work identically on ALL devices (fixed 16:9 with letterboxing)

-----

### Fixed 16:9 Resolution

**Default: 640×360 (landscape) or 360×640 (portrait).** Games work identically on every device.

The SDK uses letterboxing to maintain the exact game area. This means:
- Positions like `x: 320, y: 180` always mean the exact center
- Two objects at `x: 100` and `x: 540` are always the same distance apart
- No "works on my screen, breaks on mobile" bugs

```ts
// These values work identically on ALL devices:
const player = { x: 320, y: 300 };        // Center-bottom area
const enemy = { x: 600, y: 50 };          // Top-right area
const playerSize = 32;                     // Always 32px
const speed = 200;                         // Always 200px/sec
```

-----

### Golden Path (How to Use)

Import `game` and wrap your code in it. The `game` function handles DOM readiness, creates a canvas and a UI overlay, and gives you a safe context to build.

```ts
import { game } from 'star-canvas';

game(({ ctx, width, height, on, loop, ui, canvas }) => {
  // ctx: The 2D canvas context
  // width, height: The logical size (CSS pixels) - READ-ONLY
  // on: Safe, delegated event listener
  // loop: Stable game loop (with dt)
  // ui: Safe overlay for HTML
  // canvas: The <canvas> element

  // 1. Draw on the canvas
  loop((dt) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#22d3ee'; // cyan-400
    ctx.fillRect(width / 2 - 25, height / 2 - 25, 50, 50);
  });

  // 2. Render HTML to the safe UI overlay
  //    UI is interactive by default (scroll, buttons work)
  //    Adding canvas.addEventListener makes UI click-through automatically
  ui.render(`
    <div class="absolute top-4 left-4 text-white">
      <button id="start-btn" class="px-4 py-2 bg-blue-500 rounded pointer-events-auto">
        Click Me
      </button>
    </div>
  `);

  // 3. Listen for button clicks
  on('click', '#start-btn', () => {
    console.log('Button clicked!');
  });

  // 4. For canvas games: listen for taps on canvas
  //    This automatically makes UI click-through (taps pass through to canvas)
  //    Buttons with pointer-events-auto still work
  canvas.addEventListener('pointerdown', (e) => {
    console.log('Canvas/screen tapped!', e);
  });
});
```

> **CRITICAL:** Always import the SDK in your JavaScript/TypeScript.
> **Do not** add a `<script src="/star-sdk/dom.js">` tag in HTML.
>
> **Recommended Import:**
>
> ```ts
> import { game } from 'star-canvas';
> ```

-----

## Core API: `game(setup, options?)`

The `setup` function receives one argument: a `GameContext` object with the following properties:

### `ctx: CanvasRenderingContext2D`

The 2D drawing context. Its transform is already scaled for DPR. You **always draw in logical CSS pixels**.

### `canvas: HTMLCanvasElement`

The `<canvas>` element itself.

  - **Use this for gameplay input listeners** (e.g., `pointerdown`, `pointermove`).

### `width: number` (getter)

### `height: number` (getter)

The logical CSS pixel width and height of the stage. **Use these for all game logic and drawing.** They are getters, so they are always up-to-date.

### `on(type, selector, handler, options?)`

Attaches a **delegated event listener** to the document.

  - ✅ **Use this for UI elements** (buttons, menus) inside your `ui.render()` HTML.
  - ✅ Survives `ui.render()` calls.
  - Returns an `off()` function to unsubscribe.

### `loop(tick)`

Starts a `requestAnimationFrame` loop.

  - `tick` function receives `(dt, now)`, where `dt` is **delta time in seconds**.
  - **ALWAYS** multiply movement by `dt` (e.g., `player.x += speed * dt`).
  - Returns `{ start(), stop(), running }`. The loop starts automatically.

### `ui: GameUI`

A safe manager for your HTML overlay, stacked on top of the canvas.

  - `ui.root`: The `<div>` element for your UI. It is **interactive by default** (standard HTML behavior - scroll, buttons work).
  - `ui.render(html: string)`: **Use this** to set your UI. It's safe and won't destroy the canvas.
    - Automatically skips updates if HTML is unchanged (safe to call in loop for static content)
    - For best performance with dynamic content (score), only call when values actually change
  - `ui.el(selector)`: Scoped `querySelector` for the UI root.
  - `ui.all(selector)`: Scoped `querySelectorAll` for the UI root.

**Auto-detection:** When you add `canvas.addEventListener('pointerdown', ...)`, the SDK automatically makes UI click-through so taps reach the canvas. Buttons with `pointer-events-auto` still work.

### Cursor Management

**CRITICAL:** Choose cursor based on how players interact. Update cursor when state changes (e.g., menu → playing → gameover).

```ts
// MOUSE-BASED GAMES (click/point-and-click/puzzle/clicker/strategy/constellation)
if (state === 'playing') canvas.style.cursor = 'pointer';  // Show where to click
if (state === 'menu' || state === 'gameover') canvas.style.cursor = 'pointer';  // Keep visible

// PRECISION AIMING (shooter/drawing/building)
if (state === 'playing') canvas.style.cursor = 'crosshair';
if (state === 'menu' || state === 'gameover') canvas.style.cursor = 'auto';

// KEYBOARD/TOUCH ONLY (platformer/WASD/rhythm/endless runner)
if (state === 'playing') canvas.style.cursor = 'none';  // Hide (doesn't matter)
if (state === 'menu' || state === 'gameover') canvas.style.cursor = 'auto';  // Show for menus!
```

**Decision:** Does player click on game objects? → `'pointer'` | Aim precisely? → `'crosshair'` | WASD/touch only? → `'none'` during play, `'auto'` for menus

### `toStagePoint(event)`

Converts `MouseEvent` or `PointerEvent` client coordinates to the stage's logical coordinates.

  - **USE THIS** for all canvas pointer input.

### `createDrag()`

Creates a drag state helper that handles coordinate conversion and offset tracking automatically.

```ts
const drag = createDrag();

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);  // IMPORTANT: Capture for reliable drags
  const { x, y } = drag.point(e);         // Convert coordinates
  const hit = pieces.find(p => /* hit test */);
  if (hit) drag.grab(e, hit);             // Start drag with offset
});

canvas.addEventListener('pointermove', (e) => drag.move(e));  // Updates position
canvas.addEventListener('pointerup', () => {
  const dropped = drag.release();  // Returns dropped object (or null)
});
```

**API:**
- `point(e)` - Pure coordinate conversion, no side effects
- `grab(e, obj)` - Start dragging an object, computing offset from cursor
- `move(e)` - Update dragged object's position
- `release()` - End drag, returns dropped object or null
- `dragging` - The currently dragged object (or null)

### `GameOptions` (optional)

Pass an options object as the second argument to `game()`:

  - `preset?: 'landscape' | 'portrait' | 'responsive'`: Game orientation preset.
    - `'landscape'` (default): 640×360 - for platformers, shooters, racing
    - `'portrait'`: 360×640 - for puzzle, cards, match-3, mobile-style
    - `'responsive'`: Fills container, no fixed dimensions (legacy - gameplay varies by device)
  - `width?: number`: Override width (default: 640 for landscape, 360 for portrait)
  - `height?: number`: Override height (default: 360 for landscape, 640 for portrait)
  - `fit?: 'contain' | 'cover' | 'stretch'`: How game fits container (default: `'contain'` with letterboxing)
  - `pixelRatio?: 'device' | number`: (default: `'device'`)
  - `maxPixelRatio?: number`: (default: `2`)
  - `preventContextMenu?: boolean`: Prevent right-click context menu on canvas (default: `true`)

**Default behavior:** Fixed 640×360 (16:9) with letterboxing. Games work identically on all devices.

-----

## Recipes

### Recipe 1: UI-Only Game (e.g., Clicker)

Use `game`, `on`, and `ui`.

```ts
import { game } from 'star-canvas';

game(({ on, ui }) => {
  let score = 0;

  function render() {
    // UI is interactive by default - buttons, scroll, forms all work
    ui.render(`
      <div class="min-h-[100dvh] grid place-items-center bg-purple-900 text-white">
        <div class="text-center space-y-4">
          <h1 class="text-4xl font-bold">Score: \${score}</h1>
          <button id="clickBtn" class="px-8 py-4 rounded-xl bg-cyan-400 text-slate-900 font-bold">
            Click Me!
          </button>
        </div>
      </div>
    `);
  }

  // Button clicks work by default
  on('click', '#clickBtn', () => {
    score++;
    render();
  });

  render();
});
```

### Recipe 2: Canvas Game (Landscape)

Default pattern - fixed 640×360 resolution. Games work identically on all devices.

```ts
import { game } from 'star-canvas';

game(({ ctx, width, height, loop }) => {
  // width = 640, height = 360 (always, with letterboxing)
  const playerSize = 32;
  const speed = 200;  // 200px per second

  const player = { x: 64, y: 180 };  // Fixed positions work everywhere

  loop((dt) => {
    player.x += speed * dt;
    if (player.x > width) player.x = -playerSize;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(player.x, player.y - playerSize/2, playerSize, playerSize);
  });
});
// Default: 640×360 landscape with letterboxing
```

### Recipe 3: Canvas Game (Portrait)

For puzzle games, card games, match-3, mobile-style games - use portrait preset.

```ts
import { game } from 'star-canvas';

game(({ ctx, width, height, loop, canvas, toStagePoint }) => {
  // width = 360, height = 640 (always, with letterboxing)
  const cellSize = 40;
  const gridCols = 8;
  const gridRows = 12;

  // Center the grid
  const gridWidth = gridCols * cellSize;
  const gridX = (width - gridWidth) / 2;
  const gridY = 80;

  canvas.addEventListener('pointerdown', (e) => {
    const { x, y } = toStagePoint(e);
    // Handle tap on grid...
  });

  loop((dt) => {
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#4338ca';
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        ctx.strokeRect(
          gridX + col * cellSize,
          gridY + row * cellSize,
          cellSize, cellSize
        );
      }
    }
  });
}, { preset: 'portrait' });  // 360×640 portrait with letterboxing
```

### Recipe 4: Custom Resolution

For games that need different dimensions (e.g., pixel art at 320×180).

```ts
import { game } from 'star-canvas';

game(({ ctx, width, height, loop, toStagePoint, canvas }) => {
  // Custom 320×180 resolution (retro pixel art style)
  const player = { x: 160, y: 90 };  // Center

  canvas.addEventListener('pointerdown', (e) => {
    const { x, y } = toStagePoint(e);
    console.log('Tapped at:', x, y);  // Always 0-320, 0-180
  });

  loop((dt) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(player.x - 8, player.y - 8, 16, 16);
  });
}, { width: 320, height: 180 });  // Custom resolution with letterboxing
```

### Recipe 5: Complex Game with Canvas + UI + Events (like FLOW)

```ts
import Star from 'star-sdk';
Star.init({ gameId: '<gameId from .starrc>' });

Star.game(({ ctx, width, height, loop, ui, on, canvas, toStagePoint }) => {
  let score = 0;
  let state = 'menu';

  function handleTap() {
    if (state === 'menu' || state === 'gameover') {
      startGame();
    } else if (state === 'playing') {
      // ... (player float logic) ...
    }
  }

  // 1. Listen for screen taps - this makes UI click-through automatically
  canvas.addEventListener('pointerdown', handleTap);

  // 2. Listen for button clicks - buttons need pointer-events-auto
  on('click', '#leaderboard-btn', (e) => {
    e.stopPropagation();
    Star.leaderboard.show();
  });

  // 3. Render UI - buttons need pointer-events-auto to intercept clicks
  let lastState = null;
  let lastScore = -1;

  function updateUI() {
    // CRITICAL: Only render when state/score changes, NOT every frame
    // Calling ui.render() in the loop breaks buttons (DOM recreation)
    if (state === lastState && score === lastScore) return;
    lastState = state;
    lastScore = score;

    if (state === 'menu') {
      ui.render(`
        <div class="h-full flex flex-col items-center justify-center text-white">
          <h1 class="text-6xl font-bold mb-4">FLOW</h1>
          <div class="text-2xl animate-pulse">TAP TO START</div>
        </div>`);
    } else if (state === 'playing') {
      ui.render(`
        <div class="absolute top-8 left-1/2 -translate-x-1/2 text-white">
          <div class="text-5xl font-bold">\${score}</div>
        </div>`);
    } else if (state === 'gameover') {
      ui.render(`
        <div class="h-full flex flex-col items-center justify-center text-white">
          <div class="text-3xl mb-4">GAME OVER</div>
          <div class="text-6xl mb-4">\${score}</div>
          <button id="leaderboard-btn" class="px-6 py-3 mb-4 bg-purple-600 rounded-lg pointer-events-auto">
            VIEW LEADERBOARD
          </button>
          <div class="text-xl animate-pulse">TAP TO RESTART</div>
        </div>`);
    }
  }

  // 4. Call updateUI when state changes (NOT every frame)
  updateUI();

  // Update when state transitions happen
  function startGame() {
    state = 'playing';
    score = 0;
    updateUI();
  }

  function endGame() {
    state = 'gameover';
    // Submit score to leaderboard
    Star.leaderboard.submit(score);
    updateUI();
  }
});
```

### Recipe 6: Safe Canvas Transforms (scoped)

When applying temporary transforms (translate, rotate, scale), use `scoped()` to automatically restore the context state:

```ts
import { game } from 'star-canvas';

game(({ ctx, scoped, loop }) => {
  const cards = [
    { x: 100, y: 100, angle: 0.1, visible: true },
    { x: 200, y: 150, angle: -0.2, visible: true },
  ];

  function drawCard(card) {
    scoped(() => {
      ctx.translate(card.x, card.y);
      ctx.rotate(card.angle);
      if (!card.visible) return; // Safe! restore() still happens
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(-40, -60, 80, 120);
    });
  }

  loop(() => {
    ctx.clearRect(0, 0, 800, 600);
    cards.forEach(drawCard);
  });
});
```

**Why use `scoped()`:** Prevents transform stack corruption from early returns, exceptions, or forgetting `ctx.restore()`. The context is always restored, even if the function exits early.

### Recipe 7: Drag and Drop with createDrag() (RECOMMENDED)

Use the `createDrag()` helper - it handles coordinate conversion and offset tracking automatically.

```ts
import { game } from 'star-canvas';

game(({ ctx, width, height, loop, canvas, createDrag }) => {
  // Size relative to height for consistency
  const pieceSize = height * 0.15;

  const pieces = [
    { x: width * 0.2, y: height * 0.3, color: '#ef4444' },
    { x: width * 0.4, y: height * 0.4, color: '#22c55e' },
    { x: width * 0.6, y: height * 0.3, color: '#3b82f6' },
  ];

  // Create drag helper - handles coordinate conversion automatically
  const drag = createDrag();

  function hitTest(x, y) {
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      if (x >= p.x && x < p.x + pieceSize && y >= p.y && y < p.y + pieceSize) {
        return p;
      }
    }
    return null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId); // IMPORTANT: Ensures drag works outside canvas
    const { x, y } = drag.point(e);        // Convert coordinates
    const hit = hitTest(x, y);
    if (hit) {
      drag.grab(e, hit);                   // Start drag with offset from cursor
      canvas.style.cursor = 'grabbing';
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    drag.move(e);                          // Updates grabbed object position
    if (!drag.dragging) {
      const { x, y } = drag.point(e);
      canvas.style.cursor = hitTest(x, y) ? 'grab' : 'default';
    }
  });

  canvas.addEventListener('pointerup', () => {
    const dropped = drag.release();        // Returns dropped object (or null)
    if (dropped) {
      console.log('Dropped:', dropped);
    }
    canvas.style.cursor = 'default';
  });

  loop(() => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    for (const p of pieces) {
      ctx.fillStyle = drag.dragging === p ? '#fbbf24' : p.color;
      ctx.fillRect(p.x, p.y, pieceSize, pieceSize);
    }
  });
});
```

**CRITICAL: Always use `setPointerCapture()`** - This ensures drags work even when the pointer moves outside the canvas. Without it, fast drags can leave objects stuck mid-drag.

### Recipe 8: Drag and Drop (Manual Pattern)

If you need more control, here's the manual approach with `toStagePoint()`.

```ts
import { game } from 'star-canvas';

game(({ ctx, width, height, loop, canvas, toStagePoint }) => {
  const pieceSize = height * 0.15;
  const pieces = [
    { x: width * 0.2, y: height * 0.3, color: '#ef4444' },
    { x: width * 0.4, y: height * 0.4, color: '#22c55e' },
  ];

  // Manual drag state
  let dragging = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  function hitTest(px, py) {
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      if (px >= p.x && px < p.x + pieceSize && py >= p.y && py < p.y + pieceSize) {
        return p;
      }
    }
    return null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);  // Ensures drag works outside canvas
    const { x, y } = toStagePoint(e);       // CRITICAL: Convert coordinates!
    const hit = hitTest(x, y);
    if (hit) {
      dragging = hit;
      dragOffsetX = x - hit.x;              // Store offset
      dragOffsetY = y - hit.y;
      canvas.style.cursor = 'grabbing';
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const { x, y } = toStagePoint(e);  // CRITICAL: Convert here too!
    if (dragging) {
      dragging.x = x - dragOffsetX;
      dragging.y = y - dragOffsetY;
    } else {
      canvas.style.cursor = hitTest(x, y) ? 'grab' : 'default';
    }
  });

  canvas.addEventListener('pointerup', () => {
    dragging = null;
    canvas.style.cursor = 'default';
  });

  loop(() => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    for (const p of pieces) {
      ctx.fillStyle = dragging === p ? '#fbbf24' : p.color;
      ctx.fillRect(p.x, p.y, pieceSize, pieceSize);
    }
  });
});
```

**Common Drag-Drop Mistakes:**

1. ❌ Forgetting `toStagePoint()` in pointermove → `createDrag()` fixes this
2. ❌ No drag offset (piece "jumps" to cursor) → `createDrag()` fixes this
3. ❌ Using `e.clientX/clientY` directly → `createDrag()` fixes this
4. ❌ Not clearing state on pointerup → `createDrag()` fixes this
5. ❌ Missing `setPointerCapture()` (drags break outside canvas) → **You must add this!**

**Recommendation:** Use `createDrag()` + `setPointerCapture()` for bulletproof drag-and-drop.