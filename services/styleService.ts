import { supabase, StyleDemand, PublicStyle } from '../lib/supabase';

// 获取私推款式列表（未进入开发状态的）
export async function getPrivateStyles(): Promise<StyleDemand[]> {
    const { data, error } = await supabase
        .from('b_style_demand')
        .select('*')
        .in('status', ['locked', 'new'])
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching private styles:', error);
        return [];
    }
    return data || [];
}

// 获取公池款式列表
export async function getPublicStyles(): Promise<PublicStyle[]> {
    const { data, error } = await supabase
        .from('b_public_style')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching public styles:', error);
        return [];
    }
    return data || [];
}

// 确认接款 - 将款式状态改为developing
export async function confirmStyle(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('b_style_demand')
        .update({
            status: 'developing',
            development_status: 'drafting',
            confirm_time: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error confirming style:', error);
        return false;
    }
    return true;
}

// 放弃接款 - 将款式状态重置为new
export async function abandonStyle(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('b_style_demand')
        .update({
            status: 'new',
            development_status: null,
            confirm_time: null,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error abandoning style:', error);
        return false;
    }
    return true;
}

// 从公池创建新款式需求并接款
export async function createAndConfirmPublicStyle(publicStyle: PublicStyle): Promise<StyleDemand | null> {
    const newStyle: Partial<StyleDemand> = {
        push_type: 'POOL',
        shop_name: '公池商家',
        image_url: publicStyle.image_url,
        name: publicStyle.name,
        remark: '从公海池直接接款开发',
        timestamp_label: '刚刚',
        status: 'developing',
        development_status: 'drafting',
        confirm_time: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('b_style_demand')
        .insert(newStyle)
        .select()
        .single();

    if (error) {
        console.error('Error creating style from public pool:', error);
        return null;
    }

    // 更新公池意向数
    await supabase
        .from('b_public_style')
        .update({ intent_count: publicStyle.intent_count + 1 })
        .eq('id', publicStyle.id);

    return data;
}

// 表达意向（公池）
export async function expressIntent(id: string): Promise<boolean> {
    const { data: style, error: fetchError } = await supabase
        .from('b_public_style')
        .select('intent_count, max_intents')
        .eq('id', id)
        .single();

    if (fetchError || !style) {
        console.error('Error fetching public style:', fetchError);
        return false;
    }

    if (style.intent_count >= style.max_intents) {
        console.warn('Max intents reached for this style');
        return false;
    }

    const { error } = await supabase
        .from('b_public_style')
        .update({ intent_count: style.intent_count + 1 })
        .eq('id', id);

    if (error) {
        console.error('Error expressing intent:', error);
        return false;
    }
    return true;
}
