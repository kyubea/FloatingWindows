# FloatingWindows

A lightweight, dependency-free JavaScript library for creating draggable, resizable, minimizable floating windows.

![Version](https://img.shields.io/badge/version-1.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Size](https://img.shields.io/badge/size-~8kb-orange)

## FloatingWindows 

- **Lightweight** - ~8kb minified, with zero dependencies. Designed for quick, easy, non-obtrusive and modular use
- **Draggable** - Smooth drag with touch support
- **Resizable** - Corner handle with configurable min/max constraints
- **Smart Snapping** - Snapping to edges and other windows
- **Persistent** - Remembers position/size via localStorage
- **Dock** - Ability to minimize windows to a dock bar
- **Keyboard** - Keyboard support. By default, arrow keys to move, escape to minimize
- **Themeable** - Provided default stylesheet with fully customizable CSS
- **Container Bounds** - Constrain windows to specific elements

## Installation

### CDN
```html
<script src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/floating-windows@1.0.1/dist/floating-windows.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kyubea/floating-windows@1.0.1/dist/floating-windows.min.css">
```

### Direct Download
Download `floating-windows.js` and `floating-windows.css` from the [releases page](https://github.com/kyubea/floating-windows/releases).

```html
<script src="floating-windows.js"></script>
<link rel="stylesheet" href="floating-windows.css">
```

### npm
```bash
npm install floating-windows
```
```js
import FloatingWindows from 'floating-windows';
```

## Quick Start

```js
// Create a window manager
const wm = new FloatingWindows();

// Create a window
const win = wm.create('Hello World', {
  content: '<p>Welcome to FloatingWindows!</p>',
  position: { x: 100, y: 100 },
  size: { width: 300, height: 200 }
});

// Window methods
win.minimize();
win.restore();
win.close();
win.bringToFront();
win.setContent('<p>New content!</p>');
win.setTitle('New Title');
```

## Configuration

### Manager Options

```js
const wm = new FloatingWindows({
  container: 'body',              // Defines where the windows live
  persistence: true,              // Remember positions
  storageKey: 'my-windows',       // localStorage key
  snapping: true,                 // Enables edge snapping
  snapThreshold: 24,              // Snap distance (px)
  snapPadding: 4,                 // Gap between snapped windows
  edgeMargin: 4,                  // Min distance from edges
  dock: { position: 'top' },      // 'top', 'bottom-right', 'none'
  injectStyles: true              // Auto-inject functional CSS
});
```

### Window Options

```js
wm.create('My Window', {
  id: 'unique-id',                // Will auto-generate if omitted
  content: '<p>Hello!</p>',       // HTML string or Element
  position: { x: 100, y: 100 },
  size: { width: 400, height: 300 },
  
  // Constraints
  minWidth: 200,
  maxWidth: 800,
  minHeight: 150,
  maxHeight: 600,
  
  // Behavior
  bounds: '#container',           // Constrain to element
  draggable: true,                // Can be dragged
  resizable: true,                // Can be resized
  closable: true,                 // Show close button
  minimizable: true               // Show minimize button
});
```

## Examples

### Basic Window
```js
wm.create('Notes', {
  content: '<p>Remember to water the plants!</p>'
});
```

### Locked Display Widget
```js
wm.create('Status', {
  content: '<div class="status">Online</div>',
  draggable: false,
  resizable: false,
  closable: false,
  minimizable: false
});
```

### Bounded to Container
```js
wm.create('Bounded Window', {
  content: '<p>I stay inside #app!</p>',
  bounds: '#app',
  position: { x: 10, y: 10 }
});
```

### Listen to Events
```js
const win = wm.create('Events Demo', { content: '...' });

win.on('focus', () => console.log('Focused!'));
win.on('minimize', () => console.log('Minimized!'));
win.on('restore', () => console.log('Restored!'));
win.on('close', () => console.log('Closed!'));
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Arrow Keys | Move window (8px) |
| Shift + Arrows | Move window (20px) |
| Escape | Minimize window |
| Shift + Drag | Override snapping |

## Styling

The library injects minimal functional CSS. For visual styling, include the theme file:

```css
/* Override default theme */
.fw-window {
  background: #1a1a2e;
  border-color: #4a4a6a;
  border-radius: 12px;
}

.fw-header {
  background: linear-gradient(135deg, #4a4a6a, #2a2a4a);
}

.fw-title {
  color: #fff;
}
```

### CSS Classes Reference

| Class | Element |
|-------|---------|
| `.fw-window` | Window container |
| `.fw-header` | Title bar |
| `.fw-title` | Title text |
| `.fw-controls` | Button container |
| `.fw-btn` | Control button |
| `.fw-btn-minimize` | Minimize button |
| `.fw-btn-close` | Close button |
| `.fw-body` | Content area |
| `.fw-resizer` | Resize handle |
| `.fw-dock` | Dock container |
| `.fw-dock-btn` | Dock button |
| `.fw-locked` | Non-draggable window |
| `.fw-no-resize` | Non-resizable window |
| `[data-fw-active="true"]` | Focused window |

## API Reference

### Manager Methods

| Method | Description |
|--------|-------------|
| `create(title, opts)` | Create a new window |
| `get(id)` | Get window by ID |
| `getAll()` | Get all windows |
| `closeAll()` | Close all windows |
| `minimizeAll()` | Minimize all windows |
| `restoreAll()` | Restore all windows |
| `clearStorage()` | Clear saved positions |
| `destroy()` | Clean up everything |

### Window Methods

| Method | Description |
|--------|-------------|
| `minimize()` | Minimize to dock |
| `restore()` | Restore from dock |
| `close()` | Close window |
| `bringToFront()` | Focus window |
| `setContent(html)` | Update content |
| `setTitle(title)` | Update title |
| `setPosition(x, y)` | Move window |
| `setSize(w, h)` | Resize window |
| `getPosition()` | Get `{ x, y }` |
| `getSize()` | Get `{ width, height }` |
| `on(event, fn)` | Add event listener |
| `off(event, fn)` | Remove event listener |

### Window Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `title` | string | Window title |
| `element` | HTMLElement | DOM element |
| `isMinimized` | boolean | Minimized state |
| `isClosed` | boolean | Closed state |

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

MIT © kyubea

made with lots of 💜 for the creative web! never stop creating.
