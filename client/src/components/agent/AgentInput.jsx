import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Sparkles, Loader2, ChevronDown, ChevronUp, Image as ImageIcon, X,
  CheckCircle, FileText, Calendar, FolderKanban, Globe, ArrowRight, Mail, Edit3, Trash2
} from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import ImageUpload from './ImageUpload';
import ExtractionResults from './ExtractionResults';
import ResearchResults from './ResearchResults';

// Hilfsfunktion: Kurzform der Antwort generieren (erster Satz oder max. 120 Zeichen)
function getSummary(text) {
  if (!text) return '';
  // Erster Satz (endet mit . ! oder ?)
  const firstSentence = text.match(/^[^.!?]+[.!?]/);
  if (firstSentence && firstSentence[0].length <= 150) {
    return firstSentence[0].trim();
  }
  // Falls kein Satz oder zu lang: ersten 120 Zeichen
  if (text.length <= 120) return text;
  return text.slice(0, 117).trim() + '...';
}

// Hilfsfunktion: Detailinhalt (alles nach dem ersten Satz)
function getDetailContent(text) {
  if (!text) return '';
  // Erster Satz finden
  const firstSentence = text.match(/^[^.!?]+[.!?]/);
  if (firstSentence && firstSentence[0].length <= 150) {
    const rest = text.slice(firstSentence[0].length).trim();
    return rest;
  }
  // Falls kein klarer erster Satz: ab Zeichen 120
  if (text.length <= 120) return '';
  return text.slice(117).trim();
}

// Hilfsfunktion: Icon und Navigation für Aktion
function getActionInfo(action) {
  const tool = action.tool;
  const result = action.result;

  if (tool.includes('todo')) {
    return {
      icon: CheckCircle,
      label: result?.todo?.title || 'Aufgabe',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      route: '/',
      type: 'todo',
      id: result?.todo?.id
    };
  }
  if (tool.includes('note')) {
    return {
      icon: FileText,
      label: result?.note?.title || 'Notiz',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
      route: '/',
      type: 'note',
      id: result?.note?.id
    };
  }
  if (tool.includes('calendar') || tool.includes('event')) {
    return {
      icon: Calendar,
      label: result?.event?.title || 'Termin',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
      route: '/calendar',
      type: 'event',
      id: result?.event?.id
    };
  }
  if (tool.includes('project')) {
    return {
      icon: FolderKanban,
      label: result?.project?.name || 'Projekt',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      route: result?.project?.id ? `/project/${result.project.id}` : '/projects',
      type: 'project',
      id: result?.project?.id
    };
  }
  if (result?.type === 'research') {
    return {
      icon: Globe,
      label: 'Web-Recherche',
      color: 'text-cyan-600 dark:text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20',
      route: null,
      type: 'research'
    };
  }
  if (result?.type === 'email_draft') {
    return {
      icon: Mail,
      label: `E-Mail an ${result?.to || 'Empfänger'}`,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-500/10 border-pink-500/20',
      route: '/email',
      type: 'email_draft',
      draftId: result?.draft_id,
      subject: result?.subject,
      preview: result?.preview
    };
  }
  return {
    icon: Sparkles,
    label: tool.replace(/_/g, ' '),
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-500/10 border-gray-500/20',
    route: null,
    type: 'other'
  };
}

