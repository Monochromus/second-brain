import { useState } from 'react';
import { ArrowLeft, Calendar, CheckCircle, FileText, Edit, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn, formatDate, formatRelativeDate } from '../../lib/utils';
import TodoItem from '../todos/TodoItem';
import NoteCard from '../notes/NoteCard';

export default function ProjectDetail({
  project,
  todos,
  notes,
  events,
  onEditProject,
  onToggleTodo,
  onEditTodo,
  onDeleteTodo,
  onEditNote,
  onDeleteNote,
  onToggleNotePin,
  onAddTodo,
  onAddNote
}) {
  const [activeTab, setActiveTab] = useState('todos');

  if (!project) return null;

  const tabs = [
    { id: 'todos', label: 'Todos', icon: CheckCircle, count: todos?.length || 0 },
    { id: 'notes', label: 'Notizen', icon: FileText, count: notes?.length || 0 },
    { id: 'events', label: 'Termine', icon: Calendar, count: events?.length || 0 }
  ];

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Dashboard
        </Link>

        <div
          className="card p-6"
          style={{ borderTopColor: project.color, borderTopWidth: '4px' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-text-secondary mb-4">{project.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-text-secondary">
                <span
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    project.status === 'active' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                    project.status === 'completed' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    project.status === 'archived' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {project.status === 'active' && 'Aktiv'}
                  {project.status === 'completed' && 'Abgeschlossen'}
                  {project.status === 'archived' && 'Archiviert'}
                </span>
                {project.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Deadline: {formatDate(project.deadline)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onEditProject(project)}
              className="btn btn-secondary"
            >
              <Edit className="w-4 h-4" />
              Bearbeiten
            </button>
          </div>

          {project.stats && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-text-secondary mb-2">
                <span>Fortschritt</span>
                <span>{project.stats.progress}%</span>
              </div>
              <div className="h-3 bg-surface-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${project.stats.progress}%`,
                    backgroundColor: project.color
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className="px-1.5 py-0.5 text-xs bg-surface-secondary rounded-full">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'todos' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={onAddTodo} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Neues Todo
            </button>
          </div>
          {todos && todos.length > 0 ? (
            <div className="space-y-2">
              {todos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={onToggleTodo}
                  onEdit={onEditTodo}
                  onDelete={onDeleteTodo}
                  showProject={false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-text-secondary">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Keine Todos in diesem Projekt</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={onAddNote} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Neue Notiz
            </button>
          </div>
          {notes && notes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={onEditNote}
                  onDelete={onDeleteNote}
                  onTogglePin={onToggleNotePin}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-text-secondary">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Keine Notizen in diesem Projekt</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div>
          {events && events.length > 0 ? (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="card p-4 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-text-primary">{event.title}</h4>
                    <p className="text-sm text-text-secondary">
                      {formatRelativeDate(event.start_time)}
                      {event.location && ` • ${event.location}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-text-secondary">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Keine Termine mit diesem Projekt verknüpft</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
