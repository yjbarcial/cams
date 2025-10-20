# Updated Supabase Database Schema for CAMS

This document outlines the complete database schema needed to support all features in the CAMS application, including project management, version control, comments, and highlight comments.

## Core Tables

### 1. Projects Table

```sql
CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT DEFAULT '',
  status TEXT DEFAULT 'In Progress',
  project_type TEXT NOT NULL CHECK (project_type IN ('magazine', 'newsletter', 'folio', 'other')),
  section_head TEXT,
  writers TEXT,
  artists TEXT,
  due_date DATE,
  due_date_iso TIMESTAMPTZ,
  media_uploaded TEXT,
  is_starred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_modified TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_projects_type ON projects(project_type);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
```

### 2. Project History Table

```sql
CREATE TABLE project_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_type TEXT DEFAULT 'draft' CHECK (version_type IN ('draft', 'published', 'major', 'minor', 'restoration')),
  change_description TEXT,
  author TEXT NOT NULL,
  project_data JSONB NOT NULL,
  metadata JSONB,
  is_active BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_project_history_project_id ON project_history(project_id);
CREATE INDEX idx_project_history_created_at ON project_history(created_at DESC);
CREATE INDEX idx_project_history_is_active ON project_history(is_active);
CREATE INDEX idx_project_history_version_number ON project_history(project_id, version_number);
```

### 3. Project Comments Table

```sql
CREATE TABLE project_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for better performance
CREATE INDEX idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX idx_project_comments_created_at ON project_comments(created_at DESC);
CREATE INDEX idx_project_comments_is_approved ON project_comments(is_approved);
```

### 4. Version Comments Table

```sql
CREATE TABLE version_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_history_id UUID REFERENCES project_history(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for better performance
CREATE INDEX idx_version_comments_history_id ON version_comments(project_history_id);
CREATE INDEX idx_version_comments_created_at ON version_comments(created_at DESC);
```

### 5. Highlight Comments Table

```sql
CREATE TABLE highlight_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  highlighted_text TEXT NOT NULL,
  text_range JSONB NOT NULL, -- {index: number, length: number}
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for better performance
CREATE INDEX idx_highlight_comments_project_id ON highlight_comments(project_id);
CREATE INDEX idx_highlight_comments_created_at ON highlight_comments(created_at DESC);
```

## Row Level Security (RLS) Policies

### Enable RLS on all tables

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE version_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlight_comments ENABLE ROW LEVEL SECURITY;
```

### Projects Table Policies

```sql
-- Users can view all projects
CREATE POLICY "Users can view all projects" ON projects FOR SELECT USING (true);

-- Users can insert projects
CREATE POLICY "Users can insert projects" ON projects FOR INSERT WITH CHECK (true);

-- Users can update projects they created or are assigned to
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE
USING (created_by = auth.uid() OR section_head = auth.email());

-- Users can delete projects they created
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE
USING (created_by = auth.uid());
```

### Project History Table Policies

```sql
-- Users can view all project history
CREATE POLICY "Users can view all project history" ON project_history FOR SELECT USING (true);

-- Users can insert project history
CREATE POLICY "Users can insert project history" ON project_history FOR INSERT WITH CHECK (true);

-- Users can update project history
CREATE POLICY "Users can update project history" ON project_history FOR UPDATE USING (true);

-- Users can delete project history
CREATE POLICY "Users can delete project history" ON project_history FOR DELETE USING (true);
```

### Comments Tables Policies

```sql
-- Project Comments
CREATE POLICY "Users can view all project comments" ON project_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert project comments" ON project_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own project comments" ON project_comments FOR UPDATE
USING (created_by = auth.uid());
CREATE POLICY "Users can delete own project comments" ON project_comments FOR DELETE
USING (created_by = auth.uid());

-- Version Comments
CREATE POLICY "Users can view all version comments" ON version_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert version comments" ON version_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own version comments" ON version_comments FOR UPDATE
USING (created_by = auth.uid());
CREATE POLICY "Users can delete own version comments" ON version_comments FOR DELETE
USING (created_by = auth.uid());

