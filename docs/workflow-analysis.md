# SCM系统前后端功能交互工作流分析

## 一、概述

本文档详细分析SCM协同管理系统中买手前端与商家前端四大核心功能的交互工作流，包括推款与接款、申请与审批、补货订单、开发进度同步四大场景。每个场景涵盖触发条件、数据流转、状态同步、异常处理等完整流程。

---

## 二、推款与接款流程

### 2.1 场景描述

买手通过私推或公池方式向商家推送款式，商家查看并决定是否接受。该流程是SCM系统最核心的业务入口，涉及款式资源的分配与竞争机制。

### 2.2 参与模块

| 端 | 模块名称 | 核心职责 |
|----|----------|----------|
| 买手前端 | 推款管理（PushManage） | 创建私推/公池款式，选择目标店铺，设置款式属性 |
| 商家前端 | 款式工作台（StyleWorkbench） | 查看推送款式，执行接款/放弃操作，管理私推列表 |
| 后端 | styles路由 | 处理款式创建、状态更新、接款意向等业务逻辑 |

### 2.3 完整工作流

#### 2.3.1 私推流程

```
【步骤1】买手创建私推款式

操作：买手在PushManage页面填写款式信息并提交
API：POST /api/styles/private
请求参数：
{
  "image_url": "https://example.com/image.jpg",
  "ref_link": "https://example.com/style",
  "shop_id": "shop_001",
  "remark": "适合秋季款",
  "tags": ["优雅风", "人模"],
  "visual": "人模",
  "style": "优雅风"
}

【步骤2】后端处理款式创建

处理逻辑：
1. 生成款式唯一ID（UUID）
2. 向b_style_demand表写入记录
3. 初始化状态为 'new'（待接受）
4. 初始化开发状态为 null
5. 返回创建结果

数据库写入：
INSERT INTO b_style_demand (
  id, shop_id, shop_name, image_url, ref_link,
  name, remark, status, development_status,
  created_at, tags, visual, style
) VALUES (
  UUID(), ?, ?, ?, ?, ?, ?, 'new', NULL,
  NOW(), ?, ?, ?
)

【步骤3】商家端监听并展示

监听机制：页面加载时调用 GET /api/styles/private 获取款式列表
轮询频率：每60秒自动刷新
展示规则：
  - 按创建时间倒序排列
  - 显示款式图片、名称、截止天数、备注
  - 状态标签：待接受（new/locked）、已接受（developing）

【步骤4】商家执行接款或放弃

操作A：接受款式
  API：POST /api/styles/{id}/accept
  业务逻辑：
    1. 验证款式状态为 'new' 或 'locked'
    2. 更新status为 'developing'
    3. 记录confirm_time（接款时间）
    4. 返回成功响应

操作B：放弃款式
  API：POST /api/styles/{id}/abandon
  请求参数：
  {
    "reason": "款式不适合店铺定位"
  }
  业务逻辑：
    1. 验证款式状态
    2. 记录放弃原因
    3. 恢复款式为可选状态
    4. 从商家私推列表移除

【步骤5】买手端实时同步

同步机制：
1. 买手Dashboard定时刷新（每5秒）
2. 调用 GET /api/admin/dashboard 获取统计数据
3. 更新推送状态计数：
   - privatePending：新推送待接受数量
   - privateAccepted：已接受数量
   - privateInProgress：开发中数量
```

#### 2.3.2 公池推款流程

```
【步骤1】买手创建公池款式

操作：买手在PushManage选择"推入公池"选项卡
API：POST /api/styles/public
请求参数：
{
  "image_url": "https://example.com/image.jpg",
  "name": "秋季新品连衣裙",
  "max_intents": 3,
  "tags": ["法式风", "人模"],
  "visual": "人模",
  "style": "法式风"
}

【步骤2】后端处理公池创建

处理逻辑：
1. 向b_style_public表写入记录
2. 初始化intent_count（已接款数）为0
3. 设置max_intents（最大接款数）为3
4. intent_user_ids（已接款店铺列表）初始化为空数组
5. 返回创建结果

【步骤3】所有商家可见公池款式

监听机制：商家端调用 GET /api/styles/public 获取公池列表
排序规则：
  优先级1：有1个意向的优先展示（intent_count > 0 且 < max_intents）
  优先级2：发布10天以上的老款优先（created_at < NOW() - 10天）
  优先级3：新款最后展示
展示数量：每次最多显示8款

【步骤4】商家表达接款意向

操作：商家点击"我想做"按钮
API：POST /api/styles/{id}/express_intent
请求参数：
{
  "shop_id": "shop_001"
}

【步骤5】后端处理接款意向

配额检查：
1. 查询商家当前公池接款数量
2. 检查是否达到上限（limit: 5）
3. 如果超限，返回错误：{ "error": "配额已满" }

意向处理：
1. intent_count += 1
2. 将shop_id添加到intent_user_ids
3. 返回成功响应

【步骤6】公池状态自动更新

当 intent_count >= max_intents 时：
1. 该款式从所有商家的公池列表隐藏
2. 不再接受新的接款申请
3. 通知已接款商家开始开发
```

