/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f3f7ff', 100: '#e6efff', 200: '#c7dbff', 300: '#9cbaff',
          400: '#6e95ff', 500: '#4a73ff', 600: '#3158e6', 700: '#2646b4',
          800: '#203b91', 900: '#1d3578',
        },
      },
    },
  },
  plugins: [],
}
