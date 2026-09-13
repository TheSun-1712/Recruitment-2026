export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
       colors: {
    primary: "#e65100",
    "background-dark": "#0a0505",
    "panel-dark": "#1a0d0d",
    "border-dark": "#3d1f1f",
    "martian-text": "#fbe9e7",
    "martian-muted": "#a1887f",
  },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
      },
    },
  },
  plugins: [],
}
