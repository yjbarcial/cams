-- =====================================================
-- Supabase Profiles Table Setup
-- =====================================================
-- Run this in your Supabase SQL Editor to ensure the profiles table is set up correctly

-- 1. Create ENUM types if they don't exist
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

-- 2. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_name TEXT,
  last_name TEXT,
  email VARCHAR UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  phone VARCHAR,
  positions_id BIGINT,
  department_id BIGINT,
  last_active TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  role user_role DEFAULT 'member',
  status user_status DEFAULT 'active'
);

-- 3. If the table exists but doesn't have the role column, add it
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN role user_role DEFAULT 'member';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 4. If the table exists but doesn't have the status column, add it
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN status user_status DEFAULT 'active';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 5. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Create policies for profiles table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Users can view all profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
USING (true);

-- Users can insert their own profile (authenticated users)
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Admins can update any profile
CREATE POLICY "Admins can update any profile" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE email = auth.jwt()->>'email'
    AND role = 'admin'
  )
);

-- 7. Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 8. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE profiles_id_seq TO authenticated;

-- =====================================================
-- 9. Add columns that may be missing from the schema
-- =====================================================
-- Add designation_id and designation_label if they don't exist
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN designation_id BIGINT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN designation_label TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN positions_label TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- =====================================================
-- 10. Populate with actual team members
-- =====================================================
-- Insert actual CAMS team members
-- Note: IDs are auto-generated, using ON CONFLICT on email to avoid duplicates

