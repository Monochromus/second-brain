import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import Fuse from 'fuse.js';
import * as LucideIcons from 'lucide-react';

// Curated list of icons suitable for projects with German/English keywords
const ICON_LIST = [
  { name: 'folder', keywords: ['ordner', 'project', 'projekt', 'default'] },
  { name: 'briefcase', keywords: ['arbeit', 'work', 'job', 'business', 'büro'] },
  { name: 'code', keywords: ['programmierung', 'developer', 'software', 'coding'] },
  { name: 'palette', keywords: ['design', 'kunst', 'art', 'kreativ', 'farbe'] },
  { name: 'book-open', keywords: ['lernen', 'learning', 'education', 'buch', 'lesen'] },
  { name: 'music', keywords: ['musik', 'audio', 'sound', 'song'] },
  { name: 'camera', keywords: ['foto', 'photo', 'bild', 'image', 'kamera'] },
  { name: 'film', keywords: ['video', 'movie', 'film', 'kino'] },
  { name: 'home', keywords: ['haus', 'zuhause', 'house', 'wohnung'] },
  { name: 'heart', keywords: ['liebe', 'love', 'gesundheit', 'health', 'herz'] },
  { name: 'star', keywords: ['wichtig', 'favorite', 'favorit', 'stern'] },
  { name: 'target', keywords: ['ziel', 'goal', 'fokus', 'focus'] },
  { name: 'rocket', keywords: ['launch', 'start', 'startup', 'rakete'] },
  { name: 'lightbulb', keywords: ['idee', 'idea', 'innovation', 'lampe'] },
  { name: 'users', keywords: ['team', 'gruppe', 'group', 'leute', 'menschen'] },
  { name: 'graduation-cap', keywords: ['schule', 'uni', 'education', 'abschluss', 'studium'] },
  { name: 'dumbbell', keywords: ['fitness', 'sport', 'training', 'gym', 'hantel'] },
  { name: 'plane', keywords: ['reise', 'travel', 'urlaub', 'vacation', 'flug'] },
  { name: 'shopping-bag', keywords: ['einkauf', 'shopping', 'kauf', 'tasche'] },
  { name: 'dollar-sign', keywords: ['geld', 'money', 'finanzen', 'finance', 'euro'] },
  { name: 'calendar', keywords: ['termin', 'event', 'datum', 'date', 'kalender'] },
  { name: 'clock', keywords: ['zeit', 'time', 'uhr', 'stunde'] },
  { name: 'map', keywords: ['karte', 'ort', 'location', 'navigation'] },
  { name: 'globe', keywords: ['welt', 'world', 'international', 'erde'] },
  { name: 'coffee', keywords: ['kaffee', 'pause', 'break', 'cafe'] },
  { name: 'utensils', keywords: ['essen', 'food', 'kochen', 'cooking', 'küche'] },
  { name: 'gift', keywords: ['geschenk', 'present', 'birthday', 'geburtstag'] },
  { name: 'gamepad-2', keywords: ['spiel', 'game', 'gaming', 'spielen'] },
  { name: 'wrench', keywords: ['werkzeug', 'tool', 'reparatur', 'fix', 'basteln'] },
  { name: 'settings', keywords: ['einstellungen', 'config', 'setup', 'zahnrad'] },
  { name: 'sparkles', keywords: ['magic', 'special', 'neu', 'new', 'besonders'] },
  { name: 'zap', keywords: ['energie', 'energy', 'power', 'schnell', 'blitz'] },
  { name: 'award', keywords: ['preis', 'prize', 'auszeichnung', 'gewinn'] },
  { name: 'flag', keywords: ['flagge', 'milestone', 'meilenstein', 'ziel'] },
  { name: 'bookmark', keywords: ['marker', 'lesezeichen', 'save', 'speichern'] },
  { name: 'car', keywords: ['auto', 'fahrzeug', 'vehicle', 'fahren'] },
  { name: 'bike', keywords: ['fahrrad', 'bicycle', 'rad', 'cycling'] },
  { name: 'building', keywords: ['gebäude', 'firma', 'company', 'büro'] },
  { name: 'phone', keywords: ['telefon', 'handy', 'mobile', 'anruf'] },
  { name: 'mail', keywords: ['email', 'post', 'brief', 'nachricht'] },
  { name: 'pen-tool', keywords: ['schreiben', 'write', 'stift', 'zeichnen'] },
  { name: 'scissors', keywords: ['schneiden', 'cut', 'schere', 'basteln'] },
  { name: 'umbrella', keywords: ['regenschirm', 'wetter', 'weather', 'schutz'] },
  { name: 'sun', keywords: ['sonne', 'hell', 'bright', 'sommer'] },
  { name: 'moon', keywords: ['mond', 'nacht', 'night', 'schlaf'] },
  { name: 'cloud', keywords: ['wolke', 'wetter', 'weather', 'speicher'] },
  { name: 'tree-pine', keywords: ['baum', 'natur', 'nature', 'wald'] },
  { name: 'flower-2', keywords: ['blume', 'garten', 'garden', 'pflanze'] },
  { name: 'dog', keywords: ['hund', 'haustier', 'pet', 'tier'] },
  { name: 'cat', keywords: ['katze', 'haustier', 'pet', 'tier'] },
];

// Convert kebab-case to PascalCase for lucide-react
const toPascalCase = (str) =>
  str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');

export default function IconPicker({ value, onChange, onClose }) {
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const fuse = useMemo(() => new Fuse(ICON_LIST, {
    keys: ['name', 'keywords'],
    threshold: 0.3,
  }), []);

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return ICON_LIST;
    return fuse.search(search).map(result => result.item);
  }, [search, fuse]);

  const getIconComponent = (iconName) => {
    const pascalName = toPascalCase(iconName);
    return LucideIcons[pascalName] || LucideIcons.Folder;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-surface rounded-xl shadow-xl border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-text-primary font-sans">Icon auswählen</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:bg-surface-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Icon suchen (z.B. Auto, Arbeit, Sport...)"
              className="input pl-10"
            />
          </div>

          <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
            {filteredIcons.map(({ name }) => {
              const IconComponent = getIconComponent(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange(name);
                    onClose();
                  }}
                  className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center hover:scale-105 ${
                    value === name
                      ? 'border-accent bg-accent/10'
                      : 'border-transparent bg-surface-secondary hover:border-accent/50'
                  }`}
                  title={name}
                >
                  <IconComponent className="w-5 h-5 text-text-primary" />
                </button>
              );
            })}
          </div>

          {filteredIcons.length === 0 && (
            <p className="text-center text-text-secondary py-8">
              Keine Icons gefunden
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
