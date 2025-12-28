import { useState } from 'react';
import {
  Play, MoreVertical, Pencil, Trash2, RefreshCw,
  Clock, AlertCircle, CheckCircle, Loader2
} from 'lucide-react';
import { formatTimeAgo } from '../../lib/utils';

const STATUS_CONFIG = {
  draft: {
    icon: Clock,
    color: 'text-text-secondary',
    bgColor: 'bg-surface-secondary',
    label: 'Entwurf'
  },
  generating: {
    icon: Loader2,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    label: 'Wird generiert...',
    animate: true
  },
  ready: {
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
    label: 'Bereit'
  },
  error: {
    icon: AlertCircle,
    color: 'text-error',
    bgColor: 'bg-error/10',
    label: 'Fehler'
  }
};

export default function ToolCard({
  tool,
  onExecute,
  onEdit,
  onDelete,
  onRegenerate
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const status = STATUS_CONFIG[tool.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;

  const handleExecute = async () => {
    if (tool.status !== 'ready' || isExecuting) return;

    setIsExecuting(true);
    try {
      await onExecute(tool.id);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRegenerate = async () => {
    setMenuOpen(false);
    await onRegenerate(tool.id, tool.description);
  };

  return (
    <div className="card p-4 hover:shadow-md transition-shadow group relative">
      {/* Status Badge */}
      <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${status.bgColor} ${status.color}`}>
        <StatusIcon className={`w-3 h-3 ${status.animate ? 'animate-spin' : ''}`} />
        {status.label}
      </div>

      {/* Tool Info */}
      <div className="pr-24">
        <h3 className="font-semibold text-text-primary truncate">
          {tool.name}
        </h3>
        <p className="text-sm text-text-secondary line-clamp-2 mt-1">
          {tool.description}
        </p>
      </div>

      {/* Error Message */}
      {tool.status === 'error' && tool.error_message && (
        <div className="mt-3 p-2 rounded-lg bg-error/10 text-error text-sm">
          {tool.error_message}
        </div>
      )}

      {/* Preview */}
      {tool.status === 'ready' && tool.last_result && (
        <div className="mt-3 p-3 rounded-lg bg-surface-secondary overflow-hidden max-h-32">
          {tool.last_result.type === 'html' && (
            <div
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: tool.last_result.content }}
            />
          )}
          {tool.last_result.type === 'svg' && (
            <div
              className="flex justify-center"
              dangerouslySetInnerHTML={{ __html: tool.last_result.content }}
            />
          )}
          {tool.last_result.type === 'json' && (
            <pre className="text-xs overflow-auto">
              {JSON.stringify(JSON.parse(tool.last_result.content), null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          {tool.status === 'ready' && (
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="btn btn-primary btn-sm"
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Ausführen
            </button>
          )}

          {tool.status === 'error' && (
            <button
              onClick={handleRegenerate}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Neu generieren
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">
            {formatTimeAgo(tool.updated_at || tool.created_at)}
          </span>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-secondary opacity-0 group-hover:opacity-100 transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-border rounded-lg shadow-lg py-1 z-20">
                  <button
                    onClick={() => {
                      onEdit(tool);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
                  >
                    <Pencil className="w-4 h-4" />
                    Bearbeiten
                  </button>
                  <button
                    onClick={handleRegenerate}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Neu generieren
                  </button>
                  <button
                    onClick={() => {
                      onDelete(tool.id);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-surface-secondary"
                  >
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
