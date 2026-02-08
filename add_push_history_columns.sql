
-- Add missing columns for Push History features
ALTER TABLE b_style_demand 
ADD COLUMN IF NOT EXISTS ref_link TEXT,
ADD COLUMN IF NOT EXISTS handler_name TEXT;

COMMENT ON COLUMN b_style_demand.ref_link IS 'Reference link for the style';
COMMENT ON COLUMN b_style_demand.handler_name IS 'Name of the handler who pushed the style';

-- Add ref_link to b_public_style for Public Push
ALTER TABLE b_public_style
ADD COLUMN IF NOT EXISTS ref_link TEXT;

COMMENT ON COLUMN b_public_style.ref_link IS 'Reference link for the public style';
