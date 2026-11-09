import { useState } from "react";

export function BrandLogo({ className }: { className: string }) {
  const [unavailable, setUnavailable] = useState(false);

  if (unavailable) {
    return (
      <span
        role="img"
        aria-label="Balbaa Pharmacies Logo"
        className={`grid h-14 w-14 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground ${className}`}
      >
        <span className="text-[11px] font-extrabold">بلبع</span>
      </span>
    );
  }

  return (
    <img
      src="/favicon.png"
      alt="Balbaa Pharmacies Logo"
      className={className}
      onError={() => setUnavailable(true)}
    />
  );
}
