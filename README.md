# Lab Inventory React Frontend

Frontend React vigente de Lab Inventory. Esta app consume la API FastAPI existente.

## Comandos

```bash
npm install
npm run dev
```

La app corre por defecto en `http://127.0.0.1:5173` y espera la API en `http://127.0.0.1:8000`.

Para apuntar a otra API:

```bash
VITE_API_URL=http://127.0.0.1:8000 npm run dev
```

## Diseño

Usa Tailwind + componentes locales estilo shadcn/ui, pero los tokens visuales salen de `../design.md`:

- IBM Plex Sans / Mono.
- Tokens CSS `--cds-*`.
- Azul IBM Blue 60 como acento principal.
- Componentes rectangulares, sin sombras salvo overlays.
- Inputs con borde inferior.
- Modo claro/oscuro preparado por variables CSS.
