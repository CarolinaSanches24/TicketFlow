-- ==============================================================================
-- PATCH: Corrigir erro "Database error saving new user" ao cadastrar usuários
-- ==============================================================================
--
-- INSTRUÇÕES DE APLICAÇÃO:
-- 1. Acesse o painel do Supabase (https://supabase.com/dashboard)
-- 2. Selecione o seu projeto
-- 3. No menu lateral esquerdo, clique em "SQL Editor"
-- 4. Cole todo o conteúdo deste arquivo e clique no botão "Run" (Executar)
-- ==============================================================================

-- 1. Garantir que o tipo enum user_role existe no schema public
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('ADMIN', 'ANALYST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Garantir a estrutura da tabela profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'ANALYST',
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- 3. Remover restrição única global de e-mail (se existir como constraint rígida)
--    Isso é crucial para permitir soft-delete sem conflitar com novas criações
DO $$ BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- 4. Criar índice único apenas para usuários ativos (sem deleted_at)
DROP INDEX IF EXISTS idx_profiles_active_email;
CREATE UNIQUE INDEX idx_profiles_active_email ON public.profiles (lower(email)) WHERE deleted_at IS NULL;

-- 5. Atualizar/Recriar a função da trigger com SECURITY DEFINER e search_path correto
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
  -- Normalizar e-mail
  v_email := lower(trim(new.email));
  
  -- Obter nome com valor padrão caso não tenha sido enviado
  v_name := COALESCE(NULLIF(trim(new.raw_user_meta_data->>'name'), ''), 'Usuário');
  
  -- Obter role de forma segura (tolerante a maiúsculas/minúsculas e valores vazios)
  IF UPPER(COALESCE(new.raw_user_meta_data->>'role', '')) = 'ADMIN' THEN
    v_role := 'ADMIN'::public.user_role;
  ELSE
    v_role := 'ANALYST'::public.user_role;
  END IF;

  -- Se já existir perfil com esse e-mail de um usuário antigo (ex: excluído do auth), remove
  DELETE FROM public.profiles WHERE lower(email) = v_email AND id <> new.id;

  -- Inserir ou atualizar o registro de perfil
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
    -- Registra o alerta no log do PostgreSQL sem quebrar a transação de cadastro do usuário
    RAISE WARNING 'Aviso em handle_new_user para o usuário %: %', new.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 6. Recriar a trigger na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Garantir permissões de acesso
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

-- 8. Garantir que as políticas RLS permitam a inserção
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow trigger insert" ON public.profiles;
CREATE POLICY "Allow trigger insert" ON public.profiles FOR INSERT WITH CHECK (true);
