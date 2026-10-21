/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aviation: {
          900: "#0b132b",
          800: "#1c2541",
          700: "#3a506b",
          accent: "#00b4d8",
          warning: "#ff9f1c",
          danger: "#e63946",
          success: "#2ec4b6"
        }
      }
    },
  },
  plugins: [],
}
