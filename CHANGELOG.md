# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-04-05

### Fixed

- Corrected CHANGELOG date from 2025 to 2026
- Added repository URL to package.json
- Removed empty `assets/icons/` directory

## [1.0.0] - 2026-01-24

### Added

- Initial release of Premium FlipBook PDF Viewer
- **Renderers**
  - WebGL 3D renderer with Three.js (realistic page flip with lighting and shadows)
  - CSS 3D renderer (hardware-accelerated transforms)
  - Swipe renderer (optimized for mobile devices)
  - Automatic renderer selection based on device capabilities
- **Sources**
  - PDF source with PDF.js integration (lazy loaded)
  - Image array source (no dependencies required)
  - Optimized source with JSON configuration (searchable text, TOC support)
- **UI Components**
  - Configurable toolbar with customizable buttons
  - Thumbnail panel with lazy loading
  - Table of contents panel
  - Search panel with result highlighting
  - Navigation arrows with auto-hide
  - Page number input with keyboard controls
- **Features**
  - Zoom with mouse wheel, pinch gesture, and double-tap
  - Pan when zoomed in
  - Keyboard navigation (arrow keys, Home/End, shortcuts)
  - Touch navigation (swipe, tap zones)
  - Deep linking with URL hash
  - Fullscreen mode
  - Lightbox mode
  - Autoplay with pause on hover
  - Page flip sound effects
- **Responsive Design**
  - Automatic single/double page mode switching
  - Configurable breakpoint
  - RTL (right-to-left) support
- **Developer Experience**
  - ES modules and UMD builds
  - TypeScript-friendly (JSDoc annotations)
  - Comprehensive event system
  - Error handling with error codes
  - Memory-efficient texture caching (LRU)
- **Documentation**
  - Full API documentation
  - Multiple example files
  - Options reference
- **CLI Tool**
  - PDF to optimized images converter

### Technical

- Pure JavaScript (no jQuery dependency)
- Modular architecture with clean separation of concerns
- Event-driven state management
- Progressive enhancement (WebGL → CSS → Swipe fallback)
- Lazy loading for PDF.js and Three.js
- BEM CSS naming convention
- CSS custom properties for theming
- Accessibility features (ARIA labels, keyboard navigation)
