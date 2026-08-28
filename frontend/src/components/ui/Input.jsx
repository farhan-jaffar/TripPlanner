import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Input = forwardRef(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-sand-800">
            {label}
            {props.required && <span className="text-terracotta-600 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative rounded-xl shadow-warm-sm">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sand-500">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'block w-full rounded-xl bg-white border border-sand-300 text-sand-900 placeholder:text-sand-400 text-sm transition-colors duration-150',
                'focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/30 focus:outline-none',
                leftIcon ? 'pl-10' : 'pl-3.5',
                rightIcon ? 'pr-10' : 'pr-3.5',
                'py-2.5',
                error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20 text-red-900',
                className
              )
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-sand-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs font-medium text-red-600 mt-1">{error}</p>}
        {!error && helperText && <p className="text-xs text-sand-500 mt-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
