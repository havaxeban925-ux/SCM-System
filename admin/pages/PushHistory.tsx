import React, { useState, useEffect } from 'react';

interface PushRecord {
    id: string;
    link: string;
    image_url: string;
    style_name: string;
    push_type: 'private' | 'public';
    push_time: string;
    target_count: number;
    accepted_count: number;
    shops: Array<{
        id: string;
        name: string;
        status: 'pending' | 'accepted' | 'rejected';
    }>;
}

interface Shop {
    id: string;
    shop_name: string;
    key_id?: string;
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
    const [selectedShops, setSelectedShops] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

                // Fetch push records from b_style_demand
                const [privateRes, publicRes, shopsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/styles/private?pageSize=100`),
                    fetch(`${API_BASE}/api/styles/public?pageSize=100`),
                    fetch(`${API_BASE}/api/admin/shops?pageSize=1000`)
                ]);

                const privateData = await privateRes.json();
                const publicData = await publicRes.json();
                const shopsData = await shopsRes.json();

                // Transform private styles to PushRecord format
                const privateRecords: PushRecord[] = (privateData.data || []).map((s: any) => ({
                    id: s.id,
                    link: s.ref_link || '',
                    image_url: s.image_url || '',
                    style_name: s.name || '未命名款式',
                    push_type: 'private' as const,
                    push_time: new Date(s.created_at).toLocaleString(),
                    target_count: 3,
                    accepted_count: s.status === 'developing' ? 1 : 0,
                    shops: [{
                        id: s.shop_id || '',
                        name: s.shop_name || '未知店铺',
                        status: s.status === 'developing' ? 'accepted' : 'pending' as 'pending' | 'accepted' | 'rejected'
                    }]
                }));

                // Transform public styles to PushRecord format
                const publicRecords: PushRecord[] = (publicData.data || []).map((s: any) => ({
                    id: s.id,
                    link: '',
                    image_url: s.image_url || '',
                    style_name: s.name || '未命名款式',
                    push_type: 'public' as const,
                    push_time: new Date(s.created_at).toLocaleString(),
                    target_count: s.max_intents || 3,
                    accepted_count: s.intent_count || 0,
                    shops: []
                }));

                setRecords([...privateRecords, ...publicRecords]);
                setShops((shopsData.data || []).map((s: any) => ({
                    id: s.id,
                    shop_name: s.shop_name,
                    key_id: s.key_id
                })));
            } catch (err) {
                console.error('Error fetching push history:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredRecords = records.filter(r => filter === 'all' || r.push_type === filter);
    const filteredShops = shops.filter(s =>
        s.shop_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddPrivate = () => {
        if (selectedShops.length === 0) {
            alert('请选择店铺');
            return;
        }
        if (!detailModal.record) return;

        alert(`已新增私推给 ${selectedShops.length} 个店铺`);
        setAddPrivateModal(false);
        setSelectedShops([]);
        setSearchTerm('');
    };

    const handlePushToPool = (id: string) => {
        if (confirm('确定将此款式推入公池？')) {
            setRecords(records.map(r =>
                r.id === id ? { ...r, push_type: 'public' as const } : r
            ));
            alert('已推入公池');
        }
    };

    // 接款进度上限固定为3
    const MAX_ACCEPT = 3;

    const getProgressColor = (accepted: number) => {
        if (accepted === 0) return 'var(--danger)';
        if (accepted < MAX_ACCEPT) return 'var(--warning)';
        return 'var(--success)';
    };

    // 计算实际进度（排除已拒绝的，拒绝后可回刷给其他商家）
    const getAcceptedCount = (record: PushRecord) => {
        return record.shops.filter(s => s.status === 'accepted').length;
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
                <div className="filter-bar">
                    <div className="tabs">
                        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>全部</button>
                        <button className={`tab ${filter === 'private' ? 'active' : ''}`} onClick={() => setFilter('private')}>私推</button>
                        <button className={`tab ${filter === 'public' ? 'active' : ''}`} onClick={() => setFilter('public')}>公池</button>
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
                                <th>图片</th>
                                <th>链接/款式</th>
                                <th>类型</th>
                                <th>接款进度</th>
                                <th>推送时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map(record => {
                                const rejectedCount = record.shops.filter(s => s.status === 'rejected').length;
                                return (
                                    <tr key={record.id}>
                                        <td>
                                            <img src={record.image_url} alt="" className="style-image" />
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{record.style_name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                {record.link.length > 40 ? record.link.slice(0, 40) + '...' : record.link}
                                            </div>
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
                                                    color: getProgressColor(getAcceptedCount(record))
                                                }}>
                                                    {getAcceptedCount(record)}/{MAX_ACCEPT}
                                                </span>
                                                <div className="progress-bar" style={{ width: 60 }}>
                                                    <div
                                                        className="progress-bar-fill"
                                                        style={{
                                                            width: `${(getAcceptedCount(record) / MAX_ACCEPT) * 100}%`,
                                                            background: getProgressColor(getAcceptedCount(record))
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{record.push_time}</td>
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
                                                        onClick={() => handlePushToPool(record.id)}
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

                {records.some(r => r.push_type === 'private' && r.shops.filter(s => s.status === 'rejected').length >= 3) && (
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
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{detailModal.record.link}</p>
                                </div>
                            </div>

                            <h4 style={{ fontSize: 13, marginBottom: 12 }}>商家接款情况</h4>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>店铺名称</th>
                                        <th>状态</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailModal.record.shops.map(shop => (
                                        <tr key={shop.id}>
                                            <td>{shop.name}</td>
                                            <td>
                                                <span className={`status-badge ${shop.status === 'accepted' ? 'completed' : shop.status === 'rejected' ? 'rejected' : 'processing'}`}>
                                                    {shop.status === 'accepted' ? '已接款' : shop.status === 'rejected' ? '已拒绝' : '待处理'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                <div className="modal-overlay" onClick={() => setAddPrivateModal(false)}>
                    <div className="modal" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">新增私推</span>
                            <button className="btn-icon" onClick={() => setAddPrivateModal(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">选择推送店铺</label>
                                <div className="search-box" style={{ marginBottom: 8 }}>
                                    <span className="material-symbols-outlined">search</span>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="搜索店铺"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        style={{ paddingLeft: 36 }}
                                    />
                                </div>
                                <div className="shop-select-list">
                                    {filteredShops.map(shop => (
                                        <label key={shop.id} className={`shop-select-item ${selectedShops.includes(shop.id) ? 'selected' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={selectedShops.includes(shop.id)}
                                                onChange={() => setSelectedShops(prev =>
                                                    prev.includes(shop.id) ? prev.filter(s => s !== shop.id) : [...prev, shop.id]
                                                )}
                                            />
                                            <span style={{ flex: 1 }}>{shop.shop_name}</span>
                                        </label>
                                    ))}
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                                    已选择 {selectedShops.length} 个店铺
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setAddPrivateModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={handleAddPrivate}>确认推送</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PushHistory;
