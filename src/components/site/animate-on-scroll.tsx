"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  animation?: string;
  children: ReactNode;
  className?: string;
};

export function AnimateOnScroll({ animation, children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animation || animation === "none" || !ref.current) return;
    const el = ref.current;
    // Reduced motion: the globals.css media query only shortens CSS transitions;
    // it cannot stop the IntersectionObserver deferring the reveal (the section
    // stays opacity:0 until it scrolls into view). Reveal immediately instead.
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("site-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add("site-visible");
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animation]);

  if (!animation || animation === "none") {
    return <>{children}</>;
  }

  return (
    <div ref={ref} className={`site-animate site-animate-${animation} ${className}`}>
      {children}
    </div>
  );
}
