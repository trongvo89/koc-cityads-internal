interface Props {
  size?: number;
  subtitle?: string;
  /** "light" = use on white/gray backgrounds; "dark" = use on navy/blue backgrounds */
  variant?: "light" | "dark";
}

export default function CityAdsLogo({ size = 28, subtitle, variant = "dark" }: Props) {
  const textColor  = variant === "dark" ? "#ffffff" : "#0f172a";
  const subColor   = variant === "dark" ? "#64748b" : "#64748b";
  const id = `ca-grad-${size}-${variant}`;

  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id={id} x1="14" y1="28" x2="14" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#0369a1" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        {/* Three ascending bars — matches CityAds logo style */}
        <rect x="1"  y="17" width="6" height="9"  rx="1.5" fill={`url(#${id})`} opacity="0.55" />
        <rect x="11" y="10" width="6" height="16" rx="1.5" fill={`url(#${id})`} opacity="0.78" />
        <rect x="21" y="3"  width="6" height="23" rx="1.5" fill={`url(#${id})`} />
      </svg>

      <div className="leading-none">
        <p className="text-sm font-bold tracking-tight" style={{ color: textColor }}>
          city<span className="brand-text">ads</span>
        </p>
        {subtitle && (
          <p className="text-[9px] mt-0.5 uppercase tracking-widest" style={{ color: subColor }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
