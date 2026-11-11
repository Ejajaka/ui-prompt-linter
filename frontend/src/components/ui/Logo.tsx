import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Prompt Linter mark: a chat bubble (the prompt) with a checkmark
 * (validated). Rendered white-on-teal with a mustard check, matching the
 * Vector brand tile style.
 */
export const Logo: React.FC<LogoProps> = ({ size = 20, className = '' }) => (
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
    aria-hidden="true"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="m9 11 2 2 4-4" stroke="#D1B653" strokeWidth="2.4" />
  </svg>
);
