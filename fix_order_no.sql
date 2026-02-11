
-- Fix missing order_no column in b_restock_order
ALTER TABLE public.b_restock_order 
ADD COLUMN IF NOT EXISTS order_no VARCHAR(255);

-- Check if shop_A exists, if not maybe insert it (optional, better to let user handle)
-- SELECT * FROM sys_shop WHERE shop_name = 'shop_A';
