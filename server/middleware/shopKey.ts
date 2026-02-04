import { NextFunction, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

interface ShopContext {
    id: string;
    shop_name: string;
    key_id: string | null;
    level?: string | null;
}

export async function resolveShopFromKey(req: Request, res: Response, next: NextFunction) {
    const headerKey = req.headers['x-shop-key'] as string | undefined;
    const queryKey = req.query.shopKey as string | undefined;
    const bodyKey = (req.body && (req.body.shopKey as string)) || undefined;
    const shopKey = headerKey || queryKey || bodyKey;

    if (!shopKey) {
        return next();
    }

    const { data: shop, error } = await supabase
        .from('sys_shop')
        .select('id, shop_name, key_id, level')
        .eq('key_id', shopKey)
        .single();

    if (error || !shop) {
        return res.status(403).json({ error: '无效的商家KEY' });
    }

    (req as Request & { shop: ShopContext }).shop = shop as ShopContext;
    return next();
}

export function getShopContext(req: Request): ShopContext | null {
    return (req as Request & { shop?: ShopContext }).shop || null;
}
