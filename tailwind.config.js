/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin')

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FFFBF0',
          100: '#F7F3E8',
          200: '#ECE7D5',
          900: '#2C2A24', // Dark cream for contrast areas
        },
        // Add richer greens for depth
        emerald: {
            800: '#065F46',
            900: '#064E3B',
            950: '#022C22',
        }
      },
      animation: {
        blob: "blob 7s infinite",
        float: "float 6s ease-in-out infinite", // New floating animation
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        // New float keyframes
        float: {
            "0%, 100%": { transform: "translateY(0px)" },
            "50%": { transform: "translateY(-20px)" },
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    plugin(function({ addUtilities }) {
      addUtilities({
        '.animation-delay-2000': { 'animation-delay': '2s' },
        '.animation-delay-4000': { 'animation-delay': '4s' },
        '.text-shadow-sm': { 'text-shadow': '0 1px 2px rgba(0,0,0,0.1)' },
        '.text-shadow-lg': { 'text-shadow': '0 4px 8px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)' },
      })
    })
  ],
}