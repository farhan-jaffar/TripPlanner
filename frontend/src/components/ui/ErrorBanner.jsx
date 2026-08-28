import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const ErrorBanner = ({
  title = 'Something went wrong',
  message,
  onRetry,
}) => {
  return (
    <div className="rounded-2xl bg-terracotta-50 border border-terracotta-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-terracotta-100 text-terracotta-700 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-terracotta-900">{title}</h4>
          <p className="text-sm text-terracotta-800/90 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="shrink-0 self-start sm:self-center border-terracotta-300 text-terracotta-800 hover:bg-terracotta-100"
        >
          Try again
        </Button>
      )}
    </div>
  );
};
