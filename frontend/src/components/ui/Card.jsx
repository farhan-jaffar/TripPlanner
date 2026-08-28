import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card = ({
  className,
  hoverable = false,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-white border-sand-200 shadow-warm-sm',
    subtle: 'bg-sand-100/70 border-sand-200/60 shadow-none',
    outline: 'bg-transparent border-sand-300 shadow-none',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl border transition-all duration-200',
          variants[variant],
          hoverable && 'hover:border-sand-300 hover:shadow-warm-md hover:-translate-y-0.5 cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
