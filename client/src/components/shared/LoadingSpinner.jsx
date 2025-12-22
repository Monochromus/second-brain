import { cn } from '../../lib/utils';

export default function LoadingSpinner({ size = 'md', className }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-surface-secondary border-t-accent',
        sizeClasses[size],
        className
      )}
    />
  );
}
