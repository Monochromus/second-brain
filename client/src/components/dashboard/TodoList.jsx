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

  const { openTodos, doneTodos } = useMemo(() => {
    const open = todos.filter((t) => t.status !== 'done');
    const done = todos.filter((t) => t.status === 'done');
    return { openTodos: open, doneTodos: done };
  }, [todos]);

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
      const oldIndex = openTodos.findIndex((t) => t.id === active.id);
      const newIndex = openTodos.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(openTodos, oldIndex, newIndex);
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
          <button onClick={onAdd} className="btn btn-primary btn-sm py-1.5">
            <Plus className="w-4 h-4" />
            Neu
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
              items={openTodos.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {openTodos.map((todo) => (
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
            <span>Erledigte Todos ({doneTodos.length})</span>
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
