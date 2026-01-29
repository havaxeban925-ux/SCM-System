import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface RequestRecord {
    id: string;
    type: string;
    sub_type: string;
    target_codes: string[];
    status: string;
    shop_name?: string;
    submit_time: string;
}

interface RestockOrder {
    id: string;
    skc_code: string;
    name?: string;
    plan_quantity: number;
    actual_quantity?: number;
    arrived_quantity: number;
    status: string;
}

interface StyleItem {
    id: string;
    name: string;
    image_url?: string;
    shop_name?: string;
    shop_id?: string;
    status: string;
    development_status?: string;
    back_spu?: string;
}

export type TabKey = 'style' | 'pricing' | 'anomaly' | 'restock';

interface RequestAuditProps {
    initialTab?: TabKey;
}

const RequestAudit: React.FC<RequestAuditProps> = ({ initialTab }) => {
    const [activeTab, setActiveTab] = useState<TabKey>(initialTab || 'pricing');

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    // Data States
    const [requests, setRequests] = useState<RequestRecord[]>([]);
    const [restockOrders, setRestockOrders] = useState<RestockOrder[]>([]);
    const [devStyles, setDevStyles] = useState<StyleItem[]>([]);

    // UI States
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Modals
    const [detailModal, setDetailModal] = useState<{ show: boolean; item: StyleItem | null }>({ show: false, item: null });
    const [buyerRemark, setBuyerRemark] = useState('');
    const [buyerImage, setBuyerImage] = useState('');

    const tabs = [
        { key: 'style', label: '款式工单', icon: 'design_services' },
        { key: 'pricing', label: '核价工单', icon: 'price_check' },
        { key: 'anomaly', label: '异常工单', icon: 'warning' },
        { key: 'restock', label: '大货工单', icon: 'inventory_2' },
    ];

    useEffect(() => {
        loadData();
    }, [activeTab]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'style') {
                const res = await api.get<{ data: StyleItem[] }>('/api/development');
                setDevStyles(res.data || []);
            } else if (activeTab === 'restock') {
                const res = await api.get<{ data: RestockOrder[] }>('/api/restock');
                setRestockOrders(res.data || []);
            } else {
                const res = await api.get<{ data: RequestRecord[] }>('/api/requests');
                const data = res.data || [];
                setRequests(data.filter(r =>
                    activeTab === 'pricing' ? r.type === 'pricing' : r.type === 'anomaly'
                ));
            }
        } catch (err) {
            console.error('Failed to load:', err);
        }
        setLoading(false);
    };

    const handleCopyAll = (codes: string[]) => {
        const text = codes.join(' ');
        navigator.clipboard.writeText(text);
        alert(`已复制 ${codes.length} 个编码`);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert(`已复制: ${text}`);
    };

    const handleSendFeedback = () => {
        alert(`反馈已发送给商家\n图片: ${buyerImage || '无'}\n备注: ${buyerRemark || '无'}`);
        setDetailModal({ show: false, item: null });
    };

    // Generic Filter Logic
    const filterItem = (item: any) => {
        // Status Filter
        if (statusFilter !== 'all') {
            const status = item.status || item.development_status;
            if (status !== statusFilter) return false;
        }

        // Search Filter
        const searchOpen = searchTerm.toLowerCase();
        if (!searchOpen) return true;

        if (activeTab === 'style') {
            return item.name.toLowerCase().includes(searchOpen) ||
                item.shop_id?.includes(searchOpen) ||
                item.back_spu?.toLowerCase().includes(searchOpen);
        } else if (activeTab === 'restock') {
            return item.skc_code.toLowerCase().includes(searchOpen) ||
                item.name?.toLowerCase().includes(searchOpen);
        } else {
            // pricing / anomaly
            return item.sub_type?.toLowerCase().includes(searchOpen) ||
                item.shop_name?.toLowerCase().includes(searchOpen) ||
                item.target_codes?.some((c: string) => c.toLowerCase().includes(searchOpen));
        }
    };

    const getDataList = () => {
        if (activeTab === 'style') return devStyles;
        if (activeTab === 'restock') return restockOrders;
        return requests;
    };

    const filteredList = getDataList().filter(filterItem);
    const totalItems = filteredList.length;
    const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const totalPages = Math.ceil(totalItems / pageSize);

    const getStatusBadge = (status: string) => (
        <span className={`status-badge ${status}`}>
            {status === 'processing' ? '处理中' : status === 'completed' ? '已完成' :
                status === 'drafting' ? '打版中' : status === 'helping' ? '待确认' :
                    status === 'ok' ? '已确认' : status}
        </span>
    );

    const Paginator = () => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>共 {totalItems} 条</span>
            <button
                className="btn btn-outline btn-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
            >
                上一页
            </button>
            <span style={{ fontSize: 13 }}>{currentPage} / {totalPages || 1}</span>
            <button
                className="btn btn-outline btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
            >
                下一页
            </button>
        </div>
    );

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">申请审批</h1>
                    <p className="page-subtitle">审批商家提交的各类申请</p>
                </div>
            </div>

            <div className="tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => { setActiveTab(tab.key as TabKey); setSearchTerm(''); setStatusFilter('all'); }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="card">
                {/* Unified Toolbar */}
                <div className="filter-bar">
                    <div className="search-box">
                        <span className="material-symbols-outlined">search</span>
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="搜索..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: 36 }}
                        />
                    </div>
                    <select
                        className="filter-select"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="all">全部状态</option>
                        <option value="processing">处理中</option>
                        <option value="completed">已完成/已确认</option>
                        <option value="helping">待确认</option>
                        {/* Add more statuses as needed */}
                    </select>
                </div>

                {loading ? (
                    <div className="empty-state">加载中...</div>
                ) : paginatedList.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-symbols-outlined">inbox</span>
                        <p>暂无数据</p>
                    </div>
                ) : (
                    <>
                        <table className="data-table">
                            <thead>
                                {activeTab === 'style' && (
                                    <tr>
                                        <th>款式名称</th>
                                        <th>商家ID</th>
                                        <th>SPU</th>
                                        <th>开发状态</th>
                                        <th>操作</th>
                                    </tr>
                                )}
                                {(activeTab === 'pricing' || activeTab === 'anomaly') && (
                                    <tr>
                                        <th>申请类型</th>
                                        <th>关联编码</th>
                                        <th>商家</th>
                                        <th>提交时间</th>
                                        <th>状态</th>
                                        <th>操作</th>
                                    </tr>
                                )}
                                {activeTab === 'restock' && (
                                    <tr>
                                        <th>SKC</th>
                                        <th>款式名称</th>
                                        <th>计划/实际</th>
                                        <th>已入仓</th>
                                        <th>状态</th>
                                        <th>操作</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {paginatedList.map((item: any) => (
                                    <tr key={item.id}>
                                        {activeTab === 'style' && <>
                                            <td>{item.name}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.shop_id?.slice(0, 8) || '-'}</td>
                                            <td>
                                                {item.back_spu ? (
                                                    <>
                                                        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.back_spu}</span>
                                                        <button className="copy-btn" onClick={() => handleCopy(item.back_spu!)}>复制</button>
                                                    </>
                                                ) : '-'}
                                            </td>
                                            <td>{getStatusBadge(item.development_status || 'drafting')}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    {item.development_status === 'helping' && (
                                                        <button className="btn btn-sm btn-success" onClick={() => api.post(`/api/development/${item.id}/confirm-ok`).then(loadData)}>确认通过</button>
                                                    )}
                                                    <button className="btn btn-sm btn-outline" onClick={() => setDetailModal({ show: true, item: item })}>查看详情</button>
                                                </div>
                                            </td>
                                        </>}

                                        {(activeTab === 'pricing' || activeTab === 'anomaly') && <>
                                            <td>{item.sub_type}</td>
                                            <td>
                                                {item.target_codes && item.target_codes.length > 0 ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        {item.target_codes.map((code: string, i: number) => (
                                                            <span key={i} style={{
                                                                background: '#f1f5f9',
                                                                padding: '2px 6px',
                                                                borderRadius: 4,
                                                                fontSize: 12,
                                                                fontFamily: 'monospace',
                                                                border: '1px solid #e2e8f0'
                                                            }}>
                                                                {code}
                                                            </span>
                                                        ))}
                                                        <button className="copy-btn" onClick={() => handleCopyAll(item.target_codes)}>一键复制</button>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td>{item.shop_name || '-'}</td>
                                            <td style={{ fontSize: 12 }}>{new Date(item.submit_time).toLocaleString()}</td>
                                            <td>{getStatusBadge(item.status)}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    {item.status === 'processing' && (
                                                        <>
                                                            <button className="btn btn-sm btn-success">通过</button>
                                                            <button className="btn btn-sm btn-danger">拒绝</button>
                                                        </>
                                                    )}
                                                    <button className="btn btn-sm btn-outline">详情</button>
                                                </div>
                                            </td>
                                        </>}

                                        {activeTab === 'restock' && <>
                                            <td>
                                                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.skc_code}</span>
                                                <button className="copy-btn" onClick={() => handleCopy(item.skc_code)}>复制</button>
                                            </td>
                                            <td>{item.name || '-'}</td>
                                            <td>{item.plan_quantity} / {item.actual_quantity ?? item.plan_quantity}</td>
                                            <td>{item.arrived_quantity}</td>
                                            <td>{getStatusBadge(item.status)}</td>
                                            <td>
                                                <button className="btn btn-sm btn-outline">详情</button>
                                            </td>
                                        </>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Paginator />
                    </>
                )}
            </div>

            {/* 详情弹窗 */}
            {detailModal.show && detailModal.item && (
                <div className="modal-overlay" onClick={() => setDetailModal({ show: false, item: null })}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">款式详情</span>
                            <button className="btn-icon" onClick={() => setDetailModal({ show: false, item: null })}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                                <img
                                    src={detailModal.item.image_url || 'https://via.placeholder.com/120'}
                                    alt=""
                                    style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'cover' }}
                                />
                                <div>
                                    <h3 style={{ fontSize: 16, marginBottom: 8 }}>{detailModal.item.name}</h3>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>商家: {detailModal.item.shop_name}</p>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>SPU: {detailModal.item.back_spu || '未上传'}</p>
                                </div>
                            </div>
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />
                            <h4 style={{ fontSize: 14, marginBottom: 12 }}>📤 买手反馈</h4>
                            <div className="form-group">
                                <label className="form-label">上传图片</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="输入图片URL"
                                    value={buyerImage}
                                    onChange={e => setBuyerImage(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">备注信息</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="输入反馈备注"
                                    value={buyerRemark}
                                    onChange={e => setBuyerRemark(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setDetailModal({ show: false, item: null })}>
                                关闭
                            </button>
                            <button className="btn btn-primary" onClick={handleSendFeedback}>
                                推送给商家
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestAudit;
