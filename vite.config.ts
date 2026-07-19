/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// בפריסה ל-GitHub Pages (project page) האפליקציה יושבת תחת נתיב-משנה
// כמו /triptales/ במקום השורש. ה-workflow מגדיר GH_PAGES=true בזמן build
// כדי ש-base יתאים לנתיב הזה; בפיתוח ובבנייה מקומית base='/'.
const repoBase = process.env.GH_PAGES ? '/triptales/' : '/'

// https://vitejs.dev/config/
export default defineConfig({
  base: repoBase,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
