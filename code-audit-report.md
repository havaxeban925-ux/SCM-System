# 代码深度审计报告

**审计时间**: 2026-02-04  
**审计范围**: 全量功能女装供应链管理系统  
**审计依据**: 9个核心业务场景  
**审计维度**: 僵尸代码清洗、场景逻辑穿透、隐患与防御性编程

---

## 📊 审计总览

| 问题级别 | 数量 | 说明 |
|---------|------|------|
| 🔥 严重问题 | 4 | 影响核心业务流程，必须立即修复 |
| ⚠️ 警告问题 | 11 | 功能缺陷或潜在风险，建议优先处理 |
| 🧹 清理项 | 7 | 僵尸代码与冗余依赖，可择机清理 |

---

## 🔥 严重问题（Critical）

### 1. 异常申请缺少商家关联字段
**影响场景**: 方案5 - 异常协同  
**涉及文件**:
- `services/requestService.ts:69-76`
- `components/QuotationDrawer.tsx:640-645`
- `server/routes/requests.ts:138-150`

**问题描述**:  
前端调用 `createAnomalyRequest` 时未传递 `shopName`，但后端在创建异常工单时依赖该字段写入数据库。这会导致：
- 异常工单无法正确关联到商家
- 后续查询和统计可能失败

**修复方案**:
```typescript
// requestService.ts
export async function createAnomalyRequest(
  params: AnomalyRequest & { shopName: string }
): Promise<void> {
  await api.post('/api/requests/anomaly', params);
}

// QuotationDrawer.tsx 调用处
await createAnomalyRequest({
  ...anomalyData,
  shopName: currentShopName // 需从上下文获取
});
```

---

### 2. 补货协同状态枚举不一致
**影响场景**: 方案6 - 补货协同  
**涉及文件**:
- `pages/ReplenishmentSynergy.tsx:69-92, 138-151`
- `server/routes/restock.ts:58-66, 125-126, 173-175`

**问题描述**:  
前端使用中文状态筛选和渲染（如"待确认"、"已确认"），后端存储和返回英文状态（如"pending"、"confirmed"），导致：
- 前端状态筛选完全失效
- 页面无法正确展示补货单状态
- 双端状态理解不一致

**修复方案**:  
**方案A（推荐）**: 后端统一返回中文状态映射
```typescript
// restock.ts
const STATUS_MAP = {
  pending: '待确认',
  confirmed: '已确认',
  completed: '已完成'
};

// 在返回数据时映射
.select('*, status_display:status')
.then(data => data.map(item => ({
  ...item,
  status: STATUS_MAP[item.status]
})))
```

**方案B**: 前端统一使用英文枚举
```typescript
// ReplenishmentSynergy.tsx
const STATUS_OPTIONS = [
  { value: 'pending', label: '待确认' },
  { value: 'confirmed', label: '已确认' },
  // ...
];
```

---

### 3. 通知接口字段不匹配
**影响场景**: 方案1 - 身份认证（通知中心）  
**涉及文件**:
- `server/routes/notifications.ts:48-53`
- `App.tsx:285-287`

**问题描述**:  
后端通知接口使用 `shop_id` 过滤，前端却传递 `shop_name`，导致：
- 通知查询永远为空
- 商家无法收到任何系统通知

**修复方案**:
```typescript
// App.tsx
const fetchNotifications = async () => {
  if (!user?.id) return;
  
  const { data } = await supabase
    .from('b_notification')
    .select('*')
    .eq('shop_id', user.id) // 改用 shop_id
    .order('created_at', { ascending: false });
    
  setNotifications(data || []);
};
```

---

### 4. 补货状态变更缺少并发控制
**影响场景**: 方案6 - 补货协同  
**涉及文件**:
- `server/routes/restock.ts:44-71`

**问题描述**:  
关键状态变更（确认、完成）缺少状态前置校验和乐观锁机制，双端并发操作可能导致：
- 已确认的补货单被重复确认
- 状态机跳转混乱
- 数据一致性被破坏

**修复方案**:
```typescript
// restock.ts - 确认补货单
router.post('/:id/confirm', async (req, res) => {
  const { id } = req.params;
  
  // 1. 先读取当前状态
  const { data: current } = await supabase
    .from('b_restock_order')
    .select('status')
    .eq('id', id)
    .single();
    
  // 2. 校验状态机
  if (current.status !== 'pending') {
    return res.status(400).json({ 
      error: '只能确认待处理状态的补货单' 
    });
  }
  
  // 3. 带条件更新（乐观锁）
  const { data, error } = await supabase
    .from('b_restock_order')
    .update({ 
      status: 'confirmed',
      confirmed_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('status', 'pending') // 确保状态未被其他请求修改
    .select()
    .single();
    
  if (!data) {
    return res.status(409).json({ 
      error: '状态已变更，请刷新后重试' 
    });
  }
  
  res.json({ data });
});
```

---

## ⚠️ 警告问题（Warning）

### 5. 公池接款缺少商家归属追踪
**影响场景**: 方案2 - SPU管理（公池接款）  
**涉及文件**:
- `services/styleService.ts:51-55`
- `server/routes/styles.ts:130-139`

