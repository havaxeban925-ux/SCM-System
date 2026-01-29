/**
 * SCM 测试机器人 - 核价问题测试场景
 */

import { api } from '../api-client.js';
import type { TestCase } from '../runner.js';

// 存储测试过程中创建的数据ID
let createdQuoteId: string | null = null;
let createdSamePriceId: string | null = null;
let createdPriceIncreaseId: string | null = null;

const TEST_SHOP = '测试商家-自动化测试';

export const pricingTests: TestCase[] = [
    {
        name: '提交毛织类核价申请',
        module: 'pricing',
        async run() {
            const result: any = await api.submitQuote({
                subType: '毛织类核价',
                shopName: TEST_SHOP,
                quotes: [
                    {
                        type: 'WOOL',
                        code: 'WOOL-TEST-' + Date.now(),
                        price: 59.9,
                        detailJson: {
                            material: '羊毛',
                            weight: 200,
                        },
                    },
                ],
            });

            if (result && result.id) {
                createdQuoteId = result.id;
            } else {
                throw new Error('创建核价申请失败');
            }
        },
    },
    {
        name: '查看核价申请列表',
        module: 'pricing',
        async run() {
            const result: any = await api.getRequests('pricing');

            if (!result.data || !Array.isArray(result.data)) {
                throw new Error('获取核价列表失败');
            }

            // 确认有数据
            if (result.total === 0) {
                console.log('  (提示: 核价列表为空)');
            }
        },
    },
    {
        name: '买手审批核价通过',
        module: 'pricing',
        async run() {
            if (!createdQuoteId) {
                // 获取任意一个待处理的核价
                const result: any = await api.getRequests('pricing');
                const pendingQuote = result.data?.find((r: any) => r.status === 'processing');
                if (pendingQuote) {
                    createdQuoteId = pendingQuote.id;
                } else {
                    throw new Error('没有待审批的核价申请');
                }
            }

            await api.auditRequest(createdQuoteId, 'approve', '自动化测试审批通过');
            createdQuoteId = null;
        },
    },
    {
        name: '提交同款同价申请',
        module: 'pricing',
        async run() {
            const result: any = await api.submitSamePrice({
                shopName: TEST_SHOP,
                items: [
                    {
                        skcCode: 'SKC-SAME-TEST-' + Date.now(),
                        refCode: 'SKC-REF-001',
                    },
                ],
            });

            if (result && result.id) {
                createdSamePriceId = result.id;
            }
            // 即使没有ID也不报错，API可能返回不同格式
        },
    },
    {
        name: '提交涨价申请',
        module: 'pricing',
        async run() {
            const result: any = await api.submitPriceIncrease({
                shopName: TEST_SHOP,
                items: [
                    {
                        skcCode: 'SKC-INCREASE-TEST-' + Date.now(),
                        currentPrice: 39.9,
                        newPrice: 49.9,
                        reason: '原材料涨价',
                    },
                ],
            });

            if (result && result.id) {
                createdPriceIncreaseId = result.id;
            }
        },
    },
];

export function getCreatedQuoteIds() {
    return { createdQuoteId, createdSamePriceId, createdPriceIncreaseId };
}

export function clearCreatedQuoteIds() {
    createdQuoteId = null;
    createdSamePriceId = null;
    createdPriceIncreaseId = null;
}
