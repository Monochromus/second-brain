import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CheckCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import TodoItem from '../todos/TodoItem';
import { cn, groupBy, getPriorityLabel } from '../../lib/utils';

export default function TodoList({
  todos,
  loading,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
  onAdd
}) {
  const [activeId, setActiveId] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAllOpen, setShowAllOpen] = useState(false);

  const MAX_VISIBLE_TODOS = 10;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const { openTodos, doneTodos, visibleOpenTodos, hasMoreOpenTodos } = useMemo(() => {
    const open = todos.filter((t) => t.status !== 'done');
    const done = todos.filter((t) => t.status === 'done');
    const visible = showAllOpen ? open : open.slice(0, MAX_VISIBLE_TODOS);
    const hasMore = open.length > MAX_VISIBLE_TODOS;
    return { openTodos: open, doneTodos: done, visibleOpenTodos: visible, hasMoreOpenTodos: hasMore };
  }, [todos, showAllOpen]);

  const groupedTodos = useMemo(() => {
    const grouped = groupBy(openTodos, 'priority');
    return Object.entries(grouped)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([priority, items]) => ({
        priority: parseInt(priority),
        label: getPriorityLabel(parseInt(priority)),
        items
      }));
  }, [openTodos]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = visibleOpenTodos.findIndex((t) => t.id === active.id);
      const newIndex = visibleOpenTodos.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(visibleOpenTodos, oldIndex, newIndex);
        const updates = newOrder.map((todo, index) => ({
          id: todo.id,
          position: index
        }));
        onReorder(updates);
      }
    }
  };

  const activeTodo = activeId ? todos.find((t) => t.id === activeId) : null;

  if (loading) {
    return (
      <div className="notebook-section p-4">
        <div className="h-6 w-32 skeleton rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 skeleton rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="notebook-section">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-accent" />
            <h2 className="heading-3">Offene Todos</h2>
            <span className="text-sm text-text-secondary font-sans">({openTodos.length})</span>
          </div>
          <button
            onClick={onAdd}
            className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors"
            title="Neues Todo"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="notebook-divider mx-4" />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="p-4">
          {openTodos.length > 0 ? (
            <SortableContext
              items={visibleOpenTodos.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {visibleOpenTodos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isDragging={activeId === todo.id}
                  />
                ))}
              </div>
              {hasMoreOpenTodos && (
                <button
                  onClick={() => setShowAllOpen(!showAllOpen)}
                  className="w-full mt-3 py-2 flex items-center justify-center gap-1 text-sm text-text-secondary hover:text-accent hover:bg-surface-secondary rounded-lg transition-colors font-sans"
                >
                  {showAllOpen ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Weniger anzeigen
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      {openTodos.length - MAX_VISIBLE_TODOS} weitere anzeigen
                    </>
                  )}
                </button>
              )}
            </SortableContext>
          ) : (
            <p className="text-sm text-text-secondary text-center py-8">
              Alle Aufgaben erledigt!
            </p>
          )}
        </div>

        <DragOverlay>
          {activeTodo && (
            <TodoItem
              todo={activeTodo}
              onToggle={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      {doneTodos.length > 0 && (
        <div>
          <div className="notebook-divider mx-4" />
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm text-text-secondary hover:bg-surface-secondary transition-colors font-sans"
          >
            <span>Erledigt ({doneTodos.length})</span>
            {showCompleted ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showCompleted && (
            <div className="px-4 pb-4 space-y-2">
              {doneTodos.slice(0, 5).map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
