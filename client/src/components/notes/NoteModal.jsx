import { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '../shared/Modal';
import NoteEditor from './NoteEditor';
import { useProjects } from '../../hooks/useProjects';
import { useAreas } from '../../hooks/useAreas';
import { useResources } from '../../hooks/useResources';
import { useAutosave } from '../../hooks/useAutosave';
import { X, Plus, Folder, FolderOpen, BookOpen } from 'lucide-react';

const colorOptions = [
  { value: '', label: 'Standard' },
  { value: '#FEF3C7', label: 'Gelb' },
  { value: '#DBEAFE', label: 'Blau' },
  { value: '#D1FAE5', label: 'Grün' },
  { value: '#FCE7F3', label: 'Rosa' },
  { value: '#E9D5FF', label: 'Lila' },
  { value: '#FED7AA', label: 'Orange' }
];

// PARA: Notes belong to exactly ONE container (Project, Area, or Resource)
const CONTAINER_TYPES = [
  { value: 'none', label: 'Kein Container', icon: null },
  { value: 'project', label: 'Projekt', icon: Folder },
  { value: 'area', label: 'Area', icon: FolderOpen },
  { value: 'resource', label: 'Ressource', icon: BookOpen }
];

export default function NoteModal({ isOpen, onClose, note, onSave, defaultProjectId, defaultAreaId, defaultResourceId }) {
  const { projects } = useProjects({ status: 'active' });
  const { areas } = useAreas();
  const { resources } = useResources();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: [],
    color: '',
    project_id: '',
    area_id: '',
    resource_id: '',
    is_pinned: false
  });
  const [containerType, setContainerType] = useState('none');
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(note);

  const handleAutosave = useCallback(async (data) => {
    if (!data.title.trim()) return;
    await onSave({
      ...data,
      project_id: data.project_id || null,
      area_id: data.area_id || null,
      resource_id: data.resource_id || null,
      color: data.color || null
    });
  }, [onSave]);

  const { saveImmediately } = useAutosave(handleAutosave, 500);

  // Determine container type from existing data
  const determineContainerType = useCallback((projectId, areaId, resourceId) => {
    if (projectId) return 'project';
    if (areaId) return 'area';
    if (resourceId) return 'resource';
    return 'none';
  }, []);

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title || '',
        content: note.content || '',
        tags: note.tags || [],
        color: note.color || '',
        project_id: note.project_id || '',
        area_id: note.area_id || '',
        resource_id: note.resource_id || '',
        is_pinned: note.is_pinned || false
      });
      setContainerType(determineContainerType(note.project_id, note.area_id, note.resource_id));
    } else {
      setFormData({
        title: '',
        content: '',
        tags: [],
        color: '',
        project_id: defaultProjectId || '',
        area_id: defaultAreaId || '',
        resource_id: defaultResourceId || '',
        is_pinned: false
      });
      setContainerType(determineContainerType(defaultProjectId, defaultAreaId, defaultResourceId));
    }
    setTagInput('');
  }, [note, isOpen, defaultProjectId, defaultAreaId, defaultResourceId, determineContainerType]);

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
  };

  // PARA: When container type changes, clear all container IDs
  const handleContainerTypeChange = (newType) => {
    setContainerType(newType);
    setFormData(prev => ({
      ...prev,
      project_id: '',
      area_id: '',
      resource_id: ''
    }));
  };

  // Handle container ID selection
  const handleContainerIdChange = (value) => {
    const updates = { project_id: '', area_id: '', resource_id: '' };
    if (containerType === 'project') updates.project_id = value;
    else if (containerType === 'area') updates.area_id = value;
    else if (containerType === 'resource') updates.resource_id = value;
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Get current container ID based on type
  const currentContainerId = useMemo(() => {
    if (containerType === 'project') return formData.project_id;
    if (containerType === 'area') return formData.area_id;
    if (containerType === 'resource') return formData.resource_id;
    return '';
  }, [containerType, formData.project_id, formData.area_id, formData.resource_id]);

  const handleClose = async () => {
    if (isEditing && formData.title.trim()) {
      await saveImmediately(formData);
    }
    onClose();
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tag]
      });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tagToRemove)
    });
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      await onSave({
        ...formData,
        project_id: formData.project_id || null,
        area_id: formData.area_id || null,
        resource_id: formData.resource_id || null,
        color: formData.color || null
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={note ? 'Notiz bearbeiten' : 'Neue Notiz'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Titel *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className="input"
            placeholder="Titel der Notiz"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Inhalt</label>
          <NoteEditor
            content={formData.content}
            onChange={(content) => handleChange('content', content)}
            placeholder="Schreibe deine Notiz..."
          />
        </div>

        <div>
          <label className="label">Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-surface-secondary text-text-secondary text-sm rounded-full"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-error"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              className="input flex-1"
              placeholder="Tag hinzufügen..."
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="btn btn-secondary"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PARA: Exclusive container selection */}
        <div>
          <label className="label">Zuordnung (PARA)</label>
          <div className="flex gap-2 mb-2">
            {CONTAINER_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleContainerTypeChange(type.value)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    containerType === type.value
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border hover:border-accent/50 text-text-secondary'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {type.label}
                </button>
              );
            })}
          </div>

          {containerType !== 'none' && (
            <select
              value={currentContainerId}
              onChange={(e) => handleContainerIdChange(e.target.value)}
              className="input"
            >
              <option value="">
                {containerType === 'project' && 'Projekt wählen...'}
                {containerType === 'area' && 'Area wählen...'}
                {containerType === 'resource' && 'Ressource wählen...'}
              </option>
              {containerType === 'project' && projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
              {containerType === 'area' && areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
              {containerType === 'resource' && resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.title}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="label">Farbe</label>
          <div className="flex gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.value || 'default'}
                type="button"
                onClick={() => handleChange('color', color.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  formData.color === color.value
                    ? 'border-accent scale-110'
                    : 'border-transparent'
                }`}
                style={{
                  backgroundColor: color.value || 'var(--surface-secondary)'
                }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_pinned"
            checked={formData.is_pinned}
            onChange={(e) => handleChange('is_pinned', e.target.checked)}
            className="checkbox"
          />
          <label htmlFor="is_pinned" className="text-sm text-text-primary cursor-pointer">
            Notiz anheften
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={handleClose} className="btn btn-secondary">
            {isEditing ? 'Schließen' : 'Abbrechen'}
          </button>
          {!isEditing && (
            <button
              type="submit"
              disabled={!formData.title.trim() || saving}
              className="btn btn-primary"
            >
              {saving ? 'Erstelle...' : 'Erstellen'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