### 2.4 数据传递格式

```json
// 款式推送对象（StyleDemand）
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "秋季新品连衣裙",
  "image_url": "https://example.com/image.jpg",
  "ref_link": "https://example.com/style/123",
  "shop_id": "shop_001",
  "shop_name": "示例服装店",
  "remark": "适合秋季穿着的面料",
  "status": "developing",
  "development_status": "drafting",
  "intent_count": 1,
  "max_intents": 3,
  "confirm_time": "2026-02-04T10:30:00Z",
  "created_at": "2026-02-01T08:00:00Z",
  "days_left": 14,
  "tags": ["优雅风", "法式风"],
  "visual": "人模",
  "style": "优雅风"
}

// 接款响应对象
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "developing",
    "confirm_time": "2026-02-04T10:30:00Z"
  }
}
```

---

## 三、申请与审批流程

### 3.1 场景描述

商家向买手提交核价或异常申请，买手审批后返回结果。该流程实现价格决策和问题处理的闭环管理，是业务协同的重要环节。

### 3.2 参与模块

| 端 | 模块名称 | 核心职责 |
|----|----------|----------|
| 商家前端 | 申请工作台（RequestWorkbench） | 提交各类申请，查看审批状态，提交二次申请 |
| 买手前端 | 核价工单管理（PricingOrderPage） | 查看待处理工单，执行审批操作，填写复核价格 |
| 买手前端 | 异常工单管理（AnomalyOrderPage） | 处理尺码异常、图片异常、申请下架等 |
| 后端 | requests路由 | 处理申请创建、审批操作、状态更新等业务逻辑 |

### 3.3 完整工作流

#### 3.3.1 商家提交核价申请

```
【步骤1】商家填写申请信息

操作：在RequestWorkbench点击"新建申请"
选择类型：核价类 → 同款同价/申请涨价/毛织类核价/非毛织类核价
填写内容：
  - 目标SKC：选择需要核价的商品编码
  - 申请价格：填写期望售价
  - 申请理由：说明调价原因

【步骤2】提交核价申请

API：POST /api/requests/quote
请求参数：
{
  "type": "pricing",
  "sub_type": "同款同价",
  "shop_name": "示例服装店",
  "quotes": [
    {
      "code": "SKC001",
      "price": 299.00,
      "type": "NORMAL"
    }
  ],
  "target_codes": ["SKC001"]
}

【步骤3】后端处理申请创建

处理逻辑：
1. 生成申请记录ID
2. 向b_request_record表写入：
   - type: 'pricing'
   - sub_type: 申请类型
   - status: 'processing'（处理中）
   - pricing_details: 包含申请价格、SKC编码等
3. 初始化买手价格 buyerPrice 为 null
4. 记录submit_time（提交时间）
5. 返回记录ID

【步骤4】商家端等待审批

状态展示：
  - processing：处理中（展示为"待处理"）
  - approved：已通过
  - rejected：已驳回

监听机制：每60秒轮询 GET /api/requests?type=pricing

【步骤5】买手端获取待处理工单

API：GET /api/requests?type=pricing&pageSize=100
数据筛选：只获取status='processing'的工单
展示优先级：按submit_time升序（先提交先处理）
```

#### 3.3.2 买手审批核价申请

