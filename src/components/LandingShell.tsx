import { createContext, FormEvent, MouseEvent, useContext, useEffect, useRef, useState } from "react";
import { Link, Outlet } from "react-router-dom";

import { useAuth } from "../lib/auth";
import { HashLink } from "./HashLink";
import { LANDING_CSS } from "./landingStyles";
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
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loginOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => emailInputRef.current?.focus(), 460);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLoginOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [loginOpen]);

  const openLogin = (e?: MouseEvent) => {
    e?.preventDefault();
    setLoginOpen(true);
  };
  const closeLogin = (e?: MouseEvent) => {
    e?.preventDefault();
    setLoginOpen(false);
  };
  const closeAndScrollToDemo = (e?: MouseEvent) => {
    e?.preventDefault();
    setLoginOpen(false);
    window.setTimeout(() => {
      document.getElementById("cta")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 320);
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
      <div className="lab-landing">
        <style>{LANDING_CSS}</style>

        {/* ═══════════════ MASTHEAD ═══════════════ */}
        <header className="masthead">
          <Link className="masthead-brand" to="/">LabInventory</Link>
          <div className="masthead-product">Sistema de inventario de laboratorio</div>
          <nav className="masthead-nav">
            <HashLink to="/#dashboard">Producto</HashLink>
            <HashLink to="/#agentes">Agentes IA</HashLink>
            <HashLink to="/#trazabilidad">Trazabilidad</HashLink>
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
              <p className="desc">Inventario de laboratorio en tiempo real. Trazabilidad por frasco, agentes IA, todo en producción.</p>
            </div>
            <div className="footer-col">
              <h4>Producto</h4>
              <HashLink to="/#how">Cómo funciona</HashLink>
              <HashLink to="/#dashboard">Vista del producto</HashLink>
              <HashLink to="/#agentes">Agentes IA</HashLink>
              <HashLink to="/#trazabilidad">Trazabilidad</HashLink>
            </div>
            <div className="footer-col">
              <h4>Compañía</h4>
              <a href="#">Sobre</a>
              <a href="#">Contacto</a>
            </div>
            <div className="footer-col">
              <h4>Recursos</h4>
              <Link to="/seguridad">Seguridad</Link>
              <a href="mailto:hola@labinventory.lat">Contactar</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 LabInventory · Hecho en Argentina</span>
            <span className="live">sistema operativo · last sync 4s</span>
          </div>
        </footer>

      <div id="login-overlay" className={`login-overlay${loginOpen ? ' open' : ''}`} aria-hidden={!loginOpen} role="dialog" aria-modal="true" aria-labelledby="login-overlay-title">
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
      
            <svg className="const-svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              {/* subtle halos near hub */}
              <circle className="halo" cx="500" cy="500" r="160"></circle>
              <circle className="halo" cx="500" cy="500" r="260"></circle>
              <circle className="halo" cx="500" cy="500" r="380"></circle>
      
              {/* ── BACKGROUND DUST · many tiny stars ── */}
              <g>
                <circle className="star" cx="42"  cy="85"  r="0.9" style={{'--star-op': '0.30', '--delay': '0.30s'}}></circle>
                <circle className="star" cx="95"  cy="40"  r="0.7" style={{'--star-op': '0.20', '--delay': '0.32s'}}></circle>
                <circle className="star" cx="160" cy="110" r="1.1" style={{'--star-op': '0.35', '--delay': '0.34s'}}></circle>
                <circle className="star" cx="248" cy="60"  r="0.8" style={{'--star-op': '0.22', '--delay': '0.36s'}}></circle>
                <circle className="star" cx="310" cy="130" r="1.0" style={{'--star-op': '0.28', '--delay': '0.38s'}}></circle>
                <circle className="star" cx="395" cy="45"  r="0.6" style={{'--star-op': '0.18', '--delay': '0.40s'}}></circle>
                <circle className="star" cx="460" cy="110" r="0.9" style={{'--star-op': '0.30', '--delay': '0.42s'}}></circle>
                <circle className="star" cx="540" cy="60"  r="1.2" style={{'--star-op': '0.40', '--delay': '0.44s'}}></circle>
                <circle className="star" cx="620" cy="160" r="0.7" style={{'--star-op': '0.20', '--delay': '0.46s'}}></circle>
                <circle className="star" cx="695" cy="90"  r="1.0" style={{'--star-op': '0.32', '--delay': '0.48s'}}></circle>
                <circle className="star" cx="765" cy="45"  r="0.8" style={{'--star-op': '0.25', '--delay': '0.50s'}}></circle>
                <circle className="star" cx="840" cy="130" r="0.9" style={{'--star-op': '0.28', '--delay': '0.52s'}}></circle>
                <circle className="star" cx="915" cy="75"  r="0.7" style={{'--star-op': '0.20', '--delay': '0.54s'}}></circle>
                <circle className="star" cx="955" cy="180" r="1.1" style={{'--star-op': '0.35', '--delay': '0.56s'}}></circle>
                <circle className="star" cx="60"  cy="220" r="0.8" style={{'--star-op': '0.22', '--delay': '0.36s'}}></circle>
                <circle className="star" cx="125" cy="265" r="1.0" style={{'--star-op': '0.30', '--delay': '0.38s'}}></circle>
                <circle className="star" cx="205" cy="345" r="0.7" style={{'--star-op': '0.18', '--delay': '0.40s'}}></circle>
                <circle className="star" cx="385" cy="235" r="0.9" style={{'--star-op': '0.28', '--delay': '0.42s'}}></circle>
                <circle className="star" cx="640" cy="265" r="0.8" style={{'--star-op': '0.22', '--delay': '0.44s'}}></circle>
                <circle className="star" cx="880" cy="305" r="1.1" style={{'--star-op': '0.32', '--delay': '0.46s'}}></circle>
                <circle className="star" cx="930" cy="380" r="0.7" style={{'--star-op': '0.20', '--delay': '0.48s'}}></circle>
                <circle className="star" cx="40"  cy="380" r="0.9" style={{'--star-op': '0.26', '--delay': '0.36s'}}></circle>
                <circle className="star" cx="90"  cy="480" r="0.7" style={{'--star-op': '0.18', '--delay': '0.38s'}}></circle>
                <circle className="star" cx="245" cy="475" r="1.0" style={{'--star-op': '0.30', '--delay': '0.40s'}}></circle>
                <circle className="star" cx="335" cy="540" r="0.6" style={{'--star-op': '0.15', '--delay': '0.42s'}}></circle>
                <circle className="star" cx="655" cy="545" r="0.8" style={{'--star-op': '0.22', '--delay': '0.44s'}}></circle>
                <circle className="star" cx="760" cy="475" r="0.7" style={{'--star-op': '0.18', '--delay': '0.46s'}}></circle>
                <circle className="star" cx="890" cy="460" r="1.0" style={{'--star-op': '0.30', '--delay': '0.48s'}}></circle>
                <circle className="star" cx="955" cy="540" r="0.8" style={{'--star-op': '0.24', '--delay': '0.50s'}}></circle>
                <circle className="star" cx="30"  cy="560" r="1.1" style={{'--star-op': '0.36', '--delay': '0.36s'}}></circle>
                <circle className="star" cx="105" cy="640" r="0.7" style={{'--star-op': '0.18', '--delay': '0.38s'}}></circle>
                <circle className="star" cx="190" cy="700" r="0.9" style={{'--star-op': '0.28', '--delay': '0.40s'}}></circle>
                <circle className="star" cx="350" cy="695" r="0.7" style={{'--star-op': '0.20', '--delay': '0.42s'}}></circle>
                <circle className="star" cx="500" cy="720" r="1.0" style={{'--star-op': '0.30', '--delay': '0.44s'}}></circle>
                <circle className="star" cx="595" cy="680" r="0.6" style={{'--star-op': '0.16', '--delay': '0.46s'}}></circle>
                <circle className="star" cx="720" cy="700" r="0.9" style={{'--star-op': '0.26', '--delay': '0.48s'}}></circle>
                <circle className="star" cx="830" cy="640" r="0.7" style={{'--star-op': '0.20', '--delay': '0.50s'}}></circle>
                <circle className="star" cx="915" cy="700" r="1.1" style={{'--star-op': '0.34', '--delay': '0.52s'}}></circle>
                <circle className="star" cx="965" cy="790" r="0.8" style={{'--star-op': '0.22', '--delay': '0.54s'}}></circle>
                <circle className="star" cx="75"  cy="795" r="0.7" style={{'--star-op': '0.18', '--delay': '0.40s'}}></circle>
                <circle className="star" cx="155" cy="855" r="1.0" style={{'--star-op': '0.30', '--delay': '0.42s'}}></circle>
                <circle className="star" cx="235" cy="930" r="0.6" style={{'--star-op': '0.16', '--delay': '0.44s'}}></circle>
                <circle className="star" cx="330" cy="830" r="0.9" style={{'--star-op': '0.26', '--delay': '0.46s'}}></circle>
                <circle className="star" cx="420" cy="885" r="0.7" style={{'--star-op': '0.20', '--delay': '0.48s'}}></circle>
                <circle className="star" cx="510" cy="945" r="1.0" style={{'--star-op': '0.30', '--delay': '0.50s'}}></circle>
                <circle className="star" cx="605" cy="830" r="0.8" style={{'--star-op': '0.22', '--delay': '0.52s'}}></circle>
                <circle className="star" cx="685" cy="905" r="0.6" style={{'--star-op': '0.16', '--delay': '0.54s'}}></circle>
                <circle className="star" cx="795" cy="825" r="0.9" style={{'--star-op': '0.28', '--delay': '0.56s'}}></circle>
                <circle className="star" cx="870" cy="905" r="0.7" style={{'--star-op': '0.20', '--delay': '0.58s'}}></circle>
                <circle className="star" cx="945" cy="955" r="1.0" style={{'--star-op': '0.32', '--delay': '0.60s'}}></circle>
                <circle className="star" cx="412" cy="395" r="0.5" style={{'--star-op': '0.20', '--delay': '0.46s'}}></circle>
                <circle className="star" cx="588" cy="605" r="0.5" style={{'--star-op': '0.20', '--delay': '0.50s'}}></circle>
                <circle className="star" cx="460" cy="570" r="0.6" style={{'--star-op': '0.22', '--delay': '0.48s'}}></circle>
                <circle className="star" cx="552" cy="430" r="0.6" style={{'--star-op': '0.22', '--delay': '0.46s'}}></circle>
                {/* extra dust + secondary nodes */}
                <circle className="star" cx="205" cy="410" r="0.9" style={{'--star-op': '0.32', '--delay': '0.40s'}}></circle>
                <circle className="star" cx="285" cy="360" r="0.7" style={{'--star-op': '0.22', '--delay': '0.42s'}}></circle>
                <circle className="star" cx="430" cy="230" r="1.0" style={{'--star-op': '0.34', '--delay': '0.44s'}}></circle>
                <circle className="star" cx="595" cy="245" r="0.8" style={{'--star-op': '0.26', '--delay': '0.46s'}}></circle>
                <circle className="star" cx="755" cy="445" r="1.1" style={{'--star-op': '0.38', '--delay': '0.48s'}}></circle>
                <circle className="star" cx="845" cy="395" r="0.7" style={{'--star-op': '0.24', '--delay': '0.50s'}}></circle>
                <circle className="star" cx="905" cy="540" r="0.9" style={{'--star-op': '0.30', '--delay': '0.52s'}}></circle>
                <circle className="star" cx="260" cy="720" r="0.8" style={{'--star-op': '0.26', '--delay': '0.54s'}}></circle>
                <circle className="star" cx="480" cy="760" r="1.0" style={{'--star-op': '0.32', '--delay': '0.56s'}}></circle>
                <circle className="star" cx="600" cy="760" r="0.7" style={{'--star-op': '0.22', '--delay': '0.58s'}}></circle>
                <circle className="star" cx="750" cy="760" r="0.9" style={{'--star-op': '0.28', '--delay': '0.60s'}}></circle>
                <circle className="star" cx="180" cy="690" r="0.6" style={{'--star-op': '0.18', '--delay': '0.42s'}}></circle>
                <circle className="star" cx="395" cy="185" r="0.6" style={{'--star-op': '0.20', '--delay': '0.40s'}}></circle>
                <circle className="star" cx="760" cy="180" r="0.7" style={{'--star-op': '0.24', '--delay': '0.44s'}}></circle>
                <circle className="star" cx="100" cy="380" r="0.6" style={{'--star-op': '0.18', '--delay': '0.40s'}}></circle>
                <circle className="star" cx="110" cy="720" r="0.7" style={{'--star-op': '0.22', '--delay': '0.50s'}}></circle>
                <circle className="star" cx="900" cy="790" r="0.8" style={{'--star-op': '0.24', '--delay': '0.56s'}}></circle>
                <circle className="star" cx="540" cy="680" r="0.6" style={{'--star-op': '0.20', '--delay': '0.46s'}}></circle>
                <circle className="star" cx="445" cy="485" r="0.5" style={{'--star-op': '0.18', '--delay': '0.46s'}}></circle>
                <circle className="star" cx="560" cy="512" r="0.5" style={{'--star-op': '0.18', '--delay': '0.48s'}}></circle>
              </g>
      
              {/* ── FIGURE: edges between feature stars ── */}
              <line className="edge" style={{'--edge-op': '0.32'}} x1="140"  y1="230" x2="245" y2="190"></line>
              <line className="edge" style={{'--edge-op': '0.32'}} x1="245"  y1="190" x2="360" y2="285"></line>
              <line className="edge" style={{'--edge-op': '0.32'}} x1="360"  y1="285" x2="500" y2="500"></line>
              <line className="edge" style={{'--edge-op': '0.32'}} x1="500"  y1="500" x2="715" y2="320"></line>
              <line className="edge" style={{'--edge-op': '0.32'}} x1="715"  y1="320" x2="850" y2="205"></line>
              <line className="edge" style={{'--edge-op': '0.32'}} x1="500"  y1="500" x2="680" y2="640"></line>
              <line className="edge" style={{'--edge-op': '0.32'}} x1="680"  y1="640" x2="815" y2="790"></line>
              <line className="edge" style={{'--edge-op': '0.28'}} x1="500"  y1="500" x2="320" y2="620"></line>
              <line className="edge" style={{'--edge-op': '0.28'}} x1="320"  y1="620" x2="160" y2="540"></line>
              <line className="edge" style={{'--edge-op': '0.28'}} x1="160"  y1="540" x2="140" y2="230"></line>
              <line className="edge" style={{'--edge-op': '0.20'}} x1="320"  y1="620" x2="395" y2="830"></line>
              <line className="edge" style={{'--edge-op': '0.20'}} x1="680"  y1="640" x2="560" y2="830"></line>
              <line className="edge" style={{'--edge-op': '0.18'}} x1="850"  y1="205" x2="715" y2="320"></line>
              <line className="edge" style={{'--edge-op': '0.18'}} x1="360"  y1="285" x2="160" y2="540"></line>
              <line className="edge" style={{'--edge-op': '0.14'}} x1="245"  y1="190" x2="500" y2="500"></line>
              <line className="edge" style={{'--edge-op': '0.14'}} x1="715"  y1="320" x2="680" y2="640"></line>
              {/* secondary lattice — more graph density */}
              <line className="edge" style={{'--edge-op': '0.22'}} x1="205" y1="410" x2="360" y2="285"></line>
              <line className="edge" style={{'--edge-op': '0.22'}} x1="205" y1="410" x2="160" y2="540"></line>
              <line className="edge" style={{'--edge-op': '0.18'}} x1="205" y1="410" x2="320" y2="620"></line>
              <line className="edge" style={{'--edge-op': '0.22'}} x1="430" y1="230" x2="245" y2="190"></line>
              <line className="edge" style={{'--edge-op': '0.22'}} x1="430" y1="230" x2="595" y2="245"></line>
              <line className="edge" style={{'--edge-op': '0.20'}} x1="595" y1="245" x2="715" y2="320"></line>
              <line className="edge" style={{'--edge-op': '0.20'}} x1="595" y1="245" x2="850" y2="205"></line>
              <line className="edge" style={{'--edge-op': '0.20'}} x1="755" y1="445" x2="715" y2="320"></line>
              <line className="edge" style={{'--edge-op': '0.20'}} x1="755" y1="445" x2="680" y2="640"></line>
              <line className="edge" style={{'--edge-op': '0.18'}} x1="755" y1="445" x2="905" y2="540"></line>
              <line className="edge" style={{'--edge-op': '0.18'}} x1="905" y1="540" x2="815" y2="790"></line>
              <line className="edge" style={{'--edge-op': '0.18'}} x1="260" y1="720" x2="320" y2="620"></line>
              <line className="edge" style={{'--edge-op': '0.18'}} x1="260" y1="720" x2="395" y2="830"></line>
              <line className="edge" style={{'--edge-op': '0.18'}} x1="480" y1="760" x2="395" y2="830"></line>
              <line className="edge" style={{'--edge-op': '0.18'}} x1="480" y1="760" x2="560" y2="830"></line>
              <line className="edge" style={{'--edge-op': '0.16'}} x1="600" y1="760" x2="560" y2="830"></line>
              <line className="edge" style={{'--edge-op': '0.16'}} x1="600" y1="760" x2="680" y2="640"></line>
              <line className="edge" style={{'--edge-op': '0.16'}} x1="750" y1="760" x2="815" y2="790"></line>
              <line className="edge" style={{'--edge-op': '0.14'}} x1="845" y1="395" x2="850" y2="205"></line>
              <line className="edge" style={{'--edge-op': '0.14'}} x1="845" y1="395" x2="715" y2="320"></line>
              <line className="edge" style={{'--edge-op': '0.12'}} x1="285" y1="360" x2="360" y2="285"></line>
              <line className="edge" style={{'--edge-op': '0.12'}} x1="285" y1="360" x2="205" y2="410"></line>
              <line className="edge" style={{'--edge-op': '0.10'}} x1="540" y1="680" x2="500" y2="500"></line>
              <line className="edge" style={{'--edge-op': '0.10'}} x1="540" y1="680" x2="680" y2="640"></line>

              {/* ── FEATURE STARS (the bright ones in the figure) ── */}
              <circle className="star-halo" cx="140" cy="230" r="6" style={{'--halo-op': '0.20', '--delay': '0.6s'}}></circle>
              <circle className="star-bright" cx="140" cy="230" r="2.6" style={{'--star-op': '0.95', '--delay': '0.55s'}}></circle>
      
              <circle className="star" cx="245" cy="190" r="1.8" style={{'--star-op': '0.75', '--delay': '0.60s'}}></circle>
      
              <circle className="star-halo" cx="360" cy="285" r="5" style={{'--halo-op': '0.16', '--delay': '0.65s'}}></circle>
              <circle className="star-bright" cx="360" cy="285" r="2.2" style={{'--star-op': '0.9', '--delay': '0.6s'}}></circle>
      
              <circle className="star" cx="715" cy="320" r="2" style={{'--star-op': '0.8', '--delay': '0.62s'}}></circle>
      
              <circle className="star-halo" cx="850" cy="205" r="6" style={{'--halo-op': '0.20', '--delay': '0.68s'}}></circle>
              <circle className="star-bright" cx="850" cy="205" r="2.8" style={{'--star-op': '0.95', '--delay': '0.63s'}}></circle>
      
              <circle className="star" cx="680" cy="640" r="2" style={{'--star-op': '0.8', '--delay': '0.65s'}}></circle>
      
              <circle className="star-halo" cx="815" cy="790" r="5" style={{'--halo-op': '0.16', '--delay': '0.72s'}}></circle>
              <circle className="star-bright" cx="815" cy="790" r="2.4" style={{'--star-op': '0.9', '--delay': '0.67s'}}></circle>
      
              <circle className="star" cx="320" cy="620" r="1.9" style={{'--star-op': '0.78', '--delay': '0.62s'}}></circle>
      
              <circle className="star-halo" cx="160" cy="540" r="5" style={{'--halo-op': '0.18', '--delay': '0.70s'}}></circle>
              <circle className="star-bright" cx="160" cy="540" r="2.3" style={{'--star-op': '0.9', '--delay': '0.65s'}}></circle>
      
              <circle className="star" cx="395" cy="830" r="1.5" style={{'--star-op': '0.65', '--delay': '0.72s'}}></circle>
              <circle className="star" cx="560" cy="830" r="1.5" style={{'--star-op': '0.65', '--delay': '0.74s'}}></circle>
      
              {/* HUB position: subtle halo + tiny anchor star + pulse handled by .const-hub::after */}
              <circle className="star-halo" cx="500" cy="500" r="10" style={{'--halo-op': '0.28', '--delay': '0.55s'}}></circle>
              <circle className="star-halo" cx="500" cy="500" r="22" style={{'--halo-op': '0.14', '--delay': '0.65s'}}></circle>
            </svg>
      
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
                <input ref={emailInputRef} className="login-input" id="login-email" type="email" placeholder="m.carrera@conicet.gov.ar" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="login-field">
                <label className="login-field-label" htmlFor="login-pass">Contraseña</label>
                <input className="login-input" id="login-pass" type="password" placeholder="••••••••" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
      
              <a href="#" className="login-forgot">¿Olvidaste tu contraseña?</a>
      
              {loginError ? <div className="login-error">{loginError}</div> : null}

              <button className="login-submit" type="submit" disabled={loginSubmitting}>
                <span>{loginSubmitting ? 'Ingresando…' : 'Iniciar sesión'}</span>
                <span className="arrow">→</span>
              </button>
      
              <div className="login-divider"></div>
              <p className="login-sso">
                ¿Tu organización usa SSO?&nbsp;
                <button className="login-sso-link" type="button">Acceder con SSO institucional</button>
              </p>
            </form>
      
            <footer className="login-foot">
              <span>v2.1 · labinventory.lat</span>
              <button className="demo" type="button" onClick={closeAndScrollToDemo}>¿Sin cuenta? Pedir demo →</button>
            </footer>
          </section>
        </div>
      </div>
      </div>
    </LandingLoginContext.Provider>
  );
}
