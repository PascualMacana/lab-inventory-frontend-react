import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Camera } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { SuccessBanner } from "../components/SuccessBanner"
import { NuevoLoteForm } from "./LotesPage"
import { api, type Reactivo } from "../lib/api"
import { useAuth } from "../lib/auth"

const reactivosVacios: Reactivo[] = []

// Vista dedicada del wizard foto-primero. Arranca en modo foto (cámara-primero);
// el modo manual sigue disponible adentro del formulario. Tras crear, el form se
// limpia solo, así que el usuario puede ingresar varios frascos seguidos.
export function IngresarFrascoPage() {
  const { token, usuario } = useAuth()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [codigoCreado, setCodigoCreado] = useState<string | null>(null)

  const verLotesHref = codigoCreado
    ? `/reactivos/lotes?codigo=${encodeURIComponent(codigoCreado)}`
    : "/reactivos/lotes"

  const reactivosQuery = useQuery({
    queryKey: ["reactivos"],
    queryFn: () => api.reactivos(token!),
    enabled: Boolean(token),
  })
  const reactivos = reactivosQuery.data ?? reactivosVacios

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <Camera size={22} aria-hidden="true" />
            {t("ingresar.titulo")}
          </h1>
          <p className="mt-2 text-sm leading-[1.29] tracking-[0.16px] text-cds-textSecondary">
            {t("ingresar.descripcion")}
          </p>
        </div>
        <Link to="/reactivos/lotes" className="text-sm tracking-[0.16px] text-cds-linkPrimary underline">
          {t("ingresar.verLotes")}
        </Link>
      </div>

      {mensaje ? (
        <SuccessBanner
          message={
            <>
              {mensaje}{" "}
              <Link to={verLotesHref} className="text-cds-linkPrimary underline">
                {codigoCreado ? t("ingresar.verLote") : t("ingresar.verEnLotes")}
              </Link>
            </>
          }
          onClose={() => setMensaje(null)}
          className="mb-6"
        />
      ) : null}

      <NuevoLoteForm
        token={token!}
        usuarioId={usuario!.id}
        reactivos={reactivos}
        modoInicial="vision"
        onSuccess={async (_reactivoId, mensajeCreacion, _quedarse, codigoInterno) => {
          await queryClient.invalidateQueries({ queryKey: ["reactivos"] })
          await queryClient.invalidateQueries({ queryKey: ["lotes"] })
          await queryClient.invalidateQueries({ queryKey: ["dashboard"] })
          setMensaje(mensajeCreacion)
          setCodigoCreado(codigoInterno ?? null)
        }}
      />
    </div>
  )
}
