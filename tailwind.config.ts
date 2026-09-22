import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "var(--brand-orange)",
          red: "var(--brand-red)",
          crimson: "var(--brand-crimson)",
        },
        bg: "var(--bg)",
        "bg-soft": "var(--bg-soft)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
      },
      backgroundImage: {
        "brand-gradient": "var(--brand-gradient)",
      },
      borderRadius: {
        card: "16px",
        chip: "12px",
      },
      fontFamily: {
        mm: ["var(--font-noto-mm)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 12px rgba(0,0,0,0.06)",
        "card-hover": "0 6px 20px rgba(0,0,0,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
