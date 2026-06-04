import { CSSProperties, FormEvent, ReactNode, useState } from "react"
import { useTranslation } from "react-i18next"

import { LANDING_CSS } from "./landingStyles"
import { useAuth } from "../lib/auth"

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

        <a href="mailto:Ox.serv@hotmail.com" className="login-forgot">{t("login.olvidaste")}</a>

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

function ConstellationPanel() {
  const { t } = useTranslation()
  return (
    <aside className="const-panel">
      <div className="const-meta">
        <span className="live">{t("login.enProduccion")}</span>
        <span>·</span>
        <span>labinventory.lat</span>
      </div>

      <svg className="const-svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <circle className="halo" cx="500" cy="500" r="160" />
        <circle className="halo" cx="500" cy="500" r="260" />
        <circle className="halo" cx="500" cy="500" r="380" />

        {[
          [42, 85, 0.9, 0.3], [95, 40, 0.7, 0.2], [160, 110, 1.1, 0.35], [248, 60, 0.8, 0.22],
          [310, 130, 1, 0.28], [395, 45, 0.6, 0.18], [460, 110, 0.9, 0.3], [540, 60, 1.2, 0.4],
          [620, 160, 0.7, 0.2], [695, 90, 1, 0.32], [765, 45, 0.8, 0.25], [840, 130, 0.9, 0.28],
          [915, 75, 0.7, 0.2], [955, 180, 1.1, 0.35], [60, 220, 0.8, 0.22], [125, 265, 1, 0.3],
          [205, 345, 0.7, 0.18], [385, 235, 0.9, 0.28], [640, 265, 0.8, 0.22], [880, 305, 1.1, 0.32],
          [930, 380, 0.7, 0.2], [40, 380, 0.9, 0.26], [90, 480, 0.7, 0.18], [245, 475, 1, 0.3],
          [335, 540, 0.6, 0.15], [655, 545, 0.8, 0.22], [760, 475, 0.7, 0.18], [890, 460, 1, 0.3],
          [955, 540, 0.8, 0.24], [30, 560, 1.1, 0.36], [105, 640, 0.7, 0.18], [190, 700, 0.9, 0.28],
          [350, 695, 0.7, 0.2], [500, 720, 1, 0.3], [595, 680, 0.6, 0.16], [720, 700, 0.9, 0.26],
          [830, 640, 0.7, 0.2], [915, 700, 1.1, 0.34], [965, 790, 0.8, 0.22], [75, 795, 0.7, 0.18],
          [155, 855, 1, 0.3], [235, 930, 0.6, 0.16], [330, 830, 0.9, 0.26], [420, 885, 0.7, 0.2],
          [510, 945, 1, 0.3], [605, 830, 0.8, 0.22], [685, 905, 0.6, 0.16], [795, 825, 0.9, 0.28],
          [870, 905, 0.7, 0.2], [945, 955, 1, 0.32], [412, 395, 0.5, 0.2], [588, 605, 0.5, 0.2],
          [460, 570, 0.6, 0.22], [552, 430, 0.6, 0.22],
        ].map(([cx, cy, r, opacity], index) => (
          <circle
            key={`star-${index}`}
            className="star"
            cx={cx}
            cy={cy}
            r={r}
            style={{ "--star-op": String(opacity), "--delay": `${0.3 + index * 0.006}s` } as CSSProperties}
          />
        ))}

        {[
          [140, 230, 245, 190, 0.32], [245, 190, 360, 285, 0.32], [360, 285, 500, 500, 0.32],
          [500, 500, 715, 320, 0.32], [715, 320, 850, 205, 0.32], [500, 500, 680, 640, 0.32],
          [680, 640, 815, 790, 0.32], [500, 500, 320, 620, 0.28], [320, 620, 160, 540, 0.28],
          [160, 540, 140, 230, 0.28], [320, 620, 395, 830, 0.2], [680, 640, 560, 830, 0.2],
          [205, 410, 360, 285, 0.22], [430, 230, 595, 245, 0.22], [595, 245, 715, 320, 0.2],
          [755, 445, 680, 640, 0.2], [905, 540, 815, 790, 0.18], [480, 760, 560, 830, 0.18],
        ].map(([x1, y1, x2, y2, opacity], index) => (
          <line
            key={`edge-${index}`}
            className="edge"
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            style={{ "--edge-op": String(opacity) } as CSSProperties}
          />
        ))}

        {[
          [140, 230, 6, 2.6], [360, 285, 5, 2.2], [850, 205, 6, 2.8], [815, 790, 5, 2.4],
          [160, 540, 5, 2.3],
        ].map(([cx, cy, halo, star], index) => (
          <g key={`bright-${index}`}>
            <circle className="star-halo" cx={cx} cy={cy} r={halo} style={{ "--halo-op": "0.18", "--delay": "0.65s" } as CSSProperties} />
            <circle className="star-bright" cx={cx} cy={cy} r={star} style={{ "--star-op": "0.92", "--delay": "0.6s" } as CSSProperties} />
          </g>
        ))}

        <circle className="star-halo" cx="500" cy="500" r="10" style={{ "--halo-op": "0.28", "--delay": "0.55s" } as CSSProperties} />
        <circle className="star-halo" cx="500" cy="500" r="22" style={{ "--halo-op": "0.14", "--delay": "0.65s" } as CSSProperties} />
      </svg>

      <span className="const-hub" aria-label="LabInventory" />
      <div className="const-tag">Rerum Connexio — Naturæ Ordo</div>
    </aside>
  )
}
