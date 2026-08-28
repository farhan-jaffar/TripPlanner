import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(
  ({ className, label, error, helperText, options, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-sand-800">
            {label}
            {props.required && <span className="text-terracotta-600 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative rounded-xl shadow-warm-sm">
          <select
            id={selectId}
            ref={ref}
            className={twMerge(
              clsx(
                'block w-full appearance-none rounded-xl bg-white border border-sand-300 text-sand-900 text-sm transition-colors duration-150 pl-3.5 pr-10 py-2.5',
                'focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/30 focus:outline-none cursor-pointer',
                error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20 text-red-900',
                className
              )
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-sand-500">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-xs font-medium text-red-600 mt-1">{error}</p>}
        {!error && helperText && <p className="text-xs text-sand-500 mt-1">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
