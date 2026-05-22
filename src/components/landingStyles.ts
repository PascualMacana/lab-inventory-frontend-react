export const LANDING_CSS = String.raw`

  /* Full-width root — sections set their own backgrounds across the viewport,
     and .section-inner (max-width 1440px) centers the content inside. */
  .lab-landing { width: 100%; }

  /* ════════════════════════════════════════════════════════════════════
     base.css (from design_handoff_labinventory_landing/styles/base.css)
     Inlined here because the landing-v3.html assumes it's loaded via
     <link rel="stylesheet" href="styles/base.css">. Skipping the :root
     block — those tokens live in src/styles.css with the rest of the
     app's design system.
     ════════════════════════════════════════════════════════════════════ */

  .lab-landing *, .lab-landing *::before, .lab-landing *::after {
    box-sizing: border-box; margin: 0; padding: 0;
  }
  .lab-landing {
    color: var(--text-primary);
    font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    background: var(--bg);
  }
  .lab-landing a { color: var(--blue); text-decoration: none; }
  .lab-landing button { font-family: inherit; }
  .lab-landing code, .lab-landing .mono {
    font-family: 'IBM Plex Mono', Menlo, Courier, monospace;
  }

  /* ─── Type scale ─── */
  .eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.32px;
    color: var(--text-secondary);
    text-transform: uppercase;
  }
  .eyebrow.on-dark { color: var(--text-on-dark-3); }
  .eyebrow.blue   { color: var(--blue); }

  .display-xl { font-size: clamp(56px, 7vw, 96px); font-weight: 300; line-height: 0.98; letter-spacing: -0.02em; color: var(--text-primary); }
  .display-l  { font-size: clamp(48px, 6vw, 72px); font-weight: 300; line-height: 1.05; letter-spacing: -0.01em; }
  .display-m  { font-size: clamp(36px, 4vw, 48px); font-weight: 300; line-height: 1.1; }
  .lab-landing .h2 { font-size: 32px; font-weight: 300; line-height: 1.2; }
  .lab-landing .h3 { font-size: 24px; font-weight: 400; line-height: 1.3; }
  .lab-landing .h4 { font-size: 20px; font-weight: 600; line-height: 1.4; }
  .lab-landing .body  { font-size: 16px; line-height: 1.6; color: var(--text-secondary); }
  .lab-landing .body-s { font-size: 14px; letter-spacing: 0.16px; line-height: 1.5; color: var(--text-secondary); }
  .cap { font-size: 12px; letter-spacing: 0.32px; color: var(--text-secondary); }

  .bi-en {
    display: block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.42em;
    font-weight: 400;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-top: 0.4em;
    line-height: 1.3;
  }

  /* ─── Buttons ─── */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--s4);
    height: 48px;
    padding: 0 16px;
    font-size: 14px;
    letter-spacing: 0.16px;
    border: 1px solid transparent;
    border-radius: 0;
    cursor: pointer;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
    white-space: nowrap;
  }
  .btn-primary {
    background: var(--blue);
    color: #fff;
    padding-right: 56px;
    position: relative;
  }
  .btn-primary::after {
    content: '→';
    position: absolute;
    right: 16px;
    font-size: 16px;
  }
  .btn-primary:hover { background: var(--blue-hover); }
  .btn-ghost {
    background: transparent;
    color: var(--text-primary);
    border-color: var(--border-subtle);
  }
  .btn-ghost:hover { background: var(--layer-01); border-color: var(--text-primary); }
  .btn-ghost.on-dark { color: #fff; border-color: var(--border-dark); }
  .btn-ghost.on-dark:hover { background: var(--layer-dark-2); border-color: #fff; }
  .btn-link {
    background: transparent;
    border: none;
    color: var(--blue);
    height: auto;
    padding: 0;
  }
  .btn-link:hover { color: var(--blue-hover); text-decoration: underline; }

  /* ─── Masthead ─── */
  .masthead {
    position: sticky;
    top: 0;
    z-index: 200;
    height: 48px;
    background: var(--layer-dark);
    display: flex;
    align-items: center;
    padding: 0 var(--s5);
    border-bottom: 1px solid var(--layer-dark-3);
  }
  .masthead-brand {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: #fff;
    padding-right: var(--s3);
    border-right: 1px solid var(--layer-dark-3);
    text-transform: uppercase;
  }
  .masthead-product {
    font-size: 14px;
    font-weight: 300;
    color: var(--text-on-dark-2);
    padding-left: var(--s3);
  }
  .masthead-nav {
    margin-left: auto;
    display: flex;
    align-items: center;
  }
  .masthead-nav a {
    display: flex;
    align-items: center;
    height: 48px;
    padding: 0 var(--s3);
    font-size: 14px;
    letter-spacing: 0.16px;
    color: var(--text-on-dark-2);
    border-bottom: 2px solid transparent;
    transition: color 0.1s, background 0.1s;
  }
  .masthead-nav a:hover { color: #fff; background: var(--layer-dark-2); }
  .lang-toggle {
    display: inline-flex;
    margin-left: var(--s3);
    border-left: 1px solid var(--layer-dark-3);
    height: 48px;
  }
  .lang-toggle button {
    background: transparent;
    border: none;
    color: var(--text-on-dark-3);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.16px;
    padding: 0 var(--s3);
    cursor: pointer;
    height: 48px;
  }
  .lang-toggle button.active { color: #fff; }
  .lang-toggle button:hover { color: #fff; }

  /* ─── Tags ─── */
  .tag {
    display: inline-flex;
    align-items: center;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.32px;
    padding: 2px 8px;
    border-radius: 24px;
    text-transform: uppercase;
  }
  .tag-blue  { background: var(--blue-10); color: var(--blue); }
  .tag-green { background: var(--green-10); color: #044317; }
  .tag-teal  { background: var(--teal-10); color: #004144; }
  .tag-warm  { background: var(--warm-10); color: var(--warm-fg); }
  .tag-gray  { background: var(--layer-02); color: var(--layer-dark-3); }
  .tag-dark  { background: var(--layer-dark-3); color: #fff; }
  .tag-dot::before {
    content: '';
    width: 6px;
    height: 6px;
    background: currentColor;
    border-radius: 50%;
    margin-right: 6px;
    display: inline-block;
  }

  /* ─── Grid helpers ─── */
  .section { padding: var(--s10) var(--s5); border-bottom: 1px solid var(--border-subtle); }
  .section.dark  { background: var(--layer-dark); color: #fff; border-bottom-color: var(--border-dark); }
  .section.layer { background: var(--layer-01); border-bottom-color: var(--layer-02); }
  .section.warm  { background: var(--bg-warm); border-bottom-color: #ebe5d8; }
  .section-inner { max-width: 1440px; margin: 0 auto; }

  .section-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.32px;
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-bottom: var(--s5);
    display: flex;
    align-items: center;
    gap: var(--s3);
  }
  .section-label.on-dark { color: var(--text-on-dark-3); }
  .section-label::before {
    content: '';
    width: 24px;
    height: 1px;
    background: currentColor;
    opacity: 0.6;
  }

  .grid-1px {
    display: grid;
    gap: 1px;
    background: var(--border-subtle);
    border: 1px solid var(--border-subtle);
  }
  .grid-1px.on-dark  { background: var(--border-dark); border-color: var(--border-dark); }
  .grid-1px.on-layer { background: var(--layer-02); border-color: var(--layer-02); }
  .grid-2 { grid-template-columns: 1fr 1fr; }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
  .grid-auto { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }

  /* ─── status dot animation ─── */
  .status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--green);
    margin-right: 6px;
    position: relative;
  }
  .status-dot::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1px solid var(--green);
    animation: pulse 2s ease-out infinite;
  }
  @keyframes pulse {
    0%   { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2);   opacity: 0; }
  }

  @media (max-width: 1055px) {
    .grid-4 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: 1fr; }
  }
  @media (max-width: 671px) {
    .grid-2 { grid-template-columns: 1fr; }
    .section { padding: var(--s7) var(--s4); }
    .masthead-nav { display: none; }
  }
  /* ════════════════════════════════════════════════════════════════════ */

  /* ─── HERO ─────────────────────────────────────────── */
  .masthead { background: var(--layer-dark); border-bottom-color: var(--layer-dark); }

  .hero {
    background: var(--bg-warm);
    padding: var(--s9) var(--s8) var(--s6);
    border-bottom: 1px solid #ebe5d8;
  }
  .hero-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: var(--s4);
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: var(--s7);
  }
  .hero-meta .left {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.32px;
    color: var(--text-secondary);
    text-transform: uppercase;
    display: flex;
    gap: var(--s4);
  }
  .hero-meta .left b { color: var(--text-primary); font-weight: 500; }
  .hero-meta .right {
    font-family: 'IBM Plex Serif', serif;
    font-style: italic;
    font-size: 15px;
    color: var(--text-secondary);
  }

  .hero-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: var(--s9);
    align-items: end;
  }
  .hero-title {
    font-size: clamp(96px, 11vw, 152px);
    font-weight: 300;
    line-height: 0.92;
    letter-spacing: -0.04em;
    color: var(--text-primary);
  }
  .hero-title .em {
    font-family: 'IBM Plex Serif', serif;
    font-style: italic;
    font-weight: 300;
    color: var(--blue);
  }
  .hero-title .cursor {
    display: inline-block;
    width: 0.06em;
    height: 0.78em;
    background: var(--blue);
    vertical-align: -0.04em;
    margin-left: 0.05em;
    animation: hero-cursor-blink 1.1s steps(1, end) infinite;
    transform: translateY(0.04em) skewX(-10deg);
  }
  @keyframes hero-cursor-blink { 50% { opacity: 0; } }
  .hero-en {
    margin-top: var(--s5);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.16px;
    color: var(--text-secondary);
    text-transform: uppercase;
    max-width: 580px;
  }
  .hero-body {
    font-size: 18px;
    line-height: 1.55;
    color: var(--text-primary);
    font-weight: 300;
    margin-top: var(--s2);
  }
  .hero-body b { font-weight: 500; }
  .hero-actions {
    margin-top: var(--s6);
    display: flex;
    gap: var(--s3);
    align-items: center;
  }
  .hero-actions .meta {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-placeholder);
    letter-spacing: 0.32px;
    text-transform: uppercase;
    margin-left: var(--s3);
  }

  .hero-stat {
    border-top: 1px solid var(--border-subtle);
    padding-top: var(--s5);
    margin-top: var(--s5);
  }
  .hero-stat .label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-bottom: var(--s3);
  }
  .hero-stat .figure {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 56px;
    font-weight: 400;
    color: var(--text-primary);
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .hero-stat .figure .unit { font-size: 28px; color: var(--blue); }
  .hero-stat .meta {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--text-secondary);
    letter-spacing: 0.16px;
    text-transform: uppercase;
    margin-top: var(--s3);
  }
  .hero-stat .breakdown {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--s4);
    margin-top: var(--s5);
    padding-top: var(--s4);
    border-top: 1px solid var(--border-subtle);
  }
  .hero-stat .breakdown div .n {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 22px;
    color: var(--text-primary);
    line-height: 1;
  }
  .hero-stat .breakdown div .l {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: var(--text-secondary);
    letter-spacing: 0.32px;
    text-transform: uppercase;
    margin-top: 6px;
  }

  /* ─── LOGOS BAR ────────────────────────────────────── */
  /* Trust/logos bar moved to src/pages/landing-sections/TrustBar.disabled.tsx — restore when real customer logos exist. */

  /* ─── LIVE TICKER ──────────────────────────────────── */
  .ticker {
    background: var(--layer-dark);
    color: var(--text-on-dark-2);
    overflow: hidden;
    border-bottom: 1px solid var(--layer-dark-3);
  }
  .ticker-inner {
    display: flex;
    align-items: center;
    gap: var(--s4);
    padding: 14px 0;
    white-space: nowrap;
    animation: scroll 60s linear infinite;
  }
  .ticker-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--green);
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding-left: var(--s8);
    flex-shrink: 0;
  }
  .ticker-label::before {
    content: '';
    width: 8px; height: 8px;
    background: var(--green);
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgba(122,168,116,0.2);
  }
  .ticker-item {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.16px;
    color: var(--text-on-dark-2);
    text-transform: none;
    display: inline-flex;
    align-items: center;
    gap: var(--s3);
  }
  .ticker-item .who { color: var(--blue-40); }
  .ticker-item .what { color: #fff; }
  .ticker-item .when { color: var(--text-on-dark-3); }
  .ticker-sep {
    color: var(--layer-dark-3);
    font-family: 'IBM Plex Mono', monospace;
    flex-shrink: 0;
  }
  @keyframes scroll {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }

  /* ─── SHARED SECTIONS ──────────────────────────────── */
  .section { padding: var(--s10) var(--s8); border-bottom: 1px solid var(--border-subtle); }
  .section.layer { background: var(--layer-01); border-bottom-color: var(--layer-02); }
  .section.dark  { background: var(--layer-dark); color: #fff; border-bottom-color: var(--border-dark); }
  .section.warm  { background: var(--bg-warm); border-bottom-color: #ebe5d8; }
  .section-inner { max-width: 1280px; margin: 0 auto; }

  .section-head {
    display: grid;
    grid-template-columns: 5fr 6fr;
    gap: var(--s8);
    align-items: end;
    margin-bottom: var(--s8);
  }
  .section-head .num {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-bottom: var(--s3);
    display: flex;
    gap: var(--s3);
  }
  .section.dark .section-head .num { color: var(--text-on-dark-3); }
  .section-head .num b { color: var(--blue); font-weight: 500; }
  .section-head h2 {
    font-size: 56px;
    font-weight: 300;
    line-height: 1.05;
    letter-spacing: -0.015em;
    color: var(--text-primary);
  }
  .section.dark .section-head h2 { color: #fff; }
  /* .em italic serif kept only on hero — section h2's render flat. */
  .section-head .en {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.16px;
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-top: var(--s3);
  }
  .section.dark .section-head .en { color: var(--text-on-dark-3); }
  .section-head .lede {
    font-size: 17px;
    line-height: 1.55;
    color: var(--text-secondary);
    max-width: 540px;
  }
  .section.dark .section-head .lede { color: var(--text-on-dark-2); }

  /* ─── 3 PASOS ──────────────────────────────────────── */
  .steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: var(--border-subtle);
    border: 1px solid var(--border-subtle);
  }
  .step {
    background: var(--bg);
    padding: var(--s6) var(--s5);
    display: flex;
    flex-direction: column;
    gap: var(--s3);
    position: relative;
  }
  .step .ribbon {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-placeholder);
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: var(--s2);
  }
  .step .ribbon::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-subtle);
  }
  .step .ribbon b { color: var(--blue); font-weight: 500; }
  .step .farewell {
    font-family: 'IBM Plex Serif', serif;
    font-style: italic;
    font-weight: 300;
    font-size: 22px;
    line-height: 1.3;
    color: var(--text-placeholder);
    text-decoration: line-through;
    text-decoration-thickness: 1px;
    text-decoration-color: var(--text-secondary);
  }
  .step .hello {
    font-size: 28px;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.2;
    margin-top: var(--s2);
  }
  .step .en {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-secondary);
    text-transform: uppercase;
  }
  .step .d {
    font-size: 14px;
    line-height: 1.55;
    color: var(--text-secondary);
    margin-top: var(--s3);
  }
  .step .d code {
    background: var(--layer-01);
    padding: 1px 5px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
  }
  .step .receipt {
    margin-top: auto;
    padding-top: var(--s4);
    border-top: 1px dashed var(--border-subtle);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-placeholder);
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
  }
  .step .receipt .ok { color: var(--green); }

  /* ─── DASHBOARD PREVIEW (estilo hero 04) ─────────────── */
  .dash-frame {
    background: var(--layer-01);
    padding: var(--s5);
    border: 1px solid var(--border-subtle);
    display: grid;
    grid-template-rows: auto auto auto auto;
    gap: var(--s3);
  }
  .dash-head { display: flex; align-items: center; justify-content: space-between; padding-bottom: var(--s3); border-bottom: 1px solid var(--layer-02); }
  .dash-head .crumbs { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-secondary); text-transform: uppercase; }
  .dash-head .crumbs b { color: var(--text-primary); font-weight: 500; }
  .dash-head .right { display: flex; gap: var(--s3); align-items: center; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--text-secondary); letter-spacing: 0.32px; text-transform: uppercase; }
  .dash-head .right .pill { background: #fff; padding: 4px 10px; border: 1px solid var(--layer-02); }

  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--layer-02); border: 1px solid var(--layer-02); }
  .kpi { background: #fff; padding: var(--s4); }
  .kpi .l { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.32px; color: var(--text-secondary); text-transform: uppercase; }
  .kpi .n { font-family: 'IBM Plex Mono', monospace; font-size: 40px; color: var(--text-primary); line-height: 1; margin: 8px 0 4px; font-weight: 400; }
  .kpi .n .delta { font-size: 12px; color: var(--green); margin-left: 4px; }
  .kpi .n .delta.warn { color: var(--warm-fg); }
  .kpi .n .delta.crit { color: var(--red); }
  .kpi .spark { height: 28px; width: 100%; display: block; margin-top: 6px; }
  .kpi.alert { background: #fbf3df; }
  .kpi.alert .n { color: var(--warm-fg); }
  .kpi.crit { background: #f6e3e2; }
  .kpi.crit .n { color: var(--red); }

  .panels { display: grid; grid-template-columns: 1.4fr 1fr; gap: 1px; background: var(--layer-02); border: 1px solid var(--layer-02); }
  .panel { background: #fff; padding: var(--s4); display: flex; flex-direction: column; }
  .panel h3 { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: var(--s3); display: flex; justify-content: space-between; font-weight: 400; }
  .panel h3 .more { color: var(--blue); text-transform: none; letter-spacing: 0.16px; }
  table.live { width: 100%; border-collapse: collapse; }
  table.live th, table.live td { text-align: left; padding: 9px 0; border-bottom: 1px solid var(--layer-01); font-size: 12px; letter-spacing: 0.16px; font-family: 'IBM Plex Mono', monospace; }
  table.live th { color: var(--text-secondary); font-weight: 400; font-size: 10px; letter-spacing: 0.32px; text-transform: uppercase; }
  table.live td.b { color: var(--blue); }
  table.live td.r { color: var(--text-primary); }
  table.live td.m { color: var(--text-secondary); }
  table.live tr:last-child td { border-bottom: none; }
  .alerts { display: flex; flex-direction: column; gap: var(--s2); }
  .alert-row { display: grid; grid-template-columns: auto 1fr auto; gap: var(--s3); align-items: center; padding: 10px 12px; background: var(--bg-warm); border-left: 2px solid var(--warm-fg); font-size: 12px; }
  .alert-row.crit { background: #f6e3e2; border-left-color: var(--red); }
  .alert-row .icon { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--warm-fg); letter-spacing: 0.32px; }
  .alert-row.crit .icon { color: var(--red); }
  .alert-row .txt { color: var(--text-primary); }
  .alert-row .txt code { background: #fff; padding: 1px 5px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; }
  .alert-row .when { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--text-secondary); letter-spacing: 0.32px; text-transform: uppercase; }
  .dash-foot { display: flex; justify-content: space-between; align-items: center; padding-top: var(--s3); border-top: 1px solid var(--layer-02); font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--text-secondary); letter-spacing: 0.32px; text-transform: uppercase; }
  .dash-foot .ok { color: var(--green); }

  /* ─── TRAZABILIDAD (expandida) ─────────────────────── */
  .trace-hero {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: var(--s8);
    align-items: start;
  }
  .trace-copy h3 {
    font-size: 22px;
    font-weight: 500;
    color: var(--text-primary);
    margin: var(--s5) 0 var(--s2);
  }
  .trace-copy h3:first-child { margin-top: 0; }
  .trace-copy p { font-size: 15px; line-height: 1.6; color: var(--text-secondary); max-width: 420px; }
  .trace-copy .en { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-placeholder); text-transform: uppercase; margin-top: 4px; }

  .audit-card { background: #fff; border: 1px solid var(--border-subtle); }
  .audit-head { padding: var(--s5); border-bottom: 1px solid var(--border-subtle); display: grid; grid-template-columns: 140px 1fr auto; gap: var(--s5); align-items: center; }
  .qr-svg { width: 140px; height: 140px; background: #fff; border: 1px solid var(--text-primary); padding: 8px; }
  .audit-head .info { display: flex; flex-direction: column; gap: 4px; }
  .audit-head .info .code { font-family: 'IBM Plex Mono', monospace; font-size: 22px; font-weight: 500; color: var(--text-primary); letter-spacing: 0.04em; }
  .audit-head .info .prod { font-size: 16px; color: var(--text-primary); }
  .audit-head .info .meta { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.16px; color: var(--text-secondary); text-transform: uppercase; margin-top: 6px; }
  .audit-head .status-block { display: flex; flex-direction: column; gap: var(--s2); text-align: right; border-left: 1px solid var(--border-subtle); padding-left: var(--s5); align-self: stretch; justify-content: center; }
  .audit-head .status-block .num { font-family: 'IBM Plex Mono', monospace; font-size: 28px; color: var(--text-primary); line-height: 1; }
  .audit-head .status-block .label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-secondary); text-transform: uppercase; }

  .timeline { padding: var(--s4) var(--s5); }
  .timeline-row { display: grid; grid-template-columns: 90px 24px 1fr auto; gap: var(--s3); align-items: center; padding: 12px 0; border-bottom: 1px solid var(--layer-01); font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
  .timeline-row:last-child { border-bottom: none; }
  .timeline-row .when { color: var(--text-secondary); font-size: 11px; letter-spacing: 0.32px; text-transform: uppercase; }
  .timeline-row .glyph { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-subtle); color: var(--blue); font-size: 12px; }
  .timeline-row.t-in .glyph { border-color: var(--blue); color: var(--blue); }
  .timeline-row.t-out .glyph { border-color: var(--warm-fg); color: var(--warm-fg); }
  .timeline-row.t-adj .glyph { border-color: var(--border-strong); color: var(--text-primary); }
  .timeline-row.t-audit .glyph { border-color: var(--green); color: var(--green); }
  .timeline-row .what { color: var(--text-primary); }
  .timeline-row .what .who { color: var(--text-secondary); }
  .timeline-row .qty { color: var(--text-primary); font-weight: 500; }
  .timeline-row.t-out .qty { color: var(--warm-fg); }
  .timeline-row.t-in  .qty { color: var(--blue); }

  /* Modules grid moved to src/pages/landing-sections/ModulesSection.disabled.tsx. */

  /* ─── AGENTES IA ─────────────────────────────────── */
  .agents { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border-subtle); border: 1px solid var(--border-subtle); }
  .agent { background: #fff; padding: var(--s6); border-top: 2px solid var(--blue); display: flex; flex-direction: column; gap: var(--s4); }
  .agent .head { display: flex; justify-content: space-between; align-items: baseline; }
  .agent .head .id { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--blue); text-transform: uppercase; }
  .agent .head .status { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--green); text-transform: uppercase; display: inline-flex; align-items: center; gap: 6px; }
  .agent .head .status::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--green); }
  .agent .title { font-size: 30px; font-weight: 300; line-height: 1.1; color: var(--text-primary); letter-spacing: -0.01em; }
  /* .agent .title .em — italic serif removed, renders flat. */
  .agent .body { font-size: 15px; line-height: 1.6; color: var(--text-secondary); max-width: 440px; }
  .demo-box { background: var(--layer-01); padding: var(--s4); margin-top: auto; }
  .demo-header { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: var(--s3); padding-bottom: var(--s2); border-bottom: 1px solid var(--layer-02); display: flex; justify-content: space-between; align-items: center; }
  .chat-bubble { padding: 10px var(--s3); font-size: 14px; letter-spacing: 0.16px; line-height: 1.5; margin-bottom: var(--s2); max-width: 92%; }
  .chat-bubble.user { background: #fff; color: var(--text-primary); margin-left: auto; border: 1px solid var(--layer-02); }
  .chat-bubble.ai { background: var(--blue); color: #fff; }
  .chat-bubble.ai b { font-weight: 500; }
  .chat-bubble.ai code { background: rgba(255,255,255,0.16); padding: 0 4px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
  .vision-field { margin-bottom: var(--s3); }
  .vision-field label { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 4px; }
  .vision-field .val { font-family: 'IBM Plex Mono', monospace; font-size: 14px; letter-spacing: 0.16px; color: var(--text-primary); background: #fff; padding: 10px var(--s3); border-bottom: 2px solid var(--blue); }
  .vision-note { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-secondary); text-transform: uppercase; margin-top: var(--s3); padding-top: var(--s3); border-top: 1px solid var(--layer-02); }

  /* ─── COMPARACIÓN ─────────────────────────────────── */
  .compare {
    display: grid;
    grid-template-columns: 240px repeat(3, 1fr);
    gap: 1px;
    background: var(--border-subtle);
    border: 1px solid var(--border-subtle);
  }
  .compare > div {
    background: var(--bg);
    padding: var(--s4);
  }
  .compare .col-head {
    background: var(--bg-warm);
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 18px;
    font-weight: 500;
    color: var(--text-primary);
    padding: var(--s5) var(--s4);
    line-height: 1.2;
  }
  .compare .col-head .en {
    display: block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-top: 6px;
    font-weight: 400;
  }
  .compare .col-head.us {
    background: var(--layer-dark);
    color: #fff;
  }
  .compare .col-head.us .en { color: var(--blue-40); }
  .compare .row-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-secondary);
    text-transform: uppercase;
    padding-top: var(--s5);
  }
  .compare .cell {
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-primary);
    padding-top: var(--s5);
  }
  .compare .cell.neg { color: var(--red); }
  .compare .cell.warn { color: var(--warm-fg); }
  .compare .cell.ok::before {
    content: '✓ ';
    color: var(--green);
    font-family: 'IBM Plex Mono', monospace;
    margin-right: 2px;
  }
  .compare .cell.neg::before {
    content: '✕ ';
    color: var(--red);
    font-family: 'IBM Plex Mono', monospace;
    margin-right: 2px;
  }

  /* Case/testimonio section moved to src/pages/landing-sections/CaseStudy.disabled.tsx — restore when a real quote exists. */

  /* Roadmap section moved to src/pages/landing-sections/RoadmapSection.disabled.tsx. */

  /* ─── FOUNDER NOTE ───────────────────────────────── */
  .founder {
    background: var(--bg);
    padding: var(--s9) var(--s8);
    border-bottom: 1px solid var(--border-subtle);
  }
  .founder-inner {
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: var(--s7);
    align-items: start;
  }
  .founder-portrait {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: var(--bg-warm);
    border: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'IBM Plex Serif', serif;
    font-style: italic;
    font-size: 48px;
    color: var(--blue);
  }
  .founder-text .label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-secondary);
    text-transform: uppercase;
    margin-bottom: var(--s3);
    display: flex;
    gap: var(--s3);
    align-items: center;
  }
  .founder-text .label::before { content: ''; width: 24px; height: 1px; background: var(--text-secondary); }
  .founder-text p {
    font-family: 'IBM Plex Serif', serif;
    font-style: italic;
    font-weight: 300;
    font-size: 22px;
    line-height: 1.5;
    color: var(--text-primary);
    max-width: 720px;
  }
  .founder-text p b { font-weight: 400; font-style: normal; }
  .founder-text .sig {
    margin-top: var(--s5);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.16px;
    color: var(--text-secondary);
    text-transform: uppercase;
  }
  .founder-text .sig b { color: var(--text-primary); font-weight: 500; }

  /* ─── SECURITY compact ─────────────────────────────── */
  .sec-compact {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border-dark);
    border: 1px solid var(--border-dark);
  }
  .sec-row {
    background: var(--layer-dark);
    padding: var(--s5);
    color: #fff;
    display: grid;
    grid-template-columns: 32px 1fr;
    gap: var(--s3);
    align-items: start;
  }
  .sec-row .icon {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: var(--blue-40);
    letter-spacing: 0.2em;
  }
  .sec-row .t { font-size: 16px; font-weight: 500; }
  .sec-row .en { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-on-dark-3); text-transform: uppercase; margin-top: 2px; }
  .sec-row .d { font-size: 13px; line-height: 1.55; color: var(--text-on-dark-2); margin-top: var(--s2); }
  .sec-row .d code { background: var(--layer-dark-2); padding: 1px 5px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #fff; }

  .sec-strip {
    margin-top: 1px;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 1px;
    background: var(--border-dark);
    border: 1px solid var(--border-dark);
    border-top: none;
  }
  .sec-strip > div {
    background: var(--layer-dark);
    padding: var(--s3) var(--s4);
  }
  .sec-strip .l {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.32px;
    color: var(--text-on-dark-3);
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .sec-strip .v {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: #fff;
  }
  .sec-strip .v.ok { color: var(--green); }

  /* compliance sub-grid (08.2) */
  .sec-compliance {
    margin-top: 1px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: var(--border-dark);
    border: 1px solid var(--border-dark);
    border-top: none;
  }
  .sec-compliance > div {
    background: var(--layer-dark);
    padding: var(--s5) var(--s4);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sec-compliance .badge-status {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.32px;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 24px;
    margin-bottom: var(--s3);
  }
  .sec-compliance .badge-status.ok {
    background: rgba(122,168,116,0.14);
    color: var(--green);
  }
  .sec-compliance .badge-status.ok::before {
    content: '';
    width: 6px; height: 6px;
    background: var(--green);
    border-radius: 50%;
  }
  .sec-compliance .badge-status.now {
    background: rgba(201,154,46,0.16);
    color: var(--warm-accent);
  }
  .sec-compliance .badge-status.now::before {
    content: '';
    width: 6px; height: 6px;
    background: var(--warm-accent);
    border-radius: 50%;
  }
  .sec-compliance .badge-status.soon {
    background: transparent;
    color: var(--text-on-dark-3);
    border: 1px solid var(--layer-dark-3);
  }
  .sec-compliance .name {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 17px;
    font-weight: 500;
    color: #fff;
    line-height: 1.25;
  }
  .sec-compliance .en {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-on-dark-3);
    text-transform: uppercase;
    margin-top: 2px;
  }
  .sec-compliance .d {
    font-size: 13px;
    line-height: 1.55;
    color: var(--text-on-dark-2);
    margin-top: var(--s3);
  }
  .sec-compliance-foot {
    margin-top: var(--s4);
    padding: var(--s4) var(--s4);
    background: var(--layer-dark-2);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-on-dark-3);
    text-transform: uppercase;
  }
  .sec-compliance-foot b { color: #fff; font-weight: 500; }
  .sec-compliance-foot a { color: var(--blue-40); }

  /* Pricing section moved to src/pages/landing-sections/PricingSection.disabled.tsx — restore when prices are defined. */

  /* ─── CTA simplificado ───────────────────────────── */
  .cta {
    background: var(--layer-dark);
    color: #fff;
    padding: var(--s11) var(--s8);
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: var(--s8);
    align-items: end;
  }
  .cta h2 {
    font-size: clamp(56px, 6vw, 92px);
    font-weight: 300;
    line-height: 0.98;
    letter-spacing: -0.02em;
    color: #fff;
  }
  /* .cta h2 .em — italic serif removed, renders flat. */
  .cta .en { margin-top: var(--s4); font-family: 'IBM Plex Mono', monospace; font-size: 13px; letter-spacing: 0.16px; color: var(--text-on-dark-2); text-transform: uppercase; max-width: 560px; }
  .cta .sub { margin-top: var(--s4); font-size: 17px; line-height: 1.55; color: var(--text-on-dark-2); max-width: 480px; }
  .cta-form { background: var(--layer-dark-2); padding: var(--s5); }
  .cta-form .l { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-on-dark-3); text-transform: uppercase; margin-bottom: var(--s2); }
  .cta-form input { width: 100%; background: transparent; border: none; border-bottom: 2px solid var(--layer-dark-3); color: #fff; font-family: 'IBM Plex Sans', sans-serif; font-size: 16px; padding: 10px 0; outline: none; margin-bottom: var(--s4); }
  .cta-form input:focus { border-bottom-color: var(--blue-40); }
  .cta-form input::placeholder { color: var(--text-on-dark-3); }
  .cta-form .submit-row { display: flex; justify-content: space-between; align-items: center; margin-top: var(--s3); }
  .cta-form .submit-row .meta { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--text-on-dark-3); letter-spacing: 0.32px; text-transform: uppercase; }

  /* ─── FOOTER ─────────────────────────────────────── */
  .footer { background: #0d1218; color: var(--text-on-dark-2); padding: var(--s8) var(--s8) var(--s6); }
  .footer-top { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: var(--s7); padding-bottom: var(--s6); border-bottom: 1px solid var(--layer-dark-3); }
  .footer .brand { font-size: 18px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #fff; }
  .footer .url { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: var(--blue-40); margin-top: var(--s3); }
  .footer .desc { font-size: 13px; line-height: 1.55; margin-top: var(--s3); color: var(--text-on-dark-3); max-width: 320px; }
  .footer-col h4 { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-on-dark-3); text-transform: uppercase; margin-bottom: var(--s3); }
  .footer-col a { display: block; font-size: 14px; color: var(--text-on-dark-2); padding: 6px 0; }
  .footer-col a:hover { color: #fff; }
  .footer-bottom { padding-top: var(--s4); display: flex; justify-content: space-between; align-items: center; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.32px; color: var(--text-on-dark-3); text-transform: uppercase; }
  .footer-bottom .live { color: var(--green); display: inline-flex; align-items: center; gap: 6px; }
  .footer-bottom .live::before { content: ''; width: 8px; height: 8px; background: var(--green); border-radius: 50%; }

  /* ─── LOGIN OVERLAY (constellation + login panel) ───── */
  .login-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.32s ease;
  }
  .login-overlay.open {
    pointer-events: auto;
    opacity: 1;
  }
  .login-overlay-bg {
    position: absolute;
    inset: 0;
    background: rgba(13, 18, 24, 0.78);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    cursor: zoom-out;
  }
  .login-overlay-content {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: 2fr 1fr;
    transform: scale(0.97);
    transition: transform 0.42s cubic-bezier(0.2, 0, 0, 1);
    overflow: hidden;
  }
  .login-overlay.open .login-overlay-content { transform: scale(1); }

  /* constellation panel */
  .const-panel {
    position: relative;
    background: #0d1218;
    overflow: hidden;
    border-right: 1px solid var(--layer-dark-3);
  }
  .const-panel::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 50% 45%, rgba(90, 150, 173, 0.16) 0%, transparent 55%),
      radial-gradient(circle at 18% 78%, rgba(122, 168, 116, 0.06) 0%, transparent 45%);
    pointer-events: none;
  }
  .const-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .const-svg .edge {
    stroke: #5a96ad;
    fill: none;
    stroke-width: 0.5;
    stroke-dasharray: 240;
    stroke-dashoffset: 240;
    transition: stroke-dashoffset 0.9s cubic-bezier(0.2, 0, 0, 1), opacity 0.5s ease;
    opacity: 0;
  }
  .login-overlay.open .const-svg .edge {
    stroke-dashoffset: 0;
    opacity: var(--edge-op, 0.22);
  }
  .const-svg .star {
    fill: #5a96ad;
    opacity: 0;
    transition: opacity 0.5s ease var(--delay, 0.4s);
  }
  .login-overlay.open .const-svg .star { opacity: var(--star-op, 0.55); }
  .const-svg .star-bright {
    fill: #fff;
    opacity: 0;
    transition: opacity 0.5s ease var(--delay, 0.4s);
  }
  .login-overlay.open .const-svg .star-bright { opacity: var(--star-op, 0.9); }
  .const-svg .star-halo {
    fill: none;
    stroke: #5a96ad;
    stroke-width: 0.5;
    opacity: 0;
    transition: opacity 0.6s ease var(--delay, 0.6s);
  }
  .login-overlay.open .const-svg .star-halo { opacity: var(--halo-op, 0.18); }
  .const-svg .halo {
    fill: none;
    stroke: #5a96ad;
    stroke-width: 0.3;
    opacity: 0;
    transition: opacity 0.8s ease;
  }
  .login-overlay.open .const-svg .halo { opacity: 0.06; }

  /* hub word (only labelled node) */
  .const-hub {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%) translateY(8px);
    font-family: 'IBM Plex Serif', serif;
    font-style: italic;
    font-weight: 400;
    font-size: 42px;
    color: #fff;
    letter-spacing: -0.01em;
    opacity: 0;
    transition: opacity 0.5s ease 0.5s, transform 0.6s cubic-bezier(0.2,0,0,1) 0.5s;
    pointer-events: none;
    white-space: nowrap;
    text-shadow: 0 0 28px rgba(90, 150, 173, 0.5);
  }
  .login-overlay.open .const-hub {
    opacity: 1;
    transform: translate(-50%, -50%) translateY(0);
  }
  .const-hub::after {
    content: '';
    position: absolute;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    width: 8px; height: 8px;
    background: #fff;
    border-radius: 50%;
    box-shadow:
      0 0 0 6px rgba(90, 150, 173, 0.22),
      0 0 0 14px rgba(90, 150, 173, 0.10),
      0 0 24px rgba(90, 150, 173, 0.6);
    animation: const-pulse 3.4s ease-in-out infinite 1.2s;
  }
  @keyframes const-pulse {
    0%, 100% { opacity: 0.9; transform: translate(-50%, -50%) scale(1); }
    50%      { opacity: 1;   transform: translate(-50%, -50%) scale(1.25); }
  }

  /* small mono labels (only a couple) */
  .const-tag-small {
    position: absolute;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.32px;
    text-transform: uppercase;
    color: rgba(201, 209, 216, 0.4);
    transform: translate(-50%, -50%);
    opacity: 0;
    transition: opacity 0.5s ease 0.9s;
    pointer-events: none;
    white-space: nowrap;
  }
  .login-overlay.open .const-tag-small { opacity: 1; }
  .const-tag-small::before {
    content: '— ';
    color: rgba(90, 150, 173, 0.5);
  }

  /* latin tag */
  .const-tag {
    position: absolute;
    left: 0; right: 0;
    bottom: 48px;
    text-align: center;
    font-family: 'IBM Plex Serif', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(90, 150, 173, 0.7);
    letter-spacing: 0.04em;
    opacity: 0;
    transition: opacity 0.8s ease 0.8s;
  }
  .login-overlay.open .const-tag { opacity: 1; }
  .const-tag::before,
  .const-tag::after {
    content: '';
    display: inline-block;
    width: 56px;
    height: 1px;
    background: rgba(90, 150, 173, 0.32);
    vertical-align: middle;
    margin: 0 16px;
  }

  /* close button */
  .const-close {
    position: absolute;
    top: 24px;
    left: 24px;
    background: transparent;
    border: 1px solid var(--layer-dark-3);
    color: var(--text-on-dark-2);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    text-transform: uppercase;
    padding: 8px 14px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    z-index: 4;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .const-close:hover {
    background: var(--layer-dark-2);
    border-color: var(--blue-40);
    color: #fff;
  }

  /* corner meta */
  .const-meta {
    position: absolute;
    top: 24px;
    right: 24px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-on-dark-3);
    text-transform: uppercase;
    display: flex;
    gap: var(--s3);
    align-items: center;
    opacity: 0;
    transition: opacity 0.5s ease 0.6s;
  }
  .login-overlay.open .const-meta { opacity: 1; }
  .const-meta .live { color: var(--green); display: inline-flex; align-items: center; gap: 6px; }
  .const-meta .live::before {
    content: '';
    width: 8px; height: 8px;
    background: var(--green); border-radius: 50%;
    box-shadow: 0 0 0 3px rgba(122,168,116,0.18);
  }

  /* ─── LOGIN PANEL ───────────────────────────────────── */
  .login-panel {
    background: var(--bg-warm);
    display: flex;
    flex-direction: column;
    transform: translateX(40px);
    opacity: 0;
    transition: transform 0.5s cubic-bezier(0.2, 0, 0, 1) 0.1s, opacity 0.4s ease 0.1s;
  }
  .login-overlay.open .login-panel {
    transform: translateX(0);
    opacity: 1;
  }
  .login-masthead {
    background: var(--layer-dark);
    height: 48px;
    display: flex;
    align-items: center;
    padding: 0 var(--s5);
    gap: var(--s3);
    flex-shrink: 0;
  }
  .login-masthead .brand {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .login-masthead .div { width: 1px; height: 16px; background: var(--layer-dark-3); }
  .login-masthead .product {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 14px;
    font-weight: 300;
    color: var(--text-on-dark-2);
  }

  .login-area {
    flex: 1;
    padding: var(--s8) var(--s7) var(--s6);
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 520px;
  }
  .login-eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0.32px;
    color: var(--blue);
    margin-bottom: var(--s3);
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: var(--s3);
  }
  .login-eyebrow::before {
    content: '';
    width: 24px;
    height: 1px;
    background: var(--blue);
  }
  .login-title {
    font-size: 56px;
    font-weight: 300;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin-bottom: var(--s3);
  }
  /* .login-title .em — italic serif removed; "sesión." renders flat. */
  .login-sub {
    font-size: 16px;
    line-height: 1.55;
    color: var(--text-secondary);
    margin-bottom: var(--s7);
    max-width: 420px;
  }
  .login-sub b { color: var(--text-primary); font-weight: 500; }

  .login-field { margin-bottom: var(--s5); }
  .login-field-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.32px;
    color: var(--text-secondary);
    margin-bottom: 6px;
    display: block;
    text-transform: uppercase;
  }
  .login-input {
    display: block;
    width: 100%;
    height: 48px;
    padding: 0 var(--s3);
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 15px;
    font-weight: 400;
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.7);
    border: none;
    border-bottom: 2px solid var(--border-subtle);
    border-radius: 0;
    outline: none;
    transition: border-color 0.12s ease, background 0.12s ease;
  }
  .login-input:focus {
    border-bottom-color: var(--blue);
    background: rgba(255, 255, 255, 1);
  }
  .login-input::placeholder { color: var(--text-placeholder); }

  .login-forgot {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px;
    color: var(--blue);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    margin-bottom: var(--s5);
    display: inline-block;
    text-decoration: none;
    letter-spacing: 0.02em;
  }
  .login-forgot:hover { color: var(--blue-hover); text-decoration: underline; }

  .login-submit {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 56px;
    padding: 0 var(--s4);
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: #fff;
    background: var(--blue);
    border: 1px solid transparent;
    border-radius: 0;
    cursor: pointer;
    transition: background 0.12s ease;
  }
  .login-submit:hover { background: var(--blue-hover); }
  .login-submit .arrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 18px;
  }

  .login-divider {
    border-top: 1px solid var(--border-subtle);
    margin: var(--s6) 0 var(--s4);
  }
  .login-sso {
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px;
    color: var(--text-secondary);
    letter-spacing: 0.02em;
  }
  .login-sso-link {
    color: var(--blue);
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
    text-decoration: underline;
  }
  .login-sso-link:hover { color: var(--blue-hover); }

  .login-error {
    margin-bottom: var(--s4);
    padding: 10px 12px;
    background: var(--bg-warm);
    border-left: 3px solid var(--red);
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px;
    line-height: 1.4;
    color: var(--text-primary);
  }

  .login-submit:disabled { opacity: 0.6; cursor: wait; }

  .login-foot {
    margin-top: auto;
    padding: var(--s4) var(--s7);
    border-top: 1px solid var(--border-subtle);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.32px;
    color: var(--text-placeholder);
    text-transform: uppercase;
  }
  .login-foot .demo {
    color: var(--blue);
    background: none;
    border: 1px solid var(--blue);
    padding: 8px 12px;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    transition: background 0.12s ease, color 0.12s ease;
  }
  .login-foot .demo:hover { background: var(--blue); color: #fff; }

  /* ─── responsive ─────────────────────────────────── */
  @media (max-width: 960px) {
    .login-overlay-content { grid-template-columns: 1fr; }
    .const-panel { display: none; }
  }

`;
