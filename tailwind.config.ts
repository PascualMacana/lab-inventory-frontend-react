import type { Config } from "tailwindcss"

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["IBM Plex Mono", "Menlo", "Courier", "monospace"],
        serif: ["IBM Plex Serif", "Georgia", "serif"],
      },
      colors: {
        // ── Existing Carbon-namespaced tokens (kept stable for backward-compat) ──
        cds: {
          background: "var(--cds-background)",
          layer01: "var(--cds-layer-01)",
          layer02: "var(--cds-layer-02)",
          layerHover01: "var(--cds-layer-hover-01)",
          textPrimary: "var(--cds-text-primary)",
          textSecondary: "var(--cds-text-secondary)",
          textPlaceholder: "var(--cds-text-placeholder)",
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
        // ── New LAB-namespaced tokens for landing-style accents ──
        lab: {
          blue: "var(--lab-blue)",
          blue40: "var(--lab-blue-40)",
          blueTint: "var(--lab-blue-tint)",
          warm: "var(--lab-warm)",
          warmFg: "var(--lab-warm-fg)",
          warmBg: "var(--lab-warm-bg)",
          warmTint: "var(--lab-warm-tint)",
          critTint: "var(--lab-crit-tint)",
          sage: "var(--lab-sage)",
          sageBg: "var(--lab-sage-bg)",
          sidebarBg: "var(--lab-sidebar-bg)",
          sidebarBg2: "var(--lab-sidebar-bg-2)",
          sidebarHover: "var(--lab-sidebar-hover)",
          sidebarBorder: "var(--lab-sidebar-border)",
          sidebarText: "var(--lab-sidebar-text)",
          sidebarTextStrong: "var(--lab-sidebar-text-strong)",
        },
      },
      boxShadow: {
        overlay: "0 2px 6px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
} satisfies Config
