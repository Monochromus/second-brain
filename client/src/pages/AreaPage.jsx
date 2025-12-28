import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Home, FolderOpen, Plus, Pencil, LayoutGrid, Archive, Trash2,
  Briefcase, Heart, BookOpen, Users, DollarSign, Dumbbell, GraduationCap
} from 'lucide-react';
import Breadcrumbs from '../components/shared/Breadcrumbs';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import ProjectCard from '../components/projects/ProjectCard';
import ProjectModal from '../components/projects/ProjectModal';
import AreaModal from '../components/areas/AreaModal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import { api } from '../lib/api';
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
  folder: FolderOpen
};

export default function AreaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [area, setArea] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [areaModal, setAreaModal] = useState(false);
  const [projectModal, setProjectModal] = useState({ open: false, project: null });
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fetchArea = async () => {
    try {
      const data = await api.get(`/areas/${id}`);
      setArea(data);
      // Projects from area endpoint don't have stats, fetch them separately
      if (data.projects && data.projects.length > 0) {
        const projectsData = await api.get('/projects');
        const areaProjects = projectsData.projects.filter(p => p.area_id === parseInt(id));
        setProjects(areaProjects);
      } else {
        setProjects([]);
      }
    } catch (err) {
      toast.error('Bereich nicht gefunden');
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
      toast.success('Bereich aktualisiert');
      fetchArea();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteArea = async () => {
    try {
      await api.delete(`/areas/${id}`);
      toast.success('Bereich gelöscht');
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
        <p className="text-text-secondary">Bereich nicht gefunden</p>
      </div>
    );
  }

  const IconComponent = ICONS[area.icon] || FolderOpen;

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/', icon: Home },
    { label: 'Bereiche', href: '/areas', icon: FolderOpen },
    { label: area.name }
  ];

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />

      {/* Area Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${area.color}20` }}
            >
              <IconComponent
                className="w-8 h-8"
                style={{ color: area.color }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{area.name}</h1>
              {area.description && (
                <p className="text-text-secondary mt-1">{area.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-text-secondary">
                <span>{projects.length} Projekte</span>
                <span>{area.todo_count || 0} Todos</span>
                <span>{area.note_count || 0} Notizen</span>
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
            Projekte in diesem Bereich
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
              Noch keine Projekte in diesem Bereich
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

      <ConfirmDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteArea}
        title="Bereich löschen"
        message="Möchtest du diesen Bereich wirklich löschen? Zugeordnete Projekte werden nicht gelöscht."
        confirmText="Löschen"
      />
    </>
  );
}
