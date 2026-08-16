/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#161616',
        paper: '#faf9f6',
        accent: '#e2542a',
        accent2: '#2a6b5e',
      },
    },
  },
  plugins: [],
};
