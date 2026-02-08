-- Add indexes to improve query performance for Push History and Shop Management

-- 1. Index on b_style_demand for status and creation time (frequent filtering/sorting)
CREATE INDEX IF NOT EXISTS idx_style_demand_status_created 
ON b_style_demand (status, created_at DESC);

-- 2. Index on b_style_demand for shop_id (frequent filtering by shop)
CREATE INDEX IF NOT EXISTS idx_style_demand_shop_id 
ON b_style_demand (shop_id);

-- 3. Index on b_style_demand for push_type (filtering private vs public)
CREATE INDEX IF NOT EXISTS idx_style_demand_push_type 
ON b_style_demand (push_type);

-- 4. Index on b_public_style for creation time (sorting)
CREATE INDEX IF NOT EXISTS idx_public_style_created 
ON b_public_style (created_at DESC);

-- 5. Index on sys_shop for key_id (lookup/filtering)
CREATE INDEX IF NOT EXISTS idx_sys_shop_key_id 
ON sys_shop (key_id);

-- 6. Index on b_restock_order for status and creation time
CREATE INDEX IF NOT EXISTS idx_restock_order_status_created 
ON b_restock_order (status, created_at DESC);

-- 7. Index on b_restock_order for shop_id
CREATE INDEX IF NOT EXISTS idx_restock_order_shop_id 
ON b_restock_order (shop_id);
