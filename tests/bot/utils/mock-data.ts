/**
 * SCM 测试机器人 - 测试数据生成工具
 */

// 生成随机字符串
export function randomString(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 生成测试 SKC 编码
export function generateSkcCode(): string {
    return `SKC-TEST-${randomString(6)}`;
}

// 生成测试 SPU 编码
export function generateSpuCode(): string {
    return `SPU-TEST-${randomString(6)}`;
}

// 生成测试店铺数据
export function generateTestShop() {
    return {
        id: `SHOP-TEST-${randomString(4)}`,
        name: `测试商家-${randomString(4)}`,
    };
}

// 生成测试款式数据
export function generateTestStyle(shopId: string, shopName: string) {
    return {
        shopId,
        shopName,
        imageUrl: `https://picsum.photos/seed/${randomString(8)}/400`,
        name: `测试款式-${randomString(4)}`,
        remark: '自动化测试生成的款式',
        tags: ['测试'],
    };
}

// 生成测试核价数据
export function generateTestQuote() {
    return {
        type: 'WOOL',
        code: generateSkcCode(),
        price: Math.floor(Math.random() * 100) + 20,
        detailJson: {
            material: '羊毛',
            weight: 200,
        },
    };
}

// 生成测试补货订单数据
export function generateTestRestockOrder() {
    return {
        name: `测试补货-${randomString(4)}`,
        imageUrl: `https://picsum.photos/seed/${randomString(8)}/200`,
        planQty: 1000,
        status: '待商家接单',
    };
}
