import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Apple-style scroll reveal: elements with `.reveal` inside the landing fade /
// slide in the first time they enter the viewport. Re-runs on route change so
// each landing route gets its own elements observed. Respects reduced-motion
// and gracefully reveals everything if IntersectionObserver is unavailable.
export function ScrollReveal() {
  const { pathname } = useLocation();

  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(".lab-landing .reveal, .lab-landing .reveal-cascade"),
    );
    if (!els.length) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    // Bidireccional: entra al aparecer y se revierte al salir de pantalla,
    // así al volver a subir/bajar la animación se reproduce de nuevo.
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  // Replay visible reveal elements when LandingShell closes the login, so the
  // current section can animate back in instead of only the hero.
  useEffect(() => {
    function replay() {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const els = document.querySelectorAll<HTMLElement>(
        ".lab-landing .reveal, .lab-landing .reveal-cascade",
      );
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        const inView = r.top < window.innerHeight && r.bottom > 0;
        if (!inView) return;
        // Hide instantly without a transition, then animate in again.
        el.classList.add("rv-reset");
        el.classList.remove("is-visible");
        void el.offsetWidth; // force reflow so the hidden state applies now
        el.classList.remove("rv-reset");
        window.requestAnimationFrame(() => el.classList.add("is-visible"));
      });
    }
    window.addEventListener("landing:replay", replay);
    return () => window.removeEventListener("landing:replay", replay);
  }, []);

  return null;
}
