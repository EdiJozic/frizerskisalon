/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: {
          50: '#f6f5f3',
          100: '#e9e6e1',
          200: '#d3ccc2',
          300: '#b3a897',
          400: '#8d7f6b',
          500: '#6b5f4e',
          600: '#544a3d',
          700: '#413931',
          800: '#2c2723',
          900: '#1b1815',
          950: '#100e0c'
        },
        brass: {
          50: '#fdf8ed',
          100: '#f8ecc9',
          200: '#f1d78e',
          300: '#e9be55',
          400: '#e0a52d',
          500: '#c9861a',
          600: '#a86414',
          700: '#864815',
          800: '#6f3a17',
          900: '#5e3118',
          950: '#361809'
        }
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,21,18,0.06), 0 8px 24px -8px rgba(23,21,18,0.12)',
        pop: '0 12px 40px -12px rgba(23,21,18,0.35)'
      },
      borderRadius: {
        xl2: '1.25rem'
      }
    }
  },
  plugins: []
}
