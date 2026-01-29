/**
 * SCM 测试机器人 - 异常问题测试场景
 */

import { api } from '../api-client.js';
import type { TestCase } from '../runner.js';

let createdAnomalyId: string | null = null;

const TEST_SHOP = '测试商家-自动化测试';

export const anomalyTests: TestCase[] = [
    {
        name: '提交修改尺码异常申请',
        module: 'anomaly',
        async run() {
            const result: any = await api.submitAnomaly({
                shopName: TEST_SHOP,
                subType: '修改尺码',
                targetCodes: ['SPU-ANOMALY-TEST-' + Date.now()],
                content: '需要将S码改为M码',
            });

            if (result && result.id) {
                createdAnomalyId = result.id;
            }
        },
    },
    {
        name: '查看异常申请列表',
        module: 'anomaly',
        async run() {
            const result: any = await api.getRequests('anomaly');

            if (!result.data || !Array.isArray(result.data)) {
                throw new Error('获取异常列表失败');
            }
        },
    },
    {
        name: '买手审批异常通过',
        module: 'anomaly',
        async run() {
            if (!createdAnomalyId) {
                // 获取任意一个待处理的异常
                const result: any = await api.getRequests('anomaly');
                const pendingAnomaly = result.data?.find((r: any) => r.status === 'processing');
                if (pendingAnomaly) {
                    createdAnomalyId = pendingAnomaly.id;
                } else {
                    throw new Error('没有待审批的异常申请');
                }
            }

            await api.auditRequest(createdAnomalyId, 'approve', '自动化测试审批通过');
            createdAnomalyId = null;
        },
    },
    {
        name: '提交申请下架异常',
        module: 'anomaly',
        async run() {
            const result: any = await api.submitAnomaly({
                shopName: TEST_SHOP,
                subType: '申请下架',
                targetCodes: ['SKC-DELIST-TEST-' + Date.now()],
                content: '款式滞销需要下架',
            });

            if (result && result.id) {
                // 直接驳回这个申请作为测试
                await api.auditRequest(result.id, 'reject', '自动化测试驳回');
            }
        },
    },
];

export function getCreatedAnomalyId(): string | null {
    return createdAnomalyId;
}

export function clearCreatedAnomalyId(): void {
    createdAnomalyId = null;
}
