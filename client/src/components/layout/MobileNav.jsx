import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Calendar, FolderOpen, Wrench } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { path: '/', icon: Home, label: 'Home', exact: true },
  { path: '/projects', icon: LayoutGrid, label: 'Projekte' },
  { path: '/areas', icon: FolderOpen, label: 'Bereiche' },
  { path: '/tools', icon: Wrench, label: 'Tools' },
  { path: '/calendar', icon: Calendar, label: 'Kalender' },
];

export default function MobileNav() {
  const location = useLocation();

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full px-2 transition-colors",
                active
                  ? "text-accent"
                  : "text-text-secondary"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "scale-110 transition-transform")} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
