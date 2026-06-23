/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        board: {
          todo: "#64748b",
          progress: "#2563eb",
          review: "#d97706",
          done: "#16a34a",
        },
      },
    },
  },
  plugins: [],
};
