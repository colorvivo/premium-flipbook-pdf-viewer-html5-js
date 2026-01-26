# Events Reference

## Usage

```javascript
// Subscribe to an event
flipbook.on('eventName', (data) => {
  console.log(data);
});

// Subscribe once
flipbook.once('eventName', (data) => {
  console.log('Only called once');
});

// Unsubscribe
const handler = (data) => {};
flipbook.on('eventName', handler);
flipbook.off('eventName', handler);

// Unsubscribe all
flipbook.off('eventName');
```

## Lifecycle Events

### `init`

Fired when initialization begins.

```javascript
flipbook.on('init', () => {
  console.log('Initializing...');
});
```

### `ready`

Fired when flipbook is ready to use.

```javascript
flipbook.on('ready', ({ flipbook }) => {
  console.log('FlipBook is ready!');
  console.log('Total pages:', flipbook.getPageCount());
});
```

### `destroy`

Fired before the flipbook is destroyed.

```javascript
flipbook.on('destroy', () => {
  console.log('Cleaning up...');
});
```

### `error`

Fired when an error occurs.

```javascript
flipbook.on('error', (error) => {
  console.error('Error:', error.message);
  console.error('Code:', error.code);
});
```

## Page Events

### `pageChange`

Fired when the current page changes.

```javascript
flipbook.on('pageChange', ({ page, previousPage, totalPages }) => {
  console.log(`Page ${page} of ${totalPages}`);
});
```

### `pageLoad`

Fired when a page finishes loading.

```javascript
flipbook.on('pageLoad', ({ page }) => {
  console.log(`Page ${page} loaded`);
});
```

### `pageRender`

Fired when a page is rendered.

```javascript
flipbook.on('pageRender', ({ page }) => {
  console.log(`Page ${page} rendered`);
});
```

## Flip Events

### `flipStart`

Fired when a flip animation starts.

```javascript
flipbook.on('flipStart', ({ direction, fromPage }) => {
  console.log(`Flipping ${direction} from page ${fromPage}`);
});
```

### `flipProgress`

Fired during flip animation.

```javascript
flipbook.on('flipProgress', ({ progress }) => {
  console.log(`Flip progress: ${progress * 100}%`);
});
```

### `flipEnd`

Fired when a flip animation completes.

```javascript
flipbook.on('flipEnd', ({ page }) => {
  console.log(`Landed on page ${page}`);
});
```

### `flipCancel`

Fired when a flip animation is cancelled.

```javascript
flipbook.on('flipCancel', () => {
  console.log('Flip was cancelled');
});
```

## Zoom Events

### `zoomChange`

Fired when zoom level changes.

```javascript
flipbook.on('zoomChange', ({ zoom, previousZoom }) => {
  console.log(`Zoom: ${zoom * 100}%`);
});
```

### `zoomStart`

Fired when zooming starts (pinch/wheel).

```javascript
flipbook.on('zoomStart', ({ zoom }) => {
  console.log('Zooming started');
});
```

### `zoomEnd`

Fired when zooming ends.

```javascript
flipbook.on('zoomEnd', ({ zoom }) => {
  console.log('Zooming ended');
});
```

### `panStart`

Fired when panning starts.

```javascript
flipbook.on('panStart', ({ x, y }) => {
  console.log('Panning started');
});
```

### `panMove`

Fired during panning.

```javascript
flipbook.on('panMove', ({ x, y }) => {
  console.log(`Pan position: ${x}, ${y}`);
});
```

### `panEnd`

Fired when panning ends.

```javascript
flipbook.on('panEnd', ({ x, y }) => {
  console.log('Panning ended');
});
```

## UI Events

### `toolbarToggle`

Fired when toolbar visibility changes.

```javascript
flipbook.on('toolbarToggle', ({ isVisible }) => {
  console.log(`Toolbar ${isVisible ? 'shown' : 'hidden'}`);
});
```

### `thumbnailsToggle`

Fired when thumbnails panel toggles.

```javascript
flipbook.on('thumbnailsToggle', ({ isOpen }) => {
  console.log(`Thumbnails ${isOpen ? 'opened' : 'closed'}`);
});
```

### `tocToggle`

Fired when TOC panel toggles.

```javascript
flipbook.on('tocToggle', ({ isOpen }) => {
  console.log(`TOC ${isOpen ? 'opened' : 'closed'}`);
});
```

### `searchToggle`

Fired when search panel toggles.

```javascript
flipbook.on('searchToggle', ({ isOpen }) => {
  console.log(`Search ${isOpen ? 'opened' : 'closed'}`);
});
```

### `fullscreenChange`

Fired when fullscreen state changes.

```javascript
flipbook.on('fullscreenChange', ({ isFullscreen }) => {
  console.log(`Fullscreen: ${isFullscreen}`);
});
```

## Feature Events

### `autoplayStart`

Fired when autoplay starts.

```javascript
flipbook.on('autoplayStart', () => {
  console.log('Autoplay started');
});
```

### `autoplayStop`

Fired when autoplay stops.

```javascript
flipbook.on('autoplayStop', () => {
  console.log('Autoplay stopped');
});
```

### `lightboxOpen`

Fired when lightbox opens.

```javascript
flipbook.on('lightboxOpen', () => {
  console.log('Lightbox opened');
});
```

### `lightboxClose`

Fired when lightbox closes.

```javascript
flipbook.on('lightboxClose', () => {
  console.log('Lightbox closed');
});
```

### `deepLinkChange`

Fired when URL hash changes.

```javascript
flipbook.on('deepLinkChange', ({ page, hash }) => {
  console.log(`Deep link: ${hash}`);
});
```

## Source Events

### `sourceLoadStart`

Fired when source loading begins.

```javascript
flipbook.on('sourceLoadStart', () => {
  console.log('Loading source...');
});
```

### `sourceLoadProgress`

Fired during source loading.

```javascript
flipbook.on('sourceLoadProgress', ({ progress }) => {
  console.log(`Loading: ${progress}%`);
});
```

### `sourceLoadComplete`

Fired when source loading completes.

```javascript
flipbook.on('sourceLoadComplete', ({ pageCount, type }) => {
  console.log(`Loaded ${pageCount} pages from ${type}`);
});
```

### `sourceLoadError`

Fired when source loading fails.

```javascript
flipbook.on('sourceLoadError', (error) => {
  console.error('Failed to load source:', error);
});
```

## Renderer Events

### `rendererChange`

Fired when renderer changes.

```javascript
flipbook.on('rendererChange', ({ renderer }) => {
  console.log(`Switched to ${renderer} renderer`);
});
```

### `resize`

Fired when container is resized.

```javascript
flipbook.on('resize', ({ width, height }) => {
  console.log(`Resized to ${width}x${height}`);
});
```

### `modeChange`

Fired when display mode changes (single/double).

```javascript
flipbook.on('modeChange', ({ mode }) => {
  console.log(`Display mode: ${mode}`);
});
```
