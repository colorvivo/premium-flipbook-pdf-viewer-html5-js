# API Reference

## Constructor

```javascript
new PremiumFlipBook(options)
```

Creates a new flipbook instance. See [Options Reference](./options.md) for all options.

## Methods

### Navigation

#### `goToPage(page)`

Navigate to a specific page.

- **Parameters**: `page` (number) - Page number (1-based)
- **Returns**: `Promise<boolean>` - Success status

```javascript
await flipbook.goToPage(5);
```

#### `nextPage()`

Navigate to the next page.

- **Returns**: `Promise<boolean>` - Success status

```javascript
await flipbook.nextPage();
```

#### `prevPage()`

Navigate to the previous page.

- **Returns**: `Promise<boolean>` - Success status

```javascript
await flipbook.prevPage();
```

#### `firstPage()`

Navigate to the first page.

- **Returns**: `Promise<boolean>` - Success status

```javascript
await flipbook.firstPage();
```

#### `lastPage()`

Navigate to the last page.

- **Returns**: `Promise<boolean>` - Success status

```javascript
await flipbook.lastPage();
```

#### `setTransition(type)`

Set the page transition effect.

- **Parameters**: `type` (string) - Transition type: `'fade'`, `'slide'`, `'flip'`, `'none'`

```javascript
flipbook.setTransition('slide');
flipbook.setTransition('flip');
flipbook.setTransition('fade');
flipbook.setTransition('none');
```

#### `getTransition()`

Get current transition type.

- **Returns**: `string` - Current transition type

```javascript
const transition = flipbook.getTransition();
```

#### `setDisplayMode(mode)`

Set display mode (single or double page).

- **Parameters**: `mode` (string) - Display mode: `'single'` or `'double'`
- **Returns**: `boolean` - Success status

```javascript
flipbook.setDisplayMode('single');  // Show one page
flipbook.setDisplayMode('double');  // Show two pages side by side
```

### Zoom

#### `setZoom(level)`

Set the zoom level.

- **Parameters**: `level` (number) - Zoom level (1 = 100%)
- **Returns**: `boolean` - Success status

```javascript
flipbook.setZoom(2);  // 200%
```

#### `zoomIn(step?)`

Increase zoom level.

- **Parameters**: `step` (number, optional) - Zoom increment (default: 0.25)
- **Returns**: `boolean` - Success status

```javascript
flipbook.zoomIn();
flipbook.zoomIn(0.5);  // Custom step
```

#### `zoomOut(step?)`

Decrease zoom level.

- **Parameters**: `step` (number, optional) - Zoom decrement (default: 0.25)
- **Returns**: `boolean` - Success status

```javascript
flipbook.zoomOut();
```

#### `resetZoom()`

Reset zoom to 1x and clear pan.

- **Returns**: `boolean` - Success status

```javascript
flipbook.resetZoom();
```

### UI Controls

#### `toggleThumbnails(show?)`

Toggle thumbnail panel visibility.

- **Parameters**: `show` (boolean, optional) - Force show/hide

```javascript
flipbook.toggleThumbnails();      // Toggle
flipbook.toggleThumbnails(true);  // Show
flipbook.toggleThumbnails(false); // Hide
```

#### `toggleTOC(show?)`

Toggle table of contents panel visibility.

- **Parameters**: `show` (boolean, optional) - Force show/hide

```javascript
flipbook.toggleTOC();
```

#### `toggleSearch(show?)`

Toggle search panel visibility.

- **Parameters**: `show` (boolean, optional) - Force show/hide

```javascript
flipbook.toggleSearch();
```

#### `toggleFullscreen()`

Toggle fullscreen mode.

- **Returns**: `Promise<boolean>` - Success status

```javascript
await flipbook.toggleFullscreen();
```

### Search

#### `search(query)`

Search for text in the document.

- **Parameters**: `query` (string) - Search query
- **Returns**: `Promise<Object[]>` - Array of search results

```javascript
const results = await flipbook.search('hello');
// [{ page: 3, context: '...hello world...', highlight: {...} }]
```

#### `clearSearch()`

Clear search results.

```javascript
flipbook.clearSearch();
```

### Autoplay

#### `startAutoplay(interval?)`

Start automatic page flipping.

- **Parameters**: `interval` (number, optional) - Interval in ms

