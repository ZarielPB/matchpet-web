/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#040404',
          primary: '#BA8C71',
          secondary: '#E1A16C',
          'bg-soft': '#FCD8B8',
          neutral: '#A3AEB9',
        },
        primary: {
          DEFAULT: '#BA8C71',
          hover: '#A2704F',
          deep: '#8F6349',
          light: '#D0A98F',
          faint: '#F6E7DB',
        },
        secondary: {
          DEFAULT: '#E1A16C',
          hover: '#D08C53',
          light: '#F0C199',
        },
        teal: {
          DEFAULT: '#A2704F',
          light: '#E1A16C',
          deep: '#8F6349',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          low: '#FBEEDF',
          raised: '#FCD8B8',
          card: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#040404',
          soft: '#6E7783',
        },
        outline: {
          DEFAULT: '#A3AEB9',
          soft: '#C9D0D7',
        },
        edge: '#A3AEB9',
        alert: {
          DEFAULT: '#B3261E',
          container: '#F9DEDC',
        },
        mint: {
          DEFAULT: '#8F6349',
          bg: '#F6E7DB',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(4,4,4,0.03), 0 20px 30px -5px rgba(186,140,113,0.10)',
        'btn-primary': '0 8px 20px -4px rgba(186,140,113,0.38)',
        'btn-primary-lg': '0 12px 24px -4px rgba(186,140,113,0.50)',
        'emerald-btn': '0 8px 20px -4px rgba(225,161,108,0.40)',
        soft: '0 1px 3px rgba(4,4,4,0.04)',
      },
    },
  },
  plugins: [],
}
