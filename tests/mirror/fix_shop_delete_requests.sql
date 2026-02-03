-- 修复商家删除申请表
CREATE TABLE IF NOT EXISTS shop_delete_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES sys_shop(id),
    shop_name VARCHAR(100),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    requested_by VARCHAR(100),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_by VARCHAR(50),
    processed_at TIMESTAMPTZ,
    reject_reason TEXT
);

-- 授予权限
GRANT ALL ON shop_delete_requests TO postgres, anon, authenticated, service_role;

-- 启用 RLS
ALTER TABLE shop_delete_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON shop_delete_requests FOR ALL USING (true) WITH CHECK (true);

-- 刷新缓存
NOTIFY pgrst, 'reload schema';
