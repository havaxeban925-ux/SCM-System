-- ================== 女装供应链协同系统 (SCM) - Supabase Schema ==================
-- 在 Supabase SQL Editor 中执行此脚本

-- ================== 1. 商家/用户表 ==================
CREATE TABLE IF NOT EXISTS sys_shop (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'FACTORY', -- FACTORY(商家), BUYER(买手), MERCHANDISER(跟单员)
  level VARCHAR(5) DEFAULT 'N', -- S/A/B/C/N 店铺等级
  key_id VARCHAR(100), -- 商家KEY
  shop_code VARCHAR(100), -- 店铺原始ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== 1.5 用户账号表 (用于商家注册/登录) ==================
CREATE TABLE IF NOT EXISTS sys_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL, -- 实际生产应使用加密哈希
  role VARCHAR(20) DEFAULT 'merchant', -- merchant(商家), admin(管理员)
  shop_name VARCHAR(100), -- 关联店铺名称（用于审核）
  status VARCHAR(20) DEFAULT 'pending', -- pending(待审批), approved(已通过), rejected(已驳回)
  reject_reason VARCHAR(255), -- 驳回原因
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== 2. 款式需求表 ==================
CREATE TABLE IF NOT EXISTS b_style_demand (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  push_type VARCHAR(10) DEFAULT 'ASSIGN', -- ASSIGN(指定推送), POOL(公海抢单)
  shop_id UUID REFERENCES sys_shop(id),
  shop_name VARCHAR(100),
  image_url TEXT, -- Base64 可能很长，使用 TEXT
  ref_link VARCHAR(500),
  name VARCHAR(200),
  remark TEXT,
  timestamp_label VARCHAR(50), -- 时间标签如"2小时前转入"
  status VARCHAR(20) DEFAULT 'new', -- locked, new, completed, abandoned, developing
  tags TEXT[], -- 标签数组
  days_left INT,
  development_status VARCHAR(20) DEFAULT 'drafting', -- drafting, helping, ok, success
  confirm_time TIMESTAMPTZ,
  back_spu TEXT, -- SPU列表，空格分割
  is_modify_img BOOLEAN DEFAULT FALSE,
  real_img_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== 3. 公池款式表 ==================
CREATE TABLE IF NOT EXISTS b_public_style (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200),
  image_url TEXT, -- Base64 可能很长，使用 TEXT
  intent_count INT DEFAULT 0,
  max_intents INT DEFAULT 2,
  tags TEXT[], -- 标签数组
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== 4. 申请记录表（合并核价+异常） ==================
CREATE TABLE IF NOT EXISTS b_request_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- pricing(核价类), anomaly(异常类), style(款式类)
  sub_type VARCHAR(50), -- 二级类目：毛织类核价、非毛织类核价、同款同价、申请涨价、尺码问题、申请下架、图片异常
  target_codes TEXT[], -- 关联的SKC/SPU/SKU代码数组
  submit_time TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'processing', -- processing, completed, rejected
  pricing_details JSONB, -- 核价详情JSON
  shop_name VARCHAR(100),
  remark TEXT, -- 备注信息
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== 5. 核价工单表 ==================
CREATE TABLE IF NOT EXISTS b_quote_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES b_request_record(id) ON DELETE CASCADE,
  quote_no VARCHAR(32) UNIQUE,
  shop_name VARCHAR(100),
  type VARCHAR(20) NOT NULL, -- WOOL(毛织), NORMAL(非毛织), SAME_PRICE(同价), INCREASE(涨价)
  skc_code VARCHAR(100),
  style_no VARCHAR(100), -- 毛织款号
  total_price DECIMAL(10,2),
  profit_rate DECIMAL(5,2),
  status SMALLINT DEFAULT 0, -- 0-待核价, 1-已核价, 2-商家已接受, 3-商家已拒绝
  audited_price DECIMAL(10,2),
  audit_remark VARCHAR(500),
  merchant_feedback VARCHAR(20), -- ACCEPT, REJECT
  merchant_expect_price DECIMAL(10,2),
  reject_reason VARCHAR(255),
  detail_json JSONB, -- 完整成本明细JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== 6. 补货工单主表 ==================
CREATE TABLE IF NOT EXISTS b_restock_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restock_no VARCHAR(32) UNIQUE,
  skc_code VARCHAR(100) NOT NULL,
  name VARCHAR(200),
  image_url VARCHAR(500),
  shop_id UUID REFERENCES sys_shop(id),
  plan_quantity INT NOT NULL,
  actual_quantity INT,
  arrived_quantity INT DEFAULT 0,
  status VARCHAR(30) DEFAULT 'pending', -- pending(待商家接单), reviewing(待买手复核), producing(生产中), confirming(待买手确认入仓), confirmed(已确认入仓), shipped(已发货)
  reduction_reason TEXT,
  remark VARCHAR(255),
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== 7. 补货物流明细表 ==================
CREATE TABLE IF NOT EXISTS b_restock_logistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restock_order_id UUID REFERENCES b_restock_order(id) ON DELETE CASCADE,
  wb_number VARCHAR(100) NOT NULL,
  logistics_company VARCHAR(50),
  shipped_qty INT NOT NULL,
  status SMALLINT DEFAULT 0, -- 0-待入仓, 1-已入仓确认
  confirm_time TIMESTAMPTZ,
  operator_id UUID REFERENCES sys_shop(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== 8. 标签表 ==================
CREATE TABLE IF NOT EXISTS b_tag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  category VARCHAR(20), -- 'visual'(视觉标签), 'style'(风格标签)
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== 9. 启用 RLS (Row Level Security) ==================
-- 为简化演示，暂时允许匿名访问所有数据
ALTER TABLE sys_shop ENABLE ROW LEVEL SECURITY;
ALTER TABLE sys_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_style_demand ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_public_style ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_request_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_quote_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_restock_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_restock_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_tag ENABLE ROW LEVEL SECURITY;

-- 创建允许匿名访问的策略
CREATE POLICY "Allow anonymous access" ON sys_shop FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON sys_user FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON b_style_demand FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON b_public_style FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON b_request_record FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON b_quote_order FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON b_restock_order FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON b_restock_logistics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON b_tag FOR ALL USING (true) WITH CHECK (true);

-- ================== 10. 索引优化 ==================
CREATE INDEX IF NOT EXISTS idx_style_demand_shop_id ON b_style_demand(shop_id);
CREATE INDEX IF NOT EXISTS idx_style_demand_status ON b_style_demand(status);
CREATE INDEX IF NOT EXISTS idx_request_record_type_status ON b_request_record(type, status);
CREATE INDEX IF NOT EXISTS idx_shop_key_id ON sys_shop(key_id);
CREATE INDEX IF NOT EXISTS idx_restock_order_status ON b_restock_order(status);

-- ================== 11. 注意事项 ==================
-- 示例数据已移除，所有数据应来自用户自助上传或买手推送

-- ================== 12. 优化字段扩展 (OPT-1, OPT-6, OPT-8) ==================

-- OPT-1: 添加操作人追溯字段
ALTER TABLE b_style_demand ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);
ALTER TABLE b_request_record ADD COLUMN IF NOT EXISTS processed_by VARCHAR(50);
ALTER TABLE b_restock_order ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);
ALTER TABLE b_public_style ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);

