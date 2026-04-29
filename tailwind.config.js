/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/styles/**/*.css',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["'Helvetica Neue'", "'Helvetica'", "'Arial'", "sans-serif"],
        display: ["var(--font-display)", "'Georgia'", "serif"],
      },
      colors: {
        /* ─── Aimily palette — Skylar Rowe tones ─── */
        crema: "#F5F1E8",           /* legacy — keep for existing pages */
        shade: "#F3F2F0",           /* workspace bg */
        cream: "#F0EDE8",           /* legacy */
        light: "#F5F2F0",           /* card surfaces */
        carbon: "#282A29",
        texto: "#191919",
        grey: "#757575",            /* secondary text — Framer /Grey */
        gris: "#D8D8D8",           /* legacy borders */
        error: "#A0463C",
        success: "#2d6a4f",
        warning: "#c77000",
        /* ─── Aimily accent palette (2026-04-15) ─── */
        "sea-foam": "#B6C8C7",      /* Sea Foam — cool, airy (Block 01 Creative) */
        linen: "#F1EFED",           /* Linen — warm off-white / surface */
        moss: "#808368",            /* Moss — earthy green (Block 02 Merchandising) */
        clay: "#B0856A",            /* Clay — warm tan (Block 03 Design & Development) */
        citronella: "#FFF4CE",      /* Citronella — soft yellow (Block 04 Marketing & Sales) */
        midnight: "#001519",        /* Midnight — deep accent for surfaces / non-block use */
        /* ─── shadcn/ui semantic tokens ─── */
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
      },
      borderRadius: {
        /* ─── Design system radii ─── */
        'card': '16px',
        'input': '10px',
        'pill': '9999px',
        'btn': '10px',
        lg: "var(--radius)",
        md: "calc(var(--radius))",
        sm: "calc(var(--radius))",
      },
      boxShadow: {
        /* ─── Single elevation system ─── */
        'card': '0 2px 24px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 32px rgba(0, 0, 0, 0.07)',
        'dropdown': '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      spacing: {
        /* ─── 8pt grid named stops ─── */
        '18': '4.5rem',   /* 72px */
        '22': '5.5rem',   /* 88px */
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
