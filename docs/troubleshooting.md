# Troubleshooting

## Common Issues

### PDF Not Loading

**Symptoms**: Blank flipbook or loading spinner that never completes.

**Solutions**:

1. **CORS Issues**: Ensure the PDF is served from the same origin or the server sends proper CORS headers.

```javascript
// Check for CORS errors in console
// Solution: Host PDF on same domain or configure CORS
```

2. **PDF.js Not Loaded**: Ensure PDF.js is available.

```html
<!-- Add PDF.js before your script -->
<script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs" type="module"></script>
```

3. **Invalid PDF**: Verify the PDF is valid and not corrupted.

### WebGL Renderer Not Working

**Symptoms**: Black screen or falls back to CSS renderer.

**Solutions**:

1. **WebGL Not Supported**: Check browser support.

```javascript
if (!PremiumFlipBook.isWebGLSupported()) {
  console.log('WebGL not supported, using CSS renderer');
}
```

2. **Three.js Not Loaded**: Ensure Three.js is available.

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js" type="module"></script>
```

3. **Context Lost**: Handle WebGL context loss.

```javascript
flipbook.on('error', (error) => {
  if (error.code === 'E303') {
    // WebGL context lost
    flipbook.switchRenderer('css');
  }
});
```

### Images Not Loading

**Symptoms**: Blank pages or broken image icons.

**Solutions**:

1. **Incorrect Paths**: Verify image URLs are correct.

```javascript
// Test images in browser first
const img = new Image();
img.onload = () => console.log('Image OK');
img.onerror = () => console.log('Image failed');
img.src = 'your-image-url.jpg';
```

2. **CORS Issues**: Ensure images are accessible.

3. **Mixed Content**: Don't mix HTTP images on HTTPS pages.

### Touch Not Working

**Symptoms**: Swipe gestures don't work on mobile.

**Solutions**:

1. **Passive Event Listeners**: The library handles this, but ensure no other code is interfering.

2. **Container Size**: Ensure container has proper dimensions.

```css
#flipbook {
  width: 100%;
  height: 100vh;
  touch-action: pan-x pan-y;
}
```

3. **Z-Index Issues**: Make sure nothing is blocking touch events.

### Slow Performance

**Symptoms**: Laggy animations or high memory usage.

**Solutions**:

1. **Reduce Texture Size**:

```javascript
new PremiumFlipBook({
  webgl: {
    maxTextureSize: 1024  // Reduce from default 2048
  },
  performance: {
    renderQuality: 0.8,
    cacheSize: 10  // Reduce cache
  }
});
```

2. **Use Optimized Source**: Pre-render PDF to images.

```bash
npx pfb-convert document.pdf --output ./optimized --quality 80
```

3. **Use CSS Renderer**: Less GPU intensive.

```javascript
new PremiumFlipBook({
  renderMode: 'css'
});
```

4. **Reduce Preloading**:

```javascript
new PremiumFlipBook({
  performance: {
    preloadPages: 1
  }
});
```

### Memory Leaks

**Symptoms**: Memory usage grows over time.

**Solutions**:

1. **Destroy When Done**: Always call destroy.

```javascript
// When removing flipbook
flipbook.destroy();
flipbook = null;
```

2. **Clear Unused Pages**:

```javascript
// Clear pages far from current
flipbook.source.clearCache();
```

### Keyboard Not Working

**Symptoms**: Arrow keys don't navigate.

**Solutions**:

1. **Focus Required**: Click on flipbook or tab to it.

```javascript
// Focus programmatically
flipbook.container.focus();
```

2. **Input Focus**: Keyboard is disabled when inputs are focused.

### Search Not Finding Text

**Symptoms**: Search returns no results.

**Solutions**:

1. **Source Type**: Search only works with PDF or optimized sources with text.

```javascript
// Images don't support search
// Use optimized source with text content
optimizedImages: {
  pages: [
    { src: 'page1.jpg', text: 'Searchable text content' }
  ]
}
```

2. **PDF Text Layer**: Some PDFs don't have extractable text (scanned images).

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| E101 | Init failed | Check console for details |
| E102 | Container not found | Verify selector/element |
| E103 | Invalid options | Check options format |
| E104 | No source | Provide pdfUrl, images, or optimizedImages |
| E201 | Source load failed | Check network/CORS |
| E202 | PDF load failed | Verify PDF URL and format |
| E203 | Image load failed | Check image URLs |
| E204 | JSON load failed | Verify JSON URL and format |
| E205 | PDF.js not found | Include pdfjs-dist |
| E206 | CORS error | Configure server CORS |
| E207 | Network error | Check connectivity |
| E301 | Renderer init failed | Check WebGL/CSS support |
| E302 | WebGL not supported | Use CSS or swipe renderer |
| E303 | WebGL context lost | Renderer will auto-recover |
| E304 | Three.js not found | Include three.js |
| E305 | CSS 3D not supported | Use swipe renderer |
| E401 | Page not found | Check page number |
| E402 | Page render failed | Check source/memory |
| E501 | Fullscreen not supported | Browser limitation |
| E502 | Search not available | Source doesn't support search |

## Browser-Specific Issues

### Safari

- **Issue**: WebGL may have lower performance
- **Solution**: Consider using CSS renderer on Safari

### Firefox

- **Issue**: PDF worker may not load
- **Solution**: Ensure worker URL is correct

### Mobile Browsers

- **Issue**: Memory constraints
- **Solution**: Use lower texture sizes and cache limits

## Still Having Issues?

1. Check browser console for errors
2. Verify all resources load correctly (Network tab)
3. Test with minimal configuration
4. Try different renderer modes
5. Report issues at: https://github.com/your-repo/issues
