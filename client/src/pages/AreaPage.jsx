import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Home, FolderOpen, Plus, Pencil, LayoutGrid, Archive, Trash2,
  Briefcase, Heart, BookOpen, Users, DollarSign, Dumbbell, GraduationCap,
  Gamepad2, Sparkles, Target, Music, Plane, ShoppingBag, Wrench, Lightbulb,
  FileText, Library, ExternalLink, Tag
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';
import Breadcrumbs from '../components/shared/Breadcrumbs';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ProjectCard from '../components/projects/ProjectCard';
import ProjectModal from '../components/projects/ProjectModal';
import NoteCard from '../components/notes/NoteCard';
import NoteModal from '../components/notes/NoteModal';
import ResourceModal from '../components/resources/ResourceModal';
import AreaModal from '../components/areas/AreaModal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { api } from '../lib/api';
import { formatTimeAgo } from '../lib/utils';
import toast from 'react-hot-toast';

const ICONS = {
  briefcase: Briefcase,
  heart: Heart,
  home: Home,
  book: BookOpen,
  users: Users,
  dollar: DollarSign,
  dumbbell: Dumbbell,
  graduation: GraduationCap,
  gamepad: Gamepad2,
  sparkles: Sparkles,
  target: Target,
  music: Music,
  plane: Plane,
  shopping: ShoppingBag,
  wrench: Wrench,
  lightbulb: Lightbulb,
  folder: FolderOpen
};

