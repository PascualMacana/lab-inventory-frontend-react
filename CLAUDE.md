# Frontend React — Sistema de Inventario de Lab

## Contexto
Cliente web del sistema de inventario. Consume la API FastAPI que vive
en `../` (Python). Para contexto del producto, modelo de datos y
reglas de negocio ver el CLAUDE.md raíz.

## Stack
- React 18 + TypeScript + Vite
- TailwindCSS con tokens del Carbon Design System (`cds-*`) +
  tokens propios LAB (`lab-*`)
- @tanstack/react-query para data fetching y cache
- lucide-react (íconos), @visx (gráficos)
- IBM Plex Sans / Mono / Serif (Google Fonts)

## Estructura
- `src/pages/` — una página por módulo (DashboardPage, ReactivosPage,
  MovimientosPage, etc). Cada página maneja su propio data fetching.
  Las páginas públicas (sin sesión) viven acá también: `LandingPage`
  (home) y `LandingSeguridadPage`. Ver "Landing pública" abajo.
- `src/pages/landing-sections/` — secciones del landing archivadas
  (TrustBar, Pricing, CaseStudy, Modules, Roadmap, Seguridad verbosa,
  DashboardPreview, CompareSection, FounderNote) como `*.disabled.tsx`
  con JSX (y a veces CSS) en string constants y comentarios de
  restauración.
- `src/components/` — componentes compartidos cross-páginas
  (`PageHeader`, `ModuleNav`, `LandingShell`, `HashLink`,
  `ScrollToHash`, `ScrollReveal`).
- `src/components/ui/` — primitivas (Button, Input, Label,
  EstadoBadge, StatusDot).
- `src/components/landingStyles.ts` — todo el CSS del landing
  (~1500 líneas) como string constante `LANDING_CSS`.
- `src/lib/` — `api.ts` (cliente HTTP con `X-Session-Token`),
  `auth.tsx` (sesión + `useAuth`), `permissions.ts`
  (`puede(usuario, accion)`), `theme.tsx` (`ThemeProvider`/`useTheme`),
  `utils.ts` (`cn`), `forms.ts`.
- `src/styles.css` — variables CSS de tokens (`--cds-*`, `--lab-*` y
  el set sin prefijo del handoff de landing — `--bg-warm`, `--blue`,
  `--layer-dark`, escala `--s1`..`--s11`, etc.), imports de Google
  Fonts, animaciones LAB.
- `tailwind.config.ts` — mapea las variables CSS a clases Tailwind
  (`bg-cds-layer01`, `text-lab-blue`, etc).
- `src/vite-env.d.ts` — augmenta `React.CSSProperties` con
  `[key: \`--${string}\`]: ...` para que TS acepte CSS custom
  properties en `style={{}}` (necesario para la constelación SVG del
  overlay de login que usa `style={{'--star-op': '0.3'}}` por estrella).

## Sistema de diseño

Dos namespaces de tokens:
- **`--cds-*`** — equivalente a Carbon Design System pero con la
  paleta LAB v2 (petróleo + grafito, reemplaza el IBM Blue). Mismos
  nombres semánticos: `background`, `layer-01`, `field`,
  `text-primary`, `support-error`, etc.
- **`--lab-*`** — accents propios: sage, warm/ámbar, tints (warmTint,
  critTint, sageBg, blueTint), sidebar (graphite).

**Invariante crítica:** `--cds-field` debe quedar SIEMPRE un paso más
oscuro que `--cds-layer-01`. Si los igualás, los inputs desaparecen
dentro de contenedores `bg-cds-layer01` porque el componente `Input`
no tiene borde — solo una línea inferior en focus.

## Convención de colores (semántica)

Importante mantenerla uniforme en toda la app. Mirar Dashboard /
Reactivos / EstadoBadge antes de inventar un esquema nuevo.

- **Rojo (`crit` / `--cds-support-error`)** — algo ya pasó, acción
  inmediata. Stock debajo del mínimo, lotes vencidos, inactivo,
  errores de form.
- **Ámbar (`warn` / `--lab-warm` / `--cds-support-warning`)** — algo
  está por pasar, planificar. Lotes próximos a vencer (7d / 30d).
- **Sage (`success` / `--cds-support-success`)** — estado OK / activo.
- **Petróleo (`--lab-blue` / `--cds-button-primary`)** — interactivo
  primario (botones, links, focus) y accents editoriales vía
  `.lab-em` (serif italic).

## Patrones de componentes

