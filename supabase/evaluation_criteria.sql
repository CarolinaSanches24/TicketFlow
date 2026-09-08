-- supabase/evaluation_criteria.sql

DROP TABLE IF EXISTS public.evaluation_criteria_config;

-- Creates the evaluation_criteria_config table to store criteria rules
CREATE TABLE public.evaluation_criteria_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    approval_type TEXT NOT NULL, -- MATRICULA, DISCIPLINA
    frequency_type TEXT NOT NULL, -- HORA_AULA, DIA_LETIVO
    evaluation_period TEXT NOT NULL, -- BIMESTRE, TRIMESTRE, SEMESTRE, MODULO_UNICO, UNIDADE
    period_quantity INTEGER NOT NULL, -- 1 to 10
    evaluation_type TEXT NOT NULL, -- NOTA, CONCEITO, HABILIDADES_E_COMPETENCIAS, PERSONALIZADO, AVALIACAO_CONTINUA, AVALIACAO_DIAGNOSTICA
    -- Parâmetros de Notas (Somente preenchido se evaluation_type for 'NOTA')
    annual_calc_type TEXT, 
    final_calc_type TEXT,
    decimal_places INTEGER, -- Quantidade de Casas decimais
    final_decimal_places INTEGER, -- Quantidade de Casas decimais nota final
    final_rounding_type TEXT, -- Tipo de Arredondamento na nota Final
    period_rounding_type TEXT, -- Tipo de Arredondamento no período
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note for RLS if RLS is enabled on the project:
ALTER TABLE public.evaluation_criteria_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read evaluation_criteria_config"
ON public.evaluation_criteria_config
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow authenticated insert evaluation_criteria_config"
ON public.evaluation_criteria_config
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update evaluation_criteria_config"
ON public.evaluation_criteria_config
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated delete evaluation_criteria_config"
ON public.evaluation_criteria_config
FOR DELETE
TO authenticated
USING (true);
