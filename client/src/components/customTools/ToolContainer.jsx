import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MoreVertical, Pencil, Trash2, RefreshCw, Settings,
  Loader2, AlertCircle, Maximize2, Minimize2, X
} from 'lucide-react';
import ToolParameterPanel from './ToolParameterPanel';

export default function ToolContainer({
  tool,
  onExecute,
  onEdit,
  onDelete,
  onRegenerate,
  onUpdateParameters
}) {
  const [result, setResult] = useState(tool.last_result);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState(null);
  const [parameters, setParameters] = useState(tool.current_parameters || {});
  const iframeRef = useRef(null);

  // Auto-execute on mount if ready and no result
  useEffect(() => {
    if (tool.status === 'ready' && !tool.last_result) {
      handleExecute();
    }
  }, [tool.status]);

  // Update result when tool changes
  useEffect(() => {
    if (tool.last_result) {
      setResult(tool.last_result);
    }
  }, [tool.last_result]);

  // Note: Auto-refresh from server is disabled because widgets with
  // JavaScript (clocks, timers) update themselves in the browser iframe.
  // Server re-execution is only needed for initial render.

  const handleExecute = useCallback(async (silent = false) => {
    if (!silent) setIsExecuting(true);
    setError(null);

    try {
      const response = await onExecute(tool.id, parameters);
      if (response.success) {
        setResult(response.result);
      } else {
        if (!silent) setError(response.error);
      }
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setIsExecuting(false);
    }
  }, [tool.id, parameters, onExecute]);

  const handleParameterChange = (key, value) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveParameters = async () => {
    try {
      await onUpdateParameters(tool.id, parameters);
      setShowParams(false);
      handleExecute();
    } catch {
      // Error handled in hook
    }
  };

  const hasParams = Object.keys(tool.parameters_schema || {}).length > 0;

  // Render the widget content
  const renderContent = () => {
    if (tool.status === 'generating') {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
          <Loader2 className="w-10 h-10 text-accent animate-spin mb-3" />
          <span className="text-sm text-text-secondary">Tool wird generiert...</span>
        </div>
      );
    }

    if (tool.status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-4">
          <AlertCircle className="w-10 h-10 text-error mb-3" />
          <p className="text-sm text-error text-center mb-4">{tool.error_message}</p>
          <button
            onClick={() => onRegenerate(tool.id, tool.description)}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Neu generieren
          </button>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-4">
          <AlertCircle className="w-10 h-10 text-error mb-3" />
          <p className="text-sm text-error text-center mb-4">{error}</p>
          <button onClick={() => handleExecute()} className="btn btn-secondary btn-sm">
            <RefreshCw className="w-4 h-4" />
            Erneut versuchen
          </button>
        </div>
      );
    }

    if (!result) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
          <Loader2 className="w-10 h-10 text-accent animate-spin opacity-50" />
        </div>
      );
    }

    if (result.type === 'error') {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-4">
          <AlertCircle className="w-10 h-10 text-error mb-3" />
          <p className="text-sm text-error text-center">{result.content}</p>
        </div>
      );
    }

    if (result.type === 'html') {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body { height: 100%; width: 100%; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 12px;
              background: transparent;
            }
            body > div, body > style + div { width: 100%; }
          </style>
        </head>
        <body>${result.content}</body>
        </html>
      `;

      return (
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          className="w-full h-full min-h-[200px] border-0"
          sandbox="allow-scripts"
          title={tool.name}
        />
      );
    }

    if (result.type === 'svg') {
      return (
        <div
          className="w-full h-full min-h-[200px] flex items-center justify-center p-4"
          dangerouslySetInnerHTML={{ __html: result.content }}
        />
      );
    }

    return <div className="p-4">{String(result.content)}</div>;
  };

  return (
    <div className={`card overflow-hidden flex flex-col ${isExpanded ? 'fixed inset-4 z-50' : ''}`}>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/50 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-surface">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h3 className="font-semibold text-text-primary truncate">{tool.name}</h3>
          {tool.refresh_interval > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-accent/10 text-accent shrink-0">
              <RefreshCw className="w-3 h-3" />
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isExecuting && <Loader2 className="w-4 h-4 text-accent animate-spin" />}

          <button
            onClick={() => handleExecute()}
            disabled={isExecuting || tool.status !== 'ready'}
            className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {hasParams && (
            <button
              onClick={() => setShowParams(!showParams)}
              className={`p-1.5 rounded-lg transition-colors ${showParams ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-surface-secondary'}`}
              title="Parameter"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors"
            title={isExpanded ? 'Verkleinern' : 'Vergrößern'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-border rounded-lg shadow-lg py-1 z-20">
                  <button
                    onClick={() => { onEdit(tool); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
                  >
                    <Pencil className="w-4 h-4" />
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => { onRegenerate(tool.id, tool.description); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Neu generieren
                  </button>
                  <button
                    onClick={() => { onDelete(tool.id); setMenuOpen(false); }}
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

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        <div className={`flex-1 overflow-hidden bg-surface-secondary ${showParams ? 'border-r border-border' : ''}`}>
          {renderContent()}
        </div>

        {showParams && (
          <div className="w-64 shrink-0">
            <ToolParameterPanel
              schema={tool.parameters_schema}
              values={parameters}
              onChange={handleParameterChange}
              onSave={handleSaveParameters}
              onExecute={() => handleExecute()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
