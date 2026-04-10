import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../shared-ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F2EAE0",
        secondary: "#B4D3D9",
        accentSoft: "#BDA6CE",
        accent: "#9B8EC7",
      },
      fontFamily: {
        sans: ["var(--font-roboto)", "Roboto", "sans-serif"],
      },
      boxShadow: {
        soft: "0 12px 30px -16px rgba(75, 56, 112, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
