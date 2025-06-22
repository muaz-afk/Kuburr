/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a237e',
          light: '#283593',
          dark: '#0d1b60',
        },
        secondary: {
          DEFAULT: '#3949ab',
          light: '#6f74dd',
          dark: '#1a237e',
        },
        text: {
          primary: '#1f2937',
          secondary: '#4b5563',
          light: '#6b7280',
          error: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
      },
    },
  },
  plugins: [],
}
