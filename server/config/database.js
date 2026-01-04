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
      refresh_interval INTEGER DEFAULT 0,
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

  // Check and add refresh_interval to custom_tools
  try {
    db.prepare('SELECT refresh_interval FROM custom_tools LIMIT 1').get();
  } catch {
    try {
      db.exec('ALTER TABLE custom_tools ADD COLUMN refresh_interval INTEGER DEFAULT 0');
      console.log('Migration: Added refresh_interval to custom_tools');
    } catch {
      // Table might not exist yet, that's ok
    }
  }

  // Check and add personal_api_key_hash to users
  try {
    db.prepare('SELECT personal_api_key_hash FROM users LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE users ADD COLUMN personal_api_key_hash TEXT');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_api_key_hash ON users(personal_api_key_hash) WHERE personal_api_key_hash IS NOT NULL');
    console.log('Migration: Added personal_api_key_hash to users');
  }

  // Check and add personal_api_key_created_at to users
  try {
    db.prepare('SELECT personal_api_key_created_at FROM users LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE users ADD COLUMN personal_api_key_created_at DATETIME');
    console.log('Migration: Added personal_api_key_created_at to users');
  }

  // Check and add area_id to resources
  try {
    db.prepare('SELECT area_id FROM resources LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE resources ADD COLUMN area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL');
    console.log('Migration: Added area_id to resources');
  }

  // Check and add icon to projects
  try {
    db.prepare('SELECT icon FROM projects LIMIT 1').get();
  } catch {
    db.exec("ALTER TABLE projects ADD COLUMN icon TEXT DEFAULT 'folder'");
    console.log('Migration: Added icon to projects');
  }

  // Check and add cover_image to areas
  try {
    db.prepare('SELECT cover_image FROM areas LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE areas ADD COLUMN cover_image TEXT');
    console.log('Migration: Added cover_image to areas');
  }

  // Check and add project_id to resources (legacy - will be replaced by junction table)
  try {
    db.prepare('SELECT project_id FROM resources LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE resources ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL');
    db.exec('CREATE INDEX IF NOT EXISTS idx_resources_project ON resources(project_id)');
    console.log('Migration: Added project_id to resources');
  }

  // Check and add resource_id to notes (PARA: Notes can belong to Resources)
  try {
    db.prepare('SELECT resource_id FROM notes LIMIT 1').get();
  } catch {
    db.exec('ALTER TABLE notes ADD COLUMN resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL');
    db.exec('CREATE INDEX IF NOT EXISTS idx_notes_resource ON notes(resource_id)');
    console.log('Migration: Added resource_id to notes');
  }

  // Create project_resources junction table (PARA: Resources can link to multiple Projects)
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, resource_id)
    );
    CREATE INDEX IF NOT EXISTS idx_project_resources_project ON project_resources(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_resources_resource ON project_resources(resource_id);
  `);
  console.log('Migration: Ensured project_resources junction table exists');

  // Create captures table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS captures (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      image_path TEXT,
      source TEXT DEFAULT 'shortcut' CHECK(source IN ('shortcut', 'web', 'share')),
      processed INTEGER DEFAULT 0,
      ai_result TEXT,
      created_note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL,
      created_todo_id INTEGER REFERENCES todos(id) ON DELETE SET NULL,
      created_event_id INTEGER REFERENCES calendar_events(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_captures_user ON captures(user_id);
    CREATE INDEX IF NOT EXISTS idx_captures_processed ON captures(processed);
  `);
  console.log('Migration: Ensured captures table exists');

  // Create email_accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      display_name TEXT,
      provider TEXT NOT NULL CHECK(provider IN ('icloud', 'gmail', 'outlook', 'gmx', 'custom')),
      encrypted_password TEXT NOT NULL,
      encryption_iv TEXT NOT NULL,
      encryption_auth_tag TEXT NOT NULL,
      imap_host TEXT NOT NULL,
      imap_port INTEGER DEFAULT 993,
      smtp_host TEXT NOT NULL,
      smtp_port INTEGER DEFAULT 587,
      color TEXT DEFAULT '#3B82F6',
      is_active INTEGER DEFAULT 1,
      last_sync DATETIME,
      last_sync_status TEXT,
      sync_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, email)
    );

    CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id);
  `);
  console.log('Migration: Ensured email_accounts table exists');

  // Migration: Add GMX to email_accounts provider constraint
  // Check if constraint needs updating by examining table SQL
  try {
    const tableSQL = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='email_accounts'").get();
    if (tableSQL && tableSQL.sql && !tableSQL.sql.includes("'gmx'")) {
      console.log('Migration: Updating email_accounts provider constraint to include gmx...');
      db.exec(`
        CREATE TABLE email_accounts_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          display_name TEXT,
          provider TEXT NOT NULL CHECK(provider IN ('icloud', 'gmail', 'outlook', 'gmx', 'custom')),
          encrypted_password TEXT NOT NULL,
          encryption_iv TEXT NOT NULL,
          encryption_auth_tag TEXT NOT NULL,
          imap_host TEXT NOT NULL,
          imap_port INTEGER DEFAULT 993,
          smtp_host TEXT NOT NULL,
          smtp_port INTEGER DEFAULT 587,
          color TEXT DEFAULT '#3B82F6',
          is_active INTEGER DEFAULT 1,
          last_sync DATETIME,
          last_sync_status TEXT,
          sync_error TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, email)
        );
        INSERT INTO email_accounts_new SELECT * FROM email_accounts;
        DROP TABLE email_accounts;
        ALTER TABLE email_accounts_new RENAME TO email_accounts;
        CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id);
      `);
      console.log('Migration: Provider constraint updated successfully');
    }
  } catch (e) {
    console.log('Migration: email_accounts constraint check skipped -', e.message);
  }

  // Create emails table (header cache)
  db.exec(`
    CREATE TABLE IF NOT EXISTS emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
      uid INTEGER NOT NULL,
      message_id TEXT,
      thread_id TEXT,
      folder TEXT DEFAULT 'INBOX',
      from_address TEXT NOT NULL,
      from_name TEXT,
      to_addresses TEXT,
      cc_addresses TEXT,
      subject TEXT,
      snippet TEXT,
      body_text TEXT,
      body_html TEXT,
      date DATETIME NOT NULL,
      is_read INTEGER DEFAULT 0,
      is_starred INTEGER DEFAULT 0,
      is_draft INTEGER DEFAULT 0,
      has_attachments INTEGER DEFAULT 0,
      in_reply_to TEXT,
      references_header TEXT,
      category TEXT CHECK(category IN ('important', 'newsletter', 'transactional', 'social', 'other')),
      needs_reply INTEGER DEFAULT 0,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(account_id, uid, folder)
    );

    CREATE INDEX IF NOT EXISTS idx_emails_account ON emails(account_id);
    CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(account_id, folder);
    CREATE INDEX IF NOT EXISTS idx_emails_date ON emails(date);
    CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id);
    CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category);
    CREATE INDEX IF NOT EXISTS idx_emails_unread ON emails(account_id, folder, is_read);
    CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id);
  `);
  console.log('Migration: Ensured emails table exists');

  // Create email_attachments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      content_type TEXT,
      size INTEGER,
      content_id TEXT,
      is_inline INTEGER DEFAULT 0,
      file_path TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_email_attachments_email ON email_attachments(email_id);
  `);
  console.log('Migration: Ensured email_attachments table exists');

  // Migration: Add color and name to calendar_connections
  try {
    db.prepare('SELECT color FROM calendar_connections LIMIT 1').get();
  } catch {
    db.exec("ALTER TABLE calendar_connections ADD COLUMN color TEXT DEFAULT '#14B8A6'");
    console.log('Migration: Added color to calendar_connections');
  }

  try {
    db.prepare('SELECT name FROM calendar_connections LIMIT 1').get();
  } catch {
    db.exec("ALTER TABLE calendar_connections ADD COLUMN name TEXT");
    // Set default names based on provider
    db.exec("UPDATE calendar_connections SET name = CASE provider WHEN 'outlook' THEN 'Outlook' WHEN 'icloud' THEN 'iCloud' ELSE provider END WHERE name IS NULL");
    console.log('Migration: Added name to calendar_connections');
  }

  // Create email_drafts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES email_accounts(id) ON DELETE SET NULL,
      to_addresses TEXT,
      cc_addresses TEXT,
      bcc_addresses TEXT,
      subject TEXT,
      body_html TEXT,
      body_text TEXT,
      in_reply_to_id INTEGER REFERENCES emails(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_email_drafts_user ON email_drafts(user_id);
    CREATE INDEX IF NOT EXISTS idx_email_drafts_account ON email_drafts(account_id);
  `);
  console.log('Migration: Ensured email_drafts table exists');
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

    -- Trigger to update updated_at on captures
    CREATE TRIGGER IF NOT EXISTS update_captures_timestamp
    AFTER UPDATE ON captures
    BEGIN
      UPDATE captures SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    -- Trigger to update updated_at on email_accounts
    CREATE TRIGGER IF NOT EXISTS update_email_accounts_timestamp
    AFTER UPDATE ON email_accounts
    BEGIN
      UPDATE email_accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    -- Trigger to update updated_at on email_drafts
    CREATE TRIGGER IF NOT EXISTS update_email_drafts_timestamp
    AFTER UPDATE ON email_drafts
    BEGIN
      UPDATE email_drafts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
}

initializeDatabase();
runMigrations();
createTriggers();

module.exports = db;
