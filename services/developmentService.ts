import { supabase, StyleDemand } from '../lib/supabase';

// 获取开发中的款式
export async function getDevelopingStyles(): Promise<StyleDemand[]> {
    const { data, error } = await supabase
        .from('b_style_demand')
        .select('*')
        .eq('status', 'developing')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching developing styles:', error);
        return [];
    }
    return data || [];
}

// 更新开发状态
export async function updateDevStatus(
    id: string,
    status: StyleDemand['development_status']
): Promise<boolean> {
    const updates: Partial<StyleDemand> = {
        development_status: status,
        updated_at: new Date().toISOString()
    };

    // 如果状态为success，标记为完结
    if (status === 'success') {
        updates.status = 'completed';
    }

    const { error } = await supabase
        .from('b_style_demand')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('Error updating dev status:', error);
        return false;
    }
    return true;
}

// 申请改图帮看
export async function requestHelping(id: string, imageUrl?: string): Promise<boolean> {
    const updates: Partial<StyleDemand> = {
        development_status: 'helping',
        updated_at: new Date().toISOString()
    };

    if (imageUrl) {
        updates.real_img_url = imageUrl;
        updates.is_modify_img = true;
    }

    const { error } = await supabase
        .from('b_style_demand')
        .update(updates)
        .eq('id', id);

    if (error) {
        console.error('Error requesting helping:', error);
        return false;
    }
    return true;
}

// 上传SPU
export async function uploadSpu(id: string, spuList: string): Promise<boolean> {
    const { error } = await supabase
        .from('b_style_demand')
        .update({
            back_spu: spuList,
            development_status: 'success',
            status: 'completed',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error uploading SPU:', error);
        return false;
    }
    return true;
}

// 放弃开发 - 直接退回后端处理，状态改为 abandoned
export async function abandonDevelopment(id: string, reason?: string): Promise<boolean> {
    const { error } = await supabase
        .from('b_style_demand')
        .update({
            status: 'abandoned',
            development_status: null,
            confirm_time: null,
            remark: reason ? `放弃原因: ${reason}` : undefined,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error abandoning development:', error);
        return false;
    }
    return true;
}

// 模拟买手确认帮看通过
export async function confirmHelpingOk(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('b_style_demand')
        .update({
            development_status: 'ok',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error confirming helping ok:', error);
        return false;
    }
    return true;
}
