import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Skeleton = ({
  className,
  variant = 'rectangular',
  ...props
}) => {
  const variants = {
    text: 'h-4 w-full rounded',
    rectangular: 'rounded-xl',
    circular: 'rounded-full',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'animate-pulse bg-sand-200/80',
          variants[variant],
          className
        )
      )}
      {...props}
    />
  );
};
