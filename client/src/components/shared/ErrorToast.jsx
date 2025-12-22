import { AlertCircle, X } from 'lucide-react';

export default function ErrorToast({ message, onDismiss }) {
  return (
    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
      <p className="flex-1 text-sm text-red-800 dark:text-red-200">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
