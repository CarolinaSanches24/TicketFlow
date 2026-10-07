-- Adicionar colunas faltantes de módulo, submódulo e organização (entidade)

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS organization TEXT,
ADD COLUMN IF NOT EXISTS module TEXT,
ADD COLUMN IF NOT EXISTS submodule TEXT;

ALTER TABLE public.improvements
ADD COLUMN IF NOT EXISTS organization TEXT,
ADD COLUMN IF NOT EXISTS module TEXT,
ADD COLUMN IF NOT EXISTS submodule TEXT;

ALTER TABLE public.debts
ADD COLUMN IF NOT EXISTS organization TEXT,
ADD COLUMN IF NOT EXISTS module TEXT,
ADD COLUMN IF NOT EXISTS submodule TEXT;

ALTER TABLE public.data_requests
ADD COLUMN IF NOT EXISTS organization TEXT,
ADD COLUMN IF NOT EXISTS module TEXT,
ADD COLUMN IF NOT EXISTS submodule TEXT;

-- Para que as views recebam os novos campos criados:
DROP VIEW IF EXISTS tickets_list;
DROP VIEW IF EXISTS improvements_list;
DROP VIEW IF EXISTS debts_list;
DROP VIEW IF EXISTS data_requests_list;

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
