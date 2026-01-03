import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import {
  X,
  Send,
  Save,
  Trash2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Loader2,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { useEmailDrafts } from '../../hooks/useEmails';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

function ToolbarButton({ onClick, active, disabled, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-accent text-white'
          : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}

export default function ComposeModal({
  mode = 'new', // 'new', 'reply', 'replyAll', 'forward', 'edit'
  replyTo = null,
  editDraft = null,
  accounts = [],
  defaultAccountId = null,
  onClose,
  onSent
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState(editDraft?.id || null);

  const { createDraft, updateDraft, sendDraft, deleteDraft } = useEmailDrafts();

  // Parse addresses from JSON string or array
  const parseAddresses = (addresses) => {
    if (!addresses) return '';
    if (Array.isArray(addresses)) return addresses.join(', ');
    try {
      const parsed = JSON.parse(addresses);
      return Array.isArray(parsed) ? parsed.join(', ') : parsed;
    } catch {
      return addresses;
    }
  };

  // Form state - initialize from editDraft if provided
  const [formData, setFormData] = useState(() => {
    if (editDraft) {
      return {
        account_id: editDraft.account_id || defaultAccountId,
        to: parseAddresses(editDraft.to_addresses),
        cc: parseAddresses(editDraft.cc_addresses),
        bcc: parseAddresses(editDraft.bcc_addresses),
        subject: editDraft.subject || ''
      };
    }
    return {
      account_id: defaultAccountId,
      to: '',
      cc: '',
      bcc: '',
      subject: ''
    };
  });

  const [showCc, setShowCc] = useState(!!editDraft?.cc_addresses);
  const [showBcc, setShowBcc] = useState(!!editDraft?.bcc_addresses);

  // Helper function to get initial content for editor
  const getInitialContent = () => {
    try {
      // If editing a draft, return empty - content will be set via useEffect after editor is ready
      if (mode === 'edit') {
        return '';
      }

      if (!replyTo || mode === 'new') return '';

      const dateStr = new Date(replyTo.date).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      if (mode === 'forward') {
        return `
          <br><br>
          <p>---------- Weitergeleitete Nachricht ----------</p>
          <p>Von: ${replyTo.from_name || replyTo.from_address}</p>
          <p>Datum: ${dateStr}</p>
          <p>Betreff: ${replyTo.subject || '(Kein Betreff)'}</p>
          <p>An: ${replyTo.to_addresses}</p>
          <br>
          ${replyTo.body_html || `<pre>${replyTo.body_text || ''}</pre>`}
        `;
      }

      // Reply
      return `
        <br><br>
        <p>Am ${dateStr} schrieb ${replyTo.from_name || replyTo.from_address}:</p>
        <blockquote style="border-left: 2px solid #ccc; padding-left: 1rem; margin-left: 0;">
          ${replyTo.body_html || `<pre>${replyTo.body_text || ''}</pre>`}
        </blockquote>
      `;
    } catch (err) {
      console.error('Error in getInitialContent:', err);
      return '';
    }
  };

  // Editor setup - MUST be defined before any useEffect that references it
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Schreibe deine Nachricht...'
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-accent underline'
        }
      })
    ],
    content: getInitialContent(),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none dark:prose-invert p-4 min-h-[200px] focus:outline-none'
      }
    }
  });

  // Update editor content when it becomes available (for editing existing drafts)
  useEffect(() => {
    if (editor && mode === 'edit' && editDraft?.body_html) {
      // Use a small delay to ensure editor is fully ready
      const timeoutId = setTimeout(() => {
        if (editor && !editor.isDestroyed) {
          try {
            editor.commands.setContent(editDraft.body_html);
          } catch (err) {
            console.error('Error setting editor content:', err);
          }
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [editor, mode, editDraft?.body_html]);

  // Initialize form based on mode (for reply/forward)
  useEffect(() => {
    if (replyTo && mode !== 'new' && mode !== 'edit') {
      const account = accounts.find(a => a.id === replyTo.account_id) || accounts[0];

      if (mode === 'reply' || mode === 'replyAll') {
        // Reply to sender
        let toAddresses = replyTo.from_address;

        // For reply all, include all original recipients except self
        if (mode === 'replyAll') {
          const allRecipients = [
            replyTo.to_addresses,
            replyTo.cc_addresses
          ].filter(Boolean).join(', ');

          // Filter out own email
          const ownEmail = account?.email?.toLowerCase();
          const recipients = allRecipients
            .split(',')
            .map(e => e.trim())
            .filter(e => e.toLowerCase() !== ownEmail);

          if (recipients.length > 0) {
            toAddresses = [toAddresses, ...recipients].join(', ');
          }
        }

        setFormData({
          account_id: account?.id,
          to: toAddresses,
          cc: '',
          bcc: '',
          subject: replyTo.subject?.startsWith('Re:')
            ? replyTo.subject
            : `Re: ${replyTo.subject || ''}`
        });
      } else if (mode === 'forward') {
        setFormData({
          account_id: account?.id,
          to: '',
          cc: '',
          bcc: '',
          subject: replyTo.subject?.startsWith('Fwd:')
            ? replyTo.subject
            : `Fwd: ${replyTo.subject || ''}`
        });
      }
    }
  }, [mode, replyTo, accounts, defaultAccountId]);

  // Add link
  const addLink = () => {
    const url = window.prompt('URL eingeben:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (!formData.account_id) {
      toast.error('Bitte wähle ein Konto aus');
      return;
    }

    setSavingDraft(true);
    try {
      const draftData = {
        account_id: formData.account_id,
        to_addresses: formData.to,
        cc_addresses: formData.cc || null,
        bcc_addresses: formData.bcc || null,
        subject: formData.subject,
        body_html: editor?.getHTML() || '',
        body_text: editor?.getText() || '',
        in_reply_to_id: replyTo?.id || null
      };

      if (draftId) {
        await updateDraft(draftId, draftData);
      } else {
        const draft = await createDraft(draftData);
        setDraftId(draft.id);
      }
      toast.success('Entwurf gespeichert');
    } catch (err) {
      // Error handled by hook
    } finally {
      setSavingDraft(false);
    }
  };

  // Send email
  const handleSend = async () => {
    if (!formData.account_id) {
      toast.error('Bitte wähle ein Konto aus');
      return;
    }
    if (!formData.to?.trim()) {
      toast.error('Bitte gib einen Empfänger an');
      return;
    }

    setSending(true);
    try {
      // First save as draft if not already saved
      let currentDraftId = draftId;
      if (!currentDraftId) {
        const draftData = {
          account_id: formData.account_id,
          to_addresses: formData.to,
          cc_addresses: formData.cc || null,
          bcc_addresses: formData.bcc || null,
          subject: formData.subject,
          body_html: editor?.getHTML() || '',
          body_text: editor?.getText() || '',
          in_reply_to_id: replyTo?.id || null
        };
        const draft = await createDraft(draftData);
        currentDraftId = draft.id;
      } else {
        // Update draft before sending
        await updateDraft(currentDraftId, {
          account_id: formData.account_id,
          to_addresses: formData.to,
          cc_addresses: formData.cc || null,
          bcc_addresses: formData.bcc || null,
          subject: formData.subject,
          body_html: editor?.getHTML() || '',
          body_text: editor?.getText() || ''
        });
      }

      // Send the draft
      await sendDraft(currentDraftId);
      onSent?.();
    } catch (err) {
      // Error handled by hook
    } finally {
      setSending(false);
    }
  };

  // Discard draft
  const handleDiscard = async () => {
    // Only delete if this is a newly created draft (not editing an existing one)
    if (draftId && !editDraft) {
      try {
        await deleteDraft(draftId);
      } catch {
        // Ignore error
      }
    }
    onClose();
  };

  // Get title based on mode
  const getTitle = () => {
    switch (mode) {
      case 'reply':
        return 'Antworten';
      case 'replyAll':
        return 'Allen antworten';
      case 'forward':
        return 'Weiterleiten';
      case 'edit':
        return 'Entwurf bearbeiten';
      default:
        return 'Neue E-Mail';
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-surface border border-border rounded-lg shadow-lg z-50">
        <div className="flex items-center gap-3 px-4 py-2">
          <span className="text-sm font-medium text-text-primary">
            {formData.subject || getTitle()}
          </span>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 text-text-secondary hover:text-text-primary"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDiscard}
            className="p-1 text-text-secondary hover:text-error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-text-primary">{getTitle()}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDiscard}
              className="p-2 text-text-secondary hover:text-text-primary rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3 border-b border-border">
            {/* From */}
            <div className="flex items-center gap-3">
              <label className="w-16 text-sm text-text-secondary">Von:</label>
              <select
                value={formData.account_id || ''}
                onChange={(e) => setFormData({ ...formData, account_id: parseInt(e.target.value) })}
                className="input flex-1"
              >
                <option value="">Konto wählen...</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.display_name || account.email} ({account.email})
                  </option>
                ))}
              </select>
            </div>

            {/* To */}
            <div className="flex items-center gap-3">
              <label className="w-16 text-sm text-text-secondary">An:</label>
              <input
                type="text"
                value={formData.to}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                className="input flex-1"
                placeholder="empfaenger@email.de"
              />
              {!showCc && !showBcc && (
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => setShowCc(true)}
                    className="text-accent hover:underline"
                  >
                    Cc
                  </button>
                  <button
                    onClick={() => setShowBcc(true)}
                    className="text-accent hover:underline"
                  >
                    Bcc
                  </button>
                </div>
              )}
            </div>

            {/* Cc */}
            {showCc && (
              <div className="flex items-center gap-3">
                <label className="w-16 text-sm text-text-secondary">Cc:</label>
                <input
                  type="text"
                  value={formData.cc}
                  onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                  className="input flex-1"
                  placeholder="cc@email.de"
                />
              </div>
            )}

            {/* Bcc */}
            {showBcc && (
              <div className="flex items-center gap-3">
                <label className="w-16 text-sm text-text-secondary">Bcc:</label>
                <input
                  type="text"
                  value={formData.bcc}
                  onChange={(e) => setFormData({ ...formData, bcc: e.target.value })}
                  className="input flex-1"
                  placeholder="bcc@email.de"
                />
              </div>
            )}

            {/* Subject */}
            <div className="flex items-center gap-3">
              <label className="w-16 text-sm text-text-secondary">Betreff:</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="input flex-1"
                placeholder="Betreff"
              />
            </div>
          </div>

          {/* Editor Toolbar */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-surface-secondary">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive('bold')}
              title="Fett"
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive('italic')}
              title="Kursiv"
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive('bulletList')}
              title="Aufzählung"
            >
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive('orderedList')}
              title="Nummerierte Liste"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={addLink}
              active={editor?.isActive('link')}
              title="Link einfügen"
            >
              <LinkIcon className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* Editor Content */}
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="p-4 min-h-[200px] text-text-secondary">
              Editor lädt...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-secondary">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSend}
              disabled={sending || !formData.to?.trim()}
              className="btn btn-primary"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sende...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Senden
                </>
              )}
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="btn btn-secondary"
            >
              {savingDraft ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Entwurf
            </button>
          </div>
          <button
            onClick={handleDiscard}
            className="btn btn-secondary text-error hover:bg-error/10"
          >
            <Trash2 className="w-4 h-4" />
            Verwerfen
          </button>
        </div>
      </div>
    </div>
  );
}
