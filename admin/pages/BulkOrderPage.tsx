import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { getHandlerAlias, getHandlerColor } from '../utils/handlerMapping';

interface BulkOrder {
    id: string;
    shop_name: string;
    skc_codes: string[];
    submit_time: string;
    status: '待接单' | '待复核' | '生产中' | '待入仓' | '已完成' | '已取消' | '已拒绝';
    plan_quantity: number;
    actual_quantity: number;
    wb_number?: string;
    remark?: string;
    is_urgent?: boolean;
    handler_name?: string;
}

const BulkOrderPage: React.FC = () => {
    const [orders, setOrders] = useState<BulkOrder[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ✅ Phase 1 优化: 数据刷新函数
    const refreshOrders = async () => {
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
            const res = await fetch(`${API_BASE}/api/admin/restock?pageSize=100`);
            if (!res.ok) throw new Error('Failed to fetch bulk orders');
            const data = await res.json();

            const mappedOrders: BulkOrder[] = (data.data || []).map((item: any) => {
                // Map DB status to UI status
                let status: BulkOrder['status'] = '待接单';
                switch (item.status) {
                    case 'pending': status = '待接单'; break;
                    case 'reviewing': status = '待复核'; break;
                    case 'producing': status = '生产中'; break;
                    case 'shipped': status = '待入仓'; break;
                    case 'completed': status = '已完成'; break;
                    case 'cancelled': status = '已取消'; break;
                    case 'rejected': status = '已拒绝'; break;
                    default: status = '待接单';
                }

                return {
                    id: item.id,
                    shop_name: item.shop_name || '未知店铺',
                    skc_codes: item.skc_code ? [item.skc_code] : [],
                    submit_time: item.created_at ? new Date(item.created_at).toLocaleString() : '',
                    status,
                    plan_quantity: item.plan_quantity || 0,
                    actual_quantity: item.actual_quantity ?? item.plan_quantity ?? 0,
                    wb_number: item.wb_number,
                    remark: item.remark || item.reduction_reason, // Show rejection/reduction reason if remark is empty
                    is_urgent: item.is_urgent || false,
                    handler_name: item.handler_name
                };
            });
            setOrders(mappedOrders);
        } catch (error) {
            console.error('Error refreshing bulk orders:', error);
        }
    };

    useEffect(() => {
        refreshOrders();

        // Load shops for selector
        const fetchShops = async () => {
            try {
                // Use the same API as ShopManage
                const res = await api.get<{ data: any[] }>('/api/admin/shops?pageSize=1000');
                const data = Array.isArray(res) ? res : (res.data || []);

                // Group by key_name (or key_id if name is missing)
                const groups: Record<string, { id: string; shop_name: string }[]> = {};

                // Build lookup map
                const map: Record<string, { id: string; shop_name: string }> = {};

                data.forEach((shop: any) => {
                    const key = shop.key_name || shop.key_id || 'Unknown';
                    if (!groups[key]) groups[key] = [];
                    groups[key].push({ id: shop.id, shop_name: shop.shop_name });

                    // Map keys: id, shop_name, shop_code (if valid), key_id (if 1-to-1 mostly?)
                    if (shop.id) map[shop.id.toLowerCase()] = shop;
                    if (shop.shop_name) map[shop.shop_name.toLowerCase()] = shop;
                    if (shop.shop_code) map[shop.shop_code.toLowerCase()] = shop;
                    // Careful with key_id, many shops might have same KEY.
                    // But if user puts "KEY1", maybe they mean the first shop of KEY1? Or ambiguous.
                    // Let's not map key_id to a specific shop to avoid ambiguity, 
                    // unless we want to default to the first one.
                });

                setAllShopsMap(map);

                setKeyList(Object.entries(groups).map(([key, shops]) => ({
                    key_id: key,
                    shops
                })));
            } catch (error) {
                console.error('Error fetching shops:', error);
            }
        };
        fetchShops();
    }, []);

    const [statusFilter, setStatusFilter] = useState<'all' | '待接单' | '待复核' | '生产中' | '待入仓' | '已完成' | '已取消' | '已拒绝'>('all');
    const [detailModal, setDetailModal] = useState<{ show: boolean; order: BulkOrder | null }>({ show: false, order: null });
    // 问题1：多KEY多店铺下单状态
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [orderSkc, setOrderSkc] = useState('');
    const [orderQty, setOrderQty] = useState('');
    // 问题1：店铺选择（改为KEY→店铺模式）
    const [keyList, setKeyList] = useState<{ key_id: string; shops: { id: string; shop_name: string }[] }[]>([]);
    const [selectedKey, setSelectedKey] = useState('');
    const [selectedShopId, setSelectedShopId] = useState('');
    // 问题1：订单列表包含店铺ID
    const [orderList, setOrderList] = useState<{ shopId: string; shopName: string; skc: string; qty: number }[]>([]);
    const [allShopsMap, setAllShopsMap] = useState<Record<string, { id: string; shop_name: string }>>({});

    const filteredOrders = orders.filter(o => {
        const statusMatch = statusFilter === 'all' || o.status === statusFilter;
        return statusMatch;
    });

    // Removed: handleProcess is no longer needed

    // Removed: handleComplete is no longer needed

    const getStatusColor = (status: string) => {
        switch (status) {
            case '待接单': return 'processing';
            case '待复核': return 'reviewing';
            case '生产中': return 'developing';
            case '待入仓': return 'shipping';
            case '已完成': return 'completed';
            case '已取消': return 'secondary'; // Use gray for cancelled
            case '已拒绝': return 'danger';
            default: return 'processing';
        }
    };


    // 问题1：添加到下单列表（包含店铺信息）
    const handleAddOrder = () => {
        if (!selectedKey) return alert('请先选择KEY');
        if (!selectedShopId) return alert('请选择店铺');
        if (!orderSkc.trim()) return alert('请输入SKC');
        if (!orderQty || parseInt(orderQty) <= 0) return alert('请输入有效数量');

        const keyItem = keyList.find(k => k.key_id === selectedKey);
        const shop = keyItem?.shops.find(s => s.id === selectedShopId);

        // Support space-separated SKCs
        const skcList = orderSkc.trim().split(/\s+/);
        const newOrders = skcList.map(skc => ({
            shopId: selectedShopId,
            shopName: shop?.shop_name || selectedShopId,
            skc: skc,
            qty: parseInt(orderQty)
        }));

        setOrderList([...orderList, ...newOrders]);
        setOrderSkc('');
        setOrderQty('');
    };

    // 问题1：提交下单（多店铺批量推送）
    const handleSubmitOrder = async () => {
        if (orderList.length === 0) return alert('请添加至少一个SKC');
        try {
            // 批量创建订单
            const batchOrders = orderList.map(item => ({
                shopId: item.shopId,
                skcCode: item.skc,
                name: item.skc,
                planQuantity: item.qty,
                remark: `批量下单 - ${item.shopName}`
            }));

            await api.post('/api/restock/batch', { orders: batchOrders });

            const shopCount = new Set(orderList.map(o => o.shopId)).size;
            const skcCount = orderList.length;

            alert(`下单成功！\n推送到 ${shopCount} 个店铺\n共 ${skcCount} 个SKC`);
            setOrderList([]);
            setSelectedKey('');
            setSelectedShopId('');
            setShowOrderForm(false);

            // ✅ Phase 1: 局部刷新
            await refreshOrders();
        } catch (err) {
            console.error('Order submission error:', err);
        }
    };

    const handleExportTemplate = () => {
        const headers = ['店铺ID', 'SKC编码', '计划数量', '备注'];
        const rows = [[
            'SHOP_A', // 使用存在的 Shop Code 或店铺名
            'SKC001',
            '100',
            '批量下单示例'
        ]];

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = '批量下单模板.csv';
        link.click();
    };

    // 辅助函数：尝试解析CSV内容
    const parseCSVContent = (content: string) => {
        const lines = content.split(/\r\n|\n|\r/).filter(line => line.trim());
        if (lines.length < 2) return null;

        // 尝试检测分隔符 (逗号, 分号, Tab)
        const headerLine = lines[0];
        let delimiter = ',';
        if (headerLine.includes('\t')) delimiter = '\t';
        else if (headerLine.includes(';')) delimiter = ';';

        const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^[\ufeff]/, '')); // 去除BOM

        // 关键列查找（支持中英文）
        const shopIdIndex = headers.findIndex(h => h.includes('店铺ID') || h.includes('店铺') || h.toLowerCase() === 'shopid');
        const skcIndex = headers.findIndex(h => h.includes('SKC') || h.toLowerCase() === 'skc');
        const qtyIndex = headers.findIndex(h => h.includes('数量') || h.includes('计划') || h.toLowerCase() === 'quantity');

        if (shopIdIndex === -1 || skcIndex === -1) return null;

        const items: { shopId: string; shopName: string; skc: string; qty: number }[] = [];

        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(delimiter).map(p => p.trim());
            // 允许空行，但如果行有内容则必须包含关键字段
            if (parts.length <= Math.max(shopIdIndex, skcIndex)) continue;

            const shopIdFromFile = parts[shopIdIndex];
            const skc = parts[skcIndex];
            // 数量处理：如果列不存在或为空，默认为100；尝试解析数字
            let qty = 100;
            if (qtyIndex !== -1 && parts[qtyIndex]) {
                const parsed = parseInt(parts[qtyIndex]);
                if (!isNaN(parsed)) qty = parsed;
            }

            if (shopIdFromFile && skc) {
                // 尝试匹配真实店铺ID
                // 匹配顺序: ID完全匹配 -> ShopCode(如SHOP_A) -> ShopName(如春秋) -> KeyID(如KEY1)
                // 注意：allShopsMap 的 key 应该是全小写以便模糊匹配，但在构建时处理

                let realShopId = shopIdFromFile;
                let realShopName = shopIdFromFile;

                // 简单查找（假设 map key 是名为 literal 的）
                // 更好的方式是在这里遍历 allShopsMap 或构建更健壮的 lookup
                // 这里我们假设 allShopsMap key 包含 id, shop_code (lower), shop_name (lower), key_id (lower)

                const lookupKey = shopIdFromFile.trim().toLowerCase();
                if (allShopsMap[lookupKey]) {
                    realShopId = allShopsMap[lookupKey].id;
                    realShopName = allShopsMap[lookupKey].shop_name;
                }

                items.push({
                    shopId: realShopId,
                    shopName: realShopName,
                    skc: skc,
                    qty: qty
                });
            }
        }
        return items;
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const buffer = await file.arrayBuffer();

            // 策略1: 尝试 UTF-8
            let text = new TextDecoder('utf-8').decode(buffer);
            let result = parseCSVContent(text);

            // 策略2: 如果 UTF-8 解析失败（没找到表头），尝试 GBK
            if (!result) {
                console.log('UTF-8 parsing failed, trying GBK...');
                try {
                    text = new TextDecoder('gbk').decode(buffer);
                    result = parseCSVContent(text);
                } catch (e) {
                    console.warn('GBK decoding not supported or failed', e);
                }
            }

            // 策略3: 如果还不行，尝试 GB18030
            if (!result) {
                console.log('GBK parsing failed, trying GB18030...');
                try {
                    text = new TextDecoder('gb18030').decode(buffer);
                    result = parseCSVContent(text);
                } catch (e) {
                    console.warn('GB18030 decoding not supported or failed', e);
                }
            }

            if (!result) {
                alert('模板格式错误或编码不支持。\n请确保包含“店铺ID”和“SKC编码”列。\n支持 UTF-8 和 GBK 编码。');
                e.target.value = '';
                return;
            }

            if (result.length === 0) {
                alert('未能解析到有效数据，请检查文件内容');
                e.target.value = '';
                return;
            }

            // 检查是否有未匹配的店铺 (非 UUID 格式)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const invalidShops = result.filter(r => !uuidRegex.test(r.shopId));

            if (invalidShops.length > 0) {
                const msg = `无法识别以下店铺（请填写准确的店铺名、ShopCode 或 UUID）：\n` +
                    invalidShops.map(r => `${r.shopName}`).slice(0, 5).join(', ') +
                    (invalidShops.length > 5 ? '...等' : '');
                alert(msg);
                // 也可以选择过滤掉，或者让用户修改
                // 这里我们过滤掉无效的，避免提交报错
                result = result.filter(r => uuidRegex.test(r.shopId));
                if (result.length === 0) {
                    e.target.value = '';
                    return;
                }
            }

            setOrderList(prev => [...prev, ...result!]);
            alert(`成功导入 ${result.length} 条数据`);

        } catch (err) {
            console.error('Import error:', err);
            alert('导入失败，文件读取错误');
        }
        e.target.value = '';
    };


    return (
        <div className="order-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">大货管理</h1>
                    <p className="page-subtitle">处理样衣申请、物流跟踪、付款结算等大货相关事宜</p>
                </div>
                {/* 下单按钮 */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={() => setShowOrderForm(true)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>add</span>新建下单
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>状态:</span>
                        <div className="tabs" style={{ display: 'inline-flex' }}>
                            <button className={`tab ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>全部</button>
                            <button className={`tab ${statusFilter === '待接单' ? 'active' : ''}`} onClick={() => setStatusFilter('待接单')}>待接单</button>
                            <button className={`tab ${statusFilter === '待复核' ? 'active' : ''}`} onClick={() => setStatusFilter('待复核')}>待复核</button>
                            <button className={`tab ${statusFilter === '生产中' ? 'active' : ''}`} onClick={() => setStatusFilter('生产中')}>生产中</button>
                            <button className={`tab ${statusFilter === '待入仓' ? 'active' : ''}`} onClick={() => setStatusFilter('待入仓')}>待入仓</button>
                            <button className={`tab ${statusFilter === '已完成' ? 'active' : ''}`} onClick={() => setStatusFilter('已完成')}>已完成</button>
                            <button className={`tab ${statusFilter === '已取消' ? 'active' : ''}`} onClick={() => setStatusFilter('已取消')}>已取消</button>
                            <button className={`tab ${statusFilter === '已拒绝' ? 'active' : ''}`} onClick={() => setStatusFilter('已拒绝')}>已拒绝</button>
                        </div>
                    </div>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>店铺</th>
                            <th>SKC编码</th>
                            <th>计划数量</th>
                            <th>实际数量</th>
                            <th>入库(件)</th>
                            <th>运单号</th>
                            <th>Handler</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order.id}>
                                <td style={{ fontWeight: 500 }}>{order.shop_name}</td>
                                <td>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {order.skc_codes.map((code, idx) => (
                                            <span key={idx} style={{
                                                padding: '2px 6px',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: 4,
                                                fontSize: 11,
                                                fontFamily: 'monospace'
                                            }}>
                                                {code}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td style={{ fontWeight: 600 }}>{order.plan_quantity}</td>
                                <td style={{ fontWeight: 600, color: order.actual_quantity < order.plan_quantity ? 'var(--danger)' : 'inherit' }}>
                                    {order.actual_quantity}
                                    {order.actual_quantity < order.plan_quantity && <span style={{ fontSize: 10, marginLeft: 4 }}>(砍量)</span>}
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.submit_time}</td>
                                <td>{order.wb_number || '-'}</td>
                                <td>
                                    {order.handler_name && (
                                        <div style={{
                                            ...getHandlerColor(order.handler_name),
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 11,
                                            fontWeight: 600
                                        }} title={order.handler_name}>
                                            {getHandlerAlias(order.handler_name)}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <span className={`status-badge ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        {order.status === '待接单' && (
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                等待商家接单...
                                            </span>
                                        )}
                                        {order.status === '待复核' && (
                                            <>
                                                <button className="btn btn-sm btn-success" onClick={async () => {
                                                    try {
                                                        await api.post(`/api/restock/${order.id}/review`, { agree: true });
                                                        await refreshOrders();
                                                    } catch (e) { console.error(e); alert('操作失败'); }
                                                }}>
                                                    确认砍量
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={async () => {
                                                    try {
                                                        await api.post(`/api/restock/${order.id}/review`, { agree: false });
                                                        await refreshOrders();
                                                    } catch (e) { console.error(e); alert('操作失败'); }
                                                }}>
                                                    拒绝砍量
                                                </button>
                                            </>
                                        )}
                                        {order.status === '生产中' && (
                                            <span style={{ fontSize: 11, color: 'var(--primary)', fontStyle: 'italic' }}>
                                                商家生产中，等待发货...
                                            </span>
                                        )}
                                        {order.status === '待入仓' && (
                                            <button className="btn btn-sm btn-primary" onClick={async () => {
                                                await api.post(`/api/restock/${order.id}/arrival`);
                                                await refreshOrders();
                                            }}>
                                                确认入仓
                                            </button>
                                        )}
                                        {order.status === '已完成' && (
                                            <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
                                                ✓ 已完成
                                            </span>
                                        )}
                                        {order.status !== '已完成' && (
                                            <button
                                                className={`btn btn-sm ${order.is_urgent ? 'btn-danger' : 'btn-secondary'}`}
                                                style={{ minWidth: 55 }}
                                                onClick={async () => {
                                                    try {
                                                        await api.post(`/api/restock/${order.id}/urgent`, { is_urgent: !order.is_urgent });
                                                        window.location.reload();
                                                    } catch (e) { console.error(e); alert('操作失败'); }
                                                }}
                                            >
                                                {order.is_urgent ? '取消加急' : '加急'}
                                            </button>
                                        )}
                                        <button className="btn btn-sm btn-outline" onClick={() => setDetailModal({ show: true, order })}>
                                            详情
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 详情弹窗 */}
            {
                detailModal.show && detailModal.order && (
                    <div className="modal-overlay" onClick={() => setDetailModal({ show: false, order: null })}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <span className="modal-title">大货工单详情</span>
                                <button className="btn-icon" onClick={() => setDetailModal({ show: false, order: null })}>
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <label>店铺名称</label>
                                        <span>{detailModal.order.shop_name}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>计划数量</label>
                                        <span>{detailModal.order.plan_quantity}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>实际数量</label>
                                        <span style={{ color: detailModal.order.actual_quantity < detailModal.order.plan_quantity ? 'var(--danger)' : 'inherit' }}>
                                            {detailModal.order.actual_quantity}
                                            {detailModal.order.actual_quantity < detailModal.order.plan_quantity && ' (砍量)'}
                                        </span>
                                    </div>
                                    {detailModal.order.wb_number && (
                                        <div className="detail-item">
                                            <label>物流单号</label>
                                            <span style={{ fontFamily: 'monospace' }}>{detailModal.order.wb_number}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="detail-section">
                                    <h4>SKC编码</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {detailModal.order.skc_codes.map((code, idx) => (
                                            <span key={idx} className="spu-tag">{code}</span>
                                        ))}
                                    </div>
                                </div>

                                {detailModal.order.remark && (
                                    <div className="detail-section">
                                        <h4>备注</h4>
                                        <p style={{ margin: 0, fontSize: 14 }}>{detailModal.order.remark}</p>
                                    </div>
                                )}

                                {detailModal.order.wb_number && (
                                    <div className="detail-section">
                                        <h4>物流信息</h4>
                                        <p style={{ margin: 0, fontFamily: 'monospace' }}>物流单号: {detailModal.order.wb_number}</p>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline" onClick={() => setDetailModal({ show: false, order: null })}>
                                    关闭
                                </button>
                                {detailModal.order.status === '待复核' && (
                                    <>
                                        <button className="btn btn-success" onClick={async () => {
                                            await api.post(`/api/restock/${detailModal.order!.id}/review`, { agree: true });
                                            setDetailModal({ show: false, order: null });
                                            await refreshOrders();
                                        }}>
                                            确认砍量
                                        </button>
                                        <button className="btn btn-danger" onClick={async () => {
                                            await api.post(`/api/restock/${detailModal.order!.id}/cancel-confirm`);
                                            setDetailModal({ show: false, order: null });
                                            await refreshOrders();
                                        }}>
                                            取消订单
                                        </button>
                                    </>
                                )}
                                {detailModal.order.status === '待入仓' && (
                                    <button className="btn btn-primary" onClick={async () => {
                                        await api.post(`/api/restock/${detailModal.order!.id}/arrival`);
                                        setDetailModal({ show: false, order: null });
                                        await refreshOrders();
                                    }}>
                                        确认入仓
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* 问题2：下单弹窗 */}
            {
                showOrderForm && (
                    <div className="modal-overlay" onClick={() => setShowOrderForm(false)}>
                        <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <span className="modal-title">新建大货下单</span>
                                <button className="btn-icon" onClick={() => setShowOrderForm(false)}>
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                {/* 问题1：KEY选择 */}
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>选择KEY *</label>
                                    <select
                                        className="form-input"
                                        value={selectedKey}
                                        onChange={e => { setSelectedKey(e.target.value); setSelectedShopId(''); }}
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 6 }}
                                    >
                                        <option value="">请选择KEY</option>
                                        {keyList.map(k => (
                                            <option key={k.key_id} value={k.key_id}>{k.key_id}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* 问题1：店铺选择（基于KEY） */}
                                {selectedKey && (
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ display: 'block', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>选择店铺 *</label>
                                        <select
                                            className="form-input"
                                            value={selectedShopId}
                                            onChange={e => setSelectedShopId(e.target.value)}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 6 }}
                                        >
                                            <option value="">请选择店铺</option>
                                            {keyList.find(k => k.key_id === selectedKey)?.shops.map(s => (
                                                <option key={s.id} value={s.id}>{s.shop_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>SKC</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="SKC编码"
                                            value={orderSkc}
                                            onChange={e => setOrderSkc(e.target.value)}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 6 }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>数量</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="数量"
                                            value={orderQty}
                                            onChange={e => setOrderQty(e.target.value)}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 6 }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 12 }}>
                                    <button className="btn btn-primary" onClick={handleAddOrder}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>add</span>添加
                                    </button>
                                    <button className="btn btn-outline" onClick={handleExportTemplate}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>download</span>下载模板
                                    </button>
                                    <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>upload</span>批量导入
                                    </button>
                                    <input type="file" ref={fileInputRef} hidden accept=".csv,.txt" onChange={handleImportExcel} />
                                </div>
                                {orderList.length > 0 && (
                                    <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 6 }}>
                                        <table className="data-table" style={{ fontSize: 12 }}>
                                            <thead><tr><th>店铺</th><th>SKC</th><th>数量</th><th></th></tr></thead>
                                            <tbody>
                                                {orderList.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ fontSize: 11 }}>{item.shopName}</td>
                                                        <td style={{ fontFamily: 'monospace' }}>{item.skc}</td>
                                                        <td>{item.qty}</td>
                                                        <td>
                                                            <button className="btn-icon" onClick={() => setOrderList(orderList.filter((_, i) => i !== idx))}>
                                                                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--danger)' }}>delete</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline" onClick={() => setShowOrderForm(false)}>取消</button>
                                <button className="btn btn-primary" onClick={handleSubmitOrder}>确认下单 ({orderList.length})</button>
                            </div>
                        </div>
                    </div>
                )
            }

            <style>{`
                .order-page {
                    padding: 24px;
                }
                .detail-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 16px;
                }
                .detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .detail-item label {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                .detail-item span {
                    font-size: 14px;
                    color: var(--text-primary);
                }
                .detail-section {
                    margin-bottom: 16px;
                    padding: 12px;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                }
                .detail-section h4 {
                    font-size: 13px;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                }
                .spu-tag {
                    padding: 4px 8px;
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 12px;
                }
                .logistics-timeline {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .timeline-item {
                    display: flex;
                    gap: 12px;
                    padding: 8px 0;
                    border-bottom: 1px solid var(--border-color);
                }
                .timeline-item:last-child {
                    border-bottom: none;
                }
                .timeline-time {
                    font-size: 12px;
                    color: var(--text-muted);
                    white-space: nowrap;
                }
                .timeline-content {
                    font-size: 13px;
                    color: var(--text-primary);
                }
            `}</style>
        </div>
    );
};

export default BulkOrderPage;
