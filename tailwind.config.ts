import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Brand
        brand: {
          primary: "var(--brand-primary)",
          "primary-light": "var(--brand-primary-light)",
          "primary-dark": "var(--brand-primary-dark)",
          "primary-darker": "var(--brand-primary-darker)",
        },

        // Surfaces
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
          4: "var(--surface-4)",
        },

        // Text
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          disabled: "var(--text-disabled)",
        },

        // Borders
        border: {
          DEFAULT: "var(--border-default)",
          subtle: "var(--border-subtle)",
        },

        // Status colors for media tracking
        status: {
          watchlist: "var(--status-watchlist)",
          watching: "var(--status-watching)",
          finished: "var(--status-finished)",
          onhold: "var(--status-onhold)",
          dropped: "var(--status-dropped)",
        },

        // Tag colors
        tag: {
          favorites: "var(--tag-favorites)",
          rewatch: "var(--tag-rewatch)",
          classics: "var(--tag-classics)",
        },

        // Feedback
        feedback: {
          success: "var(--feedback-success)",
          warning: "var(--feedback-warning)",
          error: "var(--feedback-error)",
          info: "var(--feedback-info)",
        },

        // Rating
        rating: {
          active: "var(--rating-active)",
          inactive: "var(--rating-inactive)",
        },
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
