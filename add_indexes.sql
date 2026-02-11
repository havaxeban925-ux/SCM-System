-- Add indexes to improve performance of Public Pool and Style Demand queries

-- 1. Indexes for b_public_style table (Public Pool)
CREATE INDEX IF NOT EXISTS idx_public_style_intent_count ON b_public_style (intent_count);
CREATE INDEX IF NOT EXISTS idx_public_style_created_at ON b_public_style (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_style_status ON b_public_style (status); -- If status column exists

-- 2. Indexes for b_style_demand table (Merchant Styles)
CREATE INDEX IF NOT EXISTS idx_style_demand_shop_id ON b_style_demand (shop_id);
CREATE INDEX IF NOT EXISTS idx_style_demand_status ON b_style_demand (status);
CREATE INDEX IF NOT EXISTS idx_style_demand_dev_status ON b_style_demand (development_status);
CREATE INDEX IF NOT EXISTS idx_style_demand_created_at ON b_style_demand (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_style_demand_shop_status ON b_style_demand (shop_id, status); -- Composite index for common filtering

-- 3. Indexes for sys_shop (if needed for joins)
CREATE INDEX IF NOT EXISTS idx_sys_shop_code ON sys_shop (shop_code);
