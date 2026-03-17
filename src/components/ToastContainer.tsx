import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToast, type ToastType } from '../context/ToastContext';

function getToastStyles(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        icon: <CheckCircle className="w-5 h-5 flex-shrink-0" />,
        className: 'bg-emerald-500 text-white',
      };
    case 'error':
      return {
        icon: <AlertCircle className="w-5 h-5 flex-shrink-0" />,
        className: 'bg-rose-500 text-white',
      };
    case 'info':
    default:
      return {
        icon: <Info className="w-5 h-5 flex-shrink-0" />,
        className: 'bg-indigo-600 text-white',
      };
  }
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] pointer-events-none">
      <div className="max-w-[640px] mx-auto flex flex-col">
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);

          return (
            <div
              key={toast.id}
              className={`
                ${styles.className}
                w-full px-4 py-3.5
                flex items-center gap-3
                pointer-events-auto
                toast-enter
                shadow-lg
              `}
            >
              {styles.icon}
              <p className="flex-1 font-medium text-sm leading-snug">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="opacity-80 hover:opacity-100 transition-opacity flex-shrink-0 p-0.5"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
