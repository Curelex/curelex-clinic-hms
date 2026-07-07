/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2fbfa",
          100: "#d0f0ed",
          500: "#128f86",
          600: "#0f756d",
          700: "#0b5e57"
        }
      }
    },
  },
  plugins: [],
}

