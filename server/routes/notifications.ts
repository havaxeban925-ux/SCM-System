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

// ✅ Phase 2: SSE 客户端管理
interface SSEClient {
    res: any;
    shop_name: string;
    lastHeartbeat: number;
}

const sseClients = new Map<number, SSEClient>();

// 清理僵尸连接 (每 2 分钟)
setInterval(() => {
    const now = Date.now();
    sseClients.forEach((client, id) => {
        if (now - client.lastHeartbeat > 120000) {
            try { client.res.end(); } catch { }
            sseClients.delete(id);
        }
    });
}, 120000);

// ✅ Phase 2: SSE 流端点
// GET /api/notifications/stream?shop_name=xxx
router.get('/stream', (req, res) => {
    const { shop_name } = req.query;

    if (!shop_name) {
        return res.status(400).json({ error: 'shop_name is required' });
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // 发送初始连接成功事件
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ message: 'SSE connection established', shop_name })}\n\n`);

    // 注册客户端
    const clientId = Date.now() + Math.random();
    sseClients.set(clientId, {
        res,
        shop_name: shop_name as string,
        lastHeartbeat: Date.now()
    });

    console.log(`[SSE] Client connected: ${shop_name} (total: ${sseClients.size})`);

    // 心跳保活 (每 30 秒)
    const heartbeat = setInterval(() => {
        try {
            res.write(`: heartbeat\n\n`);
            const client = sseClients.get(clientId);
            if (client) client.lastHeartbeat = Date.now();
        } catch {
            clearInterval(heartbeat);
        }
    }, 30000);

    // 清理
    req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(clientId);
        console.log(`[SSE] Client disconnected: ${shop_name} (total: ${sseClients.size})`);
    });
});

// ✅ Phase 2: 推送通知函数
export function notifyShop(shopName: string, event: { type: string; title: string; message: string; data?: any }) {
    let notifiedCount = 0;

    sseClients.forEach((client) => {
        if (client.shop_name === shopName) {
            try {
                client.res.write(`event: ${event.type}\n`);
                client.res.write(`data: ${JSON.stringify({
                    title: event.title,
                    message: event.message,
                    type: event.type,
                    data: event.data,
                    timestamp: new Date().toISOString()
                })}\n\n`);
                notifiedCount++;
            } catch (err) {
                console.error(`[SSE] Failed to notify ${shopName}:`, err);
            }
        }
    });

    if (notifiedCount > 0) {
        console.log(`[SSE] Notified ${shopName}: ${event.type} (${notifiedCount} clients)`);
    }
}

// 获取当前连接数 (调试用)
router.get('/stream/status', (req, res) => {
    const clients: { shop_name: string; connected_at: number }[] = [];
    sseClients.forEach((client, id) => {
        clients.push({ shop_name: client.shop_name, connected_at: id });
    });
    res.json({ total: sseClients.size, clients });
});

export default router;
