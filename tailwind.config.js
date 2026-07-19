/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        coral: 'var(--coral)',
        'coral-soft': 'var(--coral-soft)',
        sea: 'var(--sea)',
        'sea-soft': 'var(--sea-soft)',
        sun: 'var(--sun)',
        lilac: 'var(--lilac)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        paper: 'var(--paper)',
        canvas: 'var(--canvas)',
        success: 'var(--success)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        script: 'var(--f-script)',
        display: 'var(--f-display)',
        hand: 'var(--f-hand)',
        body: 'var(--f-body)',
        mono: 'var(--f-mono)',
      },
      maxWidth: {
        column: '430px',
      },
    },
  },
  plugins: [],
}
