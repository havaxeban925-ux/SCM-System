import React, { useState, useEffect } from 'react';
import { getHandlerAlias, getHandlerColor } from '../utils/handlerMapping';

interface StyleOrder {
    id: string;
    shop_name: string;
    style_name: string;
    image_url: string;
    sub_type: '改图帮看' | '打版帮看' | '上传SPU' | '商家要款'; // 问题8：新增商家要款
    submit_time: string;
    status: '待处理' | '已处理' | '已驳回';
    content?: string;
    spu_list?: string;
    source?: 'style_demand' | 'request'; // 来源
    handler_name?: string;
}

const StyleOrderPage: React.FC = () => {
    const [orders, setOrders] = useState<StyleOrder[]>([]);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

                // 获取款式需求数据
                const res = await fetch(`${API_BASE}/api/admin/styles?pageSize=100`);
                if (!res.ok) throw new Error('Failed to fetch style orders');
                const data = await res.json();

                const mappedOrders: StyleOrder[] = (data.data || []).map((item: any) => ({
                    id: item.id,
                    shop_name: item.shop_name || '未知店铺',
                    style_name: item.name || '未命名款式',
                    image_url: item.image_url || 'https://via.placeholder.com/100',
                    sub_type: item.sub_type || (item.push_type === 'POOL' ? '上传SPU' : '商家要款'),
                    submit_time: item.created_at ? new Date(item.created_at).toLocaleString() : '',
                    status: item.status === 'new' || item.status === 'locked' ? '待处理' :
                        item.status === 'abandoned' ? '已驳回' : '已处理',
                    content: item.remark,
                    spu_list: item.back_spu,
                    source: 'style_demand' as const,
                    handler_name: item.handler_name
                }));

                // 问题8：同时获取requests表中的款式类申请（商家要款）
                const reqRes = await fetch(`${API_BASE}/api/requests?type=style`);
                if (reqRes.ok) {
                    const reqData = await reqRes.json();
                    const styleRequests: StyleOrder[] = (reqData.data || []).map((item: any) => ({
                        id: item.id,
                        shop_name: item.shop_name || '未知店铺',
                        style_name: item.order_no || '商家要款',
                        image_url: item.image_urls?.[0] || 'https://via.placeholder.com/100',
                        sub_type: (item.sub_type || '商家要款') as StyleOrder['sub_type'],
                        submit_time: item.submit_time ? new Date(item.submit_time).toLocaleString() : '',
                        status: item.status === 'processing' ? '待处理' :
                            item.status === 'rejected' ? '已驳回' : '已处理',
                        content: item.pricing_details?.[0]?.remark,
                        source: 'request' as const,
                        handler_name: item.handler_name
                    }));
                    mappedOrders.push(...styleRequests);
                }

                setOrders(mappedOrders);
            } catch (error) {
                console.error('Error fetching style orders:', error);
            }
        };

        fetchOrders();
    }, []);

    const [detailModal, setDetailModal] = useState<{ show: boolean; order: StyleOrder | null }>({ show: false, order: null });
    const [filter, setFilter] = useState<'all' | '改图帮看' | '打版帮看' | '上传SPU' | '商家要款'>('all'); // 问题8
    const [buyerRemark, setBuyerRemark] = useState(''); // 新需求2：买手备注

    // 新需求2：提交买手备注
    const handleSubmitRemark = async () => {
        if (!detailModal.order) return;
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            const res = await fetch(`${API_BASE}/api/requests/${detailModal.order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ buyer_remark: buyerRemark })
            });
            if (!res.ok) throw new Error('提交失败');
            alert('备注已提交');
            setDetailModal({ show: false, order: null });
            setBuyerRemark('');
        } catch (err) {
            alert('提交失败，请重试');
        }
    };

    const filteredOrders = orders.filter(o => filter === 'all' || o.sub_type === filter);

    // 问题12修复：处理工单时调用API更新状态
    const handleProcess = async (id: string) => {
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            const res = await fetch(`${API_BASE}/api/admin/styles/${id}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('确认失败');
            setOrders(orders.map(o => o.id === id ? { ...o, status: '已处理' as const } : o));
            alert('已确认，SPU已归入库');
        } catch (err: any) {
            console.error('Confirm error:', err);
            alert('处理失败，请重试');
        }
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
            case '商家要款': return { bg: '#fce7f3', color: '#9d174d' }; // 问题8：新增
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
                        {/* 问题8：新增商家要款 Tab */}
                        <button className={`tab ${filter === '商家要款' ? 'active' : ''}`} onClick={() => setFilter('商家要款')}>
                            商家要款 ({orders.filter(o => o.sub_type === '商家要款').length})
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
                            <th>Handler</th>
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
                                    <span className={`status-badge ${order.status === '已处理' ? 'completed' : order.status === '已驳回' ? 'rejected' : 'processing'}`}>
                                        {/* 新需求1：根据sub_type显示状态 */}
                                        {order.status === '待处理' && order.sub_type === '改图帮看' ? '改图帮看中' :
                                            order.status === '待处理' && order.sub_type === '打版帮看' ? '打版帮看中' :
                                                order.status === '待处理' && order.spu_list ? '待确认SPU' :
                                                    order.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        {/* 新需求3：SPU确认按钮 */}
                                        {order.status === '待处理' && order.spu_list && (
                                            <button className="btn btn-sm btn-success" onClick={() => handleProcess(order.id)}>
                                                确认
                                            </button>
                                        )}
                                        {order.status === '待处理' && !order.spu_list && (
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

                            {/* 新需求2：买手备注输入 */}
                            <div className="detail-section">
                                <h4>买手备注</h4>
                                <textarea
                                    value={buyerRemark}
                                    onChange={(e) => setBuyerRemark(e.target.value)}
                                    placeholder="请输入买手备注..."
                                    style={{
                                        width: '100%',
                                        minHeight: '80px',
                                        padding: '8px',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={handleSubmitRemark}>
                                提交备注
                            </button>
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
