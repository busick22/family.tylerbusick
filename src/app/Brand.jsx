// The Family mark: a simple friendly house.

import { useId } from 'react'

export function BrandMark({ size = 28 }) {
  const gradientId = `brand-${useId().replaceAll(':', '')}`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flex: 'none' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-kids)" />
        </linearGradient>
      </defs>
      <path
        d="M8 30 L32 10 L56 30 V52 A4 4 0 0 1 52 56 H12 A4 4 0 0 1 8 52 Z"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="5.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <rect x="26" y="36" width="12" height="20" rx="2" fill={`url(#${gradientId})`} />
    </svg>
  )
}

export function BrandWordmark() {
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '1.1rem',
        letterSpacing: '0.01em',
      }}
    >
      Family
    </span>
  )
}
