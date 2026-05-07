import { useEffect, useRef, useState, ReactNode } from "react";

interface Props {
  children: ReactNode;
  rootMargin?: string;
  minHeight?: number | string;
  once?: boolean;
}

/**
 * Defers mounting (and therefore hydration / data fetching) of children
 * until they are about to enter the viewport. Reserves space via min-height
 * to keep CLS at zero.
 */
export default function LazyVisible({
  children,
  rootMargin = "200px",
  minHeight = 200,
  once = true,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            if (once) io.disconnect();
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, once, visible]);

  return (
    <div ref={ref} style={{ minHeight: visible ? undefined : minHeight }}>
      {visible ? children : null}
    </div>
  );
}