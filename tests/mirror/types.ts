/**
 * SCM系统流程图可视化测试运行器 - 类型定义
 */

export interface TestCase {
    module: string;
    testName: string;
    description: string;
    apiEndpoint: string;
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    requestBody?: Record<string, unknown>;
    validation: ValidationRule[];
    dependsOn?: string[];
}

export interface ValidationRule {
    type: 'status' | 'data' | 'state' | 'count' | 'field';
    field: string;
    expected: unknown;
    message?: string;
}

export interface TestSuite {
    flowchartName: string;
    flowchartId: string;
    testCases: TestCase[];
    module?: string;
    description?: string;
}

export interface FlowchartTestCase extends TestCase {
    flowchartId: string;
    flowchartName: string;
}

export interface TestResult {
    testName: string;
    module: string;
    passed: boolean;
    duration: number;
    error?: string;
    response?: {
        status: number;
        data: unknown;
    };
    validations?: {
        rule: ValidationRule;
        passed: boolean;
        actual: unknown;
    }[];
}

export interface VisualConfig {
    supabaseUrl: string;
    supabaseKey: string;
    apiUrl: string;
    adminEmail: string;
    adminPassword: string;
    testMode: boolean;
    autoCleanup: boolean;
    timeout: number;
}

export interface ExecutionPlan {
    totalTests: number;
    estimatedTime: number;
    testList: {
        suite: string;
        test: FlowchartTestCase;
    }[];
}

export interface ModuleConfig {
    name: string;
    color: string;
    icon: string;
    description: string;
    endpoints: string[];
}

export const moduleConfigs: Record<string, ModuleConfig> = {
    'Pricing': {
        name: '核价申请',
        color: '#3b82f6',
        icon: '💰',
        description: '商家向买手提交价格审核申请',
        endpoints: ['/requests/quote', '/requests/:id/audit']
    },
    'Anomaly': {
        name: '异常申请',
        color: '#ef4444',
        icon: '⚠️',
        description: '处理商品异常情况（尺码、图片、下架等）',
        endpoints: ['/requests/anomaly', '/requests/:id/audit']
    },
    'PrivatePush': {
        name: '私推接款',
        color: '#8b5cf6',
        icon: '📱',
        description: '商家接收买手私推款式并确认',
        endpoints: ['/styles/private', '/styles/:id/accept']
    },
    'PublicPool': {
        name: '公池接款',
        color: '#06b6d4',
        icon: '🌐',
        description: '商家从公池竞争获取款式',
        endpoints: ['/styles/public', '/styles/:id/intent']
    },
    'Order': {
        name: '接单确认',
        color: '#f59e0b',
        icon: '📋',
        description: '商家确认并处理订单',
        endpoints: ['/orders', '/orders/:id/confirm']
    },
    'Logistics': {
        name: '发货物流',
        color: '#10b981',
        icon: '🚚',
        description: '发货和物流跟踪管理',
        endpoints: ['/restock/:id/ship', '/restock/:id/logistics']
    },
    'Development': {
        name: '开发进度',
        color: '#ec4899',
        icon: '📈',
        description: '款式开发进度跟踪',
        endpoints: ['/development', '/development/:id/status']
    },
    'Dashboard': {
        name: '系统驾驶舱',
        color: '#6366f1',
        icon: '🎯',
        description: '买手数据统计和驾驶舱展示',
        endpoints: ['/admin/dashboard']
    },
    'StyleCreate': {
        name: '私推创建',
        color: '#14b8a6',
        icon: '✨',
        description: '买手创建私推款式',
        endpoints: ['/styles/private', '/shops/search']
    },
    'PublicPush': {
        name: '公池推送',
        color: '#f97316',
        icon: '🚀',
        description: '买手推送款式到公池',
        endpoints: ['/styles/public']
    }
};

export const statusMapping: Record<string, string> = {
    'pending': '待处理',
    'approved': '已通过',
    'rejected': '已拒绝',
    'completed': '已完成',
    'cancelled': '已取消',
    'in_progress': '进行中'
};

export const errorMessages = {
    CONFIG_MISSING: '配置信息不完整，请检查设置',
    NETWORK_ERROR: '网络连接失败，请检查API地址',
    TIMEOUT: '请求超时，请增加超时时间',
    VALIDATION_FAILED: '数据验证失败',
    UNAUTHORIZED: '未授权访问，请检查账号信息',
    SERVER_ERROR: '服务器错误',
    NOT_FOUND: '资源不存在'
};
