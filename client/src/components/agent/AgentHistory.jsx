import { Clock, ChevronRight, Trash2 } from 'lucide-react';
import { formatTimeAgo } from '../../lib/utils';

export default function AgentHistory({ history, onClear }) {
  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Clock className="w-4 h-4" />
          <span>Letzte Aktionen</span>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="text-xs text-text-secondary hover:text-error transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="divide-y divide-border">
        {history.slice(0, 5).map((item) => (
          <div key={item.id} className="px-4 py-3">
            <div className="flex items-start gap-2">
              <ChevronRight className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{item.message}</p>
                <p className="text-xs text-text-secondary mt-1">{item.response}</p>
                <p className="text-xs text-text-secondary opacity-60 mt-1">
                  {formatTimeAgo(item.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
