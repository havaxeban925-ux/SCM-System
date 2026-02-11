import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE } from '../lib/api';

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

interface PendingRegistration {
    id: string;
    username: string;
    shop_name: string;
    status: '待审批' | '已通过' | '已驳回';
    submit_time: string;
    reject_reason?: string;
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
        binding_account: '', // 新增关联账号字段
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

    // Add Shop Modal State (for adding shop to existing KEY)
    const [showAddShopModal, setShowAddShopModal] = useState(false);
    const [addShopForm, setAddShopForm] = useState({
        shopId: '',
        shopName: '',
        level: 'N' as Shop['level']
    });

    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'level', direction: 'asc' });

    // Pending Registrations
    const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
    const [pendingLoading, setPendingLoading] = useState(false);

    // Approve Modal State
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [approveForm, setApproveForm] = useState({
        userId: '',
        username: '',
        shop_name: '',
        keyId: '',
        keyName: '',  // KEY 商号名称
        shopCode: '',
        level: 'N' as Shop['level']
    });

    const loadAllShops = async () => {
        setLoading(true);
        try {
            // const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            let allFetched: Shop[] = [];
            let page = 1;
            const pageSize = 1000;

            while (true) {
                const url = new URL(`${API_BASE}/api/admin/shops`);
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

            // Group by KEY - 处理空 key_id 的情况
            // 如果 key_id 为空，则使用 shop_name 作为临时分组键
            // 问题1修复：分组时提取phone字段
            const grouped = allFetched.reduce((acc, shop) => {
                const keyId = (shop.key_id && shop.key_id.trim()) ? shop.key_id.trim() : shop.shop_name || '未分类';
                if (!acc[keyId]) {
                    acc[keyId] = {
                        key_id: keyId,
                        phone: shop.phone || '', // 问题1：从第一个店铺提取电话
                        shops: [],
                        level: shop.level || 'N',
                    };
                } else if (!acc[keyId].phone && shop.phone) {
                    // 如果当前分组没有电话但此店铺有，则使用此店铺的电话
                    acc[keyId].phone = shop.phone;
                }
                acc[keyId].shops.push(shop);
                return acc;
            }, {} as Record<string, ShopGroup>);

            setAllGroups(Object.values(grouped));
        } catch (err: any) {
            console.error('Failed to load shops:', err);
        }
        setLoading(false);
    };

    const loadPendingRegistrations = async () => {
        setPendingLoading(true);
        try {
            // const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            const res = await fetch(`${API_BASE}/api/auth/pending`);
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
            const json = await res.json();
            setPendingRegistrations(json.data || []);
        } catch (err: any) {
            console.error('Failed to load pending registrations:', err);
        }
        setPendingLoading(false);
    };

    useEffect(() => {
        loadAllShops();
        loadPendingRegistrations();

        // 自动刷新待审批列表 (30秒轮询)
        const interval = setInterval(() => {
            loadPendingRegistrations();
        }, 30000);

        return () => clearInterval(interval);
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
                if (valA !== valB) return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            if (sortConfig.key === 'shopCount') {
                const diff = a.shops.length - b.shops.length;
                if (diff !== 0) return sortConfig.direction === 'asc' ? diff : -diff;
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

    const openApproveModal = (reg: PendingRegistration) => {
        setApproveForm({
            userId: reg.id,
            username: reg.username,
            shop_name: reg.shop_name,
            keyId: '',
            keyName: '',  // 初始化 KEY 名称
            shopCode: '',
            level: 'N'
        });
        setShowApproveModal(true);
    };

    const handleConfirmApprove = async () => {
        if (!approveForm.keyId || !approveForm.shopCode) {
            alert('请填写 KEY 和 店铺ID');
            return;
        }

        try {
            // const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            const res = await fetch(`${API_BASE}/api/auth/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: approveForm.userId,
                    keyId: approveForm.keyId,
                    keyName: approveForm.keyName,  // 传递 KEY 名称
                    shopCode: approveForm.shopCode,
                    level: approveForm.level
                })
            });
            if (!res.ok) {
                const err = await res.json();
                alert(`审批失败: ${err.error}`);
                return;
            }
            alert('商家审批通过！');
            setShowApproveModal(false);
            loadPendingRegistrations();
            loadAllShops();
        } catch (err: any) {
            alert(`操作失败: ${err.message}`);
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt('请输入驳回原因：');
        if (!reason) return;

        try {
            // const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            const res = await fetch(`${API_BASE}/api/auth/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: id, reason })
            });
            if (!res.ok) {
                const err = await res.json();
                alert(`驳回失败: ${err.error}`);
                return;
            }
            alert('已驳回该申请');
            loadPendingRegistrations();
        } catch (err: any) {
            alert(`操作失败: ${err.message}`);
        }
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
        try {
            if (addMode === 'single') {
                if (!formData.key_id || !formData.shop_name) {
                    alert('请填写完整信息');
                    return;
                }

                const res = await fetch(`${API_BASE}/api/admin/shops`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        shopName: formData.shop_name,
                        keyId: formData.key_id,
                        level: formData.key_label,
                        shopId: formData.shop_id,
                        phone: formData.phone,
                        bindingAccount: formData.binding_account // 发送给后端
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.warning) {
                        alert(data.warning);
                    } else {
                        alert('添加成功');
                    }
                    setShowAddModal(false);
                    setFormData({ key_id: '', key_label: 'N', shop_id: '', shop_name: '', phone: '', binding_account: '' });
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
        if (!shopToDelete) return;

        try {
            // const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            const res = await fetch(`${API_BASE}/api/admin/shops/${shopToDelete.id}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`删除失败: ${err.error || '未知错误'}`);
                return;
            }

            alert('店铺删除成功');
            setShowDeleteModal(false);
            setShopToDelete(null);
            closeDrawer();
            loadAllShops();
        } catch (err: any) {
            alert(`操作失败: ${err.message}`);
        }
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

    // Delete KEY handler
    const handleDeleteKey = async () => {
        if (!selectedGroup) return;

        const confirmed = confirm(`确定要删除 KEY "${selectedGroup.key_id}" 吗？\n\n这将清空该商家的 key_id 字段。`);
        if (!confirmed) return;

        try {
            // const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            // 使用第一个店铺的ID来代表这个KEY组
            const shopId = selectedGroup.shops[0]?.id;
            if (!shopId) {
                alert('无法删除：未找到关联店铺');
                return;
            }

            const res = await fetch(`${API_BASE}/api/admin/shops/${shopId}/key`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`删除失败: ${err.error || '未知错误'}`);
                return;
            }

            alert('KEY 删除成功');
            closeDrawer();
            loadAllShops();
        } catch (err: any) {
            alert(`操作失败: ${err.message}`);
        }
    };

    // Open add shop modal
    const handleOpenAddShop = () => {
        setAddShopForm({
            shopId: '',
            shopName: '',
            level: selectedGroup?.level || 'N'
        });
        setShowAddShopModal(true);
    };

    // Submit add shop
    const handleSubmitAddShop = async () => {
        if (!selectedGroup || !addShopForm.shopName) {
            alert('请填写店铺名称');
            return;
        }

        try {
            // const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            const res = await fetch(`${API_BASE}/api/admin/shops`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shopName: addShopForm.shopName,
                    keyId: selectedGroup.key_id,
                    level: addShopForm.level,
                    shopId: addShopForm.shopId
                })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`添加失败: ${err.error || '未知错误'}`);
                return;
            }

            alert('店铺添加成功');
            setShowAddShopModal(false);
            loadAllShops();
        } catch (err: any) {
            alert(`操作失败: ${err.message}`);
        }
    };

    // Modified delete shop handler - ensure at least one shop remains
    const handleDeleteShop = (shop: Shop) => {
        if (selectedGroup && selectedGroup.shops.length <= 1) {
            alert('无法删除：每个商家至少需要保留一个店铺');
            return;
        }
        handleDeleteClick(shop);
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
                        商家审批
                        {pendingRegistrations.filter(r => r.status === 'pending').length > 0 && (
                            <span style={{
                                marginLeft: 8,
                                background: 'var(--danger)',
                                color: '#fff',
                                padding: '2px 6px',
                                borderRadius: 10,
                                fontSize: 11
                            }}>
                                {pendingRegistrations.filter(r => r.status === 'pending').length}
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
                        {pendingLoading ? (
                            <div className="empty-state">加载中...</div>
                        ) : pendingRegistrations.length === 0 ? (
                            <div className="empty-state">
                                <span className="material-symbols-outlined">how_to_reg</span>
                                <p>暂无待审批的注册申请</p>
                            </div>
                        ) : (
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
                                    {pendingRegistrations.map(reg => {
                                        // 状态映射：后端返回英文 -> 前端显示中文
                                        const statusMap: Record<string, string> = {
                                            'pending': '待审批',
                                            'approved': '已通过',
                                            'rejected': '已驳回'
                                        };
                                        const displayStatus = statusMap[reg.status] || reg.status;

                                        return (
                                            <tr key={reg.id}>
                                                <td style={{ fontFamily: 'monospace' }}>{reg.username}</td>
                                                <td style={{ fontWeight: 500 }}>{reg.shop_name}</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(reg.created_at || Date.now()).toLocaleString()}</td>
                                                <td>
                                                    <span className={`status-badge ${reg.status === 'pending' ? 'processing' :
                                                        reg.status === 'approved' ? 'completed' : 'rejected'
                                                        }`}>
                                                        {displayStatus}
                                                    </span>
                                                    {reg.reject_reason && (
                                                        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--danger)' }}>
                                                            ({reg.reject_reason})
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    {reg.status === 'pending' && (
                                                        <div className="action-buttons">
                                                            <button className="btn btn-sm btn-success" onClick={() => openApproveModal(reg)}>
                                                                通过
                                                            </button>
                                                            <button className="btn btn-sm btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleReject(reg.id)}>
                                                                驳回
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Drawer */}
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div className="drawer-section-title">店铺列表</div>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={handleOpenAddShop}
                                            style={{ padding: '4px 12px', fontSize: 12 }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                                            新增店铺
                                        </button>
                                    </div>
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
                                                            style={{
                                                                padding: '4px 8px',
                                                                fontSize: 12,
                                                                color: '#ef4444',
                                                                borderColor: '#ef4444',
                                                                opacity: selectedGroup.shops.length <= 1 ? 0.5 : 1,
                                                                cursor: selectedGroup.shops.length <= 1 ? 'not-allowed' : 'pointer'
                                                            }}
                                                            onClick={() => handleDeleteShop(shop)}
                                                            disabled={selectedGroup.shops.length <= 1}
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
                                {/* 删除 KEY 按钮 - 放在底部 */}
                                <div className="drawer-section" style={{ borderTop: '2px dashed var(--border-color)', paddingTop: 16 }}>
                                    <button
                                        className="btn btn-outline"
                                        onClick={handleDeleteKey}
                                        style={{
                                            width: '100%',
                                            color: '#ef4444',
                                            borderColor: '#ef4444',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8
                                        }}
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                        删除 KEY
                                    </button>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                                        删除后，该商家的 KEY 信息将被清空
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </>

            {/* DELETE MODAL */}
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

            {/* ADD MODAL */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><span className="modal-title">添加商家</span></div>
                        <div className="modal-body">
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
                                    <div className="form-group">
                                        <label className="form-label">关联账号 (Username) <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 'normal' }}>(选填，绑定已有账号)</span></label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="例如 merchant_test"
                                            value={formData.binding_account}
                                            onChange={e => setFormData({ ...formData, binding_account: e.target.value })}
                                        />
                                    </div>
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

            {/* ADD SHOP MODAL (for adding shop to existing KEY) */}
            {showAddShopModal && (
                <div className="modal-overlay" style={{ zIndex: 1150 }}>
                    <div className="modal" style={{ width: 400 }}>
                        <div className="modal-header">
                            <span className="modal-title">新增店铺 - {selectedGroup?.key_id}</span>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">店铺名称 <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="输入店铺名称"
                                    value={addShopForm.shopName}
                                    onChange={e => setAddShopForm({ ...addShopForm, shopName: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">店铺ID <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 'normal' }}>(选填)</span></label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="选填"
                                    value={addShopForm.shopId}
                                    onChange={e => setAddShopForm({ ...addShopForm, shopId: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">等级</label>
                                <select
                                    className="form-select"
                                    value={addShopForm.level}
                                    onChange={e => setAddShopForm({ ...addShopForm, level: e.target.value as Shop['level'] })}
                                >
                                    <option value="S">S (破万)</option>
                                    <option value="A">A (破五千)</option>
                                    <option value="B">B (破千)</option>
                                    <option value="C">C (破百)</option>
                                    <option value="N">N (无动销)</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowAddShopModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={handleSubmitAddShop}>确认添加</button>
                        </div>
                    </div>
                </div>
            )}

            {/* APPROVE MODAL */}
            {
                showApproveModal && (
                    <div className="modal-overlay" style={{ zIndex: 1200 }}>
                        <div className="modal">
                            <div className="modal-header">
                                <span className="modal-title">审批通过 - 录入商家信息</span>
                            </div>
                            <div className="modal-body">
                                <p style={{ marginBottom: 16 }}>
                                    正在批准商家 <b>{approveForm.shop_name}</b> ({approveForm.username})。
                                    请补充以下信息以创建店铺：
                                </p>
                                <div className="form-group">
                                    <label className="form-label">KEY <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="例如 KEY-001"
                                        value={approveForm.keyId}
                                        onChange={e => setApproveForm({ ...approveForm, keyId: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">KEY 名称 (商号) <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 'normal' }}>(选填)</span></label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="例如 张三服饰"
                                        value={approveForm.keyName}
                                        onChange={e => setApproveForm({ ...approveForm, keyName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">店铺ID (ShopCode) <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="例如 SHOP-ABC"
                                        value={approveForm.shopCode}
                                        onChange={e => setApproveForm({ ...approveForm, shopCode: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">初始等级</label>
                                    <select
                                        className="form-select"
                                        value={approveForm.level}
                                        onChange={e => setApproveForm({ ...approveForm, level: e.target.value as any })}
                                    >
                                        <option value="S">S (破万)</option>
                                        <option value="A">A (破五千)</option>
                                        <option value="B">B (破千)</option>
                                        <option value="C">C (破百)</option>
                                        <option value="N">N (无动销)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-outline" onClick={() => setShowApproveModal(false)}>取消</button>
                                <button className="btn btn-success" onClick={handleConfirmApprove}>确认通过</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ShopManage;