-- Highlight Comments
CREATE POLICY "Users can view all highlight comments" ON highlight_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert highlight comments" ON highlight_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own highlight comments" ON highlight_comments FOR UPDATE
USING (created_by = auth.uid());
CREATE POLICY "Users can delete own highlight comments" ON highlight_comments FOR DELETE
USING (created_by = auth.uid());
```

## Functions and Triggers

### Update updated_at timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to projects table
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Get project statistics function

```sql
CREATE OR REPLACE FUNCTION get_project_statistics(project_id_param BIGINT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalVersions', COALESCE(ph_stats.total_versions, 0),
        'totalComments', COALESCE(pc_stats.total_comments, 0),
        'totalVersionComments', COALESCE(vc_stats.total_comments, 0),
        'totalHighlightComments', COALESCE(hc_stats.total_comments, 0),
        'averageWordsPerVersion', COALESCE(ph_stats.avg_words, 0),
        'versionTypes', COALESCE(ph_stats.version_types, '{}'::json),
        'lastVersion', ph_stats.last_version,
        'firstVersion', ph_stats.first_version
    ) INTO result
    FROM (
        SELECT
            COUNT(*) as total_versions,
            AVG((metadata->>'wordCount')::int) as avg_words,
            json_object_agg(version_type, version_count) as version_types,
            (SELECT json_build_object('id', id, 'versionNumber', version_number, 'timestamp', created_at)
             FROM project_history
             WHERE project_id = project_id_param AND is_deleted = false
             ORDER BY created_at DESC LIMIT 1) as last_version,
            (SELECT json_build_object('id', id, 'versionNumber', version_number, 'timestamp', created_at)
             FROM project_history
             WHERE project_id = project_id_param AND is_deleted = false
             ORDER BY created_at ASC LIMIT 1) as first_version
        FROM (
            SELECT version_type, COUNT(*) as version_count
            FROM project_history
            WHERE project_id = project_id_param AND is_deleted = false
            GROUP BY version_type
        ) vc
        CROSS JOIN project_history ph
        WHERE ph.project_id = project_id_param AND ph.is_deleted = false
    ) ph_stats
    CROSS JOIN (
        SELECT COUNT(*) as total_comments
        FROM project_comments
        WHERE project_id = project_id_param
    ) pc_stats
    CROSS JOIN (
        SELECT COUNT(*) as total_comments
        FROM version_comments vc
        JOIN project_history ph ON vc.project_history_id = ph.id
        WHERE ph.project_id = project_id_param
    ) vc_stats
    CROSS JOIN (
        SELECT COUNT(*) as total_comments
        FROM highlight_comments
        WHERE project_id = project_id_param
    ) hc_stats;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

## Migration from localStorage

### Migration Script

```sql
-- This would be run as a one-time migration script
-- to move data from localStorage to Supabase

-- Example migration for projects (would need to be adapted based on actual localStorage structure)
INSERT INTO projects (id, title, description, content, status, project_type, section_head, writers, artists, due_date, due_date_iso, media_uploaded, is_starred, created_at, updated_at)
SELECT
    (data->>'id')::bigint as id,
    data->>'title' as title,
    data->>'description' as description,
    data->>'content' as content,
    data->>'status' as status,
    data->>'type' as project_type,
    data->>'sectionHead' as section_head,
    data->>'writers' as writers,
    data->>'artists' as artists,
    (data->>'dueDateISO')::timestamptz as due_date,
    data->>'dueDateISO' as due_date_iso,
    data->>'mediaUploaded' as media_uploaded,
    (data->>'isStarred')::boolean as is_starred,
    (data->>'createdAtISO')::timestamptz as created_at,
    NOW() as updated_at
FROM json_to_recordset($1::json) AS data(id text, title text, description text, content text, status text, type text, sectionHead text, writers text, artists text, dueDateISO text, mediaUploaded text, isStarred text, createdAtISO text);
```

## API Endpoints (Optional)

If you want to create API endpoints for the frontend:

```sql
-- Create a view for project details with statistics
CREATE VIEW project_details AS
SELECT
    p.*,
    get_project_statistics(p.id) as statistics,
    COUNT(pc.id) as comment_count,
    COUNT(hc.id) as highlight_comment_count
FROM projects p
LEFT JOIN project_comments pc ON p.id = pc.project_id
LEFT JOIN highlight_comments hc ON p.id = hc.project_id
GROUP BY p.id;

-- Grant access to the view
GRANT SELECT ON project_details TO authenticated;
```

## Summary

This schema supports:

1. **Project Management**: Full CRUD operations for projects
2. **Version Control**: Complete project history with versioning
3. **Comments System**: Both project-level and version-level comments
4. **Highlight Comments**: Text-specific comments with range tracking
5. **User Management**: Integration with Supabase Auth
6. **Security**: Row-level security policies
7. **Performance**: Proper indexing for fast queries
8. **Statistics**: Built-in functions for project analytics

The schema is designed to be backward compatible with your current localStorage structure while providing the scalability and features needed for a production application.
