import { FormEvent, useState } from "react"
import { ArrowRight, FlaskConical, Save } from "lucide-react"

import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { useAuth } from "../lib/auth"

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-cds-background lab-fade-in">
      <section className="grid min-h-screen w-full bg-cds-background lg:grid-cols-[minmax(0,1fr)_520px] xl:grid-cols-[minmax(0,1fr)_560px]">
        <div className="relative hidden overflow-hidden bg-[#05080f] lg:block">
          <LoginGraph />
          <div className="pointer-events-none absolute inset-x-20 bottom-10 text-center">
            <div className="mb-4 h-px bg-[#78a9ff]/40" />
            <div className="font-serif text-[15px] italic tracking-[0.7px] text-[#a6c8ff]/75">
              Rerum Connexio — Naturæ Ordo
            </div>
          </div>
        </div>

        <div className="flex min-h-screen flex-col border-l border-cds-borderSubtle bg-cds-background">
          <div className="flex h-12 shrink-0 items-center gap-3 bg-[var(--lab-sidebar-bg)] px-6 text-sm tracking-[0.16px]">
            <span className="font-mono font-semibold text-white">Lab Inventory</span>
            <span className="text-[var(--lab-sidebar-text)]">Laboratory inventory system</span>
          </div>

          <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-16">
            <div className="w-full max-w-[460px]">
              <div className="mb-3 flex h-10 w-10 items-center justify-center bg-cds-layer01 text-cds-textSecondary lg:hidden">
                <FlaskConical size={22} aria-hidden="true" />
              </div>
              <div className="mb-4 font-mono text-xs tracking-[0.32px] text-cds-linkPrimary">// ACCESO SEGURO</div>
              <h1 className="mb-3 text-[42px] leading-[1.19]">Iniciar sesión</h1>
              <p className="mb-10 text-base leading-6 tracking-[0.16px] text-cds-textSecondary">
                Ingresá con tus credenciales institucionales.
              </p>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="usuario@institucion.org"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <p className="text-xs leading-4 tracking-[0.32px] text-cds-textSecondary">
                  Si es tu primera vez, la password que escribas ahora queda como tuya.
                </p>
              </div>

              {error ? (
                <div className="border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm text-cds-textPrimary">
                  {error}
                </div>
              ) : null}

              <Button className="w-full justify-between" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </form>

            <p className="mt-6 text-xs leading-4 tracking-[0.32px] text-cds-supportError">
              ¿Olvidaste tu contraseña? Mandá un mensaje a Oxserv@hotmail.com.
            </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export function ChangePasswordPage() {
  const { changePassword, logout } = useAuth()
  const [passwordActual, setPasswordActual] = useState("")
  const [passwordNueva, setPasswordNueva] = useState("")
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (passwordNueva.length < 8) {
      setError("La contraseña nueva debe tener al menos 8 caracteres.")
      return
    }
    if (passwordNueva !== passwordConfirmacion) {
      setError("La confirmación no coincide con la contraseña nueva.")
      return
    }
    setIsSubmitting(true)
    try {
      await changePassword(passwordActual, passwordNueva)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout panelClassName="lab-auth-panel-slide">
      <div className="w-full max-w-[460px]">
        <div className="mb-3 font-mono text-xs tracking-[0.32px] text-cds-linkPrimary">// CAMBIO OBLIGATORIO</div>
        <h1 className="mb-3 text-[42px] leading-[1.19]">Cambiar contraseña</h1>
        <p className="mb-10 text-base leading-6 tracking-[0.16px] text-cds-textSecondary">
          Antes de continuar, definí una contraseña propia para esta cuenta.
        </p>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="password_actual">Contraseña actual</Label>
            <Input
              id="password_actual"
              type="password"
              autoComplete="current-password"
              value={passwordActual}
              onChange={(event) => setPasswordActual(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password_nueva">Contraseña nueva</Label>
            <Input
              id="password_nueva"
              type="password"
              autoComplete="new-password"
              value={passwordNueva}
              onChange={(event) => setPasswordNueva(event.target.value)}
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password_confirmacion">Confirmar contraseña nueva</Label>
            <Input
              id="password_confirmacion"
              type="password"
              autoComplete="new-password"
              value={passwordConfirmacion}
              onChange={(event) => setPasswordConfirmacion(event.target.value)}
              minLength={8}
              required
            />
          </div>

          {error ? (
            <div className="border-l-4 border-cds-supportError bg-cds-layer01 px-4 py-3 text-sm text-cds-textPrimary">
              {error}
            </div>
          ) : null}

          <Button className="w-full justify-between" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar contraseña"}
            <Save size={18} aria-hidden="true" />
          </Button>
        </form>

        <Button type="button" variant="ghost" className="mt-4 px-0" onClick={() => void logout()}>
          Salir
        </Button>
      </div>
    </AuthLayout>
  )
}

function AuthLayout({ children, panelClassName }: { children: React.ReactNode; panelClassName?: string }) {
  return (
    <main className="min-h-screen overflow-hidden bg-cds-background">
      <section className="grid min-h-screen w-full bg-cds-background lg:grid-cols-[minmax(0,1fr)_520px] xl:grid-cols-[minmax(0,1fr)_560px]">
        <div className="relative hidden overflow-hidden bg-[#05080f] lg:block">
          <LoginGraph />
          <div className="pointer-events-none absolute inset-x-20 bottom-10 text-center">
            <div className="mb-4 h-px bg-[#78a9ff]/40" />
            <div className="font-serif text-[15px] italic tracking-[0.7px] text-[#a6c8ff]/75">
              Rerum Connexio — Naturæ Ordo
            </div>
          </div>
        </div>

        <div className={`flex min-h-screen flex-col border-l border-cds-borderSubtle bg-cds-background ${panelClassName ?? ""}`}>
          <div className="flex h-12 shrink-0 items-center gap-3 bg-[var(--lab-sidebar-bg)] px-6 text-sm tracking-[0.16px]">
            <span className="font-mono font-semibold text-white">Lab Inventory</span>
            <span className="text-[var(--lab-sidebar-text)]">Laboratory inventory system</span>
          </div>

          <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-16">
            {children}
          </div>
        </div>
      </section>
    </main>
  )
}

function LoginGraph() {
  return (
    <svg className="absolute inset-0 h-full w-full scale-110" viewBox="0 0 370 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="370" height="600" fill="#05080f" />
      {[
        [185, 295, 68, 148, 0.18],
        [185, 295, 290, 108, 0.18],
        [185, 295, 48, 310, 0.18],
        [185, 295, 52, 470, 0.18],
        [185, 295, 188, 518, 0.18],
        [185, 295, 330, 490, 0.18],
        [185, 295, 348, 310, 0.18],
        [185, 295, 322, 175, 0.18],
        [185, 295, 185, 68, 0.18],
        [68, 148, 48, 310, 0.12],
        [68, 148, 142, 62, 0.12],
        [68, 148, 185, 68, 0.12],
        [48, 310, 52, 470, 0.12],
        [48, 310, 108, 390, 0.12],
        [290, 108, 322, 175, 0.12],
        [290, 108, 185, 68, 0.12],
        [322, 175, 348, 310, 0.12],
        [348, 310, 330, 490, 0.12],
        [330, 490, 258, 420, 0.12],
        [330, 490, 188, 518, 0.12],
        [52, 470, 108, 390, 0.12],
        [52, 470, 188, 518, 0.12],
        [108, 390, 185, 295, 0.1],
        [258, 420, 185, 295, 0.1],
        [258, 420, 188, 518, 0.12],
        [142, 62, 185, 68, 0.14],
        [232, 38, 185, 68, 0.14],
        [30, 210, 68, 148, 0.1],
        [355, 210, 322, 175, 0.1],
      ].map(([x1, y1, x2, y2, opacity], index) => (
        <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0f62fe" strokeWidth="0.6" opacity={opacity} />
      ))}
      {[
        [142, 62, 3, 0.35],
        [232, 38, 2.5, 0.28],
        [30, 210, 2.5, 0.28],
        [355, 210, 2.5, 0.28],
        [108, 390, 3.5, 0.3],
        [258, 420, 3.5, 0.3],
      ].map(([cx, cy, r, opacity], index) => (
        <circle key={index} cx={cx} cy={cy} r={r} fill="#0f62fe" opacity={opacity} />
      ))}
      {[
        [68, 148, 5.5],
        [290, 108, 5.5],
        [48, 310, 6],
        [322, 175, 5],
        [348, 310, 6],
        [52, 470, 6],
        [330, 490, 5.5],
        [188, 518, 5],
        [185, 68, 7],
      ].map(([cx, cy, r], index) => (
        <g key={index}>
          <circle cx={cx} cy={cy} r={r} fill="#05080f" stroke="#0f62fe" strokeWidth="0.8" opacity="0.6" />
          <circle cx={cx} cy={cy} r="2.5" fill="#0f62fe" opacity="0.5" />
        </g>
      ))}
      <circle cx="185" cy="295" r="22" fill="#05080f" stroke="#0f62fe" strokeWidth="1.25" opacity="0.5" />
      <circle cx="185" cy="295" r="14" fill="#05080f" stroke="#0f62fe" strokeWidth="0.75" opacity="0.35" />
      <circle cx="185" cy="295" r="6" fill="#0f62fe" opacity="0.55" />
      <circle cx="185" cy="295" r="2.5" fill="#78a9ff" opacity="0.95" />
      <circle cx="185" cy="295" r="60" fill="none" stroke="#0f62fe" strokeWidth="0.4" opacity="0.06" />
      <circle cx="185" cy="295" r="110" fill="none" stroke="#0f62fe" strokeWidth="0.3" opacity="0.04" />
      <line x1="60" y1="556" x2="310" y2="556" stroke="#0f62fe" strokeWidth="0.3" opacity="0.12" />
      <text x="185" y="572" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="12" fill="#0f62fe" opacity="0.35" letterSpacing="0.5">
        Rerum Connexio - Naturae Ordo
      </text>
    </svg>
  )
}
