-- 添加 is_urgent 加急字段到 b_restock_order 表
ALTER TABLE b_restock_order 
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;

-- 创建索引以支持加急排序
CREATE INDEX IF NOT EXISTS idx_restock_urgent ON b_restock_order(is_urgent DESC, created_at DESC);
