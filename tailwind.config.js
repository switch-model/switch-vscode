/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
    colors: {
      'error': 'var(--vscode-errorForeground)',
    }
  },
  plugins: [],
};

