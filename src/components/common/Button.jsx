import React from 'react';

export function Button({
  variant = 'teal',
  size = 'default',
  disabled = false,
  onClick,
  children,
  className = '',
  style,
  type = 'button',
}) {
  const variantClass =
    variant === 'teal'
      ? 'btn-teal'
      : variant === 'indigo'
      ? 'btn-indigo'
      : variant === 'outline'
      ? 'btn-outline'
      : '';

  const sizeClass = size === 'sm' ? 'btn-sm' : '';

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
      style={style}
    >
      {children}
    </button>
  );
}
