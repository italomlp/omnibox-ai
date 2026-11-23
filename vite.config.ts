import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { toolCatalogPlugin } from './scripts/tool-catalog.mjs'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [toolCatalogPlugin(), react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
