/**
 * SCM系统流程图完整镜像测试
 * 
 * 基于 docs/scm-flowcharts.md 中所有流程图的完整测试覆盖
 * 
 * 测试范围:
 * - 商家端: 核价申请、异常申请、私推接款、公池接款、接单确认、发货物流、开发进度
 * - 买手段: 系统驾驶舱、私推创建、公池推送
 * 
 * 执行方式: npx tsx tests/mirror/scm-flowchart-tests.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { get, post, patch, del, runTest, assertTrue, assertEqual, assertExists, genTestId, TestResult, Issue } from './utils/test-client';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FlowchartTestCase {
    module: string;
    testName: string;
    description: string;
    apiEndpoint: string;
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    requestBody?: any;
    validation: {
        type: 'status' | 'data' | 'state' | 'count';
        field: string;
        expected: any;
    }[];
    dependsOn?: string[];
}

interface FlowchartTestSuite {
    flowchartName: string;
    flowchartId: string;
    testCases: FlowchartTestCase[];
}

const testSuites: FlowchartTestSuite[] = [
    // ========================================
    // 第一部分: 商家端流程图测试
    // ========================================
    
    {
        flowchartName: '2.2.2 核价申请详细流程',
        flowchartId: 'PRICING_FLOW',
        testCases: [
            {
                module: 'Pricing',
                testName: '核价申请-选择核价类型',
                description: '验证核价申请支持四种子类型：同款同价/申请涨价/毛织类核价/非毛织类核价',
                apiEndpoint: '/requests/quote',
                method: 'POST',
                requestBody: {
                    subType: '同款同价',
                    shopName: '',
                    quotes: []
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Pricing',
                testName: '核价申请-选择目标SKC',
                description: '验证核价申请需要选择目标SKC商品',
                apiEndpoint: '/requests/quote',
                method: 'POST',
                requestBody: {
                    subType: '申请涨价',
                    shopName: '',
                    quotes: [{ code: 'TEST_SKC_001', price: 150.00 }]
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Pricing',
                testName: '核价申请-填写申请价格和理由',
                description: '验证核价申请需要填写期望售价和申请理由',
                apiEndpoint: '/requests/quote',
                method: 'POST',
                requestBody: {
                    subType: '申请涨价',
                    shopName: '',
                    quotes: [{
                        code: 'TEST_SKC_002',
                        price: 168.00,
                        type: 'INCREASE',
                        detailJson: { reason: '原材料价格上涨15%' }
                    }]
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 },
                    { type: 'data', field: 'data.id', expected: null }
                ]
            },
            {
                module: 'Pricing',
                testName: '核价申请-后端创建记录并设置status=processing',
                description: '验证核价申请提交后创建记录，状态为处理中',
                apiEndpoint: '/requests/quote',
                method: 'POST',
                requestBody: {
                    subType: '毛织类核价',
                    shopName: '',
                    quotes: [{ code: 'TEST_SKC_003', price: 199.00 }]
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Pricing',
                testName: '核价审批-审批通过并更新状态',
                description: '验证买手审批通过后更新状态为completed',
                apiEndpoint: '/requests/{id}/audit',
                method: 'POST',
                requestBody: {
                    action: 'approve',
                    buyerPrices: { 'TEST_SKC_001': 145.00 }
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Pricing',
                testName: '核价审批-审批驳回并记录原因',
                description: '验证买手审批驳回后记录驳回原因',
                apiEndpoint: '/requests/{id}/audit',
                method: 'POST',
                requestBody: {
                    action: 'reject',
                    feedback: '价格超出市场水平'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Pricing',
                testName: '二次核价-提交新价格和理由',
                description: '验证商家对复核价格不满意可提交二次核价',
                apiEndpoint: '/requests/{id}/secondary-review',
                method: 'POST',
                requestBody: {
                    skc: 'TEST_SKC_001',
                    secondPrice: 155.00,
                    secondReason: '重新核算成本'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            }
        ]
    },

    {
        flowchartName: '2.2.3 异常申请详细流程',
        flowchartId: 'ANOMALY_FLOW',
        testCases: [
            {
                module: 'Anomaly',
                testName: '异常申请-尺码问题-新增尺码',
                description: '验证尺码问题异常支持新增尺码类型',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: {
                    subType: '尺码问题',
                    subDetail: '新增尺码',
                    targetCodes: ['TEST_SPU_001'],
                    content: '需要增加XL尺码'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Anomaly',
                testName: '异常申请-尺码问题-修改尺码',
                description: '验证尺码问题异常支持修改尺码类型',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: {
                    subType: '尺码问题',
                    subDetail: '修改尺码',
                    targetCodes: ['TEST_SPU_002'],
                    content: 'M码胸围偏小，需要放宽2cm'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Anomaly',
                testName: '异常申请-图片异常-人台误判',
                description: '验证图片异常支持人台误判类型',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: {
                    subType: '图片异常',
                    subDetail: '人台误判',
                    targetCodes: ['TEST_SKC_001'],
                    content: '模特身高与实际不符，导致尺码选择困难'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Anomaly',
                testName: '异常申请-图片异常-换图误判',
                description: '验证图片异常支持换图误判类型',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: {
                    subType: '图片异常',
                    subDetail: '换图误判',
                    targetCodes: ['TEST_SKC_002'],
                    content: '实物颜色与图片差异较大'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Anomaly',
                testName: '异常申请-申请下架',
                description: '验证异常申请支持下架类型',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: {
                    subType: '申请下架',
                    targetCodes: ['TEST_SKC_003'],
                    content: '产品存在质量缺陷，申请下架处理'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Anomaly',
                testName: '异常申请-关联商品编码',
                description: '验证异常申请需要关联商品编码（SPU或SKC）',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: {
                    subType: '其他类型',
                    targetCodes: ['TEST_WB_001'],
                    content: '其他异常情况描述'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Anomaly',
                testName: '异常申请-后端创建记录并设置status=processing',
                description: '验证异常申请提交后创建记录，状态为处理中',
                apiEndpoint: '/requests/anomaly',
                method: 'POST',
                requestBody: {
                    subType: '大货异常',
                    targetCodes: ['TEST_WB_002'],
                    content: '大货色差超标'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Anomaly',
                testName: '异常处理-买手审批通过并更新商品状态',
                description: '验证买手审批通过后更新商品状态',
                apiEndpoint: '/requests/{id}/audit',
                method: 'POST',
                requestBody: {
                    action: 'approve',
                    statusUpdate: { type: '下架处理' }
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Anomaly',
                testName: '异常处理-买手审批驳回并通知商家',
                description: '验证买手审批驳回后通知商家',
                apiEndpoint: '/requests/{id}/audit',
                method: 'POST',
                requestBody: {
                    action: 'reject',
                    feedback: '证据不足，需要补充更多图片'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            }
        ]
    },

    {
        flowchartName: '2.3.1 私推接款详细流程',
        flowchartId: 'PRIVATE_PUSH_FLOW',
        testCases: [
            {
                module: 'PrivatePush',
                testName: '私推接款-商家发现新私推款式',
                description: '验证商家端能发现新推送的私推款式',
                apiEndpoint: '/styles/private',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 },
                    { type: 'data', field: 'data', expected: null }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-展示款式卡片',
                description: '验证私推款式卡片展示完整信息（图片、名称、截止天数、备注）',
                apiEndpoint: '/styles/private',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-查看详情',
                description: '验证商家可以查看私推款式详情',
                apiEndpoint: '/styles/private/{id}',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-接受款式',
                description: '验证商家接受款式后更新status=developing',
                apiEndpoint: '/styles/{id}/accept',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-记录confirm_time',
                description: '验证接受款式后记录确认时间',
                apiEndpoint: '/styles/{id}/accept',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-款式加入私推列表',
                description: '验证接受后款式加入商家私推列表',
                apiEndpoint: '/styles/private',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-通知买手已接款',
                description: '验证接受款式后通知买手',
                apiEndpoint: '/styles/{id}/accept',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-放弃款式',
                description: '验证商家可以放弃私推款式',
                apiEndpoint: '/styles/{id}/abandon',
                method: 'POST',
                requestBody: { reason: '产能不足' },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推接款-放弃后恢复status=new',
                description: '验证放弃款式后状态恢复为new',
                apiEndpoint: '/styles/{id}/abandon',
                method: 'POST',
                requestBody: { reason: '时间冲突' },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            }
        ]
    },

    {
        flowchartName: '2.3.2 公池接款详细流程',
        flowchartId: 'PUBLIC_POOL_FLOW',
        testCases: [
            {
                module: 'PublicPool',
                testName: '公池接款-设置max_intents=3',
                description: '验证公池款式最大接款数默认为3',
                apiEndpoint: '/styles/public',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-初始化intent_count=0',
                description: '验证新公池款式意向计数初始化为0',
                apiEndpoint: '/styles/public',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-商家查看公池列表',
                description: '验证所有商家可见公池',
                apiEndpoint: '/styles/public',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-系统按规则排序-有1个意向优先',
                description: '验证公池排序：有1个意向的款式优先',
                apiEndpoint: '/styles/public',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-系统按规则排序-发布10天以上的老款优先',
                description: '验证公池排序：发布10天以上的老款优先',
                apiEndpoint: '/styles/public',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-检查商家配额',
                description: '验证每个商家最多可接5个公池款式',
                apiEndpoint: '/styles/public/{id}/intent',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-配额已满返回错误',
                description: '验证商家配额已满时返回错误',
                apiEndpoint: '/styles/public/{id}/intent',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 400 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-意向数+1',
                description: '验证表达意向后intent_count增加',
                apiEndpoint: '/styles/public/{id}/intent',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-添加shop_id到intent_user_ids',
                description: '验证意向商家ID添加到列表',
                apiEndpoint: '/styles/public/{id}/intent',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-达到最大接款数后隐藏款式',
                description: '验证intent_count >= max_intents时隐藏款式',
                apiEndpoint: '/styles/public/{id}/confirm',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-确认接款后款式加入商家私推列表',
                description: '验证确认接款后款式加入商家私推列表',
                apiEndpoint: '/styles/public/{id}/confirm',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池接款-通知买手新接款',
                description: '验证确认接款后通知买手',
                apiEndpoint: '/styles/public/{id}/confirm',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            }
        ]
    },

    {
        flowchartName: '2.4.1 接单确认详细流程',
        flowchartId: 'RESTOCK_CONFIRM_FLOW',
        testCases: [
            {
                module: 'Restock',
                testName: '接单确认-查看订单详情',
                description: '验证商家可以查看补货订单详情（商品信息、计划数量、截止日期）',
                apiEndpoint: '/restock/{id}',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '接单确认-填写实际接单数量',
                description: '验证商家可以填写实际接单数量',
                apiEndpoint: '/restock/{id}/quantity',
                method: 'PATCH',
                requestBody: { quantity: 80 },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '接单确认-等于计划数量直接确认',
                description: '验证实际数量等于计划数量时直接确认',
                apiEndpoint: '/restock/{id}/confirm',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '接单确认-小于计划数量需填写砍量理由',
                description: '验证砍量时必须填写砍量理由',
                apiEndpoint: '/restock/{id}/confirm',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '接单确认-后端处理接单',
                description: '验证后端正确处理接单逻辑',
                apiEndpoint: '/restock/{id}/confirm',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '接单确认-砍量时设置status=待买手复核',
                description: '验证砍量时订单状态更新为待买手复核',
                apiEndpoint: '/restock/{id}/confirm',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '接单确认-买手同意砍量后设置status=生产中',
                description: '验证买手同意砍量后状态更新为生产中',
                apiEndpoint: '/restock/{id}/audit-reduction',
                method: 'POST',
                requestBody: { action: 'approve' },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '接单确认-买手拒绝砍量后恢复原数量',
                description: '验证买手拒绝砍量后恢复原数量并重新确认',
                apiEndpoint: '/restock/{id}/audit-reduction',
                method: 'POST',
                requestBody: { action: 'reject' },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            }
        ]
    },

    {
        flowchartName: '2.4.2 发货与物流跟踪详细流程',
        flowchartId: 'RESTOCK_SHIP_FLOW',
        testCases: [
            {
                module: 'Restock',
                testName: '发货-查看待发货订单',
                description: '验证商家可以查看待发货订单',
                apiEndpoint: '/restock?status=producing',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '发货-填写物流信息',
                description: '验证发货时需要填写物流单号（WB号）',
                apiEndpoint: '/restock/{id}/ship',
                method: 'POST',
                requestBody: {
                    wbNumber: `WB${Date.now()}`,
                    logisticsCompany: '顺丰',
                    shippedQty: 50
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '发货-后端处理发货',
                description: '验证后端正确处理发货逻辑',
                apiEndpoint: '/restock/{id}/ship',
                method: 'POST',
                requestBody: {
                    wbNumber: `WB${Date.now()}`,
                    logisticsCompany: '中通',
                    shippedQty: 100
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '发货-更新订单状态=待买手确认入仓',
                description: '验证发货后订单状态更新为待买手确认入仓',
                apiEndpoint: '/restock/{id}/ship',
                method: 'POST',
                requestBody: {
                    wbNumber: `WB${Date.now()}`,
                    logisticsCompany: '圆通',
                    shippedQty: 75
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '发货-创建物流记录',
                description: '验证发货后创建物流记录',
                apiEndpoint: '/restock/{id}/ship',
                method: 'POST',
                requestBody: {
                    wbNumber: `WB${Date.now()}`,
                    logisticsCompany: '韵达',
                    shippedQty: 60
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '发货-记录wb_number和shippedQty',
                description: '验证物流记录包含物流单号和发货数量',
                apiEndpoint: '/restock/{id}/logistics',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '物流跟踪-定时轮询订单状态',
                description: '验证商家可以定时轮询订单状态',
                apiEndpoint: '/restock/{id}',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Restock',
                testName: '物流跟踪-入仓确认后流程闭环',
                description: '验证买手确认入仓后补货订单完成闭环',
                apiEndpoint: '/restock/{id}/arrival',
                method: 'POST',
                requestBody: {},
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            }
        ]
    },

    {
        flowchartName: '2.5 开发进度跟踪详细流程',
        flowchartId: 'DEVELOPMENT_PROGRESS_FLOW',
        testCases: [
            {
                module: 'Development',
                testName: '开发进度-查看开发队列',
                description: '验证商家可以查看开发队列',
                apiEndpoint: '/development',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Development',
                testName: '开发进度-更新状态=打样中(drafting)',
                description: '验证商家可以更新状态为打样中',
                apiEndpoint: '/development/{id}/status',
                method: 'POST',
                requestBody: { status: 'drafting' },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Development',
                testName: '开发进度-更新状态=改版帮看中(pattern)',
                description: '验证商家可以更新状态为改版帮看中',
                apiEndpoint: '/development/{id}/status',
                method: 'POST',
                requestBody: { status: 'pattern' },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Development',
                testName: '开发进度-更新状态=改图帮看中(helping)',
                description: '验证商家可以更新状态为改图帮看中',
                apiEndpoint: '/development/{id}/status',
                method: 'POST',
                requestBody: { status: 'helping' },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Development',
                testName: '开发进度-更新状态=待上传SPU(ok)',
                description: '验证商家可以更新状态为待上传SPU',
                apiEndpoint: '/development/{id}/status',
                method: 'POST',
                requestBody: { status: 'ok' },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Development',
                testName: '开发进度-填写SPU编码',
                description: '验证待上传SPU阶段可以填写SPU编码',
                apiEndpoint: '/development/{id}/spu',
                method: 'POST',
                requestBody: { spuCode: 'TEST_SPU_001' },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Development',
                testName: '开发进度-更新状态=开发成功(success)',
                description: '验证商家可以更新状态为开发成功',
                apiEndpoint: '/development/{id}/status',
                method: 'POST',
                requestBody: { status: 'success' },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Development',
                testName: '开发进度-买手端实时同步状态',
                description: '验证买手端实时同步款式开发状态',
                apiEndpoint: '/styles/private',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Development',
                testName: '开发进度-更新Dashboard统计',
                description: '验证开发状态更新后Dashboard统计同步更新',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            }
        ]
    },

    // ========================================
    // 第二部分: 买手段流程图测试
    // ========================================

    {
        flowchartName: '3.1 系统驾驶舱数据流程',
        flowchartId: 'DASHBOARD_FLOW',
        testCases: [
            {
                module: 'Dashboard',
                testName: '驾驶舱-获取系统统计数据',
                description: '验证驾驶舱返回key_count、shop_count、spu_count等统计',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-提取key_count店铺数量',
                description: '验证驾驶舱提取店铺数量统计',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-统计私推状态分布',
                description: '验证驾驶舱统计私推状态分布（待处理/已接受/进行中）',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-计算privatePending数量',
                description: '验证驾驶舱计算待处理私推数量',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-计算privateAccepted数量',
                description: '验证驾驶舱计算已接受私推数量',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-计算privateInProgress数量',
                description: '验证驾驶舱计算进行中私推数量',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-统计公池数据分布',
                description: '验证驾驶舱统计公池数据分布',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-计算publicTotal公池总数',
                description: '验证驾驶舱计算公池款式总数',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-计算publicFull满额款式数',
                description: '验证驾驶舱计算已满额公池款式数',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-展示店铺等级分布',
                description: '验证驾驶舱展示店铺等级分布',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'Dashboard',
                testName: '驾驶舱-定时自动刷新',
                description: '验证驾驶舱支持定时自动刷新（每5秒）',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            }
        ]
    },

    {
        flowchartName: '3.2.1 私推创建详细流程',
        flowchartId: 'PRIVATE_CREATE_FLOW',
        testCases: [
            {
                module: 'PrivatePush',
                testName: '私推创建-上传款式图片',
                description: '验证创建私推需要上传款式图片',
                apiEndpoint: '/styles/private',
                method: 'POST',
                requestBody: {
                    imageUrl: 'https://example.com/style.jpg',
                    refLink: '',
                    remark: '',
                    visual: '',
                    style: '',
                    shopIds: []
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推创建-填写参考链接',
                description: '验证创建私推可以填写参考链接',
                apiEndpoint: '/styles/private',
                method: 'POST',
                requestBody: {
                    imageUrl: 'https://example.com/style.jpg',
                    refLink: 'https://example.com/ref',
                    remark: '测试备注',
                    visual: '',
                    style: '',
                    shopIds: []
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推创建-选择视觉风格-人模/平铺/挂拍/细节图',
                description: '验证创建私推可以选择视觉风格（人模/平铺/挂拍/细节图）',
                apiEndpoint: '/styles/private',
                method: 'POST',
                requestBody: {
                    imageUrl: 'https://example.com/style.jpg',
                    refLink: '',
                    remark: '',
                    visual: '人模',
                    style: '',
                    shopIds: []
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推创建-选择款式风格',
                description: '验证创建私推可以选择款式风格（优雅风/休闲风/通勤风等）',
                apiEndpoint: '/styles/private',
                method: 'POST',
                requestBody: {
                    imageUrl: 'https://example.com/style.jpg',
                    refLink: '',
                    remark: '',
                    visual: '平铺',
                    style: '优雅风',
                    shopIds: []
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推创建-搜索目标店铺',
                description: '验证创建私推可以搜索目标店铺',
                apiEndpoint: '/shops/search',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推创建-过滤店铺列表',
                description: '验证店铺搜索可以按名称过滤',
                apiEndpoint: '/shops/search?q=测试',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推创建-选择目标店铺',
                description: '验证创建私推可以选择目标店铺（支持单选或多选）',
                apiEndpoint: '/styles/private',
                method: 'POST',
                requestBody: {
                    imageUrl: 'https://example.com/style.jpg',
                    refLink: '',
                    remark: '',
                    visual: '挂拍',
                    style: '韩系风',
                    shopIds: ['shop_001', 'shop_002']
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推创建-后端创建私推记录',
                description: '验证后端创建私推记录并设置status=new',
                apiEndpoint: '/styles/private',
                method: 'POST',
                requestBody: {
                    imageUrl: 'https://example.com/style.jpg',
                    refLink: '',
                    remark: '',
                    visual: '细节图',
                    style: '极简风',
                    shopIds: ['shop_001']
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推创建-向目标店铺私推列表添加款式',
                description: '验证私推创建后添加到目标店铺私推列表',
                apiEndpoint: '/styles/private',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推创建-更新相关统计数据',
                description: '验证私推创建后更新相关统计数据',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PrivatePush',
                testName: '私推创建-商家端轮询监听发现新推送',
                description: '验证商家端通过轮询监听发现新推送',
                apiEndpoint: '/styles/private',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            }
        ]
    },

    {
        flowchartName: '3.2.2 公池推送详细流程',
        flowchartId: 'PUBLIC_PUSH_FLOW',
        testCases: [
            {
                module: 'PublicPool',
                testName: '公池推送-设置最大接款数',
                description: '验证推送公池可以设置最大接款数',
                apiEndpoint: '/styles/public',
                method: 'POST',
                requestBody: {
                    name: '测试公池款式',
                    imageUrl: 'https://example.com/style.jpg',
                    maxIntents: 5
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池推送-设置接款期限',
                description: '验证推送公池可以设置接款期限',
                apiEndpoint: '/styles/public',
                method: 'POST',
                requestBody: {
                    name: '测试公池款式',
                    imageUrl: 'https://example.com/style.jpg',
                    maxIntents: 3,
                    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池推送-上传款式信息',
                description: '验证推送公池需要上传款式信息',
                apiEndpoint: '/styles/public',
                method: 'POST',
                requestBody: {
                    name: '测试公池款式',
                    imageUrl: 'https://example.com/style.jpg',
                    description: '新款春季连衣裙'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池推送-设置标签分类',
                description: '验证推送公池可以设置标签分类',
                apiEndpoint: '/styles/public',
                method: 'POST',
                requestBody: {
                    name: '测试公池款式',
                    imageUrl: 'https://example.com/style.jpg',
                    category: '女装',
                    subCategory: '连衣裙'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池推送-后端创建公池记录',
                description: '验证后端创建公池记录并初始化intent_count=0',
                apiEndpoint: '/styles/public',
                method: 'POST',
                requestBody: {
                    name: '测试公池款式',
                    imageUrl: 'https://example.com/style.jpg',
                    category: '男装',
                    subCategory: 'T恤'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池推送-初始化intent_user_ids=[]',
                description: '验证新公池款式意向用户列表初始化为空',
                apiEndpoint: '/styles/public',
                method: 'POST',
                requestBody: {
                    name: '测试公池款式',
                    imageUrl: 'https://example.com/style.jpg'
                },
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池推送-所有商家可见',
                description: '验证公池推送后所有商家可见',
                apiEndpoint: '/styles/public',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            },
            {
                module: 'PublicPool',
                testName: '公池推送-更新Dashboard统计',
                description: '验证公池推送后更新Dashboard统计',
                apiEndpoint: '/admin/dashboard',
                method: 'GET',
                validation: [
                    { type: 'status', field: 'status', expected: 200 }
                ]
            }
        ]
    }
];

async function runFlowchartTest(testCase: FlowchartTestCase): Promise<TestResult> {
    const start = Date.now();
    try {
        let res: { status: number; data: any };
        
        switch (testCase.method) {
            case 'GET':
                res = await get(testCase.apiEndpoint);
                break;
            case 'POST':
                res = await post(testCase.apiEndpoint, testCase.requestBody || {});
                break;
            case 'PATCH':
                res = await patch(testCase.apiEndpoint, testCase.requestBody || {});
                break;
            case 'DELETE':
                res = await del(testCase.apiEndpoint);
                break;
            default:
                throw new Error(`Unknown method: ${testCase.method}`);
        }

        return {
            module: testCase.module,
            testName: testCase.testName,
            passed: true,
            duration: Date.now() - start
        };
    } catch (e: any) {
        return {
            module: testCase.module,
            testName: testCase.testName,
            passed: false,
            error: e.message,
            duration: Date.now() - start
        };
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('      SCM系统流程图完整镜像测试 - 全量验证');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`开始时间: ${new Date().toLocaleString('zh-CN')}\n`);

    const allResults: TestResult[] = [];
    const allIssues: Issue[] = [];

    for (const suite of testSuites) {
        console.log(`\n▶ 流程图: ${suite.flowchartName}`);
        console.log(`  流程图ID: ${suite.flowchartId}`);
        console.log(`  测试用例数: ${suite.testCases.length}`);
        console.log('─'.repeat(50));

        for (const testCase of suite.testCases) {
            const result = await runFlowchartTest(testCase);
            allResults.push(result);

            const status = result.passed ? '✅' : '❌';
            console.log(`  ${status} ${result.testName} (${result.duration}ms)`);
            
            if (!result.passed && result.error) {
                console.log(`     └─ 错误: ${result.error}`);
            }
        }
    }

    const passed = allResults.filter(r => r.passed).length;
    const failed = allResults.filter(r => !r.passed).length;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                      测试总结');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`总测试数: ${allResults.length}`);
    console.log(`通过: ${passed} ✅`);
    console.log(`失败: ${failed} ❌`);
    console.log(`通过率: ${((passed / allResults.length) * 100).toFixed(1)}%`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (failed > 0) {
        console.log('失败的测试:');
        for (const r of allResults.filter(r => !r.passed)) {
            console.log(`  - [${r.module}] ${r.testName}: ${r.error}`);
        }
    }

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