-- Insert users with emails (will update if email already exists)
INSERT INTO "public"."profiles" ("first_name", "last_name", "email", "status", "designation_label", "positions_label", "role") VALUES 
('Lex Zyrreh Devonnaire D.', 'Abellanosa', 'lexzyrrehdevonnaire.abellanosa@carsu.edu.ph', 'active', 'Senior Graphic Designer', 'Artist', 'member'), 
('Teejay', 'Abello', 'teejay.abello@carsu.edu.ph', 'active', null, null, 'member'), 
('Nissi Y.', 'Abes', 'nissi.abes@carsu.edu.ph', 'active', 'Circulations Manager', 'Writer', 'member'), 
('Belle Blanche Kyle C.', 'Abiol', 'belleblanchekyle.abiol@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Jessah Mei P.', 'Allard', 'jessahmei.allard@carsu.edu.ph', 'active', 'Editor-in-Chief', 'Artist', 'member'), 
('John Ian M.', 'Alfaras', 'jonhian.alfaras@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Lendon A.', 'Almocera', 'lendon.almocera@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Eizziel Marie A.', 'Bacoy', 'eizzielmarie.bacoy@carsu.edu.ph', 'active', 'Online Accounts Manager', 'Writer', 'member'), 
('Nevlim', 'Baldelovar', 'nevlim.baldelovar@carsu.edu.ph', 'active', 'Opinion Editor', 'Writer', 'member'), 
('Robert Louis B.', 'Bebis', 'robertlouis.bebis@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Ryan Christian D.', 'Benignos', 'ryanchristianbenignos@carsu.edu.ph', 'active', null, null, 'member'), 
('Sophija D.', 'Bentulan', 'sophija.bentulan@carsu.edu.ph', 'active', null, 'Writer', 'member'), 
('Peter Lorenzo', 'Calo', 'peterlorenzo.calo@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Levi Brian C.', 'Cejuela', 'levibrian.cejuela@carsu.edu.ph', 'active', 'Creative Director', 'Artist', 'member'), 
('Joshua C.', 'Coralde', 'joshuajosh.coralde@carsu.edu.ph', 'active', null, 'Writer', 'member'), 
('Josefa T.', 'Cruzada', 'josefa.cruzada@carsu.edu.ph', 'active', null, null, 'member'), 
('Lordelie S.', 'Darog', 'lordelie.darog@carsu.edu.ph', 'active', null, 'Writer', 'member'), 
('Jezwer B.', 'Delima', 'jezwer.delima@carsu.edu.ph', 'active', null, 'Writer', 'member'), 
('Jellan S.', 'Denonong', 'jellanaille.denonong@carsu.edu.ph', 'active', null, 'Writer', 'member'), 
('Jonee R. Jr.', 'Elopre', 'jonee.elopre@carsu.edu.ph', 'active', 'Technical Editor', 'Writer', 'member'), 
('Devorah Grace', 'Esguerra', 'devorahgrace.esguerra@carsu.edu.ph', 'active', 'Managing Editor', 'Writer', 'member'), 
('Rexter M.', 'Etang', 'rexter.etang@carsu.edu.ph', 'active', 'Senior Illustrator', 'Artist', 'member'), 
('Jerby Claire M.', 'Factularin', 'jerbyclaire.factularin@carsu.edu.ph', 'active', 'Sports Editor', 'Writer', 'member'), 
('Melede S.', 'Ganoy', 'melede.ganoy@carsu.edu.ph', 'active', 'Editor-in-Chief', 'Writer', 'member'), 
('Jofred James L.', 'Gerasmio', 'jofredjames.gerasmio@carsu.edu.ph', 'active', 'Feature Editor', 'Writer', 'member'), 
('Matt Andrew', 'Graban', 'mattandrew.graban@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Hannah Faith A.', 'Labadan', 'hannahfaith.labadan@carsu.edu.ph', 'active', 'HR Manager', 'Artist', 'member'), 
('Megumi Erika O.', 'Labaja', 'megumierika.labaja@carsu.edu.ph', 'active', 'News Editor', 'Writer', 'member'), 
('Anne E.', 'Lanzon', 'anne.lanzon@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Gerza Allea L.', 'Lim', 'gerzaallea.lim@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Jhon David M.', 'Lloren', 'jhondavid.lloren@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Shieny Griethzer R.', 'Lozada', 'shienygriethzer.lozada@carsu.edu.ph', 'active', null, 'Writer', 'member'), 
('Samantha Jezette M.', 'Maestrado', 'samanthajezette.maestrado@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Jaylor A.', 'Malnegro', 'jaylor.malnegro@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Ma. Julianny A.', 'Navarez', 'majulianny.navarez@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Edwin II', 'Mori', 'edwin.mori@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Kaya Danielle L.', 'Nason', 'kayadanielle.nason@carsu.edu.ph', 'active', null, 'Writer', 'member'), 
('Mhegan S.', 'Niez', 'mhegan.niez@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Kurt Clyde S.', 'Pablo', 'kurtclyde.pablo@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Jhared Miguel S.', 'Paderna', 'jharedmiguel.paderna@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Jevan M.', 'Racaza', 'jevan.racaza@carsu.edu.ph', 'active', null, 'Artist', 'member'), 
('Jules Leo M.', 'Reserva', 'julesleo.reserva@carsu.edu.ph', 'active', 'Online Accounts Manager', 'Artist', 'member'), 
('Glenn Ferdinan C.', 'Rojas', 'glennferdinan.rojas@carsu.edu.ph', 'active', 'Associate Managing Editor', 'Writer', 'member'), 
('Missi Vidka M.', 'Santillan', 'missividka.santillan@carsu.edu.ph', 'active', null, 'Writer', 'member'), 
('Elaine Pearl M.', 'Silagan', 'elainepearl.silagan@carsu.edu.ph', 'active', 'Senior Photojournalist', 'Artist', 'member'), 
('Samuel Lhoide G.', 'Ursales', 'samuellhoide.ursales@carsu.edu.ph', 'active', 'Literary Editor', 'Writer', 'member'), 
('Kent Adriane', 'Vinatero', 'kentadriane.vinatero@carsu.edu.ph', 'active', 'Sr. Cinematographer', 'Artist', 'member')
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  designation_label = EXCLUDED.designation_label,
  positions_label = EXCLUDED.positions_label,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Note: Fernando Gabriel P. Bunio has no email and is skipped (email is required)

-- =====================================================
-- 11. Setup Projects Table Schema
-- =====================================================
-- Create project_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'review', 'completed', 'archived', 'to_section_head', 'to_technical_editor', 'to_creative_director', 'to_editor_in_chief', 'approved', 'rejected', 'returned_by_section_head', 'returned_by_technical_editor', 'returned_by_creative_director');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing project_status enum values if it already exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'to_section_head' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'to_section_head';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'to_technical_editor' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'to_technical_editor';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'to_creative_director' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'to_creative_director';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'to_editor_in_chief' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'to_editor_in_chief';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'returned_by_section_head' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'returned_by_section_head';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'returned_by_technical_editor' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'returned_by_technical_editor';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'returned_by_creative_director' AND enumtypid = 'project_status'::regtype) THEN
        ALTER TYPE project_status ADD VALUE 'returned_by_creative_director';
    END IF;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Create priority_level enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High', 'Urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create projects table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.projects (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT DEFAULT '',
  status TEXT DEFAULT 'In Progress',
  project_type TEXT NOT NULL CHECK (project_type IN ('magazine', 'newsletter', 'folio', 'other')),
  section_head_id BIGINT REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  due_date_iso TIMESTAMPTZ,
  media_uploaded TEXT,
  is_starred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_modified TIMESTAMPTZ DEFAULT NOW()
);

