import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, password, shop_name } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // 1. 检查用户名是否已存在
        const { data: existingUser } = await supabase
            .from('sys_user')
            .select('id')
            .eq('username', username)
            .single();

        if (existingUser) {
            return res.status(400).json({ error: '用户名已存在' });
        }

        // 2. 检查店铺名是否已存在 (在 sys_user 中及 sys_shop 中)
        if (shop_name) {
            // Check sys_user (pending/approved registrations)
            const { data: existingShopUser } = await supabase
                .from('sys_user')
                .select('id')
                .eq('shop_name', shop_name)
                .single();

            if (existingShopUser) {
                return res.status(400).json({ error: '店铺名称已被注册' });
            }

            // Check sys_shop (active shops)
            const { data: existingActiveShop } = await supabase
                .from('sys_shop')
                .select('id')
                .eq('shop_name', shop_name)
                .single();

            if (existingActiveShop) {
                return res.status(400).json({ error: '店铺名称已被注册' });
            }
        }

        // 插入新用户，status 默认为 pending（待审批）
        const { data, error } = await supabase
            .from('sys_user')
            .insert([
                {
                    username,
                    password, // 注意：实际生产应哈希存储
                    role: 'merchant',
                    shop_name: shop_name || null,
                    status: 'pending', // 待审批
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Registration Error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json({ success: true, user: data });

    } catch (err: any) {
        console.error('Unexpected Registration Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login - 用户登录
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const { data: user, error } = await supabase
            .from('sys_user')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        if (user.status === 'pending') {
            return res.status(403).json({ error: '账号正在审批中，请耐心等待' });
        }

        if (user.status === 'rejected') {
            return res.status(403).json({ error: `账号已被驳回: ${user.reject_reason || '无原因'}` });
        }

        res.json({ success: true, user });

    } catch (err: any) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/pending - 获取待审批用户列表
router.get('/pending', async (_, res) => {
    try {
        const { data, error } = await supabase
            .from('sys_user')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch pending error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json({ success: true, data });
    } catch (err: any) {
        console.error('Fetch pending error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/approve - 审批通过
router.post('/approve', async (req, res) => {
    const { userId, keyId, keyName, shopCode, level } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    // Trim inputs to avoid whitespace issues
    const safeKeyId = keyId ? keyId.trim() : 'KEY-NEW';
    const safeKeyName = keyName ? keyName.trim() : safeKeyId; // 如果没有 keyName，使用 keyId
    const safeShopCode = shopCode ? shopCode.trim() : '';

    try {
        // 1. 获取用户信息
        const { data: user, error: fetchError } = await supabase
            .from('sys_user')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. 尝试同步到 sys_shop 表 (如不存在)
        // 关键修改：先创建店铺，确保数据完整性。如果不创建成功，则不批准用户。
        if (user.shop_name) {
            const { data: existingShop } = await supabase
                .from('sys_shop')
                .select('id')
                .eq('shop_name', user.shop_name)
                .single();

            if (!existingShop) {
                const { error: insertShopError } = await supabase
                    .from('sys_shop')
                    .insert({
                        shop_name: user.shop_name,
                        role: 'FACTORY',
                        key_id: safeKeyId,
                        key_name: safeKeyName,  // 新增: KEY 商号名称
                        shop_code: safeShopCode,
                        level: level || 'N',
                        phone: user.username  // 使用用户名(手机号)作为联系电话
                    });

                if (insertShopError) {
                    console.error('Critical: Sync to sys_shop failed:', insertShopError);
                    // 返回详细错误给前端，且不更新用户状态
                    return res.status(500).json({
                        error: `店铺创建失败 (请截图联系开发): ${insertShopError.message} - Helper: ${insertShopError.details || 'No details'}`
                    });
                }
            }
            // 允许无店铺名的情况通过（兼容旧数据）
        }

        // 3. 更新用户状态 (仅当店铺创建成功后执行)
        const { error: updateError } = await supabase
            .from('sys_user')
            .update({
                status: 'approved',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Approve error:', updateError);
            return res.status(500).json({ error: updateError.message });
        }

        res.json({ success: true });
    } catch (err: any) {
        console.error('Unexpected error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/reject - 驳回申请
router.post('/reject', async (req, res) => {
    const { userId, reason } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const { error } = await supabase
            .from('sys_user')
            .update({
                status: 'rejected',
                reject_reason: reason || '未说明原因',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            console.error('Reject error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json({ success: true });
    } catch (err: any) {
        console.error('Unexpected error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
