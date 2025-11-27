/**
 * Logo Component
 * Displays PacketFlow logo using custom SVG files
 * Supports responsive sizing and theme variants
 */

interface LogoProps {
  /** Size variant: 'sm' (32px), 'md' (48px), 'lg' (64px) */
  size?: 'sm' | 'md' | 'lg';
  /** Logo variant: 'long' (with text), 'short' (icon only) */
  variant?: 'long' | 'short';
  /** Theme variant: 'dark' or 'light' */
  theme?: 'dark' | 'light';
  /** CSS class for additional styling */
  className?: string;
}

export function Logo({
  size = 'md',
  variant = 'long',
  theme = 'dark',
  className = '',
}: LogoProps) {
  const sizeConfig = {
    sm: { height: 'h-8' },
    md: { height: 'h-12' },
    lg: { height: 'h-16' },
  };

  const config = sizeConfig[size];

  // Map variant names to SVG filenames
  const variantMap = {
    long: 'packetflow-long',
    short: 'packetflow-short-ruf', // Using ruf variant for short
  };

  const svgFile = `/images/logo/${theme}/${variantMap[variant]}-${theme}.svg`;

  return (
    <img
      src={svgFile}
      alt="PacketFlow Logo"
      className={`${config.height} w-auto object-contain transition-all ${className}`}
    />
  );
}

/**
 * Logo Variants:
 * - long: "PacketFlow Security" text with icon (best for headers, branding)
 * - short: Icon only, compact (best for sidebars, favicons)
 *
 * Sizes:
 * - sm: 32px (compact sidebars, compact contexts)
 * - md: 48px (headers, navigation - default)
 * - lg: 64px (landing pages, hero sections)
 *
 * Themes:
 * - dark: Light blue icon on dark background (matches app theme)
 * - light: Dark blue icon on light background
 *
 * Usage Examples:
 *
 * // Full branding in header
 * <Logo variant="long" size="md" theme="dark" />
 *
 * // Light version for light background
 * <Logo variant="long" size="md" theme="light" />
 *
 * // Compact icon only
 * <Logo variant="short" size="sm" theme="dark" />
 *
 * // Large logo for landing page
 * <Logo variant="long" size="lg" theme="light" className="mx-auto mb-4" />
 */