-- Add content column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN content TEXT DEFAULT '';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add section_head_id column if it doesn't exist (replacing old section_head text column)
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN section_head_id BIGINT REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add submission_comments column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN submission_comments TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add submitted_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN submitted_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add submitted_at column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN submitted_at TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add submitted_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN submitted_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add priority_level column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN priority_level priority_level;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add section_head_approved_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN section_head_approved_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add section_head_approved_at column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN section_head_approved_at TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add section_head_approved_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN section_head_approved_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add section_head_comments column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN section_head_comments TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add technical_editor_comments column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN technical_editor_comments TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add technical_editor_approved_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN technical_editor_approved_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add technical_editor_approved_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN technical_editor_approved_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add forward_notes column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN forward_notes TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add editor_in_chief_approved_by column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN editor_in_chief_approved_by UUID REFERENCES auth.users(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add editor_in_chief_approved_date column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.projects ADD COLUMN editor_in_chief_approved_date TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create indexes for projects table
CREATE INDEX IF NOT EXISTS idx_projects_type ON public.projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_section_head ON public.projects(section_head_id);

-- =====================================================
-- 12. Setup Project Members Table Schema
-- =====================================================
-- Create project_member_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE project_member_role AS ENUM ('writer', 'artist', 'reviewer', 'contributor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create project_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.project_members (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES public.profiles(id) ON DELETE CASCADE,
  role project_member_role,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add role column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE public.project_members ADD COLUMN role project_member_role;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create indexes for project_members
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON public.project_members(user_id);

-- =====================================================
-- 13. Setup Projects Table RLS Policies
-- =====================================================
-- Enable RLS on projects table if not already enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete projects" ON public.projects;

-- Users can view all projects
CREATE POLICY "Users can view all projects" 
ON public.projects FOR SELECT 
USING (true);

-- Authenticated users can insert projects
CREATE POLICY "Users can insert projects" 
ON public.projects FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Users can update projects (authenticated users)
CREATE POLICY "Users can update projects" 
ON public.projects FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Users can delete projects (authenticated users)
CREATE POLICY "Users can delete projects" 
ON public.projects FOR DELETE 
USING (auth.role() = 'authenticated');

-- Grant necessary permissions on projects table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE projects_id_seq TO authenticated;

-- =====================================================
-- 14. Setup Project Members Table RLS Policies
-- =====================================================
-- Enable RLS on project_members table
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can insert project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can update project members" ON public.project_members;
DROP POLICY IF EXISTS "Users can delete project members" ON public.project_members;

-- Users can view project members
CREATE POLICY "Users can view project members" 
ON public.project_members FOR SELECT 
USING (true);

-- Authenticated users can insert project members
CREATE POLICY "Users can insert project members" 
ON public.project_members FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Users can update project members
CREATE POLICY "Users can update project members" 
ON public.project_members FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Users can delete project members
CREATE POLICY "Users can delete project members" 
ON public.project_members FOR DELETE 
USING (auth.role() = 'authenticated');

-- Grant necessary permissions on project_members table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE project_members_id_seq TO authenticated;

-- =====================================================
-- 15. Setup Project Comments Table Schema
-- =====================================================
-- Create project_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.project_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id BIGINT REFERENCES public.projects(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for project_comments table
CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON public.project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_created_at ON public.project_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_comments_is_approved ON public.project_comments(is_approved);

-- =====================================================
-- 16. Setup Project Comments Table RLS Policies
-- =====================================================
-- Enable RLS on project_comments table
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all comments" ON public.project_comments;
DROP POLICY IF EXISTS "Users can insert comments" ON public.project_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.project_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.project_comments;

-- Users can view all comments
CREATE POLICY "Users can view all comments" 
ON public.project_comments FOR SELECT 
USING (true);

-- Authenticated users can insert comments
CREATE POLICY "Users can insert comments" 
ON public.project_comments FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own comments
CREATE POLICY "Users can update own comments" 
ON public.project_comments FOR UPDATE 
USING (created_by = auth.uid() OR auth.role() = 'authenticated');

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" 
ON public.project_comments FOR DELETE 
USING (created_by = auth.uid() OR auth.role() = 'authenticated');

-- Grant necessary permissions on project_comments table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_comments TO authenticated;

-- =====================================================
-- Verification Queries
-- =====================================================
-- Run this to verify your setup:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
-- ORDER BY ordinal_position;

-- Run this to see all team members:
-- SELECT id, first_name, last_name, email, designation_label, positions_label, role, status
-- FROM public.profiles
-- ORDER BY id;

-- Run this to check RLS policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('profiles', 'projects', 'project_members')
-- ORDER BY tablename, policyname;
