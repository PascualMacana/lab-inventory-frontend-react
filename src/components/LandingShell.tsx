import { createContext, FormEvent, MouseEvent, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../lib/auth";
import { HashLink } from "./HashLink";
import { LANDING_CSS } from "./landingStyles";
import { NeuralCanvas } from "./NeuralCanvas";
import { ScrollReveal } from "./ScrollReveal";
import { ScrollToHash } from "./ScrollToHash";

type LandingLoginContextValue = {
  openLogin: (e?: MouseEvent) => void;
  closeAndScrollToDemo: (e?: MouseEvent) => void;
};

const LandingLoginContext = createContext<LandingLoginContextValue>({
  openLogin: () => {},
  closeAndScrollToDemo: () => {},
});

export function useLandingLogin() {
  return useContext(LandingLoginContext);
}

export function LandingShell() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  // Smooth close: remove .open first, then unmount after the transition.
  // Inputs still disappear shortly after close, so macOS autofill does not leak
  // over the hero. The replay event lets the visible section animate back in.
  const requestClose = useCallback(
    (scrollDemo = false) => {
      setLoginVisible(false);
      if (location.pathname === "/login") navigate("/", { replace: true });
      window.setTimeout(() => window.dispatchEvent(new CustomEvent("landing:replay")), 90);
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => {
        setLoginOpen(false);
        if (scrollDemo) {
          document.getElementById("cta")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 360);
    },
    [location.pathname, navigate],
  );

  useEffect(() => {
    if (location.pathname === "/login") setLoginOpen(true);
  }, [location.pathname]);

  // Smooth open: double rAF lets the browser paint the closed state before
  // adding .open. With conditional mount, one frame can skip the transition.
  useEffect(() => {
    if (!loginOpen) return;
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setLoginVisible(true));
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [loginOpen]);

  useEffect(() => {
    if (!loginOpen) return;
    // iOS Safari ignora overflow:hidden en el body, así que el fondo seguía
    // scrolleando detrás del overlay (se veían las dos páginas superpuestas).
    // Lock robusto: fijamos el body en su posición de scroll y la restauramos al
    // cerrar.
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
      overflow: style.overflow,
    };
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    style.width = "100%";
    style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => emailInputRef.current?.focus(), 460);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      style.position = prev.position;
      style.top = prev.top;
      style.left = prev.left;
      style.right = prev.right;
      style.width = prev.width;
      style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [loginOpen, requestClose]);

  useEffect(() => {
    return () => window.clearTimeout(closeTimer.current);
  }, []);

  const openLogin = (e?: MouseEvent) => {
    e?.preventDefault();
    window.clearTimeout(closeTimer.current);
    if (loginOpen) {
      setLoginVisible(true); // closing in progress: show again without unmounting
    } else {
      setLoginOpen(true); // mount; the double-rAF effect starts the opening
    }
  };
  const closeLogin = (e?: MouseEvent) => {
    e?.preventDefault();
    requestClose();
  };
  const closeAndScrollToDemo = (e?: MouseEvent) => {
    e?.preventDefault();
    requestClose(true);
  };

  async function handleLoginSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoginSubmitting(false);
    }
  }

  return (
    <LandingLoginContext.Provider value={{ openLogin, closeAndScrollToDemo }}>
      <ScrollToHash />
      <ScrollReveal />
      <div className="lab-landing">
        <style>{LANDING_CSS}</style>

        {/* ═══════════════ MASTHEAD ═══════════════ */}
        <header className="masthead">
          <Link className="masthead-brand" to="/">LabInventory</Link>
          <div className="masthead-product">Sistema de inventario de laboratorio</div>
          <nav className="masthead-nav">
            <HashLink className="nav-anchor" to="/#agentes">Asistente</HashLink>
            <HashLink className="nav-anchor" to="/#trazabilidad">Trazabilidad</HashLink>
            <a href="#" onClick={openLogin}>Cuenta</a>
          </nav>
          <div className="lang-toggle">
            <button className="active">ES</button>
            <button>EN</button>
          </div>
        </header>

        <Outlet />

        {/* ═══════════════ FOOTER ═══════════════ */}
        <footer className="footer">
          <div className="footer-top">
            <div>
              <div className="brand">LabInventory</div>
              <div className="url">→ labinventory.lat</div>
              <p className="desc">Inventario de laboratorio en tiempo real. Trazabilidad por unidad, asistencia inteligente, todo en producción.</p>
            </div>
            <div className="footer-col">
              <h4>Producto</h4>
              <HashLink to="/#how">Cómo funciona</HashLink>
              <HashLink to="/#agentes">Asistente</HashLink>
              <HashLink to="/#trazabilidad">Trazabilidad</HashLink>
            </div>
            <div className="footer-col">
              <h4>Recursos</h4>
              <Link to="/seguridad">Seguridad</Link>
              <a href="mailto:hola@labinventory.lat">Contactar</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 LabInventory · Hecho en <span className="arg-wrap">
                <svg className="arg-watermark" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.5" fill="#f6b40e"></circle>
                  <g stroke="#f6b40e" strokeWidth="1.4" strokeLinecap="round">
                    <line x1="12" y1="2" x2="12" y2="5"></line><line x1="12" y1="19" x2="12" y2="22"></line><line x1="2" y1="12" x2="5" y2="12"></line><line x1="19" y1="12" x2="22" y2="12"></line>
                    <line x1="5" y1="5" x2="7" y2="7"></line><line x1="17" y1="17" x2="19" y2="19"></line><line x1="5" y1="19" x2="7" y2="17"></line><line x1="17" y1="7" x2="19" y2="5"></line>
                    <line x1="8.3" y1="2.6" x2="9.4" y2="5.4"></line><line x1="14.6" y1="18.6" x2="15.7" y2="21.4"></line><line x1="2.6" y1="8.3" x2="5.4" y2="9.4"></line><line x1="18.6" y1="14.6" x2="21.4" y2="15.7"></line>
                    <line x1="15.7" y1="2.6" x2="14.6" y2="5.4"></line><line x1="9.4" y1="18.6" x2="8.3" y2="21.4"></line><line x1="2.6" y1="15.7" x2="5.4" y2="14.6"></line><line x1="18.6" y1="9.4" x2="21.4" y2="8.3"></line>
                  </g>
                </svg>
                <span className="arg">Argentina</span></span></span>
            <span className="live">sistema operativo · last sync 4s</span>
          </div>
        </footer>

      {loginOpen ? (
      <div id="login-overlay" className={`login-overlay${loginVisible ? ' open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="login-overlay-title">
        <div className="login-overlay-bg" onClick={closeLogin}></div>
      
        <div className="login-overlay-content">
          {/* LEFT · constellation */}
          <aside className="const-panel">
            <button className="const-close" onClick={closeLogin} type="button">← Volver</button>
            <div className="const-meta">
              <span className="live">en producción</span>
              <span>·</span>
              <span>labinventory.lat</span>
            </div>
      
            <NeuralCanvas />
      
            <span className="const-hub" id="login-overlay-title" aria-label="LabInventory"></span>
      
            <div className="const-tag">Rerum Connexio — Naturæ Ordo</div>
          </aside>
      
          {/* RIGHT · login */}
          <section className="login-panel">
            <header className="login-masthead">
              <span className="brand">LabInventory</span>
              <span className="div"></span>
              <span className="product">Sistema de inventario de laboratorio</span>
            </header>
      
            <form className="login-area" onSubmit={handleLoginSubmit}>
              <div className="login-eyebrow">Acceso seguro</div>
              <h2 className="login-title">Iniciar<br /><span className="em">sesión.</span></h2>
              <p className="login-sub">
                Ingresá con tus credenciales institucionales. Cada acción queda <b>firmada con tu usuario</b> en la trazabilidad del laboratorio.
              </p>
      
              <div className="login-field">
                <label className="login-field-label" htmlFor="login-email">Correo electrónico</label>
                <input ref={emailInputRef} className="login-input" id="login-email" type="email" placeholder="m.carrera@laboratorio.com" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="login-field">
                <label className="login-field-label" htmlFor="login-pass">Contraseña</label>
                <input className="login-input" id="login-pass" type="password" placeholder="••••••••" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
      
              <Link to="/reset-password" className="login-forgot">¿Olvidaste tu contraseña?</Link>
      
              {loginError ? <div className="login-error">{loginError}</div> : null}

              <button className="login-submit" type="submit" disabled={loginSubmitting}>
                <span>{loginSubmitting ? 'Ingresando…' : 'Iniciar sesión'}</span>
                <span className="arrow">→</span>
              </button>
            </form>
      
            <footer className="login-foot">
              <span>v2.1 · labinventory.lat</span>
              <button className="demo" type="button" onClick={closeAndScrollToDemo}>¿Sin cuenta? Pedir demo →</button>
            </footer>
          </section>
        </div>
      </div>
      ) : null}
      </div>
    </LandingLoginContext.Provider>
  );
}
