-- V2 Migration for Entities Module

-- 1. Alter Entities Table
ALTER TABLE entities 
  DROP COLUMN IF EXISTS matrix_documents,
  DROP COLUMN IF EXISTS evaluation_system,
  DROP COLUMN IF EXISTS evaluation_criteria,
  DROP COLUMN IF EXISTS president_name,
  DROP COLUMN IF EXISTS director_name,
  ADD COLUMN IF NOT EXISTS identifier TEXT,
  ADD COLUMN IF NOT EXISTS admin_responsible TEXT,
  ADD COLUMN IF NOT EXISTS secretariat_type TEXT,
  ADD COLUMN IF NOT EXISTS account_manager TEXT;

-- 2. Entity Evaluations Table
CREATE TABLE IF NOT EXISTS entity_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    evaluation_system TEXT,
    evaluation_criteria TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE entity_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth entities evaluations" ON entity_evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_entity_evaluations_updated_at BEFORE UPDATE ON entity_evaluations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 3. Entity Documents Table
CREATE TABLE IF NOT EXISTS entity_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    document_type TEXT,
    document_name TEXT NOT NULL,
    file_url TEXT,
    upload_date DATE,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE entity_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth entities doc" ON entity_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_entity_documents_updated_at BEFORE UPDATE ON entity_documents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 4. Entity Units Table
CREATE TABLE IF NOT EXISTS entity_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    unit_name TEXT NOT NULL,
    director_name TEXT,
    secretary_name TEXT,
    course_offers TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE entity_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth entities units" ON entity_units FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_entity_units_updated_at BEFORE UPDATE ON entity_units FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. Entity Extra Modules Table
CREATE TABLE IF NOT EXISTS entity_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL,
    description TEXT,
    contract_date DATE,
    status TEXT,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE entity_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth entities modules" ON entity_modules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_entity_modules_updated_at BEFORE UPDATE ON entity_modules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
