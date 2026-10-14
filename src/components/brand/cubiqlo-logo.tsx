import React from "react";

export function CubiqloLogoHeader({ className = "h-8 w-auto" }: { className?: string }) {
  return <img src="/logo-header-transparent.png" alt="cubiqlo.com" className={className} />;
}

export function CubiqloLogoIcon({ className = "h-8.5 w-8.5" }: { className?: string }) {
  return <img src="/logo-icon.png" alt="Cubiqlo" className={className} />;
}
