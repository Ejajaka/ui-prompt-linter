import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Prompt Linter mark: a dark-green rounded tile with the bold yellow "PL"
 * monogram. Mirrors `public/logo.svg`, the extension icons and the Android
 * `PlLogo` composable.
 */
export const Logo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    className={className}
    role="img"
    aria-label="Prompt Linter"
  >
    <rect width="48" height="48" rx="10.1" fill="#185345" />
    <g fill="#FAD237">
      <rect x="9.23" y="13.86" width="5.21" height="20.28" rx="2.6" />
      <circle cx="17.84" cy="20.56" r="6.7" />
      <rect x="25.68" y="13.86" width="5.55" height="20.25" rx="2.78" />
      <rect x="25.68" y="28.44" width="13.64" height="5.67" rx="2.84" />
    </g>
    <rect x="14.43" y="18.26" width="4.78" height="4.48" rx="1.61" fill="#185345" />
  </svg>
);
