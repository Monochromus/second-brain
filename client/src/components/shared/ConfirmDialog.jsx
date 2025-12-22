import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Bestätigung',
  message = 'Bist du sicher?',
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  variant = 'danger'
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const buttonVariants = {
    danger: 'btn-danger',
    warning: 'bg-warning text-white hover:bg-yellow-600',
    primary: 'btn-primary'
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showClose={false}>
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-error" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
        <p className="text-text-secondary mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="btn btn-secondary">
            {cancelText}
          </button>
          <button onClick={handleConfirm} className={`btn ${buttonVariants[variant]}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
