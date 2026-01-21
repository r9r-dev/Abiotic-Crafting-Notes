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
        server.middlewares.use('/icons', (req, res, next) => {
          const iconPath = path.resolve(__dirname, '../data/icons', req.url!.slice(1) || '')
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
})
