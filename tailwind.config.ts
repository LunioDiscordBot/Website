import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0e0e0e",
        surface: "#131313",
        panel: "#191a1a",
        "panel-high": "#262626",
        text: "#ffffff",
        muted: "#adaaaa",
        outline: "#484848",
        primary: "#00ffff",
        secondary: "#fd68b3",
        tertiary: "#ac89ff",
        success: "#7cf6c2",
        danger: "#ff716c",
      },
      fontFamily: {
        headline: ["var(--font-space)", "sans-serif"],
        body: ["var(--font-manrope)", "sans-serif"],
      },
      boxShadow: {
        cyan: "0 0 30px rgba(0, 255, 255, 0.18)",
        pink: "0 0 30px rgba(253, 104, 179, 0.18)",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top right, rgba(0,255,255,0.14), transparent 30%), radial-gradient(circle at bottom left, rgba(253,104,179,0.12), transparent 25%), linear-gradient(180deg, #0b0b0b 0%, #0e0e0e 46%, #090909 100%)",
      },
      borderRadius: {
        xl2: "1.375rem",
        xl3: "1.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
