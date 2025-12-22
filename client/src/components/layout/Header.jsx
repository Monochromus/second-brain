import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Search, Settings, LogOut, User, Calendar, ChevronDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import ThemeToggle from '../shared/ThemeToggle';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-text-primary">Second Brain</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suchen..."
                className="w-full pl-10 pr-4 py-2 bg-surface-secondary border border-transparent rounded-lg text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <Link
              to="/calendar"
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-all"
              title="Kalender"
            >
              <Calendar className="w-5 h-5" />
            </Link>

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
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg py-1 z-20 animate-slide-down">
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
