import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: "#f4f6f3",
          100: "#e3e8e0",
          200: "#c7d2c2",
          300: "#a3b39a",
          400: "#7d8f72",
          500: "#5f7355",
          600: "#4a5b42",
          700: "#3d4a36",
          800: "#343d2f",
          900: "#2d3429",
          950: "#161b14",
        },
        gold: {
          50: "#fdf9ed",
          100: "#f9f0d4",
          200: "#f2dea8",
          300: "#e9c671",
          400: "#e0ab48",
          500: "#d8922a",
          600: "#bf7420",
          700: "#99561e",
          800: "#7d4520",
          900: "#693a1e",
          950: "#3b1d0e",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
