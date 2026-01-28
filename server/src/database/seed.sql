-- Seed data for CAMS database

-- Insert departments
INSERT INTO departments (name, description) VALUES
('Editorial', 'Responsible for content creation and editing'),
('Design', 'Handles layout and visual design'),
('Marketing', 'Marketing and distribution'),
('Administration', 'Administrative oversight')
ON CONFLICT (name) DO NOTHING;

-- Insert positions
INSERT INTO positions (title, description, department_id, is_leadership) VALUES
('Chief Adviser', 'Overall project supervision', (SELECT id FROM departments WHERE name = 'Administration'), TRUE),
('Editor-in-Chief', 'Lead editor and content director', (SELECT id FROM departments WHERE name = 'Editorial'), TRUE),
('Section Head', 'Manages specific content section', (SELECT id FROM departments WHERE name = 'Editorial'), TRUE),
('Technical Editor', 'Technical and formatting review', (SELECT id FROM departments WHERE name = 'Editorial'), FALSE),
('Contributor', 'Content writer and creator', (SELECT id FROM departments WHERE name = 'Editorial'), FALSE),
('Archival Manager', 'Manages archive system', (SELECT id FROM departments WHERE name = 'Administration'), FALSE),
('Designer', 'Visual and layout design', (SELECT id FROM departments WHERE name = 'Design'), FALSE)
ON CONFLICT (title) DO NOTHING;

-- Insert sample admin user
INSERT INTO profiles (email, first_name, last_name, role, status, positions_id, department_id) VALUES
('admin@cams.edu', 'System', 'Administrator', 'admin', 'active', 
 (SELECT id FROM positions WHERE title = 'Chief Adviser'),
 (SELECT id FROM departments WHERE name = 'Administration'))
ON CONFLICT (email) DO NOTHING;

-- Insert sample editor
INSERT INTO profiles (email, first_name, last_name, role, status, positions_id, department_id) VALUES
('editor@cams.edu', 'Chief', 'Editor', 'editor', 'active',
 (SELECT id FROM positions WHERE title = 'Editor-in-Chief'),
 (SELECT id FROM departments WHERE name = 'Editorial'))
ON CONFLICT (email) DO NOTHING;

-- Insert sample section head
INSERT INTO profiles (email, first_name, last_name, role, status, positions_id, department_id) VALUES
('section@cams.edu', 'Section', 'Head', 'section_head', 'active',
 (SELECT id FROM positions WHERE title = 'Section Head'),
 (SELECT id FROM departments WHERE name = 'Editorial'))
ON CONFLICT (email) DO NOTHING;

-- Insert sample members
INSERT INTO profiles (email, first_name, last_name, role, status, positions_id, department_id) VALUES
('contributor1@cams.edu', 'John', 'Doe', 'member', 'active',
 (SELECT id FROM positions WHERE title = 'Contributor'),
 (SELECT id FROM departments WHERE name = 'Editorial')),
('contributor2@cams.edu', 'Jane', 'Smith', 'member', 'active',
 (SELECT id FROM positions WHERE title = 'Contributor'),
 (SELECT id FROM departments WHERE name = 'Editorial')),
('designer@cams.edu', 'Alice', 'Designer', 'member', 'active',
 (SELECT id FROM positions WHERE title = 'Designer'),
 (SELECT id FROM departments WHERE name = 'Design'))
ON CONFLICT (email) DO NOTHING;

-- Insert sample project
INSERT INTO projects (title, description, project_type, status, priority, start_date, due_date, created_by, section_head_id) VALUES
('Spring 2026 Magazine', 'Quarterly magazine for Spring semester', 'magazine', 'planning', 'high', 
 CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days',
 (SELECT id FROM profiles WHERE email = 'editor@cams.edu'),
 (SELECT id FROM profiles WHERE email = 'section@cams.edu'))
ON CONFLICT DO NOTHING;

-- Get the project id
DO $$
DECLARE
  project_id BIGINT;
  editor_id BIGINT;
  contributor1_id BIGINT;
  contributor2_id BIGINT;
BEGIN
  SELECT id INTO project_id FROM projects WHERE title = 'Spring 2026 Magazine';
  SELECT id INTO editor_id FROM profiles WHERE email = 'editor@cams.edu';
  SELECT id INTO contributor1_id FROM profiles WHERE email = 'contributor1@cams.edu';
  SELECT id INTO contributor2_id FROM profiles WHERE email = 'contributor2@cams.edu';
  
  -- Add project members
  INSERT INTO project_members (project_id, user_id, role, is_active) VALUES
  (project_id, editor_id, 'owner', TRUE),
  (project_id, contributor1_id, 'contributor', TRUE),
  (project_id, contributor2_id, 'contributor', TRUE)
  ON CONFLICT DO NOTHING;
  
  -- Add sample tasks
  INSERT INTO tasks (project_id, title, description, status, priority, created_by, assigned_to) VALUES
  (project_id, 'Article: Campus Life', 'Write article about campus life', 'todo', 'high', editor_id, contributor1_id),
  (project_id, 'Article: Student Achievements', 'Write about recent student achievements', 'todo', 'medium', editor_id, contributor2_id),
  (project_id, 'Cover Design', 'Create magazine cover design', 'todo', 'high', editor_id, NULL)
  ON CONFLICT DO NOTHING;
END $$;

COMMENT ON SCRIPT IS 'Initial seed data for CAMS system';
