import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumbs component for navigation
 * @param {Array} items - Array of { label: string, href?: string, icon?: Component }
 * Example: [
 *   { label: 'Dashboard', href: '/', icon: Home },
 *   { label: 'Projekte', href: '/projects' },
 *   { label: 'Mein Projekt' }  // Last item has no href
 * ]
 */
export default function Breadcrumbs({ items = [] }) {
  if (items.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm mb-4" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const Icon = item.icon;

        return (
          <div key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-text-secondary flex-shrink-0" />
            )}
            {isLast || !item.href ? (
              <span className="flex items-center gap-1.5 text-text-primary font-medium truncate max-w-[200px]">
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="flex items-center gap-1.5 text-text-secondary hover:text-accent transition-colors truncate max-w-[200px]"
              >
                {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
