-- ================== 数据库迁移：添加推送时间字段 ==================
-- 问题4修复：私推失败 - Could not find 'first_push_time' column

-- 1. 添加首次推送和最近推送时间字段
ALTER TABLE b_style_demand 
ADD COLUMN IF NOT EXISTS first_push_time TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_push_time TIMESTAMPTZ DEFAULT NOW();

-- 2. 添加买手反馈字段（问题10预备）
ALTER TABLE b_style_demand 
ADD COLUMN IF NOT EXISTS buyer_feedback TEXT;

-- 3. 添加KEY名称字段（用于推款历史显示）
ALTER TABLE b_style_demand 
ADD COLUMN IF NOT EXISTS key_name VARCHAR(100);

-- 4. 为现有数据填充默认值
UPDATE b_style_demand 
SET 
    first_push_time = COALESCE(first_push_time, created_at),
    last_push_time = COALESCE(last_push_time, updated_at)
WHERE first_push_time IS NULL OR last_push_time IS NULL;

-- 5. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_style_demand_first_push ON b_style_demand(first_push_time);
CREATE INDEX IF NOT EXISTS idx_style_demand_last_push ON b_style_demand(last_push_time);
