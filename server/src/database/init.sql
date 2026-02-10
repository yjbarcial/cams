-- Database initialization script for CAMS
-- This script creates all tables and relationships

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'editor', 'section_head', 'member', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('draft', 'planning', 'in_progress', 'review', 'completed', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'completed', 'blocked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE archive_category AS ENUM ('magazine', 'newsletter', 'folio', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_type AS ENUM ('magazine', 'newsletter', 'folio', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('owner', 'editor', 'contributor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name VARCHAR UNIQUE NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT UNIQUE NOT NULL,
  description TEXT,
  department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
  is_leadership BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_name TEXT,
  last_name TEXT,
  email VARCHAR UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  phone VARCHAR,
  positions_id BIGINT REFERENCES positions(id) ON DELETE SET NULL,
  department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
  last_active TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  role user_role DEFAULT 'member',
  status user_status DEFAULT 'active'
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title VARCHAR NOT NULL,
  description TEXT,
  project_type project_type,
  status project_status DEFAULT 'draft',
  priority priority_level,
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  section_head_id BIGINT REFERENCES profiles(id) ON DELETE SET NULL,
  created_by BIGINT REFERENCES profiles(id) ON DELETE SET NULL,
  is_starred BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members table
CREATE TABLE IF NOT EXISTS project_members (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES profiles(id) ON DELETE CASCADE,
  role member_role DEFAULT 'contributor',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  status task_status DEFAULT 'todo',
  priority priority_level,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by BIGINT REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to BIGINT REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  parent_comment_id BIGINT REFERENCES task_comments(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project comments table
CREATE TABLE IF NOT EXISTS project_comments (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES profiles(id) ON DELETE SET NULL,
  author VARCHAR NOT NULL,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id BIGINT REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR,
  reference_type VARCHAR,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ
);

-- Media files table
CREATE TABLE IF NOT EXISTS media_files (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name VARCHAR,
  url TEXT NOT NULL,
  mime_type VARCHAR,
  size BIGINT,
  category VARCHAR,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  task_id BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by BIGINT REFERENCES profiles(id) ON DELETE SET NULL
);

-- Archives table
CREATE TABLE IF NOT EXISTS archives (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category archive_category NOT NULL,
  publication_date DATE,
  publication_date_iso TIMESTAMPTZ,
  file_url TEXT NOT NULL,
  cover_image_url TEXT,
  authors TEXT,
  volume_issue TEXT,
  tags TEXT[],
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id BIGINT REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR,
  table_name VARCHAR,
  record_id UUID DEFAULT gen_random_uuid(),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT
);

-- Project history table
CREATE TABLE IF NOT EXISTS project_history (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  version_number BIGINT NOT NULL,
  change_description TEXT,
  author_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  project_data JSONB NOT NULL,
  metadata JSONB,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_archives_category ON archives(category);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_archives_updated_at BEFORE UPDATE ON archives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE departments IS 'Organizational departments';
COMMENT ON TABLE positions IS 'Job positions within departments';
COMMENT ON TABLE profiles IS 'User profiles and account information';
COMMENT ON TABLE projects IS 'Projects for content creation';
COMMENT ON TABLE tasks IS 'Tasks within projects';
COMMENT ON TABLE notifications IS 'User notifications';
COMMENT ON TABLE media_files IS 'File attachments for projects and tasks';
COMMENT ON TABLE archives IS 'Published archives (magazines, newsletters, etc.)';
COMMENT ON TABLE audit_logs IS 'Audit trail of all system changes';
