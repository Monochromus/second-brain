import { useState, useEffect } from 'react';
import {
  X, Play, RefreshCw, Settings, Maximize2, Minimize2,
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

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const response = await onExecute(tool.id, parameters);
      if (response.success) {
        setResult(response.result);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleParameterChange = (key, value) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveParameters = async () => {
    try {
      await onUpdateParameters(tool.id, parameters);
      setShowParams(false);
    } catch {
      // Error handled in hook
    }
  };

  const renderResult = () => {
    if (!result) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-text-secondary">
          <Play className="w-12 h-12 mb-4 opacity-50" />
          <p>Klicke auf "Ausführen" um das Tool zu starten</p>
        </div>
      );
    }

    if (result.type === 'error') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-error">
          <AlertCircle className="w-12 h-12 mb-4" />
          <p>{result.content}</p>
        </div>
      );
    }

    if (result.type === 'html') {
      return (
        <div
          className="w-full h-full overflow-auto p-4"
          dangerouslySetInnerHTML={{ __html: result.content }}
        />
      );
    }

    if (result.type === 'svg') {
      return (
        <div
          className="w-full h-full flex items-center justify-center overflow-auto"
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
          <pre className="w-full h-full overflow-auto p-4 text-sm font-mono">
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
            <p className="text-sm text-text-secondary truncate">
              {tool.description}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="btn btn-primary"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Läuft...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Ausführen
                </>
              )}
            </button>

            {Object.keys(tool.parameters_schema || {}).length > 0 && (
              <button
                onClick={() => setShowParams(!showParams)}
                className={`btn ${showParams ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn btn-secondary"
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
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(100%-80px)]">
          {/* Result Area */}
          <div className={`flex-1 overflow-hidden ${showParams ? 'border-r border-border' : ''}`}>
            {error ? (
              <div className="flex flex-col items-center justify-center h-full text-error p-4">
                <AlertCircle className="w-12 h-12 mb-4" />
                <p className="text-center">{error}</p>
              </div>
            ) : (
              renderResult()
            )}
          </div>

          {/* Parameters Panel */}
          {showParams && (
            <ToolParameterPanel
              schema={tool.parameters_schema}
              values={parameters}
              onChange={handleParameterChange}
              onSave={handleSaveParameters}
              onExecute={handleExecute}
            />
          )}
        </div>
      </div>
    </>
  );
}