### PageHeader
Toda página de módulo arranca con
`<PageHeader title="..." description="..." count={...} plain />`. El
`count` aparece a la derecha (típico: `"X de Y items"` o
`"X items"`). Dashboard usa su propio header editorial más grande —
es la portada del producto, no aplica `PageHeader`.

Por defecto el título iría en `.lab-em` (serif italic petróleo). La
convención actual es pasar siempre `plain` — todas las páginas que
usan `PageHeader` (Reactivos, Proveedores, Tareas, Usuarios,
Movimientos) lo hacen para conservar el sans del baseline Carbon. El
italic serif queda reservado para el hero del Dashboard ("en vivo.")
y el hero del landing. Si en el futuro se quiere recuperar el acento
editorial en algún PageHeader, alcanza con omitir la prop `plain`.

### EstadoBadge
Para estados activo/inactivo en tablas y paneles de detalle.
`<EstadoBadge activo={bool} />`. Para otros labels (ej.
"Operativo/Roto") pasar `labels={{ on, off }}`.

### Pills / badges en general
Patrón:
`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-[0.16px] ring-1`
+ `bg-<tint>` + `text-<color>` + `ring-<color>/40`. Ver
`tipoBadgeClasses` en MovimientosPage para los tres tonos
(success/error/warn).

### Tablas
- `border-collapse` con `border-b border-cds-borderSubtle` por fila.
- Header en `bg-cds-layer01` con texto chico y secondary.
- Filas clicables con `hover:bg-cds-layer01` y selección por
  `shadow-[inset_2px_0_0_var(--cds-focus)]`.
- Para estados especiales en filas (ej. stock bajo en Reactivos):
  usar `bg-<tint>/60` + `shadow-[inset_2px_0_0_var(--<color>)]`.

### KPI cards (tarjetas de métrica)
Lenguaje compartido de tarjetas KPI (Movimientos y Dashboard; extender a
otros módulos). Recrea un handoff (`docs/gráficos en labinventory.zip`)
pero con NUESTROS tokens, no los hex/fuente del handoff.
- **Card**: `border border-cds-borderSubtle bg-cds-layer01 p-[18px_20px]`
  en grid `gap-3.5` (no el truco `gap-px`), con acento izquierdo de 3px
  vía `shadow-[inset_3px_0_0_var(--token)]` del color de su categoría
  (Total/normal `--lab-blue`, ok `--cds-support-success`, crit
  `--cds-support-error`, warn `--lab-warm`).
- **Micro-label**: `font-mono text-[10.5px] uppercase tracking-[0.09em]
  text-cds-textSecondary` (+ dot opcional `h-[9px] w-[9px] rounded-full`
  del color). El mismo micro-label mono se usa en los labels del filtro
  de Movimientos y en el título del desglose.
- **Número**: `font-mono text-[34px]` en **peso regular** (NO
  `font-semibold` — el bold desentona; la página es toda peso regular).
  El color por `style` con `var(--...)`, no hex, para que theme en oscuro.
- **Micro-barra de proporción** (opcional): track `bg-cds-borderSubtle`
  `h-1` + fill del color al `width: pct%`.
- **Dashboard (opción B)**: mismas cards PERO conservan sus extras —
  `Sparkline`, delta `+N` y clickeables (`KpiTile to=...`). Las de alerta
  (stock bajo, por vencer) además mantienen el fondo tintado suave
  (`bg-lab-critTint` / `bg-lab-warmTint`) encima del acento, para que el
  problema siga saltando.

### Gráficos (ApexCharts)
`src/Graphs/StackedBarChart.tsx` (hoy solo Movimientos) es el patrón para
charts ApexCharts. ApexCharts pinta barras/labels como atributos SVG que
NO resuelven `var(--...)`, así que el componente recibe los colores como
token (`"var(--cds-support-success)"`) y los resuelve a hex con
`getComputedStyle`, releyendo en cada cambio de tema (consume `useTheme`).
Toolbar solo-descarga (PNG/SVG/CSV) y total arriba de las barras apiladas
(`plotOptions.bar.dataLabels.total`). Lazy-importado para no pesar la página.

### Sparklines del Dashboard
`DashboardPage` define un `Sparkline` SVG inline (sin libs). Tres
decisiones cargan el feel actual y conviene no revertirlas sin
intención:
- **Interpolación monotone cubic** (Fritsch-Carlson, función
  `monotonePath`) — curvas redondeadas pero sin overshoot ni ondas
  inventadas en zonas planas. Antes había Bézier cúbica con tangentes
  horizontales y daba S-curves feas en series chatas.
