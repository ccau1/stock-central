import { useState, useCallback, useRef } from "react";

interface Size {
  width: number;
  height: number;
}

export function useSvgContainerSize<T extends HTMLElement = HTMLDivElement>(
  defaultWidth = 800,
  defaultHeight = 320
): { ref: (el: T | null) => void; size: Size } {
  const [size, setSize] = useState<Size>({
    width: defaultWidth,
    height: defaultHeight,
  });
  const prevElRef = useRef<T | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const ref = useCallback((el: T | null) => {
    if (el === prevElRef.current) return;

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    prevElRef.current = el;

    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({
        width: Math.max(Math.round(rect.width), 100),
        height: Math.max(Math.round(rect.height), 100),
      });
    };

    update();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setSize({
          width: Math.max(Math.round(cr.width), 100),
          height: Math.max(Math.round(cr.height), 100),
        });
      }
    });
    ro.observe(el);

    window.addEventListener("resize", update);

    cleanupRef.current = () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return { ref, size };
}
