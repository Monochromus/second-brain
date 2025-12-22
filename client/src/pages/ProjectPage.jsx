import { useState } from 'react';
import { useParams } from 'react-router-dom';
import ProjectDetail from '../components/projects/ProjectDetail';
import ProjectModal from '../components/projects/ProjectModal';
import TodoModal from '../components/todos/TodoModal';
import NoteModal from '../components/notes/NoteModal';
import ConfirmDialog from '../components/shared/ConfirmDialog';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { useProject } from '../hooks/useProjects';
import { useTodos } from '../hooks/useTodos';
import { useNotes } from '../hooks/useNotes';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export default function ProjectPage() {
  const { id } = useParams();
  const { project, todos, notes, events, loading, refetch } = useProject(id);

  const [projectModal, setProjectModal] = useState(false);
  const [todoModal, setTodoModal] = useState({ open: false, todo: null });
  const [noteModal, setNoteModal] = useState({ open: false, note: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, id: null });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">Projekt nicht gefunden</p>
      </div>
    );
  }

  const handleSaveProject = async (data) => {
    try {
      await api.put(`/projects/${id}`, data);
      toast.success('Projekt aktualisiert');
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleTodo = async (todoId) => {
    try {
      await api.put(`/todos/${todoId}/complete`);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveTodo = async (data) => {
    try {
      if (todoModal.todo) {
        await api.put(`/todos/${todoModal.todo.id}`, data);
      } else {
        await api.post('/todos', { ...data, project_id: parseInt(id) });
      }
      toast.success(todoModal.todo ? 'Todo aktualisiert' : 'Todo erstellt');
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveNote = async (data) => {
    try {
      if (noteModal.note) {
        await api.put(`/notes/${noteModal.note.id}`, data);
      } else {
        await api.post('/notes', { ...data, project_id: parseInt(id) });
      }
      toast.success(noteModal.note ? 'Notiz aktualisiert' : 'Notiz erstellt');
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleNotePin = async (noteId) => {
    try {
      await api.put(`/notes/${noteId}/pin`);
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleConfirmDelete = async () => {
    const { type, id: itemId } = deleteConfirm;
    try {
      if (type === 'todo') {
        await api.delete(`/todos/${itemId}`);
        toast.success('Todo gelöscht');
      }
      if (type === 'note') {
        await api.delete(`/notes/${itemId}`);
        toast.success('Notiz gelöscht');
      }
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <ProjectDetail
        project={project}
        todos={todos}
        notes={notes}
        events={events}
        onEditProject={() => setProjectModal(true)}
        onToggleTodo={handleToggleTodo}
        onEditTodo={(todo) => setTodoModal({ open: true, todo })}
        onDeleteTodo={(todoId) => setDeleteConfirm({ open: true, type: 'todo', id: todoId })}
        onEditNote={(note) => setNoteModal({ open: true, note })}
        onDeleteNote={(noteId) => setDeleteConfirm({ open: true, type: 'note', id: noteId })}
        onToggleNotePin={handleToggleNotePin}
        onAddTodo={() => setTodoModal({ open: true, todo: null })}
        onAddNote={() => setNoteModal({ open: true, note: null })}
      />

      <ProjectModal
        isOpen={projectModal}
        onClose={() => setProjectModal(false)}
        project={project}
        onSave={handleSaveProject}
      />

      <TodoModal
        isOpen={todoModal.open}
        onClose={() => setTodoModal({ open: false, todo: null })}
        todo={todoModal.todo}
        onSave={handleSaveTodo}
      />

      <NoteModal
        isOpen={noteModal.open}
        onClose={() => setNoteModal({ open: false, note: null })}
        note={noteModal.note}
        onSave={handleSaveNote}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, type: null, id: null })}
        onConfirm={handleConfirmDelete}
        title="Löschen bestätigen"
        message={`Möchtest du ${
          deleteConfirm.type === 'todo' ? 'dieses Todo' : 'diese Notiz'
        } wirklich löschen?`}
        confirmText="Löschen"
      />
    </>
  );
}
