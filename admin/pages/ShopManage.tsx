import React, { useState, useEffect, useMemo } from 'react';

interface Shop {
    id: string;
    shop_name: string;
    phone?: string;
    role: string;
    level?: 'S' | 'A' | 'B' | 'C' | 'N';
    key_id?: string;
    shop_code?: string; // 原始店铺ID
    created_at: string;
}

interface ShopGroup {
    key_id: string;
    phone: string;
    shops: Shop[];
    level: 'S' | 'A' | 'B' | 'C' | 'N';
}

const ShopManage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'list' | 'pending'>('list');
    const [allGroups, setAllGroups] = useState<ShopGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addMode, setAddMode] = useState<'single' | 'batch'>('single');
    const [formData, setFormData] = useState({
        key_id: '',
        key_label: 'N' as Shop['level'],
        shop_id: '',
        shop_name: '',
        phone: '',
    });

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Derived state for display
    const [displayGroups, setDisplayGroups] = useState<ShopGroup[]>([]);
    const [totalGroups, setTotalGroups] = useState(0);

    // Backend total (only for reference/debug)
    const [backendShopTotal, setBackendShopTotal] = useState(0);

    // Drawer Pagination State
    const [drawerPage, setDrawerPage] = useState(1);
    const drawerPageSize = 10;
    const [selectedGroup, setSelectedGroup] = useState<ShopGroup | null>(null);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);

    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'level', direction: 'asc' });

    // 待审批商家注册申请
    interface PendingRegistration {
        id: string;
        username: string;
        shop_name: string;
        status: '待审批' | '已通过' | '已驳回';
        submit_time: string;
        reject_reason?: string;
    }

    const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([
        { id: '1', username: 'newshop001', shop_name: '潮流精品店', status: '待审批', submit_time: '2024-05-25 14:30' },
        { id: '2', username: 'fashion2024', shop_name: '时尚女装馆', status: '待审批', submit_time: '2024-05-25 10:15' },
        { id: '3', username: 'styleking', shop_name: '风格之王', status: '已通过', submit_time: '2024-05-24 16:20' },
        { id: '4', username: 'elegance', shop_name: '优雅衣橱', status: '已驳回', submit_time: '2024-05-23 09:45', reject_reason: '店铺名称重复' },
    ]);

    const handleApprove = (id: string) => {
        setPendingRegistrations(pendingRegistrations.map(r => r.id === id ? { ...r, status: '已通过' as const } : r));
        alert('商家审批通过，已创建账号');
    };

    const handleReject = (id: string) => {
        const reason = prompt('请输入驳回原因：');
        if (reason) {
            setPendingRegistrations(pendingRegistrations.map(r => r.id === id ? { ...r, status: '已驳回' as const, reject_reason: reason } : r));
            alert('已驳回该申请');
        }
    };

    useEffect(() => {
        loadAllShops();
    }, []);

    // Filter -> Sort -> Paginate
    useEffect(() => {
        // 1. Filter
        let result = [...allGroups];
        if (search) {
            const lower = search.toLowerCase();
            result = result.filter(g =>
                g.key_id.toLowerCase().includes(lower) ||
                g.shops.some(s => s.shop_name.toLowerCase().includes(lower))
            );
        }

        // 2. Sort
        result.sort((a, b) => {
            if (sortConfig.key === 'level') {
                const levelOrder = { S: 0, A: 1, B: 2, C: 3, N: 4, undefined: 5 };
                const valA = levelOrder[a.level as keyof typeof levelOrder] ?? 5;
                const valB = levelOrder[b.level as keyof typeof levelOrder] ?? 5;
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            if (sortConfig.key === 'shopCount') {
                return sortConfig.direction === 'asc'
                    ? a.shops.length - b.shops.length
                    : b.shops.length - a.shops.length;
            }
            if (sortConfig.key === 'key_id') {
                return sortConfig.direction === 'asc'
                    ? a.key_id.localeCompare(b.key_id)
                    : b.key_id.localeCompare(a.key_id);
            }
            return 0;
        });

        setTotalGroups(result.length);

        // 3. Paginate
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        setDisplayGroups(result.slice(start, end));

    }, [allGroups, search, sortConfig, page, pageSize]);


    const loadAllShops = async () => {
        setLoading(true);
        try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            let allFetched: Shop[] = [];
            let page = 1;
            const pageSize = 1000;

            while (true) {
                const url = new URL(`${baseUrl}/api/admin/shops`);
                url.searchParams.set('page', page.toString());
                url.searchParams.set('pageSize', pageSize.toString());

                const res = await fetch(url.toString());
                if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

                const json = await res.json();
                const list = json.data || [];
                const total = json.total || 0;

                allFetched = [...allFetched, ...list];
                setBackendShopTotal(total);

                if (list.length < pageSize || allFetched.length >= total) {
                    break;
                }
                page++;
            }

            // Group by KEY
            const grouped = allFetched.reduce((acc, shop) => {
                const keyId = (shop.key_id || '未分类').trim();
                if (!acc[keyId]) {
                    acc[keyId] = {
                        key_id: keyId,
                        phone: '',
                        shops: [],
                        level: shop.level || 'N',
                    };
                }
                acc[keyId].shops.push(shop);
                return acc;
            }, {} as Record<string, ShopGroup>);

            setAllGroups(Object.values(grouped));
        } catch (err: any) {
            console.error('Failed to load shops:', err);
            // alert(`加载列表失败: ${err.message}`); // Silent fail better?
        }
        setLoading(false);
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleSearch = () => {
        setPage(1);
        // Search is handled by useEffect
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const getLevelLabel = (level: string) => {
        const map: Record<string, string> = {
            S: '破万',
            A: '破五千',
            B: '破千',
            C: '破百',
            N: '无动销',
        };
        return map[level] || level;
    };

    const handleSubmit = async () => {
        // ... same as before
        try {
            if (addMode === 'single') {
                if (!formData.key_id || !formData.shop_name) {
                    alert('请填写完整信息');
                    return;
                }

                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/shops`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        shopName: formData.shop_name,
                        keyId: formData.key_id,
                        level: formData.key_label,
                        shopId: formData.shop_id,
                        phone: formData.phone
                    })
                });

                if (res.ok) {
                    alert('添加成功');
                    setShowAddModal(false);
                    setFormData({ key_id: '', key_label: 'N', shop_id: '', shop_name: '', phone: '' });
                    loadAllShops();
                } else {
                    const err = await res.json();
                    alert(`添加失败: ${err.error || '未知错误'}`);
                }
            } else {
                alert('批量导入请联系管理员直接导入数据库');
            }
        } catch (err) {
            console.error(err);
            alert('操作失败');
        }
    };

    const openDrawer = (group: ShopGroup) => {
        setSelectedGroup(group);
        setDrawerPage(1);
    };

    const closeDrawer = () => {
        setSelectedGroup(null);
    };

    const handleDeleteClick = (shop: Shop) => {
        setShopToDelete(shop);
        setDeleteReason('');
        setShowDeleteModal(true);
    };

    const handleSubmitDelete = async () => {
        if (!deleteReason.trim()) {
            alert('请填写删除原因');
            return;
        }
        console.log('Submitting deletion ticket for', shopToDelete?.id, 'Reason:', deleteReason);
        alert('删除工单已提交给买手审核');
        setShowDeleteModal(false);
        setShopToDelete(null);
    };

    const getDrawerShops = () => {
        if (!selectedGroup) return [];
        const start = (drawerPage - 1) * drawerPageSize;
        return selectedGroup.shops.slice(start, start + drawerPageSize);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            alert(`已选择文件: ${file.name}\n请联系管理员进行后台导入`);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">商家管理</h1>
                <p className="page-subtitle">管理系统中的商家和店铺信息</p>
            </div>

            <div className="card">
                {/* 选项卡切换 */}
                <div className="tabs" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: '1px solid var(--border-color)' }}>
                    <button
                        className={`tab ${activeTab === 'list' ? 'active' : ''}`}
                        onClick={() => setActiveTab('list')}
                    >
                        商家名单
                    </button>
                    <button
                        className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        新增商家（审批）
                        {pendingRegistrations.filter(r => r.status === '待审批').length > 0 && (
                            <span style={{
                                marginLeft: 8,
                                background: 'var(--danger)',
                                color: '#fff',
                                padding: '2px 6px',
                                borderRadius: 10,
                                fontSize: 11
                            }}>
                                {pendingRegistrations.filter(r => r.status === '待审批').length}
                            </span>
                        )}
                    </button>
                </div>

                {activeTab === 'list' && (
                    <>
                        <div className="card-header">
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <span className="card-title">商家列表</span>
                                <div className="search-box">
                                    <span className="material-symbols-outlined">search</span>
                                    <input
                                        type="text"
                                        className="filter-input"
                                        placeholder="搜索 KEY / 店铺名..."
                                        value={search}
                                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                                        onKeyDown={handleKeyDown}
                                    />
                                </div>
                            </div>
                            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                <span className="material-symbols-outlined">add</span>
                                添加商家
                            </button>
                        </div>

                        {loading ? (
                            <div className="empty-state">加载中...</div>
                        ) : allGroups.length === 0 ? (
                            <div className="empty-state">
                                <span className="material-symbols-outlined">store</span>
                                <p>暂无商家数据</p>
                            </div>
                        ) : (
                            <>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th onClick={() => handleSort('key_id')} style={{ cursor: 'pointer' }}>
                                                KEY {sortConfig.key === 'key_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th onClick={() => handleSort('level')} style={{ cursor: 'pointer' }}>
                                                KEY标签 {sortConfig.key === 'level' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th>联系电话</th>
                                            <th>角色</th>
                                            <th onClick={() => handleSort('shopCount')} style={{ cursor: 'pointer' }}>
                                                店铺数量 {sortConfig.key === 'shopCount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th style={{ width: 120 }}>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayGroups.map(group => (
                                            <tr key={group.key_id}>
                                                <td style={{ fontWeight: 600 }}>{group.key_id}</td>
                                                <td>
                                                    <span className={`level-badge ${group.level}`}>
                                                        {group.level} ({getLevelLabel(group.level)})
                                                    </span>
                                                </td>
                                                <td>{group.phone || '-'}</td>
                                                <td>老板</td>
                                                <td>{group.shops.length}</td>
                                                <td>
                                                    <button
                                                        className="btn btn-sm btn-outline"
                                                        onClick={() => openDrawer(group)}
                                                    >
                                                        查看详情
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Global Pagination Controls */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 0', gap: 16, alignItems: 'center' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        共 {totalGroups} 个KEY ({backendShopTotal} 个店铺)
                                    </span>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</button>
                                        <span style={{ display: 'flex', alignItems: 'center', fontSize: 13 }}>
                                            {page} / {Math.ceil(totalGroups / pageSize) || 1} 页
                                        </span>
                                        <button className="btn btn-outline btn-sm" disabled={(page * pageSize) >= totalGroups} onClick={() => setPage(page + 1)}>下一页</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* 待审批商家视图 */}
                {activeTab === 'pending' && (
                    <div style={{ padding: 16 }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>账号</th>
                                    <th>店铺名称</th>
                                    <th>提交时间</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingRegistrations.map(reg => (
                                    <tr key={reg.id}>
                                        <td style={{ fontFamily: 'monospace' }}>{reg.username}</td>
                                        <td style={{ fontWeight: 500 }}>{reg.shop_name}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{reg.submit_time}</td>
                                        <td>
                                            <span className={`status-badge ${reg.status === '待审批' ? 'processing' :
                                                    reg.status === '已通过' ? 'completed' : 'rejected'
                                                }`}>
                                                {reg.status}
                                            </span>
                                            {reg.reject_reason && (
                                                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--danger)' }}>
                                                    ({reg.reject_reason})
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {reg.status === '待审批' && (
                                                <div className="action-buttons">
                                                    <button className="btn btn-sm btn-success" onClick={() => handleApprove(reg.id)}>
                                                        通过
                                                    </button>
                                                    <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleReject(reg.id)}>
                                                        驳回
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Drawer (Unchanged structure) */}
            <>
                <div
                    className={`drawer-overlay ${selectedGroup ? 'open' : ''}`}
                    style={{ display: selectedGroup ? 'block' : 'none' }}
                    onClick={closeDrawer}
                />
                <div className={`drawer ${selectedGroup ? 'open' : ''}`}>
                    {selectedGroup && (
                        <>
                            <div className="drawer-header">
                                <span className="drawer-title">商家详情 - {selectedGroup.key_id}</span>
                                <button className="btn-icon" onClick={closeDrawer}>
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="drawer-body">
                                <div className="drawer-section">
                                    <div className="drawer-section-title">店铺列表</div>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>店铺ID</th>
                                                <th>店铺名称</th>
                                                <th style={{ width: 80 }}>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getDrawerShops().map(shop => (
                                                <tr key={shop.id}>
                                                    <td style={{ fontFamily: 'monospace' }}>
                                                        {shop.shop_code || shop.id.slice(0, 8)}
                                                    </td>
                                                    <td>{shop.shop_name}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            style={{ padding: '4px 8px', fontSize: 12, color: '#ef4444', borderColor: '#ef4444' }}
                                                            onClick={() => handleDeleteClick(shop)}
                                                        >
                                                            删除
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {selectedGroup.shops.length > drawerPageSize && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
                                            <button
                                                className="btn btn-outline btn-sm"
                                                disabled={drawerPage === 1}
                                                onClick={() => setDrawerPage(d => d - 1)}
                                            >
                                                上一页
                                            </button>
                                            <span style={{ fontSize: 12, alignSelf: 'center' }}>
                                                {drawerPage} / {Math.ceil(selectedGroup.shops.length / drawerPageSize)}
                                            </span>
                                            <button
                                                className="btn btn-outline btn-sm"
                                                disabled={drawerPage * drawerPageSize >= selectedGroup.shops.length}
                                                onClick={() => setDrawerPage(d => d + 1)}
                                            >
                                                下一页
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="drawer-section">
                                    {/* Role Permissions (Static) */}
                                    <div className="drawer-section-title">角色权限</div>
                                    <table className="data-table">
                                        <thead>
                                            <tr><th>角色</th><th>联系电话</th><th>角色权限</th><th>是否启用</th></tr>
                                        </thead>
                                        <tbody>
                                            {['店铺运营', '店铺跟单', '店铺设计'].map(role => (
                                                <tr key={role}>
                                                    <td>{role}</td>
                                                    <td><input type="text" className="form-input" style={{ height: 28 }} placeholder="输入电话" /></td>
                                                    <td style={{ color: '#ccc' }}>-</td>
                                                    <td><input type="checkbox" defaultChecked /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </>

            {/* Modals remain the same... reusing previous content if possible? No, file write replaces all. */}
            {/* Delete Reason Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal" style={{ width: 400 }}>
                        <div className="modal-header">
                            <span className="modal-title">申请删除店铺</span>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: 12, fontSize: 14 }}>
                                您正在申请删除店铺 <b>{shopToDelete?.shop_name}</b>。
                            </p>
                            <label className="form-label">删除原因 <span style={{ color: 'red' }}>*</span></label>
                            <textarea
                                className="form-input"
                                rows={3}
                                value={deleteReason}
                                onChange={e => setDeleteReason(e.target.value)}
                                placeholder="请详细说明原因..."
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={handleSubmitDelete}>提交审核</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><span className="modal-title">添加商家</span></div>
                        <div className="modal-body">
                            {/* Same add modal content as previous version */}
                            <div className="tabs" style={{ marginBottom: 20 }}>
                                <button className={`tab ${addMode === 'single' ? 'active' : ''}`} onClick={() => setAddMode('single')}>单独录入</button>
                                <button className={`tab ${addMode === 'batch' ? 'active' : ''}`} onClick={() => setAddMode('batch')}>批量导入</button>
                            </div>
                            {addMode === 'single' ? (
                                <>
                                    <div className="form-group"><label className="form-label">KEY</label><input type="text" className="form-input" value={formData.key_id} onChange={e => setFormData({ ...formData, key_id: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">KEY标签</label>
                                        <select className="form-select" value={formData.key_label} onChange={e => setFormData({ ...formData, key_label: e.target.value as Shop['level'] })}>
                                            <option value="S">S</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="N">N</option>
                                        </select>
                                    </div>
                                    <div className="form-group"><label className="form-label">店铺ID</label><input type="text" className="form-input" value={formData.shop_id} onChange={e => setFormData({ ...formData, shop_id: e.target.value })} /></div>
                                    <div className="form-group"><label className="form-label">店铺名称</label><input type="text" className="form-input" value={formData.shop_name} onChange={e => setFormData({ ...formData, shop_name: e.target.value })} /></div>
                                </>
                            ) : (
                                <div>
                                    <label htmlFor="excel-upload" className="upload-area" style={{ cursor: 'pointer' }}>
                                        <span className="material-symbols-outlined">upload_file</span>
                                        <p>点击选择 excel</p>
                                        <input type="file" style={{ display: 'none' }} id="excel-upload" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowAddModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={handleSubmit}>确认</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShopManage;
