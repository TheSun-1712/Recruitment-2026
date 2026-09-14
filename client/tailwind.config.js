export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── 5-Color Unified Palette ──
        palette: {
          deep: "#264653",
          teal: "#2A9D8F",
          gold: "#E9C46A",
          orange: "#F4A261",
          coral: "#E76F51",
          dark: "#122027",
          card: "rgba(38, 70, 83, 0.85)",
        },
        // ── Warm Core Palette ──
        warm: {
          bg: "#122027",
          surface: "#1B313B",
          elevated: "#264653",
          white: "#FAFAF9",
          ink: "#FAFAF9",
          muted: "#94A3B8",
          clay: "#64748B",
          border: "rgba(42, 157, 143, 0.25)",
          "border-hover": "#2A9D8F",
          divider: "rgba(255, 255, 255, 0.08)",
        },
        // ── Accent Colors mapped to Palette ──
        terra: {
          DEFAULT: "#E76F51",
          light: "#F4A261",
          pale: "rgba(231, 111, 81, 0.15)",
          muted: "rgba(231, 111, 81, 0.2)",
        },
        sage: {
          DEFAULT: "#2A9D8F",
          light: "#34B3A3",
          pale: "rgba(42, 157, 143, 0.15)",
          muted: "rgba(42, 157, 143, 0.2)",
        },
        amber: {
          DEFAULT: "#E9C46A",
          light: "#F3D27F",
          pale: "rgba(233, 196, 106, 0.15)",
          muted: "rgba(233, 196, 106, 0.2)",
        },
        // ── State Colors ──
        visited: "#455A64",
        "not-visited": "#264653",
        crimson: {
          DEFAULT: "#E76F51",
          pale: "rgba(231, 111, 81, 0.15)",
        },
        // ── Legacy Compat (admin pages) ──
        primary: "#C2410C",
        botanical: {
          deep: "#1C1917",
          sun: "#D97706",
          fresh: "#6B8F71",
          pale: "#E8E4DF",
          white: "#FAF8F5",
          text: "#1C1917",
          muted: "#78716C",
          border: "#D6D3D1",
          soft: "#E7E5E4",
          visited: "#57534E",
          danger: "#DC2626",
        },
        paper: {
          bg: "#E8E4DF",
          surface: "#F5F2ED",
          ink: "#1C1917",
          graphite: "#78716C",
          terracotta: "#C2410C",
          burnt: "#292524",
          olive: "#6B8F71",
          grey: "#57534E",
          unvisited: "#D6D3D1",
          mustard: "#D97706",
          brick: "#DC2626",
          border: "#D6D3D1",
        },
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "Space Grotesk", "sans-serif"],
        serif: ["Cormorant Garamond", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
        editorial: ["Plus Jakarta Sans", "Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(28, 25, 23, 0.06)',
        'warm': '0 4px 16px rgba(28, 25, 23, 0.06), 0 1px 3px rgba(28, 25, 23, 0.04)',
        'warm-lg': '0 8px 30px rgba(28, 25, 23, 0.08), 0 2px 6px rgba(28, 25, 23, 0.04)',
        'warm-xl': '0 16px 50px rgba(28, 25, 23, 0.12), 0 4px 12px rgba(28, 25, 23, 0.06)',
      },
      borderRadius: {
        'warm': '10px',
      },
    },
  },
  plugins: [],
}
