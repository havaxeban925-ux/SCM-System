/**
 * 状态标签工具函数
 * 统一管理所有状态的颜色和样式
 */

// 状态颜色映射
export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    // 通用状态
    'active': { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
    'inactive': { bg: '#f3f4f6', text: '#6b7280', dot: '#9ca3af' },
    'pending': { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },

    // 处理状态
    '未处理': { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
    '处理中': { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
    '已处理': { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
    '待复核': { bg: '#fae8ff', text: '#86198f', dot: '#d946ef' },

    // 审批状态
    '待审批': { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
    '已通过': { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
    '已驳回': { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
    '待处理': { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },

    // 开发状态
    'drafting': { bg: '#e0e7ff', text: '#3730a3', dot: '#6366f1' },
    'developing': { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
    'helping': { bg: '#fae8ff', text: '#86198f', dot: '#d946ef' },
    'ok': { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
    'completed': { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
    'rejected': { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },

    // 商家等级
    'S': { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
    'A': { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
    'B': { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
    'C': { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
    'N': { bg: '#f3f4f6', text: '#6b7280', dot: '#9ca3af' },
};

// 获取状态颜色
export function getStatusColor(status: string): { bg: string; text: string; dot: string } {
    return STATUS_COLORS[status] || STATUS_COLORS['inactive'];
}

// 获取状态 CSS 类名 (用于原生 CSS)
export function getStatusClass(status: string): string {
    const classMap: Record<string, string> = {
        '未处理': 'pending',
        '处理中': 'processing',
        '已处理': 'completed',
        '待复核': 'pending',
        '待审批': 'pending',
        '已通过': 'completed',
        '已驳回': 'rejected',
        '待处理': 'pending',
        'drafting': 'drafting',
        'developing': 'developing',
        'helping': 'helping',
        'ok': 'ok',
        'completed': 'completed',
        'rejected': 'rejected',
        'active': 'active',
        'inactive': 'inactive',
    };
    return classMap[status] || 'inactive';
}

// 状态中文显示
export const STATUS_LABELS: Record<string, string> = {
    'drafting': '改图中',
    'developing': '开发中',
    'helping': '帮看中',
    'ok': '待发布',
    'completed': '已完成',
    'rejected': '已驳回',
    'pending': '待处理',
    'processing': '处理中',
    'active': '有效',
    'inactive': '无效',
};

export function getStatusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
}
