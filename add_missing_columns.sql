
-- Add missing columns for helping/pattern demands
ALTER TABLE b_style_demand 
ADD COLUMN IF NOT EXISTS extra_info JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS pattern_schemes JSONB DEFAULT '[]'::JSONB;

-- Comment on columns
COMMENT ON COLUMN b_style_demand.extra_info IS 'Extra information (e.g. reply content)';
COMMENT ON COLUMN b_style_demand.pattern_schemes IS 'Pattern schemes for helping requests';
