import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router doesn't scroll on navigation. Mount this once inside the
// router so:
//   - clicking a Link with a hash (e.g. /#dashboard) scrolls smoothly
//     to that element after the route renders;
//   - navigating to a route without a hash resets scroll to the top.
export function ScrollToHash() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      // Give the new route a frame to render before measuring.
      const t = window.setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 30);
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0 });
  }, [hash, pathname]);

  return null;
}