- **Pre-suavizado leve** (`smoothSeries`, kernel `0.15 / 0.7 / 0.15`)
  — solo afecta el dibujo, no los valores que mostramos. El delta
  (`+N`) y el número grande del KPI siguen viniendo de la data cruda
  / `contadores`.
- **Area fill + 36 px de alto + step de color via `currentColor`** —
  el color del KPI pasa por `style={{ color }}` en el `<svg>` para
  que `stroke="currentColor"` resuelva CSS vars (no se puede usar
  `var(--...)` directo en atributo SVG).

El objeto `palette` en `DashboardPage` referencia `var(--...)` —
no hex hardcoded — para que los KPIs themen correctamente en modo
oscuro. Si agregás un color nuevo, usá la CSS var, no el hex.

## Modo oscuro
- `src/lib/theme.tsx` expone `<ThemeProvider>` (envuelve el árbol
  arriba de `<App>` en `main.tsx`) y `useTheme()` →
  `{ theme, setTheme, toggleTheme }`.
- Persiste en `localStorage` con la key `lab_inventory_theme`
  (`"light" | "dark"`). Default: respeta `prefers-color-scheme`.
- Aplica `.dark` y `data-theme="dark"` en `<html>` (no en `<body>` ni
  un wrapper React) — así las CSS vars del bloque `.dark` en
  `styles.css` se resuelven en cascada para toda la app.
- **Anti-FOUC**: hay un `<script>` inline en `index.html` que lee el
  storage y setea la clase antes de que cargue React. No moverlo a un
  módulo: tiene que correr sincrónico antes del primer paint.
- **Toggle**: vive dentro del dropdown del menú de cuenta en el
  sidebar (`AppShell`), encima de "Cerrar sesión", con icono Moon/Sun
  de lucide-react. En el slide-out móvil aparece como fila propia
  arriba del footer (no hay dropdown equivalente). El label
  ("Modo oscuro" / "Modo claro") describe la acción, no el estado
  actual.
- **Tokens del `.dark`**: la mayoría de los `--cds-*` se invierten al
  set graphite oscuro. Casos no obvios overrideados a propósito:
  `--lab-warm-fg` y `--lab-warm` se aclaran (ámbar medio) para que el
  texto de warning sobre `--lab-warm-tint` oscuro siga legible; los
  mismos overrides aplican a `--cds-support-warning` y
  `--lab-blue` (petróleo claro) para que `.lab-em` no se pierda
  contra el fondo oscuro. Si agregás un token nuevo que se use como
  text-color sobre un tint, chequeá contraste en ambos modos.

## Auth y permisos
- `useAuth()` → `{ token, usuario, login, logout, ... }`. Token
  persiste en sessionStorage.
- `puede(usuario, accion)` espeja la matriz del backend
  (`permisos.py`). Se usa para gatear tabs, botones, páginas
  enteras. El backend igual re-chequea (defense in depth).
- Todas las queries con `enabled: Boolean(token)` para no disparar
  sin sesión.

## Data fetching
- @tanstack/react-query con query keys estables:
  `["reactivos"]`, `["proveedor", id]`, `["movimientos", filtros]`.
- Mutations invalidan via `queryClient.invalidateQueries({ queryKey })`.
- Errores se muestran inline en la página (cards con
  `border-l-4 border-cds-supportError`), no como toasts.

## Landing pública

Para usuarios sin sesión (`!token` en `App.tsx`), la app renderiza un
sub-router con tres rutas — `/`, `/login` y `/seguridad` — anidadas bajo
`<LandingShell />` (layout con `<Outlet />`). El login ya no es una
página aparte: el overlay vive dentro de `LandingShell` y se abre desde
los botones "Cuenta"/"Ingresar". `/login` renderiza la misma landing
pero abre el overlay automáticamente; el logout navega a esa ruta.

- **`LandingShell`** — masthead + footer + login overlay + estado del
  overlay. Renderiza el CSS via `<style>{LANDING_CSS}</style>`. Expone
  `useLandingLogin()` (React Context) para que las páginas hijas
  abran el overlay desde sus propios botones (ej. "Ingresar" del hero).
  Monta `<ScrollToHash />` y `<ScrollReveal />` una sola vez.
- **`LandingPage`** — home pública (`/`). Sólo el contenido entre
  masthead y footer.
- **`LandingSeguridadPage`** — página sobria de seguridad. **No**
  mencionar software específico (Caddy, fail2ban, SQLite WAL,
  UptimeRobot) ni números de norma exactos (ANMAT 2069/2018, 21 CFR
  Part 11, SOC 2, LGPD/GDPR, ISO 27001, HIPAA). El detalle del
  programa de cumplimiento y la política de tratamiento de datos van
  bajo NDA a través de `seguridad@labinventory.lat`. Mostrar lo
  específico en público le da a un atacante un mapa del stack y a un
  comprador serio le da igual hasta que firma NDA.

