import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Globe } from 'lucide-react';

export const ISO_COUNTRIES = [
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
];

export const CountrySelect = forwardRef(
  (
    {
      className,
      label = 'Destination Country',
      placeholder = 'Type country name or code (e.g. France, Japan, Italy)...',
      error,
      helperText,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : 'country-input');
    const datalistId = `${inputId}-list`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-sand-800">
            {label}
            {props.required && <span className="text-terracotta-600 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative rounded-xl shadow-warm-sm">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sand-400">
            <Globe className="w-4 h-4" />
          </div>
          <input
            id={inputId}
            ref={ref}
            type="text"
            list={datalistId}
            autoComplete="off"
            placeholder={placeholder}
            className={twMerge(
              clsx(
                'block w-full rounded-xl bg-white border border-sand-300 text-sand-900 text-sm transition-colors duration-150 pl-10 pr-4 py-2.5',
                'focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/30 focus:outline-none',
                error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20 text-red-900',
                className
              )
            )}
            {...props}
          />
          <datalist id={datalistId}>
            {ISO_COUNTRIES.map((c) => (
              <option key={c.code} value={c.name}>
                {c.flag} {c.code}
              </option>
            ))}
          </datalist>
        </div>
        {error && <p className="text-xs font-medium text-red-600 mt-1">{error}</p>}
        {!error && helperText && <p className="text-xs text-sand-500 mt-1">{helperText}</p>}
      </div>
    );
  }
);

CountrySelect.displayName = 'CountrySelect';