```
【步骤1】买手查看工单详情

操作：点击工单记录，查看详细信息
展示内容：
  - 申请店铺、提交时间
  - 目标SKC列表、申请价格
  - pricing_details中的每个SKC明细
  - 申请理由（如有）

【步骤2】买手执行审批操作

操作：点击"处理"按钮，开始审批

操作A：初核通过
  输入：
    - 买手复核价格（buyerPrice）
  API：POST /api/requests/{id}/audit
  请求参数：
  {
    "action": "approve",
    "buyerPrices": {
      "SKC001": 259.00
    }
  }

操作B：驳回申请
  输入：
    - 驳回原因（feedback）
  API：POST /api/requests/{id}/audit
  请求参数：
  {
    "action": "reject",
    "feedback": "价格不符合市场定位"
  }

【步骤3】后端处理审批

状态更新逻辑：
1. action = 'approve' 时：
   - status = 'approved'
   - 在pricing_details中设置buyerPrice
   - 更新status为'已通过'
   
2. action = 'reject' 时：
   - status = 'rejected'
   - 记录feedback
   - 更新status为'已驳回'

【步骤4】商家端实时同步审批结果

监听触发：轮询时发现status变化
状态映射：
  - approved → 展示"已通过"，显示买手复核价格
  - rejected → 展示"已驳回"，显示驳回原因

展示内容：
  - 买手复核价格
  - 审批时间
  - 反馈信息（如有）
```

#### 3.3.3 二次核价流程（可选）

```
【步骤1】商家提交二次申请

触发条件：买手完成初核后，商家对买手价格不满意
操作：在原工单基础上提交二次申请
API：POST /api/requests/{id}/secondary-review
请求参数：
{
  "skc": "SKC001",
  "secondPrice": 279.00,
  "secondReason": "双面呢面料成本较高"
}

【步骤2】后端处理二次申请

处理逻辑：
1. 在pricing_details中新增二次申请记录
2. 设置secondPrice和secondReason
3. 保持status不变

【步骤3】买手端处理二次申请

展示规则：
  - 原有初核价格保留
  - 新增二次申请价格突出显示
  - 标记"待复核"状态

操作：买手可选择：
  - 接受二次价格 → 更新buyerPrice为secondPrice
  - 维持原价 → 保持原buyerPrice不变
```

### 3.4 状态流转图

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ processing │───►│  approved  │───►│ completed  │
│  (待处理)   │    │  (已审批)   │    │  (已完成)   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  rejected  │    │  rejected  │    │   最终状态   │
│  (被驳回)   │    │  (被驳回)   │    │  不可变更    │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 3.5 数据验证规则

| 字段 | 类型 | 必填 | 验证规则 |
|------|------|------|----------|
| type | String | 是 | 枚举：'pricing'、'anomaly'、'style' |
| sub_type | String | 是 | 依type而定，最大50字符 |
| shop_name | String | 是 | 关联已存在的店铺名称 |
| target_codes | Array | 是 | 非空数组，最大10个元素 |
| status | String | 是 | 枚举：'processing'、'approved'、'rejected'、'completed' |
| pricing_details | JSON | pricing必填 | 包含skc、appliedPrice等字段 |
| remark | String | 可选 | 最大1000字符 |

---

## 四、补货订单流程

### 4.1 场景描述

买手向商家发起补货订单，商家确认接单后发货，买手确认到货。该流程实现补货业务的闭环管理，确保供应链顺畅运转。

### 4.2 参与模块

| 端 | 模块名称 | 核心职责 |
|----|----------|----------|
| 买手前端 | 大货工单管理（BulkOrderPage） | 创建补货订单，确认到货，审核砍量 |
| 商家前端 | 补货协同（ReplenishmentSynergy） | 确认接单数量，发货操作，查看物流 |
| 后端 | restock路由 | 处理补货订单全生命周期业务逻辑 |

### 4.3 完整工作流

#### 4.3.1 买手创建补货订单

```
【步骤1】买手填写补货订单信息

操作：在BulkOrderPage点击"新建补货订单"
填写内容：
  - SKC编码：选择需要补货的商品
  - 店铺名称：选择目标商家
  - 计划数量：填写补货数量
  - 截止日期：设置接单截止时间

【步骤2】提交补货订单

API：POST /api/admin/restock
请求参数：
{
  "skc_code": "SKC001",
  "shop_id": "shop_001",
  "name": "秋季连衣裙",
  "image_url": "https://example.com/image.jpg",
  "plan_quantity": 100,
  "expiry_date": "2026-02-15"
}

【步骤3】后端处理订单创建

处理逻辑：
1. 生成订单ID
2. 向b_restock_order表写入：
   - status: 'confirming'（待确认）
   - actual_quantity: 初始化为null
   - 创建b_restock_logistics空记录
3. 返回订单ID

【步骤4】商家端监听新订单

监听机制：每30秒轮询 GET /api/restock
状态筛选：status='confirming'
展示规则：突出显示待确认订单
```

