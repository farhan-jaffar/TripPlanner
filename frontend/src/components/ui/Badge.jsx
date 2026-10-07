import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Badge = ({
  className,
  variant = 'terracotta',
  size = 'md',
  children,
  ...props
}) => {
  const variants = {
    terracotta: 'bg-terracotta-100 text-terracotta-800 border-terracotta-200/80',
    sand: 'bg-sand-100 text-sand-800 border-sand-200',
    sage: 'bg-sage-100 text-sage-700 border-sage-200/80',
    outline: 'bg-white text-sand-700 border-sand-300',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full border transition-colors',
          variants[variant],
          sizes[size],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
};