**问题描述**:  
公池接款时未传递 `shopId` 和 `shopName`，后端默认写入"公池商家"，导致：
- 无法追踪哪个商家接走的款
- 后续统计和分账缺失数据源

**修复方案**:
```typescript
// styleService.ts
await api.post(`/api/styles/${styleId}/claim-public`, {
  shopId: currentUser.id,
  shopName: currentUser.shopName
});

// styles.ts
const { shopId, shopName } = req.body;
await supabase.from('b_style_shop').insert({
  style_id: styleId,
  shop_id: shopId,
  shop_name: shopName, // 改为真实商家
  status: 1
});
```

---

### 6. API 路径使用相对地址
**影响场景**: 所有前后端分离部署  
**涉及文件**:
- `components/QuotationDrawer.tsx:649-655`
- `pages/RequestWorkbench.tsx:525-529`

**问题描述**:  
多处直接使用 `/api/...` 相对路径，前后端分离部署或跨域场景会直接 404

**修复方案**:
```typescript
// 统一使用环境变量
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// 所有请求改为
await fetch(`${API_BASE}/api/requests/quote`, {...});
```

---

### 7. 打版进度方案数据未持久化
**影响场景**: 方案7 - 打版进度  
**涉及文件**:
- `pages/DevelopmentProgress.tsx:76-123, 170-173`
- `services/developmentService.ts:17-23`
- `server/routes/development.ts:129-139`

**问题描述**:  
前端维护多个方案（schemes）的完整数据，但提交时只传 `patternNo`，方案详情丢失

**修复方案**:
```typescript
// developmentService.ts
export async function updatePattern(
  styleId: string, 
  schemes: PatternScheme[]
): Promise<void> {
  await api.put(`/api/styles/${styleId}/pattern`, { schemes });
}

// development.ts 新增接口
router.put('/:styleId/pattern', async (req, res) => {
  const { styleId } = req.params;
  const { schemes } = req.body;
  
  await supabase
    .from('b_style_pattern')
    .upsert({
      style_id: styleId,
      schemes_json: JSON.stringify(schemes)
    });
    
  res.json({ success: true });
});
```

---

### 8. 推款链接未写入数据库
**影响场景**: 方案3 - 公池管理（私推/公推）  
**涉及文件**:
- `admin/pages/PushManage.tsx:24-35, 122-133, 164-173`

**问题描述**:  
表单中填写的 `privateLink` 和 `publicLink` 在提交时未传给后端，导致链接数据丢失

**修复方案**:
```typescript
// PushManage.tsx
const handlePrivatePush = async () => {
  await fetch('/api/admin/push/private', {
    method: 'POST',
    body: JSON.stringify({
      styleIds: selectedStyles,
      shopNames: selectedShops,
      link: privateLink // 新增
    })
  });
};

// admin.ts 后端接收
const { link } = req.body;
await supabase.from('b_push_record').insert({
  // ...
  link
});
```

---

### 9. 标签管理未接入后端
**影响场景**: 方案2 - SPU管理  
**涉及文件**:
- `admin/pages/TagManage.tsx:10-45`
- `server/routes/admin.ts:265-296`

**问题描述**:  
前端标签管理页面只维护本地 state，刷新即丢失。后端已有完整的标签 CRUD 接口但未使用

**修复方案**:
```typescript
// TagManage.tsx
useEffect(() => {
  fetch('/api/admin/tags')
    .then(r => r.json())
    .then(data => setTags(data));
}, []);

const handleAddTag = async (tag) => {
  await fetch('/api/admin/tags', {
    method: 'POST',
    body: JSON.stringify(tag)
  });
  // 重新加载
};
```

**或者**: 如果 9 个场景中不需要标签管理，建议删除整个 `TagManage.tsx` 页面

---

### 10. SPU 库页面完全本地模拟
**影响场景**: 方案2 - SPU管理  
**涉及文件**:
- `admin/pages/SpuLibrary.tsx:10-41`
- `server/routes/admin.ts:436-458`

**问题描述**:  
SPU 库页面数据完全 mock，后端已有 `/api/admin/spu` 接口但未接入

**修复方案**:  
接入后端接口或**直接删除整个页面**（如果不在 9 场景内）

---

### 11. 推款历史未持久化
**影响场景**: 方案3 - 公池管理  
**涉及文件**:
- `admin/pages/PushHistory.tsx:43-84`
- `server/routes/admin.ts:414-432`

**问题描述**:  
推款历史页面本地修改状态，未调用后端接口持久化

