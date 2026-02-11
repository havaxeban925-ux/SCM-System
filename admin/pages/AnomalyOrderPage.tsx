import React, { useState, useEffect } from 'react';
import { updateRequestUrgentStatus } from '../../services/requestService';
import { getHandlerAlias, getHandlerColor } from '../utils/handlerMapping';
import { API_BASE } from '../lib/api';

interface AnomalyOrder {
    id: string;
    shop_name: string;
    sub_type: '新增尺码' | '修改尺码' | '人台误判' | '换图误判' | '申请下架' | '其他';
    category: '尺码问题' | '图片异常' | '其他';
    target_codes: string[];
    submit_time: string;
    status: '待处理' | '已处理' | '已驳回';
    content?: string;
    is_urgent?: boolean;
    handler_name?: string;
}

const AnomalyOrderPage: React.FC = () => {
    const [orders, setOrders] = useState<AnomalyOrder[]>([]);

    const deriveCategory = (subType: string) => {
        if (subType === '申请下架') return '申请下架'; // 新增：明确申请下架
        if (subType?.includes('尺码')) return '尺码问题';
        if (subType?.includes('误判') || subType?.includes('图')) return '图片异常';
        return '大货异常'; // Default to '大货异常' for others (like '大货异常')
    };

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                // const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
                const res = await fetch(`${API_BASE}/api/requests?type=anomaly&pageSize=100`);
                if (!res.ok) throw new Error('Failed to fetch anomaly orders');
                const data = await res.json();

                const mappedOrders: AnomalyOrder[] = (data.data || []).map((item: any) => ({
                    id: item.id,
                    shop_name: item.shop_name || '未知店铺',
                    sub_type: item.sub_type,
                    category: deriveCategory(item.sub_type),
                    target_codes: item.target_codes || [],
                    submit_time: item.submit_time ? new Date(item.submit_time).toLocaleString() : '',
                    status: item.status === 'processing' ? '待处理' :
                        (item.status === 'completed' || item.status === 'approved') ? '已处理' :
                            item.status === 'rejected' ? '已驳回' : '待处理',
                    content: item.remark || (item.pricing_details?.[0]?.content), // 兼容取值
                    is_urgent: item.is_urgent,
                    handler_name: item.handler_name
                }));
                setOrders(mappedOrders);
            } catch (error) {
                console.error('Error fetching anomaly orders:', error);
            }
        };

        fetchOrders();
    }, []);

    const [filter, setFilter] = useState<'all' | '尺码问题' | '图片异常' | '其他'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | '待处理' | '已处理' | '已驳回'>('all');
    const [detailModal, setDetailModal] = useState<{ show: boolean; order: AnomalyOrder | null }>({ show: false, order: null });

    const filteredOrders = orders.filter(o => {
        const categoryMatch = filter === 'all' || o.category === filter;
        const statusMatch = statusFilter === 'all' || o.status === statusFilter;
        return categoryMatch && statusMatch;
    });

    const handleProcess = async (id: string) => {
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
            await fetch(`${API_BASE}/api/requests/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' }),
            });
            setOrders(orders.map(o => o.id === id ? { ...o, status: '已处理' as const } : o));
            alert('已处理');
        } catch (err) {
            console.error('Failed to process:', err);
            alert('操作失败');
        }
    };

    const handleReject = (id: string) => {
        if (!confirm('确定驳回该工单？')) return;
        setOrders(orders.map(o => o.id === id ? { ...o, status: '已驳回' as const } : o));
        alert('已驳回');
    };

    // 切换加急状态
    const handleToggleUrgent = async (id: string, currentStatus: boolean) => {
        const success = await updateRequestUrgentStatus(id, !currentStatus);
        if (success) {
            setOrders(orders.map(o => o.id === id ? { ...o, is_urgent: !currentStatus } : o));
        } else {
            alert('操作失败');
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case '尺码问题': return { bg: '#dbeafe', color: '#1e40af' };
            case '图片异常': return { bg: '#fef3c7', color: '#92400e' };
            case '其他': return { bg: '#f3f4f6', color: '#374151' };
            default: return { bg: '#f3f4f6', color: '#374151' };
        }
    };

    const getSubTypeColor = (subType: string) => {
        switch (subType) {
            case '新增尺码': return { bg: '#dbeafe', color: '#1e40af' };
            case '修改尺码': return { bg: '#e0e7ff', color: '#3730a3' };
            case '人台误判': return { bg: '#fef3c7', color: '#92400e' };
            case '换图误判': return { bg: '#fed7aa', color: '#9a3412' };
            case '申请下架': return { bg: '#fee2e2', color: '#991b1b' };
            default: return { bg: '#f3f4f6', color: '#374151' };
        }
    };

    return (
        <div className="order-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">异常工单</h1>
                    <p className="page-subtitle">处理尺码问题、图片异常、申请下架等异常情况</p>
                </div>
            </div>

            <div className="card">
                <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>类型:</span>
                        <div className="tabs" style={{ display: 'inline-flex' }}>
                            <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>全部</button>
                            <button className={`tab ${filter === '尺码问题' ? 'active' : ''}`} onClick={() => setFilter('尺码问题')}>尺码问题</button>
                            <button className={`tab ${filter === '图片异常' ? 'active' : ''}`} onClick={() => setFilter('图片异常')}>图片异常</button>
                            <button className={`tab ${filter === '其他' ? 'active' : ''}`} onClick={() => setFilter('其他')}>其他</button>
                        </div>
                    </div>
                    <div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>状态:</span>
                        <div className="tabs" style={{ display: 'inline-flex' }}>
                            <button className={`tab ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>全部</button>
                            <button className={`tab ${statusFilter === '待处理' ? 'active' : ''}`} onClick={() => setStatusFilter('待处理')}>待处理</button>
                            <button className={`tab ${statusFilter === '已处理' ? 'active' : ''}`} onClick={() => setStatusFilter('已处理')}>已处理</button>
                            <button className={`tab ${statusFilter === '已驳回' ? 'active' : ''}`} onClick={() => setStatusFilter('已驳回')}>已驳回</button>
                        </div>
                    </div>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>店铺</th>
                            <th>一级类型</th>
                            <th>二级类型</th>
                            <th>关联编码/运单号</th>
                            <th>提交时间</th>
                            <th>处理人</th>
                            <th>状态</th>
                            <th style={{ width: 280, textAlign: 'right' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order.id}>
                                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{order.shop_name}</td>
                                <td>
                                    <span style={{
                                        ...getCategoryColor(order.category),
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        fontSize: 11
                                    }}>
                                        {order.category}
                                    </span>
                                </td>
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
                                        {order.target_codes.map((code, idx) => (
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
                                        <button
                                            className={`btn btn-sm ${order.is_urgent ? 'btn-danger' : 'btn-secondary'}`}
                                            style={{ minWidth: 60 }}
                                            onClick={() => handleToggleUrgent(order.id, !!order.is_urgent)}
                                        >
                                            {order.is_urgent ? '取消加急' : '加急'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div >

            {/* 详情弹窗 */}
            {
                detailModal.show && detailModal.order && (
                    <div className="modal-overlay" onClick={() => setDetailModal({ show: false, order: null })}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <span className="modal-title">异常工单详情</span>
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
                                        <label>一级类型</label>
                                        <span>{detailModal.order.category}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>二级类型</label>
                                        <span>{detailModal.order.sub_type}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>提交时间</label>
                                        <span>{detailModal.order.submit_time}</span>
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <h4>关联编码</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {detailModal.order.target_codes.map((code, idx) => (
                                            <span key={idx} className="spu-tag">{code}</span>
                                        ))}
                                    </div>
                                </div>

                                {detailModal.order.content && (
                                    <div className="detail-section">
                                        <h4>问题描述</h4>
                                        <p style={{ margin: 0, fontSize: 14 }}>{detailModal.order.content}</p>
                                    </div>
                                )}

                                <div className="detail-section">
                                    <h4>处理备注</h4>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="输入处理备注..."
                                        style={{ minHeight: 80 }}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline" onClick={() => setDetailModal({ show: false, order: null })}>
                                    关闭
                                </button>
                                {detailModal.order.status === '待处理' && (
                                    <>
                                        <button className="btn btn-danger" onClick={() => { handleReject(detailModal.order!.id); setDetailModal({ show: false, order: null }); }}>
                                            驳回
                                        </button>
                                        <button className="btn btn-primary" onClick={() => { handleProcess(detailModal.order!.id); setDetailModal({ show: false, order: null }); }}>
                                            确认处理
                                        </button>
                                    </>
                                )}
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
            `}</style>
        </div >
    );
};

export default AnomalyOrderPage;
