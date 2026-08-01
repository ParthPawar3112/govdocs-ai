/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy Phase 1 tokens - kept so nothing that still references them breaks.
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af",
        },
        surface: "#f4f6f8",

        // Phase 3 design system - exact palette from the design brief.
        primary: {
          DEFAULT: "#2563EB",
          dark: "#1E3A8A",
          50: "#EFF4FF",
          100: "#DBE6FE",
        },
        app: "#F8FAFC",
        ink: {
          DEFAULT: "#0F172A",
          soft: "#64748B",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        line: "#E2E8F0",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "card-hover": "0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 6px -2px rgb(15 23 42 / 0.06)",
        glass: "0 8px 32px 0 rgb(15 23 42 / 0.12)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        slideInRight: {
          from: { opacity: 0, transform: "translateX(8px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
        scaleIn: {
          from: { opacity: 0, transform: "scale(0.96)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        scanLine: {
          "0%, 100%": { transform: "translateY(-1px)" },
          "50%": { transform: "translateY(139px)" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.55 },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.45s cubic-bezier(0.16,1,0.3,1) both",
        slideInRight: "slideInRight 0.3s cubic-bezier(0.16,1,0.3,1) both",
        scaleIn: "scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.6s linear infinite",
        scanLine: "scanLine 3.2s ease-in-out infinite",
        floatSlow: "floatSlow 5s ease-in-out infinite",
        pulseSoft: "pulseSoft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
