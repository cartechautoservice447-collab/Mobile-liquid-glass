/*
 * Runtime-last glass surface lock.
 *
 * The Course dashboard card and Saved Notes cards historically had component
 * CSS that re-applied a separate refraction/veil recipe after the global glass
 * theme. This style tag is appended after the app's imported styles so those
 * two real surfaces cannot drift back to the old foggy treatment.
 */

const STYLE_ID = 'mobile-liquid-glass-surface-runtime-lock';

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    /* The dashboard wrapper is structural only. */
    html[data-glass-theme] .app-root-layer .course-dashboard-card {
      background: transparent !important;
      background-image: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      border: 0 !important;
      box-shadow: none !important;
      overflow: visible !important;
      filter: none !important;
    }

    /* One physical glass surface for the Course card. */
    html[data-glass-theme] .app-root-layer .course-dashboard-card .course-open {
      background-color: var(--glass-theme-bg) !important;
      background-image: var(--glass-theme-sheen) !important;
      backdrop-filter: blur(var(--glass-theme-blur)) saturate(var(--glass-theme-saturation)) contrast(105%) !important;
      -webkit-backdrop-filter: blur(var(--glass-theme-blur)) saturate(var(--glass-theme-saturation)) contrast(105%) !important;
      border: 1px solid var(--glass-theme-border) !important;
      border-top-color: var(--glass-theme-top-border) !important;
      border-radius: var(--glass-theme-radius) !important;
      box-shadow: var(--glass-theme-shadow) !important;
      filter: none !important;
      isolation: isolate;
    }

    /* Remove the legacy refraction pass from the Course card. */
    html[data-glass-theme] .app-root-layer .course-dashboard-card .course-open::before {
      content: "" !important;
      position: absolute !important;
      inset: 0 !important;
      z-index: 0 !important;
      pointer-events: none !important;
      border-radius: inherit !important;
      background: var(--glass-theme-sheen) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.16) !important;
      filter: none !important;
      opacity: 1 !important;
    }

    /* Keep the course accent lens controlled by the selected theme. */
    html[data-glass-theme="type-1"] .app-root-layer .course-dashboard-card .course-open::after,
    html[data-glass-theme="type-2"] .app-root-layer .course-dashboard-card .course-open::after {
      content: "" !important;
      position: absolute !important;
      inset: 0 !important;
      z-index: 0 !important;
      pointer-events: none !important;
      border-radius: inherit !important;
      background: radial-gradient(140% 100% at 0% 0%, color-mix(in oklab, var(--course-accent,#72d7ff) 30%, transparent), transparent 62%) !important;
      opacity: .82 !important;
      filter: none !important;
    }
    html[data-glass-theme="type-3"] .app-root-layer .course-dashboard-card .course-open::after {
      content: none !important;
      display: none !important;
    }
    html[data-glass-theme="type-4"] .app-root-layer .course-dashboard-card .course-open::after {
      content: "" !important;
      position: absolute !important;
      inset: 0 !important;
      z-index: 0 !important;
      pointer-events: none !important;
      border-radius: inherit !important;
      background: radial-gradient(120% 140% at 0% 0%, rgba(255,255,255,.16), transparent 56%), linear-gradient(180deg, rgba(255,255,255,.045), rgba(7,12,45,.07)) !important;
      opacity: .78 !important;
      filter: none !important;
    }

    html[data-glass-theme] .app-root-layer .course-dashboard-card .course-open > * {
      position: relative !important;
      z-index: 1 !important;
    }

    /* Saved Notes: exactly one glass surface, no refraction pass, no fog veil. */
    html[data-glass-theme] .app-root-layer .collection-note-card {
      background-color: var(--glass-theme-bg) !important;
      background-image: var(--glass-theme-sheen) !important;
      backdrop-filter: blur(var(--glass-theme-blur)) saturate(var(--glass-theme-saturation)) contrast(105%) !important;
      -webkit-backdrop-filter: blur(var(--glass-theme-blur)) saturate(var(--glass-theme-saturation)) contrast(105%) !important;
      border: 1px solid var(--glass-theme-border) !important;
      border-top-color: var(--glass-theme-top-border) !important;
      border-radius: var(--glass-theme-radius) !important;
      box-shadow: var(--glass-theme-shadow) !important;
      filter: none !important;
      isolation: isolate;
    }

    html[data-glass-theme] .app-root-layer .collection-note-card::before {
      content: "" !important;
      position: absolute !important;
      inset: 0 !important;
      z-index: 0 !important;
      pointer-events: none !important;
      border-radius: inherit !important;
      background: var(--glass-theme-sheen) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.16) !important;
      filter: none !important;
      opacity: 1 !important;
    }

    /* All old Saved Notes veil layers are disabled. Type 4 uses only a very
       light highlight, so it stays crisp instead of turning milky. */
    html[data-glass-theme="type-1"] .app-root-layer .collection-note-card::after,
    html[data-glass-theme="type-2"] .app-root-layer .collection-note-card::after,
    html[data-glass-theme="type-3"] .app-root-layer .collection-note-card::after {
      content: none !important;
      display: none !important;
      background: transparent !important;
      opacity: 0 !important;
      filter: none !important;
    }
    html[data-glass-theme="type-4"] .app-root-layer .collection-note-card::after {
      content: "" !important;
      position: absolute !important;
      inset: 0 !important;
      z-index: 0 !important;
      pointer-events: none !important;
      border-radius: inherit !important;
      background: radial-gradient(120% 140% at 0% 0%, rgba(255,255,255,.14), transparent 58%), linear-gradient(180deg, rgba(255,255,255,.04), rgba(7,12,45,.06)) !important;
      opacity: .72 !important;
      filter: none !important;
    }

    html[data-glass-theme] .app-root-layer .collection-note-card > * {
      position: relative !important;
      z-index: 1 !important;
    }

    html[data-glass-theme] .app-root-layer .course-dashboard-card:hover,
    html[data-glass-theme] .app-root-layer .collection-note-card:hover {
      filter: brightness(1.03) !important;
    }
  `;
  document.head.appendChild(style);
}
