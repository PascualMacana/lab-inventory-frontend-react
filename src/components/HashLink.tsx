import { ComponentPropsWithoutRef, MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Drop-in replacement for <Link to="/#anchor"> that also works when the
// user is *already* on the target route. react-router treats a click to
// the current URL as a no-op (no navigation fires → ScrollToHash doesn't
// trigger), so we intercept and call scrollIntoView ourselves.
type HashLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & { to: string };

export function HashLink({ to, onClick, children, ...rest }: HashLinkProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [pathPart, hashPart = ""] = to.split("#");
  const targetPath = pathPart || "/";
  const targetHash = hashPart;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();

    if (location.pathname === targetPath && targetHash) {
      const el = document.getElementById(targetHash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", to);
      return;
    }
    navigate(to);
  }

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
