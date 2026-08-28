import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

const ToastContext = createContext(undefined);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'success') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
            error: <AlertCircle className="w-5 h-5 text-terracotta-600" />,
            info: <Info className="w-5 h-5 text-sand-700" />,
          };

          const backgrounds = {
            success: 'bg-white border-emerald-200 text-sand-900',
            error: 'bg-white border-terracotta-300 text-sand-900',
            info: 'bg-white border-sand-300 text-sand-900',
          };

          return (
            <div
              key={toast.id}
              className={clsx(
                'pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-warm-lg transition-all animate-in slide-in-from-bottom-3 duration-200',
                backgrounds[toast.type]
              )}
            >
              <div className="flex items-center gap-2.5">
                {icons[toast.type]}
                <p className="text-sm font-medium">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-sand-400 hover:text-sand-700 p-1 rounded-md transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
