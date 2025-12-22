import { CheckCircle, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AgentStatus({ status = 'idle', message }) {
  const statusConfig = {
    idle: {
      icon: Sparkles,
      text: 'Bereit',
      className: 'text-text-secondary'
    },
    processing: {
      icon: Loader2,
      text: 'Verarbeite...',
      className: 'text-accent',
      animate: true
    },
    success: {
      icon: CheckCircle,
      text: 'Erledigt',
      className: 'text-success'
    },
    error: {
      icon: AlertCircle,
      text: 'Fehler',
      className: 'text-error'
    }
  };

  const config = statusConfig[status] || statusConfig.idle;
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2 text-sm', config.className)}>
      <Icon className={cn('w-4 h-4', config.animate && 'animate-spin')} />
      <span>{message || config.text}</span>
    </div>
  );
}
