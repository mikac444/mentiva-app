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
          200: "#CDDABA",
          300: "#BBCBA8",
          400: "#9DB48C",
          500: "#6B7E5C",
          600: "#4A5842",
          700: "#3d4a36",
          800: "#343d2f",
          900: "#2C3028",
          950: "#161b14",
        },
        dark: "#2C3028",
        warm: "#D8D3C6",
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
