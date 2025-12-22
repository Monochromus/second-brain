import { cn, getPriorityColor, getPriorityLabel, getPriorityBgColor } from '../../lib/utils';
import { Flag } from 'lucide-react';

export default function PriorityBadge({ priority, showLabel = false, size = 'sm' }) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium',
        getPriorityBgColor(priority),
        getPriorityColor(priority),
        sizeClasses[size]
      )}
      title={getPriorityLabel(priority)}
    >
      <Flag className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {showLabel && <span>{getPriorityLabel(priority)}</span>}
    </span>
  );
}
