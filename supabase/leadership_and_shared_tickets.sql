-- ==============================================================================
-- MIGRAÇÃO: NOVO PERFIL LIDERANÇA, COMPARTILHAMENTO DE BASES E ATUALIZAÇÃO DE SENHAS
-- ==============================================================================

-- 1. ADICIONAR NOVO PERFIL 'LEADERSHIP' AO ENUM user_role
DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'LEADERSHIP';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'ANALYST', 'LEADERSHIP');
END $$;

-- 2. UNIFICAÇÃO DE STATUS: ADICIONAR 'RESOLVED' AOS ENUMS QUE SÓ TINHAM 'FINISHED'
DO $$ BEGIN
    ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'RESOLVED';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE improvement_status ADD VALUE IF NOT EXISTS 'RESOLVED';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE data_request_status ADD VALUE IF NOT EXISTS 'RESOLVED';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. MIGRAÇÃO DE DADOS: ATUALIZAR REGISTROS 'FINISHED' PARA 'RESOLVED'
DO $$ BEGIN
    UPDATE improvements SET status = 'RESOLVED' WHERE status::text = 'FINISHED';
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    UPDATE tickets SET status = 'RESOLVED' WHERE status::text = 'FINISHED';
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    UPDATE data_requests SET status = 'RESOLVED' WHERE status::text = 'FINISHED';
EXCEPTION WHEN others THEN null; END $$;

-- 4. TABELA GLOBAL DE BASES DE CHAMADOS (ticket_bases)
-- Garante que uploads feitos por qualquer usuário fiquem visíveis para Analistas, Administradores e Liderança
CREATE TABLE IF NOT EXISTS ticket_bases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    ticket_count INTEGER NOT NULL DEFAULT 0,
    period_start TEXT,
    period_end TEXT,
    datasets JSONB NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE ticket_bases ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para acesso compartilhado entre todos os usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can read ticket_bases" ON ticket_bases;
CREATE POLICY "Authenticated users can read ticket_bases" ON ticket_bases
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert ticket_bases" ON ticket_bases;
CREATE POLICY "Authenticated users can insert ticket_bases" ON ticket_bases
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update ticket_bases" ON ticket_bases;
CREATE POLICY "Authenticated users can update ticket_bases" ON ticket_bases
    FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete ticket_bases" ON ticket_bases;
CREATE POLICY "Authenticated users can delete ticket_bases" ON ticket_bases
    FOR DELETE TO authenticated USING (true);

-- 5. FUNÇÃO RPC PARA ATUALIZAÇÃO SEGURA DE SENHA PELO ADMINISTRADOR
-- Permite que administradores redefinam a senha de qualquer usuário através da interface
CREATE OR REPLACE FUNCTION admin_update_user_password(target_user_id UUID, new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    caller_role user_role;
BEGIN
    -- Verificar se o usuário que está chamando a função é ADMIN
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL;
    IF caller_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem atualizar senhas de outros usuários.';
    END IF;

    -- Validar tamanho da senha
    IF length(new_password) < 6 THEN
        RAISE EXCEPTION 'A nova senha deve ter no mínimo 6 caracteres.';
    END IF;

    -- Atualizar o hash da senha na tabela interna auth.users do Supabase
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = now()
    WHERE id = target_user_id;

    -- Registrar evento no log de auditoria
    INSERT INTO public.user_audit_logs (target_user_id, target_user_email, action, details, creator_id)
    SELECT target_user_id, email, 'UPDATE'::user_action, 'Senha de acesso atualizada pelo Administrador', auth.uid()
    FROM public.profiles WHERE id = target_user_id;
END;
$$;
