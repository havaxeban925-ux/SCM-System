// 工单状态映射
export const REQUEST_STATUS_MAP: Record<string, string> = {
    draft: '草稿',
    processing: '处理中',
    completed: '已完成',
    rejected: '已拒绝',
    viewed: '已查看'
};

// 款式状态映射
export const STYLE_STATUS_MAP: Record<string, string> = {
    locked: '已锁定',
    new: '新款式',
    completed: '已完成',
    abandoned: '已放弃',
    developing: '开发中'
};

// 开发状态映射
export const DEV_STATUS_MAP: Record<string, string> = {
    drafting: '起版中',
    pattern: '打版中',
    helping: '辅料中',
    ok: '已完成',
    success: '已成功'
};

// 补货状态映射
export const RESTOCK_STATUS_MAP: Record<string, string> = {
    pending: '待商家接单',
    reviewing: '待买手复核',
    producing: '生产中',
    confirming: '待买手确认入仓',
    confirmed: '已确认入仓',
    shipped: '已发货',
    cancelled: '已取消'
};

// 中文到原始状态的反向映射
export const RESTOCK_STATUS_CN_TO_RAW = Object.entries(RESTOCK_STATUS_MAP).reduce<Record<string, string>>((acc, [raw, cn]) => {
    acc[cn] = raw;
    return acc;
}, {});

export const REQUEST_STATUS_CN_TO_RAW = Object.entries(REQUEST_STATUS_MAP).reduce<Record<string, string>>((acc, [raw, cn]) => {
    acc[cn] = raw;
    return acc;
}, {});

export const STYLE_STATUS_CN_TO_RAW = Object.entries(STYLE_STATUS_MAP).reduce<Record<string, string>>((acc, [raw, cn]) => {
    acc[cn] = raw;
    return acc;
}, {});
