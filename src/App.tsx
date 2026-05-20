import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "./components/AppShell"
import { ChangePasswordPage, LoginPage } from "./components/LoginPage"
import { useAuth } from "./lib/auth"
import { AsistentePage } from "./pages/AsistentePage"
import { AuditoriaPage } from "./pages/AuditoriaPage"
import { ConsumoPage } from "./pages/ConsumoPage"
import { DashboardPage } from "./pages/DashboardPage"
import { EquipamientoPage } from "./pages/EquipamientoPage"
import { LotesPage } from "./pages/LotesPage"
import { MesadaPage } from "./pages/MesadaPage"
import { MovimientosPage } from "./pages/MovimientosPage"
import { PlaceholderPage } from "./pages/PlaceholderPage"
import { ProtocolosPage } from "./pages/ProtocolosPage"
import { ProveedoresPage } from "./pages/ProveedoresPage"
import { ReactivosPage } from "./pages/ReactivosPage"
import { UsuariosPage } from "./pages/UsuariosPage"

const GraphsPage = lazy(() => import("./Graphs/GraphsPage").then((module) => ({ default: module.GraphsPage })))

export function App() {
  const { token, isBootstrapping, mustChangePassword } = useAuth()

  if (isBootstrapping) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-cds-textSecondary">Cargando sesión...</div>
  }

  if (!token) {
    return <LoginPage />
  }

  if (mustChangePassword) {
    return <ChangePasswordPage />
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="reactivos" element={<ReactivosPage />} />
        <Route path="lotes" element={<LotesPage />} />
        <Route path="consumo" element={<ConsumoPage />} />
        <Route path="mesada" element={<MesadaPage />} />
        <Route path="protocolos" element={<ProtocolosPage />} />
        <Route path="tareas" element={<PlaceholderPage title="Tareas" />} />
        <Route path="movimientos" element={<MovimientosPage />} />
        <Route path="proveedores" element={<ProveedoresPage />} />
        <Route path="equipamiento" element={<EquipamientoPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="asistente" element={<AsistentePage />} />
        <Route path="auditoria" element={<AuditoriaPage />} />
        <Route
          path="graphs"
          element={
            <Suspense fallback={<div className="bg-cds-layer01 p-4 text-sm text-cds-textSecondary">Cargando analítica...</div>}>
              <GraphsPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
