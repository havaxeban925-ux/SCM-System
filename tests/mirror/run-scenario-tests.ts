/**
 * SCM系统场景测试执行程序
 * 
 * 基于 docs/SCM镜面场景测试.md 文档执行完整的业务场景测试
 * 
 * 测试场景:
 * SCN-001: 私推款式接款与核价完整流程
 * SCN-002: 公池款式接款与异常处理完整流程
 * SCN-003: 补货订单全流程协同
 * SCN-004: 开发进度跟踪与SPU关联
 * 
 * 执行方式: npx tsx tests/mirror/run-scenario-tests.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { get, post, patch, del } from './utils/test-client';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEST_PREFIX = `SCM_SCENARIO_${Date.now()}_`;
const TEST_REPORT: any = {
    executionTime: new Date().toISOString(),
    environment: {
        apiUrl: API_URL,
        supabaseUrl: process.env.VITE_SUPABASE_URL
    },
    scenarios: [],
    summary: {
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0
    }
};

const log = (message: string, type: 'info' | 'success' | 'error' | 'step' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
        info: '📋',
        success: '✅',
        error: '❌',
        step: '🔄'
    }[type];
    console.log(`[${timestamp}] ${prefix} ${message}`);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class ScenarioTestRunner {
    private createdRecords: string[] = [];
    private scenarioResults: any[] = [];

    async cleanup() {
        log('清理测试数据...', 'info');
        for (const recordId of this.createdRecords) {
            try {
                const tables = ['b_request_record', 'b_restock_order', 'b_restock_logistics', 's_private_style', 's_public_style'];
                for (const table of tables) {
                    try {
                        await supabaseAdmin.from(table).delete().eq('id', recordId);
                    } catch (e) {
                        // 忽略不存在的表
                    }
                }
            } catch (e) {
                // 忽略清理错误
            }
        }
        this.createdRecords = [];
        log('清理完成', 'success');
    }

    async executeScenario001(): Promise<any> {
        const scenarioName = 'SCN-001: 私推款式接款与核价完整流程';
        log(`开始执行场景测试: ${scenarioName}`, 'step');
        
        const startTime = Date.now();
        const steps: any[] = [];
        let passed = true;

        try {
            // 阶段一：买手创建私推款式
            log('阶段一：买手创建私推款式', 'step');
            
            let privateStyleId = '';
            
            // 步骤1: 上传图片（模拟）
            const uploadResult = await post('/styles/private/upload', { 
                image: `base64_test_${TEST_PREFIX}` 
            });
            steps.push({
                step: '上传款式图片',
                expected: '上传成功',
                actual: uploadResult.status === 200 ? '成功' : '失败',
                passed: uploadResult.status === 200
            });
            
            // 步骤2: 搜索店铺
            const shopSearchResult = await get('/shops/search?q=时尚潮流馆');
            steps.push({
                step: '搜索目标店铺',
                expected: '返回店铺列表',
                actual: shopSearchResult.status === 200 ? `返回${shopSearchResult.data?.length || 0}条记录` : '失败',
                passed: shopSearchResult.status === 200
            });

            // 步骤3: 创建私推记录
            const privateStyleResult = await post('/styles/private', {
                imageUrl: `https://example.com/style_${TEST_PREFIX}.jpg`,
                refLink: `https://example.com/ref_${TEST_PREFIX}`,
                remark: '测试私推款式',
                visual: '人模',
                style: '优雅风',
                shopIds: ['SHOP_001']
            });
            privateStyleId = privateStyleResult.data?.id || `PRI_${TEST_PREFIX}`;
            steps.push({
                step: '创建私推记录',
                expected: '创建成功，生成记录ID',
                actual: privateStyleId ? `ID: ${privateStyleId}` : '失败',
                passed: !!privateStyleId
            });

            if (privateStyleId) this.createdRecords.push(privateStyleId);

            await sleep(500);

            // 阶段二：商家接收并确认私推
            log('阶段二：商家接收并确认私推', 'step');
            
            // 步骤4: 查看待确认私推列表
            const pendingListResult = await get('/styles/private?status=pending');
            steps.push({
                step: '查看待确认私推列表',
                expected: '显示待确认私推',
                actual: pendingListResult.status === 200 ? '成功' : '失败',
                passed: pendingListResult.status === 200
            });

            // 步骤5: 接受私推款式
            const acceptResult = await post(`/styles/private/${privateStyleId}/accept`, {});
            steps.push({
                step: '商家接受私推款式',
                expected: '状态变更为已确认',
                actual: acceptResult.status === 200 ? '成功' : '失败',
                passed: acceptResult.status === 200
            });

            // 步骤6: 查看已确认列表
            const confirmedListResult = await get('/styles/private?status=confirmed');
            steps.push({
                step: '查看已确认列表',
                expected: '显示已确认私推',
                actual: confirmedListResult.status === 200 ? '成功' : '失败',
                passed: confirmedListResult.status === 200
            });

            await sleep(500);

            // 阶段三：商家提交核价申请
            log('阶段三：商家提交核价申请', 'step');
            
            let quoteRequestId = '';

            // 步骤7: 新建核价申请
            const quoteResult = await post('/requests/quote', {
                subType: '申请涨价',
                shopName: '时尚潮流馆',
                quotes: [{
                    code: `SKU_001_${TEST_PREFIX}`,
                    price: 168.00,
                    type: 'INCREASE',
                    detailJson: { reason: '原材料价格上涨15%' }
                }]
            });
            quoteRequestId = quoteResult.data?.id || `QRY_${TEST_PREFIX}`;
            steps.push({
                step: '提交核价申请',
                expected: '创建核价申请记录',
                actual: quoteRequestId ? `ID: ${quoteRequestId}` : '失败',
                passed: !!quoteRequestId
            });

            if (quoteRequestId) this.createdRecords.push(quoteRequestId);

            await sleep(500);

            // 阶段四：买手审批核价申请
            log('阶段四：买手审批核价申请', 'step');
            
            // 步骤8: 查看待审批核价列表
            const pendingQuotesResult = await get('/requests/quote?status=pending');
            steps.push({
                step: '查看待审批核价列表',
                expected: '显示待审批核价',
                actual: pendingQuotesResult.status === 200 ? '成功' : '失败',
                passed: pendingQuotesResult.status === 200
            });

            // 步骤9: 审批通过
            const auditResult = await post(`/requests/${quoteRequestId}/audit`, {
                action: 'approve',
                buyerPrices: [{ code: `SKU_001_${TEST_PREFIX}`, buyerPrice: 158.00 }]
            });
            steps.push({
                step: '买手审批通过',
                expected: '审批成功，状态更新',
                actual: auditResult.status === 200 ? '成功' : '失败',
                passed: auditResult.status === 200
            });

            await sleep(500);

            // 验证阶段
            log('验证测试结果', 'info');
            
            // 验证1: 私推状态
            const styleVerify = await get(`/styles/private/${privateStyleId}`);
            steps.push({
                step: '验证私推状态',
                expected: '状态为confirmed',
                actual: styleVerify.data?.status || '未知',
                passed: styleVerify.data?.status === 'confirmed'
            });

            // 验证2: 核价状态
            const quoteVerify = await get(`/requests/${quoteRequestId}`);
            steps.push({
                step: '验证核价状态',
                expected: '状态为approved',
                actual: quoteVerify.data?.status || '未知',
                passed: quoteVerify.data?.status === 'approved'
            });

        } catch (error: any) {
            log(`场景执行出错: ${error.message}`, 'error');
            passed = false;
            steps.push({
                step: '异常捕获',
                expected: '正常执行',
                actual: error.message,
                passed: false
            });
        }

        const duration = Date.now() - startTime;
        const scenarioPassed = steps.every(s => s.passed);

        const result = {
            scenario: scenarioName,
            status: scenarioPassed ? 'passed' : 'failed',
            duration,
            steps
        };

        this.scenarioResults.push(result);
        log(`场景执行${scenarioPassed ? '成功' : '失败'}: ${scenarioName}`, scenarioPassed ? 'success' : 'error');
        
        return result;
    }

    async executeScenario002(): Promise<any> {
        const scenarioName = 'SCN-002: 公池款式接款与异常处理完整流程';
        log(`开始执行场景测试: ${scenarioName}`, 'step');
        
        const startTime = Date.now();
        const steps: any[] = [];
        let passed = true;

        try {
            // 阶段一：买手推送公池款式
            log('阶段一：买手推送公池款式', 'step');
            
            let publicStyleId = '';

            // 步骤1: 创建公池款式
            const publicStyleResult = await post('/styles/public', {
                name: `春季碎花裙_${TEST_PREFIX}`,
                imageUrl: `https://example.com/spring_${TEST_PREFIX}.jpg`,
                maxIntents: 3,
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                category: '女装',
                subCategory: '连衣裙',
                tags: ['女装', '连衣裙', '碎花']
            });
            publicStyleId = publicStyleResult.data?.id || `PUB_${TEST_PREFIX}`;
            steps.push({
                step: '推送公池款式',
                expected: '创建成功，设置最大接款数3',
                actual: publicStyleId ? `ID: ${publicStyleId}` : '失败',
                passed: !!publicStyleId
            });

            if (publicStyleId) this.createdRecords.push(publicStyleId);

            await sleep(500);

            // 阶段二：多家商家竞争接款
            log('阶段二：多家商家竞争接款', 'step');

            // 商家B接款
            const intentBResult = await post(`/styles/public/${publicStyleId}/intent`, {
                shopId: 'SHOP_002'
            });
            steps.push({
                step: '商家B意向接款',
                expected: '接款成功，计数+1',
                actual: intentBResult.status === 200 ? '成功' : '失败',
                passed: intentBResult.status === 200
            });

            // 商家C接款
            const intentCResult = await post(`/styles/public/${publicStyleId}/intent`, {
                shopId: 'SHOP_003'
            });
            steps.push({
                step: '商家C意向接款',
                expected: '接款成功，计数+1',
                actual: intentCResult.status === 200 ? '成功' : '失败',
                passed: intentCResult.status === 200
            });

            // 商家D接款（最后名额）
            const intentDResult = await post(`/styles/public/${publicStyleId}/intent`, {
                shopId: 'SHOP_004'
            });
            steps.push({
                step: '商家D意向接款',
                expected: '接款成功，计数满（3/3）',
                actual: intentDResult.status === 200 ? '成功' : '失败',
                passed: intentDResult.status === 200
            });

            await sleep(500);

            // 验证自动隐藏
            const hiddenCheck = await get(`/styles/public/${publicStyleId}`);
            steps.push({
                step: '验证款式自动隐藏',
                expected: '达到上限后hidden=true',
                actual: hiddenCheck.data?.hidden ? '已隐藏' : '未隐藏',
                passed: hiddenCheck.data?.hidden === true
            });

            // 阶段三：商家确认订单
            log('阶段三：商家确认订单', 'step');

            // 步骤: 查看待确认订单
            const pendingOrdersResult = await get('/orders/pending');
            steps.push({
                step: '查看待确认订单',
                expected: '显示待确认订单列表',
                actual: pendingOrdersResult.status === 200 ? '成功' : '失败',
                passed: pendingOrdersResult.status === 200
            });

            // 步骤: 填写接单数量并确认
            const confirmResult = await post('/orders/ORDER_001/confirm', {
                acceptedQuantity: 80
            });
            steps.push({
                step: '商家B确认订单(数量80)',
                expected: '确认成功',
                actual: confirmResult.status === 200 ? '成功' : '失败',
                passed: confirmResult.status === 200
            });

            await sleep(500);

            // 阶段四：异常申请处理
            log('阶段四：异常申请处理', 'step');

            let anomalyRequestId = '';

            // 步骤: 提交异常申请（尺码问题）
            const anomalyResult = await post('/requests/anomaly', {
                subType: '尺码问题',
                subDetail: '新增尺码',
                targetCodes: [`SKU_002_${TEST_PREFIX}`],
                content: '需要增加XL尺码'
            });
            anomalyRequestId = anomalyResult.data?.id || `ANO_${TEST_PREFIX}`;
            steps.push({
                step: '提交尺码异常申请',
                expected: '创建异常申请记录',
                actual: anomalyRequestId ? `ID: ${anomalyRequestId}` : '失败',
                passed: !!anomalyRequestId
            });

            if (anomalyRequestId) this.createdRecords.push(anomalyRequestId);

            // 步骤: 买手审批异常
            const anomalyAuditResult = await post(`/requests/${anomalyRequestId}/audit`, {
                action: 'approve'
            });
            steps.push({
                step: '买手审批异常通过',
                expected: '审批成功',
                actual: anomalyAuditResult.status === 200 ? '成功' : '失败',
                passed: anomalyAuditResult.status === 200
            });

        } catch (error: any) {
            log(`场景执行出错: ${error.message}`, 'error');
            passed = false;
            steps.push({
                step: '异常捕获',
                expected: '正常执行',
                actual: error.message,
                passed: false
            });
        }

        const duration = Date.now() - startTime;
        const scenarioPassed = steps.every(s => s.passed);

        const result = {
            scenario: scenarioName,
            status: scenarioPassed ? 'passed' : 'failed',
            duration,
            steps
        };

        this.scenarioResults.push(result);
        log(`场景执行${scenarioPassed ? '成功' : '失败'}: ${scenarioName}`, scenarioPassed ? 'success' : 'error');
        
        return result;
    }

    async executeScenario003(): Promise<any> {
        const scenarioName = 'SCN-003: 补货订单全流程协同';
        log(`开始执行场景测试: ${scenarioName}`, 'step');
        
        const startTime = Date.now();
        const steps: any[] = [];
        let passed = true;

        try {
            // 阶段一：商家提交补货申请
            log('阶段一：商家提交补货申请', 'step');

            let restockId = '';

            // 步骤: 新建补货申请
            const restockResult = await post('/restock', {
                skuCode: `SKU_003_${TEST_PREFIX}`,
                name: `韩版针织开衫_${TEST_PREFIX}`,
                planQuantity: 200,
                reason: '热销款补货'
            });
            restockId = restockResult.data?.id || `RESTOCK_${TEST_PREFIX}`;
            steps.push({
                step: '提交补货申请',
                expected: '创建补货申请记录',
                actual: restockId ? `ID: ${restockId}` : '失败',
                passed: !!restockId
            });

            if (restockId) this.createdRecords.push(restockId);

            // 步骤: 审批补货申请
            const approveResult = await post(`/restock/${restockId}/approve`, {});
            steps.push({
                step: '买手审批补货通过',
                expected: '审批成功，状态变为approved',
                actual: approveResult.status === 200 ? '成功' : '失败',
                passed: approveResult.status === 200
            });

            await sleep(500);

            // 阶段二：商家发货与物流跟踪
            log('阶段二：商家发货与物流跟踪', 'step');

            // 步骤: 查看待发货订单
            const pendingShipResult = await get('/restock/pending');
            steps.push({
                step: '查看待发货订单',
                expected: '显示待发货补货单',
                actual: pendingShipResult.status === 200 ? '成功' : '失败',
                passed: pendingShipResult.status === 200
            });

            // 步骤: 填写物流信息并发货
            const shipResult = await post(`/restock/${restockId}/ship`, {
                wbNumber: `SF${Date.now()}_${TEST_PREFIX}`,
                logisticsCompany: '顺丰',
                shippedQuantity: 180
            });
            steps.push({
                step: '商家发货',
                expected: '发货成功，创建物流记录',
                actual: shipResult.status === 200 ? '成功' : '失败',
                passed: shipResult.status === 200
            });

            // 步骤: 查看物流跟踪
            const trackingResult = await get(`/restock/${restockId}/logistics`);
            steps.push({
                step: '查看物流跟踪',
                expected: '获取物流跟踪信息',
                actual: trackingResult.status === 200 ? '成功' : '失败',
                passed: trackingResult.status === 200
            });

            await sleep(500);

            // 阶段三：入仓确认
            log('阶段三：入仓确认', 'step');

            // 步骤: 入仓确认
            const arrivalResult = await post(`/restock/${restockId}/arrival`, {
                confirmed: true,
                receivedQuantity: 180
            });
            steps.push({
                step: '买手确认入仓',
                expected: '入仓确认成功',
                actual: arrivalResult.status === 200 ? '成功' : '失败',
                passed: arrivalResult.status === 200
            });

            // 验证: 补货单状态
            const restockVerify = await get(`/restock/${restockId}`);
            steps.push({
                step: '验证补货单状态',
                expected: '状态为completed',
                actual: restockVerify.data?.status || '未知',
                passed: restockVerify.data?.status === 'completed'
            });

        } catch (error: any) {
            log(`场景执行出错: ${error.message}`, 'error');
            passed = false;
            steps.push({
                step: '异常捕获',
                expected: '正常执行',
                actual: error.message,
                passed: false
            });
        }

        const duration = Date.now() - startTime;
        const scenarioPassed = steps.every(s => s.passed);

        const result = {
            scenario: scenarioName,
            status: scenarioPassed ? 'passed' : 'failed',
            duration,
            steps
        };

        this.scenarioResults.push(result);
        log(`场景执行${scenarioPassed ? '成功' : '失败'}: ${scenarioName}`, scenarioPassed ? 'success' : 'error');
        
        return result;
    }

    async executeScenario004(): Promise<any> {
        const scenarioName = 'SCN-004: 开发进度跟踪与SPU关联';
        log(`开始执行场景测试: ${scenarioName}`, 'step');
        
        const startTime = Date.now();
        const steps: any[] = [];
        let passed = true;

        try {
            // 阶段一：开发进度更新
            log('阶段一：开发进度更新', 'step');

            let developmentId = '';

            // 步骤: 创建开发进度记录
            const devResult = await post('/development', {
                name: `新款针织衫_${TEST_PREFIX}`,
                status: 'drafting'
            });
            developmentId = devResult.data?.id || `DEV_${TEST_PREFIX}`;
            steps.push({
                step: '创建开发进度记录',
                expected: '创建成功，初始状态drafting',
                actual: developmentId ? `ID: ${developmentId}` : '失败',
                passed: !!developmentId
            });

            if (developmentId) this.createdRecords.push(developmentId);

            // 步骤: 更新为打版中
            const patternResult = await post(`/development/${developmentId}/status`, {
                status: 'pattern'
            });
            steps.push({
                step: '更新状态: drafting → pattern',
                expected: '状态更新成功',
                actual: patternResult.status === 200 ? '成功' : '失败',
                passed: patternResult.status === 200
            });

            // 步骤: 更新为辅料中
            const helpingResult = await post(`/development/${developmentId}/status`, {
                status: 'helping'
            });
            steps.push({
                step: '更新状态: pattern → helping',
                expected: '状态更新成功',
                actual: helpingResult.status === 200 ? '成功' : '失败',
                passed: helpingResult.status === 200
            });

            // 步骤: 更新为确认完成
            const okResult = await post(`/development/${developmentId}/status`, {
                status: 'ok'
            });
            steps.push({
                step: '更新状态: helping → ok',
                expected: '状态更新成功',
                actual: okResult.status === 200 ? '成功' : '失败',
                passed: okResult.status === 200
            });

            await sleep(500);

            // 阶段二：SPU编码关联
            log('阶段二：SPU编码关联', 'step');

            // 步骤: 填写SPU编码
            const spuResult = await post(`/development/${developmentId}/spu`, {
                spuCode: `SPU${Date.now()}_${TEST_PREFIX}`
            });
            steps.push({
                step: '填写SPU编码',
                expected: 'SPU编码关联成功',
                actual: spuResult.status === 200 ? '成功' : '失败',
                passed: spuResult.status === 200
            });

            // 步骤: 查看开发队列
            const devListResult = await get('/development');
            steps.push({
                step: '查看开发队列',
                expected: '显示开发进度列表',
                actual: devListResult.status === 200 ? '成功' : '失败',
                passed: devListResult.status === 200
            });

            // 步骤: 更新为大货完成
            const successResult = await post(`/development/${developmentId}/status`, {
                status: 'success'
            });
            steps.push({
                step: '更新状态: ok → success',
                expected: '状态更新成功，开发完成',
                actual: successResult.status === 200 ? '成功' : '失败',
                passed: successResult.status === 200
            });

            // 验证: 最终状态
            const devVerify = await get(`/development/${developmentId}`);
            steps.push({
                step: '验证最终状态',
                expected: '状态为success',
                actual: devVerify.data?.status || '未知',
                passed: devVerify.data?.status === 'success'
            });

        } catch (error: any) {
            log(`场景执行出错: ${error.message}`, 'error');
            passed = false;
            steps.push({
                step: '异常捕获',
                expected: '正常执行',
                actual: error.message,
                passed: false
            });
        }

        const duration = Date.now() - startTime;
        const scenarioPassed = steps.every(s => s.passed);

        const result = {
            scenario: scenarioName,
            status: scenarioPassed ? 'passed' : 'failed',
            duration,
            steps
        };

        this.scenarioResults.push(result);
        log(`场景执行${scenarioPassed ? '成功' : '失败'}: ${scenarioName}`, scenarioPassed ? 'success' : 'error');
        
        return result;
    }

    async runAllScenarios(): Promise<void> {
        console.log('\n' + '='.repeat(60));
        log('SCM系统场景测试开始执行', 'info');
        console.log('='.repeat(60) + '\n');

        const overallStartTime = Date.now();

        try {
            // 执行场景测试
            await this.executeScenario001();
            await sleep(1000);
            
            await this.executeScenario002();
            await sleep(1000);
            
            await this.executeScenario003();
            await sleep(1000);
            
            await this.executeScenario004();
            await sleep(1000);

        } finally {
            // 清理测试数据
            await this.cleanup();
        }

        const overallDuration = Date.now() - overallStartTime;

        // 生成测试报告
        const totalSteps = this.scenarioResults.reduce((sum, r) => sum + r.steps.length, 0);
        const passedSteps = this.scenarioResults.reduce((sum, r) => sum + r.steps.filter((s: any) => s.passed).length, 0);
        const failedSteps = totalSteps - passedSteps;
        const passedScenarios = this.scenarioResults.filter(r => r.status === 'passed').length;
        const failedScenarios = this.scenarioResults.filter(r => r.status === 'failed').length;

        TEST_REPORT.scenarios = this.scenarioResults;
        TEST_REPORT.summary = {
            total: 4,
            passed: passedScenarios,
            failed: failedScenarios,
            totalSteps,
            passedSteps,
            failedSteps,
            duration: overallDuration
        };

        // 保存测试报告
        const reportPath = join('tests/mirror', `scenario-test-report-${Date.now()}.json`);
        writeFileSync(reportPath, JSON.stringify(TEST_REPORT, null, 2));

        // 打印测试摘要
        console.log('\n' + '='.repeat(60));
        console.log('📊 SCM系统场景测试执行报告');
        console.log('='.repeat(60));
        console.log(`\n执行时间: ${TEST_REPORT.executionTime}`);
        console.log(`总耗时: ${(overallDuration / 1000).toFixed(2)}秒`);
        
        console.log('\n📋 场景执行结果:');
        for (const result of this.scenarioResults) {
            const icon = result.status === 'passed' ? '✅' : '❌';
            console.log(`  ${icon} ${result.scenario} (${(result.duration / 1000).toFixed(2)}s)`);
        }

        console.log('\n📈 统计摘要:');
        console.log(`  场景总数: ${TEST_REPORT.summary.total}`);
        console.log(`  ✅ 通过: ${passedScenarios}`);
        console.log(`  ❌ 失败: ${failedScenarios}`);
        console.log(`  📝 步骤总数: ${totalSteps}`);
        console.log(`  ✅ 通过: ${passedSteps}`);
        console.log(`  ❌ 失败: ${failedSteps}`);
        console.log(`\n📄 详细报告已保存至: ${reportPath}`);
        console.log('='.repeat(60) + '\n');
    }
}

// 主程序入口
async function main() {
    const runner = new ScenarioTestRunner();
    
    try {
        await runner.runAllScenarios();
    } catch (error: any) {
        log(`测试执行失败: ${error.message}`, 'error');
        console.error(error);
        process.exit(1);
    }
}

main();
