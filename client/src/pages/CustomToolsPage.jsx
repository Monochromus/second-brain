import { useState, useMemo } from 'react';
import { Wrench } from 'lucide-react';
import { useCustomTools } from '../hooks/useCustomTools';
import { useAgent } from '../hooks/useAgent';
import ToolDesigner from '../components/customTools/ToolDesigner';
import ToolCard from '../components/customTools/ToolCard';
import ToolExecutionView from '../components/customTools/ToolExecutionView';
import ToolModal from '../components/customTools/ToolModal';
import ConfirmDialog from '../components/shared/ConfirmDialog';

export default function CustomToolsPage() {
  const {
    tools,
    loading,
    limits,
    generateTool,
    executeTool,
    updateTool,
    deleteTool,
    updateParameters,
    subscribeTool,
    unsubscribeTool
  } = useCustomTools();

  // Agent integration for refresh
  const refreshCallbacks = useMemo(() => ({}), []);
  useAgent(refreshCallbacks);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [editModal, setEditModal] = useState({ open: false, tool: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [executionView, setExecutionView] = useState({ open: false, tool: null });

  // Handle tool generation
  const handleGenerate = async (description, name) => {
    setIsGenerating(true);
    try {
      await generateTool(description, name);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle tool execution
  const handleExecute = async (toolId, parameters) => {
    // Find the tool to open execution view
    const tool = tools.find(t => t.id === toolId);
    if (tool) {
      setExecutionView({ open: true, tool });
    }
    return executeTool(toolId, parameters);
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

  // Handle regenerate
  const handleRegenerate = async (toolId, description) => {
    await updateTool(toolId, { description, regenerate: true });
  };

  // Loading state
  if (loading && tools.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="h-48 skeleton rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Custom Tools</h1>
        <p className="text-text-secondary">
          Erstelle eigene Widgets und Tools mit natürlicher Sprache
        </p>
      </div>

      {/* Tool Designer */}
      <div className="mb-8">
        <ToolDesigner
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          limits={limits}
        />
      </div>

      {/* Tools Gallery */}
      {tools.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-secondary flex items-center justify-center">
            <Wrench className="w-8 h-8 text-text-secondary" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Noch keine Custom Tools
          </h2>
          <p className="text-text-secondary max-w-md mx-auto">
            Beschreibe oben, was du brauchst, und lasse dir ein eigenes Widget generieren.
            Probiere es mit einem der Beispiele!
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Deine Tools ({tools.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map(tool => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onExecute={handleExecute}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteConfirm({ open: true, id })}
                onRegenerate={handleRegenerate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Execution View Modal */}
      {executionView.open && executionView.tool && (
        <ToolExecutionView
          tool={executionView.tool}
          onClose={() => setExecutionView({ open: false, tool: null })}
          onExecute={executeTool}
          onUpdateParameters={updateParameters}
          subscribeTool={subscribeTool}
          unsubscribeTool={unsubscribeTool}
        />
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
