interface Props {
  size?: number;
  showText?: boolean;
  subtitle?: string;
}

export default function CityAdsLogo({ size = 28, showText = true, subtitle }: Props) {
  const id = `grad-${size}`;
  return (
    <div className="flex items-center gap-2.5">
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
            <stop offset="0%" stopColor="#7928ca" />
            <stop offset="100%" stopColor="#ff0050" />
          </linearGradient>
        </defs>
        {/* Three ascending bars */}
        <rect x="1"  y="17" width="6" height="9"  rx="1.5" fill={`url(#${id})`} opacity="0.55" />
        <rect x="11" y="10" width="6" height="16" rx="1.5" fill={`url(#${id})`} opacity="0.78" />
        <rect x="21" y="3"  width="6" height="23" rx="1.5" fill={`url(#${id})`} />
      </svg>

      {showText && (
        <div className="leading-none">
          <p className="text-sm font-bold text-white tracking-tight">
            city<span className="gradient-text">ads</span>
          </p>
          {subtitle && (
            <p className="text-[9px] text-zinc-500 mt-0.5 uppercase tracking-widest">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
