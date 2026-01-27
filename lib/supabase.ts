import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Database types
export interface Shop {
  id: string;
  shop_name: string;
  phone?: string;
  role: 'FACTORY' | 'BUYER' | 'MERCHANDISER';
  created_at: string;
}

export interface StyleDemand {
  id: string;
  push_type: 'ASSIGN' | 'POOL';
  shop_id?: string;
  shop_name?: string;
  image_url?: string;
  ref_link?: string;
  name: string;
  remark?: string;
  timestamp_label?: string;
  status: 'locked' | 'new' | 'completed' | 'abandoned' | 'developing';
  days_left?: number;
  development_status?: 'drafting' | 'pattern' | 'helping' | 'ok' | 'success';
  confirm_time?: string;
  back_spu?: string;
  is_modify_img: boolean;
  real_img_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PublicStyle {
  id: string;
  name: string;
  image_url?: string;
  intent_count: number;
  max_intents: number;
  tags: string[];
  created_at: string;
}

export interface RequestRecord {
  id: string;
  type: 'pricing' | 'anomaly';
  sub_type?: string;
  target_codes: string[];
  submit_time: string;
  status: 'processing' | 'completed' | 'rejected';
  pricing_details?: PricingDetail[];
  shop_name?: string;
  created_at: string;
  updated_at: string;
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

export interface QuoteOrder {
  id: string;
  request_id?: string;
  quote_no?: string;
  shop_name?: string;
  type: 'WOOL' | 'NORMAL' | 'SAME_PRICE' | 'INCREASE';
  skc_code?: string;
  style_no?: string;
  total_price?: number;
  profit_rate?: number;
  status: number;
  audited_price?: number;
  audit_remark?: string;
  merchant_feedback?: 'ACCEPT' | 'REJECT';
  merchant_expect_price?: number;
  reject_reason?: string;
  detail_json?: object;
  created_at: string;
  updated_at: string;
}

export interface RestockOrder {
  id: string;
  restock_no?: string;
  skc_code: string;
  name?: string;
  image_url?: string;
  shop_id?: string;
  plan_quantity: number;
  actual_quantity?: number;
  arrived_quantity: number;
  status: '待商家接单' | '待买手复核' | '生产中' | '待买手确认入仓' | '已确认入仓' | '已发货';
  reduction_reason?: string;
  remark?: string;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export interface RestockLogistics {
  id: string;
  restock_order_id: string;
  wb_number: string;
  logistics_company?: string;
  shipped_qty: number;
  status: number;
  confirm_time?: string;
  operator_id?: string;
  created_at: string;
}
