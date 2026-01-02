import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function ResearchResults({ research }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllCitations, setShowAllCitations] = useState(false);

  if (!research) return null;

  // Handle error state
  if (research.error) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl">
        <div className="relative p-4 glass-strong border-2 border-red-400/30">
          {/* Decorative gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/5 pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <span className="text-2xl">😕</span>
            <p className="text-sm text-text-primary">{research.error}</p>
          </div>
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
    <div className="mt-4 overflow-hidden rounded-2xl animate-fadeIn">
      {/* Main Container with Liquid Glass Effect */}
      <div className="relative glass-strong border-2 border-white/30 dark:border-white/10 overflow-hidden">
        {/* Decorative animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-cyan-500/10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-accent/20 to-transparent blur-2xl pointer-events-none" />

        {/* Header */}
        <button
          className="relative w-full p-4 flex items-center justify-between hover:bg-white/10 dark:hover:bg-white/5 transition-all duration-300 text-left group"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <span className="text-2xl group-hover:scale-110 transition-transform duration-300 inline-block">
                🌐
              </span>
              <span className="absolute -bottom-1 -right-1 text-sm">✨</span>
            </div>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-text-primary block truncate">
                Web-Recherche
              </span>
              <span className="text-xs text-text-secondary truncate block">
                "{research.query}"
              </span>
            </div>
          </div>
          <div className={cn(
            "p-2 rounded-xl glass-subtle transition-all duration-300",
            "group-hover:bg-white/30 dark:group-hover:bg-white/10"
          )}>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-text-secondary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-secondary" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="relative px-4 pb-4 space-y-4 animate-slideDown">
            {/* Summary Section */}
            <div className="relative p-4 rounded-xl glass-subtle overflow-hidden group hover:glass transition-all duration-300">
              {/* Section gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">💡</span>
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                    Zusammenfassung
                  </span>
                </div>
                <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed pl-1">
                  {research.summary}
                </p>
              </div>
            </div>

            {/* Citations Section */}
            {citations.length > 0 && (
              <div className="relative p-4 rounded-xl glass-subtle overflow-hidden">
                {/* Section gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📚</span>
                    <span className="text-xs font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wider">
                      Quellen
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium">
                      {citations.length}
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
                          "flex items-start gap-3 p-3 rounded-xl",
                          "bg-white/30 dark:bg-white/5",
                          "hover:bg-white/50 dark:hover:bg-white/10",
                          "border border-white/20 dark:border-white/10",
                          "hover:border-accent/30",
                          "transition-all duration-300 group/link",
                          "hover:shadow-lg hover:shadow-accent/5"
                        )}
                      >
                        <span className={cn(
                          "flex-shrink-0 w-7 h-7 rounded-lg",
                          "bg-gradient-to-br from-accent/30 to-accent/10",
                          "text-accent text-xs font-bold",
                          "flex items-center justify-center",
                          "group-hover/link:scale-110 transition-transform duration-300"
                        )}>
                          {citation.id || i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate group-hover/link:text-accent transition-colors duration-300">
                            {citation.title || citation.url}
                          </p>
                          <p className="text-xs text-text-secondary truncate mt-0.5 flex items-center gap-1">
                            <span>🔗</span>
                            {extractDomain(citation.url)}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-text-secondary/50 group-hover/link:text-accent flex-shrink-0 mt-0.5 transition-colors duration-300" />
                      </a>
                    ))}
                  </div>

                  {citations.length > 3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAllCitations(!showAllCitations);
                      }}
                      className={cn(
                        "mt-3 px-4 py-2 rounded-xl text-xs font-medium",
                        "bg-accent/10 text-accent",
                        "hover:bg-accent/20 transition-all duration-300",
                        "flex items-center gap-2"
                      )}
                    >
                      <span>{showAllCitations ? '👆' : '👇'}</span>
                      {showAllCitations
                        ? 'Weniger anzeigen'
                        : `+${citations.length - 3} weitere Quellen`
                      }
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Related Questions Section */}
            {relatedQuestions.length > 0 && (
              <div className="relative p-4 rounded-xl glass-subtle overflow-hidden">
                {/* Section gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">💭</span>
                    <span className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider">
                      Verwandte Fragen
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {relatedQuestions.slice(0, 3).map((question, i) => (
                      <span
                        key={i}
                        className={cn(
                          "text-xs px-3 py-2 rounded-xl",
                          "bg-white/40 dark:bg-white/10",
                          "text-text-secondary",
                          "border border-white/30 dark:border-white/10",
                          "hover:bg-white/60 dark:hover:bg-white/15",
                          "hover:text-text-primary",
                          "transition-all duration-300 cursor-default"
                        )}
                      >
                        {question}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
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
