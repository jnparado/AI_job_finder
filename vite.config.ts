import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const supabaseUrl =
    fileEnv.VITE_SUPABASE_URL ||
    fileEnv.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  const anon =
    fileEnv.VITE_SUPABASE_ANON_KEY ||
    fileEnv.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(anon),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
        '@shared': path.resolve(import.meta.dirname, './shared'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react'
            if (id.includes('node_modules/react-router')) return 'router'
            if (id.includes('node_modules/@tanstack')) return 'query'
            if (id.includes('node_modules/@supabase')) return 'supabase'
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: true,
          timeout: 120_000,
          proxyTimeout: 120_000,
        },
      },
    },
  }
})