#### 4.3.2 商家确认接单

```
【步骤1】商家查看补货订单详情

展示内容：
  - 商品图片、名称、SKC编码
  - 计划数量、截止日期
  - 当前已接受数量（如有）

【步骤2】商家填写接单信息

输入：
  - 实际接单数量（actual_quantity）
    * 默认等于计划数量
    * 可以填写小于计划数量（砍量）
  - 砍量理由（reduction_reason）
    * 砍量时必填
    * 最大500字符

【步骤3】提交接单确认

API：POST /api/restock/{id}/confirm
请求参数：
{
  "quantity": 80,
  "reason": "销售预测下调"
}

【步骤4】后端处理接单确认

状态判断逻辑：
1. 如果 actual_quantity < plan_quantity：
   - status = '待买手复核'
   - 等待买手审核砍量
   
2. 如果 actual_quantity = plan_quantity：
   - status = '生产中'
   - 直接进入生产阶段

【步骤5】买手审核砍量（如有）

触发条件：商家砍量（actual < plan）
操作：买手在BulkOrderPage审核
API：POST /api/restock/{id}/review
请求参数：
{
  "agree": true  // true同意砍量，false拒绝砍量
}

审核结果：
  - 同意：status = '生产中'
  - 拒绝：恢复原数量，重新确认接单
```

#### 4.3.3 商家发货

```
【步骤1】商家填写发货信息

前提：状态为'生产中'
输入：
  - 物流单号（wbNumber）：必填
  - 物流公司（logisticsCompany）：必填
  - 发货数量（shippedQty）：必填

【步骤2】提交发货信息

API：POST /api/restock/{id}/ship
请求参数：
{
  "wbNumber": "SF1234567890",
  "logisticsCompany": "顺丰速运",
  "shippedQty": 80
}

【步骤3】后端处理发货

处理逻辑：
1. 更新b_restock_order：
   - status = '待买手确认入仓'
   - 记录wb_number、shippedQty
   
2. 向b_restock_logistics插入记录：
   - restock_order_id: 订单ID
   - logistics_company
   - tracking_number
   - shipped_at: 发货时间

【步骤4】商家端等待入仓确认

状态展示："待买手确认入仓"
监听机制：继续轮询监听状态变化
```

#### 4.3.4 买手确认入仓

```
【步骤1】买手收到到货通知

触发：商家发货后，页面状态变为"待买手确认入仓"
操作：买手收到实物并核对数量

【步骤2】买手执行入仓确认

API：POST /api/restock/{id}/arrival
请求参数：
{
  "arrivedQty": 80
}

【步骤3】后端处理入仓确认

处理逻辑：
1. 更新b_restock_order：
   - status = '已确认入仓'
   - arrived_quantity = 到货数量
   - arrived_at: 入仓时间
   
2. 触发后续流程（如有）

【步骤4】商家端同步入仓状态

同步触发：轮询时发现status='已确认入仓'
状态展示：更新为"已确认入仓"
流程结束：该补货订单完成闭环
```

### 4.4 状态完整流转图

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│  confirming │────►│  待买手复核     │────►│  生产中     │
│  (待确认)   │     │ （砍量时）      │     │             │
└─────────────┘     └────────┬────────┘     └──────┬──────┘
                             │                      │
                             │                      │
                             ▼                      │
                     ┌─────────────┐               │
                     │   拒绝砍量  │───────────────┘
                     │  (恢复数量) │    拒绝
                     └─────────────┘
                                     
┌─────────────────────────────────────────────────────────────┐
│                                                             │
▼                                                             ▼

┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│  生产中     │────►│ 待买手确认入仓  │────►│ 已确认入仓  │
│             │     │   (已发货)      │     │  (已完成)   │
└─────────────┘     └─────────────────┘     └─────────────┘
```

---

## 五、开发进度同步流程

### 5.1 场景描述

商家在接款后推进款式开发，从打样到SPU上传到开发成功，买手实时监控进度。该流程实现开发过程的透明化管理。

### 5.2 参与模块

| 端 | 模块名称 | 核心职责 |
|----|----------|----------|
| 商家前端 | 开发进度（DevelopmentProgress） | 更新开发状态，上传SPU，申请帮看，放弃开发 |
| 买手前端 | 款式管理（StyleManage） | 查看所有款式状态，监控开发进度 |
| 买手前端 | 系统驾驶舱（Dashboard） | 查看开发统计汇总 |
| 后端 | development路由 | 处理开发状态更新、SPU上传等业务逻辑 |

### 5.3 完整工作流

```
【步骤1】商家更新开发状态

