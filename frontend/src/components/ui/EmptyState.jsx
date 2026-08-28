import React from 'react';
import { Compass } from 'lucide-react';
import { Button } from './Button';

export const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-sand-100/60 border border-dashed border-sand-300 rounded-3xl">
      <div className="w-16 h-16 rounded-2xl bg-terracotta-100/70 border border-terracotta-200 flex items-center justify-center text-terracotta-600 mb-4 shadow-warm-sm">
        {icon || <Compass className="w-8 h-8" />}
      </div>
      <h3 className="text-lg sm:text-xl font-bold font-serif text-sand-900 mb-2">{title}</h3>
      <p className="text-sm text-sand-600 max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} leftIcon={actionIcon}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
