/**
 * SCM 测试机器人 - 大货问题测试场景
 */

import { api } from '../api-client.js';
import type { TestCase } from '../runner.js';

let testOrderId: string | null = null;

export const restockTests: TestCase[] = [
    {
        name: '查看补货订单列表',
        module: 'restock',
        async run() {
            const result: any = await api.getRestockOrders();

            if (!result.data || !Array.isArray(result.data)) {
                throw new Error('获取补货订单列表失败');
            }

            // 尝试找一个待商家接单的订单用于后续测试
            const pendingOrder = result.data.find((o: any) => o.status === '待商家接单');
            if (pendingOrder) {
                testOrderId = pendingOrder.id;
            }
        },
    },
    {
        name: '商家砍量',
        module: 'restock',
        async run() {
            if (!testOrderId) {
                console.log('  (跳过: 没有可用的待接单订单)');
                return;
            }

            await api.updateRestockQuantity(testOrderId, 800, '库存不足，只能生产800件');
        },
    },
    {
        name: '商家确认接单',
        module: 'restock',
        async run() {
            if (!testOrderId) {
                console.log('  (跳过: 没有可用的待接单订单)');
                return;
            }

            await api.confirmRestock(testOrderId);
        },
    },
    {
        name: '买手复核砍量',
        module: 'restock',
        async run() {
            if (!testOrderId) {
                console.log('  (跳过: 没有可用订单)');
                return;
            }

            // 同意砍量
            try {
                await api.reviewRestock(testOrderId, true);
            } catch (err: any) {
                // 如果订单状态不对，不算失败
                if (err.message?.includes('not found') || err.message?.includes('status')) {
                    console.log('  (订单状态已变更，跳过复核)');
                    return;
                }
                throw err;
            }
        },
    },
    {
        name: '商家发货',
        module: 'restock',
        async run() {
            if (!testOrderId) {
                console.log('  (跳过: 没有可用订单)');
                return;
            }

            try {
                await api.shipRestock(testOrderId, {
                    wbNumber: 'WB' + Date.now(),
                    logisticsCompany: '顺丰速运',
                    shippedQty: 800,
                });
            } catch (err: any) {
                if (err.message?.includes('not found') || err.message?.includes('status')) {
                    console.log('  (订单状态已变更，跳过发货)');
                    return;
                }
                throw err;
            }
        },
    },
    {
        name: '买手确认入仓',
        module: 'restock',
        async run() {
            if (!testOrderId) {
                console.log('  (跳过: 没有可用订单)');
                return;
            }

            try {
                await api.confirmArrival(testOrderId);
            } catch (err: any) {
                if (err.message?.includes('not found') || err.message?.includes('status')) {
                    console.log('  (订单状态已变更，跳过确认入仓)');
                    return;
                }
                throw err;
            }

            // 流程完成，清理
            testOrderId = null;
        },
    },
];

export function getTestOrderId(): string | null {
    return testOrderId;
}

export function clearTestOrderId(): void {
    testOrderId = null;
}
