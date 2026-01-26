import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'PremiumFlipBook',
      formats: ['es', 'umd', 'iife'],
      fileName: (format) => {
        if (format === 'es') return 'premium-flipbook.esm.js';
        if (format === 'umd') return 'premium-flipbook.min.js';
        return 'premium-flipbook.iife.js';
      }
    },
    rollupOptions: {
      external: ['pdfjs-dist', 'three'],
      output: {
        globals: {
          'pdfjs-dist': 'pdfjsLib',
          'three': 'THREE'
        },
        exports: 'named',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'premium-flipbook.css';
          }
          return assetInfo.name;
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    },
    sourcemap: true,
    outDir: 'dist'
  },
  server: {
    port: 3000,
    open: '/examples/index.html'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
