-- Create Entities Table
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    matrix_documents TEXT,
    evaluation_system TEXT,
    evaluation_criteria TEXT,
    president_name TEXT,
    director_name TEXT,
    cs_account_manager TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Settings
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage entities" ON entities 
FOR ALL TO authenticated 
USING (true) WITH CHECK (true);

-- Last Updated Trigger
CREATE TRIGGER update_entities_updated_at 
BEFORE UPDATE ON entities 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
