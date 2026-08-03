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
