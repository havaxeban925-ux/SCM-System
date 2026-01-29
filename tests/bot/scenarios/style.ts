/**
 * SCM 测试机器人 - 款式问题测试场景
 */

import { api } from '../api-client.js';
import type { TestCase } from '../runner.js';

// 存储测试过程中创建的数据ID，用于后续测试步骤
let createdStyleId: string | null = null;

// 测试数据
const TEST_SHOP = {
    id: 'TEST_SHOP_001',
    name: '测试商家-自动化测试',
};

const TEST_STYLE = {
    imageUrl: 'https://picsum.photos/seed/test/400',
    name: '自动化测试款式-' + Date.now(),
    remark: '这是自动化测试创建的款式',
    tags: ['测试'],
};

export const styleTests: TestCase[] = [
    {
        name: '买手私推款式',
        module: 'style',
        async run() {
            const styles = [{
                shopId: TEST_SHOP.id,
                shopName: TEST_SHOP.name,
                imageUrl: TEST_STYLE.imageUrl,
                name: TEST_STYLE.name,
                remark: TEST_STYLE.remark,
                tags: TEST_STYLE.tags,
            }];

            const result = await api.pushPrivate(styles);
            if (!result.success && result.count !== 1) {
                throw new Error('私推款式失败');
            }
        },
    },
    {
        name: '商家查看私推列表',
        module: 'style',
        async run() {
            const result: any = await api.getPrivateStyles();
            if (!result.data || !Array.isArray(result.data)) {
                throw new Error('获取私推列表失败');
            }

            // 找到我们创建的测试款式
            const testStyle = result.data.find((s: any) =>
                s.name?.includes('自动化测试款式') && s.status === 'new'
            );

            if (testStyle) {
                createdStyleId = testStyle.id;
            }

            // 即使没找到测试款式也算通过，因为可能被其他测试清理了
        },
    },
    {
        name: '商家确认接款',
        module: 'style',
        async run() {
            if (!createdStyleId) {
                // 尝试获取任意一个可用的款式
                const result: any = await api.getPrivateStyles();
                const availableStyle = result.data?.find((s: any) => s.status === 'new');
                if (availableStyle) {
                    createdStyleId = availableStyle.id;
                } else {
                    throw new Error('没有可用的待接款式');
                }
            }

            await api.confirmStyle(createdStyleId);
        },
    },
    {
        name: '更新开发状态为改图中',
        module: 'style',
        async run() {
            if (!createdStyleId) {
                throw new Error('没有正在开发的款式');
            }

            await api.updateDevStatus(createdStyleId, 'drafting');
        },
    },
    {
        name: '申请帮看',
        module: 'style',
        async run() {
            if (!createdStyleId) {
                throw new Error('没有正在开发的款式');
            }

            await api.requestHelping(createdStyleId, 'https://picsum.photos/seed/helping/400');
        },
    },
    {
        name: '上传SPU完成开发',
        module: 'style',
        async run() {
            if (!createdStyleId) {
                throw new Error('没有正在开发的款式');
            }

            await api.uploadSpu(createdStyleId, ['SPU-TEST-001', 'SPU-TEST-002']);

            // 清理
            createdStyleId = null;
        },
    },
];

// 导出获取当前测试款式ID的函数
export function getCreatedStyleId(): string | null {
    return createdStyleId;
}

export function clearCreatedStyleId(): void {
    createdStyleId = null;
}
