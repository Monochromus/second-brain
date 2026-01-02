import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Brain, Search, Settings, LogOut, User, Calendar, Wrench, ChevronDown, CheckCircle, FileText, Folder, FolderOpen, Library, Home, LayoutGrid } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import ThemeToggle from '../shared/ThemeToggle';
import { cn } from '../../lib/utils';

// Navigation items configuration
const navItems = [
  { path: '/', icon: Home, label: 'Dashboard', exact: true },
  { path: '/projects', icon: LayoutGrid, label: 'Projekte', alsoMatch: '/project' },
  { path: '/areas', icon: FolderOpen, label: 'Areas', alsoMatch: '/area' },
  { path: '/resources', icon: Library, label: 'Ressourcen' },
  { path: '/tools', icon: Wrench, label: 'Tools' },
  { path: '/calendar', icon: Calendar, label: 'Kalender' },
];

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.get(`/search?q=${encodeURIComponent(searchQuery)}&limit=8`);
        setSearchResults(response.results || []);
        setShowResults(true);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = useCallback((result) => {
    setShowResults(false);
    setSearchQuery('');
    if (result.type === 'project') {
      navigate(`/project/${result.id}`);
    } else if (result.type === 'todo') {
      navigate('/');
    } else if (result.type === 'note') {
      navigate('/');
    } else if (result.type === 'area') {
      navigate('/areas');
    } else if (result.type === 'resource') {
      navigate('/resources');
    }
  }, [navigate]);

  const handleKeyDown = (e) => {
    if (!showResults || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleResultClick(searchResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowResults(false);
      inputRef.current?.blur();
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'project': return <Folder className="w-4 h-4" />;
      case 'todo': return <CheckCircle className="w-4 h-4" />;
      case 'note': return <FileText className="w-4 h-4" />;
      case 'area': return <FolderOpen className="w-4 h-4" />;
      case 'resource': return <Library className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Check if a nav item is active
  const isNavActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    if (location.pathname.startsWith(item.path)) {
      return true;
    }
    // Also check singular paths (e.g., /area/1 should highlight /areas)
    if (item.alsoMatch && location.pathname.startsWith(item.alsoMatch)) {
      return true;
    }
    return false;
  };

  return (
    <header className="sticky top-0 z-40 glass-strong border-b border-glass-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-text-primary">Pocket Assistent</span>
          </Link>

          <div ref={searchRef} className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <div className="relative w-full">
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                isSearching ? "text-accent animate-pulse" : "text-text-secondary"
              )} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                placeholder="Projekte, Todos, Notizen suchen..."
                className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-transparent rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>

            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 glass overflow-hidden z-50 animate-slide-down">
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      index === selectedIndex
                        ? "bg-accent/10 text-accent"
                        : "hover:bg-surface-secondary"
                    )}
                  >
                    <span className={cn(
                      "flex-shrink-0",
                      result.type === 'project' && "text-accent",
                      result.type === 'todo' && (result.status === 'done' ? "text-success" : "text-text-secondary"),
                      result.type === 'note' && "text-blue-500"
                    )}>
                      {getIcon(result.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {result.title}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {result.category}
                      </p>
                    </div>
                    {result.type === 'project' && result.color && (
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: result.color }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}

            {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
              <div className="absolute top-full left-0 right-0 mt-2 glass p-4 z-50">
                <p className="text-sm text-text-secondary text-center">
                  Keine Ergebnisse für "{searchQuery}"
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Navigation Items */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isNavActive(item);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      active
                        ? "bg-accent/10 text-accent"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-secondary"
                    )}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                );
              })}
            </nav>

            <div className="hidden md:block w-px h-6 bg-border mx-2" />

            <ThemeToggle />

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-all"
              >
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:inline text-sm font-medium text-text-primary">
                  {user?.name || user?.email?.split('@')[0]}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 glass py-1 z-20 animate-slide-down">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {user?.name || 'Benutzer'}
                      </p>
                      <p className="text-xs text-text-secondary truncate">{user?.email}</p>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-surface-secondary transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Einstellungen
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-surface-secondary transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Ausloggen
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
