/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          950: "#07080b",
          900: "#0c0e13",
          800: "#12151c",
          700: "#1a1e28",
          600: "#252a37",
        },
        accent: {
          DEFAULT: "#7c5cff",
          soft: "#9d85ff",
        },
      },
      boxShadow: {
        card: "0 30px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
      },
    },
  },
  plugins: [],
};
