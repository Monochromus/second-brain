import { useState, useEffect } from 'react';
import { X, Briefcase, Heart, Home, BookOpen, Users, DollarSign, Dumbbell, GraduationCap, FolderOpen } from 'lucide-react';
import { cn } from '../../lib/utils';

const ICONS = [
  { id: 'briefcase', icon: Briefcase, label: 'Arbeit' },
  { id: 'heart', icon: Heart, label: 'Gesundheit' },
  { id: 'home', icon: Home, label: 'Zuhause' },
  { id: 'book', icon: BookOpen, label: 'Lernen' },
  { id: 'users', icon: Users, label: 'Familie' },
  { id: 'dollar', icon: DollarSign, label: 'Finanzen' },
  { id: 'dumbbell', icon: Dumbbell, label: 'Fitness' },
  { id: 'graduation', icon: GraduationCap, label: 'Bildung' },
  { id: 'folder', icon: FolderOpen, label: 'Sonstiges' }
];

const COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#0EA5E9', '#6B7280'
];

export default function AreaModal({ isOpen, onClose, area, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'folder',
    color: '#6366F1'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (area) {
      setFormData({
        name: area.name || '',
        description: area.description || '',
        icon: area.icon || 'folder',
        color: area.color || '#6366F1'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        icon: 'folder',
        color: '#6366F1'
      });
    }
  }, [area, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface rounded-xl shadow-xl border border-border animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            {area ? 'Bereich bearbeiten' : 'Neuer Bereich'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input"
              placeholder="z.B. Arbeit, Gesundheit, Familie"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Beschreibung
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input min-h-[80px] resize-none"
              placeholder="Worum geht es in diesem Bereich?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ICONS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, icon: id }))}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all flex items-center justify-center',
                    formData.icon === id
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  )}
                  title={label}
                >
                  <Icon className="w-5 h-5 text-text-primary" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Farbe
            </label>
            <div className="grid grid-cols-5 gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={cn(
                    'w-full aspect-square rounded-lg border-2 transition-all',
                    formData.color === color
                      ? 'border-text-primary scale-105'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="btn btn-primary flex-1"
            >
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
