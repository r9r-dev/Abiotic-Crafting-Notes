import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
// import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'css-preload',
      transformIndexHtml(html, ctx) {
        // Add preload hint for CSS (keeps render-blocking but improves loading priority)
        if (ctx.bundle) {
          const cssFile = Object.keys(ctx.bundle).find(
            (name) => name.endsWith('.css') && name.includes('index')
          )
          if (cssFile) {
            // Add preload hint at top of head for faster CSS loading
            const preloadTag = `<link rel="preload" href="/${cssFile}" as="style" />`
            html = html.replace(
              '<meta charset="UTF-8" />',
              `<meta charset="UTF-8" />\n    ${preloadTag}`
            )
          }
        }
        return html
      },
    },
    {
      name: 'serve-icons',
      configureServer(server) {
        // Serve optimized WebP icons
        server.middlewares.use('/icons-webp', (req, res, next) => {
          const iconPath = path.resolve(__dirname, '../data/icons-webp', req.url!.slice(1) || '')
          if (fs.existsSync(iconPath) && fs.statSync(iconPath).isFile()) {
            res.setHeader('Content-Type', 'image/webp')
            fs.createReadStream(iconPath).pipe(res)
          } else {
            next()
          }
        })
        // Serve original PNG icons (fallback)
        server.middlewares.use('/icons', (req, res, next) => {
          const iconPath = path.resolve(__dirname, '../data/icons', req.url!.slice(1) || '')
          if (fs.existsSync(iconPath) && fs.statSync(iconPath).isFile()) {
            res.setHeader('Content-Type', 'image/png')
            fs.createReadStream(iconPath).pipe(res)
          } else {
            next()
          }
        })
        // Serve optimized WebP Compendium images
        server.middlewares.use('/compendium-webp', (req, res, next) => {
          const imagePath = path.resolve(__dirname, '../data/compendium-webp', req.url!.slice(1) || '')
          if (fs.existsSync(imagePath) && fs.statSync(imagePath).isFile()) {
            res.setHeader('Content-Type', 'image/webp')
            fs.createReadStream(imagePath).pipe(res)
          } else {
            next()
          }
        })
        // Serve NPC icons (fallback PNG)
        server.middlewares.use('/npc-icons', (req, res, next) => {
          const iconPath = path.resolve(__dirname, '../data/GUI/Compendium/Entries', req.url!.slice(1) || '')
          if (fs.existsSync(iconPath) && fs.statSync(iconPath).isFile()) {
            res.setHeader('Content-Type', 'image/png')
            fs.createReadStream(iconPath).pipe(res)
          } else {
            next()
          }
        })
        // Serve Compendium images (fallback PNG)
        server.middlewares.use('/compendium', (req, res, next) => {
          const iconPath = path.resolve(__dirname, '../data/GUI/Compendium/Entries', req.url!.slice(1) || '')
          if (fs.existsSync(iconPath) && fs.statSync(iconPath).isFile()) {
            res.setHeader('Content-Type', 'image/png')
            fs.createReadStream(iconPath).pipe(res)
          } else {
            next()
          }
        })
      },
    },
    // Bundle analyzer (uncomment for analysis)
    // visualizer({
    //   filename: 'stats.json',
    //   template: 'raw-data',
    //   gzipSize: true,
    //   brotliSize: true,
    // }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
    fs: {
      allow: ['..'],
    },
  },
  build: {
    // Optimize minification
    minify: 'esbuild',
    // Disable modulepreload for lazy-loaded chunks (recharts only used on /admin)
    modulePreload: {
      resolveDependencies: (filename, deps) => {
        // Don't preload recharts - it's only used on /admin page
        return deps.filter(dep => !dep.includes('recharts'));
      },
    },
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Note: recharts is NOT listed here - let Vite handle it automatically
          // so it only loads with AdminPage (lazy-loaded)
          // Separate radix UI components
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    // Warn on large chunks
    chunkSizeWarningLimit: 500,
  },
})
