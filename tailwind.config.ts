import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bassfit: {
          white: "#FFFFFF",
          slate: "#F8FAFC",
          orange: "#FF4A00",
          orangeHover: "#E04000",
          navy: "#0F172A",
          brandNavy: "#13213C",
          whatsapp: "#25D366",
        },
      },
      fontFamily: {
        sans: ["var(--font-lato)", "system-ui", "sans-serif"],
        display: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        athletic: "0 10px 30px -5px rgba(15, 23, 42, 0.08)",
        orangeGlow: "0 10px 25px -5px rgba(255, 74, 0, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;