export default function AreaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [area, setArea] = useState(null);
  const [projects, setProjects] = useState([]);
  const [notes, setNotes] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [areaModal, setAreaModal] = useState(false);
  const [projectModal, setProjectModal] = useState({ open: false, project: null });
  const [noteModal, setNoteModal] = useState({ open: false, note: null });
  const [resourceModal, setResourceModal] = useState({ open: false, resource: null });
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchArea = async () => {
    try {
      const data = await api.get(`/areas/${id}`);
      setArea(data);
      setNotes(data.notes || []);
      setResources(data.resources || []);
      // Projects from area endpoint don't have stats, fetch them separately
      if (data.projects && data.projects.length > 0) {
        const projectsData = await api.get('/projects');
        const areaProjects = projectsData.projects.filter(p => p.area_id === parseInt(id));
        setProjects(areaProjects);
      } else {
        setProjects([]);
      }
    } catch (err) {
      toast.error('Area nicht gefunden');
      navigate('/areas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArea();
  }, [id]);

  const handleSaveArea = async (data) => {
    try {
      await api.put(`/areas/${id}`, data);
      toast.success('Area aktualisiert');
      fetchArea();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteArea = async () => {
    try {
      await api.delete(`/areas/${id}`);
      toast.success('Area gelöscht');
      navigate('/areas');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveProject = async (data) => {
    try {
      if (projectModal.project) {
        await api.put(`/projects/${projectModal.project.id}`, data);
        toast.success('Projekt aktualisiert');
      } else {
        await api.post('/projects', { ...data, area_id: parseInt(id) });
        toast.success('Projekt erstellt');
      }
      fetchArea();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveNote = async (data) => {
    try {
      if (noteModal.note) {
        await api.put(`/notes/${noteModal.note.id}`, { ...data, area_id: parseInt(id) });
        toast.success('Notiz aktualisiert');
      } else {
        await api.post('/notes', { ...data, area_id: parseInt(id) });
        toast.success('Notiz erstellt');
      }
      fetchArea();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/notes/${noteId}`);
      toast.success('Notiz gelöscht');
      fetchArea();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTogglePin = async (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      try {
        await api.put(`/notes/${noteId}`, { is_pinned: !note.is_pinned });
        fetchArea();
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const handleSaveResource = async (data) => {
    try {
      if (resourceModal.resource) {
        await api.put(`/resources/${resourceModal.resource.id}`, { ...data, area_id: parseInt(id) });
        toast.success('Ressource aktualisiert');
      } else {
        await api.post('/resources', { ...data, area_id: parseInt(id) });
        toast.success('Ressource erstellt');
      }
      fetchArea();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!area) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">Area nicht gefunden</p>
      </div>
    );
  }

  const IconComponent = ICONS[area.icon] || FolderOpen;

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/', icon: Home },
    { label: 'Areas', href: '/areas', icon: FolderOpen },
    { label: area.name }
  ];

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />

      {/* Area Header */}
      <div className="notebook-section mb-6 overflow-hidden">
        {/* Cover Image */}
        {area.cover_image ? (
          <div className="h-32 w-full -mx-4 -mt-4 mb-4" style={{ marginLeft: 'calc(-1rem)', marginRight: 'calc(-1rem)', marginTop: 'calc(-1rem)', width: 'calc(100% + 2rem)' }}>
            <img
              src={`${API_BASE}${area.cover_image}`}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className="h-16 w-full -mx-4 -mt-4 mb-4"
            style={{
              marginLeft: 'calc(-1rem)',
              marginRight: 'calc(-1rem)',
              marginTop: 'calc(-1rem)',
              width: 'calc(100% + 2rem)',
              backgroundColor: `${area.color}20`
            }}
          />
        )}

        <div className="flex items-start justify-between p-2">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center -mt-12 border-4 border-surface-secondary bg-surface"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <IconComponent
                className="w-8 h-8"
                style={{ color: area.color }}
              />
            </div>
            <div>
              <h1 className="heading-1">{area.name}</h1>
              {area.description && (
                <p className="text-text-secondary mt-1">{area.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-text-secondary flex-wrap font-sans">
                <span>{projects.length} Projekte</span>
                <span>{notes.length} Notizen</span>
                <span>{resources.length} Ressourcen</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAreaModal(true)}
              className="btn btn-secondary"
            >
              <Pencil className="w-4 h-4" />
              Bearbeiten
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="btn btn-ghost text-error"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <LayoutGrid className="w-5 h-5" />
            Projekte in dieser Area
          </h2>
          <button
            onClick={() => setProjectModal({ open: true, project: null })}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Neues Projekt
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-surface-secondary flex items-center justify-center">
              <LayoutGrid className="w-6 h-6 text-text-secondary" />
            </div>
            <p className="text-text-secondary mb-4">
              Noch keine Projekte in dieser Area
            </p>
            <button
              onClick={() => setProjectModal({ open: true, project: null })}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Erstes Projekt erstellen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <Link key={project.id} to={`/project/${project.id}`}>
                <ProjectCard project={project} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Notizen in dieser Area
          </h2>
          <button
            onClick={() => setNoteModal({ open: true, note: null })}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Neue Notiz
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-surface-secondary flex items-center justify-center">
              <FileText className="w-6 h-6 text-text-secondary" />
            </div>
            <p className="text-text-secondary mb-4">
              Noch keine Notizen in dieser Area
            </p>
            <button
              onClick={() => setNoteModal({ open: true, note: null })}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Erste Notiz erstellen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={(n) => setNoteModal({ open: true, note: n })}
                onDelete={handleDeleteNote}
                onTogglePin={handleTogglePin}
              />
            ))}
          </div>
        )}
      </div>

      {/* Resources Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Library className="w-5 h-5" />
            Ressourcen in dieser Area
          </h2>
          <button
            onClick={() => setResourceModal({ open: true, resource: null })}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Neue Ressource
          </button>
        </div>

        {resources.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-surface-secondary flex items-center justify-center">
              <Library className="w-6 h-6 text-text-secondary" />
            </div>
            <p className="text-text-secondary mb-4">
              Noch keine Ressourcen in dieser Area
            </p>
            <button
              onClick={() => setResourceModal({ open: true, resource: null })}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Erste Ressource erstellen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map(resource => (
              <div
                key={resource.id}
                className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setResourceModal({ open: true, resource })}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-text-primary truncate hover:text-accent transition-colors">
                      {resource.title}
                    </h3>
                    {resource.category && (
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent mt-1">
                        {resource.category}
                      </span>
                    )}
                  </div>
                </div>

                {resource.content && (
                  <p className="text-sm text-text-secondary line-clamp-3 mb-3">
                    {resource.content}
                  </p>
                )}

                {resource.url && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline mb-3"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Link öffnen
                  </a>
                )}

                {resource.tags && resource.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {resource.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-text-secondary"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                    {resource.tags.length > 3 && (
                      <span className="text-xs text-text-secondary">
                        +{resource.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs text-text-secondary">
                  {formatTimeAgo(resource.updated_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <AreaModal
        isOpen={areaModal}
        onClose={() => setAreaModal(false)}
        area={area}
        onSave={handleSaveArea}
      />

      <ProjectModal
        isOpen={projectModal.open}
        onClose={() => setProjectModal({ open: false, project: null })}
        project={projectModal.project}
        onSave={handleSaveProject}
        defaultAreaId={parseInt(id)}
      />

      <NoteModal
        isOpen={noteModal.open}
        onClose={() => setNoteModal({ open: false, note: null })}
        note={noteModal.note}
        onSave={handleSaveNote}
      />

      <ResourceModal
        isOpen={resourceModal.open}
        onClose={() => setResourceModal({ open: false, resource: null })}
        resource={resourceModal.resource}
        onSave={handleSaveResource}
      />

      <ConfirmDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteArea}
        title="Area löschen"
        message="Möchtest du diese Area wirklich löschen? Zugeordnete Projekte werden nicht gelöscht."
        confirmText="Löschen"
      />
    </>
  );
}
