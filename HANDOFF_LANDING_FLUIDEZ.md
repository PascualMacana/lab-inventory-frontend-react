# Handoff — Fluidez de la landing + arreglo mobile

Cambios hechos sobre la landing pública (ya mergeada). Todo vive en
**`frontend-react/`** (repo git propio, rama `main`). Typecheck OK
(`npx tsc -b`).

## Archivos tocados (4)
- `src/components/LandingShell.tsx` — apertura/cierre del overlay de login.
- `src/components/ScrollReveal.tsx` — replay de reveals al cerrar el login.
- `src/components/landingStyles.ts` — CSS: helper de replay + hardening mobile.
- `src/pages/LandingPage.tsx` — hero marcado como `.reveal`.

## Qué se cambió y por qué

### 1. Constelación del login: aparición suave (no "de golpe")
El overlay se monta/desmonta condicionalmente (`{loginOpen ? …}`) para no
reintroducir un bug de autofill de Mac (los inputs persistían sobre el hero
cuando el overlay estaba siempre montado). Al montar y agregar `.open` en el
mismo frame, el navegador **saltea la transición** → la constelación aparecía
de golpe.
**Fix:** apertura con **doble `requestAnimationFrame`** (pinta el estado
cerrado y recién en el frame siguiente agrega `.open`), en `LandingShell`.

### 2. Cierre suave del login
Antes el cierre desmontaba instantáneo. Ahora `requestClose()`:
- saca `.open` (fade-out de constelación + paneles),
- recién **desmonta el overlay ~360 ms después** (los inputs igual se
  desmontan, así el bug de autofill **no vuelve**),
- navega a `/` si venías de `/login`.

### 3. Al salir del login, "entra" la sección donde estás (no solo el hero)
`requestClose()` dispara un evento `window` **`landing:replay`** (con ~90 ms
de delay para que asiente la navegación/observer). `ScrollReveal` lo escucha y
**re-anima los elementos `.reveal`/`.reveal-cascade` que estén en viewport**
(los oculta al instante con la clase `rv-reset` que mata la transición, y los
vuelve a animar). Así, estés donde estés en la página, la sección visible
vuelve a entrar con movimiento — igual que los reveals al scrollear.

### 4. Entrada del hero en carga directa
El hero (`hero-meta`, columna de texto y `hero-stat`) ahora lleva `.reveal`,
así entra con fade+subida al cargar `/` directo y participa del replay del
punto 3. El `hero-stat` tiene `--rv-d: 120ms` para un leve stagger.

### 5. Hardening mobile (≤671px)
La landing se veía mal en teléfonos: títulos grandes con interlineado apretado
(`hero-title` line-height 0.96) **se superponían al envolver**, y había texto
cortado. Se ajustó en el bloque `@media (max-width: 671px)` de
`landingStyles.ts`:
- `hero-title` → `clamp(34px,10vw,56px)` + `line-height: 1.06`.
- `section-head h2` → `clamp(30px,8.5vw,40px)` + `line-height: 1.12`.
- `agent .title` 24px, `step .hello` 24px, `hero-stat .figure` 48px.
- `overflow-wrap: break-word` en párrafos largos; `.step .receipt` con wrap;
  `.timeline-row .what` con `overflow-wrap: anywhere`; `audit-head .code` 18px.
- (El stacking a 1 columna con `minmax(0,1fr)` y `overflow-x: clip` ya venía
  de antes, en los bloques `@media (max-width: 900px)` / `671px`.)

## Cómo verificar
Dev: `npm run dev` → http://127.0.0.1:5173/

1. **Abrir login** (botón "Cuenta" o "Ingresar", o ir a `/login`): la
   constelación se arma con transición, no de golpe.
2. **Cerrar login** (← Volver / Esc / click en el fondo): el overlay se
   desvanece y la sección visible detrás "entra" con movimiento.
3. **Scrollear a una sección cualquiera → abrir y cerrar login**: esa misma
   sección re-anima (no solo el hero).
4. **Bug de autofill (regresión)**: usar autorelleno de Mac en email/pass,
   cerrar el login, ir al hero → los campos no deben quedar visibles ni
   filtrarse sobre la landing.
5. **Mobile**: ⚠️ verificar en **teléfono real o DevTools responsive ~375px**.
   El headless Chrome no baja de ~500px de `innerWidth`, así que no sirve para
   validar < 500px. A 500px se ve correcto; el hardening apunta a 320–430px.

Respeta `prefers-reduced-motion` (sin animaciones).

## Subir / desplegar
```bash
cd frontend-react
npx tsc -b          # typecheck
npm run build       # build de prod a dist/
# git add src/ && git commit && push  (rama main, repo de frontend-react)
```

## Notas / contexto
- Backend FastAPI en `:8000` necesario solo para que el login autentique de
  verdad; la fluidez visual no lo requiere.
- Detalle de implementación y convenciones del landing: ver `CLAUDE.md`
  (secciones "Landing pública", "Scroll reveal", "Responsive / mobile").
- Pendientes previos (no parte de esto): toggle ES/EN decorativo, "¿Olvidaste
  tu contraseña?" sin cablear, datos "en producción" del hero ilustrativos.
