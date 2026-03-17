/**
 * Toast Container Component
 *
 * Displays all active toast notifications in the bottom-right corner
 * Automatically animates in and out
 */

import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToast, type ToastType } from '../context/ToastContext';

/**
 * Get icon and colors based on toast type
 */
function getToastStyles(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        icon: <CheckCircle className="w-5 h-5" />,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        iconColor: 'text-green-600',
      };
    case 'error':
      return {
        icon: <AlertCircle className="w-5 h-5" />,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-600',
      };
    case 'info':
    default:
      return {
        icon: <Info className="w-5 h-5" />,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-600',
      };
  }
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none">
      {toasts.map((toast) => {
        const styles = getToastStyles(toast.type);

        return (
          <div
            key={toast.id}
            className={`
              ${styles.bgColor} ${styles.borderColor}
              border rounded-lg shadow-lg p-4
              flex items-center gap-3
              animate-in slide-in-from-right-full fade-in duration-300
              pointer-events-auto
              max-w-sm
            `}
          >
            <div className={styles.iconColor}>{styles.icon}</div>

            <p className={`${styles.textColor} flex-1 font-medium text-sm`}>
              {toast.message}
            </p>

            <button
              onClick={() => dismissToast(toast.id)}
              className={`${styles.textColor} hover:opacity-70 transition-opacity flex-shrink-0 p-1`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
