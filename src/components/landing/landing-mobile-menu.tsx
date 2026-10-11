"use client";

import { useRef } from "react";
import { Menu } from "lucide-react";

export function LandingMobileMenu({
  links,
  signupHref,
  menuLabel,
  signupLabel,
}: {
  links: Array<[string, string]>;
  signupHref: string;
  menuLabel: string;
  signupLabel: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const close = () => detailsRef.current?.removeAttribute("open");

  return (
    <details ref={detailsRef} className="relative md:hidden">
      <summary aria-label={menuLabel} className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <Menu className="h-4 w-4" />
      </summary>
      <nav className="absolute right-0 top-11 z-50 w-52 rounded-2xl bg-white p-2 text-sm shadow-2xl ring-1 ring-slate-950/10">
        {links.map(([label, href]) => (
          <a key={href} href={href} onClick={close} className="flex min-h-11 items-center rounded-xl px-3 py-2.5 font-medium hover:bg-blue-50">
            {label}
          </a>
        ))}
        <div className="my-1 border-t border-slate-100" />
        <a href={signupHref} className="flex min-h-11 items-center rounded-xl px-3 py-2.5 font-semibold text-[#2563EB] hover:bg-blue-50">
          {signupLabel}
        </a>
      </nav>
    </details>
  );
}
