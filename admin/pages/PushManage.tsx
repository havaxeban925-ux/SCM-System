import React, { useState, useEffect } from 'react';
import ImageUpload from '../components/ImageUpload';

interface Shop {
    id: string;
    shop_name: string;
    key_id?: string;
    shop_code?: string; // Add shop_code
    private_push_count: number; // 模拟私推接款进度 (0-3)
}

interface PushRecord {
    id: string;
    image: string;
    type: 'private' | 'public';
    shops: { shop_name: string; status: 'pending' | 'interested' | 'uploaded' }[];
    upload_time: string;
    tags: string[];
    is_top?: boolean; // 置顶
}

const PushManage: React.FC = () => {

    // Form States - Private
    const [privateName, setPrivateName] = useState('');
    const [privateImage, setPrivateImage] = useState('');
    const [privateLink, setPrivateLink] = useState('');
    const [privateRemark, setPrivateRemark] = useState('');
    const [privateVisual, setPrivateVisual] = useState('');
    const [privateStyle, setPrivateStyle] = useState('');

    // Form States - Public
    const [publicName, setPublicName] = useState(''); // Added publicName
    const [publicImage, setPublicImage] = useState('');
    const [publicLink, setPublicLink] = useState('');
    const [publicRemark, setPublicRemark] = useState('');
    const [publicVisual, setPublicVisual] = useState('');
    const [publicStyle, setPublicStyle] = useState('');

    // Shop Selection - Two-level: KEY -> ShopID
    const [shops, setShops] = useState<Shop[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]); // 选中的 KEY
    const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]); // 选中的店铺 ID
    const [showKeySelector, setShowKeySelector] = useState(false); // 显示 KEY 选择器
    const [showShopSelector, setShowShopSelector] = useState(false); // 显示店铺选择器

    // Public Pool List
    const [publicStyles, setPublicStyles] = useState<PushRecord[]>([]);

    const visuals = ['人模', '平铺', '挂拍'];
    const styles = ['优雅风', '休闲风', '通勤风', '法式风', '韩系风', '甜酷风', '极简风'];

    useEffect(() => {
        // Fetch Real Shops
        const fetchShops = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
                // Fetch up to 1000 shops for the selector
                const res = await fetch(`${API_BASE}/api/admin/shops?pageSize=1000`);
                if (!res.ok) throw new Error('Failed to fetch shops');
                const json = await res.json();

                // Transform to match PushManage Shop interface
                const realShops: Shop[] = (json.data || []).map((s: any) => ({
                    id: s.id,
                    shop_name: s.shop_name,
                    key_id: s.key_id,
                    shop_code: s.shop_code, // Map shop_code
                    private_push_count: 0 // Mock for now, as backend doesn't track this yet
                }));
                setShops(realShops);
            } catch (err) {
                console.error('Error fetching shops:', err);
            }
        };

        // Fetch Real Public Styles
        const fetchPublicStyles = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
                const res = await fetch(`${API_BASE}/api/styles/public?pageSize=100`);
                if (!res.ok) throw new Error('Failed to fetch public styles');
                const json = await res.json();

                // Transform to PushRecord format
                const styles: PushRecord[] = (json.data || []).map((s: any) => ({
                    id: s.id,
                    image: s.image_url || '',
                    type: 'public' as const,
                    upload_time: new Date(s.created_at).toLocaleString(),
                    // name: s.name, // If we want to display it
                    tags: s.tags || [],
                    is_top: false,
                    shops: [] // Intent info not stored in current schema
                }));
                setPublicStyles(styles);
            } catch (err) {
                console.error('Error fetching public styles:', err);
            }
        };

        fetchShops();
        fetchPublicStyles();
    }, []);

    const filteredShops = shops.filter(s =>
        s.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.key_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePrivatePush = async () => {
        if (!privateName.trim()) return alert('请输入款式名称');
        if (!privateImage) return alert('请上传图片');
        if (!privateVisual) return alert('请选择视觉');
        if (!privateStyle) return alert('请选择风格');
        if (selectedKeys.length === 0) return alert('请选择推送 KEY');
        if (selectedShopIds.length === 0) return alert('请选择具体店铺');

        try {

            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
            const res = await fetch(`${API_BASE}/api/admin/push/private`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-buyer-name': 'Admin' // Fix: Send buyer name or get from auth context
                },
                body: JSON.stringify({
                    shopIds: selectedShopIds, // 直接使用用户选中的店铺 ID
                    imageUrl: privateImage,
                    refLink: privateLink, // 问题3修复：传递参考链接
                    name: privateName, // 使用用户输入的名称
                    remark: privateRemark,
                    tags: [privateVisual, privateStyle],
                    deadline: 3 // 默认3天
                })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`私推失败: ${err.error}`);
                return;
            }

            alert(`私推成功！\n已推送给 ${selectedKeys.length} 个KEY (共 ${selectedShopIds.length} 家店铺)`);

            // Clear form
            setPrivateName('');
            setPrivateImage('');
            setPrivateLink('');
            setPrivateRemark('');
            setPrivateVisual('');
            setPrivateStyle('');
            setSelectedKeys([]);
            setSelectedShopIds([]);
        } catch (err: any) {
            alert('请求失败，请检查网络或后端');
            console.error(err);
        }
    };

    const handlePublicPush = async () => {
        if (!publicName.trim()) return alert('请输入款式名称'); // Validation
        if (!publicImage) return alert('请上传图片');
        if (!publicVisual) return alert('请选择视觉');
        if (!publicStyle) return alert('请选择风格');

        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
            const res = await fetch(`${API_BASE}/api/admin/push/public`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: publicImage,
                    name: publicName, // Use user input
                    refLink: publicLink, // Include refLink in public push body
                    remark: publicRemark,
                    tags: [publicVisual, publicStyle],
                    maxIntents: 2
                })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`发布失败: ${err.error}`);
                return;
            }

            alert('已成功发布至公池！');

            // Clear form
            setPublicName('');
            setPublicImage('');
            setPublicLink('');
            setPublicRemark('');
            setPublicVisual('');
            setPublicStyle('');
        } catch (err: any) {
            alert('请求失败，请检查网络或后端');
            console.error(err);
        }
    };

    // const toggleShop = (id: string) => { ... } // Removed unused
    // const handlePinTop = (id: string) => { ... } // Removed unused
    // const sortedPublicStyles = ... // Removed unused

    return (
        <div className="push-manage-page">
            <div className="page-header" style={{ textAlign: 'center', marginBottom: 24 }}>
                <h1 className="page-title">推款管理</h1>
                <p className="page-subtitle">向商家推送新款式需求</p>
            </div>

            {/* 并列展示：私推管理 | 公池管理 */}
            <div className="push-manage-grid">
                {/* 左侧：私推管理 */}
                <div className="card push-card">
                    <div className="card-header">
                        <span className="card-title">🔒 私推管理</span>
                    </div>
                    <div className="push-form">
                        <div className="form-group">
                            <label className="form-label">款式名称 <span style={{ color: 'red' }}>*</span></label>
                            <input type="text" className="form-input" placeholder="输入款式名称" value={privateName} onChange={e => setPrivateName(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <ImageUpload
                                label="款式图片"
                                value={privateImage}
                                onChange={setPrivateImage}
                                placeholder="点击或拖拽上传私推图片"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">参考链接</label>
                            <input type="text" className="form-input" placeholder="输入链接" value={privateLink} onChange={e => setPrivateLink(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">选择视觉 <span style={{ color: 'red' }}>*</span></label>
                            <div className="tag-list">
                                {visuals.map(v => (
                                    <span key={v} className={`tag ${privateVisual === v ? 'selected' : ''}`} onClick={() => setPrivateVisual(v)}>
                                        {v}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {privateVisual && (
                            <div className="form-group">
                                <label className="form-label">选择风格 <span style={{ color: 'red' }}>*</span></label>
                                <div className="tag-list">
                                    {styles.map(s => (
                                        <span key={s} className={`tag ${privateStyle === s ? 'selected' : ''}`} onClick={() => setPrivateStyle(s)}>
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">选择推送 KEY <span style={{ color: 'red' }}>*</span></label>
                            <div className="relative">
                                <div
                                    className="search-box-container"
                                    style={{
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        padding: '6px 12px',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: '#fff',
                                        minHeight: '42px',
                                        cursor: 'text',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                    onClick={() => setShowKeySelector(true)}
                                >
                                    {selectedKeys.map(key => (
                                        <span key={key} style={{
                                            background: '#eff6ff',
                                            border: '1px solid #bfdbfe',
                                            borderRadius: '4px',
                                            padding: '2px 8px',
                                            fontSize: '12px',
                                            color: '#1e40af',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: 500
                                        }}>
                                            {key}
                                            <span
                                                className="material-symbols-outlined"
                                                style={{ fontSize: '14px', cursor: 'pointer', color: '#60a5fa' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedKeys(prev => {
                                                        const newKeys = prev.filter(k => k !== key);
                                                        // Remove shops associated with this key
                                                        const shopsToRemove = shops.filter(s => s.key_id === key).map(s => s.id);
                                                        setSelectedShopIds(current => current.filter(id => !shopsToRemove.includes(id)));
                                                        return newKeys;
                                                    });
                                                }}
                                            >close</span>
                                        </span>
                                    ))}

                                    <div style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center' }}>
                                        <span className="material-symbols-outlined text-gray-400" style={{ marginRight: 6, fontSize: 20 }}>search</span>
                                        <input
                                            type="text"
                                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#1f2937' }}
                                            placeholder={selectedKeys.length === 0 ? "点击搜索 KEY..." : ""}
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            onFocus={() => setShowKeySelector(true)}
                                        />
                                    </div>

                                    <span className="text-gray-400" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={(e) => {
                                        e.stopPropagation();
                                        setShowKeySelector(!showKeySelector);
                                    }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                                            {showKeySelector ? 'expand_less' : 'expand_more'}
                                        </span>
                                    </span>
                                </div>

                                {showKeySelector && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                                        <div className="p-3 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 sticky top-0 backdrop-blur-sm">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">可选列表</span>
                                            <button
                                                className="text-xs text-blue-600 font-medium hover:text-blue-700"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowKeySelector(false);
                                                }}
                                            >
                                                收起列表
                                            </button>
                                        </div>
                                        <div className="p-2 grid grid-cols-2 gap-2">
                                            {/* 按 KEY 分组并去重后的列表 - 处理空 key_id */}
                                            {Object.values(shops.reduce((acc, shop) => {
                                                const k = (shop.key_id && shop.key_id.trim()) ? shop.key_id.trim() : shop.shop_name || '未知';
                                                if (!acc[k]) acc[k] = { ...shop, key_id: k };
                                                return acc;
                                            }, {} as Record<string, any>))
                                                .filter(s => {
                                                    const lower = searchTerm.toLowerCase();
                                                    return s.key_id.toLowerCase().includes(lower) ||
                                                        shops.some(inner => inner.key_id === s.key_id && inner.shop_name.toLowerCase().includes(lower));
                                                })
                                                .map(shop => {
                                                    const keyId = shop.key_id;
                                                    const isSelected = selectedKeys.includes(keyId);
                                                    const shopCount = shops.filter(s => s.key_id === keyId).length;
                                                    return (
                                                        <label
                                                            key={keyId}
                                                            className={`
                                                                flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors
                                                                ${isSelected ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50 border border-transparent'}
                                                            `}
                                                            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 flex-shrink-0"
                                                                checked={isSelected}
                                                                onChange={() => {
                                                                    setSelectedKeys(prev => {
                                                                        const isCurrentlySelected = prev.includes(keyId);
                                                                        const newKeys = isCurrentlySelected
                                                                            ? prev.filter(k => k !== keyId)
                                                                            : [...prev, keyId];

                                                                        if (isCurrentlySelected) {
                                                                            const shopsToRemove = shops.filter(s => s.key_id === keyId).map(s => s.id);
                                                                            setSelectedShopIds(prev => prev.filter(id => !shopsToRemove.includes(id)));
                                                                        }
                                                                        if (newKeys.length > 0) setShowShopSelector(true);
                                                                        return newKeys;
                                                                    });
                                                                }}
                                                            />
                                                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0, marginLeft: 8 }}>
                                                                <span className={`text-sm truncate mr-2 ${isSelected ? 'text-blue-900' : 'text-gray-700'}`} style={{ fontWeight: 400 }}>
                                                                    {keyId}
                                                                </span>
                                                                <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0" style={{ fontWeight: 400 }}>
                                                                    包含 {shopCount} 家店铺
                                                                </span>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 新增：店铺选择区域 */}
                        {selectedKeys.length > 0 && (
                            <div className="form-group">
                                <label className="form-label">选择具体店铺 <span style={{ color: 'red' }}>*</span></label>
                                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                                    已选 {selectedShopIds.length} 家店铺
                                </div>

                                <div className="shop-select-list" style={{ maxHeight: 300 }}>
                                    {selectedKeys.map(keyId => {
                                        const keyShops = shops.filter(s => s.key_id === keyId);
                                        const selectedCount = keyShops.filter(s => selectedShopIds.includes(s.id)).length;

                                        return (
                                            <div key={keyId} style={{ marginBottom: 12 }}>
                                                {/* KEY 标题行 */}
                                                <div style={{
                                                    padding: '8px 12px',
                                                    background: 'rgba(99, 102, 241, 0.05)',
                                                    borderRadius: 6,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: 4
                                                }}>
                                                    <span style={{ fontWeight: 'bold', fontSize: 13 }}>
                                                        {keyId} ({selectedCount}/{keyShops.length})
                                                    </span>
                                                    {/* Buttons removed based on user request */}
                                                </div>

                                                {/* 店铺列表 */}
                                                {keyShops.map(shop => {
                                                    const isSelected = selectedShopIds.includes(shop.id);
                                                    return (
                                                        <label
                                                            key={shop.id}
                                                            className={`shop-select-item ${isSelected ? 'selected' : ''}`}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 8,
                                                                padding: '6px 12px 6px 24px'
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {
                                                                    setSelectedShopIds(prev =>
                                                                        prev.includes(shop.id)
                                                                            ? prev.filter(id => id !== shop.id)
                                                                            : [...prev, shop.id]
                                                                    );
                                                                }}
                                                            />
                                                            <span style={{ fontSize: 13, fontWeight: 'bold', fontFamily: 'monospace', minWidth: 70, color: '#333' }}>
                                                                {shop.shop_code || shop.id.slice(0, 8)}
                                                            </span>
                                                            <span style={{ fontSize: 11, color: '#666' }}>{shop.shop_name}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">备注</label>
                            <textarea className="form-textarea" placeholder="备注信息" value={privateRemark} onChange={e => setPrivateRemark(e.target.value)} />
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handlePrivatePush}>
                            确认私推
                        </button>
                    </div>
                </div>

                {/* 右侧：公池管理 */}
                <div className="card push-card">
                    <div className="card-header">
                        <span className="card-title">🌐 公池管理</span>
                    </div>
                    <div className="push-form">
                        <div className="form-group">
                            <label className="form-label">款式名称 <span style={{ color: 'red' }}>*</span></label>
                            <input type="text" className="form-input" placeholder="输入款式名称" value={publicName} onChange={e => setPublicName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <ImageUpload
                                label="款式图片"
                                value={publicImage}
                                onChange={setPublicImage}
                                placeholder="点击或拖拽上传公推图片"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">参考链接</label>
                            <input type="text" className="form-input" placeholder="输入链接" value={publicLink} onChange={e => setPublicLink(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">选择视觉 <span style={{ color: 'red' }}>*</span></label>
                            <div className="tag-list">
                                {visuals.map(v => (
                                    <span key={v} className={`tag ${publicVisual === v ? 'selected' : ''}`} onClick={() => setPublicVisual(v)}>
                                        {v}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {publicVisual && (
                            <div className="form-group">
                                <label className="form-label">选择风格 <span style={{ color: 'red' }}>*</span></label>
                                <div className="tag-list">
                                    {styles.map(s => (
                                        <span key={s} className={`tag ${publicStyle === s ? 'selected' : ''}`} onClick={() => setPublicStyle(s)}>
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">备注</label>
                            <textarea className="form-textarea" placeholder="备注信息" value={publicRemark} onChange={e => setPublicRemark(e.target.value)} />
                        </div>

                        <button className="btn btn-success" style={{ width: '100%' }} onClick={handlePublicPush}>
                            发布至公池
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .push-manage-page {
                    padding: 24px;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                .push-manage-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                }
                @media (max-width: 1000px) {
                    .push-manage-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .push-card {
                    height: fit-content;
                }
                .push-form {
                    padding: 16px;
                }
                .image-preview {
                    width: 100%;
                    margin-top: 8px;
                    border-radius: 8px;
                    max-height: 150px;
                    object-fit: cover;
                }
                .search-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background: var(--bg-secondary);
                }
                .search-box .form-input {
                    border: none;
                    background: transparent;
                    flex: 1;
                }
                .selected-count {
                    font-size: 12px;
                    color: var(--text-muted);
                    white-space: nowrap;
                }
                .shop-select-list {
                    margin-top: 8px;
                    max-height: 180px;
                    overflow-y: auto;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background: var(--card-bg);
                }
                .shop-select-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .shop-select-item:hover {
                    background: var(--bg-secondary);
                }
                .shop-select-item.selected {
                    background: rgba(99, 102, 241, 0.1);
                }
                .public-style-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .public-style-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px;
                    border-radius: 8px;
                    background: var(--bg-secondary);
                    transition: background 0.15s;
                }
                .public-style-item.is-top {
                    background: rgba(250, 204, 21, 0.15);
                    border: 1px solid rgba(250, 204, 21, 0.3);
                }
                .public-style-image {
                    width: 48px;
                    height: 48px;
                    border-radius: 6px;
                    object-fit: cover;
                }
                .public-style-info {
                    flex: 1;
                }
                .btn-warning {
                    background: #F59E0B;
                    color: white;
                    border: none;
                }
                .btn-warning:hover {
                    background: #D97706;
                }
            `}</style>
        </div >
    );
};

export default PushManage;
