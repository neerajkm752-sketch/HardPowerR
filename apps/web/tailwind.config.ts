import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { fontFamily: { sans: ["var(--font-inter)", "sans-serif"], display: ["var(--font-display)", "sans-serif"] } } },
  plugins: []
} satisfies Config;
