import type { Config } from "tailwindcss"

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["IBM Plex Mono", "Menlo", "Courier", "monospace"],
      },
      colors: {
        cds: {
          background: "var(--cds-background)",
          layer01: "var(--cds-layer-01)",
          layer02: "var(--cds-layer-02)",
          textPrimary: "var(--cds-text-primary)",
          textSecondary: "var(--cds-text-secondary)",
          borderSubtle: "var(--cds-border-subtle)",
          borderStrong: "var(--cds-border-strong)",
          field: "var(--cds-field)",
          fieldHover: "var(--cds-field-hover)",
          buttonPrimary: "var(--cds-button-primary)",
          buttonPrimaryHover: "var(--cds-button-primary-hover)",
          buttonPrimaryActive: "var(--cds-button-primary-active)",
          linkPrimary: "var(--cds-link-primary)",
          linkPrimaryHover: "var(--cds-link-primary-hover)",
          focus: "var(--cds-focus)",
          supportError: "var(--cds-support-error)",
          supportSuccess: "var(--cds-support-success)",
          supportWarning: "var(--cds-support-warning)",
          supportInfo: "var(--cds-support-info)",
        },
      },
      boxShadow: {
        overlay: "0 2px 6px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
} satisfies Config
