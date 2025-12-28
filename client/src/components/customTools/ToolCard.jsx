import { useState, useRef, useEffect } from 'react';
import {
  MoreVertical, Pencil, Trash2, RefreshCw,
  Clock, AlertCircle, CheckCircle, Loader2, Maximize2
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
  const iframeRef = useRef(null);

  const status = STATUS_CONFIG[tool.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;

  const handleCardClick = (e) => {
    // Don't trigger if clicking on menu button or menu
    if (e.target.closest('[data-menu]')) return;
    if (tool.status === 'ready') {
      onExecute(tool.id);
    }
  };

  const handleRegenerate = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    await onRegenerate(tool.id, tool.description);
  };

  // Render preview content
  const renderPreview = () => {
    if (!tool.last_result || tool.status !== 'ready') {
      return null;
    }

    const result = tool.last_result;

    if (result.type === 'html') {
      // Create a miniature preview using iframe
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100%;
              padding: 8px;
              transform: scale(0.5);
              transform-origin: center center;
            }
          </style>
        </head>
        <body>${result.content}</body>
        </html>
      `;

      return (
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          className="w-full h-full border-0 pointer-events-none"
          sandbox=""
          title={tool.name}
        />
      );
    }

    if (result.type === 'svg') {
      return (
        <div
          className="w-full h-full flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: result.content }}
        />
      );
    }

    return null;
  };

  return (
    <div
      onClick={handleCardClick}
      className={`card overflow-hidden group relative cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
        tool.status !== 'ready' ? 'cursor-default hover:scale-100' : ''
      }`}
    >
      {/* Preview Area */}
      <div className="h-40 bg-gradient-to-br from-surface-secondary to-surface overflow-hidden relative">
        {tool.status === 'generating' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-2" />
            <span className="text-sm text-text-secondary">Wird generiert...</span>
          </div>
        ) : tool.status === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <AlertCircle className="w-8 h-8 text-error mb-2" />
            <span className="text-sm text-error text-center line-clamp-2">
              {tool.error_message || 'Fehler'}
            </span>
          </div>
        ) : tool.last_result ? (
          renderPreview()
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-text-secondary">
              <Maximize2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <span className="text-sm">Klicken zum Öffnen</span>
            </div>
          </div>
        )}

        {/* Hover Overlay */}
        {tool.status === 'ready' && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="px-4 py-2 bg-white/90 rounded-full text-sm font-medium text-gray-800">
              Öffnen
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary truncate">
              {tool.name}
            </h3>
            <p className="text-sm text-text-secondary line-clamp-1 mt-0.5">
              {tool.description}
            </p>
          </div>

          {/* Menu */}
          <div className="relative ml-2" data-menu>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-border rounded-lg shadow-lg py-1 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
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
                    onClick={(e) => {
                      e.stopPropagation();
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

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${status.bgColor} ${status.color}`}>
              <StatusIcon className={`w-3 h-3 ${status.animate ? 'animate-spin' : ''}`} />
              {status.label}
            </div>
            {tool.refresh_interval > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent">
                <RefreshCw className="w-3 h-3" />
                Live
              </div>
            )}
          </div>
          <span className="text-xs text-text-secondary">
            {formatTimeAgo(tool.updated_at || tool.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
