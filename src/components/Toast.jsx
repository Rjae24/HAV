import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={18} className="text-hav-secondary" />,
  error: <XCircle size={18} className="text-hav-danger" />,
  warning: <AlertCircle size={18} className="text-yellow-500" />,
};

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slideIn">
      <div className="flex items-center gap-3 bg-white border border-gray-100 shadow-xl rounded-xl px-4 py-3 min-w-[280px] max-w-sm">
        {ICONS[toast.type] || ICONS.success}
        <div className="flex-1">
          <p className="text-sm font-semibold text-hav-text-main">{toast.title}</p>
          {toast.message && (
            <p className="text-xs text-hav-text-muted mt-0.5">{toast.message}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-hav-text-muted hover:text-hav-text-main transition-colors ml-2"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
