import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AgentInput({ onSend, isProcessing, lastResponse }) {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isProcessing) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const examples = [
    'Erstelle ein Todo "Präsentation vorbereiten" für morgen',
    'Zeige meine offenen Aufgaben',
    'Notiz erstellen: Meeting-Protokoll...',
    'Was steht heute an?'
  ];

  return (
    <div className="card p-4 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            {isProcessing ? (
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 text-accent" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Was kann ich für dich tun?"
            disabled={isProcessing}
            className={cn(
              'w-full pl-12 pr-12 py-3 bg-surface-secondary border border-transparent rounded-lg',
              'text-text-primary placeholder:text-text-secondary',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
              'transition-all duration-200',
              isProcessing && 'opacity-70'
            )}
          />
          <button
            type="submit"
            disabled={!message.trim() || isProcessing}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md',
              'text-text-secondary hover:text-accent hover:bg-surface transition-all',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>

      {lastResponse && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm text-text-primary">{lastResponse.response}</p>
          {lastResponse.actions && lastResponse.actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {lastResponse.actions.map((action, i) => (
                <span
                  key={i}
                  className={cn(
                    'text-xs px-2 py-1 rounded-full',
                    action.result?.success
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  )}
                >
                  {action.tool.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!lastResponse && !isProcessing && (
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example, i) => (
            <button
              key={i}
              onClick={() => setMessage(example)}
              className="text-xs px-3 py-1.5 bg-surface-secondary text-text-secondary rounded-full hover:bg-border hover:text-text-primary transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
