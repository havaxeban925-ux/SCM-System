/**
 * SCM系统流程图可视化测试运行器 - 测试数据
 * 
 * 包含所有流程图的测试用例数据
 */

import type { FlowchartTestSuite, ModuleConfig } from './types';

export const testSuites: FlowchartTestSuite[] = [
    {
        flowchartName: '2.2.2 核价申请详细流程',
        flowchartId: 'PRICING_FLOW',
        module: 'Pricing',
        testCases: [
            {
                module: 'Pricing',
                testName: '核价申请-选择核价类型',
                description: '验证核价申请支持四种子类型：同款同价/申请涨价/毛织类核价/非毛织类核价',
                apiEndpoint: '/requests/quote',
                method: 'POST',
                requestBody: { subType: '同款同价', shopName: '', quotes: [] },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Pricing',
                testName: '核价申请-选择目标SKC',
                description: '验证核价申请需要选择目标SKC商品',
                apiEndpoint: '/requests/quote',
                method: 'POST',
                requestBody: { subType: '申请涨价', shopName: '', quotes: [{ code: 'TEST_SKC_001', price: 150.00 }] },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Pricing',
                testName: '核价申请-填写申请价格和理由',
                description: '验证核价申请需要填写期望售价和申请理由',
                apiEndpoint: '/requests/quote',
                method: 'POST',
                requestBody: { subType: '申请涨价', shopName: '', quotes: [{ code: 'TEST_SKC_002', price: 168.00, type: 'INCREASE', detailJson: { reason: '原材料价格上涨15%' } }] },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Pricing',
                testName: '核价申请-创建核价记录',
                description: '验证系统创建核价申请记录并生成记录ID',
                apiEndpoint: '/requests/quote',
                method: 'POST',
                requestBody: { subType: '同款同价', shopName: '', quotes: [{ code: 'TEST_SKC_003', price: 199.00, type: 'NORMAL' }] },
                validation: [{ type: 'data', field: 'id', expected: '$exists' }]
            },
            {
                module: 'Pricing',
                testName: '核价审批-审批通过',
                description: '验证买手审批通过核价申请',
                apiEndpoint: '/requests/PRICING_TEST_001/audit',
                method: 'POST',
                requestBody: { action: 'approve', buyerPrices: [{ code: 'TEST_SKC_001', buyerPrice: 145.00 }] },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Pricing',
                testName: '核价审批-审批驳回',
                description: '验证买手审批驳回核价申请并填写理由',
                apiEndpoint: '/requests/PRICING_TEST_002/audit',
                method: 'POST',
                requestBody: { action: 'reject', feedback: '价格过高，请重新核价' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Pricing',
                testName: '二次核价-再次申请',
                description: '验证首次核价被驳回后可以再次申请',
                apiEndpoint: '/requests/PRICING_TEST_003/reapply',
                method: 'POST',
                requestBody: { newPrice: 158.00, reason: '调整价格后重新申请' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            }
        ]
    },
    {
        flowchartName: '2.2.3 异常申请详细流程',
        flowchartId: 'ANOMALY_FLOW',
        module: 'Anomaly',
        testCases: [
            {
                module: 'Anomaly',
                testName: '异常申请-尺码问题-新增尺码',
                description: '验证异常申请支持新增尺码选项',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: { subType: '尺码问题', subDetail: '新增尺码', targetCodes: ['TEST_PRODUCT_001'], content: '需要增加XL尺码' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Anomaly',
                testName: '异常申请-尺码问题-修改尺码',
                description: '验证异常申请支持修改现有尺码',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: { subType: '尺码问题', subDetail: '修改尺码', targetCodes: ['TEST_PRODUCT_002'], content: '现有尺码表需要调整' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Anomaly',
                testName: '异常申请-图片异常-人台误判',
                description: '验证图片异常类型支持人台误判子类型',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: { subType: '图片异常', subDetail: '人台误判', targetCodes: ['TEST_PRODUCT_003'], content: '模特身高与实际商品不符' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Anomaly',
                testName: '异常申请-图片异常-换图误判',
                description: '验证图片异常类型支持换图误判子类型',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: { subType: '图片异常', subDetail: '换图误判', targetCodes: ['TEST_PRODUCT_004'], content: '需要更换商品主图' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Anomaly',
                testName: '异常申请-申请下架',
                description: '验证异常申请支持申请下架商品',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: { subType: '申请下架', targetCodes: ['TEST_PRODUCT_005'], content: '产品质量问题申请下架' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Anomaly',
                testName: '异常申请-大货异常',
                description: '验证异常申请支持大货异常类型',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: { subType: '大货异常', targetCodes: ['TEST_PRODUCT_006'], content: '大货色差超标' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Anomaly',
                testName: '异常申请-关联商品编码',
                description: '验证异常申请可以关联多个商品编码',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: { subType: '尺码问题', subDetail: '新增尺码', targetCodes: ['TEST_PRODUCT_007', 'TEST_PRODUCT_008', 'TEST_PRODUCT_009'], content: '系列商品统增加新尺码' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Anomaly',
                testName: '异常审批-审批通过',
                description: '验证买手审批通过异常申请',
                apiEndpoint: '/requests/ANOMALY_TEST_001/audit',
                method: 'POST',
                requestBody: { action: 'approve' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Anomaly',
                testName: '异常审批-审批驳回',
                description: '验证买手审批驳回异常申请',
                apiEndpoint: '/requests/ANOMALY_TEST_002/audit',
                method: 'POST',
                requestBody: { action: 'reject', feedback: '证据不足，请补充信息' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            }
        ]
    },
    {
        flowchartName: '2.3.1 私推接款详细流程',
        flowchartId: 'PRIVATE_PUSH_FLOW',
        module: 'PrivatePush',
        testCases: [
            {
                module: 'PrivatePush',
                testName: '私推接款-发现新款式',
                description: '验证商家可以在私推列表中发现新款式',
                apiEndpoint: '/styles/private',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-款式卡片展示',
                description: '验证私推款式以卡片形式展示，包含图片、参考链接等',
                apiEndpoint: '/styles/private',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'data', field: 'data', expected: '$exists' }]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-查看详情',
                description: '验证商家可以点击款式卡片查看完整详情',
                apiEndpoint: '/styles/private/STYLE_001',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-接受款式',
                description: '验证商家接受私推款式并进入待确认状态',
                apiEndpoint: '/styles/private/STYLE_001/accept',
                method: 'POST',
                requestBody: {},
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-记录确认时间',
                description: '验证系统自动记录款式确认时间',
                apiEndpoint: '/styles/private/STYLE_001',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'data', field: 'confirmedAt', expected: '$exists' }]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-通知买手',
                description: '验证接受款式后自动通知买手',
                apiEndpoint: '/notifications/send',
                method: 'POST',
                requestBody: { type: 'private_accept', styleId: 'STYLE_001', shopId: 'SHOP_001' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-放弃款式',
                description: '验证商家可以放弃私推款式并选择放弃原因',
                apiEndpoint: '/styles/private/STYLE_002/abandon',
                method: 'POST',
                requestBody: { reason: '产能不足' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-放弃原因统计',
                description: '验证系统记录放弃原因用于分析',
                apiEndpoint: '/analytics/abandon-reasons',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-接款记录查询',
                description: '验证商家可以查询历史接款记录',
                apiEndpoint: '/styles/private/history',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            }
        ]
    },
    {
        flowchartName: '2.3.2 公池接款详细流程',
        flowchartId: 'PUBLIC_POOL_FLOW',
        module: 'PublicPool',
        testCases: [
            {
                module: 'PublicPool',
                testName: '公池接款-设置最大接款数',
                description: '验证买手可以设置每个款式的最大接款商家数量',
                apiEndpoint: '/styles/public',
                method: 'POST',
                requestBody: { maxIntents: 3 },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-初始化意向计数',
                description: '验证公池款式发布时初始化意向商家计数',
                apiEndpoint: '/styles/public/POOL_001',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'data', field: 'intentCount', expected: 0 }]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-检查商家配额',
                description: '验证商家接款前检查是否超过个人/店铺配额限制',
                apiEndpoint: '/shops/SHOP_001/quota',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-配额验证',
                description: '验证系统验证商家接款配额是否已达上限',
                apiEndpoint: '/styles/public/POOL_001/validate',
                method: 'POST',
                requestBody: { shopId: 'SHOP_001' },
                validation: [{ type: 'data', field: 'allowed', expected: true }]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-意向+1',
                description: '验证商家接款后意向计数增加1',
                apiEndpoint: '/styles/public/POOL_001/intent',
                method: 'POST',
                requestBody: { shopId: 'SHOP_001' },
                validation: [{ type: 'data', field: 'intentCount', expected: '$increment' }]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-隐藏款式',
                description: '验证达到最大接款数后款式从公池隐藏',
                apiEndpoint: '/styles/public/POOL_001',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'data', field: 'hidden', expected: true }]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-通知买手',
                description: '验证商家接款后通知买手有新商家接款',
                apiEndpoint: '/notifications/send',
                method: 'POST',
                requestBody: { type: 'public_intent', styleId: 'POOL_001', shopId: 'SHOP_001' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-查看公池列表',
                description: '验证商家可以查看所有可用公池款式',
                apiEndpoint: '/styles/public',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-接款记录',
                description: '验证系统记录所有接款操作',
                apiEndpoint: '/styles/public/POOL_001/intents',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'data', field: 'intents', expected: '$exists' }]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-公池统计',
                description: '验证公池支持统计分析功能',
                apiEndpoint: '/analytics/public-pool',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-接款排行',
                description: '验证公池支持接款商家排行',
                apiEndpoint: '/analytics/public-pool/ranking',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-推送记录',
                description: '验证买手可以查看公池推送记录',
                apiEndpoint: '/styles/public/history',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            }
        ]
    },
    {
        flowchartName: '2.4.1 接单确认详细流程',
        flowchartId: 'ORDER_CONFIRM_FLOW',
        module: 'Order',
        testCases: [
            {
                module: 'Order',
                testName: '接单确认-查看待确认订单',
                description: '验证商家可以查看待确认的订单列表',
                apiEndpoint: '/orders/pending',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Order',
                testName: '接单确认-查看订单详情',
                description: '验证商家可以查看订单详细信息',
                apiEndpoint: '/orders/ORDER_001',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Order',
                testName: '接单确认-填写接单数量',
                description: '验证商家可以填写实际可接单数量',
                apiEndpoint: '/orders/ORDER_001/confirm',
                method: 'POST',
                requestBody: { acceptedQuantity: 80 },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Order',
                testName: '接单确认-砍量处理',
                description: '验证商家接单数量少于订单数量时触发砍量流程',
                apiEndpoint: '/orders/ORDER_002/confirm',
                method: 'POST',
                requestBody: { acceptedQuantity: 50, reductionReason: '产能不足' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Order',
                testName: '买手审核-查看砍量申请',
                description: '验证买手可以查看商家的砍量申请',
                apiEndpoint: '/orders/ORDER_002/reduction',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Order',
                testName: '买手审核-通过砍量',
                description: '验证买手可以同意商家的砍量申请',
                apiEndpoint: '/orders/ORDER_002/reduction/approve',
                method: 'POST',
                requestBody: {},
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Order',
                testName: '买手审核-驳回砍量',
                description: '验证买手可以驳回商家的砍量申请',
                apiEndpoint: '/orders/ORDER_003/reduction/reject',
                method: 'POST',
                requestBody: { reason: '请尽量满足原订单数量' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Order',
                testName: '接单确认-订单状态更新',
                description: '验证确认后订单状态更新为已确认',
                apiEndpoint: '/orders/ORDER_001',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'data', field: 'status', expected: 'confirmed' }]
            }
        ]
    },
    {
        flowchartName: '2.4.2 发货与物流跟踪详细流程',
        flowchartId: 'LOGISTICS_FLOW',
        module: 'Logistics',
        testCases: [
            {
                module: 'Logistics',
                testName: '发货-查看待发货订单',
                description: '验证商家可以查看待发货的订单列表',
                apiEndpoint: '/restock/pending',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Logistics',
                testName: '发货-填写物流信息',
                description: '验证商家可以填写物流单号和物流公司',
                apiEndpoint: '/restock/RESTOCK_001/ship',
                method: 'POST',
                requestBody: { wbNumber: 'SF1234567890', logisticsCompany: '顺丰' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Logistics',
                testName: '发货-更新订单状态',
                description: '验证发货后订单状态更新为已发货',
                apiEndpoint: '/restock/RESTOCK_001',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'data', field: 'status', expected: 'shipped' }]
            },
            {
                module: 'Logistics',
                testName: '物流-创建物流记录',
                description: '验证系统为发货订单创建物流跟踪记录',
                apiEndpoint: '/restock/RESTOCK_001/logistics',
                method: 'POST',
                requestBody: {},
                validation: [{ type: 'data', field: 'trackingId', expected: '$exists' }]
            },
            {
                module: 'Logistics',
                testName: '物流-轮询跟踪',
                description: '验证系统定时轮询物流信息更新状态',
                apiEndpoint: '/restock/RESTOCK_001/logistics/RACK_001/tracking',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Logistics',
                testName: '物流-入仓确认',
                description: '验证物流到达入仓后买手确认入仓',
                apiEndpoint: '/restock/RESTOCK_001/logistics/RACK_001/arrival',
                method: 'POST',
                requestBody: { confirmed: true },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Logistics',
                testName: '物流-数量异常处理',
                description: '验证入仓数量与发货数量不一致时触发异常处理',
                apiEndpoint: '/restock/RESTOCK_001/logistics/RACK_001/anomaly',
                method: 'POST',
                requestBody: { discrepancy: 5, type: 'quantity_mismatch' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Logistics',
                testName: '物流-完成确认',
                description: '验证入仓确认后订单流程完成',
                apiEndpoint: '/restock/RESTOCK_001/complete',
                method: 'POST',
                requestBody: {},
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            }
        ]
    },
    {
        flowchartName: '2.5 开发进度跟踪详细流程',
        flowchartId: 'DEVELOPMENT_FLOW',
        module: 'Development',
        testCases: [
            {
                module: 'Development',
                testName: '开发进度-查看开发队列',
                description: '验证商家可以查看待开发的款式列表',
                apiEndpoint: '/development',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Development',
                testName: '开发进度-drafting阶段',
                description: '验证款式初始状态为drafting（起草中）',
                apiEndpoint: '/development/DEV_001',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'data', field: 'status', expected: 'drafting' }]
            },
            {
                module: 'Development',
                testName: '开发进度-pattern阶段',
                description: '验证款式进入pattern阶段（打版中）',
                apiEndpoint: '/development/DEV_001/status',
                method: 'POST',
                requestBody: { status: 'pattern' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Development',
                testName: '开发进度-helping阶段',
                description: '验证款式进入helping阶段（辅料/协助中）',
                apiEndpoint: '/development/DEV_001/status',
                method: 'POST',
                requestBody: { status: 'helping' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Development',
                testName: '开发进度-ok阶段',
                description: '验证款式进入ok阶段（确认完成）',
                apiEndpoint: '/development/DEV_001/status',
                method: 'POST',
                requestBody: { status: 'ok' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Development',
                testName: '开发进度-success阶段',
                description: '验证款式进入success阶段（大货完成）',
                apiEndpoint: '/development/DEV_001/status',
                method: 'POST',
                requestBody: { status: 'success' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Development',
                testName: '开发进度-SPU编码',
                description: '验证商家可以填写款式SPU编码',
                apiEndpoint: '/development/DEV_001/spu',
                method: 'POST',
                requestBody: { spuCode: 'SPU20241218001' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Development',
                testName: '开发进度-状态同步',
                description: '验证各阶段状态变更实时同步到买手端',
                apiEndpoint: '/development/DEV_001/sync',
                method: 'POST',
                requestBody: {},
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Development',
                testName: '开发进度-进度查询',
                description: '验证支持按状态筛选查询开发进度',
                apiEndpoint: '/development?status=pattern',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            }
        ]
    },
    {
        flowchartName: '3.1 系统驾驶舱数据流程',
        flowchartId: 'DASHBOARD_FLOW',
        module: 'Dashboard',
        testCases: [
            {
                module: 'Dashboard',
                testName: '驾驶舱-查看统计数据',
                description: '验证系统显示总商家数、总店铺数等核心统计',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-私推统计',
                description: '验证驾驶舱显示私推款式数量和状态分布',
                apiEndpoint: '/admin/dashboard/private-push',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-公池统计',
                description: '验证驾驶舱显示公池款式数和接款情况',
                apiEndpoint: '/admin/dashboard/public-pool',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-店铺分布',
                description: '验证驾驶舱显示各等级店铺分布',
                apiEndpoint: '/admin/dashboard/shops',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-接单排行',
                description: '验证驾驶舱显示商家接单数量排行',
                apiEndpoint: '/admin/dashboard/ranking/orders',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-核价统计',
                description: '验证驾驶舱显示核价申请数量和通过率',
                apiEndpoint: '/admin/dashboard/pricing',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-异常统计',
                description: '验证驾驶舱显示异常申请数量和处理情况',
                apiEndpoint: '/admin/dashboard/anomaly',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-待办事项',
                description: '验证驾驶舱显示待处理事项数量',
                apiEndpoint: '/admin/dashboard/todos',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-图表展示',
                description: '验证驾驶舱支持折线图、柱状图等图表展示',
                apiEndpoint: '/admin/dashboard/charts',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-实时刷新',
                description: '验证驾驶舱支持定时刷新数据',
                apiEndpoint: '/admin/dashboard/refresh',
                method: 'POST',
                requestBody: {},
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-数据导出',
                description: '验证驾驶舱支持导出统计数据',
                apiEndpoint: '/admin/dashboard/export',
                method: 'POST',
                requestBody: { format: 'excel' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-快捷操作',
                description: '验证驾驶舱提供常用功能快捷入口',
                apiEndpoint: '/admin/dashboard/shortcuts',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            }
        ]
    },
    {
        flowchartName: '3.2.1 私推创建详细流程',
        flowchartId: 'STYLE_CREATE_FLOW',
        module: 'StyleCreate',
        testCases: [
            {
                module: 'StyleCreate',
                testName: '私推创建-上传图片',
                description: '验证买手可以上传款式图片',
                apiEndpoint: '/styles/private/upload',
                method: 'POST',
                requestBody: { image: 'base64_data...' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'StyleCreate',
                testName: '私推创建-填写参考链接',
                description: '验证买手可以填写款式参考链接',
                apiEndpoint: '/styles/private',
                method: 'POST',
                requestBody: { refLink: 'https://example.com/style/123' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'StyleCreate',
                testName: '私推创建-选择视觉风格',
                description: '验证买手可以为款式选择视觉风格（人模/平铺/挂拍/细节图）',
                apiEndpoint: '/styles/private',
                method: 'POST',
                requestBody: { visual: '人模' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'StyleCreate',
                testName: '私推创建-选择款式风格',
                description: '验证买手可以为款式选择款式风格（优雅风/休闲风/通勤风等）',
                apiEndpoint: '/styles/private',
                method: 'POST',
                requestBody: { style: '优雅风' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'StyleCreate',
                testName: '私推创建-搜索店铺',
                description: '验证买手可以搜索目标店铺',
                apiEndpoint: '/shops/search',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'StyleCreate',
                testName: '私推创建-关联店铺',
                description: '验证买手可以将私推款式关联到指定店铺',
                apiEndpoint: '/styles/private/STYLE_001/shops',
                method: 'POST',
                requestBody: { shopIds: ['SHOP_001', 'SHOP_002'] },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'StyleCreate',
                testName: '私推创建-记录创建',
                description: '验证系统创建私推记录并生成记录ID',
                apiEndpoint: '/styles/private',
                method: 'POST',
                requestBody: { imageUrl: 'https://example.com/img.jpg', refLink: 'https://example.com/ref', visual: '人模', style: '优雅风' },
                validation: [{ type: 'data', field: 'id', expected: '$exists' }]
            },
            {
                module: 'StyleCreate',
                testName: '私推创建-推送通知',
                description: '验证私推创建后通知关联店铺',
                apiEndpoint: '/notifications/send',
                method: 'POST',
                requestBody: { type: 'private_push', styleId: 'STYLE_001' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'StyleCreate',
                testName: '私推创建-图片上传验证',
                description: '验证图片上传支持格式和大小限制',
                apiEndpoint: '/styles/private/validate-image',
                method: 'POST',
                requestBody: { imageName: 'test.jpg', size: 1024000 },
                validation: [{ type: 'data', field: 'valid', expected: true }]
            },
            {
                module: 'StyleCreate',
                testName: '私推创建-链接验证',
                description: '验证参考链接格式正确性',
                apiEndpoint: '/styles/private/validate-link',
                method: 'POST',
                requestBody: { url: 'https://example.com/style/123' },
                validation: [{ type: 'data', field: 'valid', expected: true }]
            },
            {
                module: 'StyleCreate',
                testName: '私推创建-历史记录',
                description: '验证买手可以查看历史私推记录',
                apiEndpoint: '/styles/private/history',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            }
        ]
    },
    {
        flowchartName: '3.2.2 公池推送详细流程',
        flowchartId: 'PUBLIC_PUSH_FLOW',
        module: 'PublicPush',
        testCases: [
            {
                module: 'PublicPush',
                testName: '公池推送-设置最大接款数',
                description: '验证买手可以设置每个款式的最大接款商家数量',
                apiEndpoint: '/styles/public',
                method: 'POST',
                requestBody: { maxIntents: 5 },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PublicPush',
                testName: '公池推送-设置接款期限',
                description: '验证买手可以设置公池接款截止日期',
                apiEndpoint: '/styles/public',
                method: 'POST',
                requestBody: { deadline: '2024-12-31' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PublicPush',
                testName: '公池推送-上传款式',
                description: '验证买手可以上传款式图片和信息到公池',
                apiEndpoint: '/styles/public',
                method: 'POST',
                requestBody: { imageUrl: 'https://example.com/public.jpg', name: '公测款式001' },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PublicPush',
                testName: '公池推送-标签分类',
                description: '验证买手可以为公池款式添加分类标签',
                apiEndpoint: '/styles/public/POOL_001/tags',
                method: 'POST',
                requestBody: { tags: ['女装', '连衣裙', '秋冬款'] },
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PublicPush',
                testName: '公池推送-记录初始化',
                description: '验证系统初始化公池推送记录',
                apiEndpoint: '/styles/public/POOL_001',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'data', field: 'status', expected: 'pending' }]
            },
            {
                module: 'PublicPush',
                testName: '公池推送-公池展示',
                description: '验证公池款式展示给所有商家',
                apiEndpoint: '/styles/public',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PublicPush',
                testName: '公池推送-推送统计',
                description: '验证公池推送支持统计分析',
                apiEndpoint: '/analytics/public-push',
                method: 'GET',
                requestBody: undefined,
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            },
            {
                module: 'PublicPush',
                testName: '公池推送-下架款式',
                description: '验证买手可以从公池下架款式',
                apiEndpoint: '/styles/public/POOL_001/unlist',
                method: 'POST',
                requestBody: {},
                validation: [{ type: 'status', field: 'status', expected: 200 }]
            }
        ]
    }
];

export { moduleConfigs };
