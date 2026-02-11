
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export enum AppView {
  STYLE_WORKBENCH = 'STYLE_WORKBENCH',
  DEVELOPMENT_PROGRESS = 'DEVELOPMENT_PROGRESS',
  REQUEST_WORKBENCH = 'REQUEST_WORKBENCH',
  REPLENISHMENT = 'REPLENISHMENT'
}

export interface StyleItem {
  id: string;
  name: string;
  image: string;
  shopId: string;
  shopName: string;
  remark: string;
  timestamp: string;
  status: 'locked' | 'new' | 'completed' | 'abandoned' | 'developing';
  daysLeft?: number;
  developmentStatus?: 'drafting' | 'pattern' | 'helping' | 'ok' | 'success';
  abandonReason?: string;
  spuList?: string[];
  refLink?: string;
  attachments?: string[];
}

export interface ReplenishmentItem {
  id: string;
  name: string;
  image: string;
  planQty: number;
  acceptedQty: number;
  status: '待商家接单' | '待买手复核' | '生产中' | '待买手确认入仓' | '已确认入仓' | '已发货' | '已取消' | '已拒绝';
  expiryDate: string;
  reductionReason?: string;
}

export interface PricingDetail {
  skc: string;
  appliedPrice: number;
  buyerPrice: number;
  status: '成功' | '失败' | '复核中';
  time: string;
  secondPrice?: number;
  secondReason?: string;
}

export interface RequestRecord {
  id: string;
  type: 'pricing' | 'anomaly' | 'style';
  subType: string;
  targetCodes: string[]; // SKC, SPU, or SKU
  submitTime: string;
  status: 'processing' | 'completed' | 'rejected' | 'pending_confirm' | 'pending_recheck' | 'viewed';
  isUrgent?: boolean;
  pricingDetails?: PricingDetail[];
}

export interface PublicStyleItem {
  id: string;
  name: string;
  image: string;
  intentCount: number;
  maxIntents: number;
  tags: string[];
}
