import { useState, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import AgentInput from '../agent/AgentInput';
import TodayCalendar from './TodayCalendar';
import TodoList from './TodoList';
import ProjectGrid from './ProjectGrid';
import NotesGrid from './NotesGrid';
import TodoModal from '../todos/TodoModal';
import NoteModal from '../notes/NoteModal';
import ProjectModal from '../projects/ProjectModal';
import ConfirmDialog from '../shared/ConfirmDialog';
import { useTodos } from '../../hooks/useTodos';
import { useNotes } from '../../hooks/useNotes';
import { useProjects } from '../../hooks/useProjects';
import { useCalendar } from '../../hooks/useCalendar';
import { useAgent } from '../../hooks/useAgent';

export default function Dashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  const {
    todos,
    loading: todosLoading,
    refetch: refetchTodos,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    reorderTodos
  } = useTodos();

  const {
    notes,
    loading: notesLoading,
    refetch: refetchNotes,
    createNote,
    updateNote,
    togglePin,
    deleteNote
  } = useNotes();

  const {
    projects,
    loading: projectsLoading,
    refetch: refetchProjects,
    createProject,
    updateProject,
    deleteProject
  } = useProjects({ status: 'active' });

  const {
    events,
    loading: eventsLoading,
    refetch: refetchEvents
  } = useCalendar({ start_date: today, end_date: nextWeek });

  const { sendMessage, isProcessing, lastResponse } = useAgent();

  const [todoModal, setTodoModal] = useState({ open: false, todo: null });
  const [noteModal, setNoteModal] = useState({ open: false, note: null });
  const [projectModal, setProjectModal] = useState({ open: false, project: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, id: null });

  const handleAgentMessage = useCallback(async (message) => {
    await sendMessage(message, (type) => {
      if (type === 'todos') refetchTodos();
      if (type === 'notes') refetchNotes();
      if (type === 'projects') refetchProjects();
      if (type === 'calendar') refetchEvents();
    });
  }, [sendMessage, refetchTodos, refetchNotes, refetchProjects, refetchEvents]);

  const handleSaveTodo = async (data) => {
    if (todoModal.todo) {
      await updateTodo(todoModal.todo.id, data);
    } else {
      await createTodo(data);
    }
  };

  const handleSaveNote = async (data) => {
    if (noteModal.note) {
      await updateNote(noteModal.note.id, data);
    } else {
      await createNote(data);
    }
  };

  const handleSaveProject = async (data) => {
    if (projectModal.project) {
      await updateProject(projectModal.project.id, data);
    } else {
      await createProject(data);
    }
  };

  const handleConfirmDelete = async () => {
    const { type, id } = deleteConfirm;
    if (type === 'todo') await deleteTodo(id);
    if (type === 'note') await deleteNote(id);
    if (type === 'project') await deleteProject(id);
  };

  const handleArchiveProject = async (id) => {
    await updateProject(id, { status: 'archived' });
  };

  return (
    <div>
      <AgentInput
        onSend={handleAgentMessage}
        isProcessing={isProcessing}
        lastResponse={lastResponse}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <TodayCalendar events={events} loading={eventsLoading} />

        <div className="lg:col-span-2">
          <TodoList
            todos={todos}
            loading={todosLoading}
            onToggle={toggleTodo}
            onEdit={(todo) => setTodoModal({ open: true, todo })}
            onDelete={(id) => setDeleteConfirm({ open: true, type: 'todo', id })}
            onReorder={reorderTodos}
            onAdd={() => setTodoModal({ open: true, todo: null })}
          />
        </div>
      </div>

      <div className="mb-6">
        <ProjectGrid
          projects={projects}
          loading={projectsLoading}
          onEdit={(project) => setProjectModal({ open: true, project })}
          onDelete={(id) => setDeleteConfirm({ open: true, type: 'project', id })}
          onArchive={handleArchiveProject}
          onAdd={() => setProjectModal({ open: true, project: null })}
        />
      </div>

      <NotesGrid
        notes={notes}
        loading={notesLoading}
        onEdit={(note) => setNoteModal({ open: true, note })}
        onDelete={(id) => setDeleteConfirm({ open: true, type: 'note', id })}
        onTogglePin={togglePin}
        onAdd={() => setNoteModal({ open: true, note: null })}
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

      <ProjectModal
        isOpen={projectModal.open}
        onClose={() => setProjectModal({ open: false, project: null })}
        project={projectModal.project}
        onSave={handleSaveProject}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, type: null, id: null })}
        onConfirm={handleConfirmDelete}
        title="Löschen bestätigen"
        message={`Möchtest du ${
          deleteConfirm.type === 'todo'
            ? 'dieses Todo'
            : deleteConfirm.type === 'note'
            ? 'diese Notiz'
            : 'dieses Projekt'
        } wirklich löschen?`}
        confirmText="Löschen"
      />
    </div>
  );
}