操作：在DevelopmentProgress页面选择新状态
可选状态：
  - drafting（打样中）
  - pattern（改版帮看中）
  - helping（改图帮看中）
  - ok（待上传SPU）
  - success（开发成功）

API：POST /api/development/{id}/status
请求参数：
{
  "status": "ok",
  "spu_code": "SPU123456"
}

【步骤2】后端处理状态更新

状态为'ok'时：
  1. 记录spu_code
  2. 更新confirm_time（如未设置）
  
状态为'success'时：
  1. 标记开发完成
  2. 更新统计数据

【步骤3】买手端实时同步

同步机制：
1. 定时调用 GET /api/development 获取开发中款式
2. Dashboard统计success状态数量
3. StyleManage实时更新状态标签

【步骤4】帮看请求流程（可选）

触发：商家需要买手反馈设计方案
操作：
  1. 上传帮看图片
  2. 填写问题描述
  3. 提交帮看请求
  
API：POST /api/development/{id}/helping
请求参数：
{
  "type": "pattern",  // 或helping
  "images": ["url1", "url2"],
  "remark": "请帮忙看下领口设计是否合适"
}

【步骤5】放弃开发流程

触发：商家决定终止该款式开发
操作：
  1. 选择放弃原因
  2. 填写详细说明
  3. 确认放弃
  
API：POST /api/development/{id}/abandon
请求参数：
{
  "reason": "面料无法供应"
}

后端处理：
  1. 记录abandon_reason
  2. 更新status为'abandoned'
  3. 释放公池名额（如果是公池款式）
  4. 通知买手该款式已放弃
```

### 5.4 开发阶段状态映射

| 状态值 | 显示名称 | 说明 |
|--------|----------|------|
| drafting | 打样中 | 初始阶段，款式制作样衣 |
| pattern | 改版帮看中 | 需要买手审核版型 |
| helping | 改图帮看中 | 需要买手审核设计方案 |
| ok | 待上传SPU | 设计确认，等待SPU编码 |
| success | 开发成功 | 开发完成，可进入生产 |

---

## 六、异常处理与错误反馈机制

### 6.1 异常分类体系

| 异常类型 | 触发条件 | 示例 | HTTP状态码 | 处理方式 |
|----------|----------|------|------------|----------|
| 业务异常 | 业务规则校验失败 | 配额已满、状态不允许 | 400 | 展示友好提示，允许重试 |
| 权限异常 | 用户无操作权限 | 越权访问、角色不匹配 | 403 | 跳转登录或权限提示 |
| 数据异常 | 数据不存在或冲突 | 记录不存在、乐观锁冲突 | 404/409 | 提示数据状态变化 |
| 系统异常 | 服务器内部错误 | 数据库连接失败 | 500/503 | 系统错误提示，引导重试 |

### 6.2 标准错误响应格式

```json
{
  "error": {
    "code": "ERR_CODE",
    "message": "友好的错误描述",
    "details": {
      "field": "quantity",
      "reason": "超出有效范围"
    },
    "timestamp": "2026-02-04T10:30:00Z",
    "path": "/api/restock/xxx/confirm"
  }
}
```

### 6.3 关键业务场景错误处理

#### 6.3.1 推款超过配额

```
触发条件：商家公池接款超过5款限制

后端验证：
  POST /api/styles/{id}/express_intent
  → 检查 SELECT COUNT(*) FROM b_style_public 
     WHERE intent_user_ids LIKE '%shop_id%'
  → 如果 current >= 5，返回配额错误

前端处理：
  1. 捕获错误响应
  2. 展示Toast提示："接款失败，配额已满（5/5）"
  3. 禁用接款按钮
  4. 引导删除现有接款或选择其他款式
```

#### 6.3.2 补货数量超出范围

```
触发条件：商家填写实际数量不在有效范围内

后端验证：
  actual_quantity > 0 && actual_quantity <= plan_quantity
  → 验证失败返回 INVALID_QUANTITY

前端处理：
  1. 输入时实时校验（onChange）
  2. 提交前二次验证
  3. 错误时高亮输入框
  4. 提示："数量必须在1-100之间"
