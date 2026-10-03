"use client";

/* eslint-disable @next/next/no-img-element -- remote CDN icons; next/image optimisation adds nothing here */
interface IconProps {
  src: string;
  label: string;
  size?: number;
  rounded?: "md" | "full";
}

/** Community Dragon icon with a lettered fallback if the asset is missing. */
export function Icon({ src, label, size = 32, rounded = "md" }: IconProps) {
  const radius = rounded === "full" ? "rounded-full" : "rounded-md";
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-line bg-panel-2 text-[10px] font-semibold text-muted ${radius}`}
      style={{ width: size, height: size }}
      title={label}
    >
      {label.slice(0, 2)}
      {src && (
        <img
          src={src}
          alt={label}
          width={size}
          height={size}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      )}
    </span>
  );
}
