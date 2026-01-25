import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
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
        server.middlewares.use('/npc-icons', (req, res, next) => {
          const iconPath = path.resolve(__dirname, '../data/GUI/Compendium/Entries', req.url!.slice(1) || '')
          if (fs.existsSync(iconPath) && fs.statSync(iconPath).isFile()) {
            res.setHeader('Content-Type', 'image/png')
            fs.createReadStream(iconPath).pipe(res)
          } else {
            next()
          }
        })
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
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate recharts (heavy, only used in /admin)
          'vendor-recharts': ['recharts'],
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
