import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 延迟初始化，确保 dotenv 已加载
let _supabase: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
    if (!_supabase) {
        const supabaseUrl = process.env.SUPABASE_URL || '';
        // 优先使用 Service Role Key 以绕过 RLS 限制 (用于后端管理操作)
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment');
        }
        _supabase = createClient(supabaseUrl, supabaseKey);
    }
    return _supabase;
};

// 兼容旧代码，导出 getter
export const supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        return (getSupabase() as any)[prop];
    }
});
