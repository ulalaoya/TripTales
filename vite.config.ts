/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// בפריסה ל-GitHub Pages (project page) האפליקציה יושבת תחת נתיב-משנה
// שהוא שם המאגר — /TripTales/ — במקום השורש. ה-workflow מגדיר GH_PAGES=true
// בזמן build כדי ש-base יתאים לנתיב הזה; בפיתוח ובבנייה מקומית base='/'.
// שים לב: הנתיב תלוי-רישיות וחייב להתאים בדיוק לשם המאגר בגיטהב.
const repoBase = process.env.GH_PAGES ? '/TripTales/' : '/'

// חותמת גרסה גלויה במסך הבית. בלי זה אין דרך לדעת אם המכשיר טוען את הבנייה
// החדשה או גרסה מה-cache — וזה בדיוק מה שהקשה על אבחון "השינויים לא נראים".
// GITHUB_SHA קיים אוטומטית ב-GitHub Actions.
const appCommit = (process.env.GITHUB_SHA ?? 'local').slice(0, 7)
const appBuiltAt = new Date().toISOString().slice(0, 16).replace('T', ' ')

// https://vitejs.dev/config/
export default defineConfig({
  base: repoBase,
  plugins: [react()],
  define: {
    __APP_COMMIT__: JSON.stringify(appCommit),
    __APP_BUILT_AT__: JSON.stringify(appBuiltAt),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
