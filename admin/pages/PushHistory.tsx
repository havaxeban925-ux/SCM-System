import React, { useState, useEffect } from 'react';
import { getHandlerAlias, getHandlerColor } from '../utils/handlerMapping';

interface PushRecord {
    id: string; // 使用第一条记录的ID
    link: string;
    image_url: string;
    style_name: string;
    push_type: 'private' | 'public';
    first_push_time: string;
    last_push_time: string;
    target_count: number;
    accepted_count: number;
    shops: Array<{
        id: string;
        name: string;
        key_id?: string;
        key_name?: string;
        shop_code?: string; // Add shop_code
        status: 'pending' | 'accepted' | 'rejected' | 'abandoned';
        development_status?: string; // 开发状态
        push_time: string;
        shops: Array<{
            id: string;
            name: string;
            key_id?: string;
            key_name?: string;
            shop_code?: string; // Add shop_code
            status: 'pending' | 'accepted' | 'rejected' | 'abandoned';
            push_time: string;
        }>;
        handler_name?: string; // OPT-1
    }>;
    handler_name?: string; // OPT-1
}

interface Shop {
    id: string;
    shop_name: string;
    key_id?: string;
    key_name?: string;
    shop_code?: string; // Add shop_code
}

const PushHistory: React.FC = () => {
    // 推款历史数据将从 API 获取，初始为空
    const [records, setRecords] = useState<PushRecord[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);

    const [filter, setFilter] = useState<'all' | 'private' | 'public'>('all');
    const [detailModal, setDetailModal] = useState<{ show: boolean; record: PushRecord | null }>({ show: false, record: null });
    const [addPrivateModal, setAddPrivateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [recordSearchTerm, setRecordSearchTerm] = useState(''); // OPT-9: 用于搜索推款记录
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]); // 选中的 KEY
    const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]); // 选中的店铺 ID

    useEffect(() => {
        const fetchData = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';

                // Fetch shops for the "Add Private Push" modal filters
                const shopsRes = await fetch(`${API_BASE}/api/admin/shops?pageSize=1000`);
                const shopsData = await shopsRes.json();

                // Build Shops Map for easy lookup (used for modals if needed, or just list)
                const shopList: Shop[] = (shopsData.data || []).map((s: any) => ({
                    id: s.id,
                    shop_name: s.shop_name,
                    key_id: s.key_id,
                    key_name: s.key_name || s.key_id,
                    shop_code: s.shop_code
                }));
                setShops(shopList);

                // Fetch Grouped History from Backend
                // OPT-8: Use server-side grouped endpoint to improve performance
                const historyRes = await fetch(`${API_BASE}/api/admin/push/history-grouped?pageSize=200`);
                const historyData = await historyRes.json();

                if (historyData.data) {
                    setRecords(historyData.data);
                }
            } catch (err) {
                console.error('Error fetching push history:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // OPT-9: 添加记录搜索过滤
    const filteredRecords = records.filter(r => {
        const typeMatch = filter === 'all' || r.push_type === filter;
        const searchMatch = recordSearchTerm === '' ||
            r.style_name.toLowerCase().includes(recordSearchTerm.toLowerCase()) ||
            r.link.toLowerCase().includes(recordSearchTerm.toLowerCase()) ||
            r.shops.some(s => s.name.toLowerCase().includes(recordSearchTerm.toLowerCase()) || (s.key_name && s.key_name.toLowerCase().includes(recordSearchTerm.toLowerCase())));
        return typeMatch && searchMatch;
    });
    const filteredShops = shops.filter(s =>
        s.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.key_name && s.key_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // 按 KEY 分组
    const groupedByKey = shops.reduce((acc: Record<string, Shop[]>, shop) => {
        const key = (shop.key_name && shop.key_name.trim()) ? shop.key_name.trim() : '未知KEY';
        if (!acc[key]) acc[key] = [];
        acc[key].push(shop);
        return acc;
    }, {});

    // 过滤后的 KEY 列表
    const filteredKeys = Object.keys(groupedByKey).filter(keyId => {
        const lower = searchTerm.toLowerCase();
        // 匹配 KEY 名称
        if (keyId.toLowerCase().includes(lower)) return true;
        // 匹配该 KEY 下的店铺名称
        return groupedByKey[keyId].some(s => s.shop_name.toLowerCase().includes(lower));
    });

    const handleAddPrivate = async () => {
        if (selectedKeys.length === 0) {
            alert('请选择 KEY');
            return;
        }
        if (selectedShopIds.length === 0) {
            alert('请选择具体店铺');
            return;
        }
        if (!detailModal.record) return;

        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
            const res = await fetch(`${API_BASE}/api/admin/push/private`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shopIds: selectedShopIds,
                    imageUrl: detailModal.record.image_url,
                    refLink: detailModal.record.link,
                    name: detailModal.record.style_name,
                    remark: '',
                    tags: [],
                    deadline: 3
                })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`私推失败: ${err.error}`);
                return;
            }

            alert(`私推成功！\n已推送给 ${selectedKeys.length} 个 KEY (共 ${selectedShopIds.length} 家店铺)`);

            // Close modal and reset state
            setAddPrivateModal(false);
            setSelectedKeys([]);
            setSelectedShopIds([]);
            setSearchTerm('');
        } catch (err: any) {
            alert('请求失败，请检查网络或后端');
            console.error(err);
        }
    };

    const handlePushToPool = async (id: string, record: PushRecord) => {
        if (!confirm('确定将此款式推入公池？')) return;

        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
            const res = await fetch(`${API_BASE}/api/admin/push/transfer/public`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-buyer-name': 'Admin' // Should be dynamic
                },
                body: JSON.stringify({ styleId: id })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`推入公池失败: ${err.error}`);
                return;
            }

            // Update local state
            setRecords(records.map(r =>
                r.id === id ? { ...r, push_type: 'public' as const } : r
            ));
            alert('已成功推入公池！');
        } catch (err: any) {
            console.error('Push to pool error:', err);
            alert('请求失败，请检查网络');
        }
    };

    // 接款进度上限固定为3
    const MAX_ACCEPT = 3;

    const getProgressColor = (accepted: number) => {
        if (accepted === 0) return 'var(--danger)';
        if (accepted < MAX_ACCEPT) return 'var(--warning)';
        return 'var(--success)';
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">推款历史</h1>
                    <p className="page-subtitle">以链接维度查看款式接款进度</p>
                </div>
            </div>

            <div className="card">
                <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="tabs">
                        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>全部</button>
                        <button className={`tab ${filter === 'private' ? 'active' : ''}`} onClick={() => setFilter('private')}>私推</button>
                        <button className={`tab ${filter === 'public' ? 'active' : ''}`} onClick={() => setFilter('public')}>公池</button>
                    </div>
                    {/* OPT-9: 搜索框 */}
                    <div className="search-box" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>search</span>
                        <input
                            type="text"
                            placeholder="搜索款式/KEY/商家..."
                            value={recordSearchTerm}
                            onChange={(e) => setRecordSearchTerm(e.target.value)}
                            style={{ border: '1px solid var(--border-color)', borderRadius: 4, padding: '6px 10px', fontSize: 13 }}
                        />
                        {recordSearchTerm && (
                            <button
                                onClick={() => setRecordSearchTerm('')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {filteredRecords.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-symbols-outlined">history</span>
                        <p>暂无推款记录</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 60 }}>处理人</th>
                                <th>图片</th>
                                <th>款式名称</th>
                                <th>参考链接</th>
                                <th>类型</th>
                                <th>接款进度</th>
                                <th>首次推送</th>
                                <th>最近推送</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map(record => {
                                // 当前分组中，如果有任何一个子项被拒绝且还没被推入公池，且总数>=3... (原逻辑)
                                // 这里使用 record.shops 内的统计
                                const rejectedCount = record.shops.filter(s => s.status === 'rejected').length;
                                return (
                                    <tr key={record.id}>
                                        <td>
                                            {record.handler_name ? (
                                                <div style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    ...getHandlerColor(record.handler_name),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 13,
                                                    fontWeight: 'bold',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }} title={record.handler_name}>
                                                    {getHandlerAlias(record.handler_name)}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#cbd5e1' }}>-</span>
                                            )}
                                        </td>
                                        <td>
                                            <img src={record.image_url} alt="" className="style-image" />
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{record.style_name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {record.id.slice(0, 8)}</div>
                                        </td>
                                        <td>
                                            {record.link ? (
                                                <a href={record.link} target="_blank" rel="noopener noreferrer"
                                                    style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link</span>
                                                    链接
                                                </a>
                                            ) : <span style={{ color: '#ccc' }}>无链接</span>}
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: 4,
                                                fontSize: 11,
                                                background: record.push_type === 'private' ? '#fef3c7' : '#dbeafe',
                                                color: record.push_type === 'private' ? '#92400e' : '#1e40af'
                                            }}>
                                                {record.push_type === 'private' ? '私推' : '公池'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{
                                                    fontWeight: 600,
                                                    color: getProgressColor(record.accepted_count)
                                                }}>
                                                    {record.accepted_count}/{MAX_ACCEPT}
                                                </span>
                                                <div className="progress-bar" style={{ width: 60 }}>
                                                    <div
                                                        className="progress-bar-fill"
                                                        style={{
                                                            width: `${Math.min((record.accepted_count / MAX_ACCEPT) * 100, 100)}%`,
                                                            background: getProgressColor(record.accepted_count)
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {formatDate(record.first_push_time)}
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {formatDate(record.last_push_time)}
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    onClick={() => setDetailModal({ show: true, record })}
                                                >
                                                    详情
                                                </button>
                                                {record.push_type === 'private' && rejectedCount >= 3 && (
                                                    <button
                                                        className="btn btn-sm btn-warning"
                                                        onClick={() => handlePushToPool(record.id, record)}
                                                    >
                                                        推入公池
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {filteredRecords.some(r => r.push_type === 'private' && r.shops.filter(s => s.status === 'rejected').length >= 3) && (
                    <div className="alert-banner warning" style={{ marginTop: 16 }}>
                        <span className="material-symbols-outlined">lightbulb</span>
                        <span>有款式被 3 家以上商家拒绝，建议推入公池扩大曝光</span>
                    </div>
                )}
            </div>

            {/* 详情弹窗 */}
            {detailModal.show && detailModal.record && (
                <div className="modal-overlay" onClick={() => setDetailModal({ show: false, record: null })}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">推款详情</span>
                            <button className="btn-icon" onClick={() => setDetailModal({ show: false, record: null })}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                                <img src={detailModal.record.image_url} alt="" style={{ width: 80, height: 80, borderRadius: 8 }} />
                                <div>
                                    <h3 style={{ fontSize: 15, marginBottom: 4 }}>{detailModal.record.style_name}</h3>
                                    {detailModal.record.link && (
                                        <a href={detailModal.record.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--primary)' }}>
                                            {detailModal.record.link}
                                        </a>
                                    )}
                                </div>
                            </div>

                            <h4 style={{ fontSize: 13, marginBottom: 12 }}>商家接款情况</h4>
                            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>KEY 名称</th>
                                            <th>店铺ID</th>
                                            <th>店铺名称</th>
                                            <th>推送时间</th>
                                            <th>状态</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailModal.record.shops.map(shop => (
                                            <tr key={shop.id}>
                                                <td style={{ fontWeight: 600 }}>{shop.key_name || '-'}</td>
                                                <td style={{ fontFamily: 'monospace' }}>{shop.shop_code || '-'}</td>
                                                <td>{shop.name}</td>
                                                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(shop.push_time)}</td>
                                                <td>
                                                    <span className={`status-badge ${shop.development_status === 'success' ? 'completed' : shop.development_status === 'abandoned' ? 'rejected' : shop.status === 'rejected' ? 'rejected' : 'processing'}`}>
                                                        {/* 状态显示逻辑: pending→待确认, abandoned→已放弃, success→已完成, rejected→已拒绝, 其他→打版中 */}
                                                        {shop.development_status === 'abandoned' ? '已放弃' :
                                                            shop.development_status === 'success' ? '已完成' :
                                                                shop.status === 'rejected' ? '已拒绝' :
                                                                    shop.status === 'abandoned' ? '已放弃' :
                                                                        shop.status === 'pending' ? '待处理' : '打版中'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setDetailModal({ show: false, record: null })}>
                                关闭
                            </button>
                            <button className="btn btn-primary" onClick={() => { setAddPrivateModal(true); }}>
                                新增私推
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 新增私推弹窗 */}
            {addPrivateModal && (
                <div className="modal-overlay" onClick={() => { setAddPrivateModal(false); setSelectedKeys([]); setSelectedShopIds([]); }}>
                    <div className="modal" style={{ maxWidth: 550 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">新增私推</span>
                            <button className="btn-icon" onClick={() => { setAddPrivateModal(false); setSelectedKeys([]); setSelectedShopIds([]); }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            {selectedKeys.length === 0 ? (
                                <div className="form-group">
                                    <label className="form-label">选择推送 KEY</label>
                                    <div className="search-box" style={{ marginBottom: 8 }}>
                                        <span className="material-symbols-outlined">search</span>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="搜索 KEY"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            style={{ paddingLeft: 36 }}
                                        />
                                    </div>
                                    <div className="shop-select-list" style={{ maxHeight: 300 }}>
                                        {filteredKeys.map(keyId => {
                                            const keyShops = groupedByKey[keyId];
                                            const isSelected = selectedKeys.includes(keyId);
                                            return (
                                                <label key={keyId} className={`shop-select-item ${isSelected ? 'selected' : ''}`} style={{ padding: '10px 12px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            setSelectedKeys(prev =>
                                                                prev.includes(keyId) ? prev.filter(k => k !== keyId) : [...prev, keyId]
                                                            );
                                                        }}
                                                    />
                                                    <span style={{ flex: 1, fontWeight: 500 }}>
                                                        {keyId}
                                                    </span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                        {keyShops.length} 家店铺
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <label className="form-label" style={{ marginBottom: 0 }}>选择具体店铺</label>
                                        <button
                                            className="btn btn-sm btn-outline"
                                            onClick={() => {
                                                setSelectedKeys([]);
                                                setSelectedShopIds([]);
                                            }}
                                        >
                                            返回选择 KEY
                                        </button>
                                    </div>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                                        已选择 {selectedKeys.length} 个 KEY，共 {selectedShopIds.length} 家店铺
                                    </p>
                                    <div className="shop-select-list" style={{ maxHeight: 300 }}>
                                        {selectedKeys.map(keyId => {
                                            const keyShops = groupedByKey[keyId];
                                            const selectedCount = keyShops.filter(s => selectedShopIds.includes(s.id)).length;

                                            return (
                                                <div key={keyId} style={{ marginBottom: 16 }}>
                                                    <div style={{
                                                        padding: '8px 12px',
                                                        background: 'rgba(99, 102, 241, 0.05)',
                                                        borderRadius: 6,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        marginBottom: 4
                                                    }}>
                                                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                                                            {keyId} ({selectedCount}/{keyShops.length})
                                                        </span>
                                                        <button
                                                            className="btn btn-sm"
                                                            style={{ fontSize: 11, padding: '2px 8px' }}
                                                            onClick={() => {
                                                                const allShopIds = keyShops.map(s => s.id);
                                                                const allSelected = allShopIds.every(id => selectedShopIds.includes(id));
                                                                if (allSelected) {
                                                                    setSelectedShopIds(prev => prev.filter(id => !allShopIds.includes(id)));
                                                                } else {
                                                                    setSelectedShopIds(prev => [...new Set([...prev, ...allShopIds])]);
                                                                }
                                                            }}
                                                        >
                                                            {keyShops.every(s => selectedShopIds.includes(s.id)) ? '取消全选' : '全选'}
                                                        </button>
                                                    </div>
                                                    {keyShops.map(shop => {
                                                        const isSelected = selectedShopIds.includes(shop.id);
                                                        return (
                                                            <label
                                                                key={shop.id}
                                                                className={`shop-select-item ${isSelected ? 'selected' : ''}`}
                                                                style={{ padding: '6px 12px 6px 24px' }}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => {
                                                                        setSelectedShopIds(prev =>
                                                                            prev.includes(shop.id) ? prev.filter(id => id !== shop.id) : [...prev, shop.id]
                                                                        );
                                                                    }}
                                                                />
                                                                <span style={{ fontSize: 12, fontFamily: 'monospace', minWidth: 60 }}>
                                                                    {shop.shop_code || shop.id.slice(0, 8)}
                                                                </span>
                                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{shop.shop_name}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => { setAddPrivateModal(false); setSelectedKeys([]); setSelectedShopIds([]); setSearchTerm(''); }}>
                                取消
                            </button>
                            <button className="btn btn-primary" onClick={handleAddPrivate}>
                                确认推送
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PushHistory;
