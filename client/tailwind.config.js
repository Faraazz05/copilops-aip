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
          bg: "#070D18",
          surface: "#0D1726",
          elevated: "#121F31",
          secondary: "#17263A",
          border: "#26374B",
          borderSubtle: "#1B2A3D",
          text: "#F1F5FA",
          textSecondary: "#A5B3C4",
          textMuted: "#74869C",
          cyan: "#37C9D6",
          blue: "#6C9EFF",
          green: "#47C995",
          amber: "#E9B45B",
          red: "#F16C78",
          // Operational role mappings
          900: "#070D18",
          800: "#0D1726",
          700: "#121F31",
          accent: "#37C9D6",
          warning: "#E9B45B",
          danger: "#F16C78",
          success: "#47C995"
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif"
        ],
        mono: [
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace"
        ]
      },
      borderRadius: {
        card: "12px",
        input: "8px"
      }
    },
  },
  plugins: [],
}
