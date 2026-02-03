-- M7 Fixes
ALTER TABLE b_style_demand ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
ALTER TABLE b_public_style ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
NOTIFY pgrst, 'reload schema';