export default function AgentInput({
  onSend,
  onSendWithImages,
  isProcessing,
  lastResponse,
  onClearResponse,
  visionResponse,
  extractedData,
  onConfirmExtraction,
  onCancelExtraction,
  isConfirming
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isResponseExpanded, setIsResponseExpanded] = useState(false);
  const [isExamplesExpanded, setIsExamplesExpanded] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [images, setImages] = useState([]);
  const [sendingDraft, setSendingDraft] = useState(null);
  const [deletingDraft, setDeletingDraft] = useState(null);
  const inputRef = useRef(null);

  // Email draft actions
  const handleSendDraft = async (draftId) => {
    setSendingDraft(draftId);
    try {
      await api.post(`/email-drafts/${draftId}/send`);
      toast.success('E-Mail gesendet!');
      onClearResponse?.();
    } catch (err) {
      toast.error(err.message || 'Fehler beim Senden');
    } finally {
      setSendingDraft(null);
    }
  };

  const handleDeleteDraft = async (draftId) => {
    setDeletingDraft(draftId);
    try {
      await api.delete(`/email-drafts/${draftId}`);
      toast.success('Entwurf verworfen');
      onClearResponse?.();
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen');
    } finally {
      setDeletingDraft(null);
    }
  };

  const handleEditDraft = (draftId) => {
    // Navigate to email page with draft open for editing
    navigate(`/email?draft=${draftId}`);
    onClearResponse?.();
  };

  // Check if user is using standard (free) models
  const isStandardModel = !user?.settings?.openaiApiKey && !user?.settings?.perplexityApiKey;

  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  // Collapse response when a new one comes in, but auto-expand for email drafts
  useEffect(() => {
    if (lastResponse) {
      // Auto-expand if there's an email draft action
      const hasEmailDraft = lastResponse.actions?.some(a => a.result?.type === 'email_draft');
      setIsResponseExpanded(hasEmailDraft);
    }
  }, [lastResponse]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isProcessing) return;

    // If we have images, send with images
    if (images.length > 0) {
      const files = images.map(img => img.file);
      onSendWithImages(message, files);
      setMessage('');
      // Clear images after sending
      images.forEach(img => URL.revokeObjectURL(img.preview));
      setImages([]);
      setShowImageUpload(false);
      return;
    }

    // Regular text-only send
    if (message.trim()) {
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

  const toggleImageUpload = () => {
    setShowImageUpload(!showImageUpload);
    if (showImageUpload) {
      // Clear images when closing
      images.forEach(img => URL.revokeObjectURL(img.preview));
      setImages([]);
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
      {/* Image Upload Area */}
      {showImageUpload && !extractedData && (
        <div className="mb-4">
          <ImageUpload
            images={images}
            onImagesChange={setImages}
            disabled={isProcessing}
          />
        </div>
      )}

      {/* Extraction Results - shown when vision analysis is complete */}
      {extractedData && (
        <div className="mb-4">
          <ExtractionResults
            visionResponse={visionResponse}
            extractions={extractedData}
            onConfirm={onConfirmExtraction}
            onCancel={onCancelExtraction}
            isConfirming={isConfirming}
          />
        </div>
      )}

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
            placeholder={images.length > 0 ? "Frage zum Bild oder Anweisung..." : "Was kann ich für dich tun?"}
            disabled={isProcessing}
            className={cn(
              'w-full pl-12 pr-24 py-3 rounded-xl',
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

          {/* Action Buttons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Image Upload Toggle */}
            <button
              type="button"
              onClick={toggleImageUpload}
              disabled={isProcessing}
              className={cn(
                'p-2 rounded-lg',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                showImageUpload || images.length > 0
                  ? 'text-accent bg-accent/10'
                  : 'text-text-secondary hover:text-accent hover:bg-white/30 dark:hover:bg-white/10'
              )}
              title={showImageUpload ? 'Bildupload schließen' : 'Bild hochladen'}
            >
              {showImageUpload && images.length === 0 ? (
                <X className="w-5 h-5" />
              ) : (
                <div className="relative">
                  <ImageIcon className="w-5 h-5" />
                  {images.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-xs rounded-full flex items-center justify-center">
                      {images.length}
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!message.trim() && images.length === 0) || isProcessing}
              className={cn(
                'p-2 rounded-lg',
                'text-text-secondary hover:text-accent hover:bg-white/30 dark:hover:bg-white/10',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                images.length > 0 && 'text-accent'
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </form>

      {lastResponse && !extractedData && (() => {
        // Prüfen ob es eine Recherche-Antwort ist
        const hasResearch = lastResponse.actions?.some(a => a.result?.type === 'research');

        return (
        <div className="mt-3 pt-3 border-t border-white/20 dark:border-white/10">
          {/* Kurzform - Immer sichtbar */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {/* Kurzantwort - bei Recherche vollständig, sonst nur erster Satz */}
              <p className="text-sm text-text-primary font-medium">
                {hasResearch ? lastResponse.response : getSummary(lastResponse.response)}
              </p>
            </div>

            {/* Ausklappen-Button */}
            <button
              onClick={() => setIsResponseExpanded(!isResponseExpanded)}
              className={cn(
                "p-1.5 rounded-lg transition-all duration-200 flex-shrink-0",
                "text-text-secondary hover:text-accent",
                "hover:bg-white/30 dark:hover:bg-white/10",
                isResponseExpanded && "bg-accent/10 text-accent"
              )}
              title={isResponseExpanded ? "Einklappen" : "Details anzeigen"}
            >
              {isResponseExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Dismiss Button */}
            <button
              onClick={onClearResponse}
              className={cn(
                "p-1.5 rounded-lg transition-all duration-200 flex-shrink-0",
                "text-text-secondary hover:text-error",
                "hover:bg-white/30 dark:hover:bg-white/10"
              )}
              title="Antwort entfernen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Detailansicht - Ausgeklappt */}
          {isResponseExpanded && (
            <div className="mt-4 overflow-hidden rounded-2xl animate-fadeIn">
              {/* Main Container with Liquid Glass Effect - Emerald Theme */}
              <div className="relative glass-strong border-2 border-white/30 dark:border-white/10 overflow-hidden">
                {/* Decorative gradient background - Emerald/Teal */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-green-500/10 pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-emerald-500/20 to-transparent blur-2xl pointer-events-none" />

                <div className="relative p-4 space-y-4 max-h-[50vh] overflow-y-auto">
                  {/* Aktions-Badges - Klickbar zu erstellten Objekten */}
                  {lastResponse.actions?.some(a => a.result?.success) && (
                    <div className="relative p-4 rounded-xl glass-subtle overflow-hidden">
                      {/* Section gradient - Indigo/Violet */}
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-violet-500/5 pointer-events-none" />

                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">✨</span>
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                            Ausgeführte Aktionen
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {lastResponse.actions
                            .filter(a => a.result?.success)
                            .map((action, i) => {
                              const info = getActionInfo(action);
                              const Icon = info.icon;
                              const isClickable = info.route !== null;

                              return (
                                <button
                                  key={i}
                                  onClick={() => isClickable && navigate(info.route)}
                                  disabled={!isClickable}
                                  className={cn(
                                    'inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl',
                                    'border backdrop-blur-sm transition-all duration-200',
                                    'bg-white/40 dark:bg-white/10',
                                    info.color,
                                    'border-white/30 dark:border-white/10',
                                    isClickable && 'hover:scale-105 cursor-pointer hover:shadow-md hover:bg-white/60 dark:hover:bg-white/15',
                                    !isClickable && 'cursor-default'
                                  )}
                                  title={isClickable ? `Zu "${info.label}" gehen` : info.label}
                                >
                                  <Icon className="w-4 h-4" />
                                  <span className="max-w-[150px] truncate font-medium">{info.label}</span>
                                  {isClickable && <ArrowRight className="w-3 h-3 opacity-60" />}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Email Draft Actions - Senden/Bearbeiten/Verwerfen Buttons */}
                  {lastResponse.actions?.some(a => a.result?.type === 'email_draft') && (
                    <div className="relative p-4 rounded-xl glass-subtle overflow-hidden">
                      {/* Section gradient - Pink/Rose */}
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-transparent to-rose-500/10 pointer-events-none" />

                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <Mail className="w-5 h-5 text-pink-500" />
                          <span className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                            E-Mail-Entwurf erstellt
                          </span>
                        </div>

                        {lastResponse.actions
                          .filter(a => a.result?.type === 'email_draft')
                          .map((action, i) => {
                            const draft = action.result;
                            return (
                              <div key={i} className="space-y-3">
                                {/* Draft Preview */}
                                <div className="p-3 bg-white/30 dark:bg-white/5 rounded-lg border border-white/20">
                                  <p className="text-sm font-medium text-text-primary">
                                    An: {draft.to}
                                  </p>
                                  <p className="text-sm text-text-secondary">
                                    Betreff: {draft.subject}
                                  </p>
                                  {draft.preview && (
                                    <p className="text-xs text-text-secondary mt-2 line-clamp-2">
                                      {draft.preview}...
                                    </p>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => handleSendDraft(draft.draft_id)}
                                    disabled={sendingDraft === draft.draft_id}
                                    className={cn(
                                      "flex items-center gap-2 px-4 py-2 rounded-lg",
                                      "bg-accent text-white font-medium",
                                      "hover:bg-accent/90 transition-all",
                                      "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                  >
                                    {sendingDraft === draft.draft_id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Send className="w-4 h-4" />
                                    )}
                                    Senden
                                  </button>

                                  <button
                                    onClick={() => handleEditDraft(draft.draft_id)}
                                    className={cn(
                                      "flex items-center gap-2 px-4 py-2 rounded-lg",
                                      "bg-white/40 dark:bg-white/10 text-text-primary font-medium",
                                      "border border-white/30 dark:border-white/10",
                                      "hover:bg-white/60 dark:hover:bg-white/20 transition-all"
                                    )}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    Bearbeiten
                                  </button>

                                  <button
                                    onClick={() => handleDeleteDraft(draft.draft_id)}
                                    disabled={deletingDraft === draft.draft_id}
                                    className={cn(
                                      "flex items-center gap-2 px-4 py-2 rounded-lg",
                                      "bg-white/40 dark:bg-white/10 text-error font-medium",
                                      "border border-error/30",
                                      "hover:bg-error/10 transition-all",
                                      "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                  >
                                    {deletingDraft === draft.draft_id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                    Verwerfen
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Zusätzliche Details - nur wenn es welche gibt UND keine Recherche (da Details dort schon enthalten) */}
                  {!hasResearch && getDetailContent(lastResponse.response) && (
                    <div className="relative p-4 rounded-xl glass-subtle overflow-hidden group hover:glass transition-all duration-300">
                      {/* Section gradient */}
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />

                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">💡</span>
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            Details
                          </span>
                        </div>
                        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed pl-1">
                          {getDetailContent(lastResponse.response)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Fehlgeschlagene Aktionen */}
                  {lastResponse.actions?.some(a => !a.result?.success) && (
                    <div className="relative p-4 rounded-xl glass-subtle overflow-hidden">
                      {/* Section gradient - Red */}
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-orange-500/5 pointer-events-none" />

                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">⚠️</span>
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                            Fehlgeschlagen
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {lastResponse.actions
                            .filter(a => !a.result?.success)
                            .map((action, i) => (
                              <span
                                key={i}
                                className={cn(
                                  "text-xs px-3 py-2 rounded-xl",
                                  "bg-white/40 dark:bg-white/10",
                                  "text-red-700 dark:text-red-400",
                                  "border border-red-500/20"
                                )}
                                title={action.result?.error || 'Fehler'}
                              >
                                {action.tool.replace(/_/g, ' ')}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Research Results */}
                  {lastResponse.actions?.some(a => a.result?.type === 'research') && (
                    <ResearchResults
                      research={lastResponse.actions.find(a => a.result?.type === 'research')?.result}
                    />
                  )}

                  {/* Falls keine Details, keine Aktionen und keine Research - kleine Info */}
                  {!getDetailContent(lastResponse.response) &&
                   !lastResponse.actions?.some(a => a.result?.success) &&
                   !lastResponse.actions?.some(a => a.result?.type === 'research') &&
                   !lastResponse.actions?.some(a => !a.result?.success) && (
                    <div className="flex items-center justify-center py-4 text-text-secondary/50">
                      <span className="text-xs">Keine weiteren Details verfügbar</span>
                    </div>
                  )}

                  {/* Footer - Powered by Hinweis */}
                  <div className="flex flex-col items-center gap-1 pt-3 mt-2 border-t border-white/10">
                    <div className="flex items-center gap-2 text-xs text-text-secondary/50">
                      <span>🔍</span>
                      <span>Powered by Perplexity AI & OpenAI</span>
                      <span>🤖</span>
                    </div>
                    {isStandardModel && (
                      <p className="text-xs text-text-secondary/60 text-center max-w-sm">
                        Du nutzt die kostenlosen Standardmodelle. Für komplexere Anfragen empfehlen wir ein Pro-Modell in den Einstellungen.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        );
      })()}

      {!lastResponse && !isProcessing && !showImageUpload && !extractedData && (
        <div className="mt-2">
          <button
            onClick={() => setIsExamplesExpanded(!isExamplesExpanded)}
            className="p-1 rounded-md text-text-secondary/50 hover:text-text-secondary hover:bg-white/10 transition-all mx-auto block"
            title={isExamplesExpanded ? "Beispiele ausblenden" : "Beispiele anzeigen"}
          >
            {isExamplesExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {isExamplesExpanded && (
            <div className="mt-2 flex flex-wrap gap-2 justify-center">
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
      )}
    </div>
  );
}
