/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        emerald: {
          DEFAULT: "#064E3B",
          50: "#E6F0ED",
          100: "#CCE0DB",
          200: "#99C2B7",
          300: "#66A393",
          400: "#33856F",
          500: "#064E3B",
          600: "#053E2F",
          700: "#042F23",
          800: "#021F18",
          900: "#01100C",
        },
        gold: {
          DEFAULT: "#D4AF37",
          50: "#FBF6E7",
          100: "#F7EDCF",
          200: "#EFDB9F",
          300: "#E7C96F",
          400: "#DFB73F",
          500: "#D4AF37",
          600: "#AA8C2C",
          700: "#7F6921",
          800: "#554616",
          900: "#2A230B",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        heading: ["Playfair Display", "serif"],
        body: ["Manrope", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        sharp: "4px 4px 0px rgba(6, 78, 59, 0.1)",
        "sharp-lg": "8px 8px 0px rgba(6, 78, 59, 0.1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
