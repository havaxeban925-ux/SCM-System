import React, { useState, useEffect } from 'react';

interface PricingOrder {
    id: string;
    shop_name: string;
    sub_type: '同款同价' | '申请涨价' | '毛织类核价' | '非毛织类核价';
    skc_codes: string[];
    submit_time: string;
    status: '未处理' | '处理中' | '已处理' | '待复核';
    applied_price?: number;
    audited_price?: number;
    review_price?: number; // 复核价格
}

const PricingOrderPage: React.FC = () => {
    const [orders, setOrders] = useState<PricingOrder[]>([]);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
                const res = await fetch(`${API_BASE}/api/requests?type=pricing&pageSize=100`);
                if (!res.ok) throw new Error('Failed to fetch pricing orders');
                const data = await res.json();

                const mappedOrders: PricingOrder[] = (data.data || []).map((item: any) => {
                    const detail = item.pricing_details?.[0] || {};
                    return {
                        id: item.id,
                        shop_name: item.shop_name || '未知店铺',
                        sub_type: item.sub_type,
                        skc_codes: item.target_codes || [],
                        submit_time: item.submit_time ? new Date(item.submit_time).toLocaleString() : '',
                        status: item.status === 'processing' ? '处理中' :
                            item.status === 'completed' ? '已处理' :
                                item.status === 'rejected' ? '已处理' : '未处理', // Map 'approved'/'rejected' to '已处理' or keep statuses? UI uses: 未处理, 处理中, 已处理, 待复核
                        applied_price: detail.appliedPrice || 0,
                        audited_price: detail.buyerPrice,
                        review_price: detail.secondPrice
                    };
                });
                setOrders(mappedOrders);
            } catch (error) {
                console.error('Error fetching pricing orders:', error);
            }
        };

        fetchOrders();
    }, []);

    const [filter, setFilter] = useState<'all' | '未处理' | '处理中' | '已处理' | '待复核'>('all');
    const [detailModal, setDetailModal] = useState<{ show: boolean; order: PricingOrder | null }>({ show: false, order: null });
    const [reviewModal, setReviewModal] = useState<{ show: boolean; order: PricingOrder | null }>({ show: false, order: null });
    const [reviewPrice, setReviewPrice] = useState('');

    const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter);

    // 点击处理 -> 状态变为处理中
    const handleProcess = (id: string) => {
        setOrders(orders.map(o => o.id === id ? { ...o, status: '处理中' as const } : o));
        alert('已开始处理，状态变为"处理中"');
    };

    // 初核/复核 -> 状态变为已处理
    const handleInitialReview = (id: string) => {
        const order = orders.find(o => o.id === id);
        if (order?.status === '待复核') {
            setReviewModal({ show: true, order });
        } else {
            setOrders(orders.map(o => o.id === id ? { ...o, status: '已处理' as const } : o));
            alert('初核完成，状态变为"已处理"');
        }
    };

    // 提交复核价格
    const handleSubmitReview = () => {
        if (!reviewPrice || !reviewModal.order) return;
        setOrders(orders.map(o =>
            o.id === reviewModal.order!.id
                ? { ...o, status: '已处理' as const, review_price: parseFloat(reviewPrice) }
                : o
        ));
        setReviewModal({ show: false, order: null });
        setReviewPrice('');
        alert('复核完成');
    };

    // 驳回
    const handleReject = (id: string) => {
        if (!confirm('确定驳回该工单？')) return;
        setOrders(orders.filter(o => o.id !== id));
        alert('已驳回');
    };

    // 一键导出未处理工单
    const handleExport = () => {
        const pending = orders.filter(o => o.status === '未处理');
        if (pending.length === 0) {
            alert('没有未处理的工单');
            return;
        }
        // 模拟导出
        const data = pending.map(o => ({
            id: o.id,
            shop_name: o.shop_name,
            sub_type: o.sub_type,
            skc_codes: o.skc_codes.join(' '),
            applied_price: o.applied_price
        }));
        console.log('导出数据:', data);

        // 导出后状态变为处理中
        setOrders(orders.map(o => o.status === '未处理' ? { ...o, status: '处理中' as const } : o));
        alert(`已导出 ${pending.length} 个工单，状态已变为"处理中"`);
    };

    // 一键导入核价师结果
    const handleImport = () => {
        // 模拟导入
        const processing = orders.filter(o => o.status === '处理中');
        if (processing.length === 0) {
            alert('没有处理中的工单');
            return;
        }
        setOrders(orders.map(o => o.status === '处理中' ? { ...o, status: '已处理' as const } : o));
        alert(`已导入 ${processing.length} 个工单的核价结果，状态已变为"已处理"`);
    };

    const getSubTypeColor = (subType: string) => {
        switch (subType) {
            case '毛织类核价': return { bg: '#fef3c7', color: '#92400e' };
            case '非毛织类核价': return { bg: '#dbeafe', color: '#1e40af' };
            case '同款同价': return { bg: '#d1fae5', color: '#065f46' };
            case '申请涨价': return { bg: '#fee2e2', color: '#991b1b' };
            default: return { bg: '#f3f4f6', color: '#374151' };
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case '未处理': return 'processing';
            case '处理中': return 'developing';
            case '已处理': return 'completed';
            case '待复核': return 'helping';
            default: return 'processing';
        }
    };

    return (
        <div className="order-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">核价工单</h1>
                    <p className="page-subtitle">处理同款同价、申请涨价、毛织类/非毛织类报价单</p>
                </div>
            </div>

            <div className="card">
                <div className="toolbar" style={{ marginBottom: 16 }}>
                    <button className="btn btn-primary" onClick={handleExport}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                        一键导出未处理工单
                    </button>
                    <button className="btn btn-success" onClick={handleImport}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload</span>
                        一键导入核价师结果
                    </button>
                </div>

                <div className="filter-bar">
                    <div className="tabs">
                        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                            全部 ({orders.length})
                        </button>
                        <button className={`tab ${filter === '未处理' ? 'active' : ''}`} onClick={() => setFilter('未处理')}>
                            未处理 ({orders.filter(o => o.status === '未处理').length})
                        </button>
                        <button className={`tab ${filter === '处理中' ? 'active' : ''}`} onClick={() => setFilter('处理中')}>
                            处理中 ({orders.filter(o => o.status === '处理中').length})
                        </button>
                        <button className={`tab ${filter === '待复核' ? 'active' : ''}`} onClick={() => setFilter('待复核')}>
                            待复核 ({orders.filter(o => o.status === '待复核').length})
                        </button>
                        <button className={`tab ${filter === '已处理' ? 'active' : ''}`} onClick={() => setFilter('已处理')}>
                            已处理 ({orders.filter(o => o.status === '已处理').length})
                        </button>
                    </div>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>店铺</th>
                            <th>工单类型</th>
                            <th>SKC编码</th>
                            <th>申请价格</th>
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
                                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>¥{order.applied_price}</td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.submit_time}</td>
                                <td>
                                    <span className={`status-badge ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        {order.status === '未处理' && (
                                            <button className="btn btn-sm btn-primary" onClick={() => handleProcess(order.id)}>
                                                处理
                                            </button>
                                        )}
                                        {(order.status === '处理中' || order.status === '待复核') && (
                                            <button className="btn btn-sm btn-success" onClick={() => handleInitialReview(order.id)}>
                                                {order.status === '待复核' ? '复核' : '初核'}
                                            </button>
                                        )}
                                        {order.status !== '已处理' && (
                                            <button className="btn btn-sm btn-danger" onClick={() => handleReject(order.id)}>
                                                驳回
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
                            <span className="modal-title">核价工单详情</span>
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
                                    <label>申请价格</label>
                                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>¥{detailModal.order.applied_price}</span>
                                </div>
                                {detailModal.order.audited_price && (
                                    <div className="detail-item">
                                        <label>核价价格</label>
                                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>¥{detailModal.order.audited_price}</span>
                                    </div>
                                )}
                                {detailModal.order.review_price && (
                                    <div className="detail-item">
                                        <label>复核价格</label>
                                        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>¥{detailModal.order.review_price}</span>
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
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setDetailModal({ show: false, order: null })}>
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 复核弹窗 */}
            {reviewModal.show && reviewModal.order && (
                <div className="modal-overlay" onClick={() => setReviewModal({ show: false, order: null })}>
                    <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">输入复核价格</span>
                            <button className="btn-icon" onClick={() => setReviewModal({ show: false, order: null })}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">原核价价格</label>
                                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-muted)' }}>
                                    ¥{reviewModal.order.audited_price}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">复核价格</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="输入复核后的价格"
                                    value={reviewPrice}
                                    onChange={e => setReviewPrice(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setReviewModal({ show: false, order: null })}>
                                取消
                            </button>
                            <button className="btn btn-primary" onClick={handleSubmitReview}>
                                确认复核
                            </button>
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
            `}</style>
        </div>
    );
};

export default PricingOrderPage;
