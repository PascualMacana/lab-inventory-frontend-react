import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "./components/AppShell"
import { LandingShell } from "./components/LandingShell"
import { ChangePasswordPage } from "./components/LoginPage"
import { LandingPage } from "./pages/LandingPage"
import { LandingPageV2 } from "./pages/LandingPageV2"
import { LandingSeguridadPage } from "./pages/LandingSeguridadPage"
import { useAuth } from "./lib/auth"
import { puede } from "./lib/permissions"
import { AsistentePage } from "./pages/AsistentePage"
import { AuditoriaPage } from "./pages/AuditoriaPage"
import { ConsumoPage } from "./pages/ConsumoPage"
import { DashboardPage } from "./pages/DashboardPage"
import { EquipamientoPage } from "./pages/EquipamientoPage"
import { LotesPage } from "./pages/LotesPage"
import { MesadaPage } from "./pages/MesadaPage"
import { MovimientosPage } from "./pages/MovimientosPage"
import { OwnerPage } from "./pages/OwnerPage"
import { ProtocolosPage } from "./pages/ProtocolosPage"
import { ProveedoresPage } from "./pages/ProveedoresPage"
import { ReactivosPage } from "./pages/ReactivosPage"
import { UsuariosPage } from "./pages/UsuariosPage"
import { TareasPage } from "./pages/TareasPage"

const GraphsPage = lazy(() => import("./Graphs/GraphsPage").then((module) => ({ default: module.GraphsPage })))

const protectedRoutes = [
  { path: "owner", action: "ver_pagina_owner", element: <OwnerPage /> },
  { index: true, action: "ver_pagina_dashboard", element: <DashboardPage /> },
  { path: "reactivos", action: "ver_pagina_reactivos", element: <ReactivosPage /> },
  { path: "lotes", action: "ver_pagina_lotes", element: <LotesPage /> },
  { path: "consumo", action: "ver_pagina_consumo", element: <ConsumoPage /> },
  { path: "mesada", action: "ver_pagina_mesada", element: <MesadaPage /> },
  { path: "protocolos", action: "ver_pagina_protocolos", element: <ProtocolosPage /> },
  { path: "tareas", action: "ver_pagina_tareas", element: <TareasPage /> },
  { path: "movimientos", action: "ver_pagina_movimientos", element: <MovimientosPage /> },
  { path: "proveedores", action: "ver_pagina_proveedores", element: <ProveedoresPage /> },
  { path: "equipamiento", action: "ver_pagina_equipamiento", element: <EquipamientoPage /> },
  { path: "usuarios", action: "ver_pagina_usuarios", element: <UsuariosPage /> },
  { path: "asistente", action: "ver_pagina_asistente", element: <AsistentePage /> },
  { path: "auditoria", action: "ver_pagina_auditoria", element: <AuditoriaPage /> },
  {
    path: "graphs",
    action: "ver_pagina_analitica",
    element: (
      <Suspense fallback={<div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Cargando analítica...</div>}>
        <GraphsPage />
      </Suspense>
    ),
  },
]

export function App() {
  const { token, usuario, isBootstrapping, mustChangePassword } = useAuth()

  if (isBootstrapping) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-cds-textSecondary">Cargando sesión...</div>
  }

  if (!token) {
    return (
      <Routes>
        <Route element={<LandingShell />}>
          <Route index element={<LandingPage />} />
          <Route path="v2" element={<LandingPageV2 />} />
          <Route path="seguridad" element={<LandingSeguridadPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  if (mustChangePassword) {
    return <ChangePasswordPage />
  }

  const fallbackPath = protectedRoutes.find((route) => puede(usuario, route.action) && route.path)?.path ?? ""
  const fallbackElement = <Navigate to={`/${fallbackPath}`} replace />

  return (
    <Routes>
      <Route element={<AppShell />}>
        {protectedRoutes.map((route) => {
          const element = puede(usuario, route.action) ? route.element : fallbackElement
          if (route.index) {
            return <Route key="index" index element={element} />
          }
          return <Route key={route.path} path={route.path} element={element} />
        })}
        <Route path="*" element={fallbackElement} />
      </Route>
    </Routes>
  )
}
