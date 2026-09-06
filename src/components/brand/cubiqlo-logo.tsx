import React from "react";

export function CubiqloLogoHeader({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cubiqlo"
    >
      {/* Brand Squircle Icon */}
      <rect x="4" y="4" width="32" height="32" rx="9" fill="#6647F0" />

      {/* 3 Diagonal Stacked Rounded Blocks */}
      <rect x="10" y="21" width="9" height="9" rx="2.5" fill="#FFFFFF" fillOpacity="0.95" />
      <rect x="15.5" y="15.5" width="9" height="9" rx="2.5" fill="#FFFFFF" fillOpacity="0.95" />
      <rect x="21" y="10" width="9" height="9" rx="2.5" fill="#FFFFFF" fillOpacity="0.95" />

      {/* Crisp Modern Logotype "cubiqlo" */}
      <text
        x="44"
        y="26.5"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, Helvetica, Arial, sans-serif"
        fontSize="21"
        fontWeight="800"
        fill="#292D34"
        letterSpacing="-0.04em"
      >
        cubiqlo
      </text>

      {/* Subtle Dot Accent */}
      <circle cx="123.5" cy="24" r="2.5" fill="#6647F0" />
    </svg>
  );
}

export function CubiqloLogoIcon({ className = "h-8.5 w-8.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cubiqlo Icon"
    >
      {/* Brand Squircle Icon */}
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#6647F0" />

      {/* 3 Diagonal Stacked Rounded Blocks */}
      <rect x="9" y="21" width="10" height="10" rx="3" fill="#FFFFFF" fillOpacity="0.95" />
      <rect x="15" y="15" width="10" height="10" rx="3" fill="#FFFFFF" fillOpacity="0.95" />
      <rect x="21" y="9" width="10" height="10" rx="3" fill="#FFFFFF" fillOpacity="0.95" />
    </svg>
  );
}
