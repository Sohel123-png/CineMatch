/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        surface: "#0f0f11",
        panel: "#18181b",
        primary: "#6366f1", // Indigo 500
        "primary-hover": "#4f46e5", // Indigo 600
        accent: "#f5c518",
        muted: "#a1a1aa", // Zinc 400
        "muted-dark": "#3f3f46", // Zinc 700
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-fade":
          "linear-gradient(180deg, rgba(5,5,5,0) 0%, rgba(5,5,5,0.7) 50%, #050505 100%)",
        "hero-side":
          "linear-gradient(90deg, #050505 0%, rgba(5,5,5,0.7) 30%, rgba(5,5,5,0) 100%)",
      },
      boxShadow: {
        card: "0 10px 30px -10px rgba(0,0,0,0.5)",
        glow: "0 0 20px -5px rgba(99, 102, 241, 0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "10%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        }
      }
    },
  },
  plugins: [],
};
