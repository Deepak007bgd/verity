import React from 'react';

export function Badge({ variant = 'teal', children, className = '', style }) {
  const variantClass =
    variant === 'teal'
      ? 'badge-teal'
      : variant === 'amber'
      ? 'badge-amber'
      : variant === 'coral'
      ? 'badge-coral'
      : 'badge-gray';

  return (
    <span className={`badge ${variantClass} ${className}`.trim()} style={style}>
      {children}
    </span>
  );
}
