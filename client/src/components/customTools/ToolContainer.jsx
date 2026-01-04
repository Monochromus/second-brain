import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MoreVertical, Pencil, Trash2, RefreshCw, Settings,
  Loader2, AlertCircle, Maximize2, Minimize2, X
} from 'lucide-react';
import { api } from '../../lib/api';
import ToolParameterPanel from './ToolParameterPanel';

export default function ToolContainer({
  tool,
  onExecute,
  onEdit,
  onDelete,
  onUpdateParameters,
  onToolUpdate
}) {
  const [result, setResult] = useState(tool.last_result || null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState(null);
  const [parameters, setParameters] = useState(tool.current_parameters || {});
  const iframeRef = useRef(null);
  const hasAutoExecuted = useRef(false);
  const prevStatus = useRef(tool.status);
  const pollingRef = useRef(null);

  // Polling fallback for when WebSocket doesn't work
  useEffect(() => {
    // Start polling if tool is generating
    if (tool.status === 'generating') {
      console.log('Starting polling for tool:', tool.id);

      pollingRef.current = setInterval(async () => {
        try {
          const response = await api.get(`/custom-tools/${tool.id}`);
          const updatedTool = response.tool;

          if (updatedTool.status !== 'generating') {
            console.log('Tool finished generating:', updatedTool.status);
            // Stop polling
            clearInterval(pollingRef.current);
            pollingRef.current = null;

            // Notify parent about the update
            if (onToolUpdate) {
              onToolUpdate(updatedTool);
            }

            // Update local result if available
            if (updatedTool.last_result) {
              setResult(updatedTool.last_result);
            }
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 2000); // Poll every 2 seconds
    }

    // Cleanup polling on unmount or when status changes
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [tool.status, tool.id, onToolUpdate]);

  // Auto-execute when tool becomes ready (either on mount or after generation)
  useEffect(() => {
    const wasGenerating = prevStatus.current === 'generating';
    const isNowReady = tool.status === 'ready';
    const hasResult = tool.last_result && tool.last_result.content;

    // Execute if: just became ready OR is ready on mount without result
    if (isNowReady && !hasResult && !hasAutoExecuted.current) {
      hasAutoExecuted.current = true;
      handleExecute();
    }

    // Reset flag if status changes to generating
    if (tool.status === 'generating') {
      hasAutoExecuted.current = false;
    }

    prevStatus.current = tool.status;
  }, [tool.status, tool.last_result]);

  // Update result when tool.last_result changes
  useEffect(() => {
    if (tool.last_result && tool.last_result.content !== undefined) {
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
          <span className="text-sm text-text-secondary text-center">Tool wird generiert...<br/>Bei komplexen Anfragen kann dies mehrere Minuten dauern.</span>
        </div>
      );
    }

    if (tool.status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-4">
          <AlertCircle className="w-10 h-10 text-error mb-3" />
          <p className="text-sm text-error text-center mb-4">{tool.error_message}</p>
          <p className="text-xs text-text-secondary text-center">
            Lösche dieses Tool und erstelle es mit einer anderen Beschreibung neu.
          </p>
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

    if (!result || result.content === undefined || result.content === null) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
          <Loader2 className="w-10 h-10 text-accent animate-spin opacity-50" />
          <span className="text-xs text-text-secondary mt-2">Wird geladen...</span>
        </div>
      );
    }

    if (result.type === 'error') {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-4">
          <AlertCircle className="w-10 h-10 text-error mb-3" />
          <p className="text-sm text-error text-center">{result.content || 'Unbekannter Fehler'}</p>
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
          sandbox="allow-scripts allow-same-origin"
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

    // Fallback for unknown types - safely convert to string
    const contentStr = result.content != null ? String(result.content) : '';
    return <div className="p-4 text-text-primary">{contentStr}</div>;
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
