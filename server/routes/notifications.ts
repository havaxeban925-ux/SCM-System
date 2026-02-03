import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// OPT-4: 获取状态变化通知
// GET /api/notifications?shop_name=xxx&since=timestamp
router.get('/', async (req, res) => {
    const { shop_name, since } = req.query;
    const sinceTime = new Date(parseInt(since as string) || 0);

    const updates: Array<{ title: string; message: string; type: string }> = [];

    try {
        // 1. 检查工单状态变化（已完成的工单）
        const { data: requests } = await supabase
            .from('b_request_record')
            .select('id, type, status, updated_at')
            .eq('shop_name', shop_name)
            .eq('status', 'completed')
            .gte('updated_at', sinceTime.toISOString());

        if (requests && requests.length > 0) {
            updates.push({
                title: '工单已处理',
                message: `您有${requests.length}个工单已完成处理`,
                type: 'order_complete'
            });
        }

        // 2. 检查新私推款式
        const { data: styles } = await supabase
            .from('b_style_demand')
            .select('id, name')
            .eq('shop_name', shop_name)
            .eq('push_type', 'PRIVATE')
            .eq('status', 'new')
            .gte('created_at', sinceTime.toISOString());

        if (styles && styles.length > 0) {
            updates.push({
                title: '新款式推送',
                message: `您收到${styles.length}个新款式推送`,
                type: 'new_style'
            });
        }

        // 3. 检查补货订单状态变化
        const { data: restocks } = await supabase
            .from('b_restock_order')
            .select('id, status')
            .eq('shop_id', shop_name) // 这里需要根据实际字段调整
            .in('status', ['pending', 'confirmed'])
            .gte('updated_at', sinceTime.toISOString());

        if (restocks && restocks.length > 0) {
            updates.push({
                title: '补货订单更新',
                message: `您有${restocks.length}个补货订单状态更新`,
                type: 'restock_update'
            });
        }

        res.json({ updates });
    } catch (err: any) {
        console.error('Notification query error:', err);
        res.json({ updates: [] });
    }
});

export default router;
