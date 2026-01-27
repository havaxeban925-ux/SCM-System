-- ================== 女装供应链协同系统 (SCM) - Supabase Schema ==================
-- 在 Supabase SQL Editor 中执行此脚本

-- ================== 1. 商家/用户表 ==================
CREATE TABLE IF NOT EXISTS sys_shop (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'FACTORY', -- FACTORY(商家), BUYER(买手), MERCHANDISER(跟单员)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== 2. 款式需求表 ==================
CREATE TABLE IF NOT EXISTS b_style_demand (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  push_type VARCHAR(10) DEFAULT 'ASSIGN', -- ASSIGN(指定推送), POOL(公海抢单)
  shop_id UUID REFERENCES sys_shop(id),
  shop_name VARCHAR(100),
  image_url VARCHAR(500),
  ref_link VARCHAR(500),
  name VARCHAR(200),
  remark TEXT,
  timestamp_label VARCHAR(50), -- 时间标签如"2小时前转入"
  status VARCHAR(20) DEFAULT 'new', -- locked, new, completed, abandoned, developing
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
  image_url VARCHAR(500),
  intent_count INT DEFAULT 0,
  max_intents INT DEFAULT 2,
  tags TEXT[], -- 标签数组
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================== 4. 申请记录表（合并核价+异常） ==================
CREATE TABLE IF NOT EXISTS b_request_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- pricing(核价类), anomaly(异常类)
  sub_type VARCHAR(50), -- 二级类目：毛织类核价、非毛织类核价、同款同价、申请涨价、尺码问题、申请下架、图片异常
  target_codes TEXT[], -- 关联的SKC/SPU/SKU代码数组
  submit_time TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'processing', -- processing, completed, rejected
  pricing_details JSONB, -- 核价详情JSON
  shop_name VARCHAR(100),
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
  status VARCHAR(30) DEFAULT '待商家接单', -- 待商家接单, 待买手复核, 生产中, 待买手确认入仓, 已确认入仓, 已发货
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

-- ================== 8. 启用 RLS (Row Level Security) ==================
-- 为简化演示，暂时允许匿名访问所有数据
ALTER TABLE sys_shop ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_style_demand ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_public_style ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_request_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_quote_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_restock_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE b_restock_logistics ENABLE ROW LEVEL SECURITY;

-- 创建允许匿名访问的策略
CREATE POLICY "Allow anonymous access" ON sys_shop FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON b_style_demand FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON b_public_style FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON b_request_record FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON b_quote_order FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON b_restock_order FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access" ON b_restock_logistics FOR ALL USING (true) WITH CHECK (true);

-- ================== 9. 插入初始示例数据 ==================

-- 插入示例商家
INSERT INTO sys_shop (id, shop_name, phone, role) VALUES
  ('11111111-1111-1111-1111-111111111111', '[示例官方旗舰店]', '13800138000', 'FACTORY'),
  ('22222222-2222-2222-2222-222222222222', '[名品潮流馆]', '13900139000', 'FACTORY'),
  ('33333333-3333-3333-3333-333333333333', '赫本工作室', '13700137000', 'FACTORY'),
  ('44444444-4444-4444-4444-444444444444', '意式精品馆', '13600136000', 'FACTORY');

-- 插入私推款式
INSERT INTO b_style_demand (shop_id, shop_name, name, image_url, remark, timestamp_label, status, days_left) VALUES
  ('11111111-1111-1111-1111-111111111111', '[示例官方旗舰店]', '法式优雅碎花连衣长裙', 
   'https://images.unsplash.com/photo-1572804013307-a9a11198427e?auto=format&fit=crop&q=80&w=400',
   '建议面料：雪纺、丝绸；适合早秋休闲与职场通勤场景。', '2小时前转入', 'locked', 2),
  ('22222222-2222-2222-2222-222222222222', '[名品潮流馆]', '极简廓形真丝衬衫',
   'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=400',
   '高端支线款式，关注真丝缩水率控制。', '昨天 15:30 推送', 'new', NULL);

-- 插入开发中款式
INSERT INTO b_style_demand (shop_id, shop_name, name, image_url, remark, timestamp_label, status, development_status) VALUES
  ('33333333-3333-3333-3333-333333333333', '赫本工作室', '复古赫本风赫本风方领大摆裙',
   'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&q=80&w=400',
   '领口深度需微调，裙摆增加20cm垂度感。', '2024-05-22', 'developing', 'drafting'),
  ('44444444-4444-4444-4444-444444444444', '意式精品馆', '意式重工刺绣羊毛大衣',
   'https://images.unsplash.com/photo-1539533377285-b827dd19028a?auto=format&fit=crop&q=80&w=400',
   '关注袖口刺绣密度，面料克重需在800g以上。', '2024-05-21', 'developing', 'helping');

-- 插入公池款式
INSERT INTO b_public_style (name, image_url, intent_count, max_intents, tags) VALUES
  ('高腰直筒牛仔裤', 'https://picsum.photos/seed/denim/400', 1, 2, ARRAY['丹宁']),
  ('羊毛开衫', 'https://picsum.photos/seed/wool/400', 0, 2, ARRAY['毛织']);

-- 插入示例申请记录
INSERT INTO b_request_record (type, sub_type, target_codes, status, pricing_details, shop_name) VALUES
  ('pricing', '毛织类核价', ARRAY['SKC-991', 'SKC-992'], 'processing', 
   '[{"skc":"SKC-991","appliedPrice":59,"buyerPrice":59,"status":"成功","time":"2024-05-21"},{"skc":"SKC-992","appliedPrice":50,"buyerPrice":45,"status":"失败","time":"2024-05-21"}]'::jsonb,
   '测试商家'),
  ('anomaly', '修改尺码', ARRAY['SPU-ABC'], 'completed', NULL, '测试商家'),
  ('anomaly', '申请下架', ARRAY['SKC-X1'], 'completed', NULL, '测试商家');

-- 插入示例补货订单
INSERT INTO b_restock_order (skc_code, name, image_url, plan_quantity, actual_quantity, status, expiry_date) VALUES
  ('SKC2023001', '碎花连衣裙 - 复古蓝', 'https://picsum.photos/seed/p1/200', 1000, 900, '待商家接单', '2024-11-20'),
  ('SKC2023005', '羊毛针织衫 - 燕麦色', 'https://picsum.photos/seed/p2/200', 500, 500, '生产中', '2024-11-25');
