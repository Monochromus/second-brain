import { useState } from 'react';
import { Globe, ExternalLink, ChevronDown, ChevronUp, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function ResearchResults({ research }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllCitations, setShowAllCitations] = useState(false);

  if (!research) return null;

  // Handle error state
  if (research.error) {
    return (
      <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-text-primary">{research.error}</p>
        </div>
      </div>
    );
  }

  // If no summary, nothing to show
  if (!research.summary) return null;

  const citations = research.citations || [];
  const displayCitations = showAllCitations ? citations : citations.slice(0, 3);
  const relatedQuestions = research.relatedQuestions || [];

  return (
    <div className="mt-3 glass rounded-xl overflow-hidden border border-white/20 dark:border-white/10">
      {/* Header */}
      <button
        className="w-full p-3 flex items-center justify-between hover:bg-white/10 transition-colors text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-500/20 flex-shrink-0">
            <Globe className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-sm font-medium text-text-primary truncate">
            Web-Recherche: "{research.query}"
          </span>
        </div>
        <div className="p-1 rounded-md hover:bg-white/20 flex-shrink-0 ml-2">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Summary */}
          <div className="p-3 rounded-lg bg-white/30 dark:bg-white/5">
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Zusammenfassung
              </span>
            </div>
            <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
              {research.summary}
            </p>
          </div>

          {/* Citations */}
          {citations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-text-secondary" />
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Quellen ({citations.length})
                </span>
              </div>
              <div className="space-y-2">
                {displayCitations.map((citation, i) => (
                  <a
                    key={i}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-lg",
                      "bg-white/20 dark:bg-white/5 hover:bg-white/30 dark:hover:bg-white/10",
                      "transition-colors group"
                    )}
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium">
                      {citation.id || i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate group-hover:text-accent transition-colors">
                        {citation.title || citation.url}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {extractDomain(citation.url)}
                      </p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-text-secondary group-hover:text-accent flex-shrink-0 mt-0.5" />
                  </a>
                ))}
              </div>

              {citations.length > 3 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllCitations(!showAllCitations);
                  }}
                  className="mt-2 text-xs text-accent hover:underline"
                >
                  {showAllCitations
                    ? 'Weniger anzeigen'
                    : `+${citations.length - 3} weitere Quellen`
                  }
                </button>
              )}
            </div>
          )}

          {/* Related Questions */}
          {relatedQuestions.length > 0 && (
            <div>
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                Verwandte Fragen
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {relatedQuestions.slice(0, 3).map((question, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/20 dark:bg-white/5 text-text-secondary border border-white/10"
                  >
                    {question}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Extract domain from URL for display
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}