-- OPT-6: 添加用户与店铺的外键关联
ALTER TABLE sys_user ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES sys_shop(id);
CREATE INDEX IF NOT EXISTS idx_user_shop_id ON sys_user(shop_id);

-- OPT-8: 添加紧急标记字段
ALTER TABLE b_style_demand ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;
ALTER TABLE b_style_demand ADD COLUMN IF NOT EXISTS source_public_id UUID; -- 用于关联公池来源

-- ================== 13. 商家删除申请表 (OPT-3) ==================
CREATE TABLE IF NOT EXISTS shop_delete_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES sys_shop(id),
    shop_name VARCHAR(100),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    requested_by VARCHAR(100),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_by VARCHAR(50),
    processed_at TIMESTAMPTZ,
    reject_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_shop_delete_requests_status ON shop_delete_requests(status);

-- 启用RLS
ALTER TABLE shop_delete_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous access" ON shop_delete_requests FOR ALL USING (true) WITH CHECK (true);

-- ================== 14. 工单归档 (OPT-5) ==================
CREATE TABLE IF NOT EXISTS b_request_record_archive (
    LIKE b_request_record INCLUDING ALL
);

-- 归档函数
CREATE OR REPLACE FUNCTION archive_old_records()
RETURNS void AS $$
BEGIN
    INSERT INTO b_request_record_archive
    SELECT * FROM b_request_record
    WHERE status IN ('completed', 'rejected')
      AND updated_at < NOW() - INTERVAL '30 days';
    
    DELETE FROM b_request_record
    WHERE status IN ('completed', 'rejected')
      AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ================== 15. 私推过期处理 (OPT-8) ==================
CREATE OR REPLACE FUNCTION process_expired_private_styles()
RETURNS void AS $$
BEGIN
    -- 14天过期：默认拒绝
    UPDATE b_style_demand
    SET status = 'rejected',
        updated_at = NOW()
    WHERE push_type = 'PRIVATE'
      AND status = 'new'
      AND created_at < NOW() - INTERVAL '14 days';
      
    -- 7天以上：标记置顶
    UPDATE b_style_demand
    SET is_urgent = true
    WHERE push_type = 'PRIVATE'
      AND status = 'new'
      AND created_at < NOW() - INTERVAL '7 days'
      AND (is_urgent IS NULL OR is_urgent = false);
END;
$$ LANGUAGE plpgsql;

-- ================== 16. 公池意向管理 (OPT-10) ==================
CREATE OR REPLACE FUNCTION decrement_intent_count(style_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE b_public_style
    SET intent_count = GREATEST(intent_count - 1, 0)
    WHERE id = style_id;
END;
$$ LANGUAGE plpgsql;

-- 数据迁移：将现有shop_name映射到shop_id
-- UPDATE sys_user u SET shop_id = s.id FROM sys_shop s WHERE u.shop_name = s.shop_name AND u.shop_id IS NULL;
