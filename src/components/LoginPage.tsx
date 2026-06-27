import { FormEvent, ReactNode, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { LANDING_CSS } from "./landingStyles"
import { NeuralCanvas } from "./NeuralCanvas"
import { useAuth } from "../lib/auth"
import { api } from "../lib/api"

export function LoginPage() {
  const { login } = useAuth()
  const { t } = useTranslation()
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
      setError(err instanceof Error ? err.message : t("login.errLogin"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFrame>
      <form className="login-area" onSubmit={handleSubmit}>
        <div className="login-eyebrow">{t("login.accesoSeguro")}</div>
        <h1 className="login-title">
          {t("login.iniciarL1")}
          <br />
          <span className="em">{t("login.iniciarL2")}</span>
        </h1>
        <p className="login-sub">
          {t("login.subA")}<b>{t("login.subB")}</b>{t("login.subC")}
        </p>

        <div className="login-field">
          <label className="login-field-label" htmlFor="login-email">{t("login.email")}</label>
          <input
            className="login-input"
            id="login-email"
            type="email"
            placeholder={t("login.emailPh")}
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="login-field">
          <label className="login-field-label" htmlFor="login-pass">{t("login.password")}</label>
          <input
            className="login-input"
            id="login-pass"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Link to="/reset-password" className="login-forgot">{t("login.olvidaste")}</Link>

        {error ? <div className="login-error">{error}</div> : null}

        <button className="login-submit" type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? t("login.ingresando") : t("login.iniciarSesion")}</span>
          <span className="arrow">→</span>
        </button>
      </form>

      <footer className="login-foot">
        <span>labinventory.lat</span>
        <span>{t("login.footerSub")}</span>
      </footer>
    </AuthFrame>
  )
}

export function ChangePasswordPage() {
  const { changePassword, logout } = useAuth()
  const { t } = useTranslation()
  const [passwordActual, setPasswordActual] = useState("")
  const [passwordNueva, setPasswordNueva] = useState("")
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (passwordNueva.length < 8) {
      setError(t("login.errLargo"))
      return
    }
    if (passwordNueva !== passwordConfirmacion) {
      setError(t("login.errNoCoincide"))
      return
    }
    setIsSubmitting(true)
    try {
      await changePassword(passwordActual, passwordNueva)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.errCambiar"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFrame>
      <form className="login-area" onSubmit={handleSubmit}>
        <div className="login-eyebrow">{t("login.cambioObligatorio")}</div>
        <h1 className="login-title">
          {t("login.cambiarL1")}
          <br />
          <span className="em">{t("login.cambiarL2")}</span>
        </h1>
        <p className="login-sub">
          {t("login.changeSub")}
        </p>

        <div className="login-field">
          <label className="login-field-label" htmlFor="password_actual">{t("login.passwordActual")}</label>
          <input
            className="login-input"
            id="password_actual"
            type="password"
            autoComplete="current-password"
            required
            value={passwordActual}
            onChange={(event) => setPasswordActual(event.target.value)}
          />
        </div>

        <div className="login-field">
          <label className="login-field-label" htmlFor="password_nueva">{t("login.passwordNueva")}</label>
          <input
            className="login-input"
            id="password_nueva"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={passwordNueva}
            onChange={(event) => setPasswordNueva(event.target.value)}
          />
        </div>

        <div className="login-field">
          <label className="login-field-label" htmlFor="password_confirmacion">{t("login.confirmar")}</label>
          <input
            className="login-input"
            id="password_confirmacion"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={passwordConfirmacion}
            onChange={(event) => setPasswordConfirmacion(event.target.value)}
          />
        </div>

        {error ? <div className="login-error">{error}</div> : null}

        <button className="login-submit" type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? t("common.guardando") : t("login.guardarPassword")}</span>
          <span className="arrow">→</span>
        </button>

        <button type="button" className="login-forgot" onClick={() => void logout()}>
          {t("login.salir")}
        </button>
      </form>

      <footer className="login-foot">
        <span>labinventory.lat</span>
        <span>{t("login.accesoSeguro")}</span>
      </footer>
    </AuthFrame>
  )
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""

  if (token) {
    return <ResetPasswordConfirmForm token={token} />
  }

  return <ResetPasswordRequestForm />
}

