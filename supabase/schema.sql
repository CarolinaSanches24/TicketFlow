-- Create Enums if they don't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'ANALYST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('PENDING', 'OPEN', 'ON_HOLD', 'FINISHED', 'CONVERTED_TO_IMPROVEMENT', 'CONVERTED_TO_DEBT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE improvement_status AS ENUM ('OPEN', 'IN_PROGRESS', 'IN_TEST', 'FINISHED', 'CONVERTED_TO_DEBT', 'CANCELED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE debt_status AS ENUM ('OPEN', 'IN_CORRECTION', 'RESOLVED', 'CANCELED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE data_request_status AS ENUM ('PENDING', 'OPEN', 'ON_HOLD', 'FINISHED', 'CANCELED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE origin_type AS ENUM ('TICKET', 'IMPROVEMENT', 'MANUAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop existing views to avoid type mismatch errors when recreating them
DROP VIEW IF EXISTS tickets_list;
DROP VIEW IF EXISTS improvements_list;
DROP VIEW IF EXISTS debts_list;
DROP VIEW IF EXISTS data_requests_list;
DROP VIEW IF EXISTS user_data CASCADE;

DO $$ BEGIN
    CREATE TYPE user_action AS ENUM ('CREATE', 'UPDATE', 'DELETE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Profiles table to store user metadata that Admins can manage
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'ANALYST',
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ -- Soft delete
);

-- Populate profiles for existing users if they don't have one
INSERT INTO profiles (id, name, role, email)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'name', 'Usuário'),
    COALESCE(raw_user_meta_data->>'role', 'ANALYST')::user_role,
    email
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Function to check if a user is an admin without causing recursion
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN' AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());
CREATE POLICY "Allow trigger insert" ON profiles FOR INSERT WITH CHECK (true);

-- Trigger to sync auth.users metadata to profiles
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
DECLARE
  v_name TEXT;
  v_role public.user_role;
  v_email TEXT;
BEGIN
  v_email := lower(trim(new.email));
  v_name := COALESCE(NULLIF(trim(new.raw_user_meta_data->>'name'), ''), 'Usuário');
  
  IF UPPER(COALESCE(new.raw_user_meta_data->>'role', '')) = 'ADMIN' THEN
    v_role := 'ADMIN'::public.user_role;
  ELSE
    v_role := 'ANALYST'::public.user_role;
  END IF;

  DELETE FROM public.profiles WHERE lower(email) = v_email AND id <> new.id;

  INSERT INTO public.profiles (id, name, role, email, deleted_at, updated_at)
  VALUES (
    new.id, 
    v_name,
    v_role,
    v_email,
    NULL,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    deleted_at = NULL,
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Aviso em handle_new_user para o usuário %: %', new.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger (drop first to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update user_data view to use profiles table (only active users)
CREATE OR REPLACE VIEW user_data AS
SELECT id, name, role, email
FROM profiles
WHERE deleted_at IS NULL;

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status ticket_status DEFAULT 'PENDING',
    analyst_id UUID REFERENCES auth.users(id),
    external_id TEXT,
    external_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Improvements table
CREATE TABLE IF NOT EXISTS improvements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    origin_type origin_type,
    origin_id UUID,
    status improvement_status DEFAULT 'OPEN',
    analyst_id UUID REFERENCES auth.users(id),
    external_id TEXT,
    external_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Debts table
CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_type origin_type NOT NULL,
    origin_id UUID, -- References tickets or improvements
    description TEXT,
    status debt_status DEFAULT 'OPEN',
    analyst_id UUID REFERENCES auth.users(id),
    external_id TEXT,
    external_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Data Requests table
CREATE TABLE IF NOT EXISTS data_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status data_request_status DEFAULT 'PENDING',
    analyst_id UUID REFERENCES auth.users(id),
    external_id TEXT,
    external_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- JSON-enhanced Views for easy frontend joins
CREATE OR REPLACE VIEW tickets_list AS
SELECT t.*, jsonb_build_object('name', u.name) as analyst
FROM tickets t LEFT JOIN user_data u ON t.analyst_id = u.id;

CREATE OR REPLACE VIEW improvements_list AS
SELECT i.*, jsonb_build_object('name', u.name) as analyst
FROM improvements i LEFT JOIN user_data u ON i.analyst_id = u.id;

CREATE OR REPLACE VIEW debts_list AS
SELECT d.*, jsonb_build_object('name', u.name) as analyst
FROM debts d LEFT JOIN user_data u ON d.analyst_id = u.id;

CREATE OR REPLACE VIEW data_requests_list AS
SELECT dr.*, jsonb_build_object('name', u.name) as analyst
FROM data_requests dr LEFT JOIN user_data u ON dr.analyst_id = u.id;

-- RLS Policies
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Basic Policies (allowing all authenticated for now)
CREATE POLICY "Authenticated users can manage tickets" ON tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage improvements" ON improvements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage debts" ON debts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS for Data Requests
ALTER TABLE data_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage data requests" ON data_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Functions and Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- User Audit Logs table
CREATE TABLE IF NOT EXISTS user_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID,
    target_user_email TEXT NOT NULL,
    action user_action NOT NULL,
    details TEXT,
    creator_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs" ON user_audit_logs 
FOR SELECT TO authenticated 
USING (public.is_admin());

CREATE POLICY "Admins can insert logs" ON user_audit_logs 
FOR INSERT TO authenticated 
WITH CHECK (public.is_admin());

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_improvements_updated_at BEFORE UPDATE ON improvements FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON debts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_data_requests_updated_at BEFORE UPDATE ON data_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Migration: add opened_at field to allow manual date entry by the user
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS opened_at DATE;
ALTER TABLE improvements ADD COLUMN IF NOT EXISTS opened_at DATE;
ALTER TABLE data_requests ADD COLUMN IF NOT EXISTS opened_at DATE;

