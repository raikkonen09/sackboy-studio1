import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0b0c',
        card: '#121215',
        accent: '#9ad2a5'
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,0.12)'
      }
    }
  },
  plugins: []
} satisfies Config;