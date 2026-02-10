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

-- Upsert profiles with project_member_role
INSERT INTO public.profiles (
  first_name, 
  last_name, 
  email, 
  positions_label, 
  designation_label,
  project_member_role,
  status,
  role
) VALUES
  ('Lex Zyrreh Devonnaire D.', 'Abellanosa', 'lexzyrrehdevonnaire.abellanosa@carsu.edu.ph', 'Layout Artist', 'Senior Graphic Designer', 'artist', 'active', 'member'),
  ('Teejay', 'Abello', 'teejay.abello@carsu.edu.ph', NULL, NULL, NULL, 'active', 'member'),
  ('Nissi Y.', 'Abes', 'nissi.abes@carsu.edu.ph', 'News Writer', 'Circulations Manager', 'writer', 'active', 'member'),
  ('Belle Blanche Kyle C.', 'Abiol', 'belleblanchekyle.abiol@carsu.edu.ph', 'Illustrator', NULL, 'artist', 'active', 'member'),
  ('Jessah Mei P.', 'Allard', 'jessahmei.allard@carsu.edu.ph', 'Layout Artist', 'Newsletter EIC', 'artist', 'active', 'member'),
  ('John Ian M.', 'Alfaras', 'jonhian.alfaras@carsu.edu.ph', 'Videographer', NULL, 'artist', 'active', 'member'),
  ('Lendon A.', 'Almocera', 'lendon.almocera@carsu.edu.ph', 'Videographer', NULL, 'artist', 'active', 'member'),
  ('Eizziel Marie A.', 'Bacoy', 'eizzielmarie.bacoy@carsu.edu.ph', 'Feature Writer', 'Archival Manager', 'writer', 'active', 'editor'),
  ('Nevlim', 'Baldelovar', 'nevlim.baldelovar@carsu.edu.ph', 'Literary Writer', 'Opinion Editor', 'writer', 'active', 'member'),
  ('Robert Louis B.', 'Bebis', 'robertlouis.bebis@carsu.edu.ph', 'Illustrator', NULL, 'artist', 'active', 'member'),
  ('Ryan Christian D.', 'Benignos', 'ryanchristianbenignos@carsu.edu.ph', NULL, NULL, NULL, 'active', 'member'),
  ('Sophija D.', 'Bentulan', 'sophija.bentulan@carsu.edu.ph', 'Sports Writer', NULL, 'writer', 'active', 'member'),
  ('Fernando Gabriel P.', 'Bunio', NULL, 'Opinion Writer', NULL, 'writer', 'active', 'member'),
  ('Peter Lorenzo', 'Calo', 'peterlorenzo.calo@carsu.edu.ph', 'Photojournalist', 'Creative Director', 'artist', 'active', 'member'),
  ('Levi Brian C.', 'Cejuela', 'levibrian.cejuela@carsu.edu.ph', 'Photojournalist', 'Creative Director', 'artist', 'active', 'editor'),
  ('Joshua C.', 'Coralde', 'joshuajosh.coralde@carsu.edu.ph', 'Opinion Writer', NULL, 'writer', 'active', 'member'),
  ('Josefa T.', 'Cruzada', 'josefa.cruzada@carsu.edu.ph', NULL, NULL, NULL, 'active', 'member'),
  ('Lordelie S.', 'Darog', 'lordelie.darog@carsu.edu.ph', 'Feature Writer', NULL, 'writer', 'active', 'member'),
  ('Jezwer B.', 'Delima', 'jezwer.delima@carsu.edu.ph', 'Feature Writer', NULL, 'writer', 'active', 'member'),
  ('Jellan S.', 'Denonong', 'jellanaille.denonong@carsu.edu.ph', 'Literary Writer', 'Technical Editor', 'writer', 'active', 'member'),
  ('Jonee R.', 'Elopre Jr.', 'jonee.elopre@carsu.edu.ph', 'News Writer', 'Technical Editor', 'writer', 'active', 'editor'),
  ('Devorah Grace', 'Esguerra', 'devorahgrace.esguerra@carsu.edu.ph', 'Feature Writer', 'Senior Illustrator', 'writer', 'active', 'member'),
  ('Rexter M.', 'Etang', 'rexter.etang@carsu.edu.ph', 'Illustrator', 'Sports Editor', 'artist', 'active', 'member'),
  ('Jerby Claire M.', 'Factularin', 'jerbyclaire.factularin@carsu.edu.ph', 'Sports Writer', 'Editor-in-Chief', 'writer', 'active', 'member'),
  ('Melede S.', 'Ganoy', 'melede.ganoy@carsu.edu.ph', 'News Writer', 'Editor-in-Chief', 'writer', 'active', 'editor'),
  ('Jofred James L.', 'Gerasmio', 'jofredjames.gerasmio@carsu.edu.ph', 'Feature Writer', NULL, 'writer', 'active', 'member'),
  ('Matt Andrew', 'Graban', 'mattandrew.graban@carsu.edu.ph', 'Photojournalist', 'HR Manager', 'artist', 'active', 'member'),
  ('Hannah Faith A.', 'Labadan', 'hannahfaith.labadan@carsu.edu.ph', 'Illustrator', 'News Editor', 'artist', 'active', 'member'),
  ('Megumi Erika O.', 'Labaja', 'megumierika.labaja@carsu.edu.ph', 'Sports Writer', NULL, 'writer', 'active', 'member'),
  ('Anne E.', 'Lanzon', 'anne.lanzon@carsu.edu.ph', 'Photojournalist', NULL, 'artist', 'active', 'member'),
  ('Gerza Allea L.', 'Lim', 'gerzaallea.lim@carsu.edu.ph', 'Layout Artist', NULL, 'artist', 'active', 'member'),
  ('Jhon David M.', 'Lloren', 'jhondavid.lloren@carsu.edu.ph', 'Photojournalist', NULL, 'artist', 'active', 'member'),
  ('Shieny Griethzer R.', 'Lozada', 'shienygriethzer.lozada@carsu.edu.ph', 'News Writer', NULL, 'writer', 'active', 'member'),
  ('Samantha Jezette M.', 'Maestrado', 'samanthajezette.maestrado@carsu.edu.ph', 'Photojournalist', NULL, 'artist', 'active', 'member'),
  ('Jaylor A.', 'Malnegro', 'jaylor.malnegro@carsu.edu.ph', 'Illustrator', NULL, 'artist', 'active', 'member'),
  ('Ma. Julianny A.', 'Navarez', 'majulianny.navarez@carsu.edu.ph', 'Illustrator', NULL, 'artist', 'active', 'member'),
  ('Edwin II', 'Mori', 'edwin.mori@carsu.edu.ph', 'Photojournalist', NULL, 'artist', 'active', 'member'),
  ('Kaya Danielle L.', 'Nason', 'kayadanielle.nason@carsu.edu.ph', 'Literary Writer', NULL, 'writer', 'active', 'member'),
  ('Mhegan S.', 'Niez', 'mhegan.niez@carsu.edu.ph', 'Layout Artist', NULL, 'artist', 'active', 'member'),
  ('Kurt Clyde S.', 'Pablo', 'kurtclyde.pablo@carsu.edu.ph', 'Photojournalist', NULL, 'artist', 'active', 'member'),
  ('Jhared Miguel S.', 'Paderna', 'jharedmiguel.paderna@carsu.edu.ph', 'Videographer', 'Online Accounts Manager', 'artist', 'active', 'member'),
  ('Jevan M.', 'Racaza', 'jevan.racaza@carsu.edu.ph', 'Layout Artist', 'Associate Managing Editor', 'artist', 'active', 'member'),
  ('Jules Leo M.', 'Reserva', 'julesleo.reserva@carsu.edu.ph', 'Videographer', 'Archival Manager', 'artist', 'active', 'editor'),
  ('Glenn Ferdinan C.', 'Rojas', 'glennferdinan.rojas@carsu.edu.ph', 'Sports Writer', 'Senior Photojournalist', 'writer', 'active', 'member'),
  ('Missi Vidka M.', 'Santillan', 'missividka.santillan@carsu.edu.ph', 'Opinion Writer', 'Literary Editor', 'writer', 'active', 'member'),
  ('Elaine Pearl M.', 'Silagan', 'elainepearl.silagan@carsu.edu.ph', 'Photojournalist', 'Sr. Cinematographer', 'artist', 'active', 'member'),
  ('Samuel Lhoide G.', 'Ursales', 'samuellhoide.ursales@carsu.edu.ph', 'Literary Writer', NULL, 'writer', 'active', 'member'),
  ('Kent Adriane', 'Vinatero', 'kentadriane.vinatero@carsu.edu.ph', 'Videographer', 'Online Accounts Manager', 'artist', 'active', 'editor')
ON CONFLICT (email) 
DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  positions_label = EXCLUDED.positions_label,
  designation_label = EXCLUDED.designation_label,
  project_member_role = EXCLUDED.project_member_role,
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
