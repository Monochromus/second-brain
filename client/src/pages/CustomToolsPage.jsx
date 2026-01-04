import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Info, AlertTriangle, Settings } from 'lucide-react';
import { useCustomTools } from '../hooks/useCustomTools';
import { useAgent } from '../hooks/useAgent';
import { useAuth } from '../hooks/useAuth';
import ToolContainer from '../components/customTools/ToolContainer';
import EmptyContainer from '../components/customTools/EmptyContainer';
import ToolModal from '../components/customTools/ToolModal';
import ConfirmDialog from '../components/shared/ConfirmDialog';

const MAX_CONTAINERS = 3;

export default function CustomToolsPage() {
  const { user } = useAuth();
  const {
    tools,
    loading,
    generateTool,
    executeTool,
    updateTool,
    deleteTool,
    updateParameters,
    refetch
  } = useCustomTools();

  // Check if user has own API key and which model is selected
  const hasOwnApiKey = Boolean(user?.settings?.openaiApiKey?.trim());
  const selectedModel = user?.settings?.openaiModel || 'gpt-4o-mini';
  const isBasicModel = !hasOwnApiKey || selectedModel === 'gpt-4o-mini' || selectedModel === 'gpt-5-nano';
  const showModelWarning = isBasicModel;

  // Agent integration for refresh - refetch widgets when agent creates/updates/deletes them
  const refetchWidgets = useCallback(() => {
    refetch();
  }, [refetch]);

  const refreshCallbacks = useMemo(() => ({
    widgets: refetchWidgets
  }), [refetchWidgets]);

  useAgent(refreshCallbacks);

  // UI state
  const [generatingIndex, setGeneratingIndex] = useState(null);
  const [editModal, setEditModal] = useState({ open: false, tool: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  // Handle tool generation from a specific container
  const handleGenerate = async (description, containerIndex) => {
    setGeneratingIndex(containerIndex);
    try {
      await generateTool(description);
    } finally {
      setGeneratingIndex(null);
    }
  };

  // Handle tool edit
  const handleEdit = (tool) => {
    setEditModal({ open: true, tool });
  };

  // Handle tool save
  const handleSave = async (data) => {
    if (editModal.tool) {
      await updateTool(editModal.tool.id, data);
    }
  };

  // Handle tool delete
  const handleDelete = async () => {
    if (deleteConfirm.id) {
      await deleteTool(deleteConfirm.id);
    }
  };

  // Handle tool update from polling (fallback when WebSocket doesn't work)
  const handleToolUpdate = useCallback((updatedTool) => {
    // Trigger a refetch to get the latest data
    refetch();
  }, [refetch]);

  // Calculate how many empty slots to show
  const emptySlots = Math.max(0, MAX_CONTAINERS - tools.length);

  // Loading state
  if (loading && tools.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-72 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Meine Tools</h1>
          <p className="text-text-secondary">
            Dein persönliches Dashboard mit eigenen Tools
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Info className="w-4 h-4" />
          {tools.length} / {MAX_CONTAINERS} Tools
        </div>
      </div>

      {/* Welcome Info */}
      <div className="mb-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-surface-secondary flex items-center justify-center">
          <Wrench className="w-6 h-6 text-text-secondary" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-1">
          Willkommen bei deinen Tools!
        </h2>
        <p className="text-text-secondary text-sm max-w-lg mx-auto">
          Klicke auf einen Container unten, um ein Tool zu erstellen.
          Beschreibe einfach, was du brauchst - z.B. einen Pomodoro-Timer, eine Weltuhr, einen Einheitenrechner, ein Kanban-Board oder einen Habit-Tracker.
        </p>
      </div>

      {/* Model Warning */}
      {showModelWarning && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-text-primary font-medium">
              Tipp für komplexe Tools
            </p>
            <p className="text-sm text-text-secondary mt-1">
              {!hasOwnApiKey
                ? 'Du nutzt aktuell das kostenlose Standardmodell (GPT-4o Mini). Für komplexere Tools wie interaktive Rechner oder aufwendige Widgets empfehlen wir ein leistungsstärkeres Modell.'
                : 'Du nutzt aktuell ein einfaches Modell. Für komplexere Tools empfehlen wir GPT-4.1 oder GPT-5.'
              }
            </p>
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline mt-2"
            >
              <Settings className="w-4 h-4" />
              {hasOwnApiKey ? 'Modell ändern' : 'Eigenen API-Key eingeben'}
            </Link>
          </div>
        </div>
      )}

      {/* Container Grid */}
      <div className="flex flex-col gap-6">
        {/* Existing Tools */}
        {tools.map((tool, index) => (
          <ToolContainer
            key={tool.id}
            tool={tool}
            onExecute={executeTool}
            onEdit={handleEdit}
            onDelete={(id) => setDeleteConfirm({ open: true, id })}
            onUpdateParameters={updateParameters}
            onToolUpdate={handleToolUpdate}
          />
        ))}

        {/* Empty Containers */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <EmptyContainer
            key={`empty-${index}`}
            containerIndex={tools.length + index}
            onGenerate={(desc) => handleGenerate(desc, tools.length + index)}
            isGenerating={generatingIndex === tools.length + index}
          />
        ))}
      </div>

      {/* Info when all containers are used */}
      {tools.length >= MAX_CONTAINERS && (
        <div className="mt-6 p-4 rounded-xl bg-surface-secondary border border-border text-center">
          <p className="text-text-secondary">
            Du hast alle {MAX_CONTAINERS} Tool-Plätze belegt. Lösche ein Tool, um ein neues zu erstellen.
          </p>
        </div>
      )}

      {/* Edit Modal */}
      <ToolModal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, tool: null })}
        tool={editModal.tool}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDelete}
        title="Tool löschen"
        message="Möchtest du dieses Tool wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmText="Löschen"
      />
    </div>
  );
}
