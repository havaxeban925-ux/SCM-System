/**
 * SCM系统流程图测试工具库
 * 
 * 提供流程图测试所需的辅助函数、数据生成器和验证器
 * 
 * 使用方法:
 * import { FlowchartTestUtils } from './utils/flowchart-test-utils';
 */

import { get, post, patch, del, assertTrue, assertEqual, assertExists, genTestId, TestResult } from './test-client';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class FlowchartTestUtils {
    private testPrefix: string;
    private createdRecords: string[] = [];

    constructor() {
        this.testPrefix = `FLOWCHART_TEST_${Date.now()}`;
    }

    // ========================================
    // 核价申请流程测试数据生成
    // ========================================

    generatePricingRequest(subType: string = '常规核价'): any {
        return {
            subType,
            shopName: `${this.testPrefix}_Shop`,
            quotes: [{
                code: `${this.testPrefix}_SKC_${Date.now()}`,
                price: Math.floor(Math.random() * 200) + 50,
                type: subType === '申请涨价' ? 'INCREASE' : 'NORMAL',
                detailJson: {
                    reason: `${this.testPrefix}_价格调整测试`,
                    fabric: '棉质',
                    labor: 30,
                    material: 50
                }
            }]
        };
    }

    async createPricingRequest(requestBody: any): Promise<{ id: string; status: number; data: any }> {
        const res = await post('/requests/quote', requestBody);
        if (res.status === 200 && res.data?.id) {
            this.createdRecords.push(res.data.id);
        }
        return { id: res.data?.id, status: res.status, data: res.data };
    }

    async auditPricingRequest(requestId: string, action: 'approve' | 'reject', buyerPrices?: any): Promise<{ status: number; data: any }> {
        return await post(`/requests/${requestId}/audit`, {
            action,
            buyerPrices: buyerPrices || {},
            feedback: action === 'reject' ? `${this.testPrefix}_审批驳回` : undefined
        });
    }

    // ========================================
    // 异常申请流程测试数据生成
    // ========================================

    generateAnomalyRequest(subType: string, subDetail?: string): any {
        const anomalyTypes = {
            '尺码问题': { subDetail: '新增尺码', content: `${this.testPrefix}_需要增加XL尺码` },
            '图片异常': { subDetail: '人台误判', content: `${this.testPrefix}_模特身高与实际不符` },
            '申请下架': { subDetail: undefined, content: `${this.testPrefix}_产品质量问题申请下架` },
            '大货异常': { subDetail: undefined, content: `${this.testPrefix}_大货色差超标` }
        };

        const typeInfo = anomalyTypes[subType as keyof typeof anomalyTypes] || { subDetail: undefined, content: `${this.testPrefix}_其他异常` };

        return {
            subType,
            subDetail: subDetail || typeInfo.subDetail,
            targetCodes: [`${this.testPrefix}_PRODUCT_${Date.now()}`],
            content: typeInfo.content
        };
    }

    async createAnomalyRequest(requestBody: any): Promise<{ id: string; status: number; data: any }> {
        const res = await post('/requests/anomaly', requestBody);
        if (res.status === 200 && res.data?.id) {
            this.createdRecords.push(res.data.id);
        }
        return { id: res.data?.id, status: res.status, data: res.data };
    }

    async auditAnomalyRequest(requestId: string, action: 'approve' | 'reject'): Promise<{ status: number; data: any }> {
        return await post(`/requests/${requestId}/audit`, {
            action,
            feedback: action === 'reject' ? `${this.testPrefix}_证据不足` : undefined
        });
    }

    // ========================================
    // 私推流程测试数据生成
    // ========================================

    generatePrivateStyle(): any {
        return {
            imageUrl: `https://example.com/style_${this.testPrefix}.jpg`,
            refLink: `https://example.com/ref_${this.testPrefix}`,
            remark: `${this.testPrefix}_私推款式备注`,
            visual: ['人模', '平铺', '挂拍', '细节图'][Math.floor(Math.random() * 4)],
            style: ['优雅风', '休闲风', '通勤风', '法式风', '韩系风', '甜酷风', '极简风'][Math.floor(Math.random() * 7)],
            shopIds: []
        };
    }

    async createPrivateStyle(styleBody: any): Promise<{ id: string; status: number; data: any }> {
        const res = await post('/styles/private', styleBody);
        return { id: res.data?.id, status: res.status, data: res.data };
    }

    async acceptPrivateStyle(styleId: string): Promise<{ status: number; data: any }> {
        return await post(`/styles/${styleId}/accept`, {});
    }

    async abandonPrivateStyle(styleId: string, reason: string = '产能不足'): Promise<{ status: number; data: any }> {
        return await post(`/styles/${styleId}/abandon`, { reason });
    }

    async getPrivateStyles(): Promise<{ status: number; data: any }> {
        return await get('/styles/private');
    }

    // ========================================
    // 公池流程测试数据生成
    // ========================================

    generatePublicStyle(): any {
        return {
            name: `${this.testPrefix}_公池款式_${Date.now()}`,
            imageUrl: `https://example.com/public_style_${this.testPrefix}.jpg`,
            maxIntents: 3,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            category: ['女装', '男装', '童装'][Math.floor(Math.random() * 3)],
            subCategory: ['连衣裙', 'T恤', '外套'][Math.floor(Math.random() * 3)]
        };
    }

    async createPublicStyle(styleBody: any): Promise<{ id: string; status: number; data: any }> {
        const res = await post('/styles/public', styleBody);
        return { id: res.data?.id, status: res.status, data: res.data };
    }

    async expressIntent(styleId: string): Promise<{ status: number; data: any }> {
        return await post(`/styles/public/${styleId}/intent`, {});
    }

    async confirmPublicStyle(styleId: string, shopData: any): Promise<{ status: number; data: any }> {
        return await post(`/styles/public/${styleId}/confirm`, shopData);
    }

    async getPublicStyles(): Promise<{ status: number; data: any }> {
        return await get('/styles/public');
    }

    // ========================================
    // 补货订单流程测试数据生成
    // ========================================

    async prepareRestockTestData(): Promise<{ orderId: string; shopId: string }> {
        const shopName = `${this.testPrefix}_RestockShop_${Date.now()}`;
        
        const { data: shopData } = await supabaseAdmin
            .from('sys_shop')
            .insert({ shop_name: shopName, level: 'A' })
            .select()
            .single();

        if (!shopData) {
            throw new Error(`无法创建测试商家: ${shopName}`);
        }

        const skcCode = `${this.testPrefix}_RESTOCK_SKC_${Date.now()}`;
        const { data: orderData } = await supabaseAdmin
            .from('b_restock_order')
            .insert({
                skc_code: skcCode,
                name: `${this.testPrefix}_补货款式`,
                image_url: 'https://test.example.com/img.jpg',
                shop_id: shopData.id,
                plan_quantity: 100,
                actual_quantity: null,
                arrived_quantity: 0,
                status: 'pending'
            })
            .select()
            .single();

        if (!orderData) {
            await supabaseAdmin.from('sys_shop').delete().eq('id', shopData.id);
            throw new Error(`无法创建测试补货订单: ${skcCode}`);
        }

        this.createdRecords.push(orderData.id);
        return { orderId: orderData.id, shopId: shopData.id };
    }

    async updateQuantity(orderId: string, quantity: number, reason?: string): Promise<{ status: number; data: any }> {
        return await patch(`/restock/${orderId}/quantity`, { quantity, reason });
    }

    async confirmRestock(orderId: string): Promise<{ status: number; data: any }> {
        return await post(`/restock/${orderId}/confirm`, {});
    }

    async shipRestock(orderId: string, shippedQty: number = 50): Promise<{ status: number; data: any }> {
        return await post(`/restock/${orderId}/ship`, {
            wbNumber: `WB${Date.now()}_${this.testPrefix}`,
            logisticsCompany: ['顺丰', '中通', '圆通', '韵达'][Math.floor(Math.random() * 4)],
            shippedQty
        });
    }

    async arrivalConfirm(orderId: string): Promise<{ status: number; data: any }> {
        return await post(`/restock/${orderId}/arrival`, {});
    }

    async getLogistics(orderId: string): Promise<{ status: number; data: any }> {
        return await get(`/restock/${orderId}/logistics`);
    }

    // ========================================
    // 开发进度流程测试数据生成
    // ========================================

    generateDevelopmentStatus(): string[] {
        return ['drafting', 'pattern', 'helping', 'ok', 'success'];
    }

    async updateDevelopmentStatus(styleId: string, status: string): Promise<{ status: number; data: any }> {
        return await post(`/development/${styleId}/status`, { status });
    }

    async updateSpuCode(styleId: string, spuCode: string): Promise<{ status: number; data: any }> {
        return await post(`/development/${styleId}/spu`, { spuCode });
    }

    async getDevelopmentQueue(): Promise<{ status: number; data: any }> {
        return await get('/development');
    }

    // ========================================
    // 驾驶舱数据流程测试
    // ========================================

    async getDashboard(): Promise<{ status: number; data: any }> {
        return await get('/admin/dashboard');
    }

    // ========================================
    // 店铺搜索流程测试
    // ========================================

    async searchShops(keyword: string): Promise<{ status: number; data: any }> {
        return await get(`/shops/search?q=${encodeURIComponent(keyword)}`);
    }

    // ========================================
    // 验证器函数
    // ========================================

    validateStatus(response: { status: number; data: any }, expectedStatus: number): boolean {
        return response.status === expectedStatus;
    }

    validateState(record: any, expectedState: string, stateField: string = 'status'): boolean {
        return record?.[stateField] === expectedState;
    }

    validateCount(count: number, min?: number, max?: number): boolean {
        if (min !== undefined && count < min) return false;
        if (max !== undefined && count > max) return false;
        return true;
    }

    validateFieldExists(record: any, fieldName: string): boolean {
        return record && record[fieldName] !== undefined;
    }

    // ========================================
    // 清理函数
    // ========================================

    async cleanup(): Promise<void> {
        for (const recordId of this.createdRecords) {
            try {
                await supabaseAdmin.from('b_request_record').delete().eq('id', recordId);
            } catch (e) {
                console.log(`清理记录失败: ${recordId}`);
            }
        }
        this.createdRecords = [];
    }

    async cleanupAll(): Promise<void> {
        await this.cleanup();
        
        const tables = ['b_request_record', 'b_restock_order', 'b_restock_logistics', 'sys_shop'];
        for (const table of tables) {
            try {
                await supabaseAdmin.from(table).delete().like('name', `${this.testPrefix}%`);
                await supabaseAdmin.from(table).delete().like('skc_code', `${this.testPrefix}%`);
            } catch (e) {
                console.log(`清理表 ${table} 失败`);
            }
        }
    }

    getTestPrefix(): string {
        return this.testPrefix;
    }
}

export async function runFlowchartTest(
    testName: string,
    testFn: () => Promise<boolean>,
    errorHandler?: (error: Error) => void
): Promise<TestResult> {
    const start = Date.now();
    try {
        const passed = await testFn();
        return {
            module: 'Flowchart',
            testName,
            passed,
            duration: Date.now() - start
        };
    } catch (e: any) {
        if (errorHandler) errorHandler(e);
        return {
            module: 'Flowchart',
            testName,
            passed: false,
            error: e.message,
            duration: Date.now() - start
        };
    }
}

export { supabaseAdmin, TEST_PREFIX };
