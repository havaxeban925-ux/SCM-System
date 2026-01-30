import React, { useState, useEffect } from 'react';

interface BulkOrder {
    id: string;
    shop_name: string;
    sub_type: '申请样衣' | '样衣来回' | '付款确认' | '尾款结算' | '物流跟踪';
    skc_codes: string[];
    submit_time: string;
    status: '待处理' | '进行中' | '已完成';
    amount?: number;
    tracking_no?: string;
    remark?: string;
}

const BulkOrderPage: React.FC = () => {
    const [orders, setOrders] = useState<BulkOrder[]>([]);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
                const res = await fetch(`${API_BASE}/api/admin/restock?pageSize=100`);
                if (!res.ok) throw new Error('Failed to fetch bulk orders');
                const data = await res.json();

                const mappedOrders: BulkOrder[] = (data.data || []).map((item: any) => ({
                    id: item.id,
                    shop_name: item.shop_name || '未知店铺',
                    // 如果 DB 无 sub_type，默认为 '尾款结算' 或根据其他字段判断
                    sub_type: item.sub_type || '尾款结算',
                    skc_codes: item.skc_code ? [item.skc_code] : [], // Restock order often has 1 skc?
                    submit_time: item.created_at ? new Date(item.created_at).toLocaleString() : '',
                    status: item.status === 'pending' ? '待处理' :
                        item.status === 'processing' ? '进行中' :
                            item.status === 'completed' ? '已完成' : '待处理',
                    amount: item.amount || item.actual_quantity * 100, // Mock amount calculation if missing
                    tracking_no: item.tracking_no,
                    remark: item.remark
                }));
                setOrders(mappedOrders);
            } catch (error) {
                console.error('Error fetching bulk orders:', error);
            }
        };

        fetchOrders();
    }, []);

    const [filter, setFilter] = useState<'all' | '申请样衣' | '样衣来回' | '付款确认' | '尾款结算' | '物流跟踪'>('all');
    const [detailModal, setDetailModal] = useState<{ show: boolean; order: BulkOrder | null }>({ show: false, order: null });

    const filteredOrders = orders.filter(o => filter === 'all' || o.sub_type === filter);

    const handleProcess = (id: string) => {
        setOrders(orders.map(o => o.id === id ? { ...o, status: '进行中' as const } : o));
        alert('已开始处理');
    };

    const handleComplete = (id: string) => {
        setOrders(orders.map(o => o.id === id ? { ...o, status: '已完成' as const } : o));
        alert('已完成');
    };

    const getSubTypeColor = (subType: string) => {
        switch (subType) {
            case '申请样衣': return { bg: '#dbeafe', color: '#1e40af' };
            case '样衣来回': return { bg: '#fef3c7', color: '#92400e' };
            case '付款确认': return { bg: '#d1fae5', color: '#065f46' };
            case '尾款结算': return { bg: '#fee2e2', color: '#991b1b' };
            case '物流跟踪': return { bg: '#e0e7ff', color: '#3730a3' };
            default: return { bg: '#f3f4f6', color: '#374151' };
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case '待处理': return 'processing';
            case '进行中': return 'developing';
            case '已完成': return 'completed';
            default: return 'processing';
        }
    };

    return (
        <div className="order-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">大货工单</h1>
                    <p className="page-subtitle">处理样衣申请、物流跟踪、付款结算等大货相关事宜</p>
                </div>
            </div>

            <div className="card">
                <div className="filter-bar">
                    <div className="tabs">
                        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                            全部 ({orders.length})
                        </button>
                        <button className={`tab ${filter === '申请样衣' ? 'active' : ''}`} onClick={() => setFilter('申请样衣')}>
                            申请样衣
                        </button>
                        <button className={`tab ${filter === '样衣来回' ? 'active' : ''}`} onClick={() => setFilter('样衣来回')}>
                            样衣来回
                        </button>
                        <button className={`tab ${filter === '付款确认' ? 'active' : ''}`} onClick={() => setFilter('付款确认')}>
                            付款确认
                        </button>
                        <button className={`tab ${filter === '尾款结算' ? 'active' : ''}`} onClick={() => setFilter('尾款结算')}>
                            尾款结算
                        </button>
                        <button className={`tab ${filter === '物流跟踪' ? 'active' : ''}`} onClick={() => setFilter('物流跟踪')}>
                            物流跟踪
                        </button>
                    </div>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>店铺</th>
                            <th>工单类型</th>
                            <th>SKC编码</th>
                            <th>金额/物流</th>
                            <th>提交时间</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order.id}>
                                <td style={{ fontWeight: 500 }}>{order.shop_name}</td>
                                <td>
                                    <span style={{
                                        padding: '3px 8px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        ...getSubTypeColor(order.sub_type)
                                    }}>
                                        {order.sub_type}
                                    </span>
                                </td>
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
                                <td>
                                    {order.amount && <span style={{ color: 'var(--primary)', fontWeight: 600 }}>¥{order.amount.toLocaleString()}</span>}
                                    {order.tracking_no && <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{order.tracking_no}</span>}
                                    {!order.amount && !order.tracking_no && <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.submit_time}</td>
                                <td>
                                    <span className={`status-badge ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        {order.status === '待处理' && (
                                            <button className="btn btn-sm btn-primary" onClick={() => handleProcess(order.id)}>
                                                处理
                                            </button>
                                        )}
                                        {order.status === '进行中' && (
                                            <button className="btn btn-sm btn-success" onClick={() => handleComplete(order.id)}>
                                                完成
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
            {detailModal.show && detailModal.order && (
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
                                    <label>工单类型</label>
                                    <span>{detailModal.order.sub_type}</span>
                                </div>
                                <div className="detail-item">
                                    <label>提交时间</label>
                                    <span>{detailModal.order.submit_time}</span>
                                </div>
                                <div className="detail-item">
                                    <label>当前状态</label>
                                    <span>{detailModal.order.status}</span>
                                </div>
                                {detailModal.order.amount && (
                                    <div className="detail-item">
                                        <label>涉及金额</label>
                                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>¥{detailModal.order.amount.toLocaleString()}</span>
                                    </div>
                                )}
                                {detailModal.order.tracking_no && (
                                    <div className="detail-item">
                                        <label>物流单号</label>
                                        <span style={{ fontFamily: 'monospace' }}>{detailModal.order.tracking_no}</span>
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

                            {detailModal.order.tracking_no && (
                                <div className="detail-section">
                                    <h4>物流信息</h4>
                                    <div className="logistics-timeline">
                                        <div className="timeline-item">
                                            <span className="timeline-time">2024-05-24 18:00</span>
                                            <span className="timeline-content">包裹已签收</span>
                                        </div>
                                        <div className="timeline-item">
                                            <span className="timeline-time">2024-05-24 10:30</span>
                                            <span className="timeline-content">派送中</span>
                                        </div>
                                        <div className="timeline-item">
                                            <span className="timeline-time">2024-05-23 22:00</span>
                                            <span className="timeline-content">到达目的地城市</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setDetailModal({ show: false, order: null })}>
                                关闭
                            </button>
                            {detailModal.order.status === '待处理' && (
                                <button className="btn btn-primary" onClick={() => { handleProcess(detailModal.order!.id); setDetailModal({ show: false, order: null }); }}>
                                    开始处理
                                </button>
                            )}
                            {detailModal.order.status === '进行中' && (
                                <button className="btn btn-success" onClick={() => { handleComplete(detailModal.order!.id); setDetailModal({ show: false, order: null }); }}>
                                    标记完成
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
