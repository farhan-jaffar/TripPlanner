import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Button = forwardRef(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

    const variants = {
      primary:
        'bg-terracotta-600 text-white hover:bg-terracotta-700 active:bg-terracotta-800 shadow-warm-sm hover:shadow-warm-md border border-transparent',
      secondary:
        'bg-sand-100 text-sand-900 hover:bg-sand-200 active:bg-sand-300 border border-sand-200/80',
      outline:
        'bg-white text-sand-800 hover:bg-sand-50 active:bg-sand-100 border border-sand-300 shadow-warm-sm',
      danger:
        'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-warm-sm border border-transparent',
      ghost:
        'text-sand-700 hover:bg-sand-100 active:bg-sand-200 hover:text-sand-900 border border-transparent',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2.5 gap-2',
      lg: 'text-base px-5 py-3 gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
