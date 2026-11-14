import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Vector mark: a dark-green rounded tile with the bold yellow "V" monogram.
 * Mirrors `public/logo.svg`, the extension icons and the Android
 * `VectorLogo` composable.
 */
export const Logo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    className={className}
    role="img"
    aria-label="Vector"
  >
    <rect width="48" height="48" rx="10.1" fill="#2D5D4F" />
    <path
      d="M13.1 11.4 L24 36.2 L34.9 11.4"
      fill="none"
      stroke="#FAD237"
      strokeWidth="7.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
