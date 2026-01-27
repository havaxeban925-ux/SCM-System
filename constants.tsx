
import { StyleItem, PublicStyleItem, RequestRecord, ReplenishmentItem } from './types';

export const PRIVATE_STYLES: StyleItem[] = [
  {
    id: '1',
    name: '法式优雅碎花连衣长裙',
    image: 'https://images.unsplash.com/photo-1572804013307-a9a11198427e?auto=format&fit=crop&q=80&w=400',
    shopId: 'SHOP_99210',
    shopName: '[示例官方旗舰店]',
    remark: '建议面料：雪纺、丝绸；适合早秋休闲与职场通勤场景。',
    timestamp: '2小时前转入',
    status: 'locked',
    daysLeft: 2
  },
  {
    id: '2',
    name: '极简廓形真丝衬衫',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=400',
    shopId: 'SHOP_88012',
    shopName: '[名品潮流馆]',
    remark: '高端支线款式，关注真丝缩水率控制。',
    timestamp: '昨天 15:30 推送',
    status: 'new'
  }
];

export const MOCK_DEVELOPMENT_STYLES: StyleItem[] = [
  {
    id: 'DEV-001',
    name: '复古赫本风赫本风方领大摆裙',
    image: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&q=80&w=400',
    shopId: 'SHOP_1001',
    shopName: '赫本工作室',
    remark: '领口深度需微调，裙摆增加20cm垂度感。',
    timestamp: '2024-05-22',
    status: 'developing',
    developmentStatus: 'drafting'
  },
  {
    id: 'DEV-002',
    name: '意式重工刺绣羊毛大衣',
    image: 'https://images.unsplash.com/photo-1539533377285-b827dd19028a?auto=format&fit=crop&q=80&w=400',
    shopId: 'SHOP_2002',
    shopName: '意式精品馆',
    remark: '关注袖口刺绣密度，面料克重需在800g以上。',
    timestamp: '2024-05-21',
    status: 'developing',
    developmentStatus: 'helping'
  }
];

export const INITIAL_REPLENISHMENT_ITEMS: ReplenishmentItem[] = [
  {
    id: 'SKC2023001',
    name: '碎花连衣裙 - 复古蓝',
    image: 'https://picsum.photos/seed/p1/200',
    planQty: 1000,
    acceptedQty: 900,
    status: '待商家接单',
    expiryDate: '2024-11-20'
  },
  {
    id: 'SKC2023005',
    name: '羊毛针织衫 - 燕麦色',
    image: 'https://picsum.photos/seed/p2/200',
    planQty: 500,
    acceptedQty: 500,
    status: '生产中',
    expiryDate: '2024-11-25'
  }
];

export const REQUEST_RECORDS: RequestRecord[] = [
  { 
    id: 'REQ-P-001', 
    type: 'pricing', 
    subType: '毛织类核价', 
    targetCodes: ['SKC-991', 'SKC-992'], 
    submitTime: '2024-05-21 10:30', 
    status: 'processing',
    pricingDetails: [
      { skc: 'SKC-991', appliedPrice: 59, buyerPrice: 59, status: '成功', time: '2024-05-21' },
      { skc: 'SKC-992', appliedPrice: 50, buyerPrice: 45, status: '失败', time: '2024-05-21' }
    ]
  },
  { id: 'REQ-A-045', type: 'anomaly', subType: '修改尺码', targetCodes: ['SPU-ABC'], submitTime: '2024-05-20 16:15', status: 'completed' },
  { id: 'REQ-A-012', type: 'anomaly', subType: '申请下架', targetCodes: ['SKC-X1'], submitTime: '2024-05-19 09:20', status: 'completed' },
];

export const PUBLIC_STYLES: PublicStyleItem[] = [
  { id: 'P1', name: '高腰直筒牛仔裤', image: 'https://picsum.photos/seed/ denim/400', intentCount: 1, maxIntents: 2, tags: ['丹宁'] },
  { id: 'P2', name: '羊毛开衫', image: 'https://picsum.photos/seed/wool/400', intentCount: 0, maxIntents: 2, tags: ['毛织'] }
];
