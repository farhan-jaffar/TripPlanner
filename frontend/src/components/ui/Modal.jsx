import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Warm earthy backdrop */}
      <div
        className="fixed inset-0 bg-sand-950/40 backdrop-blur-[2px] transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        className={twMerge(
          clsx(
            'relative w-full bg-white rounded-2xl border border-sand-200 shadow-warm-lg p-6 overflow-hidden z-10 animate-in zoom-in-95 duration-150',
            maxWidths[maxWidth]
          )
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-lg font-bold text-sand-900 font-serif">{title}</h3>}
            {description && <p className="text-sm text-sand-600 mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-sand-400 hover:text-sand-700 hover:bg-sand-100 p-1.5 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
