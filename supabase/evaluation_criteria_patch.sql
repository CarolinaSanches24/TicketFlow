-- Adicionar as colunas que estão faltando para solucionar o erro "concept_has_final_recovery"

ALTER TABLE public.evaluation_criteria_config
ADD COLUMN IF NOT EXISTS concept_annual_calc TEXT,
ADD COLUMN IF NOT EXISTS concept_final_calc TEXT,
ADD COLUMN IF NOT EXISTS concept_is_final BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS concept_decimal_places INTEGER,
ADD COLUMN IF NOT EXISTS concept_final_decimal_places INTEGER,
ADD COLUMN IF NOT EXISTS concept_final_rounding_type TEXT,
ADD COLUMN IF NOT EXISTS concept_period_rounding_type TEXT,
ADD COLUMN IF NOT EXISTS concept_has_final_recovery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS concepts JSONB DEFAULT '[]'::jsonb;

-- Adicionar os novos campos solicitados para Recuperação e Parâmetros
ALTER TABLE public.evaluation_criteria_config
ADD COLUMN IF NOT EXISTS has_period_recovery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_parallel_recovery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_group_criteria BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_semester_recovery BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_class_council BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_final_test BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_special_test BOOLEAN DEFAULT false,

ADD COLUMN IF NOT EXISTS min_grade NUMERIC,
ADD COLUMN IF NOT EXISTS max_grade NUMERIC,
ADD COLUMN IF NOT EXISTS min_total_grade NUMERIC,
ADD COLUMN IF NOT EXISTS max_total_grade NUMERIC,

ADD COLUMN IF NOT EXISTS final_recovery_min_grade NUMERIC,
ADD COLUMN IF NOT EXISTS final_recovery_max_grade NUMERIC,
ADD COLUMN IF NOT EXISTS final_recovery_required_grade NUMERIC;