### Features que no se queman (QR + agentes IA)
El producto no está lanzado y el QR-por-frasco y los agentes IA
(chat + visión que lee etiquetas por cámara) son el diferencial. En el
landing se muestra **el beneficio, no el cómo**: hablar de
"trazabilidad por unidad física" / "identificador único" (no "QR",
no "imprimir y pegar", no "escanear") y de "asistencia inteligente"
(no demos de chat ni paneles de campos extraídos por foto). El dibujo
del QR en la sección 03 (Trazabilidad) se conserva como gráfico, pero
sin texto que explique el mecanismo. No re-agregar el "cómo" sin
pedido explícito.

### Italic serif del landing (`.em`)
En el landing el acento serif-italic + petróleo (`<span class="em">`)
aparece SOLO en el `.hero-title` ("como en la mesada."). Las reglas
para los demás contextos (`.section-head h2 .em`, `.step .hello .em`,
`.case-quote .em`, `.cta h2 .em`, `.agent .title .em`,
`.login-title .em`) están vaciadas a propósito en `landingStyles.ts`
— no agregar nuevos `<span class="em">` afuera del hero. Esto es
distinto al `.lab-em` que usan los `PageHeader` de la app
autenticada, que sí va serif-italic petróleo.

### Navegación con hash
React Router no scrollea al hash por defecto, y clickear un `<Link>`
a la URL actual no dispara navegación. Dos piezas resuelven esto:

- **`<ScrollToHash />`** (montado una vez en `LandingShell`):
  escucha `useLocation()` y hace `scrollIntoView` al `#anchor`
  después de cada cambio de ruta; sin hash scrollea al top.
- **`<HashLink to="/#anchor">`** reemplaza a `<Link>` cuando el
  destino lleva hash: si ya estás en esa pathname, scrollea directo
  (evitando el no-op de react-router); si no, navega y `ScrollToHash`
  hace el scroll cuando renderiza el destino. Respeta cmd/ctrl/middle
  click para abrir en pestaña nueva.

Usar `HashLink` en masthead y footer (links a `/#how`, `/#agentes`,
`/#trazabilidad`). Los Links sin hash (`/`, `/seguridad`) quedan
como `<Link>` normales. El masthead nav actual es
**Asistente / Trazabilidad / Cuenta** ("Producto" → `/#dashboard` se
quitó junto con el dashboard preview; el ancla `#dashboard` ya no
existe). "Agentes IA" se renombró a **Asistente** (la sección sigue
con `id="agentes"`).

### Secciones archivadas
`src/pages/landing-sections/*.disabled.tsx` guarda el JSX (y a veces
el CSS) de secciones removidas de la home: TrustBar, Pricing,
CaseStudy, Modules, Roadmap, la versión verbosa de Seguridad,
**DashboardPreview** ("Así se ve un laboratorio en vivo"),
**CompareSection** (tabla Excel/ERP/LabInventory) y **FounderNote**.
Cada archivo abre con un comentario explicando cómo restaurar (pegar
el JSX donde indica el marcador, y el CSS si lo extrae). Para las tres
últimas el CSS sigue vivo en `landingStyles.ts` (no se movió), solo se
archivó el JSX. Las clases CSS de la Seguridad verbosa
(`.sec-compliance*`, `.badge-status*`) siguen vivas en
`landingStyles.ts` porque `LandingSeguridadPage` reusa `.sec-compact`,
`.sec-row`, `.sec-strip`.

### Editar CSS del landing
Todo el CSS del landing está en `src/components/landingStyles.ts` —
no en `<style>` inline ni en `styles.css`. Si necesitás cambiar
spacing, colores o cualquier regla de masthead/footer/hero/etc.,
editá el string `LANDING_CSS` ahí. Los tokens (`--blue`, `--s1`,
etc.) sí viven en `styles.css`.

### Hero full-height + ticker
El hero es un slide de pantalla completa: `min-height: calc(100svh -
96px)` (48px del masthead sticky + ~48px del ticker), `display:flex`
columna, con `.hero-grid` centrado vía `margin: auto 0` y el
`.hero-meta` arriba. Así al abrir se ve el hero completo y el ticker
asoma justo abajo, sin scrollear. Si cambia el alto del masthead o del
ticker, reajustar ese `96px`.

