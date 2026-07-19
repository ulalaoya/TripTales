/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// בפריסה ל-GitHub Pages (project page) האפליקציה יושבת תחת נתיב-משנה
// שהוא שם המאגר — /TripTales/ — במקום השורש. ה-workflow מגדיר GH_PAGES=true
// בזמן build כדי ש-base יתאים לנתיב הזה; בפיתוח ובבנייה מקומית base='/'.
// שים לב: הנתיב תלוי-רישיות וחייב להתאים בדיוק לשם המאגר בגיטהב.
const repoBase = process.env.GH_PAGES ? '/TripTales/' : '/'

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
