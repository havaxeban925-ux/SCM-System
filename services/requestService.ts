import { supabase, RequestRecord, QuoteOrder, PricingDetail } from '../lib/supabase';

// 生成唯一编号
function generateNo(prefix: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// 获取申请记录列表
export async function getRequestRecords(): Promise<RequestRecord[]> {
    const { data, error } = await supabase
        .from('b_request_record')
        .select('*')
        .order('submit_time', { ascending: false });

    if (error) {
        console.error('Error fetching request records:', error);
        return [];
    }
    return data || [];
}

// 创建核价申请（报价单）
export async function createQuoteRequest(
    subType: string,
    shopName: string,
    quotes: Array<{
        type: 'WOOL' | 'NORMAL';
        code: string;
        price: number;
        detailJson?: object;
    }>
): Promise<RequestRecord | null> {
    // 1. 创建申请记录
    const targetCodes = quotes.map(q => q.code);
    const { data: record, error: recordError } = await supabase
        .from('b_request_record')
        .insert({
            type: 'pricing',
            sub_type: subType,
            target_codes: targetCodes,
            status: 'processing',
            shop_name: shopName,
            pricing_details: quotes.map(q => ({
                skc: q.code,
                appliedPrice: q.price,
                buyerPrice: null,
                status: '复核中',
                time: new Date().toISOString().split('T')[0]
            }))
        })
        .select()
        .single();

    if (recordError) {
        console.error('Error creating request record:', recordError);
        return null;
    }

    // 2. 创建关联的报价工单
    for (const quote of quotes) {
        await supabase
            .from('b_quote_order')
            .insert({
                request_id: record.id,
                quote_no: generateNo('QT'),
                shop_name: shopName,
                type: quote.type,
                skc_code: quote.type === 'NORMAL' ? quote.code : undefined,
                style_no: quote.type === 'WOOL' ? quote.code : undefined,
                total_price: quote.price,
                status: 0,
                detail_json: quote.detailJson
            });
    }

    return record;
}

// 创建同款同价申请
export async function createSamePriceRequest(
    shopName: string,
    items: Array<{
        targetCode: string;
        refCode: string;
        refPrice: string;
        suggestedPrice: string;
    }>
): Promise<RequestRecord | null> {
    const { data, error } = await supabase
        .from('b_request_record')
        .insert({
            type: 'pricing',
            sub_type: '同款同价',
            target_codes: items.map(i => i.targetCode),
            status: 'processing',
            shop_name: shopName,
            pricing_details: items.map(i => ({
                skc: i.targetCode,
                appliedPrice: parseFloat(i.suggestedPrice) || 0,
                buyerPrice: parseFloat(i.refPrice) || 0,
                status: '复核中',
                time: new Date().toISOString().split('T')[0],
                refCode: i.refCode
            }))
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating same price request:', error);
        return null;
    }
    return data;
}

// 创建申请涨价
export async function createPriceIncreaseRequest(
    shopName: string,
    items: Array<{
        targetCode: string;
        increasePrice: string;
    }>
): Promise<RequestRecord | null> {
    const { data, error } = await supabase
        .from('b_request_record')
        .insert({
            type: 'pricing',
            sub_type: '申请涨价',
            target_codes: items.map(i => i.targetCode),
            status: 'processing',
            shop_name: shopName,
            pricing_details: items.map(i => ({
                skc: i.targetCode,
                appliedPrice: parseFloat(i.increasePrice) || 0,
                buyerPrice: null,
                status: '复核中',
                time: new Date().toISOString().split('T')[0]
            }))
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating price increase request:', error);
        return null;
    }
    return data;
}

// 创建异常申请
export async function createAnomalyRequest(
    subType: string,
    targetCodes: string[],
    content?: string
): Promise<RequestRecord | null> {
    const { data, error } = await supabase
        .from('b_request_record')
        .insert({
            type: 'anomaly',
            sub_type: subType,
            target_codes: targetCodes,
            status: 'processing'
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating anomaly request:', error);
        return null;
    }
    return data;
}

// 提交二次核价申请
export async function submitSecondaryReview(
    recordId: string,
    skc: string,
    secondPrice: number,
    secondReason: string
): Promise<boolean> {
    // 获取当前记录
    const { data: record, error: fetchError } = await supabase
        .from('b_request_record')
        .select('pricing_details')
        .eq('id', recordId)
        .single();

    if (fetchError || !record) {
        console.error('Error fetching record:', fetchError);
        return false;
    }

    // 更新pricing_details中对应SKC的二次申请信息
    const details = record.pricing_details as PricingDetail[];
    const updatedDetails = details.map(d => {
        if (d.skc === skc) {
            return { ...d, secondPrice, secondReason, status: '复核中' as const };
        }
        return d;
    });

    const { error } = await supabase
        .from('b_request_record')
        .update({
            pricing_details: updatedDetails,
            updated_at: new Date().toISOString()
        })
        .eq('id', recordId);

    if (error) {
        console.error('Error submitting secondary review:', error);
        return false;
    }
    return true;
}
