import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, RefreshCw, Settings, Maximize2, Minimize2,
  Loader2, AlertCircle
} from 'lucide-react';
import ToolParameterPanel from './ToolParameterPanel';

export default function ToolExecutionView({
  tool,
  onClose,
  onExecute,
  onUpdateParameters,
  subscribeTool,
  unsubscribeTool
}) {
  const [result, setResult] = useState(tool.last_result);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(null);
  const [parameters, setParameters] = useState(tool.current_parameters || {});
  const iframeRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  // Auto-execute on mount
  useEffect(() => {
    if (tool.status === 'ready' && !tool.last_result) {
      handleExecute();
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (subscribeTool && unsubscribeTool) {
      subscribeTool(tool.id);
      return () => unsubscribeTool(tool.id);
    }
  }, [tool.id, subscribeTool, unsubscribeTool]);

  // Update result when tool changes
  useEffect(() => {
    if (tool.last_result) {
      setResult(tool.last_result);
    }
  }, [tool.last_result]);

  // Auto-refresh for dynamic tools (clocks, timers that need server-side time)
  useEffect(() => {
    const interval = tool.refresh_interval;
    if (interval && interval > 0 && tool.status === 'ready') {
      refreshIntervalRef.current = setInterval(() => {
        handleExecute(true); // silent refresh
      }, interval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [tool.refresh_interval, tool.status]);

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
      handleExecute(); // Re-execute with new params
    } catch {
      // Error handled in hook
    }
  };

  // Render HTML content in a sandboxed way
  const renderContent = () => {
    if (!result) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-text-secondary">
          <Loader2 className="w-12 h-12 mb-4 animate-spin opacity-50" />
          <p>Tool wird geladen...</p>
        </div>
      );
    }

    if (result.type === 'error') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-error p-8">
          <AlertCircle className="w-12 h-12 mb-4" />
          <p className="text-center">{result.content}</p>
        </div>
      );
    }

    if (result.type === 'html') {
      // Use srcdoc for better isolation of scripts
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 16px;
              background: transparent;
            }
            body > div { width: 100%; }
          </style>
        </head>
        <body>
          ${result.content}
        </body>
        </html>
      `;

      return (
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title={tool.name}
        />
      );
    }

    if (result.type === 'svg') {
      return (
        <div
          className="w-full h-full flex items-center justify-center overflow-auto p-4"
          dangerouslySetInnerHTML={{ __html: result.content }}
        />
      );
    }

    if (result.type === 'json') {
      try {
        const data = typeof result.content === 'string'
          ? JSON.parse(result.content)
          : result.content;
        return (
          <pre className="w-full h-full overflow-auto p-6 text-sm font-mono bg-surface-secondary rounded-xl">
            {JSON.stringify(data, null, 2)}
          </pre>
        );
      } catch {
        return <pre className="w-full h-full overflow-auto p-4">{result.content}</pre>;
      }
    }

    return <div className="p-4">{String(result.content)}</div>;
  };

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-surface'
    : 'fixed inset-4 md:inset-10 z-50 bg-surface rounded-2xl shadow-2xl';

  const hasParams = Object.keys(tool.parameters_schema || {}).length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={containerClass}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-text-primary truncate">
              {tool.name}
            </h2>
            {tool.refresh_interval > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-accent mt-1">
                <RefreshCw className="w-3 h-3" />
                Auto-Refresh: {tool.refresh_interval / 1000}s
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => handleExecute()}
              disabled={isExecuting}
              className="btn btn-secondary"
              title="Aktualisieren"
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>

            {hasParams && (
              <button
                onClick={() => setShowParams(!showParams)}
                className={`btn ${showParams ? 'btn-primary' : 'btn-secondary'}`}
                title="Parameter"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn btn-secondary"
              title={isFullscreen ? 'Verkleinern' : 'Vollbild'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={onClose}
              className="btn btn-secondary"
              title="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(100%-65px)]">
          {/* Result Area */}
          <div className={`flex-1 overflow-hidden bg-surface-secondary ${showParams ? 'border-r border-border' : ''}`}>
            {error ? (
              <div className="flex flex-col items-center justify-center h-full text-error p-4">
                <AlertCircle className="w-12 h-12 mb-4" />
                <p className="text-center">{error}</p>
                <button
                  onClick={() => handleExecute()}
                  className="btn btn-secondary mt-4"
                >
                  <RefreshCw className="w-4 h-4" />
                  Erneut versuchen
                </button>
              </div>
            ) : (
              renderContent()
            )}
          </div>

          {/* Parameters Panel */}
          {showParams && (
            <ToolParameterPanel
              schema={tool.parameters_schema}
              values={parameters}
              onChange={handleParameterChange}
              onSave={handleSaveParameters}
              onExecute={() => handleExecute()}
            />
          )}
        </div>
      </div>
    </>
  );
}
