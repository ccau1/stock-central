interface IconProps {
  size?: number;
  className?: string;
}

function IconWrapper({ size = 18, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function LineIcon({ size = 18, className }: IconProps) {
  return (
    <IconWrapper size={size} className={className}>
      <circle cx="6" cy="18" r="2" fill="currentColor" />
      <circle cx="18" cy="6" r="2" fill="currentColor" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </IconWrapper>
  );
}

export function HorizontalLineIcon({ size = 18, className }: IconProps) {
  return (
    <IconWrapper size={size} className={className}>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </IconWrapper>
  );
}

export function PolylineIcon({ size = 18, className }: IconProps) {
  return (
    <IconWrapper size={size} className={className}>
      <circle cx="4" cy="20" r="2" fill="currentColor" />
      <circle cx="20" cy="20" r="2" fill="currentColor" />
      <circle cx="4" cy="4" r="2" fill="currentColor" />
      <polyline points="4 20 20 20 4 4" />
    </IconWrapper>
  );
}