function ResetPasswordRequestForm() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)
    setIsSubmitting(true)
    try {
      const response = await api.solicitarResetPassword(email.trim())
      setMessage(response.mensaje)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.resetRequestErr"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFrame>
      <form className="login-area" onSubmit={handleSubmit}>
        <div className="login-eyebrow">{t("login.resetEyebrow")}</div>
        <h1 className="login-title">
          {t("login.resetL1")}
          <br />
          <span className="em">{t("login.resetL2")}</span>
        </h1>
        <p className="login-sub">{t("login.resetSub")}</p>

        <div className="login-field">
          <label className="login-field-label" htmlFor="reset-email">{t("login.email")}</label>
          <input
            className="login-input"
            id="reset-email"
            type="email"
            placeholder={t("login.emailPh")}
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        {message ? <div className="login-error">{message}</div> : null}
        {error ? <div className="login-error">{error}</div> : null}

        <button className="login-submit" type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? t("login.resetSending") : t("login.resetSend")}</span>
          <span className="arrow">→</span>
        </button>

        <Link to="/login" className="login-forgot">{t("login.volverLogin")}</Link>
      </form>

      <footer className="login-foot">
        <span>labinventory.lat</span>
        <span>{t("login.resetFoot")}</span>
      </footer>
    </AuthFrame>
  )
}

function ResetPasswordConfirmForm({ token }: { token: string }) {
  const { t } = useTranslation()
  const [passwordNueva, setPasswordNueva] = useState("")
  const [passwordConfirmacion, setPasswordConfirmacion] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)
    if (passwordNueva.length < 8) {
      setError(t("login.errLargo"))
      return
    }
    if (passwordNueva !== passwordConfirmacion) {
      setError(t("login.errNoCoincide"))
      return
    }
    setIsSubmitting(true)
    try {
      const response = await api.resetPassword(token, passwordNueva)
      setMessage(response.mensaje)
      setPasswordNueva("")
      setPasswordConfirmacion("")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.resetConfirmErr"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFrame>
      <form className="login-area" onSubmit={handleSubmit}>
        <div className="login-eyebrow">{t("login.resetEyebrow")}</div>
        <h1 className="login-title">
          {t("login.resetNewL1")}
          <br />
          <span className="em">{t("login.resetNewL2")}</span>
        </h1>
        <p className="login-sub">{t("login.resetNewSub")}</p>

        <div className="login-field">
          <label className="login-field-label" htmlFor="reset_password_nueva">{t("login.passwordNueva")}</label>
          <input
            className="login-input"
            id="reset_password_nueva"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={passwordNueva}
            onChange={(event) => setPasswordNueva(event.target.value)}
          />
        </div>

        <div className="login-field">
          <label className="login-field-label" htmlFor="reset_password_confirmacion">{t("login.confirmar")}</label>
          <input
            className="login-input"
            id="reset_password_confirmacion"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={passwordConfirmacion}
            onChange={(event) => setPasswordConfirmacion(event.target.value)}
          />
        </div>

        {message ? <div className="login-error">{message}</div> : null}
        {error ? <div className="login-error">{error}</div> : null}

        <button className="login-submit" type="submit" disabled={isSubmitting || Boolean(message)}>
          <span>{isSubmitting ? t("common.guardando") : t("login.resetConfirm")}</span>
          <span className="arrow">→</span>
        </button>

        <Link to="/login" className="login-forgot">{t("login.volverLogin")}</Link>
      </form>

      <footer className="login-foot">
        <span>labinventory.lat</span>
        <span>{t("login.resetFoot")}</span>
      </footer>
    </AuthFrame>
  )
}

function AuthFrame({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <main className="lab-landing">
      <style>{LANDING_CSS}</style>
      <div className="login-overlay open" role="presentation">
        <div className="login-overlay-bg" />
        <div className="login-overlay-content">
          <ConstellationPanel />
          <section className="login-panel">
            <header className="login-masthead">
              <span className="brand">LabInventory</span>
              <span className="div" />
              <span className="product">{t("login.sistemaInventario")}</span>
            </header>
            {children}
          </section>
        </div>
      </div>
    </main>
  )
}

// Panel decorativo del login: red neuronal 3D (ver NeuralCanvas). Mantiene los
// textos (meta arriba), el núcleo que late (const-hub) y el motto.
function ConstellationPanel() {
  const { t } = useTranslation()
  return (
    <aside className="const-panel">
      <NeuralCanvas />

      <div className="const-meta">
        <span className="live">{t("login.enProduccion")}</span>
        <span>·</span>
        <span>labinventory.lat</span>
      </div>

      <span className="const-hub" aria-label="LabInventory" />
      <div className="const-tag">Rerum Connexio — Naturæ Ordo</div>
    </aside>
  )
}
