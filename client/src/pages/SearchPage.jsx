import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  CheckCircle,
  FileText,
  Folder,
  FolderOpen,
  Library,
  CalendarDays,
  Home,
  ArrowLeft,
  X
} from 'lucide-react';
import { api } from '../lib/api';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import Breadcrumbs from '../components/shared/Breadcrumbs';
import { cn, formatRelativeDate, getStatusLabel } from '../lib/utils';

const TYPE_CONFIG = {
  project: {
    icon: Folder,
    label: 'Projekte',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-l-amber-500',
    textColor: 'text-amber-600 dark:text-amber-400'
  },
  todo: {
    icon: CheckCircle,
    label: 'Todos',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-l-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400'
  },
  note: {
    icon: FileText,
    label: 'Notizen',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-l-blue-500',
    textColor: 'text-blue-600 dark:text-blue-400'
  },
  area: {
    icon: FolderOpen,
    label: 'Areas',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-l-purple-500',
    textColor: 'text-purple-600 dark:text-purple-400'
  },
  resource: {
    icon: Library,
    label: 'Ressourcen',
    bgColor: 'bg-rose-50 dark:bg-rose-900/20',
    borderColor: 'border-l-rose-500',
    textColor: 'text-rose-600 dark:text-rose-400'
  },
  event: {
    icon: CalendarDays,
    label: 'Termine',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    borderColor: 'border-l-cyan-500',
    textColor: 'text-cyan-600 dark:text-cyan-400'
  }
};

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const searchQuery = searchParams.get('q');
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/search?q=${encodeURIComponent(searchQuery)}&limit=50`);
        setResults(response.results || []);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setSearchParams({ q: query.trim() });
    }
  };

  const handleResultClick = useCallback((result) => {
    switch (result.type) {
      case 'project':
        navigate(`/project/${result.id}`);
        break;
      case 'todo':
        result.project_id
          ? navigate(`/project/${result.project_id}`)
          : navigate('/');
        break;
      case 'note':
        result.project_id
          ? navigate(`/project/${result.project_id}`)
          : navigate('/');
        break;
      case 'area':
        navigate(`/area/${result.id}`);
        break;
      case 'resource':
        navigate('/resources');
        break;
      case 'event':
        navigate('/calendar');
        break;
      default:
        navigate('/');
    }
  }, [navigate]);

  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') return results;
    return results.filter(r => r.type === activeFilter);
  }, [results, activeFilter]);

  const groupedResults = useMemo(() => {
    return filteredResults.reduce((acc, result) => {
      const type = result.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(result);
      return acc;
    }, {});
  }, [filteredResults]);

  const typeCounts = useMemo(() => {
    return results.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});
  }, [results]);

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/', icon: Home },
    { label: `Suche: "${searchParams.get('q') || ''}"` }
  ];

  return (
    <div>
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="heading-1">Suchergebnisse</h1>
        </div>

        <form onSubmit={handleSubmit} className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen..."
            className="w-full pl-12 pr-12 py-3 text-lg bg-surface border border-border rounded-xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSearchParams({});
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>

      <div className="notebook-divider" />

      {results.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 font-sans">
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm transition-colors",
              activeFilter === 'all'
                ? "bg-accent text-white"
                : "bg-surface-secondary text-text-secondary hover:text-text-primary"
            )}
          >
            Alle ({results.length})
          </button>
          {Object.entries(TYPE_CONFIG).map(([type, config]) => {
            const count = typeCounts[type] || 0;
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5",
                  activeFilter === type
                    ? "bg-accent text-white"
                    : "bg-surface-secondary text-text-secondary hover:text-text-primary"
                )}
              >
                <config.icon className="w-3.5 h-3.5" />
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!loading && !searchParams.get('q') && (
        <div className="notebook-section text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-secondary flex items-center justify-center">
            <Search className="w-8 h-8 text-text-secondary" />
          </div>
          <h2 className="heading-3 mb-2">Wonach suchst du?</h2>
          <p className="text-text-secondary">
            Gib einen Suchbegriff ein, um Projekte, Todos, Notizen und mehr zu finden.
          </p>
        </div>
      )}

      {!loading && searchParams.get('q') && results.length === 0 && (
        <div className="notebook-section text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-secondary flex items-center justify-center">
            <Search className="w-8 h-8 text-text-secondary" />
          </div>
          <h2 className="heading-3 mb-2">Keine Ergebnisse</h2>
          <p className="text-text-secondary">
            Keine Ergebnisse fuer "{searchParams.get('q')}" gefunden. Versuche einen anderen Suchbegriff.
          </p>
        </div>
      )}

      {!loading && filteredResults.length > 0 && (
        <div className="space-y-8">
          {Object.entries(groupedResults).map(([type, items]) => {
            const config = TYPE_CONFIG[type];
            if (!config) return null;
            const Icon = config.icon;

            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={cn("w-5 h-5", config.textColor)} />
                  <h2 className="heading-3">{config.label}</h2>
                  <span className="text-sm text-text-secondary">({items.length})</span>
                </div>

                <div className="grid gap-3">
                  {items.map(result => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border-l-4 transition-all",
                        config.bgColor,
                        config.borderColor,
                        "hover:shadow-md hover:scale-[1.01]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-text-primary truncate">
                            {result.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {result.project_name && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-sans"
                                style={{
                                  backgroundColor: result.project_color ? `${result.project_color}20` : 'var(--surface-secondary)',
                                  color: result.project_color || 'var(--text-secondary)'
                                }}
                              >
                                {result.project_name}
                              </span>
                            )}
                            {result.area_name && !result.project_name && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-sans"
                                style={{
                                  backgroundColor: result.area_color ? `${result.area_color}20` : 'var(--surface-secondary)',
                                  color: result.area_color || 'var(--text-secondary)'
                                }}
                              >
                                {result.area_name}
                              </span>
                            )}
                            {result.type === 'todo' && result.status && (
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-sans",
                                result.status === 'done' && "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
                                result.status === 'open' && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                                result.status === 'in_progress' && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                              )}>
                                {getStatusLabel(result.status)}
                              </span>
                            )}
                            {result.type === 'event' && result.start_time && (
                              <span className="text-xs text-text-secondary font-sans">
                                {formatRelativeDate(result.start_time)}
                              </span>
                            )}
                            {result.type === 'resource' && result.category && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-surface text-text-secondary font-sans">
                                {result.category}
                              </span>
                            )}
                          </div>
                        </div>
                        {result.type === 'project' && result.color && (
                          <span
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: result.color }}
                          />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
