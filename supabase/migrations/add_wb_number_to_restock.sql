-- 给 b_restock_order 添加 wb_number 列，用于保存商家发货时的物流单号
ALTER TABLE b_restock_order ADD COLUMN IF NOT EXISTS wb_number VARCHAR(100);
