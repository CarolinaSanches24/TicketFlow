-- ==============================================================================
-- PATCH: Setores, Funcionários, Status Cancelada e Campos de Responsáveis
-- ==============================================================================
--
-- INSTRUÇÕES DE APLICAÇÃO:
-- 1. Acesse o painel do Supabase (https://supabase.com/dashboard)
-- 2. Selecione seu projeto -> SQL Editor
-- 3. Cole este arquivo e clique em "Run"
-- ==============================================================================

-- 1. Adicionar status 'CANCELED' aos enums de status
DO $$ BEGIN
    ALTER TYPE improvement_status ADD VALUE IF NOT EXISTS 'CANCELED';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE debt_status ADD VALUE IF NOT EXISTS 'CANCELED';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE data_request_status ADD VALUE IF NOT EXISTS 'CANCELED';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

-- 2. Tabela de Setores
CREATE TABLE IF NOT EXISTS public.sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Funcionários (com nome, setor e cargo)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
    role TEXT NOT NULL, -- Cargo (ex: Desenvolvedor, Product Manager, etc.)
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para Setores e Funcionários
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read sectors" ON public.sectors;
CREATE POLICY "Public read sectors" ON public.sectors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth manage sectors" ON public.sectors;
CREATE POLICY "Auth manage sectors" ON public.sectors FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read employees" ON public.employees;
CREATE POLICY "Public read employees" ON public.employees FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth manage employees" ON public.employees;
CREATE POLICY "Auth manage employees" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Inserir setores padrão caso não existam
INSERT INTO public.sectors (name, description) VALUES
  ('Desenvolvimento', 'Setor de Engenharia de Software e Desenvolvimento'),
  ('Produto', 'Setor de Gestão de Produto e Design (PMs e POs)'),
  ('Suporte', 'Setor de Suporte ao Cliente e Atendimento Técnico'),
  ('Qualidade (QA)', 'Setor de Testes e Garantia de Qualidade'),
  ('Customer Success', 'Setor de Sucesso do Cliente e Implantação')
ON CONFLICT (name) DO NOTHING;

-- 4. Adicionar colunas de Responsável, PM e Solicitante nas tabelas principais
ALTER TABLE public.improvements
ADD COLUMN IF NOT EXISTS responsible TEXT,
ADD COLUMN IF NOT EXISTS pm_responsible TEXT,
ADD COLUMN IF NOT EXISTS requester TEXT;

ALTER TABLE public.debts
ADD COLUMN IF NOT EXISTS responsible TEXT,
ADD COLUMN IF NOT EXISTS pm_responsible TEXT,
ADD COLUMN IF NOT EXISTS requester TEXT;

ALTER TABLE public.data_requests
ADD COLUMN IF NOT EXISTS responsible TEXT,
ADD COLUMN IF NOT EXISTS pm_responsible TEXT,
ADD COLUMN IF NOT EXISTS requester TEXT;

-- 5. Atualizar as views para expor as novas colunas
DROP VIEW IF EXISTS improvements_list;
DROP VIEW IF EXISTS debts_list;
DROP VIEW IF EXISTS data_requests_list;

CREATE OR REPLACE VIEW improvements_list AS
SELECT i.*, jsonb_build_object('name', u.name) as analyst
FROM improvements i LEFT JOIN user_data u ON i.analyst_id = u.id;

CREATE OR REPLACE VIEW debts_list AS
SELECT d.*, jsonb_build_object('name', u.name) as analyst
FROM debts d LEFT JOIN user_data u ON d.analyst_id = u.id;

CREATE OR REPLACE VIEW data_requests_list AS
SELECT dr.*, jsonb_build_object('name', u.name) as analyst
FROM data_requests dr LEFT JOIN user_data u ON dr.analyst_id = u.id;
