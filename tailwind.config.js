/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        calm: "#7EC8E3",
        loud: "#FF6B6B",
        warm: "#FFB347",
        lonely: "#8E8DBE",
        bright: "#FFE66D",
      },
    },
  },
  plugins: [],
}

