import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Textarea = forwardRef(
  ({ className, label, error, helperText, id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-sand-800">
            {label}
            {props.required && <span className="text-terracotta-600 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative rounded-xl shadow-warm-sm">
          <textarea
            id={textareaId}
            ref={ref}
            rows={rows}
            className={twMerge(
              clsx(
                'block w-full rounded-xl bg-white border border-sand-300 text-sand-900 placeholder:text-sand-400 text-sm transition-colors duration-150 p-3.5',
                'focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/30 focus:outline-none resize-y',
                error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20 text-red-900',
                className
              )
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs font-medium text-red-600 mt-1">{error}</p>}
        {!error && helperText && <p className="text-xs text-sand-500 mt-1">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
