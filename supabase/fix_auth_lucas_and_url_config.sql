-- ==============================================================================
-- CORREÇÃO: Desbloquear usuário lucas.havel@proesc.com e auto-confirmar e-mails
-- ==============================================================================
--
-- COMO APLICAR:
-- 1. Acesse o painel do Supabase (https://supabase.com/dashboard)
-- 2. Selecione o projeto
-- 3. Vá no "SQL Editor"
-- 4. Cole este script e clique em "Run"
-- ==============================================================================

-- 1. Confirmar o e-mail do usuário lucas.havel@proesc.com imediatamente
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email = 'lucas.havel@proesc.com';

-- 2. Confirmar preventivamente quaisquer outros usuários criados pelo admin com confirmação pendente
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email_confirmed_at IS NULL;

-- 3. Criar trigger BEFORE INSERT para auto-confirmar novos usuários criados via painel
-- Isso impede que novos usuários caiam no erro de link expirado ou email não confirmado
CREATE OR REPLACE FUNCTION public.auto_confirm_new_users()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_before_insert ON auth.users;
CREATE TRIGGER on_auth_user_before_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_new_users();

-- ==============================================================================
-- INSTRUÇÃO ADICIONAL DE CONFIGURAÇÃO NO PAINEL DO SUPABASE:
--
-- 1. Acesse Authentication -> URL Configuration:
--    - Site URL: https://ticket-flow-psi.vercel.app
--    - Redirect URLs (adicione se não houver):
--        https://ticket-flow-psi.vercel.app/**
--        https://ticket-flow-psi.vercel.app/update-password
--        http://localhost:5173/**
--
-- 2. Acesse Authentication -> Providers -> Email:
--    - Desmarque a opção "Confirm email" (em sistemas corporativos onde o admin
--      cria o usuário, desativar a confirmação permite que o usuário entre
--      direto com a senha definida).
-- ==============================================================================
