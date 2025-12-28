const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/secondbrain.db');

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`Created database directory: ${dbDir}`);
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      settings TEXT DEFAULT '{}'
    );

    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#D97706',
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'completed')),
      deadline DATETIME,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Todos table
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority INTEGER DEFAULT 3 CHECK(priority >= 1 AND priority <= 5),
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'done', 'cancelled')),
      due_date DATE,
      due_time TEXT,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    -- Notes table
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT,
      color TEXT,
      tags TEXT DEFAULT '[]',
      is_pinned INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Calendar events cache table
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      external_id TEXT,
      calendar_source TEXT CHECK(calendar_source IN ('outlook', 'icloud', 'local')),
      title TEXT NOT NULL,
      description TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      location TEXT,
      is_all_day INTEGER DEFAULT 0,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Item links table for connections between items
    CREATE TABLE IF NOT EXISTS item_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL CHECK(source_type IN ('todo', 'note', 'event')),
      source_id INTEGER NOT NULL,
      target_type TEXT NOT NULL CHECK(target_type IN ('todo', 'note', 'event', 'project')),
      target_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_type, source_id, target_type, target_id)
    );

    -- Calendar connections table
    CREATE TABLE IF NOT EXISTS calendar_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK(provider IN ('outlook', 'icloud')),
      calendar_url TEXT,
      credentials TEXT,
      is_active INTEGER DEFAULT 1,
      last_sync DATETIME
    );

    -- Areas table (PARA: Areas of Responsibility)
    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'folder',
      color TEXT DEFAULT '#6366F1',
      is_archived INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Resources table (PARA: Resources/Knowledge Base)
    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT,
      url TEXT,
      tags TEXT DEFAULT '[]',
      category TEXT,
      is_archived INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Custom Tools table (user-generated widgets)
    CREATE TABLE IF NOT EXISTS custom_tools (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      generated_code TEXT,
      parameters_schema TEXT DEFAULT '{}',
      current_parameters TEXT DEFAULT '{}',
      last_result TEXT,
      last_result_at DATETIME,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'generating', 'ready', 'error')),
      error_message TEXT,
      execution_count INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);
    CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(project_id);
    CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
    CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
    CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);
    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events(start_time, end_time);
    CREATE INDEX IF NOT EXISTS idx_areas_user ON areas(user_id);
    CREATE INDEX IF NOT EXISTS idx_resources_user ON resources(user_id);
    CREATE INDEX IF NOT EXISTS idx_custom_tools_user ON custom_tools(user_id);
    CREATE INDEX IF NOT EXISTS idx_custom_tools_status ON custom_tools(status);
  `);

  console.log('Database initialized successfully');
}

// Run migrations for existing databases
function runMigrations() {
  // Check and add area_id to projects
  try {
    db.prepare('SELECT area_id FROM projects LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE projects ADD COLUMN area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL');
    console.log('Migration: Added area_id to projects');
  }

  // Check and add area_id to todos
  try {
    db.prepare('SELECT area_id FROM todos LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE todos ADD COLUMN area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL');
    console.log('Migration: Added area_id to todos');
  }

  // Check and add area_id to notes
  try {
    db.prepare('SELECT area_id FROM notes LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE notes ADD COLUMN area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL');
    console.log('Migration: Added area_id to notes');
  }

  // Check and add is_archived to todos
  try {
    db.prepare('SELECT is_archived FROM todos LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE todos ADD COLUMN is_archived INTEGER DEFAULT 0');
    console.log('Migration: Added is_archived to todos');
  }

  // Check and add is_archived to notes
  try {
    db.prepare('SELECT is_archived FROM notes LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE notes ADD COLUMN is_archived INTEGER DEFAULT 0');
    console.log('Migration: Added is_archived to notes');
  }
}

function createTriggers() {
  db.exec(`
    -- Trigger to update updated_at on todos
    CREATE TRIGGER IF NOT EXISTS update_todos_timestamp
    AFTER UPDATE ON todos
    BEGIN
      UPDATE todos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    -- Trigger to update updated_at on notes
    CREATE TRIGGER IF NOT EXISTS update_notes_timestamp
    AFTER UPDATE ON notes
    BEGIN
      UPDATE notes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    -- Trigger to update updated_at on projects
    CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
    AFTER UPDATE ON projects
    BEGIN
      UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    -- Trigger to set completed_at when todo is done
    CREATE TRIGGER IF NOT EXISTS set_todo_completed_at
    AFTER UPDATE OF status ON todos
    WHEN NEW.status = 'done' AND OLD.status != 'done'
    BEGIN
      UPDATE todos SET completed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    -- Trigger to update updated_at on areas
    CREATE TRIGGER IF NOT EXISTS update_areas_timestamp
    AFTER UPDATE ON areas
    BEGIN
      UPDATE areas SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    -- Trigger to update updated_at on resources
    CREATE TRIGGER IF NOT EXISTS update_resources_timestamp
    AFTER UPDATE ON resources
    BEGIN
      UPDATE resources SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    -- Trigger to update updated_at on custom_tools
    CREATE TRIGGER IF NOT EXISTS update_custom_tools_timestamp
    AFTER UPDATE ON custom_tools
    BEGIN
      UPDATE custom_tools SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
}

initializeDatabase();
runMigrations();
createTriggers();

module.exports = db;
