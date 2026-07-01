import { useLayoutEffect, useState } from "react";

let cachedIsMobile: boolean | undefined;
const listeners = new Set<(isMobile: boolean) => void>();
let resizeHandler: (() => void) | null = null;

function getIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

function ensureResizeListener() {
  if (typeof window === "undefined") return;
  if (resizeHandler) return;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  resizeHandler = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const newValue = getIsMobile();
      if (newValue !== cachedIsMobile) {
        cachedIsMobile = newValue;
        listeners.forEach((listener) => listener(newValue));
      }
    }, 150); // 150ms debounce
  };
  window.addEventListener("resize", resizeHandler);
}

const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(() => {
    if (cachedIsMobile !== undefined) return cachedIsMobile;
    cachedIsMobile = getIsMobile();
    return cachedIsMobile;
  });

  useLayoutEffect(() => {
    const current = getIsMobile();
    if (isMobile !== current) {
      cachedIsMobile = current;
      setIsMobile(current);
    }

    ensureResizeListener();
    listeners.add(setIsMobile);

    return () => {
      listeners.delete(setIsMobile);
    };
  }, [isMobile]);

  return isMobile;
};

export default useIsMobile;
