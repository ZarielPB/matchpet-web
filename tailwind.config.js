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
          purple: '#371457',
          deep: '#230b3b',
          vibrant: '#5b21b6',
          lightPurple: '#f3e8ff',
          softLavender: '#f9f5ff',
          teal: '#0d9488',
          emerald: '#10b981',
          darkSlate: '#133543',
        },
        primary: {
          DEFAULT: '#3b0764',
          hover: '#2e054f',
          light: '#581c87',
          faint: '#f3e8ff',
        },
        teal: {
          DEFAULT: '#5a9e9e',
          light: '#6fb3b0',
          deep: '#559b99',
        },
        surface: {
          DEFAULT: '#faf8ff',
          low: '#f2f3ff',
          raised: '#eaedff',
          card: '#ffffff',
        },
        ink: {
          DEFAULT: '#131b2e',
          soft: '#474556',
        },
        outline: {
          DEFAULT: '#787588',
          soft: '#c8c4d9',
        },
        edge: '#e2def0',
        alert: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        mint: {
          DEFAULT: '#2d6a68',
          bg: '#e6f4f1',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(19,27,46,0.03), 0 20px 30px -5px rgba(80,56,237,0.07)',
        'btn-primary': '0 8px 20px -4px rgba(59,7,100,0.35)',
        'btn-primary-lg': '0 12px 24px -4px rgba(59,7,100,0.45)',
        'emerald-btn': '0 8px 20px -4px rgba(0,108,74,0.35)',
        soft: '0 1px 3px rgba(0,0,0,0.03)',
      },
    },
  },
  plugins: [],
}