```javascript
flipbook.startAutoplay();
flipbook.startAutoplay(3000);  // 3 seconds
```

#### `stopAutoplay()`

Stop automatic page flipping.

```javascript
flipbook.stopAutoplay();
```

#### `toggleAutoplay()`

Toggle autoplay state.

- **Returns**: `boolean` - New autoplay state

```javascript
const isPlaying = flipbook.toggleAutoplay();
```

### Lightbox

#### `openLightbox(page?)`

Open flipbook in lightbox mode.

- **Parameters**: `page` (number, optional) - Page to show

```javascript
flipbook.openLightbox();
flipbook.openLightbox(5);  // Open to page 5
```

#### `closeLightbox()`

Close lightbox.

```javascript
flipbook.closeLightbox();
```

### State Getters

#### `getCurrentPage()`

Get current page number.

- **Returns**: `number`

```javascript
const page = flipbook.getCurrentPage();
```

#### `getPageCount()`

Get total number of pages.

- **Returns**: `number`

```javascript
const total = flipbook.getPageCount();
```

#### `getZoom()`

Get current zoom level.

- **Returns**: `number`

```javascript
const zoom = flipbook.getZoom();
```

#### `getDisplayMode()`

Get current display mode.

- **Returns**: `string` - 'single' or 'double'

```javascript
const mode = flipbook.getDisplayMode();
```

#### `getRendererType()`

Get current renderer type.

- **Returns**: `string` - 'webgl', 'css', or 'swipe'

```javascript
const renderer = flipbook.getRendererType();
```

#### `isFlipping()`

Check if a flip animation is in progress.

- **Returns**: `boolean`

```javascript
if (!flipbook.isFlipping()) {
  flipbook.nextPage();
}
```

#### `isLoading()`

Check if flipbook is still loading.

- **Returns**: `boolean`

```javascript
if (flipbook.isLoading()) {
  showSpinner();
}
```

#### `getState()`

Get complete state object.

- **Returns**: `Object`

```javascript
const state = flipbook.getState();
```

### Renderer

#### `switchRenderer(type)`

Switch to a different renderer.

- **Parameters**: `type` (string) - 'webgl', 'css', or 'swipe'
- **Returns**: `Promise<boolean>` - Success status

```javascript
await flipbook.switchRenderer('css');
```

### Source

#### `getPage(page, scale?)`

Get page content.

- **Parameters**:
  - `page` (number) - Page number
  - `scale` (number, optional) - Render scale (default: 1)
- **Returns**: `Promise<HTMLCanvasElement|HTMLImageElement>`

```javascript
const canvas = await flipbook.getPage(1, 2);  // Page 1 at 2x
```

#### `getThumbnail(page)`

Get page thumbnail.

- **Parameters**: `page` (number) - Page number
- **Returns**: `Promise<HTMLCanvasElement|HTMLImageElement>`

```javascript
const thumb = await flipbook.getThumbnail(1);
```

#### `getTableOfContents()`

Get table of contents.

- **Returns**: `Object[]`

```javascript
const toc = flipbook.getTableOfContents();
// [{ title: 'Chapter 1', page: 1, level: 0, children: [] }]
```

### Lifecycle

#### `updateOptions(options)`

Update flipbook options.

- **Parameters**: `options` (Object) - Options to update

```javascript
flipbook.updateOptions({
  zoom: { max: 5 }
});
```

#### `refresh()`

Force re-render.

- **Returns**: `Promise`

```javascript
await flipbook.refresh();
```

#### `destroy()`

Clean up and remove flipbook.

```javascript
flipbook.destroy();
```

## Static Methods

#### `PremiumFlipBook.version`

Get library version.

```javascript
console.log(PremiumFlipBook.version);  // '1.0.0'
```

#### `PremiumFlipBook.getBrowserInfo()`

Get browser capabilities.

```javascript
const info = PremiumFlipBook.getBrowserInfo();
```

#### `PremiumFlipBook.isWebGLSupported()`

Check WebGL support.

```javascript
if (PremiumFlipBook.isWebGLSupported()) {
  // Use WebGL renderer
}
```

#### `PremiumFlipBook.isCSS3DSupported()`

Check CSS 3D transform support.

```javascript
if (PremiumFlipBook.isCSS3DSupported()) {
  // Use CSS renderer
}
```
