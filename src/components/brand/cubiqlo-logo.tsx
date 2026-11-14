import React from "react";

export function KoobikelLogoHeader({ className = "h-8 w-auto" }: { className?: string }) {
  return <img src="/logo-header-transparent.png" alt="koobikel.com" className={className} />;
}

export function KoobikelLogoIcon({ className = "h-8.5 w-8.5" }: { className?: string }) {
  return <img src="/logo-icon.png" alt="Koobikel" className={className} />;
}
