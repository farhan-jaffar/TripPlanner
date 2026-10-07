/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terracotta: {
          50: '#FDF7F4',
          100: '#F9ECE4',
          200: '#F3D7C7',
          300: '#E8BBA3',
          400: '#DC9676',
          500: '#D2734C', // Vibrant terracotta
          600: '#BF5932', // Deep burnt sienna
          700: '#9F4322',
          800: '#81371E',
          900: '#692F1C',
          950: '#38160B',
        },
        sand: {
          50: '#FAF8F5',  // Warm page canvas
          100: '#F4EFEA', // Card surface
          200: '#E8DFD3', // Subtle borders
          300: '#DACDC0',
          400: '#C2B09B',
          500: '#A9947D',
          600: '#8C7761',
          700: '#6E5C4B',
          800: '#524438',
          900: '#362C25', // Warm deep text
          950: '#221B16',
        },
        sage: {
          50: '#F4F7F4',
          100: '#E6ECE5',
          200: '#CFDACD',
          500: '#768E74',
          600: '#5E745C',
          700: '#495B48',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(82, 68, 56, 0.06), 0 1px 2px rgba(82, 68, 56, 0.04)',
        'warm-md': '0 4px 12px rgba(82, 68, 56, 0.08), 0 2px 4px rgba(82, 68, 56, 0.04)',
        'warm-lg': '0 12px 24px -4px rgba(82, 68, 56, 0.12), 0 4px 6px -2px rgba(82, 68, 56, 0.05)',
      },
    },
  },
  plugins: [],
}