**修复方案**:
```typescript
// PushHistory.tsx
useEffect(() => {
  fetch('/api/admin/push/history')
    .then(r => r.json())
    .then(setHistory);
}, []);

const handleStatusChange = async (id, status) => {
  await fetch(`/api/admin/push/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
  // 重新加载
};
```

---

### 12-15. 硬编码常量风险
**涉及文件**:
- `admin.ts:108-109` - 用户总数固定为 4
- `styles.ts:47-50` - 名额上限写死为 5
- `admin/pages/BulkOrderPage.tsx:26-37` - 金额用 `quantity * 100` 模拟
- `admin/pages/PushHistory.tsx:134-135` - 接款进度上限固定为 3

**问题描述**:  
多处业务规则硬编码，无法根据实际情况调整

**修复方案**:  
移到配置文件或改为数据库配置项
```typescript
// config/business.ts
export const BUSINESS_CONFIG = {
  STYLE_CLAIM_LIMIT: 5,
  BULK_ORDER_UNIT_PRICE: 100,
  CLAIM_PROGRESS_MAX: 3
};
```

---

### 16. 款式工单类型推断不可靠
**影响场景**: 方案8 - 款式工单管理  
**涉及文件**:
- `admin/pages/StyleOrderPage.tsx:32-37`

**问题描述**:  
用 `push_type` 字段推断工单类型，缺少真实状态字段支撑

**修复方案**:  
后端增加明确的 `order_type` 字段或建立完整的类型映射表

---

## 🧹 清理项（Cleanup）

### 17. 未使用的导入
**文件**: `App.tsx:5`

```typescript
// 删除
import { getQuotaStats } from './services/styleService';
```

---

### 18. 不可达的注册被拒分支
**文件**: `App.tsx:26-27, 141-145`

**问题**: `registerStatus` 的 `rejected` 状态从未被触发

**建议**: 删除或补齐审核流程

---

### 19. 永不生效的提交成功状态
**文件**: `QuotationDrawer.tsx:155, 290`

**问题**: `isSubmitted` 永远为 `false`，成功页永不展示

**建议**: 删除相关代码或补齐提交后的成功反馈流程

---

### 20. 未使用的图片状态
**文件**: `QuotationDrawer.tsx:214`

```typescript
// 删除
const [quoteImages, setQuoteImages] = useState<string[]>([]);
```

---

### 21. 僵尸函数
**文件**: `PushManage.tsx:196-203`

```typescript
// 删除 toggleShop 函数及相关代码
```

---

### 22. 不可达的款式详情弹窗
**文件**: `RequestWorkbench.tsx:314-316, 453-551`

**问题**: 只有核价工单才有"查看详情"入口，款式详情弹窗代码不可达

**建议**: 增加入口或删除整个弹窗组件

---

### 23. 冗余依赖
**文件**: `package.json:25-34`

**未使用的依赖**:
- `@google/genai`
- `node-cron`
- `@types/node-cron`
- `pptxgenjs`

**修复方案**:
```bash
npm uninstall @google/genai node-cron @types/node-cron pptxgenjs
```

预计可减少包体积 **~15MB**

---

## 📋 修复优先级建议

### P0（立即修复）
1. 异常申请商家关联缺失 (#1)
2. 补货状态枚举不一致 (#2)
3. 通知接口字段不匹配 (#3)
4. 补货并发控制缺失 (#4)

### P1（本周内）
5. 公池接款归属追踪 (#5)
6. API 相对路径改造 (#6)
7. 打版方案数据持久化 (#7)
8. 推款链接写入 (#8)

### P2（下一迭代）
9-16. 幽灵功能接入或删除  
17-22. 僵尸代码清理

### P3（择机处理）
23. 冗余依赖清理

---

## 📊 代码健康度评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 功能完整性 | ⭐⭐⭐☆☆ | 核心流程基本可用，但存在 4 处关键断点 |
| 数据一致性 | ⭐⭐☆☆☆ | 双端状态/字段不一致问题严重 |
| 防御性编程 | ⭐⭐☆☆☆ | 缺少并发控制、空值兜底 |
| 代码整洁度 | ⭐⭐⭐☆☆ | 存在较多僵尸代码和幽灵功能 |
| 可维护性 | ⭐⭐⭐☆☆ | 硬编码较多，部分逻辑分散 |

**综合评分**: ⭐⭐⭐☆☆ (3/5)

---

## 🎯 总结与建议

### 现状
你的系统已经具备 MVP 的基本轮廓，9 个核心场景的代码骨架完整，但**双端协议不一致**和**链路断点**是当前最大的风险。

### 核心风险
1. **状态机混乱**: 补货协同的前后端状态枚举完全不匹配
2. **链路断裂**: 异常申请、公池接款、通知查询等关键流程存在字段缺失
3. **并发漏洞**: 缺少基本的状态校验和乐观锁机制

### 瘦身潜力
- 删除 4 个幽灵功能页面可减少 **~800 行代码**
- 清理僵尸代码和冗余依赖可减少 **~15MB 包体积**

### 行动建议
1. **Week 1**: 修复 P0 级别的 4 个严重问题，确保核心流程可用
2. **Week 2**: 处理 P1 级别的数据持久化和环境配置问题
3. **Week 3**: 决策幽灵功能的去留（接入后端 or 删除）
4. **Week 4**: 代码瘦身与技术债清理

---

**审计人**: AI Tech Lead  
**生成时间**: 2026-02-04  
**文档版本**: v1.0
