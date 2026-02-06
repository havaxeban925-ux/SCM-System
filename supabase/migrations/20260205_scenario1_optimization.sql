-- ================== 场景1优化 - 数据库迁移 ==================
-- 执行时间: 2026-02-05
-- 功能: KEY/店铺层级重构 + 两阶段核价流程 + 系统编号规范化

-- ================== 1. sys_shop 表扩展 ==================
-- 添加 key_name (商号名称，用于显示)
ALTER TABLE sys_shop ADD COLUMN IF NOT EXISTS key_name VARCHAR(100);

-- 添加 style_tags (风格标签数组)
ALTER TABLE sys_shop ADD COLUMN IF NOT EXISTS style_tags TEXT[];

-- 创建唯一索引确保 shop_code 唯一 (如果需要)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_code_unique ON sys_shop(shop_code) WHERE shop_code IS NOT NULL AND shop_code != '';

-- 创建 key_name 索引
CREATE INDEX IF NOT EXISTS idx_shop_key_name ON sys_shop(key_name);

-- ================== 2. 系统编号序列表 ==================
CREATE TABLE IF NOT EXISTS sys_sequence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(10) NOT NULL,         -- 'H'(核价), 'Y'(异常), 'K'(款式)
    date_str VARCHAR(8) NOT NULL,      -- 格式: YYYYMMDD
    current_seq INT DEFAULT 0,         -- 当前序号
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(type, date_str)
);

-- 启用 RLS
ALTER TABLE sys_sequence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON sys_sequence FOR ALL USING (true) WITH CHECK (true);

-- 获取下一个序号的函数
CREATE OR REPLACE FUNCTION get_next_sequence(p_type VARCHAR, p_date VARCHAR)
RETURNS INT AS $$
DECLARE
    next_seq INT;
BEGIN
    -- 尝试更新并获取下一个序号
    UPDATE sys_sequence
    SET current_seq = current_seq + 1,
        updated_at = NOW()
    WHERE type = p_type AND date_str = p_date
    RETURNING current_seq INTO next_seq;
    
    -- 如果没有记录，插入新记录
    IF next_seq IS NULL THEN
        INSERT INTO sys_sequence (type, date_str, current_seq)
        VALUES (p_type, p_date, 1)
        ON CONFLICT (type, date_str) DO UPDATE
        SET current_seq = sys_sequence.current_seq + 1
        RETURNING current_seq INTO next_seq;
    END IF;
    
    RETURN next_seq;
END;
$$ LANGUAGE plpgsql;

-- ================== 3. b_request_record 表扩展 (核价流程) ==================
-- 添加调价原因
ALTER TABLE b_request_record ADD COLUMN IF NOT EXISTS reason TEXT;

-- 添加初核价格
ALTER TABLE b_request_record ADD COLUMN IF NOT EXISTS initial_price DECIMAL(10,2);

-- 添加最终价格
ALTER TABLE b_request_record ADD COLUMN IF NOT EXISTS final_price DECIMAL(10,2);

-- 添加系统编号
ALTER TABLE b_request_record ADD COLUMN IF NOT EXISTS order_no VARCHAR(20);

-- 添加是否加急字段
ALTER TABLE b_request_record ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;

-- 更新状态枚举说明 (核价流程):
-- 'received' - 收到 (买手端)
-- 'reviewing' - 初核中 (买手端)
-- 'pending_confirm' - 待确认 (商家端)
-- 'confirmed' - 已确认 (商家接受)
-- 'pending_recheck' - 待复核 (商家拒绝)
-- 'completed' - 已完成 (复核后强制完成)

-- ================== 4. b_style_demand 表扩展 (推款历史) ==================
-- 添加首次推送时间
ALTER TABLE b_style_demand ADD COLUMN IF NOT EXISTS first_push_time TIMESTAMPTZ;

-- 添加最近推送时间
ALTER TABLE b_style_demand ADD COLUMN IF NOT EXISTS last_push_time TIMESTAMPTZ;

-- 添加关联的 KEY 名称 (冗余存储便于查询)
ALTER TABLE b_style_demand ADD COLUMN IF NOT EXISTS key_name VARCHAR(100);

-- ================== 5. 数据迁移 ==================
-- 将现有 key_id 复制到 key_name (如果 key_name 为空)
UPDATE sys_shop 
SET key_name = key_id 
WHERE key_name IS NULL AND key_id IS NOT NULL;

-- 将 created_at 复制到 first_push_time 和 last_push_time (如果为空)
UPDATE b_style_demand
SET first_push_time = created_at,
    last_push_time = created_at
WHERE first_push_time IS NULL;

-- ================== 完成 ==================
-- 执行完成后请刷新 Supabase 控制台查看变更
