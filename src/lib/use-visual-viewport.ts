import { useEffect } from "react";

/**
 * Keeps CSS vars in sync with the visual viewport so overlays stay above the
 * on-screen keyboard on mobile: --vv-h (height) and --vv-top (offset).
 */
export function useVisualViewportVars(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const vv = window.visualViewport;
    const root = document.documentElement;

    const update = () => {
      const height = vv?.height ?? window.innerHeight;
      const top = vv?.offsetTop ?? 0;
      root.style.setProperty("--vv-h", `${height}px`);
      root.style.setProperty("--vv-top", `${top}px`);
    };

    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [active]);
}