```

#### 6.3.3 状态不允许操作

```
触发条件：用户尝试操作当前状态不允许的动作

示例场景：
  - 已完成的工单再次审批
  - 待确认的订单执行发货
  - 取消已拒绝的申请

后端验证：
  检查当前status是否在允许状态列表中
  → 不允许时返回 INVALID_STATUS

前端处理：
  1. 根据status动态禁用按钮
  2. 展示提示："当前状态不允许此操作"
  3. 提示用户当前可执行操作
```

### 6.4 前端错误处理流程

```
API请求发起
     │
     ▼
┌───────────────┐
│ 接收HTTP响应  │
└───────┬───────┘
        │
        ▼
┌───────────────────────┐
│ 判断响应状态码         │
└───────┬───────────────┘
        │
   ┌────┴────┐
   │         │
   ▼         ▼
 2xx      4xx/5xx
   │         │
   ▼         ▼
┌──────┐  ┌──────────┐
│成功  │  │错误分类  │
│处理  │  │提取error │
│数据  │  │对象      │
└──────┘  └────┬─────┘
               │
        ┌──────┴──────┐
        │             │
        ▼             ▼
   ┌─────────┐   ┌─────────┐
   │业务错误 │   │系统错误 │
   │(400)   │   │(500)   │
   └────┬────┘   └────┬────┘
        │             │
        ▼             ▼
   ┌─────────┐   ┌─────────┐
   │展示错误 │   │展示系统│
   │提示弹窗 │   │错误提示│
   │允许重试 │   │自动重试│
   └────┬────┘   └────┬────┘
        │             │
        ▼             ▼
   ┌─────────┐   ┌─────────┐
   │重试操作 │   │错误日志│
   │重新提交 │   │上报    │
   └─────────┘   └─────────┘
```

---

## 七、关键数据传递格式汇总

### 7.1 款式推送对象（StyleDemand）

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "秋季新品连衣裙",
  "image_url": "https://example.com/image.jpg",
  "ref_link": "https://example.com/style/123",
  "shop_id": "shop_001",
  "shop_name": "示例服装店",
  "remark": "适合秋季穿着的面料",
  "status": "developing",
  "development_status": "drafting",
  "intent_count": 1,
  "max_intents": 3,
  "confirm_time": "2026-02-04T10:30:00Z",
  "created_at": "2026-02-01T08:00:00Z",
  "days_left": 14,
  "tags": ["优雅风", "法式风"],
  "visual": "人模",
  "style": "优雅风"
}
```

### 7.2 申请记录对象（RequestRecord）

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "type": "pricing",
  "sub_type": "同款同价",
  "shop_name": "示例服装店",
  "target_codes": ["SKC001", "SKC002"],
  "status": "processing",
  "pricing_details": [
    {
      "skc": "SKC001",
      "appliedPrice": 299.00,
      "buyerPrice": 259.00,
      "secondPrice": null,
      "status": "复核中",
      "feedback": null
    }
  ],
  "remark": "双面呢面料成本较高",
  "submit_time": "2026-02-04T09:00:00Z"
}
```

### 7.3 补货订单对象（RestockOrder）

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "skc_code": "SKC001",
  "shop_id": "shop_001",
  "shop_name": "示例服装店",
  "name": "秋季连衣裙",
  "image_url": "https://example.com/image.jpg",
  "plan_quantity": 100,
  "actual_quantity": 80,
  "arrived_quantity": 80,
  "status": "已确认入仓",
  "reduction_reason": "销售预测下调",
  "expiry_date": "2026-02-15",
  "wb_number": "SF1234567890",
  "created_at": "2026-02-01T08:00:00Z",
  "shipped_at": "2026-02-10T14:00:00Z",
  "arrived_at": "2026-02-12T10:00:00Z"
}
```

---

## 八、总结

本文档详细分析了SCM系统中买手前端与商家前端的四大核心交互场景：

1. **推款与接款**：买手创建推送 → 商家接收 → 状态双向同步
2. **申请与审批**：商家提交申请 → 买手审批 → 结果实时回传
3. **补货订单**：买手发起 → 商家确认 → 发货 → 入仓确认全链路闭环
4. **开发进度**：商家更新进度 → 买手实时监控 → 统计数据自动汇总

每个场景都包含了完整的触发条件、数据流转、状态同步、异常处理机制，确保业务协同的可靠性和一致性。