### Scroll reveal (estilo Apple)
`<ScrollReveal />` (montado en `LandingShell`) usa `IntersectionObserver`
y togglea la clase `.is-visible` en los elementos `.reveal` /
`.reveal-cascade` dentro de `.lab-landing`. Es **bidireccional** (entra
al aparecer, se revierte al salir) y se re-arma en cada cambio de ruta.
Clases (en `landingStyles.ts`):
- `.reveal` (fade + sube), modificadores `.rv-left` / `.rv-right`
  (entran desde el costado, translateX 56px).
- `--rv-d` para el stagger entre tarjetas (ver `.steps`/`.agents`).
- `.reveal-cascade` en `.section-head`: el contenedor dispara y sus
  hijos (`.num`, `h2`, `.en`, `.lede`) entran escalonados.
- Respeta `prefers-reduced-motion`. En mobile (≤900px) el lateral se
  convierte en vertical para no marear.

Las secciones (`.section`, `.cta`) y `.lab-landing` tienen
`overflow-x: clip` para que el deslizamiento lateral no genere scroll
horizontal.

### Footer "Argentina" (wordmark)
En el footer, "Argentina" lleva las tres franjas de la bandera
(celeste/blanco/celeste) pintadas en las letras con `background-clip:
text` + un brillo que barre simulando ondeo (`@keyframes arg-wave`), y
un **Sol de Mayo SVG como marca de agua** detrás de la palabra
(`.arg-watermark`, centrado, opacidad baja, `z-index` por detrás).
Clases: `.arg`, `.arg-wrap`, `.arg-watermark`. Respeta
`prefers-reduced-motion`.

### Color de los botones del landing
`.lab-landing a` define el color de link (petróleo) y, por
especificidad `(0,1,1)`, le gana a `.btn-primary { color:#fff }` — el
texto del botón primario quedaba invisible (petróleo sobre petróleo).
Por eso existe `.lab-landing a.btn-primary { color:#fff }` (especificidad
mayor). **No** subir la especificidad de `.lab-landing a` (ej. con
`:not(...)`) porque pisa los colores de `.masthead-nav a` y
`.footer-col a` y rompe el contraste de esos links.

### Responsive / mobile
Las grillas activas del home (`hero-grid`, `section-head`, `steps`,
`trace-hero`, `agents`, `cta`, `footer-top`) se apilan a una columna en
`@media (max-width: 900px)` usando `minmax(0, 1fr)` (no `1fr` pelado:
con `minmax(0,…)` la columna encoge por debajo del contenido y el texto
envuelve, si no desborda). En `≤671px` el masthead se compacta (oculta
subtítulo, toggle ES/EN y los `.nav-anchor`, dejando "Cuenta" para el
login), el `.hero-meta` se apila/wrapea y bajan tamaños. Bloques al
final de `LANDING_CSS`.

## Convenciones de código
- Strings de UI en español (el lab es argentino).
- Identificadores y types del dominio en español
  (`Reactivo`, `Lote`, `Movimiento`, `Proveedor`).
- Comentarios mínimos; cuando hace falta, en inglés.
- Sin emojis en UI ni código salvo pedido explícito.
- Componentes funcionales con TS estricto, props con destructuring.
- `cn()` de `lib/utils` para combinar classes Tailwind condicional.
- Antes de cambiar fuentes/pesos, verificar que el `@import` de
  Google Fonts en `styles.css` los incluya (ej. peso 500 italic del
  serif requiere `1,500` en la URL).

## Tareas inmediatas pendientes
- Migrar al patrón `<PageHeader>` (con `plain`) las páginas que aún
  no lo usan: Lotes, Consumo, Equipamiento, Asistente, Auditoría,
  Mesada, Protocolos.
- Modo oscuro en las páginas con colores hardcoded — varias
  (Dashboard parcial, Mesada, etc.) tienen literales hex inline en
  `style={{}}` que no responden al tema. Ir reemplazando por
  `var(--...)` a medida que se tocan.
- Landing: el toggle de idioma **ES/EN** es decorativo (no hay i18n
  aún). El link "¿Olvidaste tu contraseña?" del login abre mailto al
  contacto operativo actual.
  Datos "en producción" del hero/ticker (142 lotes, uptime, "last
  sync") son ilustrativos hasta que el producto esté lanzado.

## Workflow
- Dev: `npm run dev` (vite, http://127.0.0.1:5173).
- Typecheck antes de cerrar: `npx tsc -b`.
- Build de prod: `npm run build`. Lint: `npm run lint`.
- Backend FastAPI tiene que estar levantado en `:8000` para que
  funcione la app (endpoints en `src/lib/api.ts`).
