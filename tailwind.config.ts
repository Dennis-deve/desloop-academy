import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope Variable', 'Manrope', 'system-ui', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
      },
      colors: {
        canvas: 'var(--canvas)',
        panel: 'var(--panel)',
        raised: 'var(--raised)',
        line: 'var(--line)',
        heading: 'var(--heading)',
        body: 'var(--body)',
        subdued: 'var(--subdued)',
        ink: { 950: '#091226', 900: '#142344', 800: '#203257', 700: '#34496B' },
        brand: {
          50: '#F4F0FF',
          100: '#EAE2FF',
          200: '#D2C4FF',
          500: '#6E51DE',
          600: '#5036C5',
          700: '#402BA6',
        },
        mint: { 50: '#E9F8F3', 100: '#D1F0E5', 500: '#279D7E', 700: '#176E59' },
        amber: { 50: '#FFF5DF', 100: '#FCE8B6', 500: '#D99124' },
        surface: { 50: '#FBFCFE', 100: '#F6F8FC', 200: '#EDF1F7', 300: '#E1E7F0' },
      },
      boxShadow: {
        soft: '0 10px 40px rgba(24, 42, 80, 0.07)',
        float: '0 18px 65px rgba(13, 25, 51, 0.15)',
      },
      borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem', '4xl': '2.25rem' },
      maxWidth: { page: '1232px' },
    },
  },
  plugins: [],
} satisfies Config;
