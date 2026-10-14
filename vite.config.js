import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/mailersend': {
        target: 'https://api.mailersend.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mailersend/, ''),
        secure: true,
      },
    },
  },
})
