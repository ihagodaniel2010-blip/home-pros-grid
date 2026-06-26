-- 013_storage_receipts_bucket_policies.sql
-- HomeLeadPro / Barrigudo
-- Proposta para a criação do bucket "receipts" e RLS do Storage
-- NÃO APLICAR AUTOMATICAMENTE.

BEGIN;

-- 1. Criação do bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts', 
    'receipts', 
    false, -- Bucket PRIVADO
    10485760, -- 10MB limit
    '{image/jpeg,image/png,application/pdf}'
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = '{image/jpeg,image/png,application/pdf}';

-- 2. Ativar RLS na tabela de objetos do storage (se já não estiver)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Remover policies antigas específicas deste bucket (caso existam)
DROP POLICY IF EXISTS "Super admin can manage receipts bucket" ON storage.objects;
DROP POLICY IF EXISTS "Company managers can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Company managers can view receipts" ON storage.objects;

-- 4. Criar policy para Super Admin (acesso total)
CREATE POLICY "Super admin can manage receipts bucket"
ON storage.objects
FOR ALL
USING (bucket_id = 'receipts' AND public.is_super_admin())
WITH CHECK (bucket_id = 'receipts' AND public.is_super_admin());

-- 5. Criar policy para Owner/Admin gerenciar arquivos
-- O storage path segue a convenção: organization_id/filename.ext
-- Validamos se a primeira parte do path equivale ao organization_id em que o usuário atua como owner/admin.
CREATE POLICY "Company managers can manage receipts"
ON storage.objects
FOR ALL
USING (
    bucket_id = 'receipts' 
    AND public.get_user_role_in_org((string_to_array(name, '/'))[1]::uuid) IN ('owner', 'admin')
)
WITH CHECK (
    bucket_id = 'receipts' 
    AND public.get_user_role_in_org((string_to_array(name, '/'))[1]::uuid) IN ('owner', 'admin')
);

-- Worker intencionalmente não possui policy (bloqueado por padrão)

COMMIT;
