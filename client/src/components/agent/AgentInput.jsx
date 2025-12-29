import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function AgentInput({ onSend, isProcessing, lastResponse }) {
  const [message, setMessage] = useState('');
  const [isResponseExpanded, setIsResponseExpanded] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  // Collapse response when a new one comes in
  useEffect(() => {
    if (lastResponse) {
      setIsResponseExpanded(false);
    }
  }, [lastResponse]);

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
    <div className="glass-strong p-4 glass-glow">
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
              'w-full pl-12 pr-12 py-3 rounded-xl',
              'bg-white/50 dark:bg-white/5',
              'border border-white/30 dark:border-white/10',
              'text-text-primary placeholder:text-text-secondary',
              'focus:outline-none focus:border-accent focus:bg-white/70 dark:focus:bg-white/10',
              'transition-all duration-300',
              isProcessing && 'opacity-70'
            )}
            style={{
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
            }}
          />
          <button
            type="submit"
            disabled={!message.trim() || isProcessing}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg',
              'text-text-secondary hover:text-accent hover:bg-white/30 dark:hover:bg-white/10',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>

      {lastResponse && (
        <div className="mt-3 pt-3 border-t border-white/20 dark:border-white/10">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm text-text-primary flex-1 cursor-pointer",
                !isResponseExpanded && "line-clamp-1"
              )}
              onClick={() => setIsResponseExpanded(!isResponseExpanded)}
            >
              {lastResponse.response}
            </p>
            <button
              onClick={() => setIsResponseExpanded(!isResponseExpanded)}
              className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-white/20 dark:hover:bg-white/10 transition-colors flex-shrink-0"
              title={isResponseExpanded ? "Einklappen" : "Ausklappen"}
            >
              {isResponseExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
          {isResponseExpanded && lastResponse.actions && lastResponse.actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {lastResponse.actions.map((action, i) => (
                <span
                  key={i}
                  className={cn(
                    'text-xs px-2 py-1 rounded-full backdrop-blur-sm',
                    action.result?.success
                      ? 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/30'
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
              className="text-xs px-3 py-1.5 rounded-full bg-white/30 dark:bg-white/10 text-text-secondary border border-white/20 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/20 hover:text-text-primary transition-all duration-200"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
