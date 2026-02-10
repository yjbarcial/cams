-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.archives (
  id bigint NOT NULL DEFAULT nextval('archives_id_seq'::regclass),
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category = ANY (ARRAY['magazine'::text, 'newsletter'::text, 'folio'::text, 'other'::text])),
  publication_date date,
  publication_date_iso timestamp with time zone,
  file_url text NOT NULL,
  cover_image_url text,
  authors text,
  volume_issue text,
  tags ARRAY,
  uploaded_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT archives_pkey PRIMARY KEY (id),
  CONSTRAINT archives_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id)
);
CREATE TABLE public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id bigint,
  action character varying,
  table_name character varying,
  record_id uuid DEFAULT gen_random_uuid(),
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.departments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name character varying UNIQUE,
  description text,
  updated_at timestamp with time zone,
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.media_files (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name character varying,
  url text,
  mime_type character varying,
  size bigint,
  category USER-DEFINED,
  project_id bigint,
  task_id bigint,
  uploaded_by bigint,
  CONSTRAINT media_files_pkey PRIMARY KEY (id),
  CONSTRAINT media_files_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT media_files_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT media_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id bigint,
  title character varying,
  message text,
  type character varying,
  reference_type character varying,
  is_read boolean,
  read_at timestamp with time zone,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.positions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text UNIQUE,
  description text,
  department_id bigint,
  is_leadership boolean,
  updated_at timestamp with time zone,
  CONSTRAINT positions_pkey PRIMARY KEY (id),
  CONSTRAINT positions_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.profiles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  first_name text,
  last_name text,
  email character varying UNIQUE,
  avatar_url text,
  bio text,
  phone character varying,
  positions_id bigint,
  department_id bigint,
  last_active timestamp with time zone,
  updated_at timestamp with time zone,
  role USER-DEFINED,
  status USER-DEFINED DEFAULT 'active'::user_status,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_positions_id_fkey FOREIGN KEY (positions_id) REFERENCES public.positions(id),
  CONSTRAINT profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
CREATE TABLE public.project_history (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  project_id bigint,
  version_number bigint NOT NULL,
  change_description text,
  author_id bigint NOT NULL,
  project_data jsonb NOT NULL,
  metadata jsonb,
  is_active boolean,
  CONSTRAINT project_history_pkey PRIMARY KEY (id),
  CONSTRAINT project_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_history_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.project_members (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  project_id bigint,
  user_id bigint,
  role USER-DEFINED,
  joined_at timestamp with time zone,
  left_at timestamp with time zone,
  is_active boolean,
  updated_at timestamp with time zone,
  CONSTRAINT project_members_pkey PRIMARY KEY (id),
  CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.projects (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title character varying,
  description text,
  project_type USER-DEFINED,
  status USER-DEFINED DEFAULT 'draft'::project_status,
  priority USER-DEFINED,
  start_date date,
  due_date date,
  completed_at timestamp with time zone,
  section_head_id bigint,
  created_by bigint,
  updated_at timestamp with time zone,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_section_head_id_fkey FOREIGN KEY (section_head_id) REFERENCES public.profiles(id),
  CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.task_comments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  task_id bigint,
  user_id bigint,
  content text,
  parent_comment_id bigint,
  updated_at timestamp with time zone,
  CONSTRAINT task_comments_pkey PRIMARY KEY (id),
  CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT task_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.task_comments(id)
);
CREATE TABLE public.tasks (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  project_id bigint,
  parent_task_id bigint,
  title character varying,
  description text,
  status USER-DEFINED,
  priority USER-DEFINED,
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_by bigint,
  assigned_to bigint,
  updated_at timestamp with time zone,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id)
);