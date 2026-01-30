import React, { useState, useEffect } from 'react';

interface StyleOrder {
    id: string;
    shop_name: string;
    style_name: string;
    image_url: string;
    sub_type: '改图帮看' | '打版帮看' | '上传SPU';
    submit_time: string;
    status: '待处理' | '已处理' | '已驳回';
    content?: string;
    spu_list?: string;
}

const StyleOrderPage: React.FC = () => {
    const [orders, setOrders] = useState<StyleOrder[]>([]);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
                // 使用 /api/admin/styles 获取款式数据，这里假设款式工单就是 b_style_demand
                const res = await fetch(`${API_BASE}/api/admin/styles?pageSize=100`);
                if (!res.ok) throw new Error('Failed to fetch style orders');
                const data = await res.json();

                const mappedOrders: StyleOrder[] = (data.data || []).map((item: any) => ({
                    id: item.id,
                    shop_name: item.shop_name || '未知店铺',
                    style_name: item.name || '未命名款式',
                    image_url: item.image_url || 'https://via.placeholder.com/100',
                    // 如果 DB 没有 subtype，暂且根据 push_type 或者默认值
                    sub_type: item.push_type === 'POOL' ? '上传SPU' : '改图帮看',
                    submit_time: item.created_at ? new Date(item.created_at).toLocaleString() : '',
                    // status 映射: new -> 待处理, developing -> 已处理
                    status: item.status === 'new' || item.status === 'locked' ? '待处理' :
                        item.status === 'abandoned' ? '已驳回' : '已处理',
                    content: item.remark,
                    spu_list: item.back_spu
                }));
                setOrders(mappedOrders);
            } catch (error) {
                console.error('Error fetching style orders:', error);
            }
        };

        fetchOrders();
    }, []);

    const [detailModal, setDetailModal] = useState<{ show: boolean; order: StyleOrder | null }>({ show: false, order: null });
    const [filter, setFilter] = useState<'all' | '改图帮看' | '打版帮看' | '上传SPU'>('all');

    const filteredOrders = orders.filter(o => filter === 'all' || o.sub_type === filter);

    const handleProcess = (id: string) => {
        setOrders(orders.map(o => o.id === id ? { ...o, status: '已处理' as const } : o));
        alert('已处理');
    };

    const handleReject = (id: string) => {
        if (!confirm('确定驳回该工单？')) return;
        setOrders(orders.map(o => o.id === id ? { ...o, status: '已驳回' as const } : o));
        alert('已驳回');
    };

    const getSubTypeColor = (subType: string) => {
        switch (subType) {
            case '改图帮看': return { bg: '#fef3c7', color: '#92400e' };
            case '打版帮看': return { bg: '#dbeafe', color: '#1e40af' };
            case '上传SPU': return { bg: '#d1fae5', color: '#065f46' };
            default: return { bg: '#f3f4f6', color: '#374151' };
        }
    };

    return (
        <div className="order-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">款式工单</h1>
                    <p className="page-subtitle">处理商家改图帮看、打版帮看、上传SPU请求</p>
                </div>
            </div>

            <div className="card">
                <div className="filter-bar">
                    <div className="tabs">
                        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                            全部 ({orders.length})
                        </button>
                        <button className={`tab ${filter === '改图帮看' ? 'active' : ''}`} onClick={() => setFilter('改图帮看')}>
                            改图帮看
                        </button>
                        <button className={`tab ${filter === '打版帮看' ? 'active' : ''}`} onClick={() => setFilter('打版帮看')}>
                            打版帮看
                        </button>
                        <button className={`tab ${filter === '上传SPU' ? 'active' : ''}`} onClick={() => setFilter('上传SPU')}>
                            上传SPU
                        </button>
                    </div>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>图片</th>
                            <th>款式名称</th>
                            <th>店铺</th>
                            <th>工单类型</th>
                            <th>提交时间</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order.id}>
                                <td>
                                    <img src={order.image_url} alt="" className="style-image" />
                                </td>
                                <td style={{ fontWeight: 500 }}>{order.style_name}</td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{order.shop_name}</td>
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
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.submit_time}</td>
                                <td>
                                    <span className={`status-badge ${order.status === '已处理' ? 'completed' : order.status === '已驳回' ? 'rejected' : 'processing'}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        {order.status === '待处理' && (
                                            <>
                                                <button className="btn btn-sm btn-primary" onClick={() => handleProcess(order.id)}>
                                                    处理
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleReject(order.id)}>
                                                    驳回
                                                </button>
                                            </>
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
                            <span className="modal-title">工单详情</span>
                            <button className="btn-icon" onClick={() => setDetailModal({ show: false, order: null })}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                                <img src={detailModal.order.image_url} alt="" style={{ width: 100, height: 100, borderRadius: 8 }} />
                                <div>
                                    <h3 style={{ fontSize: 16, marginBottom: 8 }}>{detailModal.order.style_name}</h3>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>店铺：{detailModal.order.shop_name}</p>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>类型：{detailModal.order.sub_type}</p>
                                </div>
                            </div>

                            {detailModal.order.content && (
                                <div className="detail-section">
                                    <h4>申请内容</h4>
                                    <p>{detailModal.order.content}</p>
                                </div>
                            )}

                            {detailModal.order.spu_list && (
                                <div className="detail-section">
                                    <h4>SPU列表</h4>
                                    <div className="spu-tags">
                                        {detailModal.order.spu_list.split(' ').map((spu, idx) => (
                                            <span key={idx} className="spu-tag">{spu}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setDetailModal({ show: false, order: null })}>
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .order-page {
                    padding: 24px;
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
                .detail-section p {
                    font-size: 14px;
                    color: var(--text-primary);
                    margin: 0;
                }
                .spu-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
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

export default StyleOrderPage;
