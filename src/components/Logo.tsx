interface LogoProps {
  size?: number;
  className?: string;
  variant?: 'main' | 'compact';
}

export function Logo({ size = 48, className = '', variant = 'compact' }: LogoProps) {
  const src = variant === 'main' ? 'logos/logo.png' : 'logos/logo_with_text.png';
  const alt = variant === 'main' ? 'SmileFit main logo' : 'SmileFit icon';

  return (
    <img
      src={src}
      alt={alt}
      className={`inline-block ${className}`}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
