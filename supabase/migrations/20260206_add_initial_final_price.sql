-- 20260206_add_initial_final_price.sql
-- 添加核价流程必需的 initial_price 和 final_price 列（如不存在）

ALTER TABLE b_request_record ADD COLUMN IF NOT EXISTS initial_price DECIMAL(10,2);
ALTER TABLE b_request_record ADD COLUMN IF NOT EXISTS final_price DECIMAL(10,2);

-- 刷新 Schema Cache（PostgREST 需要）
NOTIFY pgrst, 'reload schema';
