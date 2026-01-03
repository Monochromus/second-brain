import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Mail,
  Inbox,
  Send,
  FileText,
  Trash2,
  Star,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Reply,
  ReplyAll,
  Forward,
  Archive,
  Loader2,
  Plus,
  Check,
  X,
  ArrowLeft
} from 'lucide-react';
import { useEmails, useEmailDrafts, useEmailStats } from '../hooks/useEmails';
import { useEmailAccounts } from '../hooks/useEmailAccounts';
import { cn } from '../lib/utils';
import DOMPurify from 'dompurify';
import ComposeModal from '../components/email/ComposeModal';
import { api } from '../lib/api';

// Email folders
const FOLDERS = [
  { id: 'INBOX', label: 'Posteingang', icon: Inbox },
  { id: 'Sent', label: 'Gesendet', icon: Send },
  { id: 'Drafts', label: 'Entwürfe', icon: FileText },
  { id: 'Trash', label: 'Papierkorb', icon: Trash2 }
];

export default function EmailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedFolder, setSelectedFolder] = useState('INBOX');
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState('new'); // 'new', 'reply', 'replyAll', 'forward', 'edit'
  const [replyToEmail, setReplyToEmail] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const { accounts, loading: accountsLoading, syncAccount } = useEmailAccounts();

  const {
    emails,
    total,
    loading: emailsLoading,
    selectedEmail,
    selectedEmailLoading,
    starToggleLoading,
    setSelectedEmail,
    refetch,
    loadEmail,
    loadThread,
    markAsRead,
    toggleStar,
    moveToFolder,
    deleteEmail
  } = useEmails({
    account_id: selectedAccountId,
    folder: showStarredOnly ? undefined : selectedFolder,
    starred: showStarredOnly || undefined,
    search: searchQuery || undefined,
    limit: 50
  });

  const { stats, refetch: refetchStats } = useEmailStats();
  const { drafts, loading: draftsLoading, refetch: refetchDrafts, deleteDraft } = useEmailDrafts();

  const [thread, setThread] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);

  // Load thread when email is selected
  useEffect(() => {
    if (selectedEmail?.thread_id) {
      setThreadLoading(true);
      loadThread(selectedEmail.id)
        .then(setThread)
        .catch(() => setThread([]))
        .finally(() => setThreadLoading(false));
    } else {
      setThread([]);
    }
  }, [selectedEmail?.id]);

  // Handle draft query parameter for editing
  useEffect(() => {
    const draftId = searchParams.get('draft');
    if (draftId && accounts.length > 0) {
      // Fetch the draft and open for editing
      api.get(`/email-drafts/${draftId}`)
        .then(draft => {
          // api.get returns data directly, not wrapped in response.data
          setEditDraft(draft);
          setComposeMode('edit');
          setShowCompose(true);
          setSelectedFolder('Drafts');
          // Clear the query param after loading
          setSearchParams({}, { replace: true });
        })
        .catch(err => {
          console.error('Failed to load draft:', err);
          setSearchParams({}, { replace: true });
        });
    }
  }, [searchParams, accounts]);

  // Handle email selection
  const handleSelectEmail = async (email) => {
    await loadEmail(email.id);
    setShowMobileDetail(true);
  };

  // Handle reply
  const handleReply = (email, all = false) => {
    setReplyToEmail(email);
    setComposeMode(all ? 'replyAll' : 'reply');
    setShowCompose(true);
  };

  // Handle forward
  const handleForward = (email) => {
    setReplyToEmail(email);
    setComposeMode('forward');
    setShowCompose(true);
  };

  // Handle new email
  const handleNewEmail = () => {
    setReplyToEmail(null);
    setComposeMode('new');
    setShowCompose(true);
  };

  // Handle star toggle with stats refresh
  const handleToggleStar = async (emailId) => {
    if (starToggleLoading) {
      return;
    }
    await toggleStar(emailId);
    refetchStats();
  };

  // Handle sync
  const handleSync = async () => {
    if (selectedAccountId) {
      await syncAccount(selectedAccountId);
    } else {
      // Sync all accounts
      for (const account of accounts) {
        await syncAccount(account.id);
      }
    }
    refetch();
    refetchStats();
  };

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isThisYear = date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } else if (isThisYear) {
      return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
    } else {
      return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  // Get account color
  const getAccountColor = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    return account?.color || '#3B82F6';
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden -m-4 md:-m-6">
      {/* Sidebar - Desktop only */}
      <div className="hidden md:flex w-56 border-r border-border bg-surface-secondary flex-shrink-0 flex-col">
        {/* New Email Button */}
        <div className="p-3">
          <button
            onClick={handleNewEmail}
            className="btn btn-primary w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            Neue E-Mail
          </button>
        </div>

        {/* Folders */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
              Ordner
            </p>
            <div className="space-y-1">
              {FOLDERS.map((folder) => {
                const Icon = folder.icon;
                const isActive = selectedFolder === folder.id && !showStarredOnly;
                const count = folder.id === 'INBOX' ? stats.unread : 0;

                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolder(folder.id);
                      setShowStarredOnly(false);
                      setSelectedEmail(null);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-accent text-white"
                        : "text-text-secondary hover:bg-surface-primary hover:text-text-primary"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{folder.label}</span>
                    {count > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.5 text-xs rounded-full",
                        isActive ? "bg-white/20" : "bg-accent/10 text-accent"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Starred */}
              <button
                onClick={() => {
                  setShowStarredOnly(true);
                  setSelectedFolder('INBOX'); // Reset folder so emails view is shown
                  setSelectedEmail(null);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  showStarredOnly
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:bg-surface-primary hover:text-text-primary"
                )}
              >
                <Star className="w-4 h-4" />
                <span className="flex-1 text-left">Markiert</span>
                {stats.starred > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 text-xs rounded-full",
                    showStarredOnly ? "bg-white/20" : "bg-accent/10 text-accent"
                  )}>
                    {stats.starred}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Accounts */}
          {accounts.length > 0 && (
            <div className="px-3 py-2 mt-2 border-t border-border">
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
                Konten
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedAccountId(null)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    selectedAccountId === null
                      ? "bg-surface-primary text-text-primary"
                      : "text-text-secondary hover:bg-surface-primary hover:text-text-primary"
                  )}
                >
                  <Mail className="w-4 h-4" />
                  <span>Alle Konten</span>
                </button>
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                      selectedAccountId === account.id
                        ? "bg-surface-primary text-text-primary"
                        : "text-text-secondary hover:bg-surface-primary hover:text-text-primary"
                    )}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />
                    <span className="truncate">{account.display_name || account.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email List - Desktop only */}
      <div className="hidden md:flex w-80 border-r border-border flex-shrink-0 flex-col bg-surface-primary">
        {/* List Header */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="E-Mails durchsuchen..."
                className="input pl-9 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={handleSync}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
              title="Synchronisieren"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              {selectedFolder === 'Drafts'
                ? `${drafts.length} Entwurf${drafts.length !== 1 ? 'ürfe' : ''}`
                : `${total} E-Mail${total !== 1 ? 's' : ''}`}
            </span>
            {showStarredOnly && <span className="text-accent">Nur markierte</span>}
          </div>
        </div>

        {/* Email/Drafts List */}
        <div className="flex-1 overflow-y-auto">
          {/* Drafts folder - only show when not in starred mode */}
          {selectedFolder === 'Drafts' && !showStarredOnly ? (
            draftsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                <FileText className="w-12 h-12 mb-3 opacity-30" />
                <p>Keine Entwürfe</p>
              </div>
            ) : (
              <div>
                {drafts.map((draft) => {
                  // Parse to_addresses for display
                  let toDisplay = 'Kein Empfänger';
                  try {
                    const parsed = draft.to_addresses ? JSON.parse(draft.to_addresses) : [];
                    toDisplay = Array.isArray(parsed) ? parsed.join(', ') : parsed;
                  } catch {
                    toDisplay = draft.to_addresses || 'Kein Empfänger';
                  }

                  return (
                    <button
                      key={draft.id}
                      onClick={() => {
                        // Open draft for editing
                        setEditDraft(draft);
                        setComposeMode('edit');
                        setShowCompose(true);
                      }}
                      className="w-full p-3 text-left border-b border-border transition-colors hover:bg-surface-secondary"
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                          style={{ backgroundColor: draft.account_color || '#3B82F6' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-sm truncate text-text-primary font-medium">
                              An: {toDisplay}
                            </span>
                            <span className="text-xs text-text-secondary flex-shrink-0">
                              {formatDate(draft.updated_at || draft.created_at)}
                            </span>
                          </div>
                          <p className="text-sm truncate text-text-secondary">
                            {draft.subject || '(Kein Betreff)'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Entwurf löschen?')) {
                              deleteDraft(draft.id);
                            }
                          }}
                          className="p-1 text-text-secondary hover:text-error transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          ) : emailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                <Mail className="w-12 h-12 mb-3 opacity-30" />
                <p>Keine E-Mails</p>
              </div>
            ) : (
              <div>
                {emails.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={cn(
                      "w-full p-3 text-left border-b border-border transition-colors",
                      selectedEmail?.id === email.id
                        ? "bg-accent/10"
                        : "hover:bg-surface-secondary",
                      !email.is_read && "bg-surface-secondary"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                        style={{ backgroundColor: getAccountColor(email.account_id) }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className={cn(
                            "text-sm truncate",
                            !email.is_read ? "font-semibold text-text-primary" : "text-text-secondary"
                          )}>
                            {email.from_name || email.from_address}
                          </span>
                          <span className="text-xs text-text-secondary flex-shrink-0">
                            {formatDate(email.date)}
                          </span>
                        </div>
                        <p className={cn(
                          "text-sm truncate",
                          !email.is_read ? "font-medium text-text-primary" : "text-text-secondary"
                        )}>
                          {email.subject || '(Kein Betreff)'}
                        </p>
                        <p className="text-xs text-text-secondary truncate mt-0.5">
                          {email.snippet}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        {email.is_starred ? (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        ) : null}
                        {email.has_attachments ? (
                          <span className="text-xs">📎</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Email Detail */}
      <div className="flex-1 flex flex-col bg-surface-primary overflow-hidden">
        {selectedEmailLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : selectedEmail ? (
          <>
            {/* Detail Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => {
                    setSelectedEmail(null);
                    setShowMobileDetail(false);
                  }}
                  className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold text-text-primary flex-1 truncate">
                  {selectedEmail.subject || '(Kein Betreff)'}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleStar(selectedEmail.id)}
                    disabled={starToggleLoading}
                    className={cn(
                      "p-2 transition-colors",
                      starToggleLoading
                        ? "opacity-50 cursor-not-allowed"
                        : "text-text-secondary hover:text-yellow-500"
                    )}
                  >
                    <Star className={cn(
                      "w-5 h-5",
                      selectedEmail.is_starred && "text-yellow-500 fill-yellow-500"
                    )} />
                  </button>
                  <button
                    onClick={() => deleteEmail(selectedEmail.id)}
                    className="p-2 text-text-secondary hover:text-error transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-medium">
                  {(selectedEmail.from_name || selectedEmail.from_address || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary">
                    {selectedEmail.from_name || selectedEmail.from_address}
                  </p>
                  <p className="text-sm text-text-secondary truncate">
                    An: {selectedEmail.to_addresses}
                  </p>
                </div>
                <span className="text-sm text-text-secondary">
                  {new Date(selectedEmail.date).toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedEmail.body_html ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(selectedEmail.body_html, {
                      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'img', 'table', 'tr', 'td', 'th', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'pre', 'code'],
                      ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target']
                    })
                  }}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-text-primary font-sans">
                  {selectedEmail.body_text || 'Kein Inhalt'}
                </pre>
              )}

              {/* Thread */}
              {thread.length > 1 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm font-medium text-text-secondary mb-4">
                    Thread ({thread.length} E-Mails)
                  </p>
                  <div className="space-y-4">
                    {thread.filter(e => e.id !== selectedEmail.id).map((email) => (
                      <div
                        key={email.id}
                        className="p-4 bg-surface-secondary rounded-lg cursor-pointer hover:bg-surface-secondary/80"
                        onClick={() => loadEmail(email.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-text-primary text-sm">
                            {email.from_name || email.from_address}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {formatDate(email.date)}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary line-clamp-2">
                          {email.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="p-3 border-t border-border flex items-center gap-2">
              <button
                onClick={() => handleReply(selectedEmail)}
                className="btn btn-secondary"
              >
                <Reply className="w-4 h-4" />
                Antworten
              </button>
              <button
                onClick={() => handleReply(selectedEmail, true)}
                className="btn btn-secondary"
              >
                <ReplyAll className="w-4 h-4" />
                Allen antworten
              </button>
              <button
                onClick={() => handleForward(selectedEmail)}
                className="btn btn-secondary"
              >
                <Forward className="w-4 h-4" />
                Weiterleiten
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-secondary">
            <Mail className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg">Wähle eine E-Mail aus</p>
            <p className="text-sm mt-1">oder schreibe eine neue Nachricht</p>
            <button
              onClick={handleNewEmail}
              className="btn btn-primary mt-4"
            >
              <Plus className="w-4 h-4" />
              Neue E-Mail
            </button>
          </div>
        )}
      </div>

      {/* Mobile Bottom Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 bg-surface-primary border-t border-border p-2 flex items-center justify-around md:hidden",
        showMobileDetail && "hidden"
      )}>
        {FOLDERS.slice(0, 4).map((folder) => {
          const Icon = folder.icon;
          const isActive = selectedFolder === folder.id && !showStarredOnly;
          return (
            <button
              key={folder.id}
              onClick={() => {
                setSelectedFolder(folder.id);
                setShowStarredOnly(false);
              }}
              className={cn(
                "flex flex-col items-center gap-1 p-2",
                isActive ? "text-accent" : "text-text-secondary"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{folder.label}</span>
            </button>
          );
        })}
        <button
          onClick={handleNewEmail}
          className="flex flex-col items-center gap-1 p-2 text-accent"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs">Neu</span>
        </button>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          key={editDraft?.id || 'new'}
          mode={composeMode}
          replyTo={replyToEmail}
          editDraft={editDraft}
          accounts={accounts}
          defaultAccountId={selectedAccountId || accounts[0]?.id}
          onClose={() => {
            setShowCompose(false);
            setReplyToEmail(null);
            setEditDraft(null);
            refetchDrafts();
          }}
          onSent={() => {
            setShowCompose(false);
            setReplyToEmail(null);
            setEditDraft(null);
            refetch();
            refetchDrafts();
          }}
        />
      )}
    </div>
  );
}